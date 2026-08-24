import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { connectDB } from './config/db';

const PORT = parseInt(process.env.PORT || '5000', 10);

async function checkFastAPIHealth(): Promise<void> {
  const fastApiUrl = process.env.FASTAPI_URL?.trim();
  if (!fastApiUrl) {
    console.warn('\n⚠️  [FASTAPI HEALTH CHECK] FASTAPI_URL is not configured in .env!\n');
    return;
  }

  console.log(`🔍 [FASTAPI HEALTH CHECK] Checking connection to FastAPI service at ${fastApiUrl}...`);

  try {
    const res = await fetch(fastApiUrl, { method: 'GET', signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      console.log(`✅ [FASTAPI HEALTH CHECK] FastAPI service is reachable and healthy (Status: ${res.status}).\n`);
    } else {
      console.warn(`⚠️  [FASTAPI HEALTH CHECK] Warning: FastAPI service returned status ${res.status} at ${fastApiUrl}.\n`);
    }
  } catch (err) {
    console.error(
      `\n❌ [FASTAPI HEALTH CHECK] WARNING: FastAPI service is unreachable at ${fastApiUrl}!` +
      `\n   Please ensure the AI service is running (e.g., uvicorn app.main:app --port 8002).` +
      `\n   Error: ${(err as Error).message}\n`
    );
  }
}

async function start(): Promise<void> {
  await connectDB();
  await checkFastAPIHealth();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📋 Interactive API docs: http://localhost:${PORT}/api-docs`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
