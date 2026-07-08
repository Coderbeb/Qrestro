'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Clock, ChefHat, CheckCircle2, Check, RefreshCw, ShoppingBag, X, CreditCard, Printer, CheckCircle, Bell, Plus, Minus, Search } from 'lucide-react';
import { getAuthHeader } from '@/lib/api';
import { useSocket } from '@/lib/useSocket';
import { useSWRFetch, invalidateCaches } from '@/lib/useSWRFetch';

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
  notes?: string | null;
  cancellationReason?: string | null;
  items: OrderItem[];
};

const COLUMNS = [
  { status: 'pending',   label: 'Pending',   icon: Clock, color: 'var(--status-pending)' },
  { status: 'preparing', label: 'Preparing', icon: ChefHat, color: 'var(--status-preparing)' },
  { status: 'ready',     label: 'Ready',     icon: CheckCircle2, color: 'var(--status-ready)' },
];

const NEXT_STATUS: Record<string, string | null> = {
  pending: 'preparing',
  preparing: 'ready',
  ready: 'completed',
  completed: null,
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [owner, setOwner] = useState<{ id?: string; restaurantName?: string } | null>(null);

  // Time tick to force re-render age alerts every 30 seconds
  const [timeTick, setTimeTick] = useState(0);

  // Mobile layout active tab state
  const [activeTab, setActiveTab] = useState<'pending' | 'preparing' | 'ready'>('pending');

  // Billing drawer states
  const [billingTables, setBillingTables] = useState<any[]>([]);
  const [billingDrawerTable, setBillingDrawerTable] = useState<number | null>(null);
  const [settling, setSettling] = useState(false);

  // Service alert states
  const [serviceAlerts, setServiceAlerts] = useState<{ tableNumber: number; type: string; timestamp: string; id: string }[]>([]);

  // Cancel modal states
  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Manual order states
  const [showManualOrderModal, setShowManualOrderModal] = useState(false);
  const [manualOrderTable, setManualOrderTable] = useState('');
  const [manualOrderItems, setManualOrderItems] = useState<Map<string, { id: string; name: string; price: number; quantity: number }>>(new Map());
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [tablesList, setTablesList] = useState<any[]>([]);
  const [manualOrderSearch, setManualOrderSearch] = useState('');
  const [placingManualOrder, setPlacingManualOrder] = useState(false);
  const [manualOrderNotes, setManualOrderNotes] = useState('');

  // SWR: fetch orders and billing with instant cache on re-mount, and poll every 5 seconds for real-time updates
  const { data: swrOrders, isLoading: ordersLoading } = useSWRFetch<Order[]>('/api/orders?limit=100', { refreshInterval: 3000 });
  const { data: swrBilling, isLoading: billingLoading } = useSWRFetch<any[]>('/api/billing', { refreshInterval: 3000 });
  const loading = ordersLoading;

  // Seed local state from SWR cache (only when SWR returns fresh data)
  useEffect(() => {
    if (swrOrders) setOrders(swrOrders);
  }, [swrOrders]);

  useEffect(() => {
    if (swrBilling) setBillingTables(swrBilling);
  }, [swrBilling]);

  // Get owner ID and profile details from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('owner');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setOwnerId(parsed.id);
        setOwner(parsed);
      } catch { /* ignore */ }
    }
  }, []);

  // Socket.io event handlers — optimistic local updates + SWR cache invalidation
  const socketListeners = useMemo(() => ({
    'order:new': (data: unknown) => {
      const newOrder = data as Order;
      setOrders(prev => [newOrder, ...prev.filter(o => o.id !== newOrder.id)]);
      invalidateCaches('/api/orders?limit=100', '/api/billing');
    },
    'order:updated': (data: unknown) => {
      const updated = data as Order;
      setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
      invalidateCaches('/api/orders?limit=100', '/api/billing');
    },
    'service:request': (data: unknown) => {
      const alert = data as { tableNumber: number; type: string; timestamp: string };
      if (!alert) return;
      const id = `${alert.tableNumber}-${alert.type}-${Date.now()}`;
      setServiceAlerts(prev => [...prev, { ...alert, id }]);
      // Auto-dismiss after 15 seconds
      setTimeout(() => {
        setServiceAlerts(prev => prev.filter(a => a.id !== id));
      }, 15000);
      // Play notification sound
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczGj17q9XVlEgaFVuVyN7PeTAbPJHG4dSOOhczd7zf1JY7FiRvt9jRjjAaKXKz2tWcQx0scbTa0JU5Hi5xtN7QjjMcMXW82JE3');
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch {}
    },
  }), []);

  useSocket(ownerId, socketListeners);

  // Time tick interval
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeTick(t => t + 1);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

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
        invalidateCaches('/api/orders?limit=100', '/api/billing');
      }
    } finally { setUpdating(null); }
  }

  async function cancelOrder(order: Order) {
    setCancelModalOrder(order);
    setCancelReason('');
  }

  async function openManualOrderModal() {
    setShowManualOrderModal(true);
    setManualOrderTable('');
    setManualOrderItems(new Map());
    setManualOrderSearch('');
    setManualOrderNotes('');
    try {
      const menuRes = await fetch('/api/menu?available=true', { headers: getAuthHeader() });
      const menuData = await menuRes.json();
      if (menuData.success) {
        setMenuItems(menuData.data);
      }

      const tablesRes = await fetch('/api/tables', { headers: getAuthHeader() });
      const tablesData = await tablesRes.json();
      if (tablesData.success) {
        setTablesList(tablesData.data);
      }
    } catch (err) {
      console.error('Failed to load manual order details:', err);
    }
  }

  function updateManualItemQty(itemId: string, change: number, menuItem?: any) {
    setManualOrderItems(prev => {
      const next = new Map(prev);
      const existing = next.get(itemId);
      if (existing) {
        const newQty = existing.quantity + change;
        if (newQty <= 0) {
          next.delete(itemId);
        } else {
          next.set(itemId, { ...existing, quantity: newQty });
        }
      } else if (change > 0 && menuItem) {
        next.set(itemId, {
          id: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: change
        });
      }
      return next;
    });
  }

  async function submitManualOrder() {
    if (!manualOrderTable) {
      alert('Please select or enter a table number');
      return;
    }
    const itemsList = Array.from(manualOrderItems.values()).map(item => ({
      menuItemId: item.id,
      quantity: item.quantity
    }));
    if (itemsList.length === 0) {
      alert('Please add at least one item to the order');
      return;
    }
    setPlacingManualOrder(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tableNumber: parseInt(manualOrderTable),
          items: itemsList,
          notes: manualOrderNotes.trim() || undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowManualOrderModal(false);
        invalidateCaches('/api/orders?limit=100', '/api/billing');
      } else {
        alert(data.error?.message || 'Failed to place manual order');
      }
    } catch (err) {
      alert('Network error placing manual order');
    } finally {
      setPlacingManualOrder(false);
    }
  }

  async function confirmCancelOrder() {
    if (!cancelModalOrder || !cancelReason.trim()) return;
    const order = cancelModalOrder;
    setUpdating(order.id);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify({ status: 'cancelled', cancellationReason: cancelReason.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'cancelled', cancellationReason: cancelReason.trim() } : o));
        invalidateCaches('/api/orders?limit=100', '/api/billing');
        setCancelModalOrder(null);
        setCancelReason('');
      } else {
        alert(data.error?.message || 'Failed to cancel order');
      }
    } finally { setUpdating(null); }
  }

  async function handleSettleBill(tableNumber: number) {
    if (!confirm(`Are you sure you want to mark Table ${tableNumber} as Paid and reset it for the next customer?`)) {
      return;
    }
    setSettling(true);
    try {
      const headers = getAuthHeader();
      const res = await fetch('/api/billing', {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tableNumber }),
      });
      const data = await res.json();
      if (data.success) {
        invalidateCaches('/api/orders?limit=100', '/api/billing');
        setBillingDrawerTable(null);
      } else {
        alert(data.error?.message || 'Failed to settle bill');
      }
    } catch {
      alert('Error settling bill. Please try again.');
    } finally {
      setSettling(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  const activeOrders = useMemo(() => {
    return orders
      .filter(o => o.status !== 'cancelled' && o.status !== 'completed')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [orders]);
  const cancelledOrders = orders.filter(o => o.status === 'cancelled');

  function timeSince(dateStr: string) {
    // eslint-disable-next-line
    const ms = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
  }

  function getOrderAgingClass(createdAt: string, status: string) {
    // eslint-disable-next-line
    const ms = Date.now() - new Date(createdAt).getTime();
    const mins = Math.floor(ms / 60000);

    if (status === 'pending') {
      if (mins >= 10) return 'age-alert';
      if (mins >= 5) return 'age-warning';
    } else if (status === 'preparing') {
      if (mins >= 15) return 'age-alert';
      if (mins >= 10) return 'age-warning';
    } else if (status === 'ready') {
      if (mins >= 8) return 'age-alert';
      if (mins >= 5) return 'age-warning';
    }
    return 'age-fresh';
  }

  const selectedTableBilling = billingTables.find(t => t.tableNumber === billingDrawerTable);

  if (loading) return (
    <div style={{ padding: '0' }}>
      <div className="page-header">
        <div>
          <div className="skeleton skeleton-text" style={{ width: 120, height: 14, marginBottom: 6 }} />
          <div className="skeleton skeleton-text" style={{ width: 180, height: 24, marginBottom: 6 }} />
          <div className="skeleton skeleton-text" style={{ width: 200, height: 14 }} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        {[1,2,3].map(col => (
          <div key={col} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="skeleton" style={{ height: 36, borderRadius: 'var(--radius-sm)' }} />
            {[1,2].map(card => (
              <div key={card} className="card" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div className="skeleton" style={{ width: 48, height: 32, borderRadius: 'var(--radius-sm)' }} />
                  <div className="skeleton skeleton-text" style={{ width: 60, height: 16 }} />
                </div>
                <div className="skeleton skeleton-text" style={{ width: '80%', height: 14, marginBottom: 8 }} />
                <div className="skeleton skeleton-text" style={{ width: '60%', height: 14, marginBottom: 12 }} />
                <div className="skeleton" style={{ width: '100%', height: 32, borderRadius: 'var(--radius-sm)' }} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      {/* Styles for print layout, aging alerts, mobile tabs, and drawers */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-receipt-section, #print-receipt-section * {
            visibility: visible !important;
          }
          #print-receipt-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: block !important;
          }
        }

        @keyframes age-pulse-glow {
          0%, 100% {
            box-shadow: 0 0 4px rgba(220, 38, 38, 0.15), var(--shadow-sm);
            border-color: var(--status-cancelled) !important;
          }
          50% {
            box-shadow: 0 0 16px rgba(220, 38, 38, 0.4), var(--shadow-sm);
            border-color: #ef4444 !important;
          }
        }

        .order-card.age-warning {
          border: 1.5px solid var(--status-preparing) !important;
          background: rgba(217, 119, 6, 0.03) !important;
        }

        .order-card.age-alert {
          border: 1.5px solid var(--status-cancelled) !important;
          background: rgba(220, 38, 38, 0.03) !important;
          animation: age-pulse-glow 2s infinite ease-in-out;
        }

        .age-badge {
          font-size: 0.72rem;
          padding: 0.15rem 0.45rem;
          border-radius: 999px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 0.2rem;
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

        /* Mobile Kanban Tabs styling */
        .mobile-kanban-tabs {
          display: none;
          gap: 0.5rem;
          margin-bottom: 1.25rem;
          background: var(--bg-hover);
          padding: 0.35rem;
          border-radius: var(--radius-md);
          width: 100%;
        }

        .kanban-tab-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          padding: 0.6rem 0.5rem;
          border-radius: var(--radius-sm);
          border: none;
          background: transparent;
          color: var(--text-secondary);
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          transition: all var(--transition);
        }

        .kanban-tab-btn.active {
          box-shadow: var(--shadow-sm);
        }

        /* Slide-out Drawer styling */
        .drawer-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.4);
          z-index: 2500;
          opacity: 0;
          animation: fadeInEffect 0.25s forwards ease-in-out;
        }

        .drawer-container {
          position: fixed;
          top: 0;
          bottom: 0;
          right: 0;
          width: 440px;
          max-width: 100%;
          height: 100% !important;
          background: var(--bg-surface);
          border-left: 1px solid var(--border);
          box-shadow: -10px 0 30px rgba(0, 0, 0, 0.08);
          z-index: 2501;
          display: flex;
          flex-direction: column;
          transform: translateX(100%);
          animation: slideLeftEffect 0.3s forwards cubic-bezier(0.16, 1, 0.3, 1);
          overflow: hidden !important;
        }

        @keyframes fadeInEffect {
          to { opacity: 1; }
        }

        @keyframes slideLeftEffect {
          to { transform: translateX(0); }
        }

        .drawer-header {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .drawer-body {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
        }

        .drawer-footer {
          padding: 1.25rem 1.5rem;
          border-top: 1px solid var(--border);
          background: var(--bg-base);
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        @media (max-width: 767px) {
          .mobile-kanban-tabs {
            display: flex;
          }
          .kanban-col {
            display: none !important;
          }
          .kanban-col.mobile-active {
            display: flex !important;
            width: 100% !important;
          }
          .kanban-col-header {
            display: none !important;
          }
        @media (max-width: 767px) {
          .mobile-kanban-tabs {
            display: flex;
          }
          .kanban-col {
            display: none !important;
          }
          .kanban-col.mobile-active {
            display: flex !important;
            width: 100% !important;
          }
          .kanban-col-header {
            display: none !important;
          }
          .drawer-container {
            width: 100%;
            height: 100dvh !important;
            max-height: 100dvh !important;
            top: 0;
            bottom: 0;
            overflow: hidden !important;
          }
          .drawer-header {
            padding: 1rem !important;
          }
          .drawer-body {
            padding: 1rem !important;
          }
          .drawer-footer {
            padding: 1rem 1rem calc(4.5rem + env(safe-area-inset-bottom)) 1rem !important;
          }
        }

        .receipt-preview {
          background: #ffffff;
          color: #000000;
          padding: 1.5rem 1rem;
          font-family: 'Courier New', Courier, monospace;
          border: 1px dashed #bbbbbb;
          border-radius: 4px;
          box-shadow: inset 0 0 10px rgba(0,0,0,0.02);
          max-height: 420px;
          overflow-y: auto;
        }

        .mobile-close-btn {
          display: none !important;
        }

        @media (max-width: 767px) {
          .receipt-preview {
            padding: 0.6rem !important;
            max-height: none !important;
            overflow: visible !important;
            border-radius: 4px !important;
            font-size: 0.65rem !important;
            line-height: 1.25 !important;
            box-shadow: none !important;
          }
          .receipt-header {
            margin-bottom: 0.35rem !important;
          }
          .receipt-header h4 {
            font-size: 0.85rem !important;
            margin: 0 0 0.1rem 0 !important;
          }
          .receipt-header div {
            font-size: 0.6rem !important;
          }
          .receipt-divider {
            margin: 0.35rem 0 !important;
          }
          .receipt-preview table {
            font-size: 0.625rem !important;
          }
          .receipt-row {
            height: 16px !important;
          }
          .receipt-row td {
            padding: 0.02rem 0 !important;
          }
          .receipt-total {
            font-size: 0.72rem !important;
          }
          .receipt-footer {
            font-size: 0.6rem !important;
            line-height: 1.25 !important;
          }
          .receipt-footer p {
            margin: 0 !important;
          }
          .mobile-close-btn {
            display: inline-flex !important;
          }
        }
        }
      `}} />

      {/* Service Alert Banners */}
      {serviceAlerts.length > 0 && (
        <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 3000, display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: 360 }}>
          {serviceAlerts.map(alert => (
            <div
              key={alert.id}
              onClick={() => setServiceAlerts(prev => prev.filter(a => a.id !== alert.id))}
              style={{
                padding: '0.75rem 1rem',
                background: alert.type === 'waiter' ? 'var(--status-pending)' : 'var(--accent)',
                color: '#fff',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.88rem',
                fontWeight: 700,
                animation: 'fadeInUp 0.3s ease',
              }}
            >
              <Bell size={18} />
              <span>
                {alert.type === 'waiter'
                  ? `🛎 Table ${alert.tableNumber} is calling for a waiter!`
                  : `💧 Table ${alert.tableNumber} ordered water!`}
              </span>
              <X size={14} style={{ marginLeft: 'auto', opacity: 0.7 }} />
            </div>
          ))}
        </div>
      )}


      <div className="page-header">
        <div>
          <span className="page-header-pretitle">Real-Time Monitor</span>
          <h1>Live Orders</h1>
          <p>{activeOrders.filter(o => o.status !== 'completed').length} active · real-time updates</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button 
            id="manual-order-btn"
            className="btn btn-primary btn-sm"
            onClick={openManualOrderModal}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', height: '34px', fontWeight: 700 }}
          >
            <Plus size={14} /> New Order
          </button>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--status-ready)', animation: 'pulse-glow 2s ease infinite' }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Live</span>
          <button 
            id="refresh-orders-btn" 
            className="btn btn-ghost btn-sm" 
            onClick={() => { setRefreshing(true); invalidateCaches('/api/orders?limit=100', '/api/billing'); setTimeout(() => setRefreshing(false), 1000); }} 
            disabled={refreshing}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
          >
            <RefreshCw size={14} className={refreshing ? 'spin-icon' : ''} /> {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Occupied/Active Tables Row */}
      {billingTables.filter(t => t.status === 'completed_unpaid').length > 0 && (
        <div style={{ 
          marginBottom: '1.5rem', 
          padding: '1rem', 
          background: 'var(--bg-hover)', 
          borderRadius: 'var(--radius-md)', 
          border: '1.5px solid var(--border)' 
        }}>
          <span style={{ 
            display: 'block',
            fontSize: '0.72rem', 
            fontWeight: 800, 
            color: 'var(--text-secondary)', 
            textTransform: 'uppercase', 
            letterSpacing: '0.5px',
            marginBottom: '0.6rem'
          }}>
            Tables Needing Settlement
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {billingTables.filter(t => t.status === 'completed_unpaid').map(t => (
              <button
                key={t.tableId}
                className="btn btn-sm"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  borderRadius: 'var(--radius-sm)',
                  borderColor: 'var(--status-ready)',
                  background: 'var(--status-ready-bg)',
                  color: 'var(--status-ready)',
                  fontWeight: 700,
                  boxShadow: 'var(--shadow-sm)',
                  height: '34px',
                  cursor: 'pointer',
                  border: '1px solid'
                }}
                onClick={() => setBillingDrawerTable(t.tableNumber)}
                title="Settle Unpaid Table Bill"
              >
                <CreditCard size={13} />
                <span>Table {t.tableNumber}</span>
                <span style={{ 
                  fontSize: '0.65rem', 
                  background: 'var(--status-ready)', 
                  color: '#ffffff', 
                  borderRadius: '50%', 
                  padding: '0.1rem 0.35rem',
                  fontWeight: 800
                }}>
                  Done
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {activeOrders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ShoppingBag size={40} style={{ strokeWidth: 1.5 }} /></div>
          <h3>No active orders</h3>
          <p>Orders will appear here as customers place them</p>
        </div>
      ) : (
        <>
          {/* Mobile Tabs selector */}
          <div className="mobile-kanban-tabs">
            {COLUMNS.map(col => {
              const count = activeOrders.filter(o => o.status === col.status).length;
              const isActive = activeTab === col.status;
              return (
                <button
                  key={col.status}
                  className={`kanban-tab-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveTab(col.status as any)}
                  style={isActive ? {
                    color: col.color,
                    background: 'var(--bg-surface)',
                  } : {}}
                >
                  <col.icon size={14} style={isActive ? { color: col.color } : {}} />
                  <span>{col.label} ({count})</span>
                </button>
              );
            })}
          </div>

          <div className="kanban-board">
            {COLUMNS.map(col => {
              const colOrders = activeOrders.filter(o => o.status === col.status);
              const isMobileActive = col.status === activeTab;

              return (
                <div key={col.status} className={`kanban-col ${isMobileActive ? 'mobile-active' : ''}`}>
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
                    {colOrders.map(order => {
                      const ageClass = getOrderAgingClass(order.createdAt, order.status);
                      const tableBillingSession = billingTables.find(t => t.tableNumber === order.tableNumber && t.status !== 'idle');
                      const ageMins = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);

                      return (
                        <div 
                          key={order.id} 
                          className={`order-card animate-fade-in ${ageClass}`} 
                          style={{ 
                            padding: '1rem', 
                            border: '1px solid var(--border)', 
                            borderRadius: 'var(--radius-md)', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '0.65rem' 
                          }}
                        >
                          <div className="order-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light, var(--border))', paddingBottom: '0.6rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <span style={{
                                background: 'var(--accent-glow)',
                                color: 'var(--accent)',
                                fontSize: '1.15rem',
                                fontWeight: 800,
                                padding: '0.2rem 0.5rem',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--accent)',
                                lineHeight: '1.2'
                              }}>
                                T {order.tableNumber}
                              </span>
                              {order.status === 'preparing' ? (
                                <span className={`age-badge ${ageMins >= 15 ? 'alert' : ageMins >= 10 ? 'warning' : 'fresh'}`}>
                                  ⏱ {ageMins}m
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  {timeSince(order.createdAt)}
                                </span>
                              )}
                              {tableBillingSession && order.status !== 'preparing' && (
                                <button
                                  className="btn btn-ghost btn-sm btn-icon"
                                  style={{ padding: '0.2rem', minWidth: '32px', height: '32px', color: 'var(--accent)' }}
                                  onClick={() => setBillingDrawerTable(order.tableNumber)}
                                  title="View/Settle Table Bill"
                                >
                                  <CreditCard size={14} />
                                </button>
                              )}
                            </div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                              ₹{order.totalAmount.toFixed(2)}
                            </div>
                          </div>

                          {/* Line-by-line item lists with highlighted quantities */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', margin: '0.2rem 0' }}>
                            {order.items.map((i, idx) => (
                              <div key={idx} style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}>
                                <span style={{ 
                                  color: 'var(--accent)', 
                                  fontWeight: 800, 
                                  marginRight: '0.45rem', 
                                  background: 'var(--accent-glow)', 
                                  padding: '0.05rem 0.3rem', 
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: '0.825rem'
                                }}>
                                  {i.quantity}x
                                </span>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {i.menuItemName}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Order notes */}
                          {order.notes && (
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', background: 'var(--bg-hover)', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'flex-start', gap: '0.35rem' }}>
                              <span>📝</span>
                              <span style={{ fontStyle: 'italic' }}>{order.notes}</span>
                            </div>
                          )}

                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>⏱ Est. {order.estimatedTime} min</span>
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
                                {updating === order.id ? '…' : `→ ${NEXT_STATUS[order.status] === 'completed' ? 'Completed' : (COLUMNS.find(c => c.status === NEXT_STATUS[order.status])?.label || '')}`}
                              </button>
                            )}
                            {order.status === 'pending' && (
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
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
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

      {/* Billing Slide-Out Drawer overlay */}
      {billingDrawerTable !== null && (
        <>
          <div className="drawer-backdrop" onClick={() => setBillingDrawerTable(null)} />
          <div className="drawer-container">
            <div className="drawer-header">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                <CreditCard size={20} style={{ color: 'var(--accent)' }} /> Table {billingDrawerTable} Billing
              </h3>
              <button 
                className="btn btn-ghost btn-icon" 
                onClick={() => setBillingDrawerTable(null)}
                aria-label="Close billing drawer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="drawer-body">
              {selectedTableBilling && selectedTableBilling.session ? (
                <>
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                      <span>Active Session Started:</span>
                      <span>{new Date(selectedTableBilling.session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <span>Orders in Session:</span>
                      <span>{selectedTableBilling.session.orders.length}</span>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border)', margin: '1rem 0' }} />

                  {/* Thermal Printer Layout Preview */}
                  <div className="receipt-preview">
                    <div className="receipt-header" style={{ textAlign: 'center', marginBottom: '1rem' }}>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: '0 0 0.2, 0', textTransform: 'uppercase', color: '#000000' }}>
                        {owner?.restaurantName || 'QRESTRO'}
                      </h4>
                      <div style={{ fontSize: '0.75rem', color: '#333333' }}>TABLE BILL RECEIPT</div>
                      <div style={{ fontSize: '0.75rem', color: '#333333' }}>TABLE: {selectedTableBilling.tableNumber}</div>
                      <div style={{ fontSize: '0.7rem', color: '#555555', marginTop: '0.2rem' }}>
                        {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <div className="receipt-divider" style={{ borderTop: '1px dashed #000000', margin: '0.75rem 0' }} />

                    <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse', color: '#000000' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px dashed #000000' }}>
                          <th style={{ textAlign: 'left', paddingBottom: '0.3rem', fontWeight: 'bold' }}>ITEM</th>
                          <th style={{ textAlign: 'center', paddingBottom: '0.3rem', fontWeight: 'bold', width: '25px' }}>QTY</th>
                          <th style={{ textAlign: 'right', paddingBottom: '0.3rem', fontWeight: 'bold', width: '50px' }}>PRICE</th>
                          <th style={{ textAlign: 'right', paddingBottom: '0.3rem', fontWeight: 'bold', width: '60px' }}>TOTAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedTableBilling.session.items.map((item: any, idx: number) => (
                          <tr key={idx} className="receipt-row" style={{ height: '22px' }}>
                            <td style={{ textAlign: 'left', padding: '0.1rem 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                              {item.menuItemName}
                            </td>
                            <td style={{ textAlign: 'center', padding: '0.1rem 0' }}>{item.quantity}</td>
                            <td style={{ textAlign: 'right', padding: '0.1rem 0' }}>₹{item.price.toFixed(2)}</td>
                            <td style={{ textAlign: 'right', padding: '0.1rem 0' }}>₹{(item.price * item.quantity).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="receipt-divider" style={{ borderTop: '1px dashed #000000', marginTop: '0.75rem', paddingTop: '0.75rem' }} />

                    <div className="receipt-total" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '0.875rem', color: '#000000' }}>
                      <span>GRAND TOTAL</span>
                      <span>₹{selectedTableBilling.session.totalAmount.toFixed(2)}</span>
                    </div>

                    <div className="receipt-divider" style={{ borderTop: '1px dashed #000000', margin: '0.75rem 0' }} />

                    <div className="receipt-footer" style={{ textAlign: 'center', fontSize: '0.7rem', color: '#333333', lineHeight: '1.3' }}>
                      <p style={{ margin: '0 0 0.2rem 0', fontWeight: 'bold', textTransform: 'uppercase' }}>CASH PAYMENT ONLY</p>
                      <p style={{ margin: 0 }}>Received with thanks.</p>
                      <p style={{ marginTop: '0.35rem', fontStyle: 'italic' }}>Thank you! Please visit again. 🙏</p>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  <ShoppingBag size={32} style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
                  <h4>Table is currently Idle</h4>
                  <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>No active orders or unpaid bills found for Table {billingDrawerTable}.</p>
                </div>
              )}
            </div>

            <div className="drawer-footer">
              {selectedTableBilling && selectedTableBilling.session ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Settle Bill</span>
                    <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent)' }}>
                      ₹{selectedTableBilling.session.totalAmount.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      className="btn btn-ghost mobile-close-btn" 
                      style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}
                      onClick={() => setBillingDrawerTable(null)}
                    >
                      Close
                    </button>
                    <button 
                      className="btn btn-outline" 
                      style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                      onClick={handlePrint}
                    >
                      <Printer size={14} /> Print
                    </button>
                    <button 
                      className="btn btn-primary" 
                      style={{ flex: 1.5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                      onClick={() => handleSettleBill(billingDrawerTable)}
                      disabled={settling}
                    >
                      <CheckCircle size={14} /> {settling ? 'Settling...' : 'Pay & Reset'}
                    </button>
                  </div>
                </>
              ) : (
                <button className="btn btn-primary btn-full" onClick={() => setBillingDrawerTable(null)}>
                  Close Drawer
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Hidden printable receipt section for thermal printers */}
      {selectedTableBilling && selectedTableBilling.session && (
        <div 
          id="print-receipt-section"
          style={{
            display: 'none',
            background: '#ffffff',
            color: '#000000',
            padding: '2rem 1.5rem',
            fontFamily: 'Courier New, Courier, monospace',
            border: '1px dashed #cccccc',
            borderRadius: '2px',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 'bold', margin: '0 0 0.25rem 0', textTransform: 'uppercase', color: '#000000' }}>
              {owner?.restaurantName || 'QRESTRO'}
            </h2>
            <div style={{ fontSize: '0.85rem', color: '#333333' }}>TABLE BILL RECEIPT</div>
            <div style={{ fontSize: '0.85rem', color: '#333333', marginTop: '0.2rem' }}>TABLE: {selectedTableBilling.tableNumber}</div>
            <div style={{ fontSize: '0.75rem', color: '#555555', marginTop: '0.25rem' }}>
              Date: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          <div style={{ borderTop: '1px dashed #000000', margin: '1rem 0' }} />

          <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse', color: '#000000' }}>
            <thead>
              <tr style={{ borderBottom: '1px dashed #000000' }}>
                <th style={{ textAlign: 'left', paddingBottom: '0.4rem', fontWeight: 'bold' }}>ITEM</th>
                <th style={{ textAlign: 'center', paddingBottom: '0.4rem', fontWeight: 'bold', width: '30px' }}>QTY</th>
                <th style={{ textAlign: 'right', paddingBottom: '0.4rem', fontWeight: 'bold', width: '60px' }}>PRICE</th>
                <th style={{ textAlign: 'right', paddingBottom: '0.4rem', fontWeight: 'bold', width: '70px' }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {selectedTableBilling.session.items.map((item: any, idx: number) => (
                <tr key={idx} style={{ height: '24px' }}>
                  <td style={{ textAlign: 'left', padding: '0.15rem 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                    {item.menuItemName}
                  </td>
                  <td style={{ textAlign: 'center', padding: '0.15rem 0' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right', padding: '0.15rem 0' }}>₹{item.price.toFixed(2)}</td>
                  <td style={{ textAlign: 'right', padding: '0.15rem 0' }}>₹{(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ borderTop: '1px dashed #000000', marginTop: '1rem', paddingTop: '1rem' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1rem', color: '#000000' }}>
            <span>GRAND TOTAL</span>
            <span>₹{selectedTableBilling.session.totalAmount.toFixed(2)}</span>
          </div>

          <div style={{ borderTop: '1px dashed #000000', margin: '1rem 0' }} />

          <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#333333', lineHeight: '1.4' }}>
            <p style={{ margin: '0 0 0.35rem 0', fontWeight: 'bold', textTransform: 'uppercase' }}>CASH PAYMENT ONLY</p>
            <p style={{ margin: 0 }}>Received with thanks.</p>
            <p style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>Thank you! Please visit again. 🙏</p>
          </div>
        </div>
      )}

      {/* Cancel Order Modal */}
      {cancelModalOrder && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setCancelModalOrder(null)}>
          <div className="modal-box" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <X size={20} style={{ color: 'var(--status-cancelled)' }} /> Cancel Order #{cancelModalOrder.id.slice(-4).toUpperCase()}
              </h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setCancelModalOrder(null)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Table {cancelModalOrder.tableNumber} · ₹{cancelModalOrder.totalAmount.toFixed(2)}
            </p>
            <div className="form-group">
              <label className="form-label">Why are you cancelling this order? *</label>
              <textarea
                id="cancel-reason-input"
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="e.g. Item out of stock, customer request, kitchen issue..."
                maxLength={500}
                rows={3}
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-hover)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn btn-ghost" onClick={() => setCancelModalOrder(null)}>Keep Order</button>
              <button
                id="confirm-cancel-btn"
                className="btn btn-danger"
                onClick={confirmCancelOrder}
                disabled={!cancelReason.trim() || updating === cancelModalOrder.id}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                {updating === cancelModalOrder.id ? 'Cancelling…' : <><X size={14} /> Cancel Order</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Order Modal */}
      {showManualOrderModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowManualOrderModal(false)}>
          <div className="modal-box" style={{ 
            maxWidth: 880, 
            width: '95%', 
            maxHeight: '90vh', 
            display: 'flex', 
            flexDirection: 'column',
            padding: '1.75rem',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-xl)',
            borderRadius: 'var(--radius-xl)'
          }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border-light, var(--border))', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '1.35rem', fontWeight: 800 }}>
                <ShoppingBag className="text-accent" size={22} style={{ color: 'var(--accent)' }} /> 
                <span style={{ fontFamily: 'var(--font-brand)', color: 'var(--text-primary)' }}>Staff Manual Order Entry</span>
              </h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowManualOrderModal(false)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '36px', width: '36px' }}><X size={18} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto', padding: '0.25rem', flex: 1 }}>
              {/* Top Controls: Single row for Select Table, Search, and Cooking Notes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr 1.1fr', gap: '0.75rem', alignItems: 'end' }}>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label className="form-label" style={{ 
                    fontSize: '0.72rem', 
                    fontWeight: 800, 
                    color: 'var(--text-secondary)', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.5px' 
                  }}>
                    Select Table *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select 
                      id="manual-order-table-select"
                      value={manualOrderTable} 
                      onChange={e => setManualOrderTable(e.target.value)}
                      className="form-control"
                      style={{ 
                        background: 'var(--bg-hover)', 
                        color: 'var(--text-primary)',
                        border: '1.5px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.65rem 0.85rem',
                        fontSize: '0.88rem',
                        width: '100%',
                        cursor: 'pointer',
                        fontWeight: 600,
                        appearance: 'none',
                        WebkitAppearance: 'none',
                        height: '38.5px'
                      }}
                    >
                      <option value="">-- Choose a table --</option>
                      {tablesList.map(t => (
                        <option key={t.id} value={t.tableNumber}>Table {t.tableNumber} {t.isActive ? '' : '(Inactive)'}</option>
                      ))}
                    </select>
                    <div style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                      color: 'var(--text-muted)',
                      fontSize: '0.75rem',
                      fontWeight: 800
                    }}>▼</div>
                  </div>
                </div>

                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label className="form-label" style={{ 
                    fontSize: '0.72rem', 
                    fontWeight: 800, 
                    color: 'var(--text-secondary)', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.5px' 
                  }}>
                    Search Items
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Search by name..." 
                      value={manualOrderSearch}
                      onChange={e => setManualOrderSearch(e.target.value)}
                      style={{ 
                        background: 'var(--bg-hover)', 
                        color: 'var(--text-primary)',
                        border: '1.5px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.65rem 0.85rem 0.65rem 2.25rem',
                        fontSize: '0.88rem',
                        width: '100%',
                        height: '38.5px'
                      }}
                    />
                    <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>
                      <Search size={16} />
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label className="form-label" style={{ 
                    fontSize: '0.72rem', 
                    fontWeight: 800, 
                    color: 'var(--text-secondary)', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.5px' 
                  }}>
                    Special Notes
                  </label>
                  <input
                    id="manual-order-notes-input"
                    type="text"
                    className="form-control"
                    placeholder="e.g. Extra spicy..."
                    value={manualOrderNotes}
                    onChange={e => setManualOrderNotes(e.target.value)}
                    style={{ 
                      background: 'var(--bg-hover)', 
                      color: 'var(--text-primary)',
                      border: '1.5px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.65rem 0.85rem',
                      fontSize: '0.88rem',
                      width: '100%',
                      height: '38.5px'
                    }}
                  />
                </div>
              </div>

              {/* Split Content: Items Picker vs Cart Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 0.75fr)', gap: '1.5rem', alignItems: 'stretch' }}>
                
                {/* Left Side: Items Catalog */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ 
                    maxHeight: '380px', 
                    overflowY: 'auto', 
                    border: '1.5px solid var(--border)', 
                    borderRadius: 'var(--radius-lg)',
                    padding: '0.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    background: 'var(--bg-hover)'
                  }}>
                    {menuItems.filter(item => item.name.toLowerCase().includes(manualOrderSearch.toLowerCase())).length === 0 ? (
                      <div style={{ padding: '2rem 1rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 800, textAlign: 'center' }}>
                        No matching items found
                      </div>
                    ) : (
                      menuItems
                        .filter(item => item.name.toLowerCase().includes(manualOrderSearch.toLowerCase()))
                        .map(item => {
                          const inCart = manualOrderItems.get(item.id);
                          return (
                            <div 
                              key={item.id} 
                              style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                padding: '0.75rem 1rem', 
                                background: 'var(--bg-surface)', 
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border)',
                                boxShadow: 'var(--shadow-sm)',
                                transition: 'all 0.2s ease',
                              }}
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>{item.name}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ 
                                    fontSize: '0.78rem', 
                                    color: 'var(--accent)', 
                                    fontWeight: 800,
                                    background: 'var(--accent-glow)',
                                    padding: '0.1rem 0.45rem',
                                    borderRadius: 'var(--radius-sm)'
                                  }}>
                                    ₹{item.price.toFixed(2)}
                                  </span>
                                  {item.category && (
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                      in {item.category.name}
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                {inCart ? (
                                  <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    background: 'var(--bg-hover)', 
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1.5px solid var(--border)',
                                    padding: '0.15rem'
                                  }}>
                                    <button 
                                      className="btn btn-ghost btn-sm btn-icon" 
                                      onClick={() => updateManualItemQty(item.id, -1)}
                                      style={{ width: '28px', height: '28px', minWidth: '28px', borderRadius: 'var(--radius-sm)' }}
                                    >
                                      <Minus size={12} />
                                    </button>
                                    <span style={{ fontWeight: 800, minWidth: '26px', textAlign: 'center', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                                      {inCart.quantity}
                                    </span>
                                    <button 
                                      className="btn btn-ghost btn-sm btn-icon" 
                                      onClick={() => updateManualItemQty(item.id, 1)}
                                      style={{ width: '28px', height: '28px', minWidth: '28px', borderRadius: 'var(--radius-sm)' }}
                                    >
                                      <Plus size={12} />
                                    </button>
                                  </div>
                                ) : (
                                  <button 
                                    className="btn btn-primary btn-sm" 
                                    onClick={() => updateManualItemQty(item.id, 1, item)}
                                    style={{ 
                                      padding: '0.45rem 1rem', 
                                      fontSize: '0.8rem', 
                                      fontWeight: 800,
                                      borderRadius: 'var(--radius-md)'
                                    }}
                                  >
                                    Add
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>

                {/* Right Side: Selected Summary */}
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  border: '1.5px solid var(--border)', 
                  borderRadius: 'var(--radius-lg)', 
                  padding: '1.25rem',
                  background: 'var(--bg-hover)',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <span style={{ 
                    fontWeight: 800, 
                    fontSize: '0.72rem', 
                    textTransform: 'uppercase', 
                    color: 'var(--text-secondary)', 
                    letterSpacing: '0.5px',
                    marginBottom: '0.85rem', 
                    display: 'block' 
                  }}>
                    Selected Summary
                  </span>
                  
                  <div style={{ 
                    flex: 1, 
                    overflowY: 'auto', 
                    maxHeight: '220px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '0.5rem', 
                    marginBottom: '1rem',
                    paddingRight: '0.25rem'
                  }}>
                    {manualOrderItems.size === 0 ? (
                      <div style={{ 
                        margin: 'auto 0',
                        textAlign: 'center', 
                        padding: '2.5rem 0',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <span style={{ fontSize: '1.75rem' }}>🛒</span>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Empty cart</span>
                      </div>
                    ) : (
                      Array.from(manualOrderItems.values()).map(item => (
                        <div 
                          key={item.id} 
                          style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            fontSize: '0.88rem',
                            paddingBottom: '0.5rem',
                            borderBottom: '1px dashed var(--border-light, var(--border))'
                          }}
                        >
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.name}</span>
                          <span style={{ 
                            background: 'var(--accent-glow)', 
                            color: 'var(--accent)', 
                            fontWeight: 800, 
                            fontSize: '0.75rem',
                            padding: '0.15rem 0.55rem',
                            borderRadius: '999px',
                            border: '1.5px solid var(--border-light, var(--border))',
                            lineHeight: '1.2'
                          }}>
                            {item.quantity}x
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                  
                  <div style={{ 
                    borderTop: '1.5px solid var(--border)', 
                    paddingTop: '0.85rem', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'baseline',
                    fontWeight: 800, 
                    fontSize: '1rem', 
                    marginBottom: '1.15rem' 
                  }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Total Bill:</span>
                    <span style={{ color: 'var(--accent)', fontSize: '1.35rem', fontWeight: 900 }}>
                      ₹{Array.from(manualOrderItems.values()).reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}
                    </span>
                  </div>
                  <button 
                    id="confirm-manual-order-btn"
                    className="btn btn-primary btn-full" 
                    onClick={submitManualOrder}
                    disabled={placingManualOrder || manualOrderItems.size === 0 || !manualOrderTable}
                    style={{
                      padding: '0.75rem 1rem',
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      boxShadow: '0 4px 12px rgba(3, 77, 55, 0.1)',
                      borderRadius: 'var(--radius-md)',
                      minHeight: 44
                    }}
                  >
                    {placingManualOrder ? 'Placing Order...' : 'Confirm Order'}
                  </button>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
