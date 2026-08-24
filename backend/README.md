# AI Product Manager Copilot — Backend API

Node.js + Express + TypeScript + MongoDB (Mongoose) backend for the restaurant feedback analysis tool.

## Quick Start

```bash
# 1. Install dependencies
cd backend
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — set MONGO_URI, JWT_SECRET, etc.

# 3. Seed the database (one-time import of analyzed_feedback.csv)
npm run seed

# 4. Start the dev server
npm run dev        # http://localhost:5000
                   # Interactive API docs: http://localhost:5000/api-docs
```

### Production Build

```bash
npm run build      # Compiles TypeScript → dist/
npm start          # Runs compiled JS from dist/
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `MONGO_URI` | `mongodb://localhost:27017/ai_pm_copilot` | MongoDB connection string |
| `PORT` | `5000` | Server port |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed frontend origin (comma-separated for multiple) |
| `FASTAPI_URL` | unset | Optional Yash FastAPI analysis service URL. The mock is used when unset or unreachable. |
| `JWT_SECRET` | `super_secret_jwt_key_ai_pm_copilot_2026` | Secret key for signing JWT tokens |
| `JWT_EXPIRES_IN` | `7d` | Expiration time for JWT tokens |

---

## Authentication & Authorization

All `/api/feedback` and `/api/stats` routes require a valid JWT passed in the HTTP Authorization header:

```http
Authorization: Bearer <YOUR_JWT_TOKEN>
```

### User Roles & Permissions

| Endpoint | Method | Unauthenticated | Viewer | Product Manager | Admin |
|---|---|:---:|:---:|:---:|:---:|
| `/api/auth/register` | `POST` | ✅ | ✅ | ✅ | ✅ |
| `/api/auth/login` | `POST` | ✅ | ✅ | ✅ | ✅ |
| `/api/auth/me` | `GET` | ❌ 401 | ✅ | ✅ | ✅ |
| `/api/feedback` | `GET` | ❌ 401 | ✅ | ✅ | ✅ |
| `/api/feedback/:id` | `GET` | ❌ 401 | ✅ | ✅ | ✅ |
| `/api/feedback` | `POST` | ❌ 401 | ✅ | ✅ | ✅ |
| `/api/feedback/:id` | `PUT` | ❌ 401 | ✅ | ✅ | ✅ |
| `/api/feedback/:id` | `DELETE` | ❌ 401 | ❌ 403 | ❌ 403 | ✅ |
| `/api/stats` | `GET` | ❌ 401 | ✅ | ✅ | ✅ |
| `/api/analyze` | `POST` | ✅ | ✅ | ✅ | ✅ |

---

## Auth Endpoints

### Register User

```http
POST /api/auth/register
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "pm@example.com",
  "password": "Password123!",
  "name": "Arpita Dev",
  "role": "product_manager"
}
```
*Note: `role` can be `"admin"`, `"product_manager"`, or `"viewer"` (defaults to `"viewer"`).*

**Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "email": "pm@example.com",
      "name": "Arpita Dev",
      "role": "product_manager",
      "createdAt": "2026-08-03T23:30:00.000Z"
    }
  }
}
```

---

### Login

```http
POST /api/auth/login
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "pm@example.com",
  "password": "Password123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "email": "pm@example.com",
      "name": "Arpita Dev",
      "role": "product_manager",
      "createdAt": "2026-08-03T23:30:00.000Z"
    }
  }
}
```

---

### Get Current User Profile (`/me`)

```http
GET /api/auth/me
Authorization: Bearer <YOUR_JWT_TOKEN>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "email": "pm@example.com",
    "name": "Arpita Dev",
    "role": "product_manager",
    "createdAt": "2026-08-03T23:30:00.000Z"
  }
}
```

---

## API Reference

Interactive API docs: `http://localhost:<PORT>/api-docs`

Every endpoint below is listed there and runnable in the browser via **Try it
out** → **Execute**, with generated curl and live responses. For padlocked
endpoints, get a token from `/api/auth/login`, click **Authorize**, and paste it
in. The raw OpenAPI 3.0 document is served at `/api-docs.json`.

Base URL: `http://localhost:5000/api`

### Health Check

```http
GET /api/health
```

---

### Create Feedback (Requires Auth)

```http
POST /api/feedback
Authorization: Bearer <TOKEN>
Content-Type: application/json
```

Request body is either one feedback object or a non-empty array of objects. Each
object requires `text` and `source`; `feedbackId` is generated when omitted.

Single response (`201`):

```json
{ "success": true, "data": { "feedbackId": "FB-1", "text": "...", "source": "Survey" } }
```

Bulk response (`201`):

```json
{ "success": true, "message": "2 feedback records created", "count": 2, "data": [] }
```

---

### List Feedback (Requires Auth)

```http
GET /api/feedback?page=1&limit=20&category=Food&sentiment=Positive
Authorization: Bearer <TOKEN>
```

Supported query parameters are `page`, `limit`, `category`, `sentiment`,
`priority`, `source`, `startDate`, `endDate`, `restaurantId`, `city`, and
`featureCategory`. Multiple filters are combined with AND semantics. The
response is shaped for pagination:

```json
{
  "success": true,
  "data": [],
  "pagination": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 }
}
```

---

### Get Single Feedback (Requires Auth)

```http
GET /api/feedback/:id
Authorization: Bearer <TOKEN>
```

Returns `{ "success": true, "data": <feedback> }`, or `404` with an `error`
message when `:id` is not found. The identifier is `feedbackId`.

---

### Update Feedback (Requires Auth)

```http
PUT /api/feedback/:id
Authorization: Bearer <TOKEN>
Content-Type: application/json
```

Accepts a partial feedback object and returns `{ "success": true, "data":
<updated feedback> }`.

---

### Delete Feedback (Requires Admin Role)

```http
DELETE /api/feedback/:id
Authorization: Bearer <ADMIN_TOKEN>
```

Returns `{ "success": true, "message": "Feedback \"<id>\" deleted" }`.

---

### Dashboard Stats (Requires Auth)

```http
GET /api/stats
Authorization: Bearer <TOKEN>
```

Response:

```json
{
  "success": true,
  "data": {
    "total": 0,
    "byCategory": [{ "name": "Food", "value": 10 }],
    "bySentiment": [{ "name": "Positive", "value": 8 }],
    "byPriority": [{ "name": "High", "value": 2 }],
    "bySource": [{ "name": "Survey", "value": 10 }]
  }
}
```

---

### Analyze Feedback (Public, FastAPI proxy with fallback)

```http
POST /api/analyze
Content-Type: application/json
```

Request body: `{ "text": "..." }`.
When FastAPI is available, the response is `{ "success": true, "mock": false,
"data": <FastAPI response> }`. Otherwise the route returns HTTP 200 with
`mock: true` and the fallback fields `category`, `sentiment`, `theme`,
`pain_point`, `priority`, and `recommendation`. A FastAPI outage never produces
a 500 response from this route.

---

## Data Model Notes

The Feedback model maps all 45 columns from `dataset/processed/analyzed_feedback.csv`.

| Field | Status | Why |
|---|---|---|
| `originalPriority` | Always `null` in current dataset | Support-ticket-only field. |
| `theme` | ~93% `null` | Real theme extraction comes from `/api/analyze`. |
| `painPoint` | ~93% `null` | Real pain-point extraction comes from `/api/analyze`. |
| `aiRecommendation` | Always `null` for seeded data | Populated by `/api/analyze`. |
