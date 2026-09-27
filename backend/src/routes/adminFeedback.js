import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/connection.js';
import { analyzeText } from '../analysis/index.js';

const router = Router();

// ─── GET /api/admin/feedback ─────────────────────────────────────────────────
router.get('/', (req, res) => {
  try {
    const {
      sentiment, category, topic, status, q,
      from, to, page = '1', limit = '20', sort = 'newest'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * pageSize;

    let where = [];
    let params = [];

    if (sentiment && ['positive', 'neutral', 'negative'].includes(sentiment)) {
      where.push('fa.sentiment = ?'); params.push(sentiment);
    }
    if (category) {
      where.push('fa.category = ?'); params.push(category);
    }
    if (topic) {
      where.push(`fa.topics LIKE ?`); params.push(`%"${topic}"%`);
    }
    if (status && ['visible', 'flagged', 'approved', 'hidden'].includes(status)) {
      where.push('f.moderation_status = ?'); params.push(status);
    }
    if (q) {
      where.push('(f.text LIKE ? OR fa.summary LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }
    if (from) {
      where.push('f.created_at >= ?'); params.push(from);
    }
    if (to) {
      where.push('f.created_at <= ?'); params.push(to + ' 23:59:59');
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
    const orderClause = sort === 'oldest' ? 'ORDER BY f.created_at ASC' : 'ORDER BY f.created_at DESC';

    const countRow = db.prepare(`
      SELECT COUNT(*) as total
      FROM feedback f
      LEFT JOIN feedback_analysis fa ON fa.feedback_id = f.id
      ${whereClause}
    `).get(...params);

    const rows = db.prepare(`
      SELECT
        f.id, f.text, f.submitter_name, f.is_anonymous,
        f.moderation_status, f.moderation_reason, f.moderated_at, f.created_at,
        fa.sentiment, fa.category, fa.topics, fa.confidence, fa.urgency,
        fa.summary, fa.mixed_signals, fa.source
      FROM feedback f
      LEFT JOIN feedback_analysis fa ON fa.feedback_id = f.id
      ${whereClause}
      ${orderClause}
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset);

    const formatted = rows.map(r => ({
      ...r,
      topics: (() => { try { return JSON.parse(r.topics || '[]'); } catch { return []; } })(),
      mixed_signals: r.mixed_signals === 1,
    }));

    res.json({
      feedback: formatted,
      pagination: {
        page: pageNum,
        pageSize,
        total: countRow.total,
        totalPages: Math.ceil(countRow.total / pageSize),
      },
    });
  } catch (err) {
    console.error('[Admin Feedback List]', err);
    res.status(500).json({ error: { code: 'DB_ERROR', message: 'Failed to fetch feedback' } });
  }
});

// ─── GET /api/admin/feedback/:id ─────────────────────────────────────────────
router.get('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const row = db.prepare(`
      SELECT
        f.id, f.text, f.submitter_name, f.submitter_email, f.is_anonymous,
        f.user_category_id, f.moderation_status, f.moderation_reason, f.moderated_at, f.created_at,
        fa.sentiment, fa.category, fa.topics, fa.confidence, fa.urgency,
        fa.summary, fa.mixed_signals, fa.source, fa.rule_fallback, fa.created_at as analyzed_at,
        c.name as user_category_name, c.slug as user_category_slug
      FROM feedback f
      LEFT JOIN feedback_analysis fa ON fa.feedback_id = f.id
      LEFT JOIN categories c ON c.id = f.user_category_id
      WHERE f.id = ?
    `).get(id);

    if (!row) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Feedback not found' } });
    }

    // Find related items by shared topics
    const topics = (() => { try { return JSON.parse(row.topics || '[]'); } catch { return []; } })();
    let related = [];
    if (topics.length > 0 && topics[0] !== 'general') {
      const topicFilter = topics.slice(0, 3).map(t => `fa.topics LIKE '%"${t}"%'`).join(' OR ');
      related = db.prepare(`
        SELECT f.id, f.text, f.created_at, fa.sentiment, fa.category, fa.topics, fa.summary
        FROM feedback f
        LEFT JOIN feedback_analysis fa ON fa.feedback_id = f.id
        WHERE f.id != ? AND f.moderation_status != 'hidden' AND (${topicFilter})
        ORDER BY f.created_at DESC
        LIMIT 5
      `).all(id).map(r => ({
        ...r,
        topics: (() => { try { return JSON.parse(r.topics || '[]'); } catch { return []; } })(),
      }));
    }

    res.json({
      feedback: {
        ...row,
        topics,
        mixed_signals: row.mixed_signals === 1,
        rule_fallback: (() => { try { return JSON.parse(row.rule_fallback || 'null'); } catch { return null; } })(),
        related,
      },
    });
  } catch (err) {
    console.error('[Admin Feedback Detail]', err);
    res.status(500).json({ error: { code: 'DB_ERROR', message: 'Failed to fetch feedback detail' } });
  }
});

// ─── PATCH /api/admin/feedback/:id/moderate ──────────────────────────────────
const ModerateSchema = z.object({
  status: z.enum(['approved', 'hidden', 'visible', 'flagged']),
  reason: z.string().max(500).optional(),
});

router.patch('/:id/moderate', (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const parsed = ModerateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message },
      });
    }

    const { status, reason } = parsed.data;

    const existing = db.prepare('SELECT id FROM feedback WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Feedback not found' } });
    }

    db.prepare(`
      UPDATE feedback
      SET moderation_status = ?, moderation_reason = ?, moderated_at = datetime('now')
      WHERE id = ?
    `).run(status, reason || null, id);

    res.json({ success: true, id, status });
  } catch (err) {
    console.error('[Moderation]', err);
    res.status(500).json({ error: { code: 'DB_ERROR', message: 'Failed to update moderation status' } });
  }
});

// ─── POST /api/admin/feedback/:id/reanalyze ──────────────────────────────────
router.post('/:id/reanalyze', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const row = db.prepare('SELECT * FROM feedback WHERE id = ?').get(id);
    if (!row) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Feedback not found' } });
    }

    const analysis = await analyzeText(row.text);

    db.prepare(`
      UPDATE feedback_analysis
      SET sentiment = ?, category = ?, topics = ?, confidence = ?, urgency = ?,
          summary = ?, mixed_signals = ?, source = ?, rule_fallback = ?
      WHERE feedback_id = ?
    `).run(
      analysis.sentiment,
      analysis.category,
      JSON.stringify(analysis.topics),
      analysis.confidence,
      analysis.urgency,
      analysis.summary,
      analysis.mixedSignals ? 1 : 0,
      analysis.source,
      analysis.ruleFallback ? JSON.stringify(analysis.ruleFallback) : null,
      id
    );

    res.json({ success: true, analysis });
  } catch (err) {
    console.error('[Reanalyze]', err);
    res.status(500).json({ error: { code: 'REANALYZE_ERROR', message: 'Failed to reanalyze' } });
  }
});

export default router;
