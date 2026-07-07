'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Utensils, Plus, Bell, CheckCircle, AlertTriangle, Clock, X, Minus,
  StickyNote, Send, Search, RefreshCw, ChevronLeft, ShoppingBag,
} from 'lucide-react';
import { useSocket } from '@/lib/useSocket';
import { playNotificationSound } from '@/lib/audio';

type StaffInfo = { id: string; name: string; role: string; assignedTables: number[] };
type RestaurantInfo = { id: string; name: string; code: string };
type MenuItem = { id: string; name: string; price: number; categoryId: string | null; isAvailable: boolean; preparationTime: number };
type MenuCategory = { id: string; name: string; sortOrder: number };
type OrderItem = { menuItemId: string; menuItemName: string; quantity: number; price: number };
type Order = {
  id: string; tableNumber: number; status: string; totalAmount: number;
  estimatedTime: number; notes: string | null; placedBy: string | null;
  createdAt: string; items: { menuItemName: string; quantity: number; price: number }[];
};

type Tab = 'tables' | 'order' | 'alerts';
type View = 'grid' | 'detail';

function getStaffHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('staffToken') : '';
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

function minutesAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

/* ─── Skeleton Components ──────────────────────────────────── */
function SkeletonTableGrid() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card" style={{ padding: '1.25rem 1rem', textAlign: 'center' }}>
          <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', margin: '0 auto 0.6rem' }} />
          <div className="skeleton skeleton-text" style={{ width: '60%', height: 18, margin: '0 auto 0.4rem' }} />
          <div className="skeleton skeleton-text" style={{ width: '50%', height: 14, margin: '0 auto', borderRadius: '999px' }} />
        </div>
      ))}
    </div>
  );
}

function SkeletonOrderList() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '1.5rem' }}>
      <div className="skeleton skeleton-text" style={{ width: 140, height: 18 }} />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div className="skeleton skeleton-text" style={{ width: 40, height: 18 }} />
              <div className="skeleton skeleton-text" style={{ width: 70, height: 20, borderRadius: '999px' }} />
            </div>
            <div className="skeleton skeleton-text" style={{ width: 50, height: 14 }} />
          </div>
          <div className="skeleton skeleton-text" style={{ width: '80%', height: 14 }} />
        </div>
      ))}
    </div>
  );
}

/* ─── Main Component ───────────────────────────────────────── */
export default function WaiterDashboard() {
  const [tab, setTab] = useState<Tab>('tables');
  const [view, setView] = useState<View>('grid');
  const [staff, setStaff] = useState<StaffInfo | null>(null);
  const [restaurant, setRestaurant] = useState<RestaurantInfo | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Table detail view
  const [detailTable, setDetailTable] = useState<number | null>(null);

  // Order creation state
  const [orderTable, setOrderTable] = useState<number | null>(null);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [menuSearch, setMenuSearch] = useState('');

  // Alerts
  const [alerts, setAlerts] = useState<{ id: string; type: string; table: number; time: string; message: string }[]>([]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(''), 3500);
  };

  // Load staff info from localStorage
  useEffect(() => {
    const staffStr = localStorage.getItem('staff');
    const restStr = localStorage.getItem('staffRestaurant');
    if (staffStr) setStaff(JSON.parse(staffStr));
    if (restStr) setRestaurant(JSON.parse(restStr));
  }, []);

  // Fetch orders and menu
  const loadData = useCallback(async () => {
    if (!restaurant?.id) return;
    try {
      const headers = getStaffHeaders();
      const [ordersRes, menuRes, catRes] = await Promise.all([
        fetch(`/api/orders?limit=100`, { headers }),
        fetch(`/api/menu?ownerId=${restaurant.id}`, { headers }),
        fetch(`/api/menu/categories?ownerId=${restaurant.id}`, { headers }),
      ]);
      const [ordersData, menuData, catData] = await Promise.all([ordersRes.json(), menuRes.json(), catRes.json()]);
      if (ordersData.success) setOrders(ordersData.data);
      if (menuData.success) setMenuItems(menuData.data);
      if (catData.success) setCategories(catData.data);
    } finally {
      setLoading(false);
    }
  }, [restaurant?.id]);

  useEffect(() => { if (restaurant?.id) loadData(); }, [restaurant?.id, loadData]);

  // Socket listeners
  const socketListeners = useMemo(() => ({
    'order:new': (data: { tableNumber?: number }) => {
      loadData();
      if (data.tableNumber && staff?.assignedTables?.includes(data.tableNumber)) {
        playNotificationSound();
        setAlerts(prev => [{
          id: Date.now().toString(), type: 'new_order', table: data.tableNumber!,
          time: new Date().toISOString(), message: `New QR order at Table ${data.tableNumber}`,
        }, ...prev]);
      }
    },
    'order:updated': (data: { tableNumber?: number; status?: string }) => {
      loadData();
      if (data.status === 'ready' && data.tableNumber && staff?.assignedTables?.includes(data.tableNumber)) {
        playNotificationSound();
        setAlerts(prev => [{
          id: Date.now().toString(), type: 'ready', table: data.tableNumber!,
          time: new Date().toISOString(), message: `Table ${data.tableNumber} food is READY!`,
        }, ...prev]);
      }
    },
    'service:request': (data: { tableNumber?: number; type?: string }) => {
      if (data.tableNumber && staff?.assignedTables?.includes(data.tableNumber)) {
        playNotificationSound();
        setAlerts(prev => [{
          id: Date.now().toString(), type: 'service', table: data.tableNumber!,
          time: new Date().toISOString(), message: `Table ${data.tableNumber}: ${data.type === 'water' ? 'Needs water 💧' : 'Calling waiter 🛎️'}`,
        }, ...prev]);
      }
    },
  }), [loadData, staff?.assignedTables]);

  useSocket(restaurant?.id || null, socketListeners);

  // Derived data
  const myTables = useMemo(() => staff?.assignedTables || [], [staff?.assignedTables]);
  const myOrders = orders.filter(o => myTables.includes(o.tableNumber));
  const activeOrders = myOrders.filter(o => !['completed', 'cancelled'].includes(o.status));

  // Floor summary counts
  const floorSummary = useMemo(() => {
    let free = 0, active = 0, ready = 0;
    for (const t of myTables) {
      const tOrders = activeOrders.filter(o => o.tableNumber === t);
      if (tOrders.length === 0) { free++; continue; }
      if (tOrders.some(o => o.status === 'ready')) { ready++; }
      else { active++; }
    }
    return { free, active, ready };
  }, [myTables, activeOrders]);

  function getTableStatus(tableNum: number): { status: string; color: string; bg: string; label: string } {
    const tableOrders = myOrders.filter(o => o.tableNumber === tableNum && !['completed', 'cancelled'].includes(o.status));
    if (tableOrders.length === 0) return { status: 'free', color: 'var(--status-ready)', bg: 'var(--status-ready-bg, rgba(5, 150, 105, 0.08))', label: 'Free' };
    const hasReady = tableOrders.some(o => o.status === 'ready');
    if (hasReady) return { status: 'ready', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)', label: 'Food Ready' };
    const hasPreparing = tableOrders.some(o => o.status === 'preparing');
    if (hasPreparing) return { status: 'preparing', color: 'var(--status-preparing)', bg: 'var(--status-preparing-bg, rgba(217, 119, 6, 0.08))', label: 'Cooking' };
    return { status: 'pending', color: 'var(--status-pending)', bg: 'var(--status-pending-bg, rgba(234, 88, 12, 0.08))', label: 'New Order' };
  }

  function getTableSessionTotal(tableNum: number): number {
    return myOrders
      .filter(o => o.tableNumber === tableNum && !['cancelled'].includes(o.status))
      .reduce((sum, o) => sum + Number(o.totalAmount), 0);
  }

  function getTableActiveOrderCount(tableNum: number): number {
    return myOrders.filter(o => o.tableNumber === tableNum && !['completed', 'cancelled'].includes(o.status)).length;
  }

  function getTableEarliestActive(tableNum: number): string | null {
    const tOrders = myOrders
      .filter(o => o.tableNumber === tableNum && !['completed', 'cancelled'].includes(o.status))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return tOrders.length > 0 ? tOrders[0].createdAt : null;
  }

  // Cart functions
  function addToCart(item: MenuItem) {
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === item.id);
      if (existing) {
        return prev.map(c => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { menuItemId: item.id, menuItemName: item.name, quantity: 1, price: item.price }];
    });
  }

  function removeFromCart(itemId: string) {
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map(c => c.menuItemId === itemId ? { ...c, quantity: c.quantity - 1 } : c);
      }
      return prev.filter(c => c.menuItemId !== itemId);
    });
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  async function submitOrder() {
    if (!orderTable || cart.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: getStaffHeaders(),
        body: JSON.stringify({
          tableNumber: orderTable,
          items: cart.map(c => ({ menuItemId: c.menuItemId, quantity: c.quantity })),
          notes: orderNotes || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Order placed for Table ${orderTable}!`);
        setCart([]);
        setOrderNotes('');
        setMenuSearch('');
        setOrderTable(null);
        setTab('tables');
        setView('grid');
        loadData();
      } else {
        showToast(data.error?.message || 'Failed to place order', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  function startNewOrder(tableNum: number) {
    setOrderTable(tableNum);
    setCart([]);
    setOrderNotes('');
    setMenuSearch('');
    setSelectedCategory('all');
    setTab('order');
  }

  function openTableDetail(tableNum: number) {
    setDetailTable(tableNum);
    setView('detail');
  }

  async function updateOrderStatus(orderId: string, status: string) {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: getStaffHeaders(),
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(status === 'completed' ? 'Marked as served!' : `Status updated to ${status}`);
        loadData();
      }
    } catch {
      showToast('Failed to update', 'error');
    }
  }

  function dismissAlert(id: string) {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }

  const unreadAlerts = alerts.length;

  // Filtered menu items (search + category)
  const filteredMenuItems = menuItems.filter(item => {
    if (!item.isAvailable) return false;
    if (menuSearch.trim()) {
      return item.name.toLowerCase().includes(menuSearch.toLowerCase());
    }
    if (selectedCategory === 'all') return true;
    return item.categoryId === selectedCategory;
  });

  // Table detail data
  const detailOrders = detailTable
    ? myOrders.filter(o => o.tableNumber === detailTable).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [];
  const detailActiveOrders = detailOrders.filter(o => !['completed', 'cancelled'].includes(o.status));
  const detailSessionTotal = detailOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.totalAmount), 0);

  return (
    <>
      {/* ─── Tab: My Tables ─── */}
      {tab === 'tables' && view === 'grid' && (
        <div>
          {/* Floor summary chips */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', marginBottom: '0.25rem' }}>My Tables</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                {myTables.length} table{myTables.length !== 1 ? 's' : ''} assigned
              </p>
            </div>
            <button
              onClick={() => loadData()}
              style={{
                width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)', background: 'var(--bg-surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text-muted)',
              }}
            >
              <RefreshCw size={16} />
            </button>
          </div>

          {!loading && myTables.length > 0 && (
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <span style={{
                padding: '0.25rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600,
                background: 'rgba(5, 150, 105, 0.08)', color: 'var(--status-ready)',
              }}>
                {floorSummary.free} Free
              </span>
              <span style={{
                padding: '0.25rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600,
                background: 'rgba(234, 88, 12, 0.08)', color: 'var(--status-pending)',
              }}>
                {floorSummary.active} Active
              </span>
              <span style={{
                padding: '0.25rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600,
                background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e',
              }}>
                {floorSummary.ready} Ready
              </span>
            </div>
          )}

          {loading ? (
            <>
              <SkeletonTableGrid />
              <SkeletonOrderList />
            </>
          ) : myTables.length === 0 ? (
            <div className="empty-state" style={{ padding: '3rem 1.5rem' }}>
              <div className="empty-state-icon"><Utensils size={36} /></div>
              <h3>No tables assigned</h3>
              <p>Ask your manager to assign tables to you</p>
            </div>
          ) : (
            <>
              {/* Table Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
                {myTables.sort((a, b) => a - b).map(tableNum => {
                  const status = getTableStatus(tableNum);
                  const sessionTotal = getTableSessionTotal(tableNum);
                  const activeCount = getTableActiveOrderCount(tableNum);
                  const earliest = getTableEarliestActive(tableNum);
                  return (
                    <div
                      key={tableNum}
                      className="card"
                      style={{
                        padding: '1.1rem 0.85rem', textAlign: 'center', cursor: 'pointer',
                        borderColor: activeCount > 0 ? status.color : 'var(--border)',
                        transition: 'all var(--transition)',
                      }}
                      onClick={() => openTableDetail(tableNum)}
                    >
                      <div style={{
                        width: 44, height: 44, borderRadius: 'var(--radius-md)',
                        background: status.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 0.5rem', color: status.color,
                      }}>
                        <Utensils size={20} />
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                        T-{tableNum}
                      </div>
                      <span style={{
                        display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: '999px',
                        fontSize: '0.72rem', fontWeight: 600, background: status.bg, color: status.color,
                      }}>
                        {status.label}
                      </span>

                      {/* Session total & timer */}
                      {sessionTotal > 0 && (
                        <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          ₹{sessionTotal.toFixed(0)}
                          {earliest && (
                            <span style={{ marginLeft: '0.3rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                              · {minutesAgo(earliest)}m
                            </span>
                          )}
                        </div>
                      )}

                      {/* Quick serve button for ready orders */}
                      {myOrders.filter(o => o.tableNumber === tableNum && o.status === 'ready').map(order => (
                        <button
                          key={order.id}
                          onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'completed'); }}
                          style={{
                            marginTop: '0.5rem', width: '100%', padding: '0.4rem',
                            borderRadius: 'var(--radius-sm)', border: '1px solid #22c55e',
                            background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e',
                            fontWeight: 600, fontSize: '0.72rem', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
                          }}
                        >
                          <CheckCircle size={12} /> Serve
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>

              {/* Active orders summary below grid */}
              {activeOrders.length > 0 && (
                <div style={{ marginTop: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>Active Orders</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {activeOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(order => (
                      <div key={order.id} className="card" style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>T-{order.tableNumber}</span>
                            <span className={`badge badge-${order.status}`}>{order.status}</span>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {minutesAgo(order.createdAt)}m ago
                          </span>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {order.items.map(i => `${i.quantity}× ${i.menuItemName}`).join(', ')}
                        </div>
                        {order.placedBy && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            Via: {order.placedBy}
                          </div>
                        )}
                        {order.status === 'ready' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'completed')}
                            className="btn btn-primary btn-sm"
                            style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                            <CheckCircle size={14} /> Mark Served
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ─── Table Detail View ─── */}
      {tab === 'tables' && view === 'detail' && detailTable && (
        <div>
          <button
            onClick={() => { setView('grid'); setDetailTable(null); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '1rem',
              background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer',
              fontSize: '0.85rem', fontWeight: 600, padding: 0,
            }}
          >
            <ChevronLeft size={16} /> Back to Tables
          </button>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.15rem' }}>Table {detailTable}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className={`badge badge-${getTableStatus(detailTable).status}`}>
                  {getTableStatus(detailTable).label}
                </span>
                {detailSessionTotal > 0 && (
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent)' }}>
                    ₹{detailSessionTotal.toFixed(0)}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => startNewOrder(detailTable)}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Plus size={16} /> New Order
            </button>
          </div>

          {detailOrders.length === 0 ? (
            <div className="empty-state" style={{ padding: '2.5rem 1.5rem' }}>
              <div className="empty-state-icon"><ShoppingBag size={36} /></div>
              <h3>No orders yet</h3>
              <p>Place the first order for this table</p>
              <button
                onClick={() => startNewOrder(detailTable)}
                className="btn btn-tinted"
                style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Plus size={16} /> Take Order
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {detailOrders.map(order => (
                <div key={order.id} className="card" style={{
                  padding: '1rem 1.25rem',
                  borderColor: order.status === 'ready' ? '#22c55e' : order.status === 'cancelled' ? 'var(--status-cancelled)' : 'var(--border)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className={`badge badge-${order.status}`}>{order.status}</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent)' }}>
                        ₹{Number(order.totalAmount).toFixed(0)}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {formatTime(order.createdAt)} · {minutesAgo(order.createdAt)}m ago
                    </span>
                  </div>

                  {/* Items */}
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    {order.items.map((i, idx) => (
                      <span key={idx}>
                        {idx > 0 && ', '}
                        {i.quantity}× {i.menuItemName}
                      </span>
                    ))}
                  </div>

                  {order.notes && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <StickyNote size={10} /> {order.notes}
                    </div>
                  )}
                  {order.placedBy && (
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Via: {order.placedBy}
                    </div>
                  )}

                  {/* Action buttons */}
                  {order.status === 'ready' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'completed')}
                      className="btn btn-primary btn-sm"
                      style={{ marginTop: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      <CheckCircle size={14} /> Mark Served
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Tab: Take Order ─── */}
      {tab === 'order' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', marginBottom: '0.15rem' }}>
                {orderTable ? `Table ${orderTable}` : 'Take Order'}
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                {cartCount > 0 ? `${cartCount} item${cartCount !== 1 ? 's' : ''} in cart` : 'Select items from menu'}
              </p>
            </div>
            {!orderTable && (
              <button className="btn btn-ghost btn-sm" onClick={() => setTab('tables')}>← Back</button>
            )}
          </div>

          {/* Table selector (if not pre-selected) */}
          {!orderTable && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {myTables.sort((a, b) => a - b).map(t => (
                <button
                  key={t}
                  onClick={() => setOrderTable(t)}
                  className="btn btn-ghost"
                  style={{ minWidth: 52, fontWeight: 700 }}
                >
                  T-{t}
                </button>
              ))}
            </div>
          )}

          {orderTable && (
            <>
              {/* Search Input */}
              <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                <Search size={16} style={{
                  position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text-muted)', pointerEvents: 'none',
                }} />
                <input
                  type="text"
                  className="input-field"
                  placeholder="Search menu items..."
                  value={menuSearch}
                  onChange={e => { setMenuSearch(e.target.value); if (e.target.value) setSelectedCategory('all'); }}
                  style={{ paddingLeft: '2.5rem' }}
                />
                {menuSearch && (
                  <button
                    onClick={() => setMenuSearch('')}
                    style={{
                      position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem',
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Category filter (hidden when searching) */}
              {!menuSearch && (
                <div style={{
                  display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '0.75rem',
                  WebkitOverflowScrolling: 'touch',
                }}>
                  <button
                    onClick={() => setSelectedCategory('all')}
                    style={{
                      padding: '0.4rem 0.85rem', borderRadius: '999px', whiteSpace: 'nowrap',
                      border: selectedCategory === 'all' ? '2px solid var(--accent)' : '1px solid var(--border)',
                      background: selectedCategory === 'all' ? 'var(--accent-glow)' : 'var(--bg-surface)',
                      color: selectedCategory === 'all' ? 'var(--accent)' : 'var(--text-muted)',
                      fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
                      transition: 'all var(--transition)',
                    }}
                  >
                    All
                  </button>
                  {categories.sort((a, b) => a.sortOrder - b.sortOrder).map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      style={{
                        padding: '0.4rem 0.85rem', borderRadius: '999px', whiteSpace: 'nowrap',
                        border: selectedCategory === cat.id ? '2px solid var(--accent)' : '1px solid var(--border)',
                        background: selectedCategory === cat.id ? 'var(--accent-glow)' : 'var(--bg-surface)',
                        color: selectedCategory === cat.id ? 'var(--accent)' : 'var(--text-muted)',
                        fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
                        transition: 'all var(--transition)',
                      }}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Menu items */}
              {filteredMenuItems.length === 0 ? (
                <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                  <h3 style={{ fontSize: '1rem' }}>No items found</h3>
                  <p style={{ fontSize: '0.82rem' }}>
                    {menuSearch ? `No results for "${menuSearch}"` : 'No items in this category'}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {filteredMenuItems.map(item => {
                    const inCart = cart.find(c => c.menuItemId === item.id);
                    return (
                      <div
                        key={item.id}
                        className="card"
                        style={{
                          padding: '0.85rem 1rem', display: 'flex', alignItems: 'center',
                          justifyContent: 'space-between',
                          borderColor: inCart ? 'var(--accent)' : 'var(--border)',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 700, marginTop: '0.15rem' }}>
                            ₹{Number(item.price).toFixed(0)}
                          </div>
                        </div>

                        {inCart ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                              onClick={() => removeFromCart(item.id)}
                              style={{
                                width: 30, height: 30, borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border)', background: 'var(--bg-surface)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', color: 'var(--status-cancelled)',
                              }}
                            >
                              <Minus size={14} />
                            </button>
                            <span style={{ fontWeight: 700, fontSize: '0.95rem', minWidth: 20, textAlign: 'center' }}>
                              {inCart.quantity}
                            </span>
                            <button
                              onClick={() => addToCart(item)}
                              style={{
                                width: 30, height: 30, borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--accent)', background: 'var(--accent-glow)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', color: 'var(--accent)',
                              }}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(item)}
                            style={{
                              width: 34, height: 34, borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--accent)', background: 'var(--accent-glow)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', color: 'var(--accent)',
                            }}
                          >
                            <Plus size={16} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Notes */}
              {cart.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <StickyNote size={12} /> Order Notes
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Less spicy, no onion"
                      value={orderNotes}
                      onChange={e => setOrderNotes(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Cart Summary + Submit */}
              {cart.length > 0 && (
                <div style={{
                  position: 'sticky', bottom: '4.5rem', marginTop: '1rem',
                  padding: '1rem 1.25rem', borderRadius: 'var(--radius-lg)',
                  background: 'var(--accent)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  boxShadow: '0 -4px 20px rgba(3, 77, 55, 0.3)',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                }}
                  onClick={!submitting ? submitOrder : undefined}
                >
                  <div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>{cartCount} item{cartCount !== 1 ? 's' : ''}</div>
                    <div style={{ fontWeight: 700, fontSize: '1.15rem' }}>₹{cartTotal.toFixed(0)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.95rem' }}>
                    {submitting ? 'Placing…' : 'Place Order'} <Send size={16} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ─── Tab: Alerts ─── */}
      {tab === 'alerts' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', marginBottom: '0.25rem' }}>Alerts</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                {alerts.length} notification{alerts.length !== 1 ? 's' : ''}
              </p>
            </div>
            {alerts.length > 0 && (
              <button
                onClick={() => setAlerts([])}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '0.78rem' }}
              >
                Clear All
              </button>
            )}
          </div>

          {alerts.length === 0 ? (
            <div className="empty-state" style={{ padding: '3rem 1.5rem' }}>
              <div className="empty-state-icon"><Bell size={36} /></div>
              <h3>All caught up!</h3>
              <p>You&apos;ll be notified when something needs your attention</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {alerts.map(alert => (
                <div
                  key={alert.id}
                  className="card"
                  style={{
                    padding: '1rem 1.25rem',
                    display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                    borderColor: alert.type === 'ready' ? '#22c55e' : alert.type === 'service' ? '#f59e0b' : 'var(--status-pending)',
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 'var(--radius-sm)', flexShrink: 0,
                    background: alert.type === 'ready' ? 'rgba(34, 197, 94, 0.1)' :
                      alert.type === 'service' ? 'rgba(245, 158, 11, 0.1)' : 'var(--status-pending-bg, rgba(234, 88, 12, 0.08))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: alert.type === 'ready' ? '#22c55e' : alert.type === 'service' ? '#f59e0b' : 'var(--status-pending)',
                  }}>
                    {alert.type === 'ready' ? <CheckCircle size={18} /> :
                      alert.type === 'service' ? <Bell size={18} /> : <AlertTriangle size={18} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {alert.message}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {minutesAgo(alert.time)}m ago
                    </div>
                  </div>
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    style={{
                      background: 'none', border: 'none', color: 'var(--text-muted)',
                      cursor: 'pointer', padding: '0.25rem', flexShrink: 0,
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Bottom Tab Bar ─── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', justifyContent: 'center',
        padding: '0.5rem 1rem', paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
        background: 'var(--bg-topbar, var(--bg-surface))', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', gap: '0.25rem', maxWidth: 400, width: '100%' }}>
          {[
            { id: 'tables' as Tab, label: 'Tables', icon: <Utensils size={20} /> },
            { id: 'order' as Tab, label: 'Order', icon: <Plus size={20} /> },
            { id: 'alerts' as Tab, label: 'Alerts', icon: <Bell size={20} />, badge: unreadAlerts },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => {
                if (t.id === 'tables') { setView('grid'); setDetailTable(null); }
                if (t.id === 'order' && !orderTable && myTables.length > 0) {
                  setOrderTable(myTables[0]);
                }
                setTab(t.id);
              }}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
                padding: '0.5rem 0.25rem', borderRadius: 'var(--radius-md)',
                border: 'none', background: tab === t.id ? 'var(--accent-glow)' : 'transparent',
                color: tab === t.id ? 'var(--accent)' : 'var(--text-muted)',
                cursor: 'pointer', transition: 'all var(--transition)',
                position: 'relative', minHeight: 48,
              }}
            >
              {t.icon}
              <span style={{ fontSize: '0.68rem', fontWeight: 600 }}>{t.label}</span>
              {t.badge !== undefined && t.badge > 0 && (
                <span style={{
                  position: 'absolute', top: 2, right: '50%', transform: 'translateX(12px)',
                  width: 16, height: 16, borderRadius: '50%',
                  background: 'var(--status-cancelled)', color: '#fff',
                  fontSize: '0.6rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {t.badge > 9 ? '9+' : t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toastType}`}>{toast}</div>
        </div>
      )}

      {/* Bottom spacer for tab bar */}
      <div style={{ height: 80 }} />
    </>
  );
}
