# Production Scaling & Storage Migration Guide

This document describes the steps required to transition the AI Product Manager Copilot stack from a single-node development environment to a multi-node, scalable production architecture.

---

## 📦 1. Storage: Moving Uploads to Object Storage (S3 / R2 / GCS)

In development, the Groq preprocessing pipeline (`feedback-pipeline`) saves uploaded files to the local file system (`uploads/` and `source_data/`). In a production environment with stateless containers (e.g. AWS ECS, Google Cloud Run, or Kubernetes), local disks are ephemeral and won't survive container restarts or scale events.

### Python Uploads Migration (in `feedback-pipeline/routes.py`)

To migrate local storage to an S3-compatible API (like AWS S3 or Cloudflare R2), follow these steps:

1. **Install boto3**:
   ```bash
   pip install boto3
   ```

2. **Add Environment Variables**:
   Add to `feedback-pipeline/.env`:
   ```env
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   AWS_S3_BUCKET_NAME=ai-pm-feedback-uploads
   AWS_S3_REGION=us-east-1
   # (Optional) For Cloudflare R2:
   # AWS_S3_ENDPOINT_URL=https://<account_id>.r2.cloudflarestorage.com
   ```

3. **Update Upload Route Code**:
   Modify the `@router.post("/upload")` handler in [`routes.py`](file:///Users/kingsygracer/Downloads/ai-pm-copilot-main/feedback-pipeline/routes.py):
   ```python
   import os
   import boto3
   from fastapi import UploadFile, File

   s3_client = boto3.client(
       "s3",
       aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
       aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
       region_name=os.getenv("AWS_S3_REGION"),
       # endpoint_url=os.getenv("AWS_S3_ENDPOINT_URL") # Un-comment for R2
   )
   BUCKET_NAME = os.getenv("AWS_S3_BUCKET_NAME")

   @router.post("/upload")
   async def upload_csv(file: UploadFile = File(...)):
       try:
           # Upload directly from file-like stream to S3 bucket
           s3_client.upload_fileobj(
               file.file,
               BUCKET_NAME,
               file.filename,
               ExtraArgs={"ContentType": file.content_type}
           )
           print(f"[OK] Uploaded {file.filename} to S3 bucket {BUCKET_NAME}")
           
           # Proceed with pipeline parsing by reading directly from S3
           # rather than local file system paths.
           return {"success": True, "filename": file.filename}
       except Exception as e:
           return {"success": False, "error": str(e)}
   ```

---

## ⚡ 2. State: Distributing Caching and Rate Limits with Redis

Currently, both the API rate limiter and session states are managed in-memory in the Node Express backend. When scaling horizontally to multiple container nodes behind a Load Balancer, local memory is fragmented. A single user could get rate-limited randomly depending on which server instance they hit, and their session state would be lost.

### Node Express Backend Redis Integration

1. **Install Redis Clients**:
   Install the Redis connector and rate-limiting store in [`backend`](file:///Users/kingsygracer/Downloads/ai-pm-copilot-main/backend):
   ```bash
   npm install ioredis rate-limit-redis
   ```

2. **Add Environment Variables**:
   Add to `backend/.env`:
   ```env
   REDIS_URL=redis://default:password@your-redis-host:6379
   ```

3. **Update Rate Limiting (`backend/src/middleware/rateLimit.ts`)**:
   Modify the rate limit configuration to automatically switch to the Redis Store if a connection string is provided:
   ```typescript
   import Redis from 'ioredis';
   import { RedisStore } from 'rate-limit-redis';
   import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

   const redisUrl = process.env.REDIS_URL;
   let store: any = undefined;

   if (redisUrl) {
     const redisClient = new Redis(redisUrl);
     store = new RedisStore({
       sendCommand: (...args: string[]) => redisClient.call(args[0], ...args.slice(1)) as any,
     });
     console.log('⚡ [RATE LIMIT] Using Redis store for state tracking');
   } else {
     console.log('ℹ️  [RATE LIMIT] Using local MemoryStore');
   }

   export const apiRateLimiter = rateLimit({
     windowMs: 15 * 60 * 1000,
     limit: 100,
     store: store, // In-memory fallback if undefined
     standardHeaders: 'draft-7',
     legacyHeaders: false,
     keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip ?? '', 56),
     handler: (_req, res) => {
       res.status(429).json({
         success: false,
         error: 'Rate limit exceeded: 100 requests per 15 minutes. Try again later.',
       });
     },
   });
   ```

4. **Update Session Store (in `app.ts` if sessions are added)**:
   Use `connect-redis` middleware to store session cookies in Redis so users stay logged in across server instance round-robins.
