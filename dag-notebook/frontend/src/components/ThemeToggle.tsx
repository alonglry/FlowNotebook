import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useGraphStore } from '../store/useGraphStore';

interface ThemeToggleProps {
  className?: string;
  variant?: 'subtle' | 'pill' | 'header';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', variant = 'header' }) => {
  const theme = useGraphStore((state) => state.theme);
  const toggleTheme = useGraphStore((state) => state.toggleTheme);

  const isDark = theme === 'dark';

  if (variant === 'pill') {
    return (
      <button
        onClick={toggleTheme}
        type="button"
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
          isDark
            ? 'bg-slate-800/90 hover:bg-slate-750 border border-slate-700 text-amber-300 hover:text-amber-200'
            : 'bg-white hover:bg-slate-100 border border-slate-200 text-indigo-600 hover:text-indigo-700 shadow-xs'
        } ${className}`}
      >
        {isDark ? (
          <>
            <Sun className="w-3.5 h-3.5 text-amber-400 animate-in spin-in-90 duration-200" />
            <span className="text-slate-200 font-sans">Light</span>
          </>
        ) : (
          <>
            <Moon className="w-3.5 h-3.5 text-indigo-600 animate-in spin-in-90 duration-200" />
            <span className="text-slate-700 font-sans">Dark</span>
          </>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label="Toggle theme"
      className={`relative p-2 rounded-xl transition-all duration-200 flex items-center justify-center cursor-pointer ${
        isDark
          ? 'bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-amber-300 hover:text-amber-200 shadow-xs active:scale-95'
          : 'bg-slate-100/90 hover:bg-slate-200/90 border border-slate-200 text-indigo-600 hover:text-indigo-700 shadow-xs active:scale-95'
      } ${className}`}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 transition-transform duration-200 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-indigo-600 transition-transform duration-200 hover:-rotate-12" />
      )}
    </button>
  );
};
