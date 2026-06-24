'use client';
import { useEffect, useState, useCallback } from 'react';
import { Store, QrCode, ShoppingBag, Sparkles, Zap, Leaf, Search, Filter } from 'lucide-react';

type Plan = { id: string; tier: string; price: string; maxTables: number; };
type Restaurant = { 
  id: string; 
  username: string; 
  restaurantName: string | null; 
  ownerName: string | null;
  email: string; 
  phone: string | null;
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

// Custom iOS style animated toggle switch
const IOSSwitch = ({ checked, disabled, onChange }: { checked: boolean; disabled: boolean; onChange: () => void }) => {
  return (
    <div 
      onClick={() => !disabled && onChange()}
      style={{
        width: 44,
        height: 24,
        borderRadius: 999,
        background: checked ? 'var(--status-ready)' : 'var(--text-muted)',
        opacity: disabled ? 0.5 : 1,
        position: 'relative',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background var(--transition)',
        display: 'inline-block',
        verticalAlign: 'middle',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
      }}
      aria-label="Toggle visibility on landing page"
    >
      <div 
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#fff',
          position: 'absolute',
          top: 3,
          left: checked ? 23 : 3,
          transition: 'left var(--transition)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}
      />
    </div>
  );
};

export default function SuperAdminRestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<'ALL' | 'FREE' | 'PRO' | 'PREMIUM'>('ALL');
  const [landingFilter, setLandingFilter] = useState<'ALL' | 'FEATURED' | 'HIDDEN'>('ALL');

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

  async function toggleShowOnLanding(ownerId: string, currentVal: boolean) {
    setUpdating(ownerId);
    try {
      const res = await fetch('/api/superadmin/restaurants', {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify({ ownerId, showOnLanding: !currentVal })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Landing page visibility updated');
        loadRestaurants();
      } else {
        showToast(data.error?.message || 'Failed to update visibility');
      }
    } finally {
      setUpdating(null);
    }
  }

  const planBadge = (plan: Plan | null) => {
    if (!plan) return <span className="badge badge-cancelled">No Plan</span>;
    switch (plan.tier) {
      case 'PREMIUM':
        return (
          <span className="badge badge-ready" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <Sparkles size={12} /> Premium
          </span>
        );
      case 'PRO':
        return (
          <span className="badge badge-preparing" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <Zap size={12} /> Pro
          </span>
        );
      default:
        return (
          <span className="badge badge-pending" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <Leaf size={12} /> Free
          </span>
        );
    }
  };

  // Client side search and filtering calculation
  const filteredRestaurants = restaurants.filter(r => {
    const matchesSearch = 
      (r.restaurantName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.ownerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.email.toLowerCase().includes(searchQuery.toLowerCase());

    const activeTier = r.plan?.tier || 'FREE';
    const matchesPlan = planFilter === 'ALL' || activeTier === planFilter;

    const matchesLanding = 
      landingFilter === 'ALL' ||
      (landingFilter === 'FEATURED' && r.showOnLanding) ||
      (landingFilter === 'HIDDEN' && !r.showOnLanding);

    return matchesSearch && matchesPlan && matchesLanding;
  });

  return (
    <>


      {/* Search & Filter Panel */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="admin-filter-bar">
          
          {/* Search Box */}
          <div className="search-wrapper" style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="input-field" 
              placeholder="Search by name, owner, username or email..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.75rem', width: '100%' }}
            />
          </div>

          {/* Plan & Landing Filters Wrapper */}
          <div className="filters-wrapper">

            {/* Plan Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
              <Filter size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <select 
                value={planFilter} 
                onChange={e => setPlanFilter(e.target.value as any)}
                className="input-field"
                style={{ padding: '0.65rem 1rem', cursor: 'pointer', width: '100%' }}
              >
                <option value="ALL">All Plans</option>
                <option value="FREE">Free Tier</option>
                <option value="PRO">Pro Tier</option>
                <option value="PREMIUM">Premium Tier</option>
              </select>
            </div>

            {/* Landing Filter */}
            <div style={{ width: '100%' }}>
              <select 
                value={landingFilter} 
                onChange={e => setLandingFilter(e.target.value as any)}
                className="input-field"
                style={{ padding: '0.65rem 1rem', cursor: 'pointer', width: '100%' }}
              >
                <option value="ALL">All Visibility</option>
                <option value="FEATURED">Shown on Landing</option>
                <option value="HIDDEN">Hidden on Landing</option>
              </select>
            </div>

          </div>

        </div>

        {/* Counter Info */}
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Showing {filteredRestaurants.length} of {restaurants.length} total restaurants registered
        </div>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : filteredRestaurants.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Store size={40} style={{ strokeWidth: 1.5 }} />
          </div>
          <h3>No matching restaurants</h3>
          <p>Try refining your search queries or filter selectors</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="card sa-table-wrap" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '1rem', textAlign: 'left' }}>Restaurant</th>
                    <th style={{ padding: '1rem', textAlign: 'left' }}>Contact</th>
                    <th style={{ padding: '1rem', textAlign: 'left' }}>Cuisine</th>
                    <th style={{ padding: '1rem', textAlign: 'left' }}>Stats</th>
                    <th style={{ padding: '1rem', textAlign: 'left' }}>Plan</th>
                    <th style={{ padding: '1rem', textAlign: 'center' }}>Show on Landing</th>
                    <th style={{ padding: '1rem', textAlign: 'left' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRestaurants.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{r.restaurantName || r.username}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{r.username}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{r.email}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Joined {new Date(r.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{r.cuisine || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>None</span>}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.2rem', color: 'var(--text-secondary)' }}>
                          <QrCode size={13} style={{ color: 'var(--text-muted)' }} />
                          <span>{r._count.tables} tables</span>
                        </div>
                        <div style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-secondary)' }}>
                          <ShoppingBag size={13} style={{ color: 'var(--text-muted)' }} />
                          <span>{r._count.orders} orders</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>{planBadge(r.plan)}</td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <IOSSwitch 
                          checked={r.showOnLanding} 
                          disabled={updating === r.id} 
                          onChange={() => toggleShowOnLanding(r.id, r.showOnLanding)}
                        />
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {['FREE', 'PRO', 'PREMIUM'].map(tier => (
                            <button 
                              key={tier} 
                              className="btn btn-ghost btn-sm" 
                              disabled={updating === r.id || (r.plan?.tier === tier || (!r.plan && tier === 'FREE'))} 
                              onClick={() => updatePlan(r.id, tier)} 
                              style={{ 
                                padding: '0.35rem 0.7rem',
                                fontSize: '0.8rem',
                                color: tier === 'PREMIUM' ? 'var(--status-ready)' : tier === 'PRO' ? 'var(--status-preparing)' : 'var(--text-muted)' 
                              }}
                            >
                              {tier[0] + tier.slice(1).toLowerCase()}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {toast && <div className="toast-container"><div className="toast toast-success">{toast}</div></div>}
    </>
  );
}
