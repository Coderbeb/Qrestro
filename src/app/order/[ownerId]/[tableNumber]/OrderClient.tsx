'use client';
import { useEffect, useState, useCallback, useRef, use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Sun, Moon, ShoppingBag, Utensils, Clock, X, Bell, Droplets } from 'lucide-react';
import { useSocket } from '@/lib/useSocket';

type MenuItem = { id: string; name: string; description: string | null; price: number; imageUrl: string | null; preparationTime: number; categoryId: string | null; };
type Category = { id: string; name: string; sortOrder: number; items: MenuItem[]; };
type CartItem = { menuItem: MenuItem; quantity: number; };
type Restaurant = { id: string; restaurantName: string | null; };
type OrderStatus = {
  id: string;
  status: string;
  totalAmount: number;
  estimatedTime: number;
  tableNumber: number;
  cancellationReason?: string | null;
  items: { menuItemName: string; quantity: number; price?: number }[];
};

const STATUS_STEPS = ['pending', 'preparing', 'ready', 'completed'];

export type OrderClientProps = {
  ownerId: string;
  tableNumber: string;
  restaurant: Restaurant | null;
  categories: Category[];
  uncategorized: MenuItem[];
  allItems: MenuItem[];
  initialCode?: string | null;
  serverError?: string;
};

export default function OrderClient({ 
  ownerId, 
  tableNumber, 
  restaurant: initialRestaurant, 
  categories: initialCategories, 
  uncategorized: initialUncategorized, 
  allItems: initialAllItems,
  serverError
}: OrderClientProps) {
  const router = useRouter();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(initialRestaurant);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [uncategorized, setUncategorized] = useState<MenuItem[]>(initialUncategorized);
  const [allItems, setAllItems] = useState<MenuItem[]>(initialAllItems);
  const [cart, setCart] = useState<Map<string, CartItem>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(serverError || '');
  const [placing, setPlacing] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [isDark, setIsDark] = useState(false);
  const [liveOrders, setLiveOrders] = useState<OrderStatus[]>([]);
  const [showTracking, setShowTracking] = useState(false);
  const tabBarRef = useRef<HTMLDivElement>(null);
  const [notes, setNotes] = useState('');
  const [waiterCooldown, setWaiterCooldown] = useState(false);
  const [waterCooldown, setWaterCooldown] = useState(false);
  const [toast, setToast] = useState('');
  const [hasWaterItem, setHasWaterItem] = useState(initialAllItems.some(i => i.name.toLowerCase().includes('water')));

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // Load tracked orders for this table session from the database
  const loadTrackedOrders = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const storageKey = `sessionToken_${ownerId}_${tableNumber}`;
    const sessionToken = sessionStorage.getItem(storageKey);
    if (!sessionToken) {
      setLiveOrders([]);
      return;
    }
    
    try {
      const res = await fetch(`/api/public/orders?ownerId=${ownerId}&tableNumber=${tableNumber}&sessionToken=${sessionToken}`);
      const data = await res.json();
      
      if (!data.success) {
        if (data.error?.code === 'SESSION_EXPIRED') {
          setLiveOrders([]);
          setShowTracking(false);
        }
        return;
      }
      
      const active = (data.data || []).filter((o: any) => o.status !== 'cancelled').map((o: any) => ({
        ...o,
        totalAmount: parseFloat(o.totalAmount.toString()),
        items: o.items.map((i: any) => ({
          ...i,
          price: i.price ? parseFloat(i.price.toString()) : undefined
        }))
      }));
      setLiveOrders(active);
    } catch (err) {
      console.error('Error loading session orders:', err);
    }
  }, [ownerId, tableNumber]);

  useEffect(() => {
    loadTrackedOrders();
  }, [loadTrackedOrders]);

  const socketListeners = useMemo(() => ({
    'order:updated': (data: unknown) => {
      const updatedOrder = data as { id: string; status: string };
      if (!updatedOrder || !updatedOrder.id) return;
      
      setLiveOrders(prev => {
        const orderExists = prev.some(o => o.id === updatedOrder.id);
        if (!orderExists) return prev;

        const updated = prev.map(o => o.id === updatedOrder.id ? { ...o, status: updatedOrder.status } : o);
        const filtered = updated.filter(o => o.status !== 'cancelled');
        return filtered;
      });
    },
    'order:new': (data: unknown) => {
      const newOrder = data as OrderStatus;
      if (!newOrder || !newOrder.id) return;
      if (newOrder.tableNumber !== parseInt(tableNumber)) return;
      
      setLiveOrders(prev => {
        if (prev.some(o => o.id === newOrder.id)) return prev;
        return [...prev, {
          ...newOrder,
          totalAmount: parseFloat(newOrder.totalAmount.toString()),
          items: newOrder.items.map((i: any) => ({
            ...i,
            price: i.price ? parseFloat(i.price.toString()) : undefined
          }))
        }];
      });
    },
    'menu:updated': (data: unknown) => {
      const payload = data as { id: string; name: string; description: string | null; price: number; imageUrl: string | null; preparationTime: number; isAvailable: boolean; categoryId: string | null };
      if (!payload || !payload.id) return;
      console.log('🔌 [Socket.io] Menu item updated in real-time:', payload);

      const updateItem = (item: MenuItem): MenuItem => item.id === payload.id ? {
        id: item.id,
        name: payload.name,
        description: payload.description,
        price: payload.price,
        imageUrl: payload.imageUrl,
        preparationTime: payload.preparationTime,
        categoryId: payload.categoryId
      } : item;

      if (payload.isAvailable === false) {
        // If item is marked unavailable, remove it from the menu lists
        setCategories(prev => prev.map(cat => ({
          ...cat,
          items: cat.items.filter(item => item.id !== payload.id)
        })).filter(cat => cat.items.length > 0));
        setUncategorized(prev => prev.filter(item => item.id !== payload.id));
        setAllItems(prev => prev.filter(item => item.id !== payload.id));
      } else {
        setCategories(prev => prev.map(cat => ({
          ...cat,
          items: cat.items.map(updateItem)
        })));
        setUncategorized(prev => prev.map(updateItem));
        setAllItems(prev => prev.map(updateItem));
      }
    },
    'menu:deleted': (data: unknown) => {
      const payload = data as { id: string };
      if (!payload || !payload.id) return;
      console.log('🔌 [Socket.io] Menu item deleted in real-time:', payload);

      setCategories(prev => prev.map(cat => ({
        ...cat,
        items: cat.items.filter(item => item.id !== payload.id)
      })).filter(cat => cat.items.length > 0));
      setUncategorized(prev => prev.filter(item => item.id !== payload.id));
      setAllItems(prev => prev.filter(item => item.id !== payload.id));
    },
    'table:reset': (data: unknown) => {
      const payload = data as { tableNumber: number };
      if (payload && payload.tableNumber === parseInt(tableNumber)) {
        setLiveOrders([]);
        localStorage.setItem('placedOrderIds', JSON.stringify([]));
        setShowTracking(false);
        const storageKey = `sessionToken_${ownerId}_${tableNumber}`;
        sessionStorage.removeItem(storageKey);
        setError('Dining session has expired. Please scan the table QR code again to start a new session.');
      }
    }
  }), [tableNumber, ownerId]);

  useSocket(ownerId, socketListeners);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
      setIsDark(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      setIsDark(false);
      document.documentElement.removeAttribute('data-theme');
    }
  }, []);

  function toggleTheme() {
    const nextTheme = !isDark;
    setIsDark(nextTheme);
    if (nextTheme) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  }

  // Background session verification
  useEffect(() => {
    if (serverError) return;

    async function verifySession() {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const codeFromUrl = urlParams.get('code');

        const storageKey = `sessionToken_${ownerId}_${tableNumber}`;
        const existingSession = sessionStorage.getItem(storageKey);
        
        if (codeFromUrl || existingSession) {
          const res = await fetch('/api/public/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ownerId,
              tableNumber,
              code: codeFromUrl,
              sessionToken: existingSession
            })
          });
          const data = await res.json();
          
          if (!data.success) {
            if (data.error?.code === 'SESSION_EXPIRED') {
              sessionStorage.removeItem(storageKey);
              localStorage.setItem('placedOrderIds', JSON.stringify([]));
            }
            setError(data.error?.message || 'Access Denied');
            return;
          }
          
          if (data.data.sessionToken) {
            sessionStorage.setItem(storageKey, data.data.sessionToken);
          }
          
          if (codeFromUrl) {
            window.history.replaceState({}, '', window.location.pathname);
          }
          
          loadTrackedOrders();
        } else {
          setError('Access Denied: Please scan the QR code on your table to view the menu.');
        }
      } catch (err) {
        console.error('Session verify error', err);
      }
    }
    
    verifySession();
  }, [ownerId, tableNumber, serverError, loadTrackedOrders]);

  function addToCart(item: MenuItem) {
    setCart(prev => { const next = new Map(prev); const ex = next.get(item.id); if (ex) next.set(item.id, { ...ex, quantity: ex.quantity + 1 }); else next.set(item.id, { menuItem: item, quantity: 1 }); return next; });
  }

  function removeFromCart(itemId: string) {
    setCart(prev => { const next = new Map(prev); const ex = next.get(itemId); if (!ex) return prev; if (ex.quantity <= 1) next.delete(itemId); else next.set(itemId, { ...ex, quantity: ex.quantity - 1 }); return next; });
  }

  const cartItems = Array.from(cart.values());
  const cartTotal = cartItems.reduce((s, c) => s + c.menuItem.price * c.quantity, 0);
  const cartCount = cartItems.reduce((s, c) => s + c.quantity, 0);

  async function placeOrder() {
    if (!cartItems.length) return;
    setPlacing(true);
    try {
      const storageKey = `sessionToken_${ownerId}_${tableNumber}`;
      const sessionToken = typeof window !== 'undefined' ? sessionStorage.getItem(storageKey) : null;
      
      const res = await fetch('/api/orders', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          ownerId, 
          tableNumber: parseInt(tableNumber), 
          items: cartItems.map(c => ({ menuItemId: c.menuItem.id, quantity: c.quantity })),
          notes: notes.trim() || undefined,
          sessionToken
        }) 
      });
      const data = await res.json();
      if (!data.success) {
        if (data.error?.code === 'SESSION_EXPIRED') {
          sessionStorage.removeItem(storageKey);
          localStorage.setItem('placedOrderIds', JSON.stringify([]));
          setError('Session expired. Please scan the table QR code again to start a new session.');
        }
        alert(data.error?.message || 'Failed to place order'); 
        return; 
      }
      
      // Store the placed order ID
      const storedIds = JSON.parse(localStorage.getItem('placedOrderIds') || '[]');
      if (!storedIds.includes(data.data.id)) {
        storedIds.push(data.data.id);
        localStorage.setItem('placedOrderIds', JSON.stringify(storedIds));
      }
      
      setNotes('');
      router.push(`/order/${ownerId}/${tableNumber}/success?orderId=${data.data.id}&total=${cartTotal.toFixed(2)}&time=${data.data.estimatedTime}`);
    } finally { setPlacing(false); }
  }

  // Build tab list: All + each category + Uncategorized (if has items)
  const tabs = [
    { id: 'all', label: `All (${allItems.length})` },
    ...categories.map(c => ({ id: c.id, label: c.name })),
    ...(uncategorized.length > 0 ? [{ id: 'uncategorized', label: 'Other' }] : []),
  ];

  // Get items to display based on active tab
  const displayItems: MenuItem[] = activeTab === 'all' ? allItems
    : activeTab === 'uncategorized' ? uncategorized
    : (categories.find(c => c.id === activeTab)?.items || []);

  async function sendServiceRequest(type: 'waiter' | 'water') {
    const setCooldown = type === 'waiter' ? setWaiterCooldown : setWaterCooldown;
    setCooldown(true);
    setTimeout(() => setCooldown(false), 30000);
    try {
      const storageKey = `sessionToken_${ownerId}_${tableNumber}`;
      const sessionToken = typeof window !== 'undefined' ? sessionStorage.getItem(storageKey) : null;
      const res = await fetch('/api/service-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId, tableNumber: parseInt(tableNumber), type, sessionToken }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(type === 'waiter' ? '🛎 Waiter has been notified!' : '💧 Water order placed!');
        if (type === 'water' && data.data?.order) {
          const storedIds = JSON.parse(localStorage.getItem('placedOrderIds') || '[]');
          if (!storedIds.includes(data.data.order.id)) {
            storedIds.push(data.data.order.id);
            localStorage.setItem('placedOrderIds', JSON.stringify(storedIds));
          }
          loadTrackedOrders();
        }
      } else {
        showToast(data.error?.message || 'Request failed');
      }
    } catch {
      showToast('Network error. Please try again.');
    }
  }

  if (loading) return (
    <div className="order-page">
      <header className="order-header">
        <div style={{ flex: 1 }}>
          <div className="skeleton skeleton-text" style={{ width: '60%', height: 20, marginBottom: 6 }} />
          <div className="skeleton skeleton-text" style={{ width: '40%', height: 14 }} />
        </div>
      </header>
      <div style={{ display: 'flex', gap: '0.5rem', padding: '0 1rem', marginBottom: '1rem', overflow: 'hidden' }}>
        {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ width: 72, height: 32, borderRadius: 999, flexShrink: 0 }} />)}
      </div>
      <div className="order-menu-grid">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="order-item-card">
            <div className="order-item-img skeleton" />
            <div className="order-item-body">
              <div className="skeleton skeleton-text" style={{ width: '70%', height: 16, marginBottom: 8 }} />
              <div className="skeleton skeleton-text" style={{ width: '90%', height: 12, marginBottom: 12 }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="skeleton skeleton-text" style={{ width: 50, height: 16 }} />
                <div className="skeleton" style={{ width: 64, height: 30, borderRadius: 'var(--radius-sm)' }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  if (error) return (
    <div className="loading-center" style={{ minHeight: '100vh', textAlign: 'center', padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>😕</div>
      <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 700, maxWidth: '600px', margin: '0 auto 0.75rem auto', lineHeight: '1.35' }}>
        {error}
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>
        Please ask staff for assistance.
      </p>
    </div>
  );

  return (
    <div className="order-page">
      {/* Hero Banner */}
      <div className="hero-banner">
        <div className="hero-pattern" />
        <div className="hero-banner-content">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.5px', textShadow: '0 2px 8px rgba(0,0,0,0.25)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {restaurant?.restaurantName || 'Restaurant'}
            </h1>
            <div style={{ fontSize: '0.9rem', opacity: 0.9, marginTop: '0.2rem', fontWeight: 500, textShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>
              Table {tableNumber} · Scan to order
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            <button className="btn btn-ghost btn-icon" onClick={toggleTheme} aria-label="Toggle theme" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'white', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.3)' }}>
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {liveOrders.length > 0 && (
              <button
                id="track-orders-btn"
                className={`btn btn-sm ${liveOrders.every(o => o.status === 'completed') ? 'btn-success' : 'btn-track-orders'}`}
                onClick={() => setShowTracking(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: liveOrders.every(o => o.status === 'completed') ? 'var(--status-ready)' : 'rgba(255,255,255,0.95)', color: liveOrders.every(o => o.status === 'completed') ? '#fff' : 'var(--accent)', border: 'none', fontWeight: 700, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
              >
                {liveOrders.every(o => o.status === 'completed') ? (
                  <>🧾 Bill (₹{liveOrders.reduce((s, o) => s + parseFloat(o.totalAmount.toString()), 0).toFixed(2)})</>
                ) : (
                  <><Clock size={14} className="pulse-icon" /> Track ({liveOrders.length})</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category tab bar (horizontal scroll) */}
      {tabs.length > 1 && (
        <div ref={tabBarRef} className="sticky-tabs-container category-tabs" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          {tabs.map(t => (
            <button key={t.id} className={`category-tab${activeTab === t.id ? ' active' : ''}`} onClick={() => setActiveTab(t.id)} style={{ padding: '0.5rem 1.25rem', borderRadius: '999px', background: activeTab === t.id ? 'var(--accent)' : 'var(--bg-hover)', color: activeTab === t.id ? '#fff' : 'var(--text-primary)', border: 'none', fontWeight: 600, transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)', transform: activeTab === t.id ? 'scale(1.05)' : 'scale(1)' }}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Menu */}
      {displayItems.length === 0 ? (
        <div className="empty-state" style={{ minHeight: 'calc(100vh - 160px)' }}>
          <div className="empty-state-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Utensils size={40} style={{ strokeWidth: 1.5 }} />
          </div>
          <h3>Nothing here yet</h3>
          <p>No items available in this category.</p>
        </div>
      ) : (
        <div className="order-menu-grid">
          {displayItems.map(item => {
            const qty = cart.get(item.id)?.quantity || 0;
            return (
              <div key={item.id} className="order-item-card">
                <div className="order-item-img">{item.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : <Utensils size={24} style={{ color: 'var(--text-muted)' }} />}</div>
                <div className="order-item-body">
                  <div className="order-item-name">{item.name}</div>
                  {item.description && <div className="order-item-desc">{item.description}</div>}
                  <div className="order-item-footer">
                    <div>
                      <div className="order-item-price">₹{item.price.toFixed(2)}</div>
                      <div className="order-item-prep" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><Clock size={12} /> {item.preparationTime} min</div>
                    </div>
                    {qty === 0 ? (
                      <button id={`add-${item.id}`} className="btn btn-primary btn-sm btn-pill" onClick={() => addToCart(item)} style={{ padding: '0.45rem 1.1rem', fontWeight: 700, boxShadow: '0 4px 10px var(--accent-glow)', animation: 'popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>+ Add</button>
                    ) : (
                      <div className="qty-pill" style={{ animation: 'popIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                        <button className="qty-pill-btn" onClick={() => removeFromCart(item.id)}>−</button>
                        <span className="qty-pill-val">{qty}</span>
                        <button className="qty-pill-btn" onClick={() => addToCart(item)}>+</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating service buttons */}
      <div className="service-fab-bar" style={{
        position: 'fixed',
        bottom: cartCount > 0 ? 80 : 16,
        right: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        zIndex: 900,
        transition: 'bottom 0.3s var(--transition)',
      }}>
        <button
          id="call-waiter-btn"
          className="btn btn-sm"
          disabled={waiterCooldown}
          onClick={() => sendServiceRequest('waiter')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            background: 'var(--card-bg)', border: '1.5px solid var(--border)',
            color: 'var(--text-primary)', boxShadow: 'var(--shadow-md)',
            borderRadius: 'var(--radius-md)', padding: '0.6rem 1rem',
            fontWeight: 700, fontSize: '0.82rem',
            opacity: waiterCooldown ? 0.5 : 1,
            minHeight: 44,
          }}
        >
          <Bell size={16} /> {waiterCooldown ? 'Sent ✓' : 'Call Waiter'}
        </button>
        {hasWaterItem && (
          <button
            id="quick-water-btn"
            className="btn btn-sm"
            disabled={waterCooldown}
            onClick={() => sendServiceRequest('water')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              background: 'var(--card-bg)', border: '1.5px solid var(--accent)',
              color: 'var(--accent)', boxShadow: 'var(--shadow-md)',
              borderRadius: 'var(--radius-md)', padding: '0.6rem 1rem',
              fontWeight: 700, fontSize: '0.82rem',
              opacity: waterCooldown ? 0.5 : 1,
              minHeight: 44,
            }}
          >
            <Droplets size={16} /> {waterCooldown ? 'Ordered ✓' : 'Water'}
          </button>
        )}
      </div>

      {/* Cart bar */}
      {cartCount > 0 && !showCart && (
        <div className="cart-pill-bar glass-panel" onClick={() => setShowCart(true)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ background: 'var(--accent)', color: 'white', width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.1rem', boxShadow: '0 4px 10px var(--accent-glow)' }}>
              {cartCount}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: '1.2' }}>View Cart</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, lineHeight: '1.2' }}>₹{cartTotal.toFixed(2)}</div>
            </div>
          </div>
          <button className="btn btn-primary btn-pill" style={{ padding: '0.5rem 1.25rem', border: 'none', boxShadow: 'none', fontWeight: 700 }}>Checkout →</button>
        </div>
      )}

      {/* Cart modal */}
      {showCart && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCart(false)}>
          <div className="modal-box" style={{ maxWidth: 440 }}>
            <div className="modal-header"><h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShoppingBag size={20} /> Your Cart</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowCart(false)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button></div>
            <div style={{ marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '50vh', overflowY: 'auto' }}>
              {cartItems.map(c => (
                <div key={c.menuItem.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.menuItem.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>₹{c.menuItem.price.toFixed(2)} each</div>
                  </div>
                  <div className="qty-control">
                    <button className="qty-btn" onClick={() => removeFromCart(c.menuItem.id)}>−</button>
                    <span className="qty-value">{c.quantity}</span>
                    <button className="qty-btn" onClick={() => addToCart(c.menuItem)}>+</button>
                  </div>
                  <div style={{ fontWeight: 700, minWidth: 56, textAlign: 'right', fontSize: '0.9rem' }}>₹{(c.menuItem.price * c.quantity).toFixed(2)}</div>
                </div>
              ))}
            </div>
            {/* Special Instructions */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>📝 Special instructions (optional)</label>
              <textarea
                id="order-notes-input"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. No onions, extra spicy, allergies…"
                maxLength={500}
                rows={2}
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
                  transition: 'border-color 0.2s',
                }}
              />
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700 }}>Total</span>
              <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--accent)' }}>₹{cartTotal.toFixed(2)}</span>
            </div>
            <button id="place-order-btn" className="btn btn-primary btn-full btn-lg" onClick={placeOrder} disabled={placing} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              {placing ? <><span className="spinner" style={{ width: 18, height: 18 }} /> Placing Order…</> : <><ShoppingBag size={18} /> Place Order</>}
            </button>
          </div>
        </div>
      )}

      {/* Tracking modal */}
      {showTracking && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowTracking(false)}>
          <div className="modal-box" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {liveOrders.every(o => o.status === 'completed') ? (
                  <>🧾 Current Bill</>
                ) : (
                  <><Clock size={20} style={{ color: 'var(--status-pending)' }} /> Orders ({liveOrders.length})</>
                )}
              </h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowTracking(false)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
            </div>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '55vh', overflowY: 'auto', paddingRight: '4px' }}>
              {liveOrders.every(o => o.status === 'completed') ? (
                (() => {
                  const itemMap = new Map<string, { menuItemName: string; quantity: number; price: number }>();
                  let totalBill = 0;
                  for (const o of liveOrders) {
                    totalBill += parseFloat(o.totalAmount.toString());
                    for (const item of o.items) {
                      const key = item.menuItemName;
                      const itemPrice = item.price ? parseFloat(item.price.toString()) : 0;
                      const existing = itemMap.get(key);
                      if (existing) {
                        existing.quantity += item.quantity;
                      } else {
                        itemMap.set(key, { menuItemName: key, quantity: item.quantity, price: itemPrice });
                      }
                    }
                  }
                  const receiptItems = Array.from(itemMap.values());

                  return (
                    <div className="restaurant-receipt" style={{
                      background: 'var(--card-bg, #fff)',
                      color: 'var(--text-primary)',
                      padding: '1.5rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      fontFamily: 'Courier New, Courier, monospace',
                      border: '1px dashed var(--border)',
                      maxWidth: '100%',
                      margin: '0 auto',
                      position: 'relative',
                    }}>
                      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                        <h4 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 0.25rem 0', textTransform: 'uppercase', letterSpacing: '1px' }}>
                          {restaurant?.restaurantName || 'QRestro'}
                        </h4>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>TABLE: {tableNumber}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      
                      <div style={{ borderTop: '1px dashed var(--border)', margin: '1rem 0' }} />
                      
                      <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px dashed var(--border)' }}>
                            <th style={{ textAlign: 'left', paddingBottom: '0.5rem', fontWeight: 'bold' }}>ITEM</th>
                            <th style={{ textAlign: 'center', paddingBottom: '0.5rem', fontWeight: 'bold', width: '30px' }}>QTY</th>
                            <th style={{ textAlign: 'right', paddingBottom: '0.5rem', fontWeight: 'bold', width: '60px' }}>PRICE</th>
                            <th style={{ textAlign: 'right', paddingBottom: '0.5rem', fontWeight: 'bold', width: '70px' }}>TOTAL</th>
                          </tr>
                        </thead>
                        <tbody>
                          {receiptItems.map((item, idx) => (
                            <tr key={idx} style={{ height: '24px' }}>
                              <td style={{ textAlign: 'left', padding: '0.15rem 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>{item.menuItemName}</td>
                              <td style={{ textAlign: 'center', padding: '0.15rem 0' }}>{item.quantity}</td>
                              <td style={{ textAlign: 'right', padding: '0.15rem 0' }}>₹{item.price.toFixed(2)}</td>
                              <td style={{ textAlign: 'right', padding: '0.15rem 0' }}>₹{(item.price * item.quantity).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      
                      <div style={{ borderTop: '1px dashed var(--border)', marginTop: '1rem', paddingTop: '1rem' }} />
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.05rem' }}>
                        <span>GRAND TOTAL</span>
                        <span>₹{totalBill.toFixed(2)}</span>
                      </div>
                      
                      <div style={{ borderTop: '1px dashed var(--border)', margin: '1rem 0' }} />
                      
                      <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                        <p style={{ margin: '0 0 0.4rem 0', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--status-ready)' }}>CASH PAYMENT ONLY</p>
                        <p style={{ margin: 0 }}>Please show this screen at the counter to pay your bill.</p>
                        <p style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>Thank you! 🙏</p>
                      </div>
                    </div>
                  );
                })()
              ) : (
                liveOrders.map(order => {
                  const isCancelled = order.status === 'cancelled';
                  const currentIndex = STATUS_STEPS.indexOf(order.status);
                  return (
                    <div key={order.id} className={`order-tracking-card ${order.status}`}>
                      <div className={`order-tracking-header ${order.status}`}>
                        <span style={{ fontWeight: 700, fontSize: '0.825rem' }}>Order #{order.id.slice(-4).toUpperCase()}</span>
                        <span className={`badge badge-${order.status}`} style={{ textTransform: 'capitalize', fontSize: '0.675rem', padding: '0.1rem 0.4rem' }}>
                          {order.status}
                        </span>
                      </div>
                      
                      <div className="order-tracking-body">
                        {/* Progress indicator */}
                        {!isCancelled && (
                          <div style={{ margin: '0.5rem 0' }}>
                            <div style={{ display: 'flex', gap: '0.35rem', height: 5, borderRadius: 99, overflow: 'hidden' }}>
                              <div style={{ flex: 1, borderRadius: 99, background: currentIndex >= 0 ? 'var(--status-pending)' : 'var(--border)', transition: 'background 0.5s ease' }} />
                              <div style={{ flex: 1, borderRadius: 99, background: currentIndex >= 1 ? 'var(--status-preparing)' : 'var(--border)', transition: 'background 0.5s ease' }} />
                              <div style={{ flex: 1, borderRadius: 99, background: currentIndex >= 2 ? 'var(--status-ready)' : 'var(--border)', transition: 'background 0.5s ease' }} />
                            </div>
                          </div>
                        )}

                        {/* Items */}
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.4rem' }}>
                          {order.items.map((item, index) => (
                            <div key={index} style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>{item.quantity}× {item.menuItemName}</span>
                            </div>
                          ))}
                        </div>

                        {/* Cancellation reason */}
                        {isCancelled && order.cancellationReason && (
                          <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.6rem', background: 'rgba(220,38,38,0.08)', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: 'var(--status-cancelled)' }}>
                            ❌ <strong>Reason:</strong> {order.cancellationReason}
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', marginTop: '0.5rem', paddingTop: '0.4rem', fontSize: '0.78rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Est. Time: ~{order.estimatedTime} min</span>
                          <span style={{ fontWeight: 700, color: 'var(--accent)' }}>₹{parseFloat(order.totalAmount.toString()).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--text-primary)', color: 'var(--bg)', padding: '0.7rem 1.25rem',
          borderRadius: 'var(--radius-md)', fontSize: '0.85rem', fontWeight: 600,
          zIndex: 9999, boxShadow: 'var(--shadow-lg)', animation: 'fadeInUp 0.3s ease',
          whiteSpace: 'nowrap',
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
