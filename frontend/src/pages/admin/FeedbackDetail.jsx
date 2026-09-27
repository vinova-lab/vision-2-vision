import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFeedbackDetail, moderateFeedback, reanalyzeFeedback } from '../../api/client';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { SentimentBadge, StatusBadge, CategoryTag, TopicTag, UrgencyBadge, SourceBadge, ConfidenceMeter, Skeleton, EmptyState, LoadingSpinner } from '../../components/ui/Badges';
import { ArrowLeft, CheckCircle, XCircle, RefreshCw, Eye, AlertTriangle, User, Calendar, Hash } from 'lucide-react';
import { formatDate, formatRelativeTime, CATEGORY_LABELS } from '../../utils/helpers';

export default function FeedbackDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [moderateReason, setModerateReason] = useState('');
  const [showReasonFor, setShowReasonFor] = useState(null);

  const { data: feedback, isLoading, isError } = useQuery({
    queryKey: ['feedback-detail', id],
    queryFn: () => getFeedbackDetail(id),
  });

  const moderateMutation = useMutation({
    mutationFn: ({ status, reason }) => moderateFeedback(id, status, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-feedback'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
      setShowReasonFor(null);
      setModerateReason('');
    },
  });

  const reanalyzeMutation = useMutation({
    mutationFn: () => reanalyzeFeedback(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feedback-detail', id] }),
  });

  if (isLoading) return (
    <AdminLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Skeleton height={40} width={200} />
        <Skeleton height={200} />
        <Skeleton height={120} />
      </div>
    </AdminLayout>
  );

  if (isError || !feedback) return (
    <AdminLayout>
      <EmptyState icon="❌" title="Feedback not found" action={<button className="btn btn-secondary" onClick={() => navigate(-1)}>Go back</button>} />
    </AdminLayout>
  );

  const topics = feedback.topics || [];
  const ruleFallback = feedback.rule_fallback;
  const related = feedback.related || [];

  const handleModerate = (status) => {
    if (status === 'hidden') {
      setShowReasonFor('hidden');
    } else {
      moderateMutation.mutate({ status });
    }
  };

  const confirmHide = () => {
    moderateMutation.mutate({ status: 'hidden', reason: moderateReason });
  };

  return (
    <AdminLayout>
      {/* Back + header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={15} /> Back
        </button>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Feedback #{id}</h1>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => reanalyzeMutation.mutate()} disabled={reanalyzeMutation.isPending} title="Re-run analysis">
            {reanalyzeMutation.isPending ? <LoadingSpinner size={14} /> : <RefreshCw size={14} />}
            Reanalyze
          </button>
          {feedback.moderation_status !== 'approved' && (
            <button className="btn btn-success btn-sm" id="approve-btn" onClick={() => handleModerate('approved')} disabled={moderateMutation.isPending}>
              <CheckCircle size={14} /> Approve
            </button>
          )}
          {feedback.moderation_status !== 'hidden' && (
            <button className="btn btn-danger btn-sm" id="hide-btn" onClick={() => handleModerate('hidden')} disabled={moderateMutation.isPending}>
              <XCircle size={14} /> Hide
            </button>
          )}
          {feedback.moderation_status === 'hidden' && (
            <button className="btn btn-secondary btn-sm" onClick={() => handleModerate('visible')}>
              <Eye size={14} /> Restore
            </button>
          )}
        </div>
      </div>

      {/* Hide reason modal */}
      {showReasonFor === 'hidden' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card animate-scale" style={{ width: '100%', maxWidth: 420 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Hide this feedback?</h3>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Reason (optional)</label>
              <textarea className="form-control" rows={3} placeholder="Abusive language, spam, duplicate…" value={moderateReason} onChange={e => setModerateReason(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-danger" onClick={confirmHide} disabled={moderateMutation.isPending} style={{ flex: 1, justifyContent: 'center' }}>
                {moderateMutation.isPending ? <LoadingSpinner size={14} /> : 'Confirm Hide'}
              </button>
              <button className="btn btn-ghost" onClick={() => setShowReasonFor(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1rem', alignItems: 'start' }}>
        {/* Main content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Feedback text card */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <SentimentBadge sentiment={feedback.sentiment} />
              <StatusBadge status={feedback.moderation_status} />
              <UrgencyBadge urgency={feedback.urgency} />
              <SourceBadge source={feedback.source} />
              {feedback.mixed_signals && <span className="badge" style={{ background: 'rgba(139,92,246,0.12)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.2)' }}>⚡ Mixed signals</span>}
            </div>

            <div style={{ fontSize: '1rem', lineHeight: 1.75, color: '#e2e8f0', marginBottom: '1.25rem', padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
              "{feedback.text}"
            </div>

            {/* Meta row */}
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.8rem', color: '#475569' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <User size={13} />
                {feedback.is_anonymous ? 'Anonymous' : feedback.submitter_name || 'No name given'}
                {feedback.submitter_email && !feedback.is_anonymous && <span style={{ color: '#334155' }}>· {feedback.submitter_email}</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Calendar size={13} />
                {formatDate(feedback.created_at)} · {formatRelativeTime(feedback.created_at)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Hash size={13} />
                ID: {feedback.id}
              </div>
            </div>
          </div>

          {/* Analysis card */}
          <div className="card">
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1rem', color: '#94a3b8' }}>Analysis Results</h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.65rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Category</div>
                <CategoryTag category={feedback.category} onClick={() => navigate(`/admin/feedback?category=${feedback.category}`)} />
              </div>
              <div>
                <div style={{ fontSize: '0.65rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Confidence</div>
                <ConfidenceMeter confidence={feedback.confidence} />
              </div>
              <div>
                <div style={{ fontSize: '0.65rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Analysis Source</div>
                <SourceBadge source={feedback.source} />
              </div>
            </div>

            {/* Topics */}
            {topics.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.65rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Detected Topics</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                  {topics.map(t => (
                    <TopicTag key={t} topic={t} onClick={() => navigate(`/admin/feedback?topic=${t}`)} />
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            {feedback.summary && (
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 8, fontSize: '0.875rem', color: '#64748b', fontStyle: 'italic' }}>
                "{feedback.summary}"
              </div>
            )}

            {/* User's category selection */}
            {feedback.user_category_name && (
              <div style={{ marginTop: '1rem', padding: '0.625rem 0.875rem', borderRadius: 8, background: 'rgba(98,114,247,0.06)', border: '1px solid rgba(98,114,247,0.12)', fontSize: '0.8rem', color: '#64748b' }}>
                User self-classified as: <strong style={{ color: '#a5bcfd' }}>{feedback.user_category_name}</strong>
                {feedback.user_category_slug !== feedback.category && <span style={{ color: '#475569', marginLeft: '0.375rem' }}>(System overrode to: {CATEGORY_LABELS[feedback.category]})</span>}
              </div>
            )}
          </div>

          {/* Rule-engine fallback comparison */}
          {ruleFallback && feedback.source === 'ai' && (
            <div className="card" style={{ border: '1px solid rgba(139,92,246,0.2)', background: 'rgba(139,92,246,0.05)' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.75rem', color: '#a78bfa' }}>
                🛡️ Rule Engine Fallback (stored for reliability)
              </h3>
              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', fontSize: '0.8rem' }}>
                <div><span style={{ color: '#475569' }}>Sentiment: </span><SentimentBadge sentiment={ruleFallback.sentiment} /></div>
                <div><span style={{ color: '#475569' }}>Category: </span><CategoryTag category={ruleFallback.category} /></div>
                <div><span style={{ color: '#475569' }}>Confidence: </span><span style={{ color: '#64748b' }}>{Math.round(ruleFallback.confidence * 100)}%</span></div>
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#334155' }}>If the AI API had been unavailable, these rule-based results would have been used instead.</div>
            </div>
          )}

          {/* Moderation info */}
          {(feedback.moderation_status !== 'visible' || feedback.moderation_reason) && (
            <div className="card" style={{ border: '1px solid rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.05)' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <AlertTriangle size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#f59e0b', marginBottom: '0.25rem' }}>
                    {feedback.moderation_status === 'flagged' ? 'Auto-flagged for review' : `Status: ${feedback.moderation_status}`}
                  </div>
                  {feedback.moderation_reason && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{feedback.moderation_reason}</div>}
                  {feedback.moderated_at && <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.25rem' }}>Actioned: {formatDate(feedback.moderated_at)}</div>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Related */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card">
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1rem', color: '#94a3b8' }}>Related Feedback</h3>
            {related.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: '#334155', textAlign: 'center', padding: '1rem 0' }}>No related items found</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {related.map(r => (
                  <div
                    key={r.id}
                    onClick={() => navigate(`/admin/feedback/${r.id}`)}
                    className="card"
                    style={{ padding: '0.75rem', cursor: 'pointer', fontSize: '0.8rem', color: '#94a3b8' }}
                  >
                    <div style={{ marginBottom: '0.375rem' }}><SentimentBadge sentiment={r.sentiment} /></div>
                    <div style={{ color: '#cbd5e1', lineHeight: 1.5, marginBottom: '0.375rem' }}>
                      {r.text.length > 100 ? r.text.slice(0, 97) + '…' : r.text}
                    </div>
                    <div style={{ color: '#334155', fontSize: '0.7rem' }}>{formatRelativeTime(r.created_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
