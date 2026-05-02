import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare, Activity, BarChart3, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import moment from 'moment';

const ReadOnlyChatModal = lazy(() =>
    import('./ReadOnlyChatModal').then((m) => ({ default: m.ReadOnlyChatModal })),
);

interface Stats {
    totalChats: number;
    totalMessages: number;
    todayChats: number;
}

interface SessionRow {
    sessionId: string;
    messageCount: number;
    createdAt: string;
    expiresAt: string;
}

const MERMAID_DIAGRAM = `graph TD
    User((User)) -->|Lands on Home| AgentUI
    AgentUI -->|chat_session_id localStorage| ChatAPI
    ChatAPI -->|Save messages| MongoDB[(MongoDB chats)]
    AgentUI -->|Toggle| ThemeStore
    DashboardPage -->|Fetch| StatsAPI[Stats API]
    DashboardPage -->|Fetch| SessionsAPI[Sessions API]
    StatsAPI -->|Query| MongoDB
    SessionsAPI -->|Query| MongoDB`;

function MermaidDiagram() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [svg, setSvg] = useState('');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const mermaid = (await import('mermaid')).default;
            if (cancelled) return;
            mermaid.initialize({
                startOnLoad: false,
                theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
                securityLevel: 'loose',
            });
            try {
                const { svg } = await mermaid.render('mermaid-arch', MERMAID_DIAGRAM);
                if (!cancelled) setSvg(svg);
            } catch (e) {
                console.error(e);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className="overflow-x-auto p-4 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700"
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
}

const SESSIONS_PAGE_SIZE = 10;

export const Dashboard = () => {
    const [stats, setStats] = useState<Stats | null>(null);
    const [sessions, setSessions] = useState<SessionRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [chatModal, setChatModal] = useState<{ sessionId: string } | null>(null);
    const [page, setPage] = useState(1);

    useEffect(() => {
        const ctrl = new AbortController();
        const t = window.setTimeout(() => ctrl.abort(), 30_000);

        Promise.all([
            fetch('/api/dashboard-stats', { signal: ctrl.signal }).then((r) => r.json()),
            fetch('/api/admin/sessions', { signal: ctrl.signal }).then((r) => r.json()),
        ])
            .then(([statsData, sessionsData]) => {
                setStats(statsData);
                setSessions(sessionsData.sessions || []);
            })
            .catch(console.error)
            .finally(() => {
                window.clearTimeout(t);
                setLoading(false);
            });

        return () => {
            window.clearTimeout(t);
            ctrl.abort();
        };
    }, []);

    const sortedSessions = useMemo(() => {
        const time = (iso: string) => {
            const t = new Date(iso).getTime();
            return Number.isFinite(t) ? t : -Infinity;
        };

        return [...sessions].sort((a, b) => time(b.expiresAt) - time(a.expiresAt));
    }, [sessions]);

    const totalPages = Math.max(1, Math.ceil(sortedSessions.length / SESSIONS_PAGE_SIZE));
    const safePage = Math.min(page, totalPages);

    useEffect(() => {
        setPage((p) => Math.min(p, totalPages));
    }, [totalPages]);

    const paginatedSessions = useMemo(() => {
        const start = (safePage - 1) * SESSIONS_PAGE_SIZE;
        return sortedSessions.slice(start, start + SESSIONS_PAGE_SIZE);
    }, [sortedSessions, safePage]);

    const rangeStart = sortedSessions.length === 0 ? 0 : (safePage - 1) * SESSIONS_PAGE_SIZE + 1;
    const rangeEnd = Math.min(safePage * SESSIONS_PAGE_SIZE, sortedSessions.length);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
                <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
        );
    }

    const statCards = [
        { label: 'Total Sessions', value: stats?.totalChats ?? 0, icon: <Activity size={20} />, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/50' },
        { label: 'Total Messages', value: stats?.totalMessages ?? 0, icon: <MessageSquare size={20} />, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50' },
        { label: 'Today Sessions', value: stats?.todayChats ?? 0, icon: <BarChart3 size={20} />, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/50' },
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
            <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <a href="/" className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" aria-label="Back to chat">
                            <ArrowLeft size={18} className="text-slate-500" />
                        </a>
                        <img
                            src="/logo.png"
                            alt=""
                            width={36}
                            height={36}
                            className="h-9 w-9 object-contain"
                            decoding="async"
                        />
                        <h1 className="text-xl font-bold">Dashboard</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        <div className="hidden md:block text-xs text-slate-400 dark:text-slate-500 font-mono uppercase tracking-widest">
                            Public Analytics
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                {/* Sessions Table */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                        <h2 className="text-lg font-bold">Sessions</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sessions.length} guest chat sessions</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                                    <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Session ID</th>
                                    <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Messages</th>
                                    <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Created</th>
                                    <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Expires</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {sortedSessions.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500">
                                            No sessions yet
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedSessions.map((s) => (
                                        <tr key={s.sessionId} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-3">
                                                <span className="font-mono text-xs text-slate-700 dark:text-slate-300" title={s.sessionId}>
                                                    {s.sessionId.slice(0, 8)}…
                                                </span>
                                            </td>
                                            <td className="px-6 py-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setChatModal({ sessionId: s.sessionId })}
                                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950 transition-colors text-xs font-bold"
                                                >
                                                    <MessageSquare size={12} />
                                                    {s.messageCount}
                                                </button>
                                            </td>
                                            <td className="px-6 py-3 text-slate-500 dark:text-slate-400 text-xs">
                                                {moment(s.createdAt).isValid() ? (
                                                    <span title={moment(s.createdAt).format('YYYY-MM-DD HH:mm')}>
                                                        {moment(s.createdAt).fromNow()}
                                                    </span>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                            <td className="px-6 py-3 text-slate-500 dark:text-slate-400 text-xs">
                                                {moment(s.expiresAt).isValid() ? (
                                                    <span title={moment(s.expiresAt).format('YYYY-MM-DD HH:mm')}>
                                                        {moment(s.expiresAt).fromNow()}
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
                    {sortedSessions.length > 0 && totalPages > 1 && (
                        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/80 dark:bg-slate-800/30">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Showing <span className="font-medium text-slate-700 dark:text-slate-300">{rangeStart}</span>
                                {'–'}
                                <span className="font-medium text-slate-700 dark:text-slate-300">{rangeEnd}</span>
                                {' '}of <span className="font-medium text-slate-700 dark:text-slate-300">{sortedSessions.length}</span>
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
                    {sortedSessions.length > 0 && totalPages === 1 && (
                        <div className="px-6 py-2.5 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/20">
                            Showing all {sortedSessions.length} session{sortedSessions.length !== 1 ? 's' : ''}
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
                <Suspense fallback={null}>
                    <ReadOnlyChatModal
                        isOpen
                        onClose={() => setChatModal(null)}
                        sessionId={chatModal.sessionId}
                    />
                </Suspense>
            )}
        </div>
    );
};
