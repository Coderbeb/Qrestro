'use client';
import { useEffect, useState } from 'react';
import { Plus, Users, Edit3, Trash2, X, Shield, ChefHat, CreditCard, UserCheck, Eye, EyeOff, Copy, RefreshCw } from 'lucide-react';
import { getAuthHeader } from '@/lib/api';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { useSWRFetch } from '@/lib/useSWRFetch';

type StaffMember = {
  id: string;
  name: string;
  phone: string | null;
  role: 'MANAGER' | 'WAITER' | 'CASHIER';
  assignedTables: number[];
  isActive: boolean;
  createdAt: string;
};

type TableInfo = {
  id: string;
  tableNumber: number;
  isActive: boolean;
};

const ROLE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  MANAGER: { label: 'Manager', icon: <Shield size={14} />, color: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)' },
  WAITER: { label: 'Waiter', icon: <UserCheck size={14} />, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
  CASHIER: { label: 'Cashier', icon: <CreditCard size={14} />, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
};

function generatePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [saving, setSaving] = useState(false);
  const [restaurantCode, setRestaurantCode] = useState('');

  // Form state
  const [form, setForm] = useState({
    name: '',
    phone: '',
    pin: generatePin(),
    role: 'WAITER' as string,
    assignedTables: [] as number[],
  });
  const [showPin, setShowPin] = useState(true);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(''), 3500);
  };

  // SWR: fetch staff and tables with instant cache on re-mount
  const { data: swrStaff, isLoading: staffLoading, mutate: mutateStaff } = useSWRFetch<StaffMember[]>('/api/staff');
  const { data: swrTables, isLoading: tablesLoading, mutate: mutateTables } = useSWRFetch<TableInfo[]>('/api/tables');
  const loading = staffLoading || tablesLoading;

  // Seed local state from SWR cache
  useEffect(() => { if (swrStaff) setStaff(swrStaff); }, [swrStaff]);
  useEffect(() => { if (swrTables) setTables(swrTables); }, [swrTables]);

  // Refresh helper that invalidates SWR cache
  const loadData = () => { mutateStaff(); mutateTables(); };

  useEffect(() => {
    loadData();
    const stored = localStorage.getItem('owner');
    if (stored) {
      const p = JSON.parse(stored);
      setRestaurantCode(p.username || '');
    }
  }, [loadData]);

  function openAddModal() {
    setEditingStaff(null);
    setForm({ name: '', phone: '', pin: generatePin(), role: 'WAITER', assignedTables: [] });
    setShowPin(true);
    setShowModal(true);
  }

  function openEditModal(member: StaffMember) {
    setEditingStaff(member);
    setForm({
      name: member.name,
      phone: member.phone || '',
      pin: '',
      role: member.role,
      assignedTables: member.assignedTables,
    });
    setShowPin(false);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingStaff(null);
  }

  function toggleTableAssignment(tableNum: number) {
    setForm(prev => ({
      ...prev,
      assignedTables: prev.assignedTables.includes(tableNum)
        ? prev.assignedTables.filter(t => t !== tableNum)
        : [...prev.assignedTables, tableNum].sort((a, b) => a - b),
    }));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      showToast('Name is required', 'error');
      return;
    }
    if (!editingStaff && (!form.pin || form.pin.length < 4 || form.pin.length > 6)) {
      showToast('PIN must be 4-6 digits', 'error');
      return;
    }

    setSaving(true);
    try {
      const headers = getAuthHeader();
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        role: form.role,
        assignedTables: form.assignedTables,
      };
      if (form.pin) body.pin = form.pin;

      const url = editingStaff ? `/api/staff/${editingStaff.id}` : '/api/staff';
      const method = editingStaff ? 'PUT' : 'POST';

      const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
      const data = await res.json();

      if (data.success) {
        showToast(editingStaff ? 'Staff updated!' : 'Staff added!');
        closeModal();
        loadData();
      } else {
        showToast(data.error?.message || 'Failed', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(member: StaffMember) {
    if (!confirm(`Remove ${member.name} from your staff? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/staff/${member.id}`, { method: 'DELETE', headers: getAuthHeader() });
      const data = await res.json();
      if (data.success) {
        showToast('Staff removed');
        loadData();
      } else {
        showToast(data.error?.message || 'Failed', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    }
  }

  async function toggleActive(member: StaffMember) {
    try {
      await fetch(`/api/staff/${member.id}`, {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify({ isActive: !member.isActive }),
      });
      loadData();
      showToast(member.isActive ? 'Staff deactivated' : 'Staff activated');
    } catch {
      showToast('Failed to update', 'error');
    }
  }



  const roleCounts = staff.reduce((acc, s) => {
    acc[s.role] = (acc[s.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <>
      <div className="page-header">
        <div>
          <span className="page-header-pretitle">Team Management</span>
          <h1>Staff</h1>
          <p>{staff.length} team member{staff.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>

          <button
            id="add-staff-btn"
            className="btn btn-primary"
            onClick={openAddModal}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Plus size={16} /> Add Staff
          </button>
        </div>
      </div>

      {/* Role Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {Object.entries(ROLE_CONFIG).map(([role, config]) => (
          <div key={role} className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 'var(--radius-sm)',
              background: config.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: config.color,
            }}>
              {config.icon}
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                {roleCounts[role] || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>{config.label}s</div>
            </div>
          </div>
        ))}
      </div>

      {/* Staff List */}
      {loading ? (
        <DashboardSkeleton type="table" />
      ) : staff.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Users size={40} /></div>
          <h3>No staff members yet</h3>
          <p>Add your team — waiters, chefs, cashiers, and managers</p>
          <button className="btn btn-primary" onClick={openAddModal} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <Plus size={16} /> Add First Staff
          </button>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="data-table-wrapper" style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Phone</th>
                  <th>Assigned Tables</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map(member => {
                  const roleConfig = ROLE_CONFIG[member.role];
                  return (
                    <tr key={member.id} style={{ opacity: member.isActive ? 1 : 0.5 }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: roleConfig.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: roleConfig.color, fontWeight: 700, fontSize: '0.85rem',
                          }}>
                            {member.name[0]?.toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600 }}>{member.name}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                          padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600,
                          background: roleConfig.bg, color: roleConfig.color,
                        }}>
                          {roleConfig.icon} {roleConfig.label}
                        </span>
                      </td>
                      <td style={{ color: member.phone ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                        {member.phone || '—'}
                      </td>
                      <td>
                        {member.role === 'WAITER' && member.assignedTables.length > 0 ? (
                          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                            {member.assignedTables.map(t => (
                              <span key={t} style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                width: 26, height: 26, borderRadius: 'var(--radius-sm)',
                                background: 'var(--accent-glow)', color: 'var(--accent)',
                                fontSize: '0.75rem', fontWeight: 700,
                              }}>
                                {t}
                              </span>
                            ))}
                          </div>
                        ) : member.role === 'WAITER' ? (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>None</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>—</span>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() => toggleActive(member)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                            padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600,
                            background: member.isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: member.isActive ? '#10b981' : '#ef4444',
                            border: 'none', cursor: 'pointer',
                            transition: 'background var(--transition)',
                          }}
                        >
                          <span style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: member.isActive ? '#10b981' : '#ef4444',
                          }} />
                          {member.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            onClick={() => openEditModal(member)}
                            title="Edit"
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            onClick={() => handleDelete(member)}
                            title="Delete"
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--status-cancelled)' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal-box animate-fade-in" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={20} style={{ color: 'var(--accent)' }} />
                {editingStaff ? 'Edit Staff' : 'Add Staff Member'}
              </h3>
              <button className="btn btn-ghost btn-icon" onClick={closeModal} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '0.5rem 0' }}>
              {/* Name */}
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Amit Kumar"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  autoFocus
                />
              </div>

              {/* Phone */}
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="tel"
                  className="input-field"
                  placeholder="+91 9876543210"
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                />
              </div>

              {/* PIN */}
              <div className="form-group">
                <label className="form-label">
                  Login PIN {editingStaff ? '(leave blank to keep current)' : '*'}
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input
                      type={showPin ? 'text' : 'password'}
                      className="input-field"
                      placeholder="4-6 digit PIN"
                      value={form.pin}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setForm(p => ({ ...p, pin: val }));
                      }}
                      maxLength={6}
                      inputMode="numeric"
                      style={{ paddingRight: '2.5rem', fontFamily: 'monospace', fontSize: '1.1rem', letterSpacing: '0.15em' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      style={{
                        position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                        padding: '0.25rem', display: 'flex', alignItems: 'center',
                      }}
                    >
                      {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    onClick={() => { setForm(p => ({ ...p, pin: generatePin() })); setShowPin(true); }}
                    title="Generate random PIN"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 44 }}
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  Staff will use this PIN to log in on their device
                </small>
              </div>

              {/* Role */}
              <div className="form-group">
                <label className="form-label">Role *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                  {Object.entries(ROLE_CONFIG).map(([role, config]) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, role }))}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
                        border: form.role === role ? `2px solid ${config.color}` : '1px solid var(--border)',
                        background: form.role === role ? config.bg : 'var(--bg-surface)',
                        color: form.role === role ? config.color : 'var(--text-secondary)',
                        cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                        transition: 'all var(--transition)',
                      }}
                    >
                      {config.icon}
                      {config.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table Assignment (only for waiters) */}
              {form.role === 'WAITER' && tables.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Assigned Tables</label>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {tables.filter(t => t.isActive).sort((a, b) => a.tableNumber - b.tableNumber).map(table => {
                      const isSelected = form.assignedTables.includes(table.tableNumber);
                      return (
                        <button
                          key={table.id}
                          type="button"
                          onClick={() => toggleTableAssignment(table.tableNumber)}
                          style={{
                            width: 40, height: 40, borderRadius: 'var(--radius-sm)',
                            border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
                            background: isSelected ? 'var(--accent-glow)' : 'var(--bg-surface)',
                            color: isSelected ? 'var(--accent)' : 'var(--text-muted)',
                            fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all var(--transition)',
                          }}
                        >
                          {table.tableNumber}
                        </button>
                      );
                    })}
                  </div>
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    Tap tables to assign them to this waiter
                  </small>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button
                id="save-staff-btn"
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving…' : editingStaff ? 'Update Staff' : 'Add Staff'}
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
