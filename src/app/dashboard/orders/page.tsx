'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Clock, ChefHat, CheckCircle2, Check, RefreshCw, ShoppingBag, X } from 'lucide-react';

type OrderItem = {
  id: string;
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  price: number;
};

type Order = {
  id: string;
  tableNumber: number;
  status: string;
  totalAmount: number;
  estimatedTime: number;
  createdAt: string;
  items: OrderItem[];
};

const COLUMNS = [
  { status: 'pending',   label: 'Pending',   icon: Clock, color: 'var(--status-pending)' },
  { status: 'preparing', label: 'Preparing', icon: ChefHat, color: 'var(--status-preparing)' },
  { status: 'ready',     label: 'Ready',     icon: CheckCircle2, color: 'var(--status-ready)' },
  { status: 'completed', label: 'Completed', icon: Check, color: 'var(--status-completed)' },
];

const NEXT_STATUS: Record<string, string | null> = {
  pending: 'preparing',
  preparing: 'ready',
  ready: 'completed',
  completed: null,
};

function getAuthHeader() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders?limit=100', { headers: getAuthHeader() });
      const data = await res.json();
      if (data.success) setOrders(data.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadOrders();
    // Poll every 5 seconds for new orders
    intervalRef.current = setInterval(loadOrders, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [loadOrders]);

  async function advanceStatus(order: Order) {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    setUpdating(order.id);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (data.success) {
        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: next } : o));
      }
    } finally { setUpdating(null); }
  }

  async function cancelOrder(order: Order) {
    if (!confirm('Cancel this order?')) return;
    setUpdating(order.id);
    try {
      await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify({ status: 'cancelled' }),
      });
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'cancelled' } : o));
    } finally { setUpdating(null); }
  }

  const activeOrders = orders.filter(o => o.status !== 'cancelled');
  const cancelledOrders = orders.filter(o => o.status === 'cancelled');

  function timeSince(dateStr: string) {
    // eslint-disable-next-line
    const ms = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
  }

  if (loading) return <div className="loading-center"><div className="spinner" /><span>Loading orders…</span></div>;

  return (
    <>
      <div className="page-header">
        <div>
          <span className="page-header-pretitle">Real-Time Monitor</span>
          <h1>Live Orders</h1>
          <p>{activeOrders.filter(o => o.status !== 'completed').length} active · auto-refreshes every 5s</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--status-ready)', animation: 'pulse-glow 2s ease infinite' }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Live</span>
          <button id="refresh-orders-btn" className="btn btn-ghost btn-sm" onClick={loadOrders} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {activeOrders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ShoppingBag size={40} style={{ strokeWidth: 1.5 }} /></div>
          <h3>No active orders</h3>
          <p>Orders will appear here as customers place them</p>
        </div>
      ) : (
        <div className="kanban-board">
          {COLUMNS.map(col => {
            const colOrders = activeOrders.filter(o => o.status === col.status);
            return (
              <div key={col.status} className="kanban-col">
                <div className="kanban-col-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <col.icon size={16} style={{ color: col.color }} />
                    <span style={{ color: col.color }}>{col.label}</span>
                  </div>
                  <span style={{
                    background: 'var(--bg-hover)',
                    borderRadius: 999,
                    padding: '0.1rem 0.5rem',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    fontWeight: 700,
                  }}>{colOrders.length}</span>
                </div>
                <div className="kanban-col-body">
                  {colOrders.length === 0 && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>Empty</p>
                  )}
                  {colOrders.map(order => (
                    <div key={order.id} className="order-card animate-fade-in">
                      <div className="order-card-header">
                        <div>
                          <strong style={{ fontSize: '0.9rem' }}>Table {order.tableNumber}</strong>
                          <div className="order-card-table">{timeSince(order.createdAt)}</div>
                        </div>
                        <div className="order-card-total">₹{order.totalAmount.toFixed(2)}</div>
                      </div>
                      <div className="order-card-items">
                        {order.items.map(i => `${i.menuItemName} ×${i.quantity}`).join(' · ')}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        ⏱ Est. {order.estimatedTime} min
                      </div>
                      <div className="order-card-actions">
                        {NEXT_STATUS[order.status] && (
                          <button
                            id={`advance-${order.id}`}
                            className="btn btn-primary btn-sm"
                            style={{ flex: 1 }}
                            onClick={() => advanceStatus(order)}
                            disabled={updating === order.id}
                          >
                            {updating === order.id ? '…' : `→ ${COLUMNS.find(c => c.status === NEXT_STATUS[order.status])?.label}`}
                          </button>
                        )}
                        {order.status !== 'completed' && (
                          <button
                            id={`cancel-${order.id}`}
                            className="btn btn-danger btn-sm btn-icon"
                            onClick={() => cancelOrder(order)}
                            disabled={updating === order.id}
                            title="Cancel order"
                          ><X size={14} /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancelled orders collapsed section */}
      {cancelledOrders.length > 0 && (
        <details style={{ marginTop: '2rem' }}>
          <summary style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            {cancelledOrders.length} cancelled order(s)
          </summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {cancelledOrders.map(o => (
              <div key={o.id} className="card card-sm" style={{ opacity: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Table {o.tableNumber} — {o.items.map(i => `${i.menuItemName} ×${i.quantity}`).join(', ')}</span>
                <span style={{ color: 'var(--status-cancelled)', fontSize: '0.8rem' }}>Cancelled</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </>
  );
}
