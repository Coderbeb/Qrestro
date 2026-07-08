'use client';
import { useEffect, useState, useRef, useMemo } from 'react';
import { Plus, MoreVertical, Eye, Download, ExternalLink, Copy, RefreshCw, Pause, Play, Trash2, Utensils, QrCode, X, Sparkles } from 'lucide-react';
import { getAuthHeader } from '@/lib/api';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { useSocket } from '@/lib/useSocket';
import { useSWRFetch } from '@/lib/useSWRFetch';

type Table = { id: string; tableNumber: number; qrCodeImageUrl: string | null; qrCodeData: string; isActive: boolean; };
type Order = { id: string; tableNumber: number; status: string; };

import { BrandedQRTent } from '@/components/BrandedQRTent';

export default function TablesPage() {
  const [showAdd, setShowAdd] = useState(false);
  const [newTableNum, setNewTableNum] = useState('');
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [viewQR, setViewQR] = useState<Table | null>(null);
  const [restaurantName, setRestaurantName] = useState('My Restaurant');
  const [brandDownloading, setBrandDownloading] = useState<string | null>(null);
  const [printingTable, setPrintingTable] = useState<Table | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // SWR: fetch tables and orders with instant cache on re-mount
  const { data: tables = [], isLoading: tablesLoading, mutate: mutateTables } = useSWRFetch<Table[]>('/api/tables');
  const { data: orders = [], isLoading: ordersLoading, mutate: mutateOrders } = useSWRFetch<Order[]>('/api/orders?limit=100');
  const loading = tablesLoading || ordersLoading;

  useEffect(() => {
    const stored = localStorage.getItem('owner');
    if (stored) {
      const p = JSON.parse(stored);
      setRestaurantName(p.restaurantName || p.username || 'My Restaurant');
      setOwnerId(p.id || null);
    }
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => { const t = e.target as HTMLElement; if (t.closest('.table-dropdown-menu') || t.closest('.btn-icon')) return; setActiveDropdown(null); };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    if (printingTable) {
      // Allow DOM to render the printable area before triggering print
      const timer = setTimeout(() => {
        window.print();
        setBrandDownloading(null);
        setPrintingTable(null);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [printingTable]);

  // Refresh helper that invalidates SWR cache
  const loadData = () => { mutateTables(); mutateOrders(); };

  // Socket.io: re-fetch orders when any order event arrives
  const socketListeners = useMemo(() => ({
    'order:new': () => {
      mutateOrders();
    },
    'order:updated': () => mutateOrders(),
  }), [mutateOrders]);

  useSocket(ownerId, socketListeners);

  async function handleAdd() {
    if (!newTableNum || parseInt(newTableNum) < 1) { showToast('Enter a valid table number'); return; }
    setAdding(true);
    try {
      const res = await fetch('/api/tables', { method: 'POST', headers: getAuthHeader(), body: JSON.stringify({ tableNumber: parseInt(newTableNum) }) });
      const data = await res.json();
      if (!data.success) { showToast(data.error?.message || 'Error'); return; }
      showToast('Table added with QR code!'); setShowAdd(false); setNewTableNum(''); loadData();
    } finally { setAdding(false); }
  }

  async function handleDelete(id: string, num: number) {
    if (!confirm(`Delete Table ${num}? This cannot be undone.`)) return;
    setDeleting(id);
    try { const res = await fetch(`/api/tables/${id}`, { method: 'DELETE', headers: getAuthHeader() }); const data = await res.json(); if (data.success) { showToast('Table deleted'); loadData(); } }
    finally { setDeleting(null); }
  }

  async function toggleActive(table: Table) { await fetch(`/api/tables/${table.id}`, { method: 'PUT', headers: getAuthHeader(), body: JSON.stringify({ isActive: !table.isActive }) }); loadData(); }

  async function regenerateQR(id: string) {
    setRegenerating(id);
    try { const res = await fetch(`/api/tables/${id}`, { method: 'PUT', headers: getAuthHeader(), body: JSON.stringify({ regenerateQR: true }) }); const data = await res.json(); if (data.success) { showToast('QR regenerated!'); loadData(); } }
    finally { setRegenerating(null); }
  }

  function handleBrandedDownload(table: Table) {
    if (!table.qrCodeImageUrl) return;
    setBrandDownloading(table.id);
    setPrintingTable(table);
  }

  function plainDownload(table: Table) {
    if (!table.qrCodeImageUrl) return;
    const link = document.createElement('a');
    link.href = table.qrCodeImageUrl;
    link.download = `qr-table-${table.tableNumber}.png`;
    link.click();
  }

  function copyLink(table: Table) { navigator.clipboard.writeText(table.qrCodeData); showToast('Link copied!'); }
  function toggleDropdown(e: React.MouseEvent, id: string) { e.stopPropagation(); setActiveDropdown(prev => prev === id ? null : id); }

  const nextNum = tables.length > 0 ? Math.max(...tables.map(t => t.tableNumber)) + 1 : 1;

  return (
    <>
      <div className="page-header">
        <div>
          <span className="page-header-pretitle">Dine-In Management</span>
          <h1>Tables & QR</h1>
          <p>{tables.length} table{tables.length !== 1 ? 's' : ''} configured</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'none' }} className="table-legend">
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--bg-surface)', border: '1px solid var(--border)', display: 'inline-block' }} />Empty</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#f97316', display: 'inline-block' }} />1 Order</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#22c55e', display: 'inline-block' }} />2+ Orders</span>
          </div>
          <button id="add-table-btn" className="btn btn-primary" onClick={() => { setNewTableNum(String(nextNum)); setShowAdd(true); }} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><Plus size={16} /> Add Table</button>
        </div>
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal-box" style={{ maxWidth: 360 }}>
            <div className="modal-header"><h3 className="modal-title">Add New Table</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowAdd(false)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button></div>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">Table Number</label>
              <input type="number" className="input-field" min={1} value={newTableNum} onChange={e => setNewTableNum(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && handleAdd()} />
              <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>A unique QR code will be generated automatically.</small>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
              <button id="confirm-add-table-btn" className="btn btn-primary" onClick={handleAdd} disabled={adding}>{adding ? 'Creating…' : 'Add Table'}</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <DashboardSkeleton type="grid" />
      ) : tables.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon"><QrCode size={40} /></div><h3>No tables configured</h3><p>Add your first table to generate a QR code</p><button className="btn btn-primary" onClick={() => setShowAdd(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><Plus size={16} /> Add Table</button></div>
      ) : (
        <div className="tables-grid">
          {tables.map(table => {
            const activeOrders = orders.filter(o => o.tableNumber === table.tableNumber && o.status !== 'completed' && o.status !== 'cancelled');
            const orderCount = activeOrders.length;
            let cardClass = 'table-card', textColor = 'var(--text-primary)', badgeColor = 'var(--border)', statusText = 'Empty';
            if (orderCount === 1) { cardClass = 'table-card active-1-order'; textColor = '#f97316'; badgeColor = '#f97316'; statusText = '1 Order'; }
            else if (orderCount >= 2) { cardClass = 'table-card active-multiple-orders'; textColor = '#22c55e'; badgeColor = '#22c55e'; statusText = `${orderCount} Orders`; }
            if (!table.isActive) { cardClass = 'table-card inactive'; textColor = 'var(--text-muted)'; badgeColor = 'var(--border)'; statusText = 'Inactive'; }

            return (
              <div key={table.id} className={cardClass} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem 1rem', cursor: 'default' }}>
                <button className="btn btn-ghost btn-sm btn-icon" style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', color: textColor, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => toggleDropdown(e, table.id)}><MoreVertical size={16} /></button>
                {activeDropdown === table.id && (
                  <div className="table-dropdown-menu">
                    <button className="dropdown-item" onClick={() => { setViewQR(table); setActiveDropdown(null); }}><Eye size={14} /> View QR Code</button>
                    <button className="dropdown-item" onClick={() => { handleBrandedDownload(table); setActiveDropdown(null); }} disabled={brandDownloading === table.id}><Sparkles size={14} /> {brandDownloading === table.id ? 'Preparing...' : 'Print Branded QR'}</button>
                    <button className="dropdown-item" onClick={() => { plainDownload(table); setActiveDropdown(null); }}><Download size={14} /> Download Plain QR</button>
                    <button className="dropdown-item" onClick={() => { copyLink(table); setActiveDropdown(null); }}><Copy size={14} /> Copy Link</button>
                    <div style={{ height: 1, background: 'var(--border)', margin: '0.25rem 0' }} />
                    <button className="dropdown-item" onClick={() => { toggleActive(table); setActiveDropdown(null); }}>{table.isActive ? <><Pause size={14} /> Deactivate</> : <><Play size={14} /> Activate</>}</button>
                    <button className="dropdown-item text-danger" onClick={() => { handleDelete(table.id, table.tableNumber); setActiveDropdown(null); }} disabled={deleting === table.id}><Trash2 size={14} /> Delete</button>
                  </div>
                )}

                <div style={{ marginBottom: '0.75rem', opacity: table.isActive ? 1 : 0.4, color: textColor }}><Utensils size={36} style={{ strokeWidth: 1.5 }} /></div>
                <div className="table-card-number" style={{ color: textColor, margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Table {table.tableNumber}</div>
                <div style={{ marginTop: '0.5rem', padding: '0.25rem 0.75rem', background: table.isActive && orderCount > 0 ? badgeColor : 'transparent', color: table.isActive && orderCount > 0 ? '#fff' : textColor, borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600, border: !(table.isActive && orderCount > 0) ? `1px solid ${badgeColor}` : 'none' }}>
                  {statusText}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View QR Modal — with branded download */}
      {viewQR && (
        <div className="modal-overlay" onClick={() => setViewQR(null)}>
          <div className="modal-box" style={{ maxWidth: 380, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <h3 className="modal-title">Table {viewQR.tableNumber} QR</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setViewQR(null)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
            </div>
            <div style={{ padding: '1.25rem 2rem' }}>
              {viewQR.qrCodeImageUrl && (
                <div style={{ background: '#fff', borderRadius: 16, padding: 16, display: 'inline-block', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
                  <img src={viewQR.qrCodeImageUrl} alt="QR Code" style={{ width: 200, height: 200, display: 'block' }} />
                </div>
              )}
              <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>{restaurantName} · Table {viewQR.tableNumber}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: '0 1.5rem 1.5rem' }}>
              <button className="btn btn-primary btn-full" onClick={() => handleBrandedDownload(viewQR)} disabled={brandDownloading === viewQR.id} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                <Sparkles size={16} /> {brandDownloading === viewQR.id ? 'Preparing...' : 'Print Branded QR'}
              </button>
              <button className="btn btn-ghost btn-full" onClick={() => plainDownload(viewQR)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}><Download size={16} /> Download Plain PNG</button>
            </div>
          </div>
        </div>
      )}

      {/* Render the printable component when triggered */}
      {printingTable && (
        <BrandedQRTent 
          restaurantName={restaurantName} 
          tableNumber={printingTable.tableNumber} 
          qrCodeUrl={printingTable.qrCodeImageUrl || ''} 
        />
      )}

      {toast && <div className="toast-container"><div className="toast toast-success">{toast}</div></div>}
    </>
  );
}
