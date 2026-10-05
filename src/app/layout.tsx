import type { Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import ErrorBoundary from '@/components/ErrorBoundary';
import PWAHandler from '@/components/PWAHandler';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf8fd' },
    { media: '(prefers-color-scheme: dark)', color: '#181b2a' },
  ],
};

export const metadata = {
  title: 'Travel Tracker & Planner 🐱',
  description: 'Track expenses and manage your overseas travel plans easily with AI & Cat Companion.',
  manifest: '/manifest.json',
  icons: {
    icon: '/app-logo.png',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TravelTracker',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icon.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
      </head>
      <body className="min-h-screen antialiased bg-[#faf8fd] text-[#1e293b] dark:bg-[#181b2a] dark:text-[#f1f5f9] selection:bg-rose-400 selection:text-white transition-colors duration-300">
        {/* Anti-FOUC Synchronous Theme Detection: Prevents White Flash in Dark Mode */}
        <Script id="theme-detector" strategy="beforeInteractive">
          {`
            (function() {
              try {
                var saved = localStorage.getItem('theme');
                var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                var isDark = saved === 'dark' || ((!saved || saved === 'system') && prefersDark);
                if (isDark) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            })();
          `}
        </Script>
        <ErrorBoundary>
          <ThemeProvider>
            <PWAHandler />
            {children}
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
