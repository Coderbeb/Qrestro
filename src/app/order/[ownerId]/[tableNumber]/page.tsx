'use client';
import { useEffect, useState, useCallback, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { Sun, Moon, ShoppingBag, Utensils, Clock, X } from 'lucide-react';

type MenuItem = { id: string; name: string; description: string | null; price: number; imageUrl: string | null; preparationTime: number; categoryId: string | null; };
type Category = { id: string; name: string; sortOrder: number; items: MenuItem[]; };
type CartItem = { menuItem: MenuItem; quantity: number; };
type Restaurant = { id: string; restaurantName: string | null; };

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
  const tabBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    setIsDark(saved === 'dark');
  }, []);

  function toggleTheme() {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) { document.documentElement.setAttribute('data-theme', 'dark'); localStorage.setItem('theme', 'dark'); }
    else { document.documentElement.removeAttribute('data-theme'); localStorage.setItem('theme', 'light'); }
  }

  const loadMenu = useCallback(async () => {
    try {
      const res = await fetch(`/api/public/menu?ownerId=${ownerId}`);
      const data = await res.json();
      if (!data.success) { setError('Restaurant not found'); return; }
      setRestaurant(data.data.restaurant);
      setCategories(data.data.categories || []);
      setUncategorized(data.data.uncategorized || []);
      setAllItems(data.data.items || []);
    } catch { setError('Failed to load menu'); }
    finally { setLoading(false); }
  }, [ownerId]);

  useEffect(() => { loadMenu(); }, [loadMenu]);

  function addToCart(item: MenuItem) {
    setCart(prev => { const next = new Map(prev); const ex = next.get(item.id); next.set(item.id, { menuItem: item, quantity: (ex?.quantity || 0) + 1 }); return next; });
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
      const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ownerId, tableNumber: parseInt(tableNumber), items: cartItems.map(c => ({ menuItemId: c.menuItem.id, quantity: c.quantity })) }) });
      const data = await res.json();
      if (!data.success) { alert(data.error?.message || 'Failed to place order'); return; }
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
  if (error) return <div className="loading-center" style={{ minHeight: '100vh' }}><div style={{ fontSize: '3rem' }}>😕</div><h2>{error}</h2><p style={{ color: 'var(--text-muted)' }}>Please ask staff for assistance.</p></div>;

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
                <div className="order-item-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : <Utensils size={24} style={{ color: 'var(--text-muted)' }} />}</div>
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
    </div>
  );
}
