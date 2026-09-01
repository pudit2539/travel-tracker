// src/app/layout.tsx
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import ErrorBoundary from '@/components/ErrorBoundary';

export const metadata = {
  title: 'Travel Tracker & Planner',
  description: 'Track expenses and manage your overseas travel plans easily.',
  manifest: '/manifest.json',
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
            `,
          }}
        />
      </head>
      <body className="min-h-screen antialiased bg-[#f8fafc] text-[#1e293b] dark:bg-[#090611] dark:text-[#f8fafc] selection:bg-pink-500 selection:text-white transition-colors duration-300">
        <ErrorBoundary>
          <ThemeProvider>{children}</ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
