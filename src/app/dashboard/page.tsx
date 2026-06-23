'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

type Stats = {
  totalOrders: number;
  todayOrders: number;
  todayRevenue: number;
  pendingOrders: number;
  menuItems: number;
  tables: number;
};
type RecentOrder = {
  id: string;
  tableNumber: number;
  status: string;
  totalAmount: number;
  createdAt: string;
  items: { menuItemName: string; quantity: number }[];
};

function getAuthHeader() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const headers = getAuthHeader();
      const [statsRes, ordersRes] = await Promise.all([
        fetch('/api/stats', { headers }),
        fetch('/api/orders?limit=8', { headers }),
      ]);
      const [statsData, ordersData] = await Promise.all([
        statsRes.json(), ordersRes.json(),
      ]);

      if (statsData.success) {
        setStats(statsData.data);
      }
      if (ordersData.success) {
        setRecentOrders(ordersData.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const statCards = stats ? [
    { icon: '🛒', label: "Today's Orders", value: stats.todayOrders, bg: '#7c6dfa22', color: 'var(--accent)' },
    { icon: '💰', label: "Today's Revenue", value: `₹${stats.todayRevenue.toFixed(2)}`, bg: '#22c55e22', color: 'var(--status-ready)' },
    { icon: '⏳', label: 'Active Orders', value: stats.pendingOrders, bg: '#f9731622', color: 'var(--status-pending)' },
    { icon: '🍽️', label: 'Menu Items', value: stats.menuItems, bg: '#eab30822', color: 'var(--status-preparing)' },
    { icon: '📱', label: 'Tables', value: stats.tables, bg: '#a855f722', color: '#a855f7' },
    { icon: '📦', label: 'Total Orders', value: stats.totalOrders, bg: '#6b728022', color: 'var(--text-secondary)' },
  ] : [];

  const statusBadge = (status: string) => (
    <span className={`badge badge-${status}`}>
      {status === 'pending' ? '⏳' : status === 'preparing' ? '👨‍🍳' : status === 'ready' ? '✅' : '✔️'} {status}
    </span>
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Overview of your restaurant activity</p>
        </div>
        <Link href="/dashboard/orders" id="view-orders-btn" className="btn btn-primary">
          View Live Orders →
        </Link>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /><span>Loading stats…</span></div>
      ) : (
        <>
          {/* Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {statCards.map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-icon" style={{ background: s.bg }}>
                  <span style={{ fontSize: '1.25rem' }}>{s.icon}</span>
                </div>
                <div>
                  <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Orders */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3>Recent Orders</h3>
              <Link href="/dashboard/orders" className="btn btn-ghost btn-sm">View all →</Link>
            </div>
            {recentOrders.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <h3>No orders yet</h3>
                <p>Orders will appear here once customers scan their QR codes</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Table</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map(order => (
                      <tr key={order.id}>
                        <td><strong>Table {order.tableNumber}</strong></td>
                        <td style={{ color: 'var(--text-secondary)', maxWidth: 220 }}>
                          {order.items.map(i => `${i.menuItemName} ×${i.quantity}`).join(', ')}
                        </td>
                        <td><strong>₹{order.totalAmount.toFixed(2)}</strong></td>
                        <td>{statusBadge(order.status)}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
