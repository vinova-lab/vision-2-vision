import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdminFeedback, moderateFeedback } from '../../api/client';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { SentimentBadge, StatusBadge, CategoryTag, TopicTag, UrgencyBadge, Skeleton, EmptyState } from '../../components/ui/Badges';
import { Search, X, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { formatRelativeTime, CATEGORY_LABELS } from '../../utils/helpers';

const SENTIMENTS = ['positive', 'neutral', 'negative'];
const STATUSES = ['visible', 'flagged', 'approved', 'hidden'];
const CATEGORIES = Object.keys(CATEGORY_LABELS);

export default function FeedbackExplorer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');

  const filters = {
    sentiment: searchParams.get('sentiment') || '',
    category: searchParams.get('category') || '',
    topic: searchParams.get('topic') || '',
    status: searchParams.get('status') || '',
    q: searchParams.get('q') || '',
    page: parseInt(searchParams.get('page') || '1'),
    sort: searchParams.get('sort') || 'newest',
  };

  const setFilter = (key, value) => {
    const p = new URLSearchParams(searchParams);
    if (value) p.set(key, value); else p.delete(key);
    p.delete('page');
    setSearchParams(p);
  };

  const clearAll = () => setSearchParams({});

  const hasActiveFilters = filters.sentiment || filters.category || filters.topic || filters.status || filters.q;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-feedback', filters],
    queryFn: () => getAdminFeedback({ ...filters }),
    keepPreviousData: true,
  });

  const moderateMutation = useMutation({
    mutationFn: ({ id, status }) => moderateFeedback(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-feedback'] }),
  });

  const feedback = data?.feedback || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };

  useEffect(() => {
    const t = setTimeout(() => setFilter('q', searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  return (
    <AdminLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>Feedback Explorer</h1>
          <p style={{ color: '#475569', fontSize: '0.875rem' }}>
            {pagination.total} entries
            {hasActiveFilters && ' (filtered)'}
          </p>
        </div>
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', padding: '0.75rem 1rem', background: 'rgba(98,114,247,0.06)', borderRadius: 10, border: '1px solid rgba(98,114,247,0.15)' }}>
          <span style={{ fontSize: '0.75rem', color: '#6272f7', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Filter size={12} /> Active filters:</span>
          {filters.sentiment && <span className="filter-chip active">{filters.sentiment} <X size={10} style={{ cursor: 'pointer' }} onClick={() => setFilter('sentiment', '')} /></span>}
          {filters.category && <span className="filter-chip active">{CATEGORY_LABELS[filters.category] || filters.category} <X size={10} style={{ cursor: 'pointer' }} onClick={() => setFilter('category', '')} /></span>}
          {filters.topic && <span className="filter-chip active">#{filters.topic} <X size={10} style={{ cursor: 'pointer' }} onClick={() => setFilter('topic', '')} /></span>}
          {filters.status && <span className="filter-chip active">{filters.status} <X size={10} style={{ cursor: 'pointer' }} onClick={() => setFilter('status', '')} /></span>}
          {filters.q && <span className="filter-chip active">"{filters.q}" <X size={10} style={{ cursor: 'pointer' }} onClick={() => { setFilter('q', ''); setSearchInput(''); }} /></span>}
          <button className="btn btn-ghost btn-sm" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }} onClick={clearAll}>Clear all</button>
        </div>
      )}

      {/* Filter bar */}
      <div className="filter-bar" style={{ marginBottom: '1rem' }}>
        {/* Search */}
        <div className="search-input-wrapper">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            className="form-control"
            placeholder="Search feedback text…"
            id="feedback-search"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            style={{ paddingLeft: '2.25rem' }}
          />
        </div>

        {/* Sentiment */}
        {SENTIMENTS.map(s => (
          <button key={s} className={`filter-chip ${filters.sentiment === s ? 'active' : ''}`} onClick={() => setFilter('sentiment', filters.sentiment === s ? '' : s)}>
            {s === 'positive' ? '↑' : s === 'negative' ? '↓' : '→'} {s}
          </button>
        ))}

        {/* Status */}
        <select className="form-control" style={{ width: 'auto', padding: '0.375rem 0.75rem', fontSize: '0.8rem' }} value={filters.status} onChange={e => setFilter('status', e.target.value)} id="status-filter">
          <option value="">All Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Category */}
        <select className="form-control" style={{ width: 'auto', padding: '0.375rem 0.75rem', fontSize: '0.8rem' }} value={filters.category} onChange={e => setFilter('category', e.target.value)} id="category-filter">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </select>

        {/* Sort */}
        <select className="form-control" style={{ width: 'auto', padding: '0.375rem 0.75rem', fontSize: '0.8rem' }} value={filters.sort} onChange={e => setFilter('sort', e.target.value)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      {/* Feedback list */}
      <div className="card" style={{ padding: 0 }}>
        {isLoading ? (
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[...Array(5)].map((_, i) => <Skeleton key={i} height={80} />)}
          </div>
        ) : isError ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#f43f5e' }}>Failed to load feedback. Please refresh.</div>
        ) : feedback.length === 0 ? (
          <EmptyState icon="🔍" title="No feedback matches your filters" description="Try adjusting or clearing your filter criteria." action={<button className="btn btn-secondary btn-sm" onClick={clearAll}>Clear all filters</button>} />
        ) : (
          <div>
            {feedback.map((item, i) => (
              <div
                key={item.id}
                id={`feedback-row-${item.id}`}
                onClick={() => navigate(`/admin/feedback/${item.id}`)}
                style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', padding: '1rem 1.25rem', borderBottom: i < feedback.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', cursor: 'pointer', transition: 'background 0.15s ease' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem', flexWrap: 'wrap' }}>
                    <SentimentBadge sentiment={item.sentiment} />
                    <CategoryTag category={item.category} />
                    <StatusBadge status={item.moderation_status} />
                    <UrgencyBadge urgency={item.urgency} />
                    {item.mixed_signals && <span className="badge" style={{ background: 'rgba(139,92,246,0.12)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.2)', fontSize: '0.65rem' }}>Mixed</span>}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#cbd5e1', lineHeight: 1.5, marginBottom: '0.375rem' }}>
                    {item.text.length > 180 ? item.text.slice(0, 177) + '…' : item.text}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {item.topics?.slice(0, 4).map(t => <TopicTag key={t} topic={t} />)}
                    <span style={{ fontSize: '0.7rem', color: '#334155' }}>
                      {item.is_anonymous ? 'Anonymous' : item.submitter_name} · {formatRelativeTime(item.created_at)}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.7rem', color: '#334155', fontVariantNumeric: 'tabular-nums' }}>#{item.id}</span>
                  {item.moderation_status === 'flagged' && (
                    <div style={{ display: 'flex', gap: '0.375rem' }} onClick={e => e.stopPropagation()}>
                      <button className="btn btn-success btn-sm" onClick={() => moderateMutation.mutate({ id: item.id, status: 'approved' })} title="Approve">✓</button>
                      <button className="btn btn-danger btn-sm" onClick={() => moderateMutation.mutate({ id: item.id, status: 'hidden' })} title="Hide">✗</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginTop: '1rem' }}>
          <button className="btn btn-ghost btn-sm" disabled={pagination.page <= 1} onClick={() => setFilter('page', String(pagination.page - 1))}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Page {pagination.page} of {pagination.totalPages}</span>
          <button className="btn btn-ghost btn-sm" disabled={pagination.page >= pagination.totalPages} onClick={() => setFilter('page', String(pagination.page + 1))}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </AdminLayout>
  );
}
