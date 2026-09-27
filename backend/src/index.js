import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { initDb, db } from './db/connection.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import categoriesRouter from './routes/categories.js';
import feedbackRouter from './routes/feedback.js';
import authRouter from './routes/auth.js';
import adminFeedbackRouter from './routes/adminFeedback.js';
import analyticsRouter from './routes/analytics.js';
import { runMigrations } from './db/migrate.js';
import { runSeed } from './db/seed.js';

const app = express();
const PORT = process.env.PORT || 3001;
const isDev = process.env.NODE_ENV !== 'production';

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: isDev
    ? true
    : (origin, cb) => {
        const allowed = (process.env.FRONTEND_URL || '').split(',').map(s => s.trim()).filter(Boolean);
        if (!origin || allowed.length === 0 || allowed.includes('*') || allowed.some(o => origin.startsWith(o))) return cb(null, true);
        cb(new Error(`CORS: origin ${origin} not allowed`));
      },
  credentials: true,
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

const feedbackLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60, message: { error: { code: 'RATE_LIMITED', message: 'Too many submissions. Please try again later.' } } });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: { code: 'RATE_LIMITED', message: 'Too many login attempts. Please wait.' } } });

// ─── Public Routes ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV || 'development', aiEnabled: !!(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.length > 10) });
});

app.use('/api/categories', categoriesRouter);
app.use('/api/feedback', feedbackLimiter, feedbackRouter);
app.use('/api/auth', loginLimiter, authRouter);
app.use('/api/admin/feedback', authMiddleware, adminFeedbackRouter);
app.use('/api/admin/analytics', authMiddleware, analyticsRouter);
app.use(notFound);
app.use(errorHandler);

// ─── Startup ──────────────────────────────────────────────────────────────────
async function start() {
  try {
    await initDb();
    console.log('✅ Database initialized');

    // Run migrations (idempotent — uses CREATE IF NOT EXISTS)
    await runMigrations();
    console.log('✅ Migrations complete');

    // Seed only if no organization exists yet (first deploy)
    const orgRow = db.prepare('SELECT COUNT(*) as count FROM organizations').get();
    if (!orgRow || orgRow.count === 0) {
      console.log('🌱 First deploy — seeding database...');
      await runSeed();
      console.log('✅ Seed complete');
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 FeedbackAI API running on port ${PORT}`);
      console.log(`🔑 Admin: admin@skyline.edu / Admin@123`);
      const aiEnabled = process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.length > 10;
      console.log(`🤖 AI: ${aiEnabled ? 'Claude Haiku enabled' : 'Rule engine only'}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

start();
export default app;
