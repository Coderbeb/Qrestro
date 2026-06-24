'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { 
  Store, 
  IndianRupee, 
  ShoppingBag, 
  QrCode, 
  Calendar, 
  ArrowRight, 
  Activity, 
  Sparkles, 
  Zap, 
  Leaf 
} from 'lucide-react';

type Stats = {
  totalRestaurants: number;
  totalOrders: number;
  platformRevenue: number;
  activeTables: number;
};

type Plan = { id: string; tier: string; price: string; maxTables: number; };
type Restaurant = { 
  id: string; 
  username: string; 
  restaurantName: string | null; 
  email: string; 
  cuisine: string | null;
  showOnLanding: boolean;
  createdAt: string; 
  plan: Plan | null; 
  _count: { tables: number; orders: number }; 
};

function getAuthHeader() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export default function SuperAdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const headers = getAuthHeader();
      const [statsRes, restRes] = await Promise.all([
        fetch('/api/superadmin/stats', { headers }),
        fetch('/api/superadmin/restaurants', { headers })
      ]);
      
      const statsData = await statsRes.json();
      const restData = await restRes.json();
      
      if (statsData.success) setStats(statsData.data);
      if (restData.success) setRestaurants(restData.data);
    } catch (error) {
      console.error('Error loading superadmin dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Plan distribution logic
  const total = restaurants.length;
  const freeCount = restaurants.filter(r => !r.plan || r.plan.tier === 'FREE').length;
  const proCount = restaurants.filter(r => r.plan?.tier === 'PRO').length;
  const premiumCount = restaurants.filter(r => r.plan?.tier === 'PREMIUM').length;

  const freePct = total > 0 ? Math.round((freeCount / total) * 100) : 0;
  const proPct = total > 0 ? Math.round((proCount / total) * 100) : 0;
  const premiumPct = total > 0 ? Math.round((premiumCount / total) * 100) : 0;

  // Active status color badge generator
  const planBadge = (plan: Plan | null) => {
    if (!plan) return <span className="badge badge-cancelled">No Plan</span>;
    switch (plan.tier) {
      case 'PREMIUM':
        return (
          <span className="badge badge-ready" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.6rem' }}>
            <Sparkles size={11} /> Premium
          </span>
        );
      case 'PRO':
        return (
          <span className="badge badge-preparing" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.6rem' }}>
            <Zap size={11} /> Pro
          </span>
        );
      default:
        return (
          <span className="badge badge-pending" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.6rem' }}>
            <Leaf size={11} /> Free
          </span>
        );
    }
  };

  const statCards = stats ? [
    { icon: <Store size={26} />, label: 'Registered Restaurants', value: stats.totalRestaurants, color: 'var(--accent)', bg: 'var(--accent-glow)' },
    { icon: <IndianRupee size={26} />, label: 'Platform Gross Revenue', value: `₹${stats.platformRevenue.toFixed(2)}`, color: 'var(--accent-2)', bg: 'rgba(197, 168, 128, 0.12)' },
    { icon: <ShoppingBag size={26} />, label: 'Total Orders Processed', value: stats.totalOrders, color: 'var(--status-preparing)', bg: 'var(--status-preparing-bg)' },
    { icon: <QrCode size={26} />, label: 'Active QR Tables', value: stats.activeTables, color: 'var(--status-ready)', bg: 'var(--status-ready-bg)' },
  ] : [];

  const latestRestaurants = restaurants.slice(0, 5);

  return (
    <>


      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {/* Stats Grid */}
          <div className="stats-cards-grid">
            {statCards.map(s => (
              <div key={s.label} className="stat-card" style={{ padding: '1.75rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div className="stat-icon" style={{ background: s.bg, color: s.color, borderColor: s.color }}>
                  {s.icon}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                  <div className="stat-value" style={{ color: s.color, fontSize: '1.85rem', fontWeight: 700 }}>{s.value}</div>
                  <div className="stat-label" style={{ fontSize: '0.78rem' }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Split Dashboard Content */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
            {/* Medias query styling for desktop is handled via inline styles combined or CSS classes */}
            <div className="dashboard-grid-2col" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
              
              {/* Left Column — Latest Signups */}
              <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1.25rem', fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 700 }}>
                    <Activity size={20} style={{ color: 'var(--accent)' }} /> Latest Restaurant Signups
                  </h3>
                  <Link href="/superadmin/restaurants" className="btn btn-ghost btn-sm" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                    View All <ArrowRight size={12} />
                  </Link>
                </div>

                {latestRestaurants.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No signups yet.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', flex: 1 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                          <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Restaurant</th>
                          <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Plan</th>
                          <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Joined</th>
                          <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Stats</th>
                        </tr>
                      </thead>
                      <tbody>
                        {latestRestaurants.map(r => (
                          <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '0.85rem 0.5rem' }}>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.restaurantName || r.username}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{r.username}</div>
                            </td>
                            <td style={{ padding: '0.85rem 0.5rem' }}>{planBadge(r.plan)}</td>
                            <td style={{ padding: '0.85rem 0.5rem', color: 'var(--text-secondary)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}>
                                <Calendar size={12} style={{ opacity: 0.7 }} />
                                {new Date(r.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </div>
                            </td>
                            <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                              <div>{r._count.tables} tables</div>
                              <div>{r._count.orders} orders</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Right Column — Plan Distribution & Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                
                {/* Plan Distribution */}
                <div className="card" style={{ padding: '2rem' }}>
                  <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sparkles size={20} style={{ color: 'var(--accent)' }} /> Plan Distribution
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Free Plan */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.4rem', fontWeight: 600 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-primary)' }}>
                          <Leaf size={14} style={{ color: 'var(--status-pending)' }} /> Free Tier
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>{freeCount} ({freePct}%)</span>
                      </div>
                      <div style={{ height: 8, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ width: `${freePct}%`, height: '100%', background: 'var(--status-pending)', borderRadius: 999, transition: 'width 0.8s ease-out' }} />
                      </div>
                    </div>

                    {/* Pro Plan */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.4rem', fontWeight: 600 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-primary)' }}>
                          <Zap size={14} style={{ color: 'var(--status-preparing)' }} /> Pro Tier
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>{proCount} ({proPct}%)</span>
                      </div>
                      <div style={{ height: 8, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ width: `${proPct}%`, height: '100%', background: 'var(--status-preparing)', borderRadius: 999, transition: 'width 0.8s ease-out' }} />
                      </div>
                    </div>

                    {/* Premium Plan */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.4rem', fontWeight: 600 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-primary)' }}>
                          <Sparkles size={14} style={{ color: 'var(--status-ready)' }} /> Premium Tier
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>{premiumCount} ({premiumPct}%)</span>
                      </div>
                      <div style={{ height: 8, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ width: `${premiumPct}%`, height: '100%', background: 'var(--status-ready)', borderRadius: 999, transition: 'width 0.8s ease-out' }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions Shortcuts */}
                <div className="card" style={{ padding: '2rem' }}>
                  <h3 style={{ marginBottom: '1.25rem', fontSize: '1.25rem', fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 700 }}>
                    Quick Shortcuts
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <Link href="/superadmin/restaurants" className="btn btn-primary btn-full" style={{ justifyContent: 'space-between' }}>
                      <span>Manage All Tenants</span>
                      <ArrowRight size={16} />
                    </Link>
                    <Link href="/" className="btn btn-ghost btn-full" style={{ justifyContent: 'space-between' }}>
                      <span>Go to Public Landing Page</span>
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}
