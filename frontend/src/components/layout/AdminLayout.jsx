import React, { useState, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, MessageSquare, ShieldAlert, BarChart3,
  LogOut, ChevronRight, Menu, X, Zap, Bell
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getAnalyticsSummary } from '../../api/client';

export function AdminLayout({ children }) {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: summary } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: getAnalyticsSummary,
    refetchInterval: 30000,
  });

  const flaggedCount = summary?.flagged || 0;

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const navItems = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/feedback', icon: MessageSquare, label: 'Feedback Explorer' },
    { to: '/admin/moderation', icon: ShieldAlert, label: 'Moderation', badge: flaggedCount },
    { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  ];

  return (
    <div className="admin-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 39 }}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Zap size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f1f5f9' }}>Feedback AI</div>
            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Skyline Institute</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-title">Navigation</div>
          {navItems.map(({ to, icon: Icon, label, badge }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
              <Icon size={16} />
              {label}
              {badge > 0 && <span className="nav-badge">{badge}</span>}
            </NavLink>
          ))}

          <div className="nav-section-title" style={{ marginTop: '1.5rem' }}>Quick Links</div>
          <NavLink to="/" className="nav-link" target="_blank">
            <ChevronRight size={14} />
            Submit Feedback
          </NavLink>
        </nav>

        {/* Admin profile at bottom */}
        <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #6272f7, #8098fb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>
              {admin?.name?.[0] || 'A'}
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0' }}>{admin?.name || 'Admin'}</div>
              <div style={{ fontSize: '0.65rem', color: '#475569' }}>{admin?.email}</div>
            </div>
          </div>
          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.8rem' }} onClick={handleLogout}>
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="admin-main">
        <header className="admin-topbar">
          <button className="btn btn-ghost btn-sm" onClick={() => setSidebarOpen(!sidebarOpen)} style={{ display: 'none' }} id="sidebar-toggle">
            <Menu size={16} />
          </button>
          <div style={{ flex: 1 }} />
          {summary?.flagged > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.375rem 0.75rem', borderRadius: '9999px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b', fontSize: '0.75rem', fontWeight: 500 }}>
              <Bell size={12} />
              {summary.flagged} item{summary.flagged !== 1 ? 's' : ''} need review
            </div>
          )}
        </header>

        <div className="admin-content animate-fade">
          {children}
        </div>
      </main>
    </div>
  );
}
