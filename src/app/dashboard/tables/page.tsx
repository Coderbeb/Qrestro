'use client';
import { useEffect, useState, useCallback, useRef } from 'react';

type Table = {
  id: string;
  tableNumber: number;
  qrCodeImageUrl: string | null;
  qrCodeData: string;
  isActive: boolean;
};

type Order = {
  id: string;
  tableNumber: number;
  status: string;
};

function getAuthHeader() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export default function TablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newTableNum, setNewTableNum] = useState('');
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [viewQR, setViewQR] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.table-dropdown-menu') || target.closest('.btn-icon')) {
        return;
      }
      setActiveDropdown(null);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const headers = getAuthHeader();
      const [tablesRes, ordersRes] = await Promise.all([
        fetch('/api/tables', { headers }),
        fetch('/api/orders?limit=100', { headers })
      ]);
      const tablesData = await tablesRes.json();
      const ordersData = await ordersRes.json();
      
      if (tablesData.success) setTables(tablesData.data);
      if (ordersData.success) setOrders(ordersData.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadData();
    intervalRef.current = setInterval(loadData, 5000); // Live poll every 5s
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [loadData]);

  async function handleAdd() {
    if (!newTableNum || parseInt(newTableNum) < 1) { showToast('Enter a valid table number'); return; }
    setAdding(true);
    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({ tableNumber: parseInt(newTableNum) }),
      });
      const data = await res.json();
      if (!data.success) { showToast(data.error?.message || 'Error'); return; }
      showToast('Table added with QR code!');
      setShowAdd(false);
      setNewTableNum('');
      loadData();
    } finally { setAdding(false); }
  }

  async function handleDelete(id: string, num: number) {
    if (!confirm(`Delete Table ${num}? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/tables/${id}`, { method: 'DELETE', headers: getAuthHeader() });
      const data = await res.json();
      if (data.success) { showToast('Table deleted'); loadData(); }
    } finally { setDeleting(null); }
  }

  async function toggleActive(table: Table) {
    await fetch(`/api/tables/${table.id}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify({ isActive: !table.isActive }),
    });
    loadData();
  }

  async function regenerateQR(id: string) {
    setRegenerating(id);
    try {
      const res = await fetch(`/api/tables/${id}`, {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify({ regenerateQR: true }),
      });
      const data = await res.json();
      if (data.success) { showToast('QR code regenerated!'); loadData(); }
    } finally { setRegenerating(null); }
  }

  function downloadQR(table: Table) {
    if (!table.qrCodeImageUrl) return;
    const link = document.createElement('a');
    link.href = table.qrCodeImageUrl;
    link.download = `qr-table-${table.tableNumber}.png`;
    link.click();
  }

  function copyLink(table: Table) {
    if (!table.qrCodeData) return;
    navigator.clipboard.writeText(table.qrCodeData);
    showToast('Link copied to clipboard!');
  }

  function toggleDropdown(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setActiveDropdown(prev => prev === id ? null : id);
  }


// Compute suggested next table number
const nextNum = tables.length > 0 ? Math.max(...tables.map(t => t.tableNumber)) + 1 : 1;

return (
  <>
    <div className="page-header">
      <div>
        <h1>Table Floorplan</h1>
        <p>{tables.length} table{tables.length !== 1 ? 's' : ''} configured</p>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        {/* Floorplan Legend */}
        <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem', marginRight: '1rem', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--bg-surface)', border: '1px solid var(--border)' }}></span> Empty</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><span style={{ width: 12, height: 12, borderRadius: 3, background: '#f97316' }}></span> 1 Order</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><span style={{ width: 12, height: 12, borderRadius: 3, background: '#22c55e' }}></span> 2+ Orders</div>
        </div>
        <button id="add-table-btn" className="btn btn-primary" onClick={() => { setNewTableNum(String(nextNum)); setShowAdd(true); }}>
          + Add Table
        </button>
      </div>
    </div>

    {/* Add modal */}
    {showAdd && (
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
        <div className="modal-box" style={{ maxWidth: 360 }}>
          <div className="modal-header">
            <h3 className="modal-title">Add New Table</h3>
            <button className="btn btn-ghost btn-icon" onClick={() => setShowAdd(false)}>✕</button>
          </div>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Table Number</label>
            <input
              type="number"
              className="input-field"
              min={1}
              value={newTableNum}
              onChange={e => setNewTableNum(e.target.value)}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              A unique QR code will be generated automatically.
            </small>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
            <button id="confirm-add-table-btn" className="btn btn-primary" onClick={handleAdd} disabled={adding}>
              {adding ? 'Creating…' : 'Add Table'}
            </button>
          </div>
        </div>
      </div>
    )}

    {loading ? (
      <div className="loading-center"><div className="spinner" /><span>Loading floorplan…</span></div>
    ) : tables.length === 0 ? (
      <div className="empty-state">
        <div className="empty-state-icon">📱</div>
        <h3>No tables configured</h3>
        <p>Add your first table to generate a QR code</p>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Table</button>
      </div>
    ) : (
      <div className="tables-grid">
        {tables.map(table => {
          const activeOrders = orders.filter(o => o.tableNumber === table.tableNumber && o.status !== 'completed' && o.status !== 'cancelled');
          const orderCount = activeOrders.length;
          
          let cardClass = 'table-card';
          let textColor = 'var(--text-primary)';
          let badgeColor = 'var(--border)';
          let statusText = 'Empty';
          
          if (orderCount === 1) {
            cardClass = 'table-card active-1-order';
            textColor = '#f97316';
            badgeColor = '#f97316';
            statusText = '1 Order';
          } else if (orderCount >= 2) {
            cardClass = 'table-card active-multiple-orders';
            textColor = '#22c55e';
            badgeColor = '#22c55e';
            statusText = `${orderCount} Orders`;
          }

          if (!table.isActive) {
            cardClass = 'table-card inactive';
            textColor = 'var(--text-muted)';
            badgeColor = 'var(--border)';
            statusText = 'Inactive';
          }

          return (
            <div key={table.id} className={cardClass} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem 1rem', cursor: 'default' }}>
              
              {/* 3-dots Menu Button */}
              <button 
                className="btn btn-ghost btn-sm btn-icon" 
                style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', color: textColor }} 
                onClick={(e) => toggleDropdown(e, table.id)}
              >
                ⋮
              </button>

              {/* Dropdown Menu */}
              {activeDropdown === table.id && (
                <div className="table-dropdown-menu" style={{ position: 'absolute', top: '2.5rem', right: '0.5rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 10, minWidth: '160px', overflow: 'hidden' }}>
                  <button className="dropdown-item" onClick={() => { setViewQR(table.qrCodeImageUrl); setActiveDropdown(null); }}>👁 View QR Code</button>
                  <button className="dropdown-item" onClick={() => { downloadQR(table); setActiveDropdown(null); }}>⬇ Download QR</button>
                  <button className="dropdown-item" onClick={() => { window.open(table.qrCodeData, '_blank'); setActiveDropdown(null); }}>🔗 Open Customer Link</button>
                  <button className="dropdown-item" onClick={() => { copyLink(table); setActiveDropdown(null); }}>📋 Copy Link</button>
                  <button className="dropdown-item" onClick={() => { regenerateQR(table.id); setActiveDropdown(null); }}>🔄 Regenerate QR</button>
                  <div style={{ height: 1, background: 'var(--border)', margin: '0.25rem 0' }} />
                  <button className="dropdown-item" onClick={() => { toggleActive(table); setActiveDropdown(null); }}>
                    {table.isActive ? '⏸ Deactivate' : '▶ Activate'}
                  </button>
                  <button className="dropdown-item text-danger" onClick={() => { handleDelete(table.id, table.tableNumber); setActiveDropdown(null); }}>🗑 Delete</button>
                </div>
              )}

              {/* Table Content */}
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem', opacity: table.isActive ? 1 : 0.4 }}>🍽️</div>
              <div className="table-card-number" style={{ color: textColor, margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>
                Table {table.tableNumber}
              </div>
              <div style={{ 
                marginTop: '0.5rem', 
                padding: '0.25rem 0.75rem', 
                background: table.isActive && orderCount > 0 ? badgeColor : 'transparent', 
                color: table.isActive && orderCount > 0 ? '#fff' : textColor, 
                borderRadius: '999px', 
                fontSize: '0.8rem', 
                fontWeight: 600, 
                border: !(table.isActive && orderCount > 0) ? `1px solid ${badgeColor}` : 'none' 
              }}>
                {statusText}
              </div>
            </div>
          );
        })}
      </div>
    )}

    {/* View QR Modal */}
    {viewQR && (
      <div className="modal-overlay" onClick={() => setViewQR(null)}>
        <div className="modal-box" style={{ maxWidth: 400, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
          <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
            <h3 className="modal-title">Table QR Code</h3>
            <button className="btn btn-ghost btn-icon" onClick={() => setViewQR(null)}>✕</button>
          </div>
          <div style={{ padding: '2rem' }}>
            <img src={viewQR} alt="QR Code" style={{ width: '100%', maxWidth: '250px', height: 'auto', display: 'block', margin: '0 auto', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
          </div>
          <button className="btn btn-primary" style={{ width: '100%', maxWidth: '250px', marginBottom: '1rem' }} onClick={() => {
            const link = document.createElement('a');
            link.href = viewQR;
            link.download = `qr-code.png`;
            link.click();
          }}>⬇ Download Image</button>
        </div>
      </div>
    )}

    {toast && (
      <div className="toast-container">
        <div className="toast toast-success">{toast}</div>
      </div>
    )}
  </>
  );
}
