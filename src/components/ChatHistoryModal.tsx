import React, { useEffect, useState } from 'react';
import { X, MessageSquare } from 'lucide-react';

interface ChatSession {
    sessionId: string;
    messages: { role: string; content: string }[];
    expiresAt: string;
}

interface ChatHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    username: string;
}

export const ChatHistoryModal = ({ isOpen, onClose, userId, username }: ChatHistoryModalProps) => {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedSession, setExpandedSession] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen || !userId) return;

        setLoading(true);
        fetch(`/api/admin/chat-history?userId=${userId}`)
            .then(res => res.json())
            .then(data => {
                setSessions(data.sessions || []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [isOpen, userId]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div
                className="w-full max-w-2xl max-h-[80vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300 flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Chat History</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{username}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <X size={18} className="text-slate-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 dark:text-slate-400 text-sm">
                            No chat history found
                        </div>
                    ) : (
                        sessions.map((session) => (
                            <div key={session.sessionId} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                                <button
                                    onClick={() => setExpandedSession(expandedSession === session.sessionId ? null : session.sessionId)}
                                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <MessageSquare size={14} className="text-blue-500" />
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                            {session.messages.length} messages
                                        </span>
                                    </div>
                                    <span className="text-xs text-slate-400">
                                        {session.sessionId.slice(0, 8)}...
                                    </span>
                                </button>

                                {expandedSession === session.sessionId && (
                                    <div className="border-t border-slate-200 dark:border-slate-800 px-4 py-3 space-y-2 max-h-60 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50">
                                        {session.messages.map((msg, idx) => (
                                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[80%] px-3 py-2 rounded-lg text-xs ${
                                                    msg.role === 'user'
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                                }`}>
                                                    {msg.content?.slice(0, 200)}{msg.content?.length > 200 ? '...' : ''}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
