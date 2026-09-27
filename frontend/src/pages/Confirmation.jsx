import React from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { CheckCircle, TrendingUp, TrendingDown, Minus, Zap, ArrowRight, ExternalLink } from 'lucide-react';
import { SentimentBadge, CategoryTag, TopicTag, UrgencyBadge, SourceBadge, ConfidenceMeter } from '../components/ui/Badges';
import { CATEGORY_LABELS } from '../utils/helpers';

export default function Confirmation() {
  const { state } = useLocation();

  if (!state?.result) return <Navigate to="/submit" replace />;

  const { analysis, feedbackId } = state.result;
  const { text } = state;

  const sentimentIcons = { positive: <TrendingUp size={20} color="#22c55e" />, neutral: <Minus size={20} color="#94a3b8" />, negative: <TrendingDown size={20} color="#f43f5e" /> };

  return (
    <>
      <header className="public-header">
        <div className="container" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
            <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg, #6272f7, #8098fb)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={17} color="#fff" />
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f1f5f9' }}>FeedbackAI</div>
          </Link>
        </div>
      </header>

      <div style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', padding: '2rem 1rem' }}>
        <div className="container-sm animate-scale">
          {/* Success header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', border: '2px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', animation: 'scaleIn 0.4s ease' }}>
              <CheckCircle size={28} color="#22c55e" />
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>Feedback received!</h1>
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
              Here's how our system understood your feedback.
            </p>
            {analysis.moderationFlag && (
              <div style={{ marginTop: '0.75rem', padding: '0.5rem 1rem', borderRadius: 9999, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b', fontSize: '0.75rem', display: 'inline-block' }}>
                ⚠️ Your submission has been flagged for admin review
              </div>
            )}
          </div>

          {/* Analysis result card */}
          <div className="analysis-result animate-fade" style={{ marginBottom: '1.5rem' }}>
            <div className="analysis-result-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {sentimentIcons[analysis.sentiment]}
                  <span style={{ fontSize: '1rem', fontWeight: 700 }}>
                    {analysis.sentiment === 'positive' ? 'Positive Feedback' : analysis.sentiment === 'negative' ? 'Issue Report' : 'Neutral Feedback'}
                  </span>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <SentimentBadge sentiment={analysis.sentiment} />
                  <SourceBadge source={analysis.source} />
                </div>
              </div>
              {/* Summary */}
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.04)', borderRadius: 8, fontSize: '0.875rem', color: '#94a3b8', fontStyle: 'italic', lineHeight: 1.6 }}>
                "{analysis.summary || text}"
              </div>
            </div>

            <div className="analysis-grid">
              <div className="analysis-item">
                <div style={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569', marginBottom: '0.5rem' }}>Category</div>
                <CategoryTag category={analysis.category} />
              </div>
              <div className="analysis-item">
                <div style={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569', marginBottom: '0.5rem' }}>Urgency</div>
                <UrgencyBadge urgency={analysis.urgency} />
              </div>
              <div className="analysis-item">
                <div style={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569', marginBottom: '0.5rem' }}>Confidence</div>
                <ConfidenceMeter confidence={analysis.confidence} />
              </div>
            </div>

            {/* Topics */}
            {analysis.topics?.length > 0 && (
              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569', marginBottom: '0.625rem' }}>Detected Topics</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                  {analysis.topics.map(t => <TopicTag key={t} topic={t} />)}
                  {analysis.mixedSignals && <span className="badge" style={{ background: 'rgba(139,92,246,0.12)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.2)', fontSize: '0.7rem' }}>⚡ Mixed signals</span>}
                </div>
              </div>
            )}
          </div>

          {/* What happens next */}
          <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: '#94a3b8' }}>What happens next</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {[
                'Your feedback is now included in the institutional analytics dashboard',
                'If it\'s part of a recurring pattern, it surfaces in the trending topics',
                'Administrators can see, review, and act on it directly',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.625rem', fontSize: '0.8rem', color: '#64748b', alignItems: 'flex-start' }}>
                  <span style={{ color: '#22c55e', flexShrink: 0, marginTop: '0.05rem' }}>✓</span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/submit" className="btn btn-secondary" id="submit-another-btn">
              Submit another
            </Link>
            <Link to="/" className="btn btn-ghost">
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
