'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  CreditCard, CheckCircle, Clock, Receipt, Printer, IndianRupee,
  X, Utensils, RefreshCw, Search,
} from 'lucide-react';
import { useSocket } from '@/lib/useSocket';
import { playNotificationSound } from '@/lib/audio';

type BillingTable = {
  tableId: string;
  tableNumber: number;
  status: 'idle' | 'active' | 'completed_unpaid';
  session: {
    orders: { id: string; status: string; totalAmount: number; createdAt: string }[];
    items: { menuItemName: string; quantity: number; price: number }[];
    totalAmount: number;
    createdAt: string;
  } | null;
};

function getStaffHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('staffToken') : '';
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

function minutesAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
}

/* ─── Skeleton Components ──────────────────────────────────── */
function SkeletonSummaryCards() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton skeleton-text" style={{ width: '70%', height: 20, marginBottom: '0.3rem' }} />
            <div className="skeleton skeleton-text" style={{ width: '50%', height: 12 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonTableGrid() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="card" style={{ padding: '1.1rem', textAlign: 'center' }}>
          <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', margin: '0 auto 0.5rem' }} />
          <div className="skeleton skeleton-text" style={{ width: '50%', height: 16, margin: '0 auto 0.3rem' }} />
          <div className="skeleton skeleton-text" style={{ width: '65%', height: 12, margin: '0 auto', borderRadius: '999px' }} />
        </div>
      ))}
    </div>
  );
}

/* ─── Main Component ───────────────────────────────────────── */
export default function CashierDashboard() {
  const [tables, setTables] = useState<BillingTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] = useState<{ id: string; name: string } | null>(null);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [settling, setSettling] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast(msg); setToastType(type); setTimeout(() => setToast(''), 3500);
  };

  useEffect(() => {
    const restStr = localStorage.getItem('staffRestaurant');
    if (restStr) setRestaurant(JSON.parse(restStr));
  }, []);

  // Use session-aware billing API (fixes session leak bug)
  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/billing', { headers: getStaffHeaders() });
      const data = await res.json();
      if (data.success) setTables(data.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const socketListeners = useMemo(() => ({
    'order:new': () => { loadData(); playNotificationSound(); },
    'order:updated': () => loadData(),
    'table:reset': () => loadData(),
  }), [loadData]);

  useSocket(restaurant?.id || null, socketListeners);

  // Summary stats
  const summaryStats = useMemo(() => {
    const idle = tables.filter(t => t.status === 'idle').length;
    const active = tables.filter(t => t.status === 'active').length;
    const readyToBill = tables.filter(t => t.status === 'completed_unpaid').length;
    const totalPending = tables
      .filter(t => t.session)
      .reduce((sum, t) => sum + (t.session?.totalAmount || 0), 0);
    return { idle, active, readyToBill, totalPending };
  }, [tables]);

  // Filter tables
  const filteredTables = useMemo(() => {
    if (!searchQuery.trim()) return tables;
    const q = searchQuery.trim();
    return tables.filter(t => t.tableNumber.toString().includes(q));
  }, [tables, searchQuery]);

  // Group tables by status for display
  const readyToBillTables = filteredTables.filter(t => t.status === 'completed_unpaid');
  const activeTables = filteredTables.filter(t => t.status === 'active');
  const idleTables = filteredTables.filter(t => t.status === 'idle');

  // Selected table data
  const selectedTableData = selectedTable ? tables.find(t => t.tableNumber === selectedTable) : null;

  // Status colors
  function getStatusStyle(status: string): { color: string; bg: string; label: string } {
    switch (status) {
      case 'idle': return { color: 'var(--status-ready)', bg: 'rgba(5, 150, 105, 0.08)', label: 'Idle' };
      case 'active': return { color: 'var(--status-pending)', bg: 'rgba(234, 88, 12, 0.08)', label: 'Active' };
      case 'completed_unpaid': return { color: '#6366f1', bg: 'rgba(99, 102, 241, 0.08)', label: 'Ready to Bill' };
      default: return { color: 'var(--text-muted)', bg: 'var(--bg-hover)', label: status };
    }
  }

  // Settle bill using session-aware billing API
  async function settleTable() {
    if (!selectedTable) return;
    setSettling(true);
    try {
      const res = await fetch('/api/billing', {
        method: 'PUT',
        headers: getStaffHeaders(),
        body: JSON.stringify({ tableNumber: selectedTable }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Table ${selectedTable} settled — ₹${selectedTableData?.session?.totalAmount?.toFixed(0) || '0'}`);
        setSelectedTable(null);
        loadData();
      } else {
        showToast(data.error?.message || 'Failed to settle', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setSettling(false);
    }
  }

  function printReceipt() {
    if (!selectedTableData?.session) return;
    const receiptWindow = window.open('', '_blank', 'width=320,height=600');
    if (!receiptWindow) return;

    const items = selectedTableData.session.items;
    const total = selectedTableData.session.totalAmount;

    receiptWindow.document.write(`
      <html><head><title>Receipt - Table ${selectedTable}</title>
      <style>
        body { font-family: monospace; font-size: 12px; max-width: 280px; margin: 0 auto; padding: 16px; }
        hr { border: none; border-top: 1px dashed #333; margin: 8px 0; }
        .center { text-align: center; }
        .right { text-align: right; }
        .bold { font-weight: bold; }
        .row { display: flex; justify-content: space-between; }
        .big { font-size: 16px; }
      </style></head><body>
        <div class="center bold big">${restaurant?.name || 'QRestro'}</div>
        <div class="center">Table ${selectedTable}</div>
        <div class="center" style="font-size:10px;color:#666">${new Date().toLocaleString('en-IN')}</div>
        <hr/>
        ${items.map(i => `<div class="row"><span>${i.quantity}× ${i.menuItemName}</span><span>₹${(Number(i.price) * i.quantity).toFixed(0)}</span></div>`).join('')}
        <hr/>
        <div class="row bold big"><span>TOTAL</span><span>₹${total.toFixed(0)}</span></div>
        <hr/>
        <div class="center" style="margin-top:12px;font-size:10px;color:#666">Thank you for dining with us!</div>
        <div class="center" style="font-size:10px;color:#999">Powered by QRestro</div>
        <script>window.print();setTimeout(()=>window.close(),1000);</script>
      </body></html>
    `);
  }

  /* ─── Table Card Component ─── */
  function TableCard({ table }: { table: BillingTable }) {
    const style = getStatusStyle(table.status);
    const isBillable = table.status === 'completed_unpaid';
    const isActive = table.status === 'active';
    const hasSession = table.session !== null;

    return (
      <div
        className="card"
        style={{
          padding: '1.1rem', textAlign: 'center', cursor: isBillable ? 'pointer' : 'default',
          borderColor: isBillable ? '#6366f1' : isActive ? 'var(--status-pending)' : 'var(--border)',
          transition: 'all var(--transition)',
          opacity: table.status === 'idle' ? 0.6 : 1,
        }}
        onClick={() => {
          if (isBillable) setSelectedTable(table.tableNumber);
        }}
      >
        <div style={{
          width: 40, height: 40, borderRadius: 'var(--radius-sm)',
          background: style.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 0.5rem', color: style.color, fontWeight: 700, fontSize: '1rem',
        }}>
          {table.tableNumber}
        </div>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
          Table {table.tableNumber}
        </div>
        <span style={{
          display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: '999px',
          fontSize: '0.68rem', fontWeight: 600, background: style.bg, color: style.color,
        }}>
          {style.label}
        </span>

        {hasSession && (
          <div style={{ marginTop: '0.4rem' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent)' }}>
              ₹{table.session!.totalAmount.toFixed(0)}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              {table.session!.orders.length} order{table.session!.orders.length !== 1 ? 's' : ''}
              {' · '}{minutesAgo(table.session!.createdAt)}m
            </div>
          </div>
        )}

        {isBillable && (
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedTable(table.tableNumber); }}
            style={{
              marginTop: '0.5rem', width: '100%', padding: '0.45rem',
              borderRadius: 'var(--radius-sm)', border: '1px solid #6366f1',
              background: 'rgba(99, 102, 241, 0.08)', color: '#6366f1',
              fontWeight: 600, fontSize: '0.72rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
            }}
          >
            <Receipt size={12} /> Settle
          </button>
        )}
      </div>
    );
  }

  /* ─── Render ─── */
  return (
    <>
      {/* Summary Cards */}
      {loading ? (
        <SkeletonSummaryCards />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 'var(--radius-sm)',
              background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#10b981',
            }}>
              <IndianRupee size={18} />
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                ₹{summaryStats.totalPending.toFixed(0)}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>Pending Total</div>
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 'var(--radius-sm)',
              background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#6366f1',
            }}>
              <Receipt size={18} />
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                {summaryStats.readyToBill}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>Ready to Bill</div>
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 'var(--radius-sm)',
              background: 'var(--status-pending-bg, rgba(234, 88, 12, 0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--status-pending)',
            }}>
              <Clock size={18} />
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                {summaryStats.active}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>Active Tables</div>
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 'var(--radius-sm)',
              background: 'rgba(5, 150, 105, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--status-ready)',
            }}>
              <Utensils size={18} />
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                {summaryStats.idle}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>Idle Tables</div>
            </div>
          </div>
        </div>
      )}

      {/* Header + Search */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '0.15rem' }}>All Tables</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
            {tables.length} total · Tap a billable table to settle
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

      {/* Search */}
      {!loading && tables.length > 10 && (
        <div style={{ position: 'relative', marginBottom: '1rem' }}>
          <Search size={16} style={{
            position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)', pointerEvents: 'none',
          }} />
          <input
            type="text"
            className="input-field"
            placeholder="Search table number..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value.replace(/\D/g, ''))}
            inputMode="numeric"
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>
      )}

      {loading ? (
        <SkeletonTableGrid />
      ) : (
        <>
          {/* Ready to Bill section */}
          {readyToBillTables.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{
                fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                color: '#6366f1', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.35rem',
              }}>
                <Receipt size={14} /> Ready to Bill ({readyToBillTables.length})
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
                {readyToBillTables.sort((a, b) => a.tableNumber - b.tableNumber).map(t => (
                  <TableCard key={t.tableId} table={t} />
                ))}
              </div>
            </div>
          )}

          {/* Active Tables section */}
          {activeTables.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{
                fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                color: 'var(--status-pending)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.35rem',
              }}>
                <Clock size={14} /> Active ({activeTables.length})
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
                {activeTables.sort((a, b) => a.tableNumber - b.tableNumber).map(t => (
                  <TableCard key={t.tableId} table={t} />
                ))}
              </div>
            </div>
          )}

          {/* Idle Tables section */}
          {idleTables.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{
                fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                color: 'var(--text-muted)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.35rem',
              }}>
                <Utensils size={14} /> Idle ({idleTables.length})
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
                {idleTables.sort((a, b) => a.tableNumber - b.tableNumber).map(t => (
                  <TableCard key={t.tableId} table={t} />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {filteredTables.length === 0 && (
            <div className="empty-state" style={{ padding: '3rem 1.5rem' }}>
              <div className="empty-state-icon"><CreditCard size={36} /></div>
              <h3>{searchQuery ? 'No matching tables' : 'No tables found'}</h3>
              <p>{searchQuery ? `No table with number "${searchQuery}"` : 'No tables are set up yet'}</p>
            </div>
          )}
        </>
      )}

      {/* ─── Bill Detail Modal ─── */}
      {selectedTable && selectedTableData?.session && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelectedTable(null)}>
          <div className="modal-box animate-fade-in" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CreditCard size={20} style={{ color: 'var(--accent)' }} />
                Table {selectedTable} Bill
              </h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelectedTable(null)}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} />
              </button>
            </div>

            {/* Order status summary */}
            <div style={{
              display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem',
            }}>
              {selectedTableData.session.orders.map((o, i) => (
                <span key={i} className={`badge badge-${o.status}`} style={{ fontSize: '0.68rem' }}>
                  Order {i + 1}: {o.status} (₹{o.totalAmount.toFixed(0)})
                </span>
              ))}
            </div>

            {/* Items */}
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
              {selectedTableData.session.items.map((item, idx) => (
                <div key={idx} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.5rem 0', borderBottom: idx < selectedTableData.session!.items.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.quantity}×</span>{' '}
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{item.menuItemName}</span>
                  </div>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    ₹{(Number(item.price) * item.quantity).toFixed(0)}
                  </span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
              background: 'var(--accent-glow)', marginBottom: '1rem',
            }}>
              <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Total</span>
              <span style={{ fontWeight: 700, fontSize: '1.35rem', color: 'var(--accent)' }}>
                ₹{selectedTableData.session.totalAmount.toFixed(0)}
              </span>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                className="btn btn-ghost"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                onClick={printReceipt}
              >
                <Printer size={16} /> Print
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                onClick={settleTable}
                disabled={settling}
              >
                <CheckCircle size={16} /> {settling ? 'Settling…' : 'Settle Bill'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toastType}`}>{toast}</div>
        </div>
      )}
    </>
  );
}
