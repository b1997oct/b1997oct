import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Users, MessageSquare, Activity, BarChart3, Sun, Moon, Monitor, Shield, ShieldOff, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { ReadOnlyChatModal } from './ReadOnlyChatModal';
import mermaid from 'mermaid';
import moment from 'moment';

interface Stats {
    totalUsers: number;
    totalChats: number;
    totalMessages: number;
    todayChats: number;
}

interface UserRow {
    _id: string;
    username: string;
    theme: string;
    client_control: boolean;
    createdAt: string;
    messageCount: number;
}

const MERMAID_DIAGRAM = `graph TD
    User((User)) -->|Lands on Home| AgentUI
    AgentUI -->|Resolve user| LocalStorageCheck[localStorage user_id]
    LocalStorageCheck -->|Guest or valid id| GuestChat[Default profile chat README]
    GuestChat -->|First message or Sign in| OnboardingModal
    OnboardingModal -->|Calls| GeneratorAPI[Username Generator API]
    OnboardingModal -->|Submit| UserAPI[User API]
    UserAPI -->|Save| MongoDB[(MongoDB Users)]
    AgentUI -->|Chat| ChatAPI
    ChatAPI -->|Link userId| MongoDB
    DashboardPage -->|Fetch| StatsAPI[Stats and User List API]
    StatsAPI -->|Query| MongoDB`;

function MermaidDiagram() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [svg, setSvg] = useState('');

    useEffect(() => {
        mermaid.initialize({
            startOnLoad: false,
            theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
            securityLevel: 'loose',
        });

        mermaid.render('mermaid-arch', MERMAID_DIAGRAM).then(({ svg }) => {
            setSvg(svg);
        }).catch(console.error);
    }, []);

    return (
        <div
            ref={containerRef}
            className="overflow-x-auto p-4 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700"
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
}

const themeIcons: Record<string, React.ReactNode> = {
    light: <Sun size={14} className="text-amber-500" />,
    dark: <Moon size={14} className="text-blue-400" />,
    system: <Monitor size={14} className="text-slate-400" />,
};

const USERS_PAGE_SIZE = 10;

export const Dashboard = () => {
    const [stats, setStats] = useState<Stats | null>(null);
    const [users, setUsers] = useState<UserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [chatModal, setChatModal] = useState<{ userId: string; username: string } | null>(null);
    const [page, setPage] = useState(1);

    useEffect(() => {
        Promise.all([
            fetch('/api/dashboard-stats').then(r => r.json()),
            fetch('/api/admin/users').then(r => r.json()),
        ])
            .then(([statsData, usersData]) => {
                setStats(statsData);
                setUsers(usersData.users || []);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const sortedUsers = useMemo(() => {
        const time = (iso: string) => {
            const t = new Date(iso).getTime();
            return Number.isFinite(t) ? t : -Infinity;
        };

        return [...users].sort((a, b) => time(b.createdAt) - time(a.createdAt));
    }, [users]);

    const totalPages = Math.max(1, Math.ceil(sortedUsers.length / USERS_PAGE_SIZE));
    const safePage = Math.min(page, totalPages);

    useEffect(() => {
        setPage((p) => Math.min(p, totalPages));
    }, [totalPages]);

    const paginatedUsers = useMemo(() => {
        const start = (safePage - 1) * USERS_PAGE_SIZE;
        return sortedUsers.slice(start, start + USERS_PAGE_SIZE);
    }, [sortedUsers, safePage]);

    const rangeStart = sortedUsers.length === 0 ? 0 : (safePage - 1) * USERS_PAGE_SIZE + 1;
    const rangeEnd = Math.min(safePage * USERS_PAGE_SIZE, sortedUsers.length);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
                <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
        );
    }

    const statCards = [
        { label: 'Total Users', value: stats?.totalUsers ?? 0, icon: <Users size={20} />, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/50' },
        { label: 'Total Messages', value: stats?.totalMessages ?? 0, icon: <MessageSquare size={20} />, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50' },
        { label: 'Active Sessions', value: stats?.totalChats ?? 0, icon: <Activity size={20} />, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/50' },
        { label: 'Today Sessions', value: stats?.todayChats ?? 0, icon: <BarChart3 size={20} />, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/50' },
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
            <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <a href="/" className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            <ArrowLeft size={18} className="text-slate-500" />
                        </a>
                        <h1 className="text-xl font-bold">Dashboard</h1>
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 font-mono uppercase tracking-widest">
                        Public Analytics
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {statCards.map((card) => (
                        <div key={card.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${card.color}`}>
                                {card.icon}
                            </div>
                            <p className="text-2xl font-bold">{card.value}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider font-medium">{card.label}</p>
                        </div>
                    ))}
                </div>

                {/* Users Table */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                        <h2 className="text-lg font-bold">Users</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{users.length} registered users</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                                    <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Username</th>
                                    <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Theme</th>
                                    <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Agent Control</th>
                                    <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Messages</th>
                                    <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Joined</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {sortedUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500">
                                            No users yet
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedUsers.map((u) => (
                                        <tr key={u._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-linear-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-[10px] text-white font-bold">
                                                        {u.username.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="font-medium">{u.username}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-1.5">
                                                    {themeIcons[u.theme] || themeIcons.system}
                                                    <span className="capitalize text-slate-600 dark:text-slate-400">{u.theme}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3">
                                                {u.client_control ? (
                                                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                                        <Shield size={14} /> Enabled
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-slate-400">
                                                        <ShieldOff size={14} /> Disabled
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setChatModal({ userId: u._id, username: u.username })}
                                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950 transition-colors text-xs font-bold"
                                                >
                                                    <MessageSquare size={12} />
                                                    {u.messageCount}
                                                </button>
                                            </td>
                                            <td className="px-6 py-3 text-slate-500 dark:text-slate-400 text-xs">
                                                {moment(u.createdAt).isValid() ? (
                                                    <span title={moment(u.createdAt).format('YYYY-MM-DD HH:mm')}>
                                                        {moment(u.createdAt).fromNow()}
                                                    </span>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {sortedUsers.length > 0 && totalPages > 1 && (
                        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/80 dark:bg-slate-800/30">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Showing <span className="font-medium text-slate-700 dark:text-slate-300">{rangeStart}</span>
                                {'–'}
                                <span className="font-medium text-slate-700 dark:text-slate-300">{rangeEnd}</span>
                                {' '}of <span className="font-medium text-slate-700 dark:text-slate-300">{sortedUsers.length}</span>
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={safePage <= 1}
                                    onClick={() => setPage(safePage - 1)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                                >
                                    <ChevronLeft size={14} />
                                    Previous
                                </button>
                                <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums px-2">
                                    Page {safePage} of {totalPages}
                                </span>
                                <button
                                    type="button"
                                    disabled={safePage >= totalPages}
                                    onClick={() => setPage(safePage + 1)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                                >
                                    Next
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                    {sortedUsers.length > 0 && totalPages === 1 && (
                        <div className="px-6 py-2.5 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/20">
                            Showing all {sortedUsers.length} user{sortedUsers.length !== 1 ? 's' : ''}
                        </div>
                    )}
                </div>

                {/* Architecture Diagram */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                    <h2 className="text-lg font-bold mb-4">Architecture</h2>
                    <MermaidDiagram />
                </div>
            </main>

            {chatModal && (
                <ReadOnlyChatModal
                    isOpen
                    onClose={() => setChatModal(null)}
                    userId={chatModal.userId}
                    username={chatModal.username}
                />
            )}
        </div>
    );
};
