'use client';
import { useEffect, useState, useCallback } from 'react';
import { Folder, Utensils, Trash2, Clock, Plus, ArrowLeft, Edit, Layers } from 'lucide-react';
import { getAuthHeader } from '@/lib/api';

type Category = {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  _count: { items: number };
};

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  preparationTime: number;
  isAvailable: boolean;
  categoryId: string | null;
  category: { id: string; name: string } | null;
};

type ItemForm = {
  name: string; description: string; price: string;
  preparationTime: string; isAvailable: boolean; imageUrl: string; categoryId: string;
};

const emptyItemForm: ItemForm = {
  name: '', description: '', price: '', preparationTime: '15',
  isAvailable: true, imageUrl: '', categoryId: '',
};

export default function MenuPage() {
  const [tab, setTab] = useState<'items' | 'categories'>('items');
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState<string>('all');

  // Item modal state
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemForm, setItemForm] = useState<ItemForm>(emptyItemForm);
  const [savingItem, setSavingItem] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingItem, setDeletingItem] = useState<string | null>(null);

  // Category modal state
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catForm, setCatForm] = useState({ name: '', description: '' });
  const [savingCat, setSavingCat] = useState(false);
  const [deletingCat, setDeletingCat] = useState<string | null>(null);

  const [toast, setToast] = useState('');
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadAll = useCallback(async () => {
    try {
      const [itemsRes, catsRes] = await Promise.all([
        fetch('/api/menu', { headers: getAuthHeader() }),
        fetch('/api/categories', { headers: getAuthHeader() }),
      ]);
      const [itemsData, catsData] = await Promise.all([itemsRes.json(), catsRes.json()]);
      if (itemsData.success) setItems(itemsData.data);
      if (catsData.success) setCategories(catsData.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Item handlers ─────────────────────────────────────────────
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setItemForm(p => ({ ...p, imageUrl: URL.createObjectURL(file) }));
    setUploading(true);
    const fd = new FormData(); fd.append('file', file);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await res.json();
      if (data.success) { setItemForm(p => ({ ...p, imageUrl: data.url })); showToast('Image uploaded!'); }
      else { setItemForm(p => ({ ...p, imageUrl: '' })); showToast('Upload failed'); }
    } catch { setItemForm(p => ({ ...p, imageUrl: '' })); showToast('Upload error'); }
    finally { setUploading(false); }
  }

  function openAddItem() { setEditingItem(null); setItemForm(emptyItemForm); setShowItemModal(true); }
  function openEditItem(item: MenuItem) {
    setEditingItem(item);
    setItemForm({ name: item.name, description: item.description || '', price: item.price.toString(), preparationTime: item.preparationTime.toString(), isAvailable: item.isAvailable, imageUrl: item.imageUrl || '', categoryId: item.categoryId || '' });
    setShowItemModal(true);
  }

  async function handleSaveItem() {
    if (!itemForm.name || !itemForm.price) { showToast('Name and price are required'); return; }
    setSavingItem(true);
    try {
      const url = editingItem ? `/api/menu/${editingItem.id}` : '/api/menu';
      const res = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({ name: itemForm.name, description: itemForm.description || null, price: parseFloat(itemForm.price), preparationTime: parseInt(itemForm.preparationTime), isAvailable: itemForm.isAvailable, imageUrl: itemForm.imageUrl || null, categoryId: itemForm.categoryId || null }),
      });
      const data = await res.json();
      if (!data.success) { showToast(data.error?.message || 'Error'); return; }
      showToast(editingItem ? 'Item updated!' : 'Item added!');
      setShowItemModal(false); loadAll();
    } finally { setSavingItem(false); }
  }

  async function handleDeleteItem(id: string) {
    if (!confirm('Delete this menu item?')) return;
    setDeletingItem(id);
    try {
      const res = await fetch(`/api/menu/${id}`, { method: 'DELETE', headers: getAuthHeader() });
      const data = await res.json();
      if (data.success) { showToast('Item deleted'); loadAll(); }
    } finally { setDeletingItem(null); }
  }

  async function toggleAvailability(item: MenuItem) {
    await fetch(`/api/menu/${item.id}`, { method: 'PUT', headers: getAuthHeader(), body: JSON.stringify({ isAvailable: !item.isAvailable }) });
    loadAll();
  }

  // ── Category handlers ─────────────────────────────────────────
  function openAddCat() { setEditingCat(null); setCatForm({ name: '', description: '' }); setShowCatModal(true); }
  function openEditCat(cat: Category) { setEditingCat(cat); setCatForm({ name: cat.name, description: cat.description || '' }); setShowCatModal(true); }

  async function handleSaveCat() {
    if (!catForm.name.trim()) { showToast('Category name is required'); return; }
    setSavingCat(true);
    try {
      const url = editingCat ? `/api/categories/${editingCat.id}` : '/api/categories';
      const res = await fetch(url, { method: editingCat ? 'PUT' : 'POST', headers: getAuthHeader(), body: JSON.stringify(catForm) });
      const data = await res.json();
      if (!data.success) { showToast(data.error?.message || 'Error'); return; }
      showToast(editingCat ? 'Category updated!' : 'Category created!');
      setShowCatModal(false); loadAll();
    } finally { setSavingCat(false); }
  }

  async function handleDeleteCat(id: string, name: string) {
    if (!confirm(`Delete category "${name}"? Items in this category will become uncategorized.`)) return;
    setDeletingCat(id);
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE', headers: getAuthHeader() });
      const data = await res.json();
      if (data.success) { showToast('Category deleted'); loadAll(); }
    } finally { setDeletingCat(null); }
  }

  // ── Filtered items ────────────────────────────────────────────
  const filteredItems = filterCat === 'all' ? items
    : filterCat === 'uncategorized' ? items.filter(i => !i.categoryId)
    : items.filter(i => i.categoryId === filterCat);

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <div>
          <span className="page-header-pretitle">Catalog</span>
          <h1>Menu</h1>
          <p>{items.length} item{items.length !== 1 ? 's' : ''} · {categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {tab === 'categories' ? (
            <button className="btn btn-primary" onClick={openAddCat} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><Plus size={16} /> Add Category</button>
          ) : (
            <>
              <button className="btn btn-ghost" onClick={() => setTab('categories')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><Folder size={16} /> Categories</button>
              <button id="add-menu-item-btn" className="btn btn-primary" onClick={openAddItem} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><Plus size={16} /> Add Item</button>
            </>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
        {(['items', 'categories'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '0.6rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer', fontWeight: tab === t ? 700 : 500, color: tab === t ? 'var(--accent)' : 'var(--text-secondary)', borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent', marginBottom: '-1px', transition: 'all 0.2s', fontSize: '0.9rem', textTransform: 'capitalize', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            {t === 'items' ? <><Utensils size={16} /> Items</> : <><Folder size={16} /> Categories</>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /><span>Loading…</span></div>
      ) : tab === 'categories' ? (
        /* ── Categories Tab ── */
        <>
          <button className="btn btn-ghost btn-sm" onClick={() => setTab('items')} style={{ marginBottom: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><ArrowLeft size={14} /> Back to Items</button>
          {categories.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Folder size={40} /></div>
              <h3>No categories yet</h3>
              <p>Create categories to organize your menu items</p>
              <button className="btn btn-primary" onClick={openAddCat} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><Plus size={16} /> Create First Category</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {categories.map(cat => (
                <div key={cat.id} className="card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{cat.name}</div>
                      {cat.description && <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{cat.description}</div>}
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: 'var(--accent-glow)', color: 'var(--accent)', padding: '0.2rem 0.65rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 }}>
                        <Utensils size={12} /> {cat._count.items} item{cat._count.items !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEditCat(cat)} title="Edit" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Edit size={14} /></button>
                      <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDeleteCat(cat.id, cat.name)} disabled={deletingCat === cat.id} title="Delete" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{deletingCat === cat.id ? '…' : <Trash2 size={14} />}</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* ── Items Tab ── */
        <>
          {/* Category filter pills */}
          {categories.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              {[{ id: 'all', name: `All (${items.length})` }, ...categories.map(c => ({ id: c.id, name: `${c.name} (${c._count.items})` })), { id: 'uncategorized', name: `Uncategorized (${items.filter(i => !i.categoryId).length})` }].map(f => (
                <button key={f.id} onClick={() => setFilterCat(f.id)} style={{ padding: '0.35rem 0.9rem', borderRadius: '999px', border: '1px solid', borderColor: filterCat === f.id ? 'var(--accent)' : 'var(--border)', background: filterCat === f.id ? 'var(--accent-glow)' : 'transparent', color: filterCat === f.id ? 'var(--accent)' : 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: filterCat === f.id ? 700 : 500, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
                  {f.name}
                </button>
              ))}
            </div>
          )}

          {filteredItems.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Utensils size={40} /></div>
              <h3>{items.length === 0 ? 'No menu items yet' : 'No items in this category'}</h3>
              <p>{items.length === 0 ? 'Add your first item to get started' : 'Add items or change category filter'}</p>
              <button className="btn btn-primary" onClick={openAddItem} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><Plus size={16} /> Add Item</button>
            </div>
          ) : (
            <div className="menu-grid">
              {filteredItems.map(item => (
                <div key={item.id} className="menu-item-card">
                  <div className="menu-item-img">
                    {item.imageUrl ? <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Utensils size={36} style={{ strokeWidth: 1.5, opacity: 0.4 }} />}
                  </div>
                  <div className="menu-item-body">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem', gap: '0.5rem' }}>
                      <div className="menu-item-name" style={{ flex: 1, minWidth: 0 }}>{item.name}</div>
                      <label className="toggle-switch" title={item.isAvailable ? 'Available' : 'Unavailable'}>
                        <input type="checkbox" checked={item.isAvailable} onChange={() => toggleAvailability(item)} />
                        <span className="toggle-slider" />
                      </label>
                    </div>
                    {/* Category chip */}
                    {item.category && (
                      <span style={{ display: 'inline-block', background: 'var(--accent-glow)', color: 'var(--accent)', padding: '0.15rem 0.55rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                        {item.category.name}
                      </span>
                    )}
                    {item.description && <div className="menu-item-desc">{item.description}</div>}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={12} /> {item.preparationTime} min</span>
                      <span className={`badge ${item.isAvailable ? 'badge-ready' : 'badge-cancelled'}`} style={{ padding: '0.1rem 0.5rem', fontSize: '0.7rem' }}>{item.isAvailable ? 'Available' : 'Unavailable'}</span>
                    </div>
                    <div className="menu-item-footer">
                      <div className="menu-item-price">₹{item.price.toFixed(2)}</div>
                      <div className="menu-item-actions">
                        <button id={`edit-item-${item.id}`} className="btn btn-ghost btn-sm btn-icon" onClick={() => openEditItem(item)} title="Edit" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Edit size={14} /></button>
                        <button id={`delete-item-${item.id}`} className="btn btn-danger btn-sm btn-icon" onClick={() => handleDeleteItem(item.id)} disabled={deletingItem === item.id} title="Delete" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{deletingItem === item.id ? '…' : <Trash2 size={14} />}</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Add/Edit Item Modal ── */}
      {showItemModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowItemModal(false)}>
          <div className="modal-box" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3 className="modal-title">{editingItem ? 'Edit Menu Item' : 'Add Menu Item'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowItemModal(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '70vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
              <div className="form-group">
                <label className="form-label">Item Name *</label>
                <input type="text" className="input-field" placeholder="e.g. Paneer Butter Masala" value={itemForm.name} onChange={e => setItemForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="input-field" value={itemForm.categoryId} onChange={e => setItemForm(p => ({ ...p, categoryId: e.target.value }))}>
                  <option value="">— Uncategorized —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {categories.length === 0 && <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>No categories yet. <button type="button" onClick={() => { setShowItemModal(false); setTab('categories'); openAddCat(); }} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.78rem', padding: 0 }}>Create one →</button></small>}
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input type="text" className="input-field" placeholder="Short description" value={itemForm.description} onChange={e => setItemForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Price (₹) *</label>
                  <input type="number" className="input-field" placeholder="0.00" min={0} step={0.01} value={itemForm.price} onChange={e => setItemForm(p => ({ ...p, price: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Prep Time (min)</label>
                  <input type="number" className="input-field" placeholder="15" min={1} value={itemForm.preparationTime} onChange={e => setItemForm(p => ({ ...p, preparationTime: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Image Upload</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {itemForm.imageUrl && <img src={itemForm.imageUrl} alt="Preview" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)' }} />}
                  <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} style={{ flex: 1, fontSize: '0.85rem' }} />
                  {uploading && <span className="spinner" style={{ width: 18, height: 18 }} />}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <label className="toggle-switch">
                  <input type="checkbox" checked={itemForm.isAvailable} onChange={e => setItemForm(p => ({ ...p, isAvailable: e.target.checked }))} />
                  <span className="toggle-slider" />
                </label>
                <span style={{ fontSize: '0.875rem' }}>Available for ordering</span>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
                <button className="btn btn-ghost" onClick={() => setShowItemModal(false)}>Cancel</button>
                <button id="save-menu-item-btn" className="btn btn-primary" onClick={handleSaveItem} disabled={savingItem}>{savingItem ? 'Saving…' : editingItem ? 'Save Changes' : 'Add Item'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add/Edit Category Modal ── */}
      {showCatModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCatModal(false)}>
          <div className="modal-box" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3 className="modal-title">{editingCat ? 'Edit Category' : 'New Category'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCatModal(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Category Name *</label>
                <input type="text" className="input-field" placeholder="e.g. Starters, Main Course, Beverages" value={catForm.name} onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))} autoFocus onKeyDown={e => e.key === 'Enter' && handleSaveCat()} />
              </div>
              <div className="form-group">
                <label className="form-label">Description (optional)</label>
                <input type="text" className="input-field" placeholder="Brief description" value={catForm.description} onChange={e => setCatForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setShowCatModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSaveCat} disabled={savingCat}>{savingCat ? 'Saving…' : editingCat ? 'Save Changes' : 'Create Category'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast-container"><div className="toast toast-success">{toast}</div></div>}
    </>
  );
}
