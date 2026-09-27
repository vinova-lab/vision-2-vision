import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAnalyticsSummary, getAnalyticsTrends, getAnalyticsCategories, getAnalyticsTopics } from '../../api/client';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Skeleton, EmptyState } from '../../components/ui/Badges';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid
} from 'recharts';
import { MessageSquare, TrendingUp, TrendingDown, ShieldAlert, Activity, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';
import { CATEGORY_LABELS, formatRelativeTime } from '../../utils/helpers';

const SENTIMENT_COLORS = { positive: '#22c55e', neutral: '#94a3b8', negative: '#f43f5e' };
const CAT_COLORS = ['#6272f7', '#22c55e', '#f59e0b', '#f43f5e', '#a78bfa', '#06b6d4'];

function KpiCard({ label, value, change, icon: Icon, type = 'brand', loading }) {
  if (loading) return <div className={`kpi-card ${type}`}><Skeleton height={80} /></div>;
  return (
    <div className={`kpi-card ${type}`}>
      <div className="kpi-icon" style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: type === 'brand' ? 'rgba(98,114,247,0.15)' : type === 'positive' ? 'rgba(34,197,94,0.15)' : type === 'negative' ? 'rgba(244,63,94,0.15)' : 'rgba(245,158,11,0.15)', color: type === 'brand' ? '#6272f7' : type === 'positive' ? '#22c55e' : type === 'negative' ? '#f43f5e' : '#f59e0b' }}>
        <Icon size={18} />
      </div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {change && <div className={`kpi-change ${change.direction}`}>{change.text}</div>}
    </div>
  );
}

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

export default function Dashboard() {
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['analytics-summary', refreshKey],
    queryFn: getAnalyticsSummary,
    refetchInterval: 30000,
  });

  const { data: trendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ['analytics-trends', refreshKey],
    queryFn: () => getAnalyticsTrends(),
    refetchInterval: 60000,
  });

  const { data: catData, isLoading: catLoading } = useQuery({
    queryKey: ['analytics-categories', refreshKey],
    queryFn: getAnalyticsCategories,
    refetchInterval: 60000,
  });

  const { data: topicsData, isLoading: topicsLoading } = useQuery({
    queryKey: ['analytics-topics', refreshKey],
    queryFn: getAnalyticsTopics,
    refetchInterval: 60000,
  });

  const trends = trendsData?.trends || [];
  const categories = catData?.categories || [];
  const topics = topicsData?.topics?.slice(0, 10) || [];
  const emerging = topicsData?.emerging || [];

  // Sentiment donut data
  const pieData = summary ? [
    { name: 'Positive', value: summary.sentiment.positive, color: '#22c55e' },
    { name: 'Neutral', value: summary.sentiment.neutral, color: '#94a3b8' },
    { name: 'Negative', value: summary.sentiment.negative, color: '#f43f5e' },
  ] : [];

  // Category chart data
  const catChartData = categories.slice(0, 6).map(c => ({
    name: (CATEGORY_LABELS[c.category] || c.category).replace(' & ', ' '),
    total: c.total,
    positive: c.positive,
    neutral: c.neutral,
    negative: c.negative,
  }));

  const handleCategoryClick = (data) => {
    if (data?.activePayload?.[0]) {
      const cat = categories.find(c => (CATEGORY_LABELS[c.category] || c.category).replace(' & ', ' ') === data.activePayload[0].payload.name);
      if (cat) navigate(`/admin/feedback?category=${cat.category}`);
    }
  };

  const handleSentimentClick = (entry) => {
    if (entry?.name) navigate(`/admin/feedback?sentiment=${entry.name.toLowerCase()}`);
  };

  return (
    <AdminLayout>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>Dashboard</h1>
          <p style={{ color: '#475569', fontSize: '0.875rem' }}>Real-time feedback intelligence for Skyline Institute</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setRefreshKey(k => k + 1)}>
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Emerging issue alert */}
      {emerging.length > 0 && (
        <div
          className="emerging-alert animate-fade"
          onClick={() => navigate(`/admin/feedback?topic=${emerging[0].topic}`)}
          id="emerging-issue-alert"
        >
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(219,39,119,0.3))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertTriangle size={20} color="#e879f9" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: '0.2rem' }}>
              ⚡ Emerging Issue: <span style={{ color: '#e879f9' }}>#{emerging[0].topic}</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              {emerging[0].spikeRatio === 999 ? 'New this week' : `${emerging[0].spikeRatio}× spike vs. prior week`} · {emerging[0].recentCount} reports in last 7 days
              {emerging.length > 1 && ` · +${emerging.length - 1} more`}
            </div>
          </div>
          <ArrowRight size={16} color="#a78bfa" />
        </div>
      )}

      {/* KPI Row */}
      <div className="kpi-grid">
        <KpiCard
          label="Total Feedback"
          value={summary?.total ?? '—'}
          type="brand"
          icon={MessageSquare}
          loading={summaryLoading}
          change={summary?.trend ? {
            direction: summary.trend.direction === 'up' ? 'up' : 'down',
            text: `${summary.trend.direction === 'up' ? '+' : ''}${summary.trend.percent}% vs last week`,
          } : null}
        />
        <KpiCard
          label="Positive Rate"
          value={summary ? `${summary.positiveRate}%` : '—'}
          type="positive"
          icon={TrendingUp}
          loading={summaryLoading}
        />
        <KpiCard
          label="Negative Rate"
          value={summary ? `${summary.negativeRate}%` : '—'}
          type="negative"
          icon={TrendingDown}
          loading={summaryLoading}
        />
        <KpiCard
          label="Pending Review"
          value={summary?.flagged ?? '—'}
          type="warning"
          icon={ShieldAlert}
          loading={summaryLoading}
          change={summary?.flagged > 0 ? { direction: 'down', text: 'Needs moderation' } : null}
        />
      </div>

      {/* Charts Row 1: Trend + Sentiment */}
      <div className="chart-grid-3" style={{ marginBottom: '1rem' }}>
        {/* Trend line */}
        <div className="card">
          <div className="chart-header">
            <div className="chart-title">Sentiment Trend (30 days)</div>
            <Activity size={16} color="#475569" />
          </div>
          {trendsLoading ? (
            <Skeleton height={200} />
          ) : trends.length === 0 ? (
            <EmptyState icon="📈" title="No trend data yet" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trends}>
                <defs>
                  <linearGradient id="posGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="negGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fill: '#475569', fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="positive" stroke="#22c55e" fill="url(#posGrad)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="neutral" stroke="#94a3b8" fill="transparent" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
                <Area type="monotone" dataKey="negative" stroke="#f43f5e" fill="url(#negGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Sentiment donut */}
        <div className="card">
          <div className="chart-header">
            <div className="chart-title">Sentiment Split</div>
          </div>
          {summaryLoading ? (
            <Skeleton height={200} />
          ) : (
            <div style={{ position: 'relative' }}>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value" onClick={(entry) => handleSentimentClick(entry)}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} style={{ cursor: 'pointer', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ background: '#1a2236', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: '0.8rem' }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                {pieData.map(d => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', cursor: 'pointer' }} onClick={() => handleSentimentClick(d)}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                    <span style={{ color: '#64748b' }}>{d.name}</span>
                    <span style={{ fontWeight: 700, color: d.color }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2: Categories + Topics */}
      <div className="chart-grid-2" style={{ marginBottom: '1rem' }}>
        {/* Categories bar chart */}
        <div className="card">
          <div className="chart-header">
            <div className="chart-title">Top Categories</div>
            <span style={{ fontSize: '0.7rem', color: '#475569' }}>Click to filter</span>
          </div>
          {catLoading ? (
            <Skeleton height={220} />
          ) : catChartData.length === 0 ? (
            <EmptyState icon="📊" title="No category data" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={catChartData} layout="vertical" onClick={handleCategoryClick} style={{ cursor: 'pointer' }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#475569', fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="positive" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
                <Bar dataKey="neutral" stackId="a" fill="#94a3b8" />
                <Bar dataKey="negative" stackId="a" fill="#f43f5e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Topics list */}
        <div className="card">
          <div className="chart-header">
            <div className="chart-title">Trending Topics</div>
            <span style={{ fontSize: '0.7rem', color: '#475569' }}>Click to explore</span>
          </div>
          {topicsLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {[...Array(6)].map((_, i) => <Skeleton key={i} height={36} />)}
            </div>
          ) : topics.length === 0 ? (
            <EmptyState icon="🏷️" title="No topics yet" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {topics.map((t, i) => {
                const isEmerg = t.isEmerging;
                const maxCount = topics[0].count;
                return (
                  <div
                    key={t.topic}
                    onClick={() => navigate(`/admin/feedback?topic=${t.topic}`)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: 8, cursor: 'pointer', background: isEmerg ? 'rgba(124,58,237,0.08)' : 'transparent', border: `1px solid ${isEmerg ? 'rgba(124,58,237,0.2)' : 'transparent'}`, transition: 'all 0.15s ease' }}
                    onMouseEnter={e => { if (!isEmerg) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                    onMouseLeave={e => { if (!isEmerg) e.currentTarget.style.background = 'transparent'; }}
                    id={`topic-${t.topic}`}
                  >
                    <div style={{ fontSize: '0.7rem', color: '#334155', width: 18, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</div>
                    <div style={{ flex: 1, fontSize: '0.8rem', color: isEmerg ? '#e879f9' : '#94a3b8', fontWeight: isEmerg ? 700 : 500 }}>
                      #{t.topic}
                      {isEmerg && <span style={{ marginLeft: '0.375rem', fontSize: '0.65rem', color: '#a78bfa' }}>⚡ {t.spikeRatio === 999 ? 'New' : `${t.spikeRatio}× spike`}</span>}
                    </div>
                    <div style={{ width: 60, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${(t.count / maxCount) * 100}%`, height: '100%', background: isEmerg ? 'linear-gradient(90deg, #7c3aed, #db2777)' : '#475569', borderRadius: 2 }} />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#475569', fontVariantNumeric: 'tabular-nums', minWidth: 20, textAlign: 'right' }}>{t.count}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/feedback?status=flagged')}>
          <ShieldAlert size={14} />
          Review Flagged ({summary?.flagged || 0})
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/feedback?sentiment=negative')}>
          View Negative Feedback
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/analytics')}>
          Full Analytics
        </button>
      </div>
    </AdminLayout>
  );
}
