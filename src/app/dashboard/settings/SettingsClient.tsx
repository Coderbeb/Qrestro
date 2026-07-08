'use client';
import { useEffect, useState } from 'react';
import { Store, Lock } from 'lucide-react';
import { getAuthHeader } from '@/lib/api';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { useSWRFetch } from '@/lib/useSWRFetch';

type Owner = {
  id: string;
  username: string;
  email: string;
  restaurantName: string | null;
  ownerName: string | null;
  phone: string | null;
  cuisine: string | null;
  createdAt: string;
};

export default function SettingsPage() {
  const [owner, setOwner] = useState<Owner | null>(null);
  const [profile, setProfile] = useState({ restaurantName: '', ownerName: '', email: '', phone: '', cuisine: '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(''), 3500);
  };

  // SWR: fetch profile with instant cache on re-mount
  const { data: swrOwner, isLoading: loading } = useSWRFetch<Owner>('/api/auth/profile');

  // Seed local state from SWR cache
  useEffect(() => {
    if (swrOwner) {
      setOwner(swrOwner);
      setProfile({
        restaurantName: swrOwner.restaurantName || '',
        ownerName: swrOwner.ownerName || '',
        email: swrOwner.email,
        phone: swrOwner.phone || '',
        cuisine: swrOwner.cuisine || '',
      });
    }
  }, [swrOwner]);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Profile updated successfully!');
        setOwner(data.data);
        // Update localStorage
        const stored = localStorage.getItem('owner');
        if (stored) {
          const parsed = JSON.parse(stored);
          localStorage.setItem('owner', JSON.stringify({ ...parsed, restaurantName: data.data.restaurantName }));
        }
      } else {
        showToast(data.error?.message || 'Failed to update profile', 'error');
      }
    } finally { setSavingProfile(false); }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      showToast('New passwords do not match', 'error'); return;
    }
    if (passwords.newPassword.length < 6) {
      showToast('New password must be at least 6 characters', 'error'); return;
    }
    setSavingPwd(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Password changed successfully!');
        setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        showToast(data.error?.message || 'Failed to change password', 'error');
      }
    } finally { setSavingPwd(false); }
  }

  if (!owner) return <DashboardSkeleton type="table" />;

  return (
    <>
      <div className="page-header">
        <div>
          <span className="page-header-pretitle">Configuration</span>
          <h1>Settings</h1>
          <p>Manage your profile and account security</p>
        </div>
      </div>

      <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {/* Profile Form */}
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Store size={20} style={{ color: 'var(--accent)' }} /> Restaurant Profile
          </h3>
          <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Restaurant Name</label>
              <input type="text" className="input-field" value={profile.restaurantName} onChange={e => setProfile(p => ({ ...p, restaurantName: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Owner Name</label>
              <input type="text" className="input-field" value={profile.ownerName} onChange={e => setProfile(p => ({ ...p, ownerName: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Cuisine / Style</label>
              <input type="text" className="input-field" placeholder="e.g. Indian Cuisine, Cafe & Kitchen, Steakhouse" value={profile.cuisine} onChange={e => setProfile(p => ({ ...p, cuisine: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="input-field" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input type="tel" className="input-field" placeholder="+91 9876543210" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input type="text" className="input-field" value={owner.username} disabled style={{ opacity: 0.5 }} />
              <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Username cannot be changed.</small>
            </div>
            <button id="save-profile-btn" type="submit" className="btn btn-primary" disabled={savingProfile}>
              {savingProfile ? 'Saving…' : 'Save Profile'}
            </button>
          </form>
        </div>

        {/* Password Form */}
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lock size={20} style={{ color: 'var(--accent)' }} /> Change Password
          </h3>
          <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input
                id="current-password"
                type="password"
                className="input-field"
                value={passwords.currentPassword}
                onChange={e => setPasswords(p => ({ ...p, currentPassword: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                id="new-password"
                type="password"
                className="input-field"
                placeholder="Min 6 characters"
                value={passwords.newPassword}
                onChange={e => setPasswords(p => ({ ...p, newPassword: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                id="confirm-password"
                type="password"
                className="input-field"
                placeholder="Repeat new password"
                value={passwords.confirmPassword}
                onChange={e => setPasswords(p => ({ ...p, confirmPassword: e.target.value }))}
                required
              />
            </div>
            <button id="change-password-btn" type="submit" className="btn btn-primary" disabled={savingPwd}>
              {savingPwd ? 'Changing…' : 'Change Password'}
            </button>
          </form>

          {/* Account Info */}
          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
            <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Account Info</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Member since</span>
                <span>{new Date(owner.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Owner ID</span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{owner.id.slice(0, 8)}…</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toastType}`}>{toast}</div>
        </div>
      )}
    </>
  );
}
