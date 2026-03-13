import React, { useState, useRef, useEffect } from 'react';
import { User, Sun, Moon, Monitor, ChevronDown, Settings } from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

interface UserProfileProps {
    username: string;
    theme: Theme;
    onThemeChange: (theme: Theme) => void;
    onEditProfile?: () => void;
}

export const UserProfile = ({ username, theme, onThemeChange, onEditProfile }: UserProfileProps) => {
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const applyTheme = (newTheme: Theme) => {
        const root = document.documentElement;
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const effective = newTheme === 'system' ? (systemDark ? 'dark' : 'light') : newTheme;

        if (effective === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('theme', newTheme);
        onThemeChange(newTheme);
    };

    const themeIcon = theme === 'dark' ? <Moon size={14} /> : theme === 'light' ? <Sun size={14} /> : <Monitor size={14} />;

    const themes: { value: Theme; label: string; icon: React.ReactNode }[] = [
        { value: 'light', label: 'Light', icon: <Sun size={14} /> },
        { value: 'dark', label: 'Dark', icon: <Moon size={14} /> },
        { value: 'system', label: 'System', icon: <Monitor size={14} /> },
    ];

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-sm"
            >
                <div className="w-6 h-6 rounded-full bg-linear-to-tr from-blue-500 to-purple-500 flex items-center justify-center">
                    <User size={12} className="text-white" />
                </div>
                <span className="text-slate-700 dark:text-slate-300 font-medium hidden md:inline max-w-[120px] truncate">
                    {username}
                </span>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">Signed in as</p>
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate mt-0.5">{username}</p>
                    </div>
                    {onEditProfile && (
                        <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                            <button
                                onClick={() => {
                                    onEditProfile();
                                    setOpen(false);
                                }}
                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                            >
                                <Settings size={14} />
                                <span>Edit Profile</span>
                            </button>
                        </div>
                    )}
                    <div className="p-2">
                        <p className="px-2 py-1 text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">Theme</p>
                        {themes.map((t) => (
                            <button
                                key={t.value}
                                onClick={() => {
                                    applyTheme(t.value);
                                    setOpen(false);
                                }}
                                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-all ${
                                    theme === t.value
                                        ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                {t.icon}
                                <span>{t.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
