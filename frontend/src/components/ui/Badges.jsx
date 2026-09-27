import React from 'react';
import { CATEGORY_LABELS, SENTIMENT_LABELS, STATUS_LABELS } from '../../utils/helpers';

export function SentimentBadge({ sentiment }) {
  if (!sentiment) return null;
  const icons = { positive: '↑', neutral: '→', negative: '↓' };
  return (
    <span className={`badge badge-${sentiment} badge-dot`}>
      {SENTIMENT_LABELS[sentiment] || sentiment}
    </span>
  );
}

export function StatusBadge({ status }) {
  if (!status) return null;
  return (
    <span className={`badge badge-${status}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export function CategoryTag({ category, onClick }) {
  const label = CATEGORY_LABELS[category] || category;
  return (
    <span
      className="badge"
      onClick={onClick}
      style={{
        background: 'rgba(98,114,247,0.12)',
        color: '#a5bcfd',
        border: '1px solid rgba(98,114,247,0.25)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
      }}
      title={label}
    >
      {label}
    </span>
  );
}

export function TopicTag({ topic, onClick, emerging }) {
  return (
    <span
      className={emerging ? 'badge badge-emerging' : 'badge'}
      onClick={onClick}
      style={!emerging ? {
        background: 'rgba(255,255,255,0.06)',
        color: '#94a3b8',
        border: '1px solid rgba(255,255,255,0.1)',
        cursor: onClick ? 'pointer' : 'default',
        fontSize: '0.7rem',
      } : { cursor: onClick ? 'pointer' : 'default', fontSize: '0.7rem' }}
    >
      {emerging && '⚡ '}#{topic}
    </span>
  );
}

export function UrgencyBadge({ urgency }) {
  const colors = { high: '#dc2626', medium: '#d97706', low: '#64748b' };
  const bg = { high: 'rgba(220,38,38,0.12)', medium: 'rgba(217,119,6,0.12)', low: 'rgba(100,116,139,0.1)' };
  const border = { high: 'rgba(220,38,38,0.3)', medium: 'rgba(217,119,6,0.3)', low: 'rgba(100,116,139,0.2)' };
  return (
    <span className="badge" style={{ background: bg[urgency], color: colors[urgency], border: `1px solid ${border[urgency]}` }}>
      {urgency === 'high' ? '🔴' : urgency === 'medium' ? '🟡' : '⚪'} {urgency}
    </span>
  );
}

export function SourceBadge({ source }) {
  return (
    <span className="badge" style={{
      background: source === 'ai' ? 'rgba(139,92,246,0.15)' : 'rgba(100,116,139,0.1)',
      color: source === 'ai' ? '#a78bfa' : '#64748b',
      border: `1px solid ${source === 'ai' ? 'rgba(139,92,246,0.3)' : 'rgba(100,116,139,0.2)'}`,
      fontSize: '0.7rem',
    }}>
      {source === 'ai' ? '🤖 AI' : '⚙️ Rule'}
    </span>
  );
}

export function ConfidenceMeter({ confidence }) {
  const pct = Math.round(confidence * 100);
  const color = pct >= 80 ? '#22c55e' : pct >= 55 ? '#f59e0b' : '#f43f5e';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ width: 60, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ fontSize: '0.7rem', color, fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
    </div>
  );
}

export function Skeleton({ height = 20, width = '100%', style }) {
  return <div className="skeleton" style={{ height, width, ...style }} />;
}

export function EmptyState({ icon = '📭', title, description, action }) {
  return (
    <div className="empty-state animate-fade">
      <div className="empty-state-icon" style={{ fontSize: '2.5rem' }}>{icon}</div>
      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem' }}>{title}</div>
      {description && <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '1rem' }}>{description}</div>}
      {action}
    </div>
  );
}

export function LoadingSpinner({ size = 20 }) {
  return (
    <div style={{
      width: size,
      height: size,
      border: '2px solid rgba(255,255,255,0.1)',
      borderTop: '2px solid #6272f7',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }} />
  );
}

// Add spin animation
const style = document.createElement('style');
style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(style);
