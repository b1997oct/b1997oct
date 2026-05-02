import { create } from 'zustand';

const STORAGE_KEY = 'theme';

export type ThemeMode = 'light' | 'dark';

type ThemeState = {
    resolved: ThemeMode;
    setTheme: (mode: ThemeMode) => void;
    toggle: () => void;
};

function readStoredTheme(): ThemeMode | null {
    try {
        if (typeof localStorage === 'undefined') return null;
        const v = localStorage.getItem(STORAGE_KEY);
        if (v === 'dark' || v === 'light') return v;
    } catch {
        /* ignore */
    }
    return null;
}

export function getInitialTheme(): ThemeMode {
    const stored = readStoredTheme();
    if (stored) return stored;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
}

export function applyThemeToDocument(mode: ThemeMode) {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (mode === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
}

export const useThemeStore = create<ThemeState>((set, get) => ({
    resolved: getInitialTheme(),
    setTheme: (mode) => {
        try {
            localStorage.setItem(STORAGE_KEY, mode);
        } catch {
            /* ignore */
        }
        applyThemeToDocument(mode);
        set({ resolved: mode });
    },
    toggle: () => {
        const next = get().resolved === 'dark' ? 'light' : 'dark';
        get().setTheme(next);
    },
}));
