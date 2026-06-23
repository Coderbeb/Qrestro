'use client';
import { useEffect, useState, useCallback } from 'react';

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  preparationTime: number;
  isAvailable: boolean;
};

type FormData = {
  name: string;
  description: string;
  price: string;
  preparationTime: string;
  isAvailable: boolean;
  imageUrl: string;
};

const emptyForm: FormData = { name: '', description: '', price: '', preparationTime: '15', isAvailable: true, imageUrl: '' };

function getAuthHeader() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show immediate local preview
    const localUrl = URL.createObjectURL(file);
    setForm(p => ({ ...p, imageUrl: localUrl }));

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setForm(p => ({ ...p, imageUrl: data.url }));
        showToast('Image uploaded successfully!');
      } else {
        showToast(data.error?.message || 'Upload failed');
        setForm(p => ({ ...p, imageUrl: '' }));
      }
    } catch (err) {
      showToast('Error uploading image');
      setForm(p => ({ ...p, imageUrl: '' }));
    } finally {
      setUploading(false);
    }
  }

  const loadItems = useCallback(async () => {
    try {
      const res = await fetch('/api/menu', { headers: getAuthHeader() });
      const data = await res.json();
      if (data.success) setItems(data.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(item: MenuItem) {
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      preparationTime: item.preparationTime.toString(),
      isAvailable: item.isAvailable,
      imageUrl: item.imageUrl || '',
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name || !form.price) { showToast('Name and price are required'); return; }
    setSaving(true);
    try {
      const url = editing ? `/api/menu/${editing.id}` : '/api/menu';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: getAuthHeader(),
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          price: parseFloat(form.price),
          preparationTime: parseInt(form.preparationTime),
          isAvailable: form.isAvailable,
          imageUrl: form.imageUrl || null,
        }),
      });
      const data = await res.json();
      if (!data.success) { showToast(data.error?.message || 'Error'); return; }
      showToast(editing ? 'Item updated!' : 'Item added!');
      setShowModal(false);
      loadItems();
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this menu item?')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/menu/${id}`, { method: 'DELETE', headers: getAuthHeader() });
      const data = await res.json();
      if (data.success) { showToast('Item deleted'); loadItems(); }
    } finally { setDeleting(null); }
  }

  async function toggleAvailability(item: MenuItem) {
    await fetch(`/api/menu/${item.id}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify({ isAvailable: !item.isAvailable }),
    });
    loadItems();
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Menu</h1>
          <p>{items.length} item{items.length !== 1 ? 's' : ''} in your menu</p>
        </div>
        <button id="add-menu-item-btn" className="btn btn-primary" onClick={openAdd}>+ Add Item</button>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /><span>Loading menu…</span></div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🍽️</div>
          <h3>No menu items yet</h3>
          <p>Add your first item to get started</p>
          <button className="btn btn-primary" onClick={openAdd}>+ Add First Item</button>
        </div>
      ) : (
        <div className="menu-grid">
          {items.map(item => (
            <div key={item.id} className="menu-item-card">
              <div className="menu-item-img">
                {item.imageUrl
                  ? <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : '🍴'}
              </div>
              <div className="menu-item-body">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <div className="menu-item-name">{item.name}</div>
                  <label className="toggle-switch" title={item.isAvailable ? 'Available' : 'Unavailable'}>
                    <input type="checkbox" checked={item.isAvailable} onChange={() => toggleAvailability(item)} />
                    <span className="toggle-slider" />
                  </label>
                </div>
                {item.description && <div className="menu-item-desc">{item.description}</div>}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <span>⏱ {item.preparationTime} min</span>
                  <span className={`badge ${item.isAvailable ? 'badge-ready' : 'badge-cancelled'}`} style={{ padding: '0.1rem 0.5rem', fontSize: '0.7rem' }}>
                    {item.isAvailable ? 'Available' : 'Unavailable'}
                  </span>
                </div>
                <div className="menu-item-footer">
                  <div className="menu-item-price">₹{item.price.toFixed(2)}</div>
                  <div className="menu-item-actions">
                    <button id={`edit-item-${item.id}`} className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(item)} title="Edit">✏️</button>
                    <button id={`delete-item-${item.id}`} className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(item.id)} disabled={deleting === item.id} title="Delete">
                      {deleting === item.id ? '…' : '🗑'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-box">
            <div className="modal-header">
              <h3 className="modal-title">{editing ? 'Edit Menu Item' : 'Add Menu Item'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Item Name *</label>
                <input type="text" className="input-field" placeholder="e.g. Paneer Butter Masala" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input type="text" className="input-field" placeholder="Short description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Price (₹) *</label>
                  <input type="number" className="input-field" placeholder="0.00" min={0} step={0.01} value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Prep Time (min)</label>
                  <input type="number" className="input-field" placeholder="15" min={1} value={form.preparationTime} onChange={e => setForm(p => ({ ...p, preparationTime: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Image Upload</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {form.imageUrl && (
                    <img src={form.imageUrl} alt="Preview" style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover' }} />
                  )}
                  <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} style={{ flex: 1 }} />
                  {uploading && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Uploading...</span>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <label className="toggle-switch">
                  <input type="checkbox" checked={form.isAvailable} onChange={e => setForm(p => ({ ...p, isAvailable: e.target.checked }))} />
                  <span className="toggle-slider" />
                </label>
                <span style={{ fontSize: '0.875rem' }}>Available for ordering</span>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button id="save-menu-item-btn" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </div>
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
