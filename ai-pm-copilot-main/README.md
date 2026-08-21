# AI Product Manager Copilot 🚀
> Restaurant Feedback Analysis & Insights Platform

AI Product Manager Copilot is a data-driven platform designed to process, classify, analyze, and visualize customer feedback across multiple restaurant locations and channels (Google Reviews, Zomato, Support Tickets, Surveys, etc.).

---

## 🛠️ Project Architecture & Tech Stack

- **Backend**: Node.js + Express + TypeScript + MongoDB (Mongoose) + JWT Auth + Zod Validation
- **Preprocessing Pipeline**: Python data cleaning & normalization
- **Analysis Engine**: NLP Classification (Category, Sentiment, Priority) & FastAPI AI Analysis Proxy
- **Database**: MongoDB (Atlas / Local instance)

---

## 📁 Repository Structure

```text
AI-Product-Manager-Copilot/
├── backend/                  # TypeScript Express REST API & MongoDB models
│   ├── src/
│   │   ├── config/           # Database configuration
│   │   ├── controllers/      # Auth, Feedback CRUD, Stats, & Analyze controllers
│   │   ├── middleware/       # JWT Auth, RBAC, Zod validation, & Error Handler
│   │   ├── models/           # Mongoose schemas (User, Feedback)
│   │   ├── routes/           # REST API route definitions
│   │   ├── validators/       # Zod input validation schemas
│   │   └── scripts/          # CSV bulk import seed script
│   └── README.md             # Detailed Backend API Documentation
│
├── preprocessing/            # Data cleaning and normalization scripts (Sarayu)
├── analysis/                 # Sentiment, Category, and Priority classification models (Eklessia)
└── dataset/                  # Source, raw, and analyzed dataset files
    └── processed/
        └── analyzed_feedback.csv  # 676 processed & classified feedback records
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas cluster or local MongoDB instance (`mongodb://localhost:27017`)

### 1. Backend Setup

```bash
# Navigate to the backend directory
cd backend

# Install dependencies
npm install

# Copy environment template and configure MONGO_URI & JWT_SECRET
cp .env.example .env
```

### 2. Database Seeding

Import the 676 pre-analyzed feedback records from `dataset/processed/analyzed_feedback.csv` into MongoDB:

```bash
npm run seed
```

### 3. Running the Backend Server

```bash
# Development mode with hot-reload
npm run dev

# Production build & start
npm run build
npm start
```

The API server will run on `http://localhost:5000`.

### 4. Start the FastAPI Upload Service

The FastAPI service provides CSV upload and exposes interactive Swagger
documentation at `/docs`.

Open a second terminal from the repository root:

```bash
cd fastapi_backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The FastAPI service will run on `http://127.0.0.1:8000`.

### 5. Start the Frontend

Open a third terminal from the repository root:

```bash
cd client
npm install
npm run dev
```

Open the application at `http://localhost:3000`.

### Local Service URLs

| Service | URL |
|---|---|
| React frontend | http://localhost:3000 |
| Express API | http://localhost:5000 |
| FastAPI Swagger UI | http://127.0.0.1:8000/docs |
| FastAPI OpenAPI JSON | http://127.0.0.1:8000/openapi.json |

Swagger UI is opened by visiting the FastAPI `/docs` URL in a browser. It is
separate from the React frontend and documents the FastAPI upload endpoint.

---

## 🔐 Authentication & Roles

The API includes JWT-based Authentication & Role-Based Access Control (RBAC):

- **`viewer`**: Read feedback (`GET /api/feedback`), view stats (`GET /api/stats`).
- **`product_manager`**: Create, read, and update feedback records.
- **`admin`**: Full access including record deletion (`DELETE /api/feedback/:id`).

---

## 📡 API Endpoints Summary

| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `GET` | `/` | API Overview & Endpoints List | No |
| `GET` | `/api/health` | Service health status | No |
| `POST` | `/api/auth/register` | Register new user | No |
| `POST` | `/api/auth/login` | User login & obtain JWT | No |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | Yes |
| `GET` | `/api/feedback` | Paginated feedback list + multi-filters | Yes |
| `GET` | `/api/feedback/:id` | Fetch single feedback item by ID | Yes |
| `POST` | `/api/feedback` | Create single or bulk feedback records | Yes |
| `PUT` | `/api/feedback/:id` | Update feedback record | Yes |
| `DELETE` | `/api/feedback/:id` | Delete feedback record | Admin Only |
| `GET` | `/api/stats` | Aggregated metrics for dashboard charts | Yes |
| `POST` | `/api/analyze` | AI NLP analysis proxy | No |

> For comprehensive API request/response documentation and Postman integration guidance, refer to **[`backend/README.md`](file:///d:/AI-Product-Manager-Copilot-main/AI-Product-Manager-Copilot-main/backend/README.md)**.