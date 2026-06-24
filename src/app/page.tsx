'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  Sparkles,
  Play,
  Check,
  ShoppingBag,
  QrCode,
  Utensils,
  Grid,
  Users,
  BarChart3,
  ClipboardCheck,
  BookOpen,
  Rocket,
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  Leaf,
  Calendar,
  Lock,
  ChevronRight,
  MousePointerClick
} from 'lucide-react';

const features = [
  {
    icon: ShoppingBag,
    color: '#059669',
    bgColor: 'rgba(5, 150, 105, 0.08)',
    title: 'Order Management',
    desc: 'Manage dine-in, takeaway and online orders seamlessly without missing a beat.'
  },
  {
    icon: Utensils,
    color: '#ea580c',
    bgColor: 'rgba(234, 88, 12, 0.08)',
    title: 'Menu Management',
    desc: 'Create, update and organize your menu categories, items and pricing with ease.'
  },
  {
    icon: QrCode,
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.08)',
    title: 'Table Management',
    desc: 'Real-time table tracking, status monitoring, and floor plan arrangements.'
  },
  {
    icon: Users,
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.08)',
    title: 'Staff Management',
    desc: 'Manage staff profiles, permissions, roles and kitchen-front counter coordination.'
  },
  {
    icon: BarChart3,
    color: '#ec4899',
    bgColor: 'rgba(236, 72, 153, 0.08)',
    title: 'Reports & Analytics',
    desc: 'Track sales, top items, revenue trends and staff performance with smart insights.'
  }
];

const DEFAULT_PARTNERS = [
  { restaurantName: 'SpiceHub', cuisine: 'Spice & Tandoor' },
  { restaurantName: 'Tandoor Tales', cuisine: 'Indian Cuisine' },
  { restaurantName: 'Urban Bites', cuisine: 'Cafe & Kitchen' },
  { restaurantName: 'Curry House', cuisine: 'Traditional Curry' },
  { restaurantName: 'Food Fiesta', cuisine: 'Multi Cuisine' },
  { restaurantName: 'The Grill Club', cuisine: 'Steakhouse' }
];

export default function LandingPage() {
  const [partners, setPartners] = useState<Array<{ id?: string; restaurantName: string; cuisine: string }>>([]);

  // Force light mode on landing page by removing data-theme attribute
  useEffect(() => {
    document.documentElement.removeAttribute('data-theme');
  }, []);

  // Fetch featured restaurants on mount
  useEffect(() => {
    async function fetchFeatured() {
      try {
        const res = await fetch('/api/public/featured');
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setPartners(json.data);
        } else {
          setPartners(DEFAULT_PARTNERS);
        }
      } catch (err) {
        console.error('Error fetching featured partners:', err);
        setPartners(DEFAULT_PARTNERS);
      }
    }
    fetchFeatured();
  }, []);

  return (
    <div className="landing-container">
      {/* Navigation Header */}
      <nav className="landing-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="landing-logo-box">
            <span>Q</span>
          </div>
          <span className="landing-logo-text">Qrestro</span>
        </div>
        
        <div className="landing-nav-links">
          <a href="#overview">Overview</a>
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#pricing">Pricing</a>
          <a href="#contact">Contact</a>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link href="/auth/login" className="btn btn-ghost btn-sm">Sign In</Link>
          <Link href="/auth/register" className="btn btn-primary btn-sm btn-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <span>Get Started</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="overview" className="hero-section">
        <div className="hero-grid">
          {/* Hero Left Info */}
          <div className="hero-content">
            <div className="hero-badge">
              <Sparkles size={12} style={{ color: 'var(--accent)' }} />
              <span>All-in-one Restaurant Management</span>
            </div>
            
            <h1 className="hero-heading">
              Run your<br />
              restaurant.<br />
              <span className="accent-text">Effortlessly.</span>
            </h1>
            
            <p className="hero-desc">
              Qrestro brings everything you need to manage your restaurant in one place — orders, menus, tables, staff, customers and more.
            </p>
            
            <div className="hero-ctas">
              <Link href="/auth/register" className="btn btn-primary btn-lg btn-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>Get Started</span>
                <ArrowUpRight size={16} />
              </Link>
              <a href="#features" className="btn btn-ghost btn-lg btn-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border)' }}>
                <span>Explore Features</span>
                <Play size={12} fill="currentColor" />
              </a>
            </div>

            {/* Benefit bullets */}
            <div className="hero-benefits">
              <div className="benefit-item">
                <CreditCard size={16} />
                <span>No credit card required</span>
              </div>
              <div className="benefit-item">
                <Leaf size={16} />
                <span>Free 14-day trial</span>
              </div>
              <div className="benefit-item">
                <Calendar size={16} />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>

          {/* Hero Right Mockup Wrapper */}
          <div className="hero-mockup-wrapper">
            {/* Blurry Atmospheric Restaurant Interior Background */}
            <div className="mockup-bg-atmosphere" />
            
            {/* Desktop Mockup Card */}
            <div className="desktop-mockup animate-float">
              {/* Browser bar */}
              <div className="browser-header">
                <div className="browser-address">dashboard.qrestro.com</div>
              </div>
              
              {/* Mock Dashboard Layout */}
              <div className="mock-app-body">
                {/* Sidebar */}
                <div className="mock-sidebar">
                  <div className="mock-sidebar-logo">
                    <span className="logo-box">Q</span>
                    <span className="logo-text">Qrestro</span>
                  </div>
                  <div className="mock-menu-list">
                    <div className="mock-menu-item active"><Grid size={12} /> Dashboard</div>
                    <div className="mock-menu-item"><ShoppingBag size={12} /> Orders</div>
                    <div className="mock-menu-item"><Utensils size={12} /> Menu</div>
                    <div className="mock-menu-item"><QrCode size={12} /> Tables</div>
                    <div className="mock-menu-item"><Users size={12} /> Staff</div>
                    <div className="mock-menu-item"><BarChart3 size={12} /> Reports</div>
                    <div className="mock-menu-item"><Lock size={12} /> Settings</div>
                  </div>
                </div>
                
                {/* Main Content Pane */}
                <div className="mock-main-content">
                  <div className="mock-topbar">
                    <div className="mock-search-bar" />
                    <div className="mock-user">
                      <div className="mock-avatar" />
                      <div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700 }}>Restaurant</div>
                        <div style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>Admin</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mock-dashboard-content">
                    <div className="mock-header">
                      <div style={{ fontWeight: 800, fontSize: '0.8rem' }}>Dashboard</div>
                    </div>
                    
                    {/* Stat Cards Grid */}
                    <div className="mock-stats-grid">
                      <div className="mock-stat-card">
                        <div className="stat-label">Today&apos;s Orders</div>
                        <div className="stat-value-group">
                          <span className="stat-value">128</span>
                          <span className="stat-change positive">+12.5%</span>
                        </div>
                      </div>
                      <div className="mock-stat-card">
                        <div className="stat-label">Total Revenue</div>
                        <div className="stat-value-group">
                          <span className="stat-value">₹48,250</span>
                          <span className="stat-change positive">+18.7%</span>
                        </div>
                      </div>
                      <div className="mock-stat-card">
                        <div className="stat-label">New Customers</div>
                        <div className="stat-value-group">
                          <span className="stat-value">32</span>
                          <span className="stat-change positive">+5.4%</span>
                        </div>
                      </div>
                      <div className="mock-stat-card">
                        <div className="stat-label">Active Tables</div>
                        <div className="stat-value-group">
                          <span className="stat-value">14</span>
                          <span className="stat-change negative">-3.1%</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Analytics Chart & List */}
                    <div className="mock-analytics-split">
                      {/* Left Chart */}
                      <div className="mock-chart-card">
                        <div style={{ fontSize: '0.6rem', fontWeight: 700, marginBottom: '0.5rem' }}>Sales Overview</div>
                        <div className="mock-chart-graph">
                          <svg viewBox="0 0 100 40" className="chart-svg">
                            <path d="M 5 35 Q 20 28, 35 24 T 65 18 T 85 26 T 95 20" fill="none" stroke="var(--accent)" strokeWidth="1.5" />
                            <circle cx="65" cy="18" r="2" fill="var(--accent)" stroke="white" strokeWidth="0.5" />
                            <g transform="translate(65, 18)">
                              {/* Tooltip Card background */}
                              <rect x="-12" y="-20" width="24" height="13" rx="2" fill="#111c24" />
                              {/* Tooltip Arrow pointing down */}
                              <polygon points="-2,-7 2,-7 0,-5" fill="#111c24" />
                              {/* Text values */}
                              <text x="0" y="-14" fill="white" fontSize="2.2" textAnchor="middle" fontWeight="800">₹8,490</text>
                              <text x="0" y="-10" fill="#8e9fae" fontSize="1.6" textAnchor="middle">May 14</text>
                            </g>
                          </svg>
                          <div className="chart-labels">
                            <span>May 10</span>
                            <span>May 11</span>
                            <span>May 12</span>
                            <span>May 13</span>
                            <span>May 14</span>
                            <span>May 15</span>
                            <span>May 16</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Right Orders List */}
                      <div className="mock-list-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                          <span style={{ fontSize: '0.6rem', fontWeight: 700 }}>Recent Orders</span>
                          <span style={{ fontSize: '0.5rem', color: 'var(--accent)' }}>View all</span>
                        </div>
                        <div className="mock-list-items">
                          {[
                            { id: '1234', time: '2 mins ago', amount: '₹ 850' },
                            { id: '1233', time: '5 mins ago', amount: '₹ 1,290' },
                            { id: '1232', time: '10 mins ago', amount: '₹ 650' },
                            { id: '1231', time: '15 mins ago', amount: '₹ 1,100' },
                            { id: '1230', time: '20 mins ago', amount: '₹ 950' }
                          ].map(o => (
                            <div key={o.id} className="mock-order-row">
                              <span style={{ fontWeight: 700 }}>Order #{o.id}</span>
                              <span style={{ color: 'var(--text-muted)' }}>{o.time}</span>
                              <span style={{ fontWeight: 700 }}>{o.amount}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Mobile Phone Mockup Overlay */}
            <div className="mobile-mockup animate-float-delayed">
              <div className="phone-screen">
                <div className="phone-header">
                  <div className="phone-notch" />
                  <div className="phone-status">
                    <span style={{ fontSize: '0.5rem', fontWeight: 700 }}>9:41</span>
                    <span style={{ fontSize: '0.5rem' }}>🔋 📶</span>
                  </div>
                </div>
                
                <div className="phone-app-body">
                  <div className="phone-user-greeting">
                    <span>Hello, Admin 👋</span>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#ffbd2e' }} />
                  </div>
                  
                  <div className="phone-revenue-card">
                    <span style={{ fontSize: '0.45rem', opacity: 0.8 }}>Today&apos;s Revenue</span>
                    <div className="revenue-val-group">
                      <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>₹ 48,250</span>
                      <span className="badge-revenue">+18.7%</span>
                    </div>
                  </div>
                  
                  <div className="phone-quick-actions">
                    <div className="action-title">Quick Actions</div>
                    <div className="actions-grid">
                      <div className="action-item">
                        <div className="action-circle bg-green"><ShoppingBag size={10} /></div>
                        <span>New Order</span>
                      </div>
                      <div className="action-item">
                        <div className="action-circle bg-blue"><QrCode size={10} /></div>
                        <span>Table QR</span>
                      </div>
                      <div className="action-item">
                        <div className="action-circle bg-orange"><Utensils size={10} /></div>
                        <span>Menu</span>
                      </div>
                      <div className="action-item">
                        <div className="action-circle bg-purple"><BarChart3 size={10} /></div>
                        <span>Reports</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="phone-recent-orders">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.5rem', fontWeight: 700 }}>Recent Orders</span>
                      <span style={{ fontSize: '0.45rem', color: 'var(--accent)' }}>View all</span>
                    </div>
                    <div className="phone-orders-list">
                      {[
                        { id: '1234', time: '2 mins ago', val: '₹ 850' },
                        { id: '1233', time: '5 mins ago', val: '₹ 1,290' },
                        { id: '1232', time: '10 mins ago', val: '₹ 650' }
                      ].map(ro => (
                        <div key={ro.id} className="phone-order-row">
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.42rem' }}>Order #{ro.id}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.38rem' }}>{ro.time}</span>
                          </div>
                          <span style={{ fontWeight: 800, fontSize: '0.42rem' }}>{ro.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid Section */}
      <section id="features" className="features-section">
        <div className="features-header">
          <div className="features-header-left">
            <div className="features-badge">Everything you need</div>
            <h2 className="features-heading">
              Powerful features to<br />
              <span className="accent-text">grow</span> your business
            </h2>
          </div>
          <div className="features-header-right">
            <p className="features-desc">
              Qrestro is packed with tools that help you streamline operations, improve efficiency and deliver great customer experiences.
            </p>
          </div>
        </div>
        
        <div className="features-grid-layout">
          {features.map((f, i) => (
            <div key={i} className="feature-card-premium animate-fade-in">
              <div className="feature-icon-wrapper" style={{ background: f.bgColor }}>
                <f.icon size={22} style={{ color: f.color }} />
              </div>
              <h3 className="feature-card-title">{f.title}</h3>
              <p className="feature-card-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Partner Brands Scroller Section */}
      <section className="partners-section">
        <div className="partners-title">Trusted by restaurants across India</div>
        <div className="partners-grid">
          {partners.map((p, index) => (
            <div key={p.id || `${p.restaurantName}-${index}`} className="partner-logo">
              <span className="partner-icon-graphic" style={{ color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                {getPartnerIcon(p.restaurantName, p.cuisine)}
              </span>
              <div style={{ textAlign: 'left' }}>
                <div className="partner-name">{p.restaurantName}</div>
                <div className="partner-cuisine">{p.cuisine || 'Restaurant'}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA & Stat banner section */}
      <section id="pricing" className="cta-banner-section">
        <div className="cta-banner-container">
          {/* Banner Left Info */}
          <div className="cta-banner-left">
            <div className="banner-badge">
              <Rocket size={12} />
              <span>Get started in minutes</span>
            </div>
            
            <h2 className="banner-heading">
              Join thousands of restaurants growing with Qrestro.
            </h2>
            
            <div className="banner-bullets">
              <div className="bullet-row">
                <div className="bullet-check"><Check size={12} /></div>
                <span>No credit card required</span>
              </div>
              <div className="bullet-row">
                <div className="bullet-check"><Check size={12} /></div>
                <span>Free 14-day trial</span>
              </div>
              <div className="bullet-row">
                <div className="bullet-check"><Check size={12} /></div>
                <span>Easy setup and onboarding</span>
              </div>
            </div>
            
            <Link href="/auth/register" className="btn btn-white btn-lg btn-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', width: 'fit-content' }}>
              <span>Get Started</span>
              <ArrowUpRight size={16} />
            </Link>
          </div>
          
          {/* The background food image and overlay wrapper */}
          <div className="banner-food-wrapper">
            <div className="banner-food-bg" />
            <div className="banner-food-overlay" />
          </div>

          {/* Right side spacer for desktop grid layout */}
          <div className="cta-banner-right-spacer" />

          {/* Floating Glassmorphic Stats Overlay */}
          <div className="stats-glass-grid">
            <div className="glass-stat-card">
              <div className="glass-icon-box">
                <Users size={18} />
              </div>
              <div className="glass-stat-info">
                <div className="glass-val">10K+</div>
                <div className="glass-lbl">Happy Restaurants</div>
              </div>
            </div>
            
            <div className="glass-stat-card">
              <div className="glass-icon-box">
                <ShoppingBag size={18} />
              </div>
              <div className="glass-stat-info">
                <div className="glass-val">1M+</div>
                <div className="glass-lbl">Orders Managed</div>
              </div>
            </div>
            
            <div className="glass-stat-card">
              <div className="glass-icon-box">
                <SmileIcon size={18} />
              </div>
              <div className="glass-stat-info">
                <div className="glass-val">98%</div>
                <div className="glass-lbl">Customer Satisfaction</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Premium Theme-matching Footer */}
      <footer className="landing-footer-premium">
        <div className="footer-container">
          <div className="footer-grid">
            {/* Column 1: Brand Info */}
            <div className="footer-col brand-col">
              <div className="footer-logo">
                <div className="landing-logo-box">
                  <span>Q</span>
                </div>
                <span className="landing-logo-text">Qrestro</span>
              </div>
              <p className="footer-brand-desc">
                A premium, modern QR code ordering system designed for high-end culinary establishments and local diners.
              </p>
              <div className="footer-socials">
                <a href="#" className="social-link"><TwitterIcon size={16} /></a>
                <a href="#" className="social-link"><LinkedinIcon size={16} /></a>
                <a href="#" className="social-link"><InstagramIcon size={16} /></a>
              </div>
            </div>

            {/* Column 2: Product Links */}
            <div className="footer-col">
              <h4 className="footer-col-title">Product</h4>
              <ul className="footer-links">
                <li><a href="#">Overview</a></li>
                <li><a href="#features">Features</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><a href="/auth/register">Get Started</a></li>
              </ul>
            </div>

            {/* Column 3: Portals Links */}
            <div className="footer-col">
              <h4 className="footer-col-title">Portals</h4>
              <ul className="footer-links">
                <li><a href="/auth/login">Restaurant Admin</a></li>
                <li><a href="/auth/register">Register Business</a></li>
                <li><a href="/superadmin">Super Admin Portal</a></li>
              </ul>
            </div>

            {/* Column 4: Contact Info */}
            <div className="footer-col">
              <h4 className="footer-col-title">Contact</h4>
              <ul className="footer-contact-info">
                <li>
                  <span className="contact-label">Email Support</span>
                  <span className="contact-value">support@qrestro.com</span>
                </li>
                <li>
                  <span className="contact-label">Headquarters</span>
                  <span className="contact-value">Ranchi, Jharkhand, India</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Copyright bar */}
          <div className="footer-bottom">
            <span className="footer-copyright">
              © {new Date().getFullYear()} Qrestro. All rights reserved. Built with Next.js & Prisma.
            </span>
            <div className="footer-bottom-links">
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Simple inline sub-component for Smile icon
function SmileIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  );
}

// Inline sub-component for Twitter (X) icon
function TwitterIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
    </svg>
  );
}

// Inline sub-component for LinkedIn icon
function LinkedinIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

// Inline sub-component for Instagram icon
function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

// Simple inline sub-component for Flame icon
function FlameIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

// Simple inline sub-component for Soup icon
function SoupIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z" />
      <path d="M7 21h10" />
      <path d="M12 12V9" />
      <path d="M3 12h18" />
      <path d="M12 5V3" />
      <path d="M8 8V6" />
      <path d="M16 8V6" />
    </svg>
  );
}

// Simple inline sub-component for ChefHat icon
function ChefHatIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 18V6a4 4 0 0 1 8 0v12" />
      <path d="M18 18V9a4 4 0 0 0-8 0v9" />
      <path d="M3 18h18a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z" />
      <path d="M12 6V5a4 4 0 0 1 8 0v1" />
    </svg>
  );
}

// Simple inline sub-component for UtensilsCrossed icon
function UtensilsCrossedIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8" />
      <path d="m3 22 5.5-5.5" />
      <path d="m14 10-11 11" />
      <path d="M15 20h5a1 1 0 0 0 1-1v-5" />
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 11v4" />
    </svg>
  );
}

// Helper to resolve partner icon dynamically
function getPartnerIcon(name: string, cuisine?: string | null) {
  const text = `${name} ${cuisine || ''}`.toLowerCase();
  if (text.includes('grill') || text.includes('spice') || text.includes('steak')) {
    return <FlameIcon size={20} />;
  }
  if (text.includes('curry') || text.includes('tales') || text.includes('house')) {
    return <SoupIcon size={20} />;
  }
  if (text.includes('bites') || text.includes('cafe') || text.includes('kitchen')) {
    return <Utensils size={20} />;
  }
  if (text.includes('fiesta') || text.includes('multi') || text.includes('chef')) {
    return <ChefHatIcon size={20} />;
  }
  return <UtensilsCrossedIcon size={20} />;
}
