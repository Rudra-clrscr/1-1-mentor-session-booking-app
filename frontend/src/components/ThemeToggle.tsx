'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { usePathname } from 'next/navigation';

interface ThemeToggleProps {
  floating?: boolean;
  className?: string;
}

export function ThemeToggle({
  floating = false,
  className = '',
}: ThemeToggleProps) {
  const [isDark, setIsDark] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsMounted(true);

    const savedTheme = localStorage.getItem('theme-preference');

    if (savedTheme) {
      const prefersDark = savedTheme === 'dark';
      setIsDark(prefersDark);
      applyTheme(prefersDark);
    } else {
      // fall back to default theme
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;

      setIsDark(prefersDark);
      applyTheme(prefersDark);
    }
  }, []);

  const applyTheme = (dark: boolean) => {
    const html = document.documentElement;

    if (dark) {
      html.classList.add('dark');
      html.setAttribute('data-theme', 'dark');
    } else {
      html.classList.remove('dark');
      html.setAttribute('data-theme', 'light');
    }

    localStorage.setItem('theme-preference', dark ? 'dark' : 'light');
  };

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    applyTheme(newTheme);
  };

  // for hydration mismatch
  if (!isMounted) {
    return null;
  }

  const isSessionPage =
    pathname?.startsWith('/session/') &&
    !pathname.endsWith('/join') &&
    pathname !== '/session/create';

  if (floating && isSessionPage) {
    return null;
  }

  if (floating) {
    return (
      <button
        onClick={toggleTheme}
        className={`fixed bottom-6 right-6 z-50 p-3.5 rounded-full bg-white/80 dark:bg-dark-900/80 text-gray-800 dark:text-gray-200 transition-all duration-300 hover:scale-110 hover:rotate-12 shadow-lg hover:shadow-glow-purple border border-gray-200 dark:border-gray-700/50 backdrop-blur-md cursor-pointer ${className}`}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        title={isDark ? 'Light mode' : 'Dark mode'}
      >
        {isDark ? (
          <Sun size={24} className="text-yellow-400" />
        ) : (
          <Moon size={24} className="text-indigo-400" />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 transition-colors hover:bg-gray-300 dark:hover:bg-gray-600 ${className}`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      {isDark ? (
        <Sun size={20} className="text-yellow-400" />
      ) : (
        <Moon size={20} className="text-slate-500" />
      )}
    </button>
  );
}