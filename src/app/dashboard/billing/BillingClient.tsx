'use client';
import { useEffect, useState, useMemo } from 'react';
import { getAuthHeader } from '@/lib/api';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { useSocket } from '@/lib/useSocket';
import { ShoppingBag, Printer, CheckCircle, RefreshCw, X, Search, Clock, Utensils, IndianRupee, Receipt } from 'lucide-react';
import { useSWRFetch, invalidateCache, getAdaptiveInterval } from '@/lib/useSWRFetch';

type BillingSession = {
  orders: { id: string; status: string; totalAmount: number; createdAt: string }[];
  items: { menuItemName: string; quantity: number; price: number }[];
  totalAmount: number;
  createdAt: string;
};

type TableBilling = {
  tableId: string;
  tableNumber: number;
  status: 'idle' | 'active' | 'completed_unpaid';
  session: BillingSession | null;
};

export default function BillingPage() {
  const refreshInterval = getAdaptiveInterval(5000);
  const { data: tables = [], isLoading: loading, mutate } = useSWRFetch<TableBilling[]>('/api/billing', { refreshInterval });
  const [owner, setOwner] = useState<{ id?: string; restaurantName?: string } | null>(null);
  const [selectedTable, setSelectedTable] = useState<TableBilling | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'active' | 'unpaid' | 'all' | 'idle'>('active');
  const [searchQuery, setSearchQuery] = useState('');

  // Pre-calculate counts for each filter category
  const activeTablesCount = useMemo(() => (tables ?? []).filter(t => t.status !== 'idle').length, [tables]);
  const unpaidTablesCount = useMemo(() => (tables ?? []).filter(t => t.status === 'completed_unpaid').length, [tables]);
  const idleTablesCount = useMemo(() => (tables ?? []).filter(t => t.status === 'idle').length, [tables]);
  const allTablesCount = (tables ?? []).length;

  const filteredTables = useMemo(() => {
    let result = tables ?? [];
    
    // Apply status filter
    if (filter === 'active') {
      result = result.filter(t => t.status !== 'idle');
    } else if (filter === 'unpaid') {
      result = result.filter(t => t.status === 'completed_unpaid');
    } else if (filter === 'idle') {
      result = result.filter(t => t.status === 'idle');
    }

    // Apply search query filter (by table number)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(t => t.tableNumber.toString().includes(q));
    }

    return result;
  }, [filter, searchQuery, tables]);

  useEffect(() => {
    const storedOwner = localStorage.getItem('owner');
    const storedStaff = localStorage.getItem('staffRestaurant');
    if (storedOwner) {
      try {
        setOwner(JSON.parse(storedOwner));
      } catch (e) {
        console.error('Error parsing owner details', e);
      }
    } else if (storedStaff) {
      try {
        setOwner(JSON.parse(storedStaff));
      } catch (e) {
        console.error('Error parsing staff details', e);
      }
    }
  }, []);

  // Sync with sockets in real-time — invalidate SWR cache
  const socketListeners = useMemo(() => ({
    'order:new': () => {
      invalidateCache('/api/billing');
    },
    'order:updated': () => {
      invalidateCache('/api/billing');
    },
  }), []);

  useSocket(owner?.id || null, socketListeners);

  async function handleReset(tableNumber: number) {
    if (!confirm(`Are you sure you want to mark Table ${tableNumber} as Paid and reset it for the next customer?`)) {
      return;
    }
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
        // Refresh billing table via SWR
        mutate();
        // Hide receipt modal if it was open
        setShowReceiptModal(false);
        setSelectedTable(null);
      } else {
        alert(data.error?.message || 'Failed to reset table');
      }
    } catch {
      alert('Error resetting table. Please try again.');
    }
  }

  function handlePrint() {
    // Print window just for the receipt
    window.print();
  }

  const handleRefreshClick = () => {
    setRefreshing(true);
    mutate().then(() => setRefreshing(false));
  };

  if (loading) {
    return <DashboardSkeleton type="table" />;
  }

  return (
    <>
      {/* Print-only CSS style */}
      <style dangerouslySetInnerHTML={{ __html: `
        .spin-icon { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        
        .pulse-purple { animation: pulsePurple 2s infinite; }
        @keyframes pulsePurple {
          0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(99, 102, 241, 0); }
          100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
        }

        .pulse-orange { animation: pulseOrange 2s infinite; }
        @keyframes pulseOrange {
          0% { box-shadow: 0 0 0 0 rgba(234, 88, 12, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(234, 88, 12, 0); }
          100% { box-shadow: 0 0 0 0 rgba(234, 88, 12, 0); }
        }

        @media print {
          /* Hide entire main page content during printing */
          body * {
            visibility: hidden !important;
          }
          /* Show only the print receipt container and its children */
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
      ` }} />

      <div className="page-header" style={{ marginBottom: '1.5rem', paddingBottom: '1rem', gap: '1rem', borderBottom: '1px solid var(--border)' }}>
        <div>
          <span className="page-header-pretitle" style={{ marginBottom: '0.2rem', color: 'var(--accent)', fontWeight: 700, letterSpacing: '1px' }}>SETTLE & RESET</span>
          <h1 style={{ fontSize: '1.8rem', lineHeight: '1.2', fontWeight: 800 }}>Billing & Cash Desk</h1>
          <p style={{ marginTop: '0.25rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Manage active tables, print receipts, and checkout dining sessions.</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={handleRefreshClick} 
          disabled={refreshing}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', height: '40px', padding: '0 1.25rem', borderRadius: '99px', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)' }}
        >
          <RefreshCw size={16} className={refreshing ? 'spin-icon' : ''} /> {refreshing ? 'Refreshing...' : 'Live Sync'}
        </button>
      </div>

      {tables.length === 0 ? (
        <div className="empty-state" style={{ minHeight: '40vh' }}>
          <div className="empty-state-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShoppingBag size={40} style={{ strokeWidth: 1.5 }} />
          </div>
          <h3>No tables found</h3>
          <p>Please make sure you have added tables in the "Tables & QR" panel.</p>
        </div>
      ) : (
        <>
          {/* Filters & Search Control Row */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            width: '100%',
            background: 'var(--bg-surface)',
            padding: '0.75rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {[
                { id: 'active', name: `Active (${activeTablesCount})`, color: 'var(--status-pending)' },
                { id: 'unpaid', name: `Needs Settle (${unpaidTablesCount})`, color: '#6366f1' },
                { id: 'all', name: `All (${allTablesCount})`, color: 'var(--text-secondary)' },
                { id: 'idle', name: `Idle (${idleTablesCount})`, color: 'var(--text-muted)' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => {
                    setFilter(f.id as any);
                    setSearchQuery('');
                  }}
                  style={{
                    padding: '0.4rem 1rem',
                    height: '38px',
                    borderRadius: '99px',
                    border: 'none',
                    background: filter === f.id ? (f.id === 'unpaid' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'var(--text-primary)') : 'transparent',
                    color: filter === f.id ? '#fff' : 'var(--text-secondary)',
                    fontSize: '0.8rem',
                    fontWeight: filter === f.id ? 700 : 600,
                    cursor: 'pointer',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    boxShadow: filter === f.id ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
                  }}
                  onMouseEnter={(e) => { if (filter !== f.id) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { if (filter !== f.id) e.currentTarget.style.background = 'transparent'; }}
                >
                  {filter === f.id && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', boxShadow: '0 0 8px rgba(255,255,255,0.8)' }} />}
                  {f.name}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              minWidth: '200px',
              flex: '1',
              maxWidth: '280px'
            }}>
              <span style={{ position: 'absolute', left: '1rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                <Search size={14} />
              </span>
              <input
                type="text"
                placeholder="Search table number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.4rem 1rem 0.4rem 2.2rem',
                  height: '38px',
                  borderRadius: '99px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-body)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-glow)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.02)'; }}
              />
            </div>
          </div>

          {filteredTables.length === 0 ? (
            <div className="empty-state" style={{ minHeight: '30vh' }}>
              <div className="empty-state-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShoppingBag size={40} style={{ strokeWidth: 1.5 }} />
              </div>
              <h3>No tables match the selection</h3>
              <p>
                {searchQuery
                  ? `No tables matching "${searchQuery}" were found.`
                  : filter === 'unpaid'
                  ? 'No tables require billing settlement right now.'
                  : filter === 'active'
                  ? 'No tables are currently active.'
                  : 'No tables found.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-3" style={{ gap: '1.5rem', marginTop: '1rem' }}>
              {filteredTables.map(table => {
                const isIdle = table.status === 'idle';
                const isUnpaid = table.status === 'completed_unpaid';
                const isActive = table.status === 'active';
                const session = table.session;

                return (
                  <div 
                    key={table.tableId} 
                    className="card table-billing-card"
                    style={{
                      border: isUnpaid ? '2px solid #6366f1' : isActive ? '1px solid var(--status-pending)' : '1px solid var(--border)',
                      boxShadow: isUnpaid ? '0 12px 40px rgba(99, 102, 241, 0.15)' : 'var(--shadow-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: isIdle ? '120px' : '280px',
                      position: 'relative',
                      overflow: 'hidden',
                      borderRadius: 'var(--radius-lg)',
                      transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                      transform: 'translateY(0)',
                      cursor: isIdle ? 'default' : 'pointer'
                    }}
                    onMouseEnter={(e) => { if (!isIdle) { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = isUnpaid ? '0 16px 50px rgba(99, 102, 241, 0.25)' : 'var(--shadow-md)'; } }}
                    onMouseLeave={(e) => { if (!isIdle) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = isUnpaid ? '0 12px 40px rgba(99, 102, 241, 0.15)' : 'var(--shadow-sm)'; } }}
                    onClick={() => { if (!isIdle && session) { setSelectedTable(table); setShowReceiptModal(true); } }}
                  >
                    {/* Pulsing indicator for active/unpaid */}
                    {!isIdle && (
                       <div style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                         <span className={isUnpaid ? 'pulse-purple' : 'pulse-orange'} style={{ width: 8, height: 8, borderRadius: '50%', background: isUnpaid ? '#6366f1' : 'var(--status-pending)', boxShadow: `0 0 8px ${isUnpaid ? '#6366f1' : 'var(--status-pending)'}` }}></span>
                       </div>
                    )}

                    {/* Header info */}
                    <div>
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        borderBottom: isIdle ? 'none' : '1px solid var(--border)',
                        padding: '1.5rem 1.25rem',
                        background: isIdle ? 'transparent' : isUnpaid ? 'linear-gradient(to right, rgba(99, 102, 241, 0.05), transparent)' : 'linear-gradient(to right, rgba(234, 88, 12, 0.05), transparent)'
                      }}>
                        <span 
                          className={`badge ${isIdle ? 'badge-cancelled' : isUnpaid ? 'badge-ready' : 'badge-pending'}`}
                          style={{ 
                            textTransform: 'uppercase', 
                            fontSize: '0.65rem', 
                            fontWeight: 800, 
                            letterSpacing: '0.8px',
                            marginBottom: '0.5rem',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '99px'
                          }}
                        >
                          {isIdle ? 'Idle' : isUnpaid ? 'Needs Settle' : 'Ordering / Eating'}
                        </span>
                        <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>Table</span> {table.tableNumber}
                        </h3>
                      </div>

                      {/* Body Info */}
                      {!isIdle && session && (
                        <div style={{ padding: '1.25rem' }}>
                          {/* Timing and Orders count */}
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><ShoppingBag size={12} /> {session.orders.length} order{session.orders.length !== 1 ? 's' : ''}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Clock size={12} /> {new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>

                          {/* Ordered Items summary */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '100px', overflowY: 'auto', paddingRight: '4px' }}>
                            {session.items.map((item, idx) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>
                                  <strong style={{ color: 'var(--text-primary)' }}>{item.quantity}</strong><span style={{ margin: '0 4px', color: 'var(--text-muted)' }}>×</span>{item.menuItemName}
                                </span>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                  ₹{(item.price * item.quantity).toFixed(0)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer buttons */}
                    {!isIdle && session && (
                      <div style={{
                        borderTop: '1px solid var(--border)',
                        padding: '1.25rem',
                        background: 'var(--bg-surface)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        marginTop: 'auto'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Bill</span>
                          <span style={{ fontSize: '1.5rem', fontWeight: 800, color: isUnpaid ? '#6366f1' : 'var(--text-primary)', lineHeight: 1 }}>
                            ₹{session.totalAmount.toFixed(0)}
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
                          <button 
                            className="btn btn-outline"
                            style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', height: '40px', fontWeight: 700 }}
                            onClick={() => {
                              setSelectedTable(table);
                              setShowReceiptModal(true);
                            }}
                          >
                            <Printer size={14} /> Receipt
                          </button>
                          <button 
                            className="btn btn-primary"
                            style={{ flex: 1.5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', height: '40px', fontWeight: 700, background: isUnpaid ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'var(--text-primary)', border: 'none', boxShadow: isUnpaid ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none' }}
                            onClick={() => handleReset(table.tableNumber)}
                          >
                            <CheckCircle size={14} /> {isUnpaid ? 'Settle & Reset' : 'Force Reset'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Printable Receipt Mockup Modal */}
      {showReceiptModal && selectedTable && selectedTable.session && (
        <div className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal-box" style={{ maxWidth: '420px', padding: '1.5rem' }}>
            <div className="modal-header" style={{ paddingBottom: '1.25rem', borderBottom: '1px solid var(--border)', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Printer size={22} style={{ color: 'var(--accent)' }} /> Receipt Preview
                </h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem', fontWeight: 600 }}>
                  Table {selectedTable.tableNumber} Checkout
                </div>
              </div>
              <button 
                className="btn btn-ghost btn-icon" 
                onClick={() => {
                  setShowReceiptModal(false);
                  setSelectedTable(null);
                }}
                aria-label="Close receipt modal"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', width: '36px', height: '36px', borderRadius: '50%' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Thermal Printer style receipt card */}
            <div style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0' }}>
              <div 
                id="print-receipt-section"
                style={{
                  width: '100%',
                  background: '#ffffff',
                  color: '#000000',
                  padding: '2rem 1.5rem',
                  fontFamily: 'Courier New, Courier, monospace',
                  border: '1px dashed #cccccc',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
                  borderRadius: '4px',
                }}
              >
                <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 'bold', margin: '0 0 0.25rem 0', textTransform: 'uppercase', color: '#000000' }}>
                    {owner?.restaurantName || 'QRESTRO'}
                  </h2>
                  <div style={{ fontSize: '0.85rem', color: '#333333' }}>TABLE BILL RECEIPT</div>
                  <div style={{ fontSize: '0.85rem', color: '#333333', marginTop: '0.2rem' }}>TABLE: {selectedTable.tableNumber}</div>
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
                    {selectedTable.session.items.map((item, idx) => (
                      <tr key={idx} style={{ height: '24px' }}>
                        <td style={{ textAlign: 'left', padding: '0.15rem 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                          {item.menuItemName}
                        </td>
                        <td style={{ textAlign: 'center', padding: '0.15rem 0' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right', padding: '0.15rem 0' }}>₹{item.price.toFixed(0)}</td>
                        <td style={{ textAlign: 'right', padding: '0.15rem 0' }}>₹{(item.price * item.quantity).toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ borderTop: '1px dashed #000000', marginTop: '1rem', paddingTop: '1rem' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1rem', color: '#000000' }}>
                  <span>GRAND TOTAL</span>
                  <span>₹{selectedTable.session.totalAmount.toFixed(0)}</span>
                </div>

                <div style={{ borderTop: '1px dashed #000000', margin: '1rem 0' }} />

                <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#333333', lineHeight: '1.4' }}>
                  <p style={{ margin: '0 0 0.35rem 0', fontWeight: 'bold', textTransform: 'uppercase' }}>CASH PAYMENT ONLY</p>
                  <p style={{ margin: 0 }}>Received with thanks.</p>
                  <p style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>Thank you! Please visit again. 🙏</p>
                </div>
              </div>
            </div>

            {/* Modal Controls */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
              <button 
                className="btn btn-outline" 
                style={{ flex: 1, height: '44px', fontWeight: 700, borderRadius: '99px' }}
                onClick={() => {
                  setShowReceiptModal(false);
                  setSelectedTable(null);
                }}
              >
                Close
              </button>
              <button 
                className="btn btn-secondary" 
                style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', height: '44px', fontWeight: 700, borderRadius: '99px', background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-sm)' }}
                onClick={handlePrint}
              >
                <Printer size={16} /> Print
              </button>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1.5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', height: '44px', fontWeight: 700, borderRadius: '99px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
                onClick={() => handleReset(selectedTable.tableNumber)}
              >
                <CheckCircle size={16} /> Mark Paid
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
