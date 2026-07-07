import type { Metadata, Viewport } from 'next';
import './globals.css';
import ThemeProvider from './ThemeProvider';

export const metadata: Metadata = {
  title: 'QRestro — Restaurant QR Ordering System',
  description: 'Modern QR code based ordering system for restaurants. Customers scan a QR code at the table, browse the menu, and place orders instantly.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Prevent flash of wrong theme by reading localStorage synchronously */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark');}catch(e){}})();`
          }}
        />
      </head>
      <body>
        <ThemeProvider />
        {children}
      </body>
    </html>
  );
}
