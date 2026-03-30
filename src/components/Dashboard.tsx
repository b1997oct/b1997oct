import React, { useEffect, useState, useRef } from 'react';
import { Users, MessageSquare, Activity, BarChart3, Sun, Moon, Monitor, Shield, ShieldOff, ArrowLeft } from 'lucide-react';
import { ReadOnlyChatModal } from './ReadOnlyChatModal';
import mermaid from 'mermaid';

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
    AgentUI -->|Check localStorage| OnboardingModal
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

export const Dashboard = () => {
    const [stats, setStats] = useState<Stats | null>(null);
    const [users, setUsers] = useState<UserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [chatModal, setChatModal] = useState<{ userId: string; username: string } | null>(null);

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
                                {users.map((u) => (
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
                                            {new Date(u.createdAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500">
                                            No users yet
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
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
