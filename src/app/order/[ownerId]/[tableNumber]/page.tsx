'use client';
import { useEffect, useState, useCallback, useRef, use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Sun, Moon, ShoppingBag, Utensils, Clock, X } from 'lucide-react';
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
  items: { menuItemName: string; quantity: number; price?: number }[];
};

const STATUS_STEPS = ['pending', 'preparing', 'ready', 'completed'];

export default function OrderPage({ params }: { params: Promise<{ ownerId: string; tableNumber: string }> }) {
  const { ownerId, tableNumber } = use(params);
  const router = useRouter();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [uncategorized, setUncategorized] = useState<MenuItem[]>([]);
  const [allItems, setAllItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<Map<string, CartItem>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [placing, setPlacing] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [isDark, setIsDark] = useState(false);
  const [liveOrders, setLiveOrders] = useState<OrderStatus[]>([]);
  const [showTracking, setShowTracking] = useState(false);
  const tabBarRef = useRef<HTMLDivElement>(null);

  // Load tracked orders from localStorage and check their live status
  const loadTrackedOrders = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const storedIds = JSON.parse(localStorage.getItem('placedOrderIds') || '[]');
    if (storedIds.length === 0) {
      setLiveOrders([]);
      return;
    }
    
    try {
      const results = await Promise.all(
        storedIds.map(async (id: string) => {
          try {
            const res = await fetch(`/api/public/orders/${id}`);
            const data = await res.json();
            
            // If the order has been reset/cleared from the table session, remove it
            if (!data.success && data.error?.code === 'SESSION_RESET') {
              return { id, isExpired: true };
            }
            return data.success ? data.data : null;
          } catch {
            return null;
          }
        })
      );
      
      // Filter out nulls and expired ones, and clean up expired IDs from localStorage
      const expiredIds = results.filter(r => r && r.isExpired).map(r => r.id);
      if (expiredIds.length > 0) {
        const stored = JSON.parse(localStorage.getItem('placedOrderIds') || '[]');
        const updated = stored.filter((id: string) => !expiredIds.includes(id));
        localStorage.setItem('placedOrderIds', JSON.stringify(updated));
      }

      const active = results.filter((o): o is any => 
        o !== null && !o.isExpired && o.status !== 'cancelled'
      ).map(o => ({
        ...o,
        totalAmount: parseFloat(o.totalAmount.toString()),
        items: o.items.map((i: any) => ({
          ...i,
          price: parseFloat(i.price.toString())
        }))
      }));
      
      setLiveOrders(active);
    } catch (err) {
      console.error('Error loading tracked orders:', err);
    }
  }, []);

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
      
      const storedIds = JSON.parse(localStorage.getItem('placedOrderIds') || '[]');
      if (storedIds.includes(newOrder.id)) {
        setLiveOrders(prev => {
          if (prev.some(o => o.id === newOrder.id)) return prev;
          return [...prev, {
            ...newOrder,
            totalAmount: parseFloat(newOrder.totalAmount.toString()),
            items: newOrder.items.map((i: any) => ({
              ...i,
              price: parseFloat(i.price.toString())
            }))
          }];
        });
      }
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

  const loadMenu = useCallback(async () => {
    try {
      if (typeof window === 'undefined') return;
      
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get('code');
      
      const storageKey = `sessionToken_${ownerId}_${tableNumber}`;
      let sessionToken = sessionStorage.getItem(storageKey);

      let url = `/api/public/menu?ownerId=${ownerId}&tableNumber=${tableNumber}`;
      if (code) {
        url += `&code=${code}`;
      } else if (sessionToken) {
        url += `&sessionToken=${sessionToken}`;
      } else {
        setError('Access Denied: Please scan the QR code on your table to view the menu.');
        setLoading(false);
        return;
      }

      const res = await fetch(url);
      const data = await res.json();
      
      if (!data.success) {
        if (data.error?.code === 'SESSION_EXPIRED') {
          sessionStorage.removeItem(storageKey);
          localStorage.setItem('placedOrderIds', JSON.stringify([]));
        }
        setError(data.error?.message || 'Access Denied: Please scan the QR code on your table.');
        return;
      }

      // Store the session token
      if (data.data.sessionToken) {
        sessionStorage.setItem(storageKey, data.data.sessionToken);
      }

      // Clean the URL query params so they can't reload or bookmark the code param from browser history
      if (code) {
        window.history.replaceState({}, '', window.location.pathname);
      }

      setRestaurant(data.data.restaurant);
      setCategories(data.data.categories || []);
      setUncategorized(data.data.uncategorized || []);
      setAllItems(data.data.items || []);
    } catch {
      setError('Failed to load menu');
    } finally {
      setLoading(false);
    }
  }, [ownerId, tableNumber]);

  useEffect(() => { loadMenu(); }, [loadMenu]);

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

  if (loading) return <div className="loading-center" style={{ minHeight: '100vh' }}><div className="spinner" style={{ width: 40, height: 40 }} /><span>Loading menu…</span></div>;
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
      {/* Sticky Header */}
      <header className="order-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="order-header-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{restaurant?.restaurantName || 'Restaurant'}</div>
          <div className="order-header-sub">Table {tableNumber} · Tap to add</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          <button className="btn btn-ghost btn-icon" onClick={toggleTheme} aria-label="Toggle theme" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{isDark ? <Sun size={18} /> : <Moon size={18} />}</button>
          {liveOrders.length > 0 && (
            <button
              id="track-orders-btn"
              className={`btn btn-sm ${liveOrders.every(o => o.status === 'completed') ? 'btn-success' : 'btn-track-orders'}`}
              onClick={() => setShowTracking(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: liveOrders.every(o => o.status === 'completed') ? 'var(--status-ready)' : '', color: liveOrders.every(o => o.status === 'completed') ? '#fff' : '' }}
            >
              {liveOrders.every(o => o.status === 'completed') ? (
                <>🧾 View Bill (₹{liveOrders.reduce((s, o) => s + parseFloat(o.totalAmount.toString()), 0).toFixed(2)})</>
              ) : (
                <><Clock size={14} className="pulse-icon" /> Track Orders ({liveOrders.length})</>
              )}
            </button>
          )}
          {cartCount > 0 && <button id="view-cart-btn" className="btn btn-primary btn-sm" onClick={() => setShowCart(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}><ShoppingBag size={14} /> {cartCount}</button>}
        </div>
      </header>

      {/* Category tab bar (horizontal scroll) */}
      {tabs.length > 1 && (
        <div ref={tabBarRef} className="category-tabs">
          {tabs.map(t => (
            <button key={t.id} className={`category-tab${activeTab === t.id ? ' active' : ''}`} onClick={() => setActiveTab(t.id)}>
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
                      <button id={`add-${item.id}`} className="btn btn-primary btn-sm btn-pill" onClick={() => addToCart(item)}>+ Add</button>
                    ) : (
                      <div className="qty-control">
                        <button className="qty-btn" onClick={() => removeFromCart(item.id)}>−</button>
                        <span className="qty-value">{qty}</span>
                        <button className="qty-btn" onClick={() => addToCart(item)}>+</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cart bar */}
      {cartCount > 0 && !showCart && (
        <div className="cart-bar" onClick={() => setShowCart(true)} style={{ cursor: 'pointer' }}>
          <div><div className="cart-summary">{cartCount} item{cartCount !== 1 ? 's' : ''}</div><div className="cart-total">₹{cartTotal.toFixed(2)}</div></div>
          <button className="btn btn-primary">View Cart →</button>
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
                    <div key={order.id} className="order-tracking-card">
                      <div className="order-tracking-header">
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
    </div>
  );
}
