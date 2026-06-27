'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { RefreshCw, ShoppingBag } from 'lucide-react';
import { getAuthHeader } from '@/lib/api';
import { useSocket } from '@/lib/useSocket';

type OrderItem = {
  id: string;
  menuItemName: string;
  quantity: number;
};

type Order = {
  id: string;
  tableNumber: number;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  estimatedTime: number;
  createdAt: string;
  notes?: string | null;
  items: OrderItem[];
};

export default function KDSPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  
  // Time tick to force re-render age alerts every 30 seconds
  const [timeTick, setTimeTick] = useState(0);

  // Set ownerId from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('owner');
    if (stored) {
      try { setOwnerId(JSON.parse(stored).id); } catch { /* ignore */ }
    }
  }, []);

  const loadKDSOrders = useCallback(async () => {
    const startTime = Date.now();
    try {
      const res = await fetch('/api/orders?limit=100', { headers: getAuthHeader() });
      const data = await res.json();
      if (data.success) {
        // KDS only shows preparing orders (chef view)
        const activeKds = (data.data || []).filter(
          (o: Order) => o.status === 'preparing'
        );
        // Sort oldest first (FIFO - First In, First Out)
        activeKds.sort((a: Order, b: Order) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        setOrders(activeKds);
      }
    } finally {
      const elapsed = Date.now() - startTime;
      const delay = Math.max(0, 600 - elapsed);
      setTimeout(() => {
        setLoading(false);
        setRefreshing(false);
      }, delay);
    }
  }, []);

  // Socket.io event handlers
  const socketListeners = useMemo(() => ({
    'order:new': (data: unknown) => {
      const newOrder = data as Order;
      // New orders are initially 'pending', so we don't display them on KDS until set to 'preparing'
      if (newOrder.status === 'preparing') {
        setOrders(prev => {
          const filtered = prev.filter(o => o.id !== newOrder.id);
          const next = [...filtered, newOrder];
          return next.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        });
      }
    },
    'order:updated': (data: unknown) => {
      const updated = data as Order;
      if (updated.status === 'preparing') {
        setOrders(prev => {
          const filtered = prev.filter(o => o.id !== updated.id);
          const next = [...filtered, updated];
          return next.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        });
      } else {
        // If status changed from preparing to ready/completed/cancelled, remove it from the KDS board
        setOrders(prev => prev.filter(o => o.id !== updated.id));
      }
    },
  }), []);

  useSocket(ownerId, socketListeners);

  // Initial fetch and timer setups
  useEffect(() => {
    loadKDSOrders();

    const interval = setInterval(() => {
      setTimeTick(t => t + 1);
    }, 30000);

    return () => clearInterval(interval);
  }, [loadKDSOrders]);

  function timeSinceMins(dateStr: string) {
    const ms = Date.now() - new Date(dateStr).getTime();
    return Math.floor(ms / 60000);
  }

  function getAgingClass(dateStr: string) {
    const mins = timeSinceMins(dateStr);
    if (mins >= 15) return 'kds-alert';
    if (mins >= 10) return 'kds-warning';
    return 'kds-fresh';
  }

  if (loading) return (
    <div>
      <div className="page-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div className="skeleton skeleton-text" style={{ width: 180, height: 14, marginBottom: 6 }} />
          <div className="skeleton skeleton-text" style={{ width: 220, height: 28, marginBottom: 6 }} />
          <div className="skeleton skeleton-text" style={{ width: 280, height: 14 }} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {[1,2,3,4].map(i => (
          <div key={i} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <div className="skeleton" style={{ width: 56, height: 36, borderRadius: 'var(--radius-md)' }} />
              <div className="skeleton" style={{ width: 44, height: 24, borderRadius: 999 }} />
            </div>
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div className="skeleton skeleton-text" style={{ width: '85%', height: 18 }} />
              <div className="skeleton skeleton-text" style={{ width: '70%', height: 18 }} />
              <div className="skeleton skeleton-text" style={{ width: '55%', height: 18 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        /* KDS Page layout overrides */
        .kds-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-top: 1.5rem;
        }

        .kds-card {
          background: var(--bg-surface) !important;
          border: 1.5px solid var(--border) !important;
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          min-height: 200px;
          box-shadow: var(--shadow-md);
          overflow: hidden;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .kds-card-header {
          padding: 1rem 1.25rem;
          border-bottom: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .kds-card-body {
          flex: 1;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }

        /* Order Aging indicators */
        @keyframes kds-pulse-red {
          0%, 100% {
            border-color: var(--status-cancelled) !important;
            box-shadow: 0 0 4px rgba(220, 38, 38, 0.2);
          }
          50% {
            border-color: #ef4444 !important;
            box-shadow: 0 0 16px rgba(220, 38, 38, 0.5);
          }
        }

        .kds-card.kds-warning {
          border-color: var(--status-preparing) !important;
          box-shadow: 0 0 12px rgba(217, 119, 6, 0.15);
        }

        .kds-card.kds-alert {
          animation: kds-pulse-red 2s infinite ease-in-out;
        }

        .age-badge {
          font-size: 0.72rem;
          padding: 0.15rem 0.45rem;
          border-radius: 999px;
          font-weight: 700;
        }

        .age-badge.fresh {
          background: rgba(5, 150, 105, 0.15);
          color: var(--status-ready);
        }

        .age-badge.warning {
          background: rgba(217, 119, 6, 0.15);
          color: var(--status-preparing);
        }

        .age-badge.alert {
          background: rgba(220, 38, 38, 0.15);
          color: var(--status-cancelled);
          animation: blinker 1.5s linear infinite;
        }

        @keyframes blinker {
          50% { opacity: 0.4; }
        }
      ` }} />

      <div className="page-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <span className="page-header-pretitle" style={{ color: 'var(--accent)', fontWeight: 800 }}>KITCHEN DISPLAY SCREEN</span>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Kitchen Board</h1>
          <p style={{ fontSize: '0.875rem' }}>{orders.length} active tickets · FIFO Sorted · Auto-reloads in real-time</p>
        </div>
        <button 
          className="btn btn-ghost btn-sm" 
          onClick={() => { setRefreshing(true); loadKDSOrders(); }} 
          disabled={refreshing}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', height: '38px', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          <RefreshCw size={14} className={refreshing ? 'spin-icon' : ''} /> {refreshing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="empty-state" style={{ minHeight: '50vh', background: 'var(--bg-surface)', border: '1.5px dashed var(--border)', borderRadius: 'var(--radius-lg)' }}>
          <div className="empty-state-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5, 150, 105, 0.08)' }}>
            <ShoppingBag size={44} style={{ color: 'var(--status-ready)', strokeWidth: 1.5 }} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Kitchen Cleared!</h3>
          <p style={{ fontSize: '0.85rem' }}>No orders are waiting in prep. Great job!</p>
        </div>
      ) : (
        <div className="kds-grid">
          {orders.map(order => {
            const ageMins = timeSinceMins(order.createdAt);
            const agingClass = getAgingClass(order.createdAt);

            return (
              <div key={order.id} className={`kds-card ${agingClass}`}>
                <div className="kds-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{
                      background: 'rgba(217, 119, 6, 0.15)',
                      color: 'var(--status-preparing)',
                      fontSize: '1.35rem',
                      fontWeight: 900,
                      padding: '0.3rem 0.65rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1.5px solid var(--status-preparing)',
                      lineHeight: '1.2'
                    }}>
                      T {order.tableNumber}
                    </span>
                  </div>
                  
                  {/* Elapsed Timer Badge */}
                  <span className={`age-badge ${ageMins >= 15 ? 'alert' : ageMins >= 10 ? 'warning' : 'fresh'}`}>
                    ⏱ {ageMins}m
                  </span>
                </div>

                <div className="kds-card-body">
                  {/* Ordered Items Checklist */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {order.items.map((item, idx) => (
                      <div 
                        key={idx}
                        style={{ 
                          fontSize: '1.1rem', 
                          fontWeight: 700, 
                          color: 'var(--text-primary)', 
                          display: 'flex', 
                          alignItems: 'flex-start',
                          lineHeight: '1.3' 
                        }}
                      >
                        <span style={{ 
                          color: '#ffffff', 
                          fontWeight: 900, 
                          marginRight: '0.65rem', 
                          background: 'var(--status-pending)', 
                          padding: '0.1rem 0.45rem', 
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.95rem'
                        }}>
                          {item.quantity}x
                        </span>
                        <span style={{ flex: 1 }}>
                          {item.menuItemName}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Chef notes */}
                  {order.notes && (
                    <div style={{
                      padding: '0.5rem 0.65rem',
                      background: 'rgba(217, 119, 6, 0.1)',
                      border: '1px solid rgba(217, 119, 6, 0.25)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      color: 'var(--status-preparing)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.4rem',
                    }}>
                      <span style={{ fontSize: '1rem' }}>✍️</span>
                      <span>{order.notes}</span>
                    </div>
                  )}

                  <div style={{ marginTop: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Placed: {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span>Est: {order.estimatedTime}m</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
