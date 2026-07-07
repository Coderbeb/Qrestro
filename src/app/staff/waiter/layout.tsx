'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { UtensilsCrossed, LogOut, Sun, Moon } from 'lucide-react';

export default function WaiterLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [staff, setStaff] = useState<{ name?: string; role?: string } | null>(null);
  const [restaurant, setRestaurant] = useState<{ name?: string } | null>(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('staffToken');
    if (!token) { router.replace('/auth/login?tab=staff'); return; }
    const staffStr = localStorage.getItem('staff');
    const restStr = localStorage.getItem('staffRestaurant');
    if (staffStr) setStaff(JSON.parse(staffStr));
    if (restStr) setRestaurant(JSON.parse(restStr));

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDark(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, [router]);

  function toggleTheme() {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  }

  function handleLogout() {
    localStorage.removeItem('staffToken');
    localStorage.removeItem('staff');
    localStorage.removeItem('staffRestaurant');
    document.cookie = 'staffToken=; path=/; max-age=0';
    router.replace('/auth/login?tab=staff');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
      {/* Top Bar */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.75rem 1rem',
        background: 'var(--bg-topbar)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 'var(--radius-sm)',
            background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <UtensilsCrossed size={16} style={{ color: '#fff' }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.2 }}>
              {restaurant?.name || 'QRestro'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              👋 {staff?.name || 'Staff'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            className="btn btn-ghost btn-icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            className="btn btn-ghost btn-icon"
            onClick={handleLogout}
            aria-label="Logout"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--status-cancelled)' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '1rem', maxWidth: 600, margin: '0 auto', width: '100%' }} className="animate-fade-in">
        {children}
      </main>
    </div>
  );
}
