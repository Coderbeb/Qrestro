'use client';
import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  preparationTime: number;
};

type CartItem = {
  menuItem: MenuItem;
  quantity: number;
};

type Restaurant = {
  id: string;
  restaurantName: string | null;
};

export default function OrderPage({
  params,
}: {
  params: Promise<{ ownerId: string; tableNumber: string }>;
}) {
  const { ownerId, tableNumber } = use(params);
  const router = useRouter();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<Map<string, CartItem>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [placing, setPlacing] = useState(false);
  const [showCart, setShowCart] = useState(false);

  const loadMenu = useCallback(async () => {
    try {
      const res = await fetch(`/api/public/menu?ownerId=${ownerId}`);
      const data = await res.json();
      if (!data.success) { setError('Restaurant not found'); return; }
      setRestaurant(data.data.restaurant);
      setMenuItems(data.data.items);
    } catch {
      setError('Failed to load menu');
    } finally { setLoading(false); }
  }, [ownerId]);

  // eslint-disable-next-line
  useEffect(() => { loadMenu(); }, [loadMenu]);

  function addToCart(item: MenuItem) {
    setCart(prev => {
      const next = new Map(prev);
      const existing = next.get(item.id);
      next.set(item.id, { menuItem: item, quantity: (existing?.quantity || 0) + 1 });
      return next;
    });
  }

  function removeFromCart(itemId: string) {
    setCart(prev => {
      const next = new Map(prev);
      const existing = next.get(itemId);
      if (!existing) return prev;
      if (existing.quantity <= 1) next.delete(itemId);
      else next.set(itemId, { ...existing, quantity: existing.quantity - 1 });
      return next;
    });
  }

  const cartItems = Array.from(cart.values());
  const cartTotal = cartItems.reduce((s, c) => s + c.menuItem.price * c.quantity, 0);
  const cartCount = cartItems.reduce((s, c) => s + c.quantity, 0);

  async function placeOrder() {
    if (cartItems.length === 0) return;
    setPlacing(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId,
          tableNumber: parseInt(tableNumber),
          items: cartItems.map(c => ({ menuItemId: c.menuItem.id, quantity: c.quantity })),
        }),
      });
      const data = await res.json();
      if (!data.success) { alert(data.error?.message || 'Failed to place order'); return; }
      router.push(`/order/${ownerId}/${tableNumber}/success?orderId=${data.data.id}&total=${cartTotal.toFixed(2)}&time=${data.data.estimatedTime}`);
    } finally { setPlacing(false); }
  }

  if (loading) return (
    <div className="loading-center" style={{ minHeight: '100vh' }}>
      <div className="spinner" style={{ width: 40, height: 40 }} />
      <span>Loading menu…</span>
    </div>
  );

  if (error) return (
    <div className="loading-center" style={{ minHeight: '100vh' }}>
      <div style={{ fontSize: '3rem' }}>😕</div>
      <h2>{error}</h2>
      <p style={{ color: 'var(--text-muted)' }}>Please ask staff for assistance.</p>
    </div>
  );

  return (
    <div className="order-page">
      {/* Header */}
      <header className="order-header">
        <div>
          <div className="order-header-title">{restaurant?.restaurantName || 'Restaurant'}</div>
          <div className="order-header-sub">Table {tableNumber} · Tap items to add to cart</div>
        </div>
        {cartCount > 0 && (
          <button
            id="view-cart-btn"
            className="btn btn-primary btn-sm"
            onClick={() => setShowCart(true)}
          >
            🛒 {cartCount} item{cartCount !== 1 ? 's' : ''}
          </button>
        )}
      </header>

      {/* Menu */}
      {menuItems.length === 0 ? (
        <div className="empty-state" style={{ minHeight: 'calc(100vh - 120px)' }}>
          <div className="empty-state-icon">🍽️</div>
          <h3>Menu coming soon</h3>
          <p>The restaurant hasn&apos;t added any items yet.</p>
        </div>
      ) : (
        <div className="order-menu-grid">
          {menuItems.map(item => {
            const qty = cart.get(item.id)?.quantity || 0;
            return (
              <div key={item.id} className="order-item-card">
                <div className="order-item-img">
                  {item.imageUrl
                    ? <img src={item.imageUrl} alt={item.name} />
                    : '🍴'}
                </div>
                <div className="order-item-body">
                  <div className="order-item-name">{item.name}</div>
                  {item.description && <div className="order-item-desc">{item.description}</div>}
                  <div className="order-item-footer">
                    <div>
                      <div className="order-item-price">₹{item.price.toFixed(2)}</div>
                      <div className="order-item-prep">⏱ {item.preparationTime} min</div>
                    </div>
                    {qty === 0 ? (
                      <button id={`add-${item.id}`} className="btn btn-primary btn-sm" onClick={() => addToCart(item)}>
                        + Add
                      </button>
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

      {/* Bottom cart bar */}
      {cartCount > 0 && !showCart && (
        <div className="cart-bar" onClick={() => setShowCart(true)} style={{ cursor: 'pointer' }}>
          <div>
            <div className="cart-summary">{cartCount} item{cartCount !== 1 ? 's' : ''}</div>
            <div className="cart-total">₹{cartTotal.toFixed(2)}</div>
          </div>
          <button className="btn btn-primary">View Cart →</button>
        </div>
      )}

      {/* Cart modal */}
      {showCart && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCart(false)}>
          <div className="modal-box" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3 className="modal-title">Your Cart</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCart(false)}>✕</button>
            </div>
            <div style={{ marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {cartItems.map(c => (
                <div key={c.menuItem.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{c.menuItem.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>₹{c.menuItem.price.toFixed(2)} each</div>
                  </div>
                  <div className="qty-control">
                    <button className="qty-btn" onClick={() => removeFromCart(c.menuItem.id)}>−</button>
                    <span className="qty-value">{c.quantity}</span>
                    <button className="qty-btn" onClick={() => addToCart(c.menuItem)}>+</button>
                  </div>
                  <div style={{ fontWeight: 700, minWidth: 60, textAlign: 'right' }}>
                    ₹{(c.menuItem.price * c.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700 }}>Total</span>
              <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--accent)' }}>₹{cartTotal.toFixed(2)}</span>
            </div>
            <button id="place-order-btn" className="btn btn-primary btn-full btn-lg" onClick={placeOrder} disabled={placing}>
              {placing ? <><span className="spinner" style={{ width: 18, height: 18 }} /> Placing Order…</> : '🛒 Place Order'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
