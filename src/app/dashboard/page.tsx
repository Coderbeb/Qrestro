'use client';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { ShoppingBag, TrendingUp, Clock, Utensils, QrCode, Package, Inbox, CheckCircle2, ChevronRight } from 'lucide-react';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { useSocket } from '@/lib/useSocket';
import { useSWRFetch, invalidateCaches, getAdaptiveInterval } from '@/lib/useSWRFetch';

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

export default function DashboardPage() {
  const refreshInterval = getAdaptiveInterval(5000);
  const { data: stats, isLoading: statsLoading } = useSWRFetch<Stats>('/api/stats', { refreshInterval });
  const { data: recentOrders, isLoading: ordersLoading } = useSWRFetch<RecentOrder[]>('/api/orders?limit=8', { refreshInterval });
  const loading = statsLoading || ordersLoading;

  const [ownerId, setOwnerId] = useState<string | null>(null);

  // Get owner ID from localStorage for Socket.io room
  useEffect(() => {
    const stored = localStorage.getItem('owner');
    if (stored) {
      try { setOwnerId(JSON.parse(stored).id); } catch { /* ignore */ }
    }
  }, []);

  // Socket.io event handlers — invalidate SWR cache for real-time updates
  const socketListeners = useMemo(() => ({
    'order:new': () => {
      invalidateCaches('/api/stats', '/api/orders?limit=8');
    },
    'order:updated': () => {
      invalidateCaches('/api/stats', '/api/orders?limit=8');
    },
  }), []);

  useSocket(ownerId, socketListeners);

  const statCards = stats ? [
    { icon: <ShoppingBag size={20} />, label: "Today's Orders", value: stats.todayOrders, bg: 'rgba(3, 77, 55, 0.08)', color: 'var(--accent)' },
    { icon: <TrendingUp size={20} />, label: "Today's Revenue", value: `₹${stats.todayRevenue.toFixed(2)}`, bg: 'rgba(5, 150, 105, 0.08)', color: 'var(--status-ready)' },
    { icon: <Clock size={20} />, label: 'Active Orders', value: stats.pendingOrders, bg: 'rgba(234, 88, 12, 0.08)', color: 'var(--status-pending)' },
    { icon: <Utensils size={20} />, label: 'Menu Items', value: stats.menuItems, bg: 'rgba(217, 119, 6, 0.08)', color: 'var(--status-preparing)' },
    { icon: <QrCode size={20} />, label: 'Tables', value: stats.tables, bg: 'rgba(197, 168, 128, 0.12)', color: 'var(--accent-2)' },
    { icon: <Package size={20} />, label: 'Total Orders', value: stats.totalOrders, bg: 'rgba(100, 116, 139, 0.08)', color: 'var(--text-secondary)' },
  ] : [];

  const statusBadge = (status: string) => (
    <span className={`badge badge-${status}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
      {status === 'pending' ? <Clock size={12} /> : status === 'preparing' ? <Utensils size={12} /> : status === 'ready' ? <CheckCircle2 size={12} /> : <CheckCircle2 size={12} />} {status}
    </span>
  );

  return (
    <>
      <div className="page-header">
        <div>
          <span className="page-header-pretitle">Overview</span>
          <h1>Dashboard</h1>
          <p>Overview of your restaurant activity</p>
        </div>
        <Link href="/dashboard/orders" id="view-orders-btn" className="btn btn-primary" style={{ gap: '0.35rem' }}>
          View Live Orders <ChevronRight size={16} />
        </Link>
      </div>

      {loading ? (
        <DashboardSkeleton type="cards" />
      ) : (
        <>
          {/* Stat Cards */}
          <div className="stats-cards-grid">
            {statCards.map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-icon" style={{ background: s.bg, color: s.color, borderColor: s.color }}>
                  {s.icon}
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
              <Link href="/dashboard/orders" className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>View all <ChevronRight size={14} /></Link>
            </div>
            {(recentOrders ?? []).length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><Inbox size={40} /></div>
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
                    {(recentOrders ?? []).map(order => (
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
