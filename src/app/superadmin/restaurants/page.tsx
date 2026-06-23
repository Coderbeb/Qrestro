'use client';
import { useEffect, useState, useCallback } from 'react';

type Plan = {
  id: string;
  tier: string;
  price: string;
  maxTables: number;
};

type Restaurant = {
  id: string;
  username: string;
  restaurantName: string | null;
  email: string;
  createdAt: string;
  plan: Plan | null;
  _count: { tables: number; orders: number };
};

function getAuthHeader() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export default function SuperAdminRestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const loadRestaurants = useCallback(async () => {
    try {
      const res = await fetch('/api/superadmin/restaurants', { headers: getAuthHeader() });
      const data = await res.json();
      if (data.success) setRestaurants(data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRestaurants(); }, [loadRestaurants]);

  async function updatePlan(ownerId: string, tier: string) {
    if (!confirm(`Upgrade restaurant to ${tier} plan?`)) return;
    setUpdating(ownerId);
    try {
      const res = await fetch('/api/superadmin/restaurants', {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify({ ownerId, tier }),
      });
      const data = await res.json();
      if (data.success) {
        loadRestaurants(); // reload to get new plan details
      } else {
        alert(data.error?.message || 'Failed to update plan');
      }
    } finally {
      setUpdating(null);
    }
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
        <div>
          <h1>Restaurants</h1>
          <p>Manage platform tenants and their subscription plans</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Restaurant</th>
                  <th>Contact</th>
                  <th>Stats</th>
                  <th>Current Plan</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {restaurants.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{r.restaurantName || r.username}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {r.id.split('-')[0]}</div>
                    </td>
                    <td>
                      <div>{r.email}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Joined {new Date(r.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td>
                      <div>📱 {r._count.tables} tables</div>
                      <div>🛒 {r._count.orders} orders</div>
                    </td>
                    <td>{planBadge(r.plan)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => updatePlan(r.id, 'FREE')}
                          disabled={updating === r.id || r.plan?.tier === 'FREE'}
                        >Free</button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => updatePlan(r.id, 'PRO')}
                          disabled={updating === r.id || r.plan?.tier === 'PRO'}
                          style={{ color: '#3b82f6' }}
                        >Pro</button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => updatePlan(r.id, 'PREMIUM')}
                          disabled={updating === r.id || r.plan?.tier === 'PREMIUM'}
                          style={{ color: '#f43f5e' }}
                        >Premium</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
