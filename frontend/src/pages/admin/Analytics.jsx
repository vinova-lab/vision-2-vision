import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAnalyticsTrends, getAnalyticsCategories, getAnalyticsTopics, getAnalyticsSummary } from '../../api/client';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Skeleton, EmptyState } from '../../components/ui/Badges';
import {
  AreaChart, Area, BarChart, Bar, ScatterChart, Scatter,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Cell
} from 'recharts';
import { CATEGORY_LABELS } from '../../utils/helpers';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1a2236', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '0.75rem 1rem', fontSize: '0.8rem' }}>
      <div style={{ color: '#94a3b8', marginBottom: '0.375rem', fontWeight: 600 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, display: 'flex', gap: '1rem', justifyContent: 'space-between' }}>
          <span style={{ textTransform: 'capitalize' }}>{p.dataKey}</span>
          <span style={{ fontWeight: 700 }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

const RANGE_OPTIONS = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '60 days', days: 60 },
  { label: '90 days', days: 90 },
];

function getDateRange(days) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  };
}

const SENTIMENT_COLORS = { positive: '#22c55e', neutral: '#94a3b8', negative: '#f43f5e' };

export default function Analytics() {
  const navigate = useNavigate();
  const [rangeDays, setRangeDays] = useState(30);
  const range = getDateRange(rangeDays);

  const { data: trendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ['analytics-trends', range],
    queryFn: () => getAnalyticsTrends(range),
  });

  const { data: catData, isLoading: catLoading } = useQuery({
    queryKey: ['analytics-categories', range],
    queryFn: () => getAnalyticsCategories(range),
  });

  const { data: topicsData, isLoading: topicsLoading } = useQuery({
    queryKey: ['analytics-topics', {}],
    queryFn: () => getAnalyticsTopics({}),
  });

  const { data: summary } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: getAnalyticsSummary,
  });

  const trends = trendsData?.trends || [];
  const categories = catData?.categories || [];
  const topics = topicsData?.topics?.slice(0, 12) || [];
  const emerging = topicsData?.emerging || [];

  // Category radar data
  const radarData = categories.slice(0, 6).map(c => ({
    category: (CATEGORY_LABELS[c.category] || c.category).split(' & ')[0].split(' ')[0],
    positiveRate: c.total > 0 ? Math.round((c.positive / c.total) * 100) : 0,
    negativeRate: c.total > 0 ? Math.round((c.negative / c.total) * 100) : 0,
    volume: c.total,
  }));

  // Category volume bars
  const catBarData = categories.map(c => ({
    name: (CATEGORY_LABELS[c.category] || c.category).replace(' & ', ' '),
    positive: c.positive,
    neutral: c.neutral,
    negative: c.negative,
    total: c.total,
  }));

  // Topics as bar
  const topicBarData = topics.map(t => ({
    topic: `#${t.topic}`,
    count: t.count,
    recent: t.recentCount,
    prior: t.priorCount,
    isEmerging: t.isEmerging,
  }));

  return (
    <AdminLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>Analytics</h1>
          <p style={{ color: '#475569', fontSize: '0.875rem' }}>Deep dive into feedback patterns</p>
        </div>
        {/* Date range switcher */}
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {RANGE_OPTIONS.map(({ label, days }) => (
            <button
              key={days}
              className={`filter-chip ${rangeDays === days ? 'active' : ''}`}
              onClick={() => setRangeDays(days)}
              style={{ padding: '0.375rem 0.75rem' }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary tiles */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {[
            { label: 'Total', value: summary.total, color: '#6272f7' },
            { label: 'Positive', value: `${summary.positiveRate}%`, color: '#22c55e' },
            { label: 'Negative', value: `${summary.negativeRate}%`, color: '#f43f5e' },
            { label: 'Flagged', value: summary.flagged, color: '#f59e0b' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
              <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '0.25rem' }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Sentiment Trend ─── */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="chart-header">
          <div className="chart-title">Sentiment Over Time</div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem' }}>
            {Object.entries(SENTIMENT_COLORS).map(([key, color]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <div style={{ width: 10, height: 2, background: color, borderRadius: 1 }} />
                <span style={{ color: '#64748b', textTransform: 'capitalize' }}>{key}</span>
              </div>
            ))}
          </div>
        </div>
        {trendsLoading ? (
          <Skeleton height={240} />
        ) : trends.length === 0 ? (
          <EmptyState icon="📈" title="No trend data for this range" />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={trends}>
              <defs>
                {Object.entries(SENTIMENT_COLORS).map(([key, color]) => (
                  <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 10 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fill: '#475569', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="positive" stroke="#22c55e" fill="url(#grad-positive)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="neutral" stroke="#94a3b8" fill="url(#grad-neutral)" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
              <Area type="monotone" dataKey="negative" stroke="#f43f5e" fill="url(#grad-negative)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ─── Category + Topics ─── */}
      <div className="chart-grid-2" style={{ marginBottom: '1rem' }}>
        {/* Category breakdown */}
        <div className="card">
          <div className="chart-header">
            <div className="chart-title">Category Breakdown</div>
            <span style={{ fontSize: '0.7rem', color: '#475569' }}>Click to filter</span>
          </div>
          {catLoading ? (
            <Skeleton height={280} />
          ) : catBarData.length === 0 ? (
            <EmptyState icon="📊" title="No category data" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={catBarData} layout="vertical" onClick={data => data?.activePayload && navigate(`/admin/feedback?category=${categories.find(c => (CATEGORY_LABELS[c.category] || c.category).replace(' & ', ' ') === data.activePayload[0]?.payload?.name)?.category}`)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#475569', fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="positive" stackId="a" fill="#22c55e" cursor="pointer" />
                <Bar dataKey="neutral" stackId="a" fill="#94a3b8" cursor="pointer" />
                <Bar dataKey="negative" stackId="a" fill="#f43f5e" radius={[0, 4, 4, 0]} cursor="pointer" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Topic frequency */}
        <div className="card">
          <div className="chart-header">
            <div className="chart-title">Topic Frequency</div>
            <div style={{ fontSize: '0.7rem', color: '#7c3aed' }}>⚡ Emerging topics highlighted</div>
          </div>
          {topicsLoading ? (
            <Skeleton height={280} />
          ) : topicBarData.length === 0 ? (
            <EmptyState icon="🏷️" title="No topics found" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topicBarData} layout="vertical" onClick={data => data?.activePayload && navigate(`/admin/feedback?topic=${data.activePayload[0]?.payload?.topic?.replace('#', '')}`)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#475569', fontSize: 10 }} />
                <YAxis type="category" dataKey="topic" width={90} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} cursor="pointer">
                  {topicBarData.map((entry, i) => (
                    <Cell key={i} fill={entry.isEmerging ? '#db2777' : '#6272f7'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ─── Emerging Topics ─── */}
      {emerging.length > 0 && (
        <div className="card">
          <div className="chart-header">
            <div className="chart-title">⚡ Emerging Issues</div>
            <span style={{ fontSize: '0.75rem', color: '#475569' }}>Topics with significant recent spike</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
            {emerging.map(t => (
              <div
                key={t.topic}
                onClick={() => navigate(`/admin/feedback?topic=${t.topic}`)}
                style={{ padding: '1rem', borderRadius: 10, background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(219,39,119,0.08))', border: '1px solid rgba(124,58,237,0.25)', cursor: 'pointer', transition: 'all 0.15s ease' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#e879f9', marginBottom: '0.375rem' }}>#{t.topic}</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                  {t.spikeRatio === 999 ? 'New this week' : `${t.spikeRatio}× spike vs prior week`}
                </div>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.7rem' }}>
                  <div><span style={{ color: '#475569' }}>Recent: </span><span style={{ color: '#f1f5f9', fontWeight: 700 }}>{t.recentCount}</span></div>
                  <div><span style={{ color: '#475569' }}>Prior: </span><span style={{ color: '#64748b' }}>{t.priorCount}</span></div>
                  <div><span style={{ color: '#475569' }}>Total: </span><span style={{ color: '#64748b' }}>{t.count}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
