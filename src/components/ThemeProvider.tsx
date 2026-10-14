// src/components/ThemeProvider.tsx
'use client';

import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';

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
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      try {
        return (localStorage.getItem('theme') as Theme) || 'system';
      } catch {}
    }
    return 'system';
  });
  const [mounted, setMounted] = useState(false);
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('theme');
        if (saved === 'dark') return 'dark';
        if (saved === 'light') return 'light';
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } catch {}
    }
    return 'light';
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useIsomorphicLayoutEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const isDark = theme === 'system' ? mediaQuery.matches : theme === 'dark';
      if (isDark) {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
        setResolvedTheme('dark');
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
        setResolvedTheme('light');
      }
    };

    applyTheme();
    try {
      if (mounted) {
        localStorage.setItem('theme', theme);
      }
    } catch {}

    const handleChange = () => {
      if (theme === 'system') applyTheme();
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