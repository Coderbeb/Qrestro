'use client';
import { useEffect, useState, useCallback } from 'react';

type Stats = {
  totalRestaurants: number;
  totalOrders: number;
  platformRevenue: number;
  activeTables: number;
};

function getAuthHeader() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export default function SuperAdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch('/api/superadmin/stats', { headers: getAuthHeader() });
      const data = await res.json();
      if (data.success) setStats(data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const statCards = stats ? [
    { icon: '🏪', label: 'Registered Restaurants', value: stats.totalRestaurants, color: '#3b82f6' },
    { icon: '💰', label: 'Platform Gross Revenue', value: `₹${stats.platformRevenue.toFixed(2)}`, color: '#22c55e' },
    { icon: '📦', label: 'Total Orders Processed', value: stats.totalOrders, color: '#f59e0b' },
    { icon: '📱', label: 'Active QR Tables', value: stats.activeTables, color: '#a855f7' },
  ] : [];

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Platform Stats</h1>
          <p>Global metrics for the QRBite SaaS system</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
          {statCards.map(s => (
            <div key={s.label} className="stat-card" style={{ padding: '2rem' }}>
              <div className="stat-icon" style={{ background: `${s.color}22`, width: 56, height: 56, fontSize: '1.75rem' }}>
                {s.icon}
              </div>
              <div style={{ marginTop: '1rem' }}>
                <div className="stat-value" style={{ color: s.color, fontSize: '2rem' }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
