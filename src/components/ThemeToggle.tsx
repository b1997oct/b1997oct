import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';

export const ThemeToggle = () => {
    const resolved = useThemeStore((s) => s.resolved);
    const toggle = useThemeStore((s) => s.toggle);

    const isDark = resolved === 'dark';

    return (
        <button
            type="button"
            onClick={() => toggle()}
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 transition hover:bg-slate-100 active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
    );
};
