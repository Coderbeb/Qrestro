'use client';
import { useEffect, useState, useCallback } from 'react';

type Plan = { id: string; tier: string; price: string; maxTables: number; };
type Restaurant = { id: string; username: string; restaurantName: string | null; email: string; createdAt: string; plan: Plan | null; _count: { tables: number; orders: number }; };

function getAuthHeader() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export default function SuperAdminRestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3000); };

  const loadRestaurants = useCallback(async () => {
    try {
      const res = await fetch('/api/superadmin/restaurants', { headers: getAuthHeader() });
      const data = await res.json();
      if (data.success) setRestaurants(data.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadRestaurants(); }, [loadRestaurants]);

  async function updatePlan(ownerId: string, tier: string) {
    if (!confirm(`Set plan to ${tier}?`)) return;
    setUpdating(ownerId);
    try {
      const res = await fetch('/api/superadmin/restaurants', { method: 'PUT', headers: getAuthHeader(), body: JSON.stringify({ ownerId, tier }) });
      const data = await res.json();
      if (data.success) { showToast(`Plan updated to ${tier}`); loadRestaurants(); }
      else showToast(data.error?.message || 'Failed');
    } finally { setUpdating(null); }
  }

  const planBadge = (plan: Plan | null) => {
    if (!plan) return <span className="badge badge-cancelled">No Plan</span>;
    switch (plan.tier) {
      case 'PREMIUM': return <span className="badge badge-ready">🌟 Premium</span>;
      case 'PRO': return <span className="badge badge-preparing">⚡ Pro</span>;
      default: return <span className="badge badge-pending">🌱 Free</span>;
    }
  };

  return (
    <>
      <div className="page-header">
        <div><h1>Restaurants</h1><p>Manage platform tenants and subscription plans</p></div>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : restaurants.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">🏪</div><h3>No restaurants yet</h3><p>Restaurants will appear here after signup</p></div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="card sa-table-wrap" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr><th>Restaurant</th><th>Contact</th><th>Stats</th><th>Plan</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {restaurants.map(r => (
                    <tr key={r.id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{r.restaurantName || r.username}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{r.username}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem' }}>{r.email}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Joined {new Date(r.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem' }}>📱 {r._count.tables} tables</div>
                        <div style={{ fontSize: '0.85rem' }}>🛒 {r._count.orders} orders</div>
                      </td>
                      <td>{planBadge(r.plan)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {['FREE', 'PRO', 'PREMIUM'].map(tier => (
                            <button key={tier} className="btn btn-ghost btn-sm" disabled={updating === r.id || r.plan?.tier === tier} onClick={() => updatePlan(r.id, tier)} style={{ color: tier === 'PREMIUM' ? '#f43f5e' : tier === 'PRO' ? '#3b82f6' : 'inherit' }}>{tier[0] + tier.slice(1).toLowerCase()}</button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="sa-cards">
            {restaurants.map(r => (
              <div key={r.id} className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{r.restaurantName || r.username}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>@{r.username}</div>
                  </div>
                  {planBadge(r.plan)}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>{r.email}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Joined {new Date(r.createdAt).toLocaleDateString()} · 📱 {r._count.tables} tables · 🛒 {r._count.orders} orders</div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {['FREE', 'PRO', 'PREMIUM'].map(tier => (
                    <button key={tier} className="btn btn-ghost btn-sm" disabled={updating === r.id || r.plan?.tier === tier} onClick={() => updatePlan(r.id, tier)} style={{ flex: 1, color: tier === 'PREMIUM' ? '#f43f5e' : tier === 'PRO' ? '#3b82f6' : 'inherit' }}>{tier[0] + tier.slice(1).toLowerCase()}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {toast && <div className="toast-container"><div className="toast toast-success">{toast}</div></div>}
    </>
  );
}
