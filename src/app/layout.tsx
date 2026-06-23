import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'QRBite — Restaurant QR Ordering System',
  description: 'Modern QR code based ordering system for restaurants. Customers scan a QR code at the table, browse the menu, and place orders instantly.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
