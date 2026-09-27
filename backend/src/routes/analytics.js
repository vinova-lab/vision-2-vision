import { Router } from 'express';
import { db } from '../db/connection.js';

const router = Router();

// ─── GET /api/admin/analytics/summary ────────────────────────────────────────
router.get('/summary', (req, res) => {
  try {
    const total = db.prepare(`SELECT COUNT(*) as count FROM feedback`).get().count;
    const visible = db.prepare(`SELECT COUNT(*) as count FROM feedback WHERE moderation_status != 'hidden'`).get().count;
    const flagged = db.prepare(`SELECT COUNT(*) as count FROM feedback WHERE moderation_status = 'flagged'`).get().count;

    const sentimentCounts = db.prepare(`
      SELECT fa.sentiment, COUNT(*) as count
      FROM feedback_analysis fa
      JOIN feedback f ON f.id = fa.feedback_id
      WHERE f.moderation_status != 'hidden'
      GROUP BY fa.sentiment
    `).all();

    const sentimentMap = { positive: 0, neutral: 0, negative: 0 };
    for (const row of sentimentCounts) sentimentMap[row.sentiment] = row.count;

    const positiveRate = visible > 0 ? Math.round((sentimentMap.positive / visible) * 100) : 0;
    const negativeRate = visible > 0 ? Math.round((sentimentMap.negative / visible) * 100) : 0;

    const recentCount = db.prepare(`
      SELECT COUNT(*) as count FROM feedback
      WHERE created_at >= datetime('now', '-7 days') AND moderation_status != 'hidden'
    `).get().count;

    const priorCount = db.prepare(`
      SELECT COUNT(*) as count FROM feedback
      WHERE created_at >= datetime('now', '-14 days') AND created_at < datetime('now', '-7 days')
      AND moderation_status != 'hidden'
    `).get().count;

    const trendDirection = recentCount > priorCount ? 'up' : recentCount < priorCount ? 'down' : 'stable';
    const trendPercent = priorCount > 0 ? Math.round(((recentCount - priorCount) / priorCount) * 100) : 0;

    res.json({
      total, visible, flagged, sentiment: sentimentMap, positiveRate, negativeRate,
      trend: { recentCount, priorCount, direction: trendDirection, percent: trendPercent },
    });
  } catch (err) {
    console.error('[Analytics Summary]', err);
    res.status(500).json({ error: { code: 'DB_ERROR', message: 'Failed to fetch analytics summary' } });
  }
});

// ─── GET /api/admin/analytics/trends ─────────────────────────────────────────
router.get('/trends', (req, res) => {
  try {
    const { from, to } = req.query;
    const fromDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = to || new Date().toISOString().split('T')[0];

    const rows = db.prepare(`
      SELECT strftime('%Y-%m-%d', f.created_at) as date, fa.sentiment, COUNT(*) as count
      FROM feedback f
      JOIN feedback_analysis fa ON fa.feedback_id = f.id
      WHERE f.created_at >= ? AND f.created_at <= ? AND f.moderation_status != 'hidden'
      GROUP BY date, fa.sentiment
      ORDER BY date ASC
    `).all(fromDate, toDate + ' 23:59:59');

    const byDate = {};
    for (const row of rows) {
      if (!byDate[row.date]) byDate[row.date] = { date: row.date, positive: 0, neutral: 0, negative: 0, total: 0 };
      byDate[row.date][row.sentiment] = row.count;
      byDate[row.date].total += row.count;
    }

    res.json({ trends: Object.values(byDate) });
  } catch (err) {
    console.error('[Analytics Trends]', err);
    res.status(500).json({ error: { code: 'DB_ERROR', message: 'Failed to fetch trend data' } });
  }
});

// ─── GET /api/admin/analytics/categories ─────────────────────────────────────
router.get('/categories', (req, res) => {
  try {
    const { from, to } = req.query;
    let where = `f.moderation_status != 'hidden'`;
    const params = [];
    if (from) { where += ` AND f.created_at >= ?`; params.push(from); }
    if (to) { where += ` AND f.created_at <= ?`; params.push(to + ' 23:59:59'); }

    const rows = db.prepare(`
      SELECT fa.category, fa.sentiment, COUNT(*) as count
      FROM feedback f
      JOIN feedback_analysis fa ON fa.feedback_id = f.id
      WHERE ${where}
      GROUP BY fa.category, fa.sentiment
      ORDER BY count DESC
    `).all(...params);

    const byCategory = {};
    for (const row of rows) {
      if (!byCategory[row.category]) byCategory[row.category] = { category: row.category, total: 0, positive: 0, neutral: 0, negative: 0 };
      byCategory[row.category][row.sentiment] = row.count;
      byCategory[row.category].total += row.count;
    }

    res.json({ categories: Object.values(byCategory).sort((a, b) => b.total - a.total) });
  } catch (err) {
    console.error('[Analytics Categories]', err);
    res.status(500).json({ error: { code: 'DB_ERROR', message: 'Failed to fetch category data' } });
  }
});

// ─── GET /api/admin/analytics/topics ─────────────────────────────────────────
router.get('/topics', (req, res) => {
  try {
    const { from, to, category } = req.query;
    let where = `f.moderation_status != 'hidden'`;
    const params = [];
    if (from) { where += ` AND f.created_at >= ?`; params.push(from); }
    if (to) { where += ` AND f.created_at <= ?`; params.push(to + ' 23:59:59'); }
    if (category) { where += ` AND fa.category = ?`; params.push(category); }

    const rows = db.prepare(`SELECT fa.topics, fa.sentiment FROM feedback f JOIN feedback_analysis fa ON fa.feedback_id = f.id WHERE ${where}`).all(...params);
    const topicCounts = {};
    const topicSentiment = {};
    for (const row of rows) {
      const topics = (() => { try { return JSON.parse(row.topics || '[]'); } catch { return []; } })();
      for (const topic of topics) {
        if (topic === 'general') continue;
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        if (!topicSentiment[topic]) topicSentiment[topic] = { positive: 0, neutral: 0, negative: 0 };
        topicSentiment[topic][row.sentiment]++;
      }
    }

    const recentRows = db.prepare(`SELECT fa.topics FROM feedback f JOIN feedback_analysis fa ON fa.feedback_id = f.id WHERE f.created_at >= datetime('now', '-7 days') AND f.moderation_status != 'hidden'`).all();
    const priorRows = db.prepare(`SELECT fa.topics FROM feedback f JOIN feedback_analysis fa ON fa.feedback_id = f.id WHERE f.created_at >= datetime('now', '-14 days') AND f.created_at < datetime('now', '-7 days') AND f.moderation_status != 'hidden'`).all();

    const countTopics = (rowArr) => {
      const m = {};
      for (const r of rowArr) {
        const ts = (() => { try { return JSON.parse(r.topics || '[]'); } catch { return []; } })();
        for (const t of ts) if (t !== 'general') m[t] = (m[t] || 0) + 1;
      }
      return m;
    };

    const recentTC = countTopics(recentRows);
    const priorTC = countTopics(priorRows);

    const topicsWithMeta = Object.entries(topicCounts).map(([topic, count]) => {
      const recent = recentTC[topic] || 0;
      const prior = priorTC[topic] || 0;
      const spikeRatio = prior > 0 ? recent / prior : recent > 0 ? 999 : 0;
      const isEmerging = recent >= 3 && spikeRatio >= 2;
      return { topic, count, recentCount: recent, priorCount: prior, spikeRatio: Math.round(spikeRatio * 10) / 10, isEmerging, sentiment: topicSentiment[topic] || { positive: 0, neutral: 0, negative: 0 } };
    }).sort((a, b) => b.count - a.count);

    res.json({ topics: topicsWithMeta, emerging: topicsWithMeta.filter(t => t.isEmerging).sort((a, b) => b.spikeRatio - a.spikeRatio) });
  } catch (err) {
    console.error('[Analytics Topics]', err);
    res.status(500).json({ error: { code: 'DB_ERROR', message: 'Failed to fetch topic data' } });
  }
});

export default router;
