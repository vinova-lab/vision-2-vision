import { initDb, db } from './connection.js';

export async function runMigrations() {
  await initDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS organizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      org_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      FOREIGN KEY (org_id) REFERENCES organizations(id),
      UNIQUE(org_id, slug)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      org_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      submitter_name TEXT,
      submitter_email TEXT,
      is_anonymous INTEGER NOT NULL DEFAULT 1,
      user_category_id INTEGER,
      moderation_status TEXT NOT NULL DEFAULT 'visible',
      moderation_reason TEXT,
      moderated_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (org_id) REFERENCES organizations(id),
      FOREIGN KEY (user_category_id) REFERENCES categories(id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS feedback_analysis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      feedback_id INTEGER UNIQUE NOT NULL,
      sentiment TEXT NOT NULL DEFAULT 'neutral',
      category TEXT NOT NULL DEFAULT 'administration',
      topics TEXT NOT NULL DEFAULT '[]',
      confidence REAL NOT NULL DEFAULT 0.5,
      urgency TEXT NOT NULL DEFAULT 'low',
      summary TEXT,
      mixed_signals INTEGER NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT 'rule',
      rule_fallback TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (feedback_id) REFERENCES feedback(id)
    )
  `);

  db.exec(`CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_feedback_org_id ON feedback(org_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(moderation_status)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_analysis_sentiment ON feedback_analysis(sentiment)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_analysis_category ON feedback_analysis(category)`);
}

// Allow running directly: node src/db/migrate.js
if (process.argv[1]?.includes('migrate')) {
  runMigrations()
    .then(() => console.log('✅ Migrations completed'))
    .catch(e => { console.error(e); process.exit(1); });
}
