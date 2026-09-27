/**
 * sql.js wrapper that provides a familiar better-sqlite3-like API.
 * sql.js is pure JavaScript - no native build tools required.
 */
import initSqlJs from 'sql.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'feedback.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let _db = null;

export function persistDb() {
  if (_db) {
    try {
      const data = _db.export();
      fs.writeFileSync(DB_PATH, Buffer.from(data));
    } catch (e) {
      console.error('[DB] Failed to persist:', e.message);
    }
  }
}

export async function initDb() {
  if (_db) return;
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    _db = new SQL.Database(buf);
  } else {
    _db = new SQL.Database();
  }

  _db.run('PRAGMA foreign_keys = ON');
}

// ─── Row helpers ──────────────────────────────────────────────────────────────
function stmtToObject(stmt) {
  const cols = stmt.getColumnNames();
  const vals = stmt.get();
  const obj = {};
  cols.forEach((c, i) => { obj[c] = vals[i]; });
  return obj;
}

// ─── Public API ───────────────────────────────────────────────────────────────
export const db = {
  /** Execute raw SQL (no return value needed). Persists automatically. */
  exec(sql) {
    _db.run(sql);
    persistDb();
  },

  /** Prepare a statement and return a statement object. */
  prepare(sql) {
    return {
      /** Execute with params, returns {lastInsertRowid, changes}. */
      run(...params) {
        const flat = params.flat();
        _db.run(sql, flat);
        const lastInsertRowid = _db.exec('SELECT last_insert_rowid()')[0]?.values[0][0] ?? 0;
        const changes = _db.getRowsModified();
        persistDb();
        return { lastInsertRowid: Number(lastInsertRowid), changes };
      },
      /** Return first matching row as object, or undefined. */
      get(...params) {
        const flat = params.flat();
        const stmt = _db.prepare(sql);
        stmt.bind(flat);
        const result = stmt.step() ? stmtToObject(stmt) : undefined;
        stmt.free();
        return result;
      },
      /** Return all matching rows as array of objects. */
      all(...params) {
        const flat = params.flat();
        const stmt = _db.prepare(sql);
        stmt.bind(flat);
        const rows = [];
        while (stmt.step()) rows.push(stmtToObject(stmt));
        stmt.free();
        return rows;
      },
    };
  },

  /** Run a function as a transaction. Returns whatever fn returns. */
  transaction(fn) {
    return (...args) => {
      _db.run('BEGIN');
      try {
        const result = fn(...args);
        _db.run('COMMIT');
        persistDb();
        return result;
      } catch (e) {
        _db.run('ROLLBACK');
        throw e;
      }
    };
  },

  /** Run raw SQL and return {columns, values}[] */
  rawExec(sql) {
    return _db.exec(sql);
  },
};

export function getDb() {
  if (!_db) throw new Error('DB not initialized');
  return db;
}
