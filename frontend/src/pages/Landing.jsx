import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getFeedbackCount, getHealth } from '../api/client';
import { MessageSquare, Zap, TrendingUp, Shield, ArrowRight, BarChart3, Brain, CheckCircle } from 'lucide-react';

export default function Landing() {
  const [count, setCount] = useState(null);
  const [animCount, setAnimCount] = useState(0);

  const { data: feedbackCount } = useQuery({
    queryKey: ['feedback-count'],
    queryFn: getFeedbackCount,
    refetchInterval: 60000,
  });

  const { data: health } = useQuery({ queryKey: ['health'], queryFn: getHealth });

  useEffect(() => {
    if (feedbackCount != null) {
      setCount(feedbackCount);
      // Animate count
      const target = feedbackCount;
      let start = 0;
      const step = Math.ceil(target / 50);
      const timer = setInterval(() => {
        start = Math.min(start + step, target);
        setAnimCount(start);
        if (start >= target) clearInterval(timer);
      }, 30);
      return () => clearInterval(timer);
    }
  }, [feedbackCount]);

  const features = [
    { icon: Brain, title: 'AI-Powered Analysis', desc: 'Every submission is instantly classified by sentiment, category, and topic using our hybrid rule+AI engine.' },
    { icon: TrendingUp, title: 'Real-time Insights', desc: 'Watch trends emerge as feedback flows in. Spike detection alerts admins before issues escalate.' },
    { icon: BarChart3, title: 'Drill-Down Analytics', desc: 'Click any chart to explore the evidence behind each data point — from insight to raw quote in 4 clicks.' },
    { icon: Shield, title: 'Smart Moderation', desc: 'Abusive content is automatically flagged and held for review. Clean signal, always.' },
  ];

  return (
    <>
      {/* Public Header */}
      <header className="public-header">
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg, #6272f7, #8098fb)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={17} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>FeedbackAI</div>
              <div style={{ fontSize: '0.6rem', color: '#64748b' }}>Skyline Institute of Technology</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Link to="/submit" className="btn btn-primary" id="hero-submit-cta">
              <MessageSquare size={15} />
              Submit Feedback
            </Link>
            <Link to="/admin/login" style={{ fontSize: '0.8rem', color: '#475569' }}>Admin</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-grid" />
        <div className="container" style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(98,114,247,0.12)', border: '1px solid rgba(98,114,247,0.25)', borderRadius: 9999, padding: '0.375rem 1rem', fontSize: '0.75rem', color: '#a5bcfd', marginBottom: '2rem', fontWeight: 500 }}>
            <Zap size={12} />
            Hybrid AI + Rule Engine — Always Works
          </div>

          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: '1.25rem', background: 'linear-gradient(135deg, #f1f5f9 0%, #a5bcfd 60%, #8098fb 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Feedback that actually<br />gets <em style={{ fontStyle: 'normal', WebkitTextFillColor: 'transparent', background: 'linear-gradient(90deg, #6272f7, #f43f5e)', WebkitBackgroundClip: 'text' }}>understood</em>
          </h1>

          <p style={{ fontSize: '1.125rem', color: '#64748b', maxWidth: 540, margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
            Submit your thoughts in plain English. Our system instantly classifies sentiment, topics, and urgency — turning your words into actionable institutional insight.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '3rem' }}>
            <Link to="/submit" className="btn btn-primary btn-lg" id="hero-submit-main">
              <MessageSquare size={18} />
              Share Your Feedback
              <ArrowRight size={16} />
            </Link>
            <Link to="/admin/login" className="btn btn-secondary btn-lg">
              <BarChart3 size={18} />
              View Dashboard
            </Link>
          </div>

          {/* Live counter */}
          {feedbackCount != null && (
            <div className="animate-fade" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '1rem 2.5rem' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, fontVariantNumeric: 'tabular-nums', background: 'linear-gradient(90deg, #6272f7, #a5bcfd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {animCount.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 500 }}>pieces of feedback analyzed</div>
              {health?.aiEnabled && (
                <div style={{ fontSize: '0.7rem', color: '#7c3aed', marginTop: '0.25rem' }}>🤖 AI-enhanced analysis active</div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '5rem 0', background: 'rgba(17,24,39,0.8)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '0.75rem' }}>Not just a feedback form</h2>
            <p style={{ color: '#64748b', maxWidth: 480, margin: '0 auto' }}>A closed-loop intelligence system that turns complaints into priorities.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
            {features.map(({ icon: Icon, title, desc }, i) => (
              <div key={i} className="card animate-fade" style={{ animationDelay: `${i * 0.1}s` }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(98,114,247,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                  <Icon size={20} color="#6272f7" />
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>{title}</h3>
                <p style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '5rem 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '0.75rem' }}>How it works</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {[
              { step: '01', icon: '✍️', title: 'You write', desc: 'No checkboxes, no forced structure. Just describe your experience in your own words.' },
              { step: '02', icon: '⚡', title: 'AI understands', desc: 'Our engine instantly classifies sentiment, topic, and urgency — even for messy, emotional text.' },
              { step: '03', icon: '📊', title: 'Patterns emerge', desc: 'Individual entries join a live picture that shows what\'s actually breaking and how often.' },
              { step: '04', icon: '✅', title: 'Action happens', desc: 'Admins see ranked issues with evidence — not a wall of text — and can act with confidence.' },
            ].map(({ step, icon, title, desc }, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#6272f7', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>STEP {step}</div>
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{icon}</div>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>{title}</h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section style={{ padding: '3rem 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>Your voice matters. Make it count.</h2>
          <Link to="/submit" className="btn btn-primary btn-lg" id="bottom-submit-cta">
            <MessageSquare size={18} />
            Submit Feedback Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '1.5rem 0', color: '#475569', fontSize: '0.75rem', textAlign: 'center' }}>
        <div className="container">
          FeedbackAI · Skyline Institute of Technology · Built with ❤️ for better institutional intelligence
        </div>
      </footer>
    </>
  );
}
