'use client';
import { use, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

type OrderStatus = {
  id: string;
  status: string;
  totalAmount: string;
  estimatedTime: number;
  tableNumber: number;
  items: { menuItemName: string; quantity: number }[];
};

const STATUS_STEPS = ['pending', 'preparing', 'ready', 'completed'];

function LiveTrackingContent({ ownerId, tableNumber }: { ownerId: string, tableNumber: string }) {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const initialTotal = searchParams.get('total') || '0.00';
  const initialTime = searchParams.get('time') || '20';

  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [error, setError] = useState('');
  const [isDark, setIsDark] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Read theme on mount
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    setIsDark(saved !== 'light');
  }, []);

  function toggleTheme() {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    }
  }

  useEffect(() => {
    if (!orderId) {
      // eslint-disable-next-line
      setError('Order not found');
      return;
    }

    async function fetchStatus() {
      try {
        const res = await fetch(`/api/public/orders/${orderId}`);
        const data = await res.json();
        if (data.success) {
          setOrder(data.data);
          if (data.data.status === 'completed' || data.data.status === 'cancelled') {
            if (intervalRef.current) clearInterval(intervalRef.current);
          }
        }
      } catch (err) {
        console.error('Polling error', err);
      }
    }

    fetchStatus();
    intervalRef.current = setInterval(fetchStatus, 5000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [orderId]);

  if (error) return <div className="loading-center"><h2>{error}</h2></div>;

  const currentStatus = order?.status || 'pending';
  const isCancelled = currentStatus === 'cancelled';
  const currentIndex = STATUS_STEPS.indexOf(currentStatus);

  return (
    <div className="success-page" style={{ position: 'relative' }}>
      {/* Theme toggle — top right corner */}
      <button
        className="btn btn-ghost btn-icon"
        onClick={toggleTheme}
        aria-label="Toggle theme"
        style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          fontSize: '1.1rem',
          zIndex: 10,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
        }}
      >
        {isDark ? '☀️' : '🌙'}
      </button>

      <div className="success-card">
        {/* Status Icon */}
        {isCancelled ? (
          <div className="success-icon" style={{ background: 'rgba(244,63,94,0.1)', borderColor: '#f43f5e', color: '#f43f5e' }}>✕</div>
        ) : currentIndex >= 2 ? (
          <div className="success-icon" style={{ background: 'rgba(34,197,94,0.1)', borderColor: '#22c55e', color: '#22c55e' }}>✅</div>
        ) : (
          <div className="success-icon" style={{ background: 'rgba(249,115,22,0.1)', borderColor: '#f97316', color: '#f97316' }}>👨‍🍳</div>
        )}

        <h1 style={{ fontSize: 'clamp(1.35rem, 5vw, 1.75rem)', fontWeight: 800, marginBottom: '0.5rem' }}>
          {isCancelled
            ? 'Order Cancelled'
            : currentStatus === 'ready'
            ? '🎉 Food is Ready!'
            : currentStatus === 'completed'
            ? 'Order Completed'
            : 'Preparing Your Order…'}
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          {isCancelled
            ? 'Please speak with the staff.'
            : currentStatus === 'ready'
            ? 'Your food is on its way to your table!'
            : 'Sit back and relax while the kitchen prepares your food.'}
        </p>

        {/* Live Progress Bar */}
        {!isCancelled && (
          <div style={{ marginBottom: '2.5rem', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              <span style={{ color: currentIndex >= 0 ? 'var(--accent)' : '' }}>Received</span>
              <span style={{ color: currentIndex >= 1 ? '#f97316' : '' }}>Preparing</span>
              <span style={{ color: currentIndex >= 2 ? '#22c55e' : '' }}>Ready 🎉</span>
            </div>
            <div style={{ display: 'flex', gap: '0.35rem', height: 10, borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ flex: 1, borderRadius: 99, background: currentIndex >= 0 ? 'var(--accent)' : 'var(--border)', transition: 'background 0.5s ease' }} />
              <div style={{ flex: 1, borderRadius: 99, background: currentIndex >= 1 ? '#f97316' : 'var(--border)', transition: 'background 0.5s ease' }} />
              <div style={{ flex: 1, borderRadius: 99, background: currentIndex >= 2 ? '#22c55e' : 'var(--border)', transition: 'background 0.5s ease' }} />
            </div>
          </div>
        )}

        {/* Order Details */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem',
          marginBottom: '2rem',
          textAlign: 'left',
          width: '100%',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Table</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>#{tableNumber}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Est. Time</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>~{order?.estimatedTime || initialTime} min</div>
            </div>
          </div>

          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {(order?.items || []).map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{item.quantity}× {item.menuItemName}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontWeight: 700 }}>Total Paid</span>
            <span style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '1.1rem' }}>₹{order?.totalAmount || initialTotal}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
          <a
            href={`/order/${ownerId}/${tableNumber}`}
            className="btn btn-primary btn-full"
          >
            + Order More Items
          </a>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage({
  params,
}: {
  params: Promise<{ ownerId: string; tableNumber: string }>;
}) {
  const { ownerId, tableNumber } = use(params);
  return (
    <Suspense fallback={<div className="loading-center" style={{ minHeight: '100vh' }}><div className="spinner" /></div>}>
      <LiveTrackingContent ownerId={ownerId} tableNumber={tableNumber} />
    </Suspense>
  );
}
