import type { Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import ErrorBoundary from '@/components/ErrorBoundary';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf8fd' },
    { media: '(prefers-color-scheme: dark)', color: '#0d0f18' },
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
    statusBarStyle: 'black-translucent',
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch((err) => {
                    console.log('SW registration error:', err);
                  });
                });
              }
              // Prevent unwanted pinch-to-zoom on iOS Safari
              document.addEventListener('gesturestart', function(e) {
                e.preventDefault();
              }, { passive: false });
            `,
          }}
        />
      </head>
      <body className="min-h-screen antialiased bg-[#faf8fd] text-[#1e293b] dark:bg-[#0d0f18] dark:text-[#f1f5f9] selection:bg-pink-400 selection:text-white transition-colors duration-300">
        <ErrorBoundary>
          <ThemeProvider>{children}</ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
