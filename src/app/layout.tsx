import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: { default: 'DialDesk — AI voice receptionist', template: '%s · DialDesk' },
  description: 'An AI receptionist that answers every call, books appointments and captures leads.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#14232F' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
