import { create } from 'zustand';

export type Theme = 'light' | 'dark' | 'system';

export interface UserData {
    _id: string;
    username: string;
    theme: Theme;
    client_control: boolean;
}

interface UserStore {
    user: UserData | null;
    theme: Theme;
    setUser: (user: UserData | null) => void;
    setTheme: (theme: Theme) => void;
    applyThemeToDOM: (theme: Theme) => void;
}

export const useUserStore = create<UserStore>((set, get) => ({
    user: null,
    theme: 'system',
    setUser: (user) => {
        set({ user });
        if (user) {
            get().setTheme(user.theme);
        }
    },
    setTheme: (theme) => {
        set({ theme });
        if (get().user) {
            set((state) => ({ user: state.user ? { ...state.user, theme } : null }));
        }
        localStorage.setItem('theme', theme);
        get().applyThemeToDOM(theme);
    },
    applyThemeToDOM: (theme) => {
        if (typeof window === 'undefined') return;
        const root = document.documentElement;
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const effective = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
        if (effective === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }
}));
