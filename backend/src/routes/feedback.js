import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/connection.js';
import { analyzeText } from '../analysis/index.js';

const router = Router();

const SubmitSchema = z.object({
  text: z.string().min(5, 'Feedback must be at least 5 characters').max(3000, 'Feedback must be under 3000 characters'),
  categoryId: z.number().int().positive().optional().nullable(),
  submitterName: z.string().max(100).optional().nullable(),
  submitterEmail: z.string().max(200).optional().nullable(),
});

router.post('/', async (req, res) => {
  try {
    const parsed = SubmitSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message, details: parsed.error.errors } });
    }
    const { text, categoryId, submitterName, submitterEmail } = parsed.data;

    let categorySlug = null;
    if (categoryId) {
      const cat = db.prepare('SELECT slug FROM categories WHERE id = ?').get(categoryId);
      categorySlug = cat?.slug || null;
    }

    const org = db.prepare('SELECT id FROM organizations LIMIT 1').get();
    if (!org) return res.status(500).json({ error: { code: 'CONFIG_ERROR', message: 'Organization not configured' } });

    const analysis = await analyzeText(text, categorySlug);
    const modStatus = analysis.moderationFlag ? 'flagged' : 'visible';

    const insertFn = db.transaction(() => {
      const isAnonymous = !submitterName && !submitterEmail ? 1 : 0;
      const fr = db.prepare(`
        INSERT INTO feedback (org_id, text, submitter_name, submitter_email, is_anonymous, user_category_id, moderation_status, moderation_reason, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(org.id, text.trim(), submitterName?.trim() || null, submitterEmail?.trim() || null, isAnonymous, categoryId || null, modStatus, analysis.moderationReason || null);

      db.prepare(`
        INSERT INTO feedback_analysis (feedback_id, sentiment, category, topics, confidence, urgency, summary, mixed_signals, source, rule_fallback)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(fr.lastInsertRowid, analysis.sentiment, analysis.category, JSON.stringify(analysis.topics), analysis.confidence, analysis.urgency, analysis.summary, analysis.mixedSignals ? 1 : 0, analysis.source, analysis.ruleFallback ? JSON.stringify(analysis.ruleFallback) : null);

      return fr.lastInsertRowid;
    });

    const feedbackId = insertFn();

    res.status(201).json({
      feedbackId,
      analysis: {
        sentiment: analysis.sentiment,
        category: analysis.category,
        topics: analysis.topics,
        confidence: analysis.confidence,
        urgency: analysis.urgency,
        summary: analysis.summary,
        mixedSignals: analysis.mixedSignals,
        source: analysis.source,
        moderationFlag: analysis.moderationFlag,
      },
    });
  } catch (err) {
    console.error('[Feedback Submit]', err);
    res.status(500).json({ error: { code: 'SUBMIT_ERROR', message: 'Failed to process feedback' } });
  }
});

router.get('/count', (req, res) => {
  try {
    const result = db.prepare(`SELECT COUNT(*) as count FROM feedback WHERE moderation_status != 'hidden'`).get();
    res.json({ count: result?.count || 0 });
  } catch (err) {
    res.status(500).json({ error: { code: 'DB_ERROR', message: 'Failed to get count' } });
  }
});

export default router;
