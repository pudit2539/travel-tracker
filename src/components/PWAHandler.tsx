'use client';

import { useEffect } from 'react';

export default function PWAHandler() {
  useEffect(() => {
    // Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const registerSW = () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.log('SW registration error:', err);
        });
      };

      if (document.readyState === 'complete') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
        return () => window.removeEventListener('load', registerSW);
      }
    }
  }, []);

  useEffect(() => {
    // Prevent unwanted pinch-to-zoom on iOS Safari
    const preventZoom = (e: Event) => {
      e.preventDefault();
    };
    document.addEventListener('gesturestart', preventZoom, { passive: false });
    return () => {
      document.removeEventListener('gesturestart', preventZoom);
    };
  }, []);

  return null;
}
