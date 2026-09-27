# Smart Feedback Analyzer — Complete ✅

> **Skyline Institute of Technology** — Campus feedback intelligence system

---

## 🚀 Both servers are running

| Service | URL | Status |
|---------|-----|--------|
| **Backend API** | http://localhost:3001/api | ✅ Running |
| **Frontend** | http://localhost:5173 | ✅ Running |

---

## 🔑 Access

| Role | URL | Credentials |
|------|-----|-------------|
| **Public user** | http://localhost:5173 | No login needed |
| **Submit feedback** | http://localhost:5173/submit | No login needed |
| **Admin login** | http://localhost:5173/admin/login | `admin@skyline.edu` / `Admin@123` |

---

## 📸 App Screenshots

### Landing Page
![Landing Page](file:///C:/Users/admin/.gemini/antigravity-ide/brain/aacf923f-e8ef-4f82-99a9-beff55c591cc/landing_page.png)

### Submit Feedback
![Submit Page](file:///C:/Users/admin/.gemini/antigravity-ide/brain/aacf923f-e8ef-4f82-99a9-beff55c591cc/submit_page.png)

### Admin Dashboard
![Admin Dashboard](file:///C:/Users/admin/.gemini/antigravity-ide/brain/aacf923f-e8ef-4f82-99a9-beff55c591cc/admin_dashboard.png)

---

## 📊 Live Data (verified)

- **122 feedback entries** seeded across 6 categories
- **⚡ Emerging issue: `#wifi`** — 13 reports in last 7 days (spike detected!)
- **7 items flagged** and pending moderation
- **39% positive rate**, **25% negative rate**
- Sentiment trend chart showing 30-day history

---

## 🏗️ Architecture

```
FSP/
├── backend/                    # Express.js + sql.js (pure JS SQLite)
│   ├── src/
│   │   ├── db/
│   │   │   ├── connection.js   # sql.js wrapper
│   │   │   ├── migrate.js      # Schema creation
│   │   │   └── seed.js         # 122 realistic entries
│   │   ├── analysis/
│   │   │   ├── ruleEngine.js   # Deterministic classifier
│   │   │   ├── aiClient.js     # Claude Haiku (graceful fallback)
│   │   │   └── index.js        # Orchestrator
│   │   ├── routes/
│   │   │   ├── feedback.js
│   │   │   ├── auth.js
│   │   │   ├── categories.js
│   │   │   ├── adminFeedback.js
│   │   │   └── analytics.js
│   │   └── index.js
│   └── data/feedback.db        # SQLite file (auto-created)
│
└── frontend/                   # React + Vite + React Query + Recharts
    └── src/
        ├── api/client.js
        ├── contexts/AuthContext.jsx
        ├── components/layout/  # AdminLayout, ProtectedRoute
        ├── components/ui/      # Badges, meters, skeletons
        ├── pages/
        │   ├── Landing.jsx
        │   ├── Submit.jsx
        │   ├── Confirmation.jsx
        │   └── admin/
        │       ├── Login.jsx
        │       ├── Dashboard.jsx
        │       ├── FeedbackExplorer.jsx
        │       ├── FeedbackDetail.jsx
        │       ├── Moderation.jsx
        │       └── Analytics.jsx
        └── utils/helpers.js
```

---

## ✨ Key Demo Moments

1. **Submit feedback** → see real-time classification on confirmation page
2. **Admin dashboard** → emerging issue banner for `#wifi` spike
3. **Click any chart** → drill down to filtered feedback list
4. **Moderation queue** → approve/hide flagged items inline
5. **Feedback detail** → rule engine vs AI comparison panel

---

## 🤖 Enable AI (optional)

Add to `backend/.env`:
```
ANTHROPIC_API_KEY=your_key_here
```
Without the key, the rule engine handles everything automatically.

---

## 🔄 Restart after closing

```powershell
# Terminal 1 — Backend
cd C:\Users\admin\OneDrive\Desktop\FSP\backend
node src/index.js

# Terminal 2 — Frontend
cd C:\Users\admin\OneDrive\Desktop\FSP\frontend
npm run dev
```
