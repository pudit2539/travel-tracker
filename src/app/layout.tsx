import type { Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import PWAHandler from '@/components/PWAHandler';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Toaster } from 'sonner';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf8fd' },
    { media: '(prefers-color-scheme: dark)', color: '#121316' },
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
        {/* Anti-FOUC Theme Script: runs synchronously before browser paints body */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (saved === 'dark' || (!saved && prefersDark)) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.style.colorScheme = 'dark';
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.style.colorScheme = 'light';
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icon.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
      </head>
      <body className="min-h-screen antialiased bg-[#faf8fd] text-[#1e293b] dark:bg-[#121316] dark:text-[#f1f5f9] selection:bg-blue-600 selection:text-white">
        <ThemeProvider>
          <PWAHandler />
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
          <Toaster 
            position="top-center" 
            richColors 
            closeButton
            theme="system"
            offset="max(env(safe-area-inset-top, 0px) + 16px, 58px)"
            toastOptions={{
              className: '!rounded-2xl !backdrop-blur-xl !shadow-2xl !border !border-white/20 !font-sans',
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
