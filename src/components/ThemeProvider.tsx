// src/components/ThemeProvider.tsx
'use client';

import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';

type Theme = 'dark' | 'light' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'dark' | 'light';
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  setTheme: () => null,
  resolvedTheme: 'light',
  mounted: false,
});

// Use useLayoutEffect on client to mutate DOM before paint (prevents FOUC)
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Deterministic SSR initial values to guarantee hydration parity;
  // root inline <script> already applies visual .dark/.light class before first paint.
  const [theme, setThemeState] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('light');
  const hasLoadedStorageRef = useRef(false);

  useIsomorphicLayoutEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    let effectiveTheme = theme;
    if (!hasLoadedStorageRef.current) {
      hasLoadedStorageRef.current = true;
      try {
        const saved = localStorage.getItem('theme') as Theme | null;
        if (saved === 'dark' || saved === 'light' || saved === 'system') {
          effectiveTheme = saved;
          if (saved !== theme) {
            setThemeState(saved);
          }
        }
      } catch {}
      setMounted(true);
    }

    const applyTheme = () => {
      const isDark = effectiveTheme === 'system' ? mediaQuery.matches : effectiveTheme === 'dark';
      if (isDark) {
        root.classList.add('dark');
        root.classList.remove('light');
        root.style.colorScheme = 'dark';
        setResolvedTheme('dark');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
        root.style.colorScheme = 'light';
        setResolvedTheme('light');
      }
    };

    applyTheme();
    try {
      if (mounted) {
        localStorage.setItem('theme', effectiveTheme);
      }
    } catch {}

    const handleChange = () => {
      if (effectiveTheme === 'system') applyTheme();
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, mounted]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState, resolvedTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);