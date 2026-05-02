import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { ArrowLeft, Eye, MessageSquare } from 'lucide-react';

interface ReadOnlyChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    sessionId: string;
}

interface ChatMessage {
    role: string;
    content: string;
}

export const ReadOnlyChatModal = ({ isOpen, onClose, sessionId }: ReadOnlyChatModalProps) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen || !sessionId) return;

        setLoading(true);
        fetch(`/api/admin/chat-history?sessionId=${encodeURIComponent(sessionId)}`)
            .then((res) => res.json())
            .then((data) => {
                setMessages(data.messages || []);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [isOpen, sessionId]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div
                className="w-full max-w-3xl max-h-[min(90vh,800px)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300 flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="shrink-0 flex items-center justify-between gap-3 px-4 py-4 border-b border-b-gray-300 dark:border-b-gray-700">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors active:scale-95 shrink-0"
                            aria-label="Back"
                        >
                            <ArrowLeft size={20} strokeWidth={2.5} />
                        </button>
                    </div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white truncate font-mono">
                        {sessionId.slice(0, 8)}…
                    </h2>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 text-[10px] font-bold uppercase tracking-wide border border-amber-200 dark:border-amber-900 shrink-0">
                        <Eye size={12} />
                        Read only
                    </span>
                </header>

                <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 custom-scrollbar">
                    <div className="max-w-2xl mx-auto space-y-4">
                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="text-center py-12 text-slate-500 dark:text-slate-400 text-sm flex flex-col items-center gap-2">
                                <MessageSquare size={28} className="opacity-40" />
                                No messages in this session
                            </div>
                        ) : (
                            messages.map((msg, i) => {
                                const isUser = msg.role === 'user';
                                return (
                                    <div
                                        key={i}
                                        className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm wrap-break-word ${isUser
                                                ? 'bg-blue-600 text-white rounded-tr-none'
                                                : 'bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 text-slate-900 dark:text-slate-200 rounded-tl-none'
                                                }`}
                                        >
                                            {isUser ? (
                                                <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                                            ) : (
                                                <div className="prose dark:prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-slate-50 dark:prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-200 dark:prose-pre:border-slate-700 prose-a:text-blue-600 dark:prose-a:text-blue-400">
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkGfm]}
                                                        rehypePlugins={[rehypeRaw]}
                                                        components={{
                                                            a: ({ node, ...props }) => (
                                                                <a {...props} target="_blank" rel="noopener noreferrer" />
                                                            ),
                                                            p: ({ node, ...props }) => (
                                                                <p {...props} className="leading-relaxed mb-2 last:mb-0" />
                                                            ),
                                                        }}
                                                    >
                                                        {msg.content || ''}
                                                    </ReactMarkdown>
                                                </div>
                                            )}
                                            <div
                                                className={`mt-1.5 text-[10px] opacity-70 ${isUser ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}
                                            >
                                                {isUser ? 'User' : 'Agent'}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <footer className="shrink-0 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 px-4 py-3">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                        Read-only preview of a guest chat session.
                    </p>
                </footer>
            </div>
        </div>
    );
};
