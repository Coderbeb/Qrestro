'use client';
import { useEffect } from 'react';

/**
 * Applies the saved theme on every page load.
 * Renders nothing visible — just syncs localStorage → html[data-theme].
 */
export default function ThemeProvider() {
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, []);

  return null;
}
