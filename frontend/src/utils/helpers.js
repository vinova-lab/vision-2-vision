// Shared utility/helper functions

export const CATEGORY_LABELS = {
  'hostel-accommodation': 'Hostel & Accommodation',
  'mess-food': 'Mess & Food',
  'academics-faculty': 'Academics & Faculty',
  'infrastructure-wifi': 'Infrastructure & Wi-Fi',
  'transport': 'Transport',
  'administration': 'Administration',
};

export const SENTIMENT_COLORS = {
  positive: '#22c55e',
  neutral: '#94a3b8',
  negative: '#f43f5e',
};

export const SENTIMENT_LABELS = {
  positive: 'Positive',
  neutral: 'Neutral',
  negative: 'Negative',
};

export const URGENCY_COLORS = {
  high: '#dc2626',
  medium: '#d97706',
  low: '#64748b',
};

export const STATUS_LABELS = {
  visible: 'Visible',
  flagged: 'Flagged',
  approved: 'Approved',
  hidden: 'Hidden',
};

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr.replace(' ', 'T') + 'Z');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatRelativeTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr.replace(' ', 'T') + 'Z');
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(dateStr);
}

export function truncate(str, len = 120) {
  if (!str || str.length <= len) return str;
  return str.substring(0, len - 3) + '...';
}

export function getConfidenceLabel(conf) {
  if (conf >= 0.8) return 'High';
  if (conf >= 0.55) return 'Medium';
  return 'Low';
}

export function getConfidenceColor(conf) {
  if (conf >= 0.8) return '#22c55e';
  if (conf >= 0.55) return '#f59e0b';
  return '#f43f5e';
}
