'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { getAuthHeader } from '@/lib/api';
import { useSocket } from '@/lib/useSocket';
import { ShoppingBag, Printer, CheckCircle, RefreshCw, X, Search } from 'lucide-react';

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
  const [tables, setTables] = useState<TableBilling[]>([]);
  const [loading, setLoading] = useState(true);
  const [owner, setOwner] = useState<{ id?: string; restaurantName?: string } | null>(null);
  const [selectedTable, setSelectedTable] = useState<TableBilling | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'active' | 'unpaid' | 'all' | 'idle'>('active');
  const [searchQuery, setSearchQuery] = useState('');

  // Pre-calculate counts for each filter category
  const activeTablesCount = useMemo(() => tables.filter(t => t.status !== 'idle').length, [tables]);
  const unpaidTablesCount = useMemo(() => tables.filter(t => t.status === 'completed_unpaid').length, [tables]);
  const idleTablesCount = useMemo(() => tables.filter(t => t.status === 'idle').length, [tables]);
  const allTablesCount = tables.length;

  const filteredTables = useMemo(() => {
    let result = tables;
    
    // Apply status filter
    if (filter === 'active') {
      result = tables.filter(t => t.status !== 'idle');
    } else if (filter === 'unpaid') {
      result = tables.filter(t => t.status === 'completed_unpaid');
    } else if (filter === 'idle') {
      result = tables.filter(t => t.status === 'idle');
    }

    // Apply search query filter (by table number)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(t => t.tableNumber.toString().includes(q));
    }

    return result;
  }, [filter, searchQuery, tables]);

  useEffect(() => {
    const stored = localStorage.getItem('owner');
    if (stored) {
      try {
        setOwner(JSON.parse(stored));
      } catch (e) {
        console.error('Error parsing owner details', e);
      }
    }
  }, []);

  const loadBilling = useCallback(async () => {
    try {
      const headers = getAuthHeader();
      const res = await fetch('/api/billing', { headers });
      const data = await res.json();
      if (data.success) {
        setTables(data.data || []);
      }
    } catch (error) {
      console.error('Error loading billing data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Sync with sockets in real-time
  const socketListeners = useMemo(() => ({
    'order:new': () => {
      loadBilling();
    },
    'order:updated': () => {
      loadBilling();
    },
  }), [loadBilling]);

  useSocket(owner?.id || null, socketListeners);

  useEffect(() => {
    loadBilling();
  }, [loadBilling]);

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
        // Refresh billing table
        loadBilling();
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
    loadBilling();
  };

  if (loading) {
    return (
      <div className="loading-center" style={{ minHeight: '60vh' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
        <span>Loading billing tables…</span>
      </div>
    );
  }

  return (
    <>
      {/* Print-only CSS style */}
      <style dangerouslySetInnerHTML={{ __html: `
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

      <div className="page-header" style={{ marginBottom: '1rem', paddingBottom: '0.75rem', gap: '0.75rem' }}>
        <div>
          <span className="page-header-pretitle" style={{ marginBottom: '0.1rem' }}>Settle & Reset</span>
          <h1 style={{ fontSize: '1.5rem', lineHeight: '1.2' }}>Billing & Cash Desk</h1>
          <p style={{ marginTop: '0.15rem', fontSize: '0.8rem' }}>Manage active tables, print receipts, and checkout dining sessions.</p>
        </div>
        <button 
          className="btn btn-ghost btn-sm" 
          onClick={handleRefreshClick} 
          disabled={refreshing}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', height: '34px' }}
        >
          <RefreshCw size={14} className={refreshing ? 'spin-icon' : ''} /> {refreshing ? 'Refreshing...' : 'Refresh'}
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
            gap: '0.5rem',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            width: '100%'
          }}>
            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
              {[
                { id: 'active', name: `Active (${activeTablesCount})` },
                { id: 'unpaid', name: `Needs Settle (${unpaidTablesCount})` },
                { id: 'all', name: `All (${allTablesCount})` },
                { id: 'idle', name: `Idle (${idleTablesCount})` }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => {
                    setFilter(f.id as any);
                    setSearchQuery('');
                  }}
                  style={{
                    padding: '0.2rem 0.6rem',
                    height: '34px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid',
                    borderColor: filter === f.id ? 'var(--accent)' : 'var(--border)',
                    background: filter === f.id ? 'var(--accent-glow)' : 'transparent',
                    color: filter === f.id ? 'var(--accent)' : 'var(--text-secondary)',
                    fontSize: '0.75rem',
                    fontWeight: filter === f.id ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all var(--transition)',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.2rem'
                  }}
                >
                  {f.name}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              minWidth: '130px',
              flex: '1',
              maxWidth: '180px'
            }}>
              <span style={{ position: 'absolute', left: '0.5rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                <Search size={12} />
              </span>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.2rem 0.5rem 0.2rem 1.6rem',
                  height: '34px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '0.75rem',
                  outline: 'none',
                  transition: 'border-color var(--transition)'
                }}
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
                const session = table.session;

                return (
                  <div 
                    key={table.tableId} 
                    className={`card ${isUnpaid ? 'billing-unpaid-card' : ''}`}
                    style={{
                      border: isUnpaid ? '2px solid var(--status-ready)' : '1px solid var(--border)',
                      boxShadow: isUnpaid ? '0 8px 30px rgba(16, 185, 129, 0.08)' : 'var(--shadow-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: isIdle ? 'auto' : '260px',
                      position: 'relative',
                      overflow: 'hidden',
                      borderRadius: 'var(--radius-lg)'
                    }}
                  >
                    {/* Header info */}
                    <div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: isIdle ? 'none' : '1px solid var(--border)',
                        padding: '1.25rem',
                        background: isIdle ? 'transparent' : isUnpaid ? 'rgba(16, 185, 129, 0.04)' : 'rgba(0, 0, 0, 0.01)'
                      }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                          Table {table.tableNumber}
                        </h3>
                        <span 
                          className={`badge ${isIdle ? 'badge-cancelled' : isUnpaid ? 'badge-ready' : 'badge-pending'}`}
                          style={{ 
                            textTransform: 'uppercase', 
                            fontSize: '0.675rem', 
                            fontWeight: 700, 
                            letterSpacing: '0.5px' 
                          }}
                        >
                          {isIdle ? 'Idle' : isUnpaid ? 'Eaten / Settle Bill' : 'Eating / Active'}
                        </span>
                      </div>

                      {/* Body Info */}
                      {!isIdle && session && (
                        <div style={{ padding: '1.25rem' }}>
                          {/* Ordered Items summary */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '110px', overflowY: 'auto', marginBottom: '1rem', paddingRight: '4px' }}>
                            {session.items.map((item, idx) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>
                                  {item.quantity}x {item.menuItemName}
                                </span>
                                <span style={{ fontWeight: 600 }}>
                                  ₹{(item.price * item.quantity).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Timing and Orders count */}
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'flex', gap: '0.85rem' }}>
                            <span>Orders placed: {session.orders.length}</span>
                            <span>Started: {new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer buttons */}
                    {!isIdle && session && (
                      <div style={{
                        borderTop: '1px solid var(--border)',
                        padding: '1.25rem',
                        background: 'rgba(0,0,0,0.01)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Bill</span>
                          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent)' }}>
                            ₹{session.totalAmount.toFixed(2)}
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            className="btn btn-outline btn-sm"
                            style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                            onClick={() => {
                              setSelectedTable(table);
                              setShowReceiptModal(true);
                            }}
                          >
                            <Printer size={14} /> Receipt
                          </button>
                          <button 
                            className="btn btn-primary btn-sm"
                            style={{ flex: 1.5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', background: isUnpaid ? 'var(--status-ready)' : 'var(--accent)', borderColor: isUnpaid ? 'var(--status-ready)' : 'var(--accent)' }}
                            onClick={() => handleReset(table.tableNumber)}
                          >
                            <CheckCircle size={14} /> Pay & Reset
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
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Printer size={18} style={{ color: 'var(--accent)' }} /> Receipt Preview (Table {selectedTable.tableNumber})
              </h3>
              <button 
                className="btn btn-ghost btn-icon" 
                onClick={() => {
                  setShowReceiptModal(false);
                  setSelectedTable(null);
                }}
                aria-label="Close receipt modal"
              >
                <X size={18} />
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
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                  borderRadius: '2px',
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
                        <td style={{ textAlign: 'right', padding: '0.15rem 0' }}>₹{item.price.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', padding: '0.15rem 0' }}>₹{(item.price * item.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ borderTop: '1px dashed #000000', marginTop: '1rem', paddingTop: '1rem' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1rem', color: '#000000' }}>
                  <span>GRAND TOTAL</span>
                  <span>₹{selectedTable.session.totalAmount.toFixed(2)}</span>
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
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button 
                className="btn btn-outline" 
                style={{ flex: 1 }}
                onClick={() => {
                  setShowReceiptModal(false);
                  setSelectedTable(null);
                }}
              >
                Close
              </button>
              <button 
                className="btn btn-secondary" 
                style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                onClick={handlePrint}
              >
                <Printer size={16} /> Print Receipt
              </button>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1.2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
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
