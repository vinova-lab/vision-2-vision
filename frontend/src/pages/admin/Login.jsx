import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Zap, LogIn } from 'lucide-react';
import { LoadingSpinner } from '../../components/ui/Badges';

export default function AdminLogin() {
  const { admin, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (admin) return <Navigate to="/admin/dashboard" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) { setError('Please enter your email and password'); return; }
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
      {/* Background */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(98,114,247,0.12) 0%, transparent 70%)' }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="animate-scale" style={{ width: '100%', maxWidth: 400, position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #6272f7, #8098fb)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', boxShadow: '0 0 24px rgba(98,114,247,0.3)' }}>
            <Zap size={22} color="#fff" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.375rem' }}>Admin Portal</h1>
          <p style={{ fontSize: '0.8rem', color: '#475569' }}>Skyline Institute of Technology</p>
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          <form onSubmit={handleSubmit} id="admin-login-form">
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                type="email"
                className="form-control"
                placeholder="admin@skyline.edu"
                value={form.email}
                onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setError(''); }}
                autoComplete="email"
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={form.password}
                onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setError(''); }}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div style={{ padding: '0.75rem 1rem', borderRadius: 8, background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: '#f43f5e', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
                {error}
              </div>
            )}

            <button type="submit" id="login-submit" className="btn btn-primary w-full" style={{ justifyContent: 'center', padding: '0.875rem' }} disabled={loading}>
              {loading ? <><LoadingSpinner size={16} /> Signing in…</> : <><LogIn size={16} /> Sign In</>}
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '0.7rem', color: '#334155', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Demo Credentials</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: '#64748b' }}>
              <div>Email: admin@skyline.edu</div>
              <div>Password: Admin@123</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
