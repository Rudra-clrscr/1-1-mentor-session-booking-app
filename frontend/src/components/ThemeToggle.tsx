'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { usePathname } from 'next/navigation';

interface ThemeToggleProps {
  floating?: boolean;
  className?: string;
}

const OPTIONS = [
  { value: 'light', icon: Sun, label: 'Light mode' },
  { value: 'system', icon: Monitor, label: 'System default' },
  { value: 'dark', icon: Moon, label: 'Dark mode' },
] as const;

export function ThemeToggle({
  floating = false,
  className = '',
}: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // Avoid hydration mismatch: theme is only known after mount
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return null;
  }

  const isSessionPage =
    pathname?.startsWith('/session/') &&
    !pathname.endsWith('/join') &&
    pathname !== '/session/create';

  if (floating && isSessionPage) {
    return null;
  }

  const containerClasses = floating
    ? 'fixed bottom-6 right-6 z-50 shadow-lg hover:shadow-glow-purple'
    : '';

  return (
    <div
      role="group"
      aria-label="Theme"
      className={`flex items-center gap-1 rounded-full border border-gray-200 dark:border-gray-700/50 bg-white/80 dark:bg-dark-900/80 p-1 backdrop-blur-md transition-all duration-300 ${containerClasses} ${className}`}
    >
      {OPTIONS.map(({ value, icon: Icon, label }) => {
        const isActive = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-label={label}
            aria-pressed={isActive}
            title={label}
            className={`rounded-full p-1.5 transition-all duration-200 cursor-pointer ${
              isActive
                ? 'bg-primary-600 text-white shadow-sm shadow-primary-500/50'
                : 'text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-dark-800'
            }`}
          >
            <Icon size={floating ? 18 : 16} />
          </button>
        );
      })}
    </div>
  );
}
