'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';

const features = [
  { icon: '📱', title: 'QR Code Menus', desc: 'Each table gets a unique QR code. Customers scan to see your menu instantly — no app download required.' },
  { icon: '⚡', title: 'Real-time Orders', desc: 'Orders flow straight to your dashboard the moment customers place them. Never miss an order.' },
  { icon: '🍽️', title: 'Menu Management', desc: 'Add, edit, and toggle menu items with availability in seconds from your owner dashboard.' },
  { icon: '📊', title: 'Order Tracking', desc: 'Move orders through Pending → Preparing → Ready → Completed with a single click.' },
  { icon: '🔒', title: 'Secure & Private', desc: 'JWT-based auth keeps your dashboard secure. Each restaurant is fully isolated.' },
  { icon: '🎨', title: 'Branded Experience', desc: 'Customers see your restaurant name and menu beautifully presented on every device.' },
];

export default function LandingPage() {
  const [isDark, setIsDark] = useState(true);

  // Read saved theme on mount
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    setIsDark(saved !== 'light');
  }, []);

  function toggleTheme() {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    }
  }

  return (
    <>
      {/* Nav */}
      <nav className="landing-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="sidebar-logo-icon" style={{ width: 32, height: 32, fontSize: '1rem' }}>🍴</div>
          <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>QRBite</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* Theme toggle */}
          <button
            className="btn btn-ghost btn-icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{ fontSize: '1.1rem' }}
          >
            {isDark ? '☀️' : '🌙'}
          </button>
          <Link href="/auth/login" className="btn btn-ghost btn-sm">Sign in</Link>
          <Link href="/auth/register" className="btn btn-primary btn-sm">Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-badge">
          <span>✨</span> The smarter way to take orders
        </div>
        <h1>
          Turn Tables Faster with<br />
          <span className="gradient-text">QR Code Ordering</span>
        </h1>
        <p>
          Customers scan a QR code at their table, browse your menu, and place orders — 
          all without waiting for a waiter. Your dashboard updates in real time.
        </p>
        <div className="hero-cta">
          <Link href="/auth/register" className="btn btn-primary btn-lg">
            Start Free Today →
          </Link>
          <Link href="/auth/login" className="btn btn-ghost btn-lg">
            Owner Login
          </Link>
        </div>
      </section>

      {/* Stats bar */}
      <div className="landing-stats-bar">
        <div className="landing-stats-grid">
          {[
            { value: '< 30s', label: 'Average order time' },
            { value: '∞', label: 'Menu items supported' },
            { value: '100%', label: 'Mobile friendly' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent)' }}>{s.value}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <section className="features">
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800, marginBottom: '0.75rem' }}>
            Everything you need to <span className="gradient-text">run smarter</span>
          </h2>
          <p style={{ maxWidth: 480, margin: '0 auto' }}>
            From QR generation to order management, QRBite handles it all.
          </p>
        </div>
        <div className="features-grid">
          {features.map(f => (
            <div key={f.title} className="feature-card animate-fade-in">
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Bottom */}
      <section className="landing-cta-section">
        <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800, marginBottom: '1rem' }}>
          Ready to <span className="gradient-text">transform your restaurant?</span>
        </h2>
        <p style={{ marginBottom: '2rem', maxWidth: 480, margin: '0 auto 2rem', color: 'var(--text-secondary)' }}>
          Get started in minutes. Register your restaurant, add your menu, and share QR codes with your tables.
        </p>
        <Link href="/auth/register" className="btn btn-primary btn-lg">
          Register Your Restaurant →
        </Link>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <span>🍴 QRBite — Restaurant QR Ordering</span>
        <span>Built with Next.js & Prisma</span>
      </footer>
    </>
  );
}
