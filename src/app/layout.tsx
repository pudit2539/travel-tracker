import type { Viewport } from 'next';
import { Manrope, Noto_Sans_Thai, Noto_Serif, Noto_Serif_Thai, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import PWAHandler from '@/components/PWAHandler';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Toaster } from 'sonner';

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
});

const notoSansThai = Noto_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-noto-thai',
  display: 'swap',
});

const notoSerif = Noto_Serif({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-serif',
  display: 'swap',
});

const notoSerifThai = Noto_Serif_Thai({
  subsets: ['thai', 'latin'],
  weight: ['500', '600', '700'],
  variable: '--font-noto-serif-thai',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafd' },
    { media: '(prefers-color-scheme: dark)', color: '#0d131f' },
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
    <html
      lang="th"
      suppressHydrationWarning
      className={`${manrope.variable} ${notoSansThai.variable} ${notoSerif.variable} ${notoSerifThai.variable} ${jetbrainsMono.variable}`}
    >
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
                    document.documentElement.classList.remove('light');
                    document.documentElement.style.colorScheme = 'dark';
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.classList.add('light');
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
      <body className="min-h-screen antialiased bg-[#f8fafd] text-[#0f172a] dark:bg-[#0d131f] dark:text-[#dde2f3] selection:bg-[#2563eb] selection:text-white dark:selection:bg-[#4cd7f6] dark:selection:text-[#003640]">
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
