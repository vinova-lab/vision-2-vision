# ⚡ FeedbackAI — Smart Feedback Analyzer

> Intelligent campus & organization feedback intelligence system. Collects unstructured feedback, performs real-time AI classification & sentiment analysis, detects emerging trend spikes, and provides actionable administrative insights.

---

## 🌟 Key Features

- **Public Submitter Portal**:
  - Clean submission flow with category selection and optional identity disclosure.
  - Public feedback showcase with verified admin responses, category filters, and sentiment badges.
  - Detailed feedback view with related feedback items sidebar.
- **AI-Powered Feedback Pipeline**:
  - Two-tier classification: Claude 3.5 Haiku + fallback rule-based NLP engine.
  - Real-time sentiment scoring (Positive, Neutral, Negative), urgency classification, and topic extraction.
  - Emerging issue detector: automated spike detection comparing 7-day velocity against historical baselines.
- **Admin Command Center**:
  - Executive KPIs: Total feedback, Positive/Negative rates, Pending moderation count.
  - Interactive charts (Recharts): Sentiment timelines, Category distributions, Topic volume.
  - Moderation queue: Status management (Visible / Under Review / Hidden) and official admin response threads.
  - CSV export for reporting.

---

## 🏗️ Architecture

```
FSP/
├── backend/                  # Express.js REST API
│   ├── src/
│   │   ├── ai/              # Claude Haiku & rule-based analyzer
│   │   ├── db/              # sql.js SQLite database, migrations & seed
│   │   ├── middleware/      # Auth, rate limiting & error handling
│   │   ├── routes/          # REST endpoints (feedback, admin, analytics)
│   │   └── index.js         # Server entrypoint
│   ├── railway.json         # Railway deployment configuration
│   └── package.json
├── frontend/                 # React 19 + Vite SPA
│   ├── src/
│   │   ├── api/             # Axios client with JWT interceptor
│   │   ├── components/      # UI components & layouts
│   │   ├── contexts/        # Auth context
│   │   └── pages/           # Public & Admin pages
│   ├── vercel.json          # Vercel SPA rewrites config
│   └── package.json
└── README.md
```

---

## 🚀 Quick Start (Local Development)

### 1. Backend Setup

```bash
cd backend
npm install
npm run migrate
npm run seed
npm run dev
```

Backend will run on **`http://localhost:3001`**.

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend will run on **`http://localhost:5173`**.

---

## 🔐 Default Credentials

| Field | Value |
|---|---|
| **Login URL** | `/admin/login` |
| **Email** | `admin@skyline.edu` |
| **Password** | `Admin@123` |

---

## ☁️ Deployment Guide

### Deploying the Backend (Railway)

1. Log in to [Railway](https://railway.app/).
2. Click **New Project** → **Deploy from GitHub repo**.
3. Select this repository and set the **Root Directory** to `/backend`.
4. Add the following **Environment Variables** in Railway:
   - `NODE_ENV`: `production`
   - `PORT`: `3001`
   - `JWT_SECRET`: *(Generate a secure random string)*
   - `ANTHROPIC_API_KEY`: *(Optional: your Claude API key for enhanced NLP)*
   - `FRONTEND_URL`: `https://<your-vercel-domain>.vercel.app` *(or leave blank / set `*` initially)*
5. Railway will automatically build using `railway.json` and start the server with auto-migrations and seeding.
6. Copy the generated Railway public domain URL (e.g. `https://feedback-backend-production.up.railway.app`).

### Deploying the Frontend (Vercel)

1. Log in to [Vercel](https://vercel.com/).
2. Click **Add New** → **Project** → Import this GitHub repository.
3. In Project Settings:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
4. Add the **Environment Variable**:
   - `VITE_API_URL`: `https://<your-railway-domain>.up.railway.app/api`
5. Click **Deploy**.
6. Once deployed, update `FRONTEND_URL` in your Railway backend environment variables with your Vercel URL.

---

## 📄 License

MIT
