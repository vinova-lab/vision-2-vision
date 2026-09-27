import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getCategories, submitFeedback } from '../api/client';
import { MessageSquare, Zap, Send, ChevronDown, User, Mail, Eye, EyeOff } from 'lucide-react';
import { LoadingSpinner } from '../components/ui/Badges';

export default function Submit() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ text: '', categoryId: '', submitterName: '', submitterEmail: '' });
  const [errors, setErrors] = useState({});
  const [isAnonymous, setIsAnonymous] = useState(true);
  const charLimit = 3000;

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: getCategories });

  const mutation = useMutation({
    mutationFn: (data) => submitFeedback(data),
    onSuccess: (data) => {
      navigate('/confirmation', { state: { result: data, text: form.text } });
    },
    onError: (err) => {
      const msg = err.response?.data?.error?.message || 'Submission failed. Please try again.';
      setErrors({ submit: msg });
    },
  });

  function validate() {
    const errs = {};
    if (!form.text.trim()) errs.text = 'Please enter your feedback';
    else if (form.text.trim().length < 5) errs.text = 'Feedback must be at least 5 characters';
    else if (form.text.length > charLimit) errs.text = `Feedback must be under ${charLimit} characters`;
    if (!isAnonymous && form.submitterEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.submitterEmail)) {
      errs.submitterEmail = 'Please enter a valid email address';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      text: form.text.trim(),
      categoryId: form.categoryId ? parseInt(form.categoryId) : null,
      submitterName: isAnonymous ? null : (form.submitterName || null),
      submitterEmail: isAnonymous ? null : (form.submitterEmail || null),
    });
  }

  const charCount = form.text.length;
  const charPct = (charCount / charLimit) * 100;
  const charColor = charPct > 90 ? '#f43f5e' : charPct > 75 ? '#f59e0b' : '#64748b';

  return (
    <>
      {/* Header */}
      <header className="public-header">
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
            <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg, #6272f7, #8098fb)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={17} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f1f5f9' }}>FeedbackAI</div>
              <div style={{ fontSize: '0.6rem', color: '#64748b' }}>Skyline Institute of Technology</div>
            </div>
          </Link>
        </div>
      </header>

      <div style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', padding: '2rem 1rem', position: 'relative', overflow: 'hidden' }}>
        {/* Background glow */}
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 300, background: 'radial-gradient(ellipse, rgba(98,114,247,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div className="container-sm animate-fade">
          {/* Page header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(98,114,247,0.12)', border: '1px solid rgba(98,114,247,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <MessageSquare size={24} color="#6272f7" />
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>Share Your Feedback</h1>
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Write in your own words — our AI will understand and categorize it automatically.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="card" style={{ padding: '2rem' }}>
              {/* Feedback text */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" htmlFor="feedback-text">
                  Your Feedback <span style={{ color: '#f43f5e' }}>*</span>
                </label>
                <textarea
                  id="feedback-text"
                  className={`form-control ${errors.text ? 'error' : ''}`}
                  rows={6}
                  placeholder="Describe your experience, issue, or suggestion... Be as specific as you like — the more detail, the better our analysis."
                  value={form.text}
                  onChange={e => { setForm(f => ({ ...f, text: e.target.value })); setErrors(e => ({ ...e, text: undefined })); }}
                  maxLength={charLimit + 100}
                />
                {errors.text && <div className="form-error">{errors.text}</div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                  <div className="form-hint">5 – {charLimit.toLocaleString()} characters</div>
                  <div style={{ fontSize: '0.7rem', color: charColor, fontVariantNumeric: 'tabular-nums' }}>
                    {charCount} / {charLimit}
                  </div>
                </div>
                {/* Char bar */}
                <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1, overflow: 'hidden', marginTop: '0.25rem' }}>
                  <div style={{ width: `${Math.min(charPct, 100)}%`, height: '100%', background: charColor, transition: 'width 0.2s ease' }} />
                </div>
              </div>

              {/* Category */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" htmlFor="feedback-category">
                  Category <span style={{ color: '#64748b', fontWeight: 400 }}>(optional — we'll detect it automatically)</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    id="feedback-category"
                    className="form-control"
                    value={form.categoryId}
                    onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                    style={{ appearance: 'none', paddingRight: '2.5rem' }}
                  >
                    <option value="">Let the system decide</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                </div>
              </div>

              {/* Anonymous toggle */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <button
                    type="button"
                    id="anonymous-toggle"
                    onClick={() => setIsAnonymous(!isAnonymous)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 1rem',
                      borderRadius: 9999,
                      border: `1px solid ${isAnonymous ? 'rgba(98,114,247,0.3)' : 'rgba(255,255,255,0.1)'}`,
                      background: isAnonymous ? 'rgba(98,114,247,0.1)' : 'rgba(255,255,255,0.04)',
                      color: isAnonymous ? '#a5bcfd' : '#64748b',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isAnonymous ? <EyeOff size={14} /> : <Eye size={14} />}
                    {isAnonymous ? 'Anonymous submission' : 'Include my details'}
                  </button>
                </div>

                {!isAnonymous && (
                  <div className="animate-fade" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="submitter-name">
                        <User size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                        Your Name
                      </label>
                      <input
                        id="submitter-name"
                        type="text"
                        className="form-control"
                        placeholder="Optional"
                        value={form.submitterName}
                        onChange={e => setForm(f => ({ ...f, submitterName: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="submitter-email">
                        <Mail size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                        Your Email
                      </label>
                      <input
                        id="submitter-email"
                        type="email"
                        className={`form-control ${errors.submitterEmail ? 'error' : ''}`}
                        placeholder="Optional — for follow-up"
                        value={form.submitterEmail}
                        onChange={e => { setForm(f => ({ ...f, submitterEmail: e.target.value })); setErrors(e => ({ ...e, submitterEmail: undefined })); }}
                      />
                      {errors.submitterEmail && <div className="form-error">{errors.submitterEmail}</div>}
                    </div>
                  </div>
                )}
              </div>

              {errors.submit && (
                <div style={{ padding: '0.75rem 1rem', borderRadius: 8, background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: '#f43f5e', fontSize: '0.875rem', marginBottom: '1rem' }}>
                  {errors.submit}
                </div>
              )}

              <button
                type="submit"
                id="feedback-submit-btn"
                className="btn btn-primary w-full"
                style={{ justifyContent: 'center', padding: '0.875rem', fontSize: '0.9rem', fontWeight: 600 }}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <>
                    <LoadingSpinner size={16} />
                    Analyzing your feedback…
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Submit Feedback
                  </>
                )}
              </button>
            </div>

            <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.75rem', color: '#334155' }}>
              🔒 Your feedback is processed securely. Email is never shared publicly.
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
