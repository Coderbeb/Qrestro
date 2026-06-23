'use client';
import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type FormData = {
  restaurantName: string;
  ownerName: string;
  email: string;
  phone: string;
  username: string;
  password: string;
  tableCount: string;
};

const initialForm: FormData = {
  restaurantName: '', ownerName: '', email: '',
  phone: '', username: '', password: '', tableCount: '5',
};

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(initialForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(field: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(p => ({ ...p, [field]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (parseInt(form.tableCount) < 1 || parseInt(form.tableCount) > 100) {
      setError('Table count must be between 1 and 100'); return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, tableCount: parseInt(form.tableCount) }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error?.message || 'Registration failed'); return; }
      router.push('/auth/login?registered=1');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page" style={{ alignItems: 'flex-start', paddingTop: '2rem' }}>
      <div className="auth-card" style={{ maxWidth: 520 }}>
        <div className="auth-logo">
          <div className="auth-logo-icon">🍴</div>
          <h1 className="auth-title">Register your restaurant</h1>
          <p className="auth-subtitle">Set up your QR ordering system in minutes</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {/* Row 1 — stacks to 1 column on mobile */}
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="restaurantName">Restaurant Name *</label>
              <input id="restaurantName" type="text" className="input-field" placeholder="The Spice Garden" value={form.restaurantName} onChange={set('restaurantName')} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="ownerName">Owner Name *</label>
              <input id="ownerName" type="text" className="input-field" placeholder="Raj Kumar" value={form.ownerName} onChange={set('ownerName')} required />
            </div>
          </div>
          {/* Row 2 */}
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="reg-email">Email *</label>
              <input id="reg-email" type="email" className="input-field" placeholder="raj@restaurant.com" value={form.email} onChange={set('email')} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="phone">Phone</label>
              <input id="phone" type="tel" className="input-field" placeholder="+91 9876543210" value={form.phone} onChange={set('phone')} />
            </div>
          </div>
          {/* Row 3 */}
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="reg-username">Username *</label>
              <input id="reg-username" type="text" className="input-field" placeholder="raj_restaurant" value={form.username} onChange={set('username')} required minLength={3} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-password">Password *</label>
              <input id="reg-password" type="password" className="input-field" placeholder="Min 6 characters" value={form.password} onChange={set('password')} required minLength={6} />
            </div>
          </div>
          {/* Table count */}
          <div className="form-group">
            <label className="form-label" htmlFor="tableCount">Number of Tables *</label>
            <input id="tableCount" type="number" className="input-field" placeholder="5" min={1} max={100} value={form.tableCount} onChange={set('tableCount')} required />
            <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              We&apos;ll generate a unique QR code for each table automatically.
            </small>
          </div>

          {error && <p className="form-error" style={{ textAlign: 'center' }}>{error}</p>}

          <button id="register-submit" type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? <><span className="spinner" style={{ width: 18, height: 18 }} /> Creating account…</> : 'Create Restaurant Account →'}
          </button>
        </form>

        <div className="auth-divider" style={{ marginTop: '1.5rem' }}>
          <span>Already have an account?</span>
        </div>
        <Link href="/auth/login" className="btn btn-ghost btn-full" style={{ marginTop: '0.75rem' }}>
          Sign in instead
        </Link>
      </div>
    </div>
  );
}
