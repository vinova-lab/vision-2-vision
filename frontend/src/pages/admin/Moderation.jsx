import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdminFeedback, moderateFeedback } from '../../api/client';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { SentimentBadge, CategoryTag, TopicTag, Skeleton, EmptyState, LoadingSpinner } from '../../components/ui/Badges';
import { ShieldAlert, CheckCircle, XCircle, Eye, ChevronRight } from 'lucide-react';
import { formatRelativeTime } from '../../utils/helpers';

export default function Moderation() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-feedback-moderation'],
    queryFn: () => getAdminFeedback({ status: 'flagged', limit: 50 }),
    refetchInterval: 30000,
  });

  const moderateMutation = useMutation({
    mutationFn: ({ id, status, reason }) => moderateFeedback(id, status, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feedback-moderation'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
    },
  });

  const flagged = data?.feedback || [];

  return (
    <AdminLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>Moderation Queue</h1>
          <p style={{ color: '#475569', fontSize: '0.875rem' }}>
            {isLoading ? '...' : `${flagged.length} item${flagged.length !== 1 ? 's' : ''} need review`}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: 9999, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b', fontSize: '0.8rem' }}>
          <ShieldAlert size={15} />
          Flagged items
        </div>
      </div>

      <div style={{ marginBottom: '1rem', padding: '0.875rem 1.25rem', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', fontSize: '0.8rem', color: '#64748b', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <span>✅ <strong>Approve</strong> — Content is appropriate, make it visible</span>
        <span>🚫 <strong>Hide</strong> — Remove from public view permanently</span>
        <span>🔍 Click any row to view full detail</span>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {isLoading ? (
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[...Array(4)].map((_, i) => <Skeleton key={i} height={100} />)}
          </div>
        ) : flagged.length === 0 ? (
          <EmptyState
            icon="✅"
            title="Queue is clear!"
            description="All feedback has been moderated. No pending items."
          />
        ) : (
          <div>
            {flagged.map((item, i) => (
              <div
                key={item.id}
                id={`moderation-item-${item.id}`}
                style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', padding: '1.25rem', borderBottom: i < flagged.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ padding: '0.2rem 0.5rem', borderRadius: 9999, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b', fontSize: '0.7rem', fontWeight: 600 }}>
                      ⚠️ Auto-flagged
                    </span>
                    <SentimentBadge sentiment={item.sentiment} />
                    <CategoryTag category={item.category} />
                  </div>

                  <div
                    style={{ fontSize: '0.875rem', color: '#cbd5e1', lineHeight: 1.6, marginBottom: '0.5rem', cursor: 'pointer' }}
                    onClick={() => navigate(`/admin/feedback/${item.id}`)}
                  >
                    {item.text.length > 250 ? item.text.slice(0, 247) + '…' : item.text}
                  </div>

                  <div style={{ fontSize: '0.75rem', color: '#334155', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <span>{item.is_anonymous ? 'Anonymous' : item.submitter_name}</span>
                    <span>{formatRelativeTime(item.created_at)}</span>
                    {item.moderation_reason && (
                      <span style={{ color: '#f59e0b' }}>Reason: {item.moderation_reason}</span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end', flexShrink: 0 }}>
                  <button
                    id={`approve-${item.id}`}
                    className="btn btn-success btn-sm"
                    onClick={() => moderateMutation.mutate({ id: item.id, status: 'approved' })}
                    disabled={moderateMutation.isPending}
                    style={{ minWidth: 90 }}
                  >
                    <CheckCircle size={13} />
                    Approve
                  </button>
                  <button
                    id={`hide-${item.id}`}
                    className="btn btn-danger btn-sm"
                    onClick={() => moderateMutation.mutate({ id: item.id, status: 'hidden', reason: 'Manually hidden by admin' })}
                    disabled={moderateMutation.isPending}
                    style={{ minWidth: 90 }}
                  >
                    <XCircle size={13} />
                    Hide
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => navigate(`/admin/feedback/${item.id}`)}
                    style={{ minWidth: 90, fontSize: '0.7rem' }}
                  >
                    <ChevronRight size={13} />
                    Detail
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
