import { Router } from 'express';
import { db } from '../db/connection.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT c.id, c.name, c.slug, o.name as org_name
      FROM categories c
      JOIN organizations o ON c.org_id = o.id
      ORDER BY c.name
    `).all();
    res.json({ categories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: 'DB_ERROR', message: 'Failed to fetch categories' } });
  }
});

export default router;
