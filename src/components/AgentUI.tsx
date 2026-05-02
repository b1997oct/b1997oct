import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Loader2, SendHorizontal } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { FloatingBotAssistant } from './FloatingBotAssistant';
import { ThemeToggle } from './ThemeToggle';

import { useThemeStore } from '../store/themeStore';

type Message = { role: 'user' | 'agent'; text: string };

/** Shared max width for header, message thread, and composer */
const CHAT_MAX = 'max-w-4xl mx-auto w-full';

export const AgentUI = () => {
    const [prompt, setPrompt] = useState('');
    const [results, setResults] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const setTheme = useThemeStore((s) => s.setTheme);
    const toggleTheme = useThemeStore((s) => s.toggle);
    const seededRef = useRef(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustComposerHeight = useCallback(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        const max = 168;
        el.style.height = `${Math.min(el.scrollHeight, max)}px`;
    }, []);

    const scrollToBottom = (smooth = false) => {
        if (scrollRef.current) {
            const scrollContainer = scrollRef.current;
            const behavior = smooth ? 'smooth' : 'auto';

            const doScroll = () => {
                scrollContainer.scrollTo({
                    top: scrollContainer.scrollHeight,
                    behavior,
                });
            };

            doScroll();

            setTimeout(() => {
                requestAnimationFrame(doScroll);
            }, 100);
        }
    };

    const applyAgentResponse = (data: { response?: string; clientActions?: any[] }) => {
        const responseText = data.response || 'No response from agent.';

        if (data.clientActions && data.clientActions.length > 0) {
            data.clientActions.forEach((action: any) => {
                if (action.type === 'CHANGE_THEME') {
                    const next = action.payload === 'dark' ? 'dark' : 'light';
                    setTheme(next);
                } else if (action.type === 'TOGGLE_THEME') {
                    toggleTheme();
                } else if (action.type === 'CLEAR_CHAT') {
                    setTimeout(() => setIsModalOpen(true), 1000);
                }
            });
        }

        setResults((prev) => [...prev, { role: 'agent', text: responseText }]);
    };

    const submitChatMessage = async (userMsg: string, sid: string) => {
        setLoading(true);
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: userMsg,
                    sessionId: sid,
                }),
            });

            const data = await response.json();
            applyAgentResponse(data);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            setResults((prev) => [...prev, { role: 'agent', text: '500 : ' + message }]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let id = localStorage.getItem('chat_session_id');
        if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem('chat_session_id', id);
        }
        setSessionId(id);
    }, []);

    useEffect(() => {
        if (!sessionId) return;
        seededRef.current = false;

        const loadHistory = async () => {
            try {
                const res = await fetch(`/api/chat?sessionId=${sessionId}`);
                const data = await res.json();
                if (data.messages && data.messages.length > 0) {
                    const mappedMessages: Message[] = data.messages.map((m: any) => ({
                        role: m.role === 'assistant' ? 'agent' : 'user',
                        text: m.content || m.text,
                    }));
                    setResults(mappedMessages);
                } else if (!seededRef.current) {
                    seededRef.current = true;
                    const seed = 'who are you?';
                    setResults([{ role: 'user', text: seed }]);
                    await submitChatMessage(seed, sessionId);
                }
            } catch (err) {
                console.error('Failed to load history:', err);
            }
        };

        loadHistory();
    }, [sessionId]);

    const handleReset = () => {
        const newId = crypto.randomUUID();
        localStorage.setItem('chat_session_id', newId);
        setResults([]);
        setIsModalOpen(false);
        setSessionId(newId);
    };

    useEffect(() => {
        scrollToBottom(true);
    }, [results, loading]);

    useEffect(() => {
        adjustComposerHeight();
    }, [prompt, adjustComposerHeight]);

    const sendMessage = useCallback(async () => {
        if (loading || !prompt.trim() || !sessionId) return;

        const userMsg = prompt.trim();
        setPrompt('');
        setResults((prev) => [...prev, { role: 'user', text: userMsg }]);
        await submitChatMessage(userMsg, sessionId);
    }, [loading, prompt, sessionId]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        void sendMessage();
    };

    const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key !== 'Enter' || e.shiftKey) return;
        e.preventDefault();
        void sendMessage();
    };

    const chatUnlocked = !!sessionId;

    return (
        <div className="relative flex flex-col h-screen max-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden transition-colors duration-300">
            {/* Frosted glass — styles in global.css (.glass-header) so blur reads through content */}
            <header className="glass-header fixed inset-x-0 top-0 z-30 min-h-14 shrink-0">
                <div className="px-4 pt-2 pb-2 md:px-5">
                    <div className={`${CHAT_MAX} flex items-center justify-between`}>
                        <div className="flex items-center min-h-9">
                            <img
                                src="/logo.png"
                                alt=""
                                width={32}
                                height={32}
                                className={`h-10 w-10 shrink-0 object-contain motion-reduce:animate-none ${loading ? 'animate-spin' : ''}`}
                                decoding="async"
                            />
                            <h1 className="text-base md:text-lg font-bold tracking-tight bg-linear-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                                Agent_B7
                            </h1>
                        </div>
                        <div className="flex items-center gap-3">
                            <ThemeToggle />
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex min-h-0 flex-1 flex-col pt-14">
            {chatUnlocked ? (
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto px-4 md:px-5 py-6 md:py-8 custom-scrollbar min-h-0 [-webkit-overflow-scrolling:touch]"
                >
                    <div className={`${CHAT_MAX} space-y-8`}>
                        {results.map((res, i) => (
                            <div key={i} className={`flex ${res.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                <div className={`group relative max-w-[85%] md:max-w-[75%] px-5 py-4 rounded-2xl shadow-sm dark:shadow-xl wrap-break-word ${res.role === 'user'
                                    ? 'rounded-tr-none bg-linear-to-br from-violet-600 to-indigo-600 text-white shadow-violet-500/20 dark:shadow-violet-900/30'
                                    : 'rounded-tl-none border border-emerald-200/70 bg-linear-to-br from-emerald-50/90 via-white to-slate-50/80 text-slate-900 backdrop-blur-sm dark:border-emerald-900/35 dark:bg-linear-to-br dark:from-emerald-950/25 dark:via-slate-900/95 dark:to-slate-950/90 dark:text-slate-100'
                                    }`}>
                                    {res.role === 'agent' ? (
                                        <div className="flex flex-col">
                                            <div className="prose dark:prose-invert prose-headings:text-slate-900 dark:prose-headings:text-slate-50 text-sm md:text-base max-w-none prose-p:leading-relaxed prose-p:text-slate-700 dark:prose-p:text-slate-300 prose-strong:text-slate-900 dark:prose-strong:text-slate-100 prose-code:text-emerald-800 dark:prose-code:text-emerald-200 prose-code:bg-emerald-100/80 dark:prose-code:bg-emerald-950/60 prose-code:px-1 prose-code:py-px prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none prose-pre:bg-slate-900 dark:prose-pre:bg-black/60 prose-pre:text-slate-100 prose-pre:border prose-pre:border-emerald-200/50 dark:prose-pre:border-emerald-800/50 prose-blockquote:border-l-emerald-500 prose-blockquote:text-slate-600 dark:prose-blockquote:text-slate-400 prose-a:text-teal-600 dark:prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:underline prose-a:font-semibold transition-colors">
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm]}
                                                    rehypePlugins={[rehypeRaw]}
                                                    components={{
                                                        a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
                                                        p: ({ node, ...props }) => <p {...props} className="text-sm md:text-base leading-relaxed mb-2 last:mb-0" />,
                                                        li: ({ node, ...props }) => <li {...props} className="text-sm md:text-base leading-relaxed" />,
                                                        ul: ({ node, ...props }) => <ul {...props} className="list-disc pl-4 mb-2" />,
                                                        ol: ({ node, ...props }) => <ol {...props} className="list-decimal pl-4 mb-2" />,
                                                        h1: ({ node, ...props }) => <h1 {...props} className="text-lg md:text-xl font-bold mb-2" />,
                                                        h2: ({ node, ...props }) => <h2 {...props} className="text-base md:text-lg font-bold mb-2" />,
                                                        h3: ({ node, ...props }) => <h3 {...props} className="text-sm md:text-base font-bold mb-1" />,
                                                    }}
                                                >
                                                    {res.text}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="whitespace-pre-wrap text-sm md:text-base leading-relaxed">{res.text}</div>
                                    )}

                                    <div className={`absolute -bottom-6 text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ${res.role === 'user' ? 'right-0' : 'left-0'}`}>
                                        <span className="font-bold uppercase tracking-tighter">{res.role === 'user' ? 'You' : 'Agent'}</span>
                                        <span>•</span>
                                        <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="flex justify-start">
                                <div className="flex gap-3 items-center rounded-2xl rounded-tl-none border border-emerald-200/70 bg-linear-to-br from-emerald-50/90 via-white to-slate-50/80 p-5 shadow-sm backdrop-blur-sm dark:border-emerald-900/35 dark:bg-linear-to-br dark:from-emerald-950/25 dark:via-slate-900/95 dark:to-slate-950/90 dark:shadow-none">
                                    <div className="flex gap-1.5">
                                        <span className="size-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-bounce [animation-delay:-0.3s]" />
                                        <span className="size-2 rounded-full bg-teal-500 dark:bg-teal-400 animate-bounce [animation-delay:-0.15s]" />
                                        <span className="size-2 rounded-full bg-cyan-500 dark:bg-cyan-400 animate-bounce" />
                                    </div>
                                    <span className="text-sm font-medium text-slate-600 dark:text-emerald-200/80">Processing request...</span>
                                </div>
                            </div>
                        )}

                        {!loading && results.length > 0 && (
                            <div className="flex flex-col items-center pt-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(true)}
                                    className="group flex items-center gap-2 text-red-500/60 hover:text-red-500 transition-all active:scale-95 text-[10px] font-bold uppercase"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-12 transition-transform"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                    <span className="group-hover:underline dark:text-white decoration-red-500/50 underline-offset-4">Clear chat history</span>
                                </button>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                </div>
            ) : (
                <div className="flex flex-1 items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-linear-to-tr from-blue-500 to-purple-500 animate-pulse" />
                        <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">Setting up your experience...</p>
                    </div>
                </div>
            )}
            </div>

            <ConfirmModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleReset}
                description="Resetting the chat will clear your current conversation view and start a fresh session with the agent. Previous sessions remain stored on the server."
            />

            {chatUnlocked && (
                <FloatingBotAssistant
                    composerRef={textareaRef}
                    composerEmpty={!prompt.trim()}
                    repositionEnabled={!isModalOpen}
                    onSuggestionSelect={setPrompt}
                />
            )}

            {chatUnlocked && (
                <div className="shrink-0 relative bg-linear-to-t from-white via-white/95 to-white/75 dark:from-slate-950 dark:via-slate-950/95 dark:to-transparent backdrop-blur-2xl border-t border-slate-200/60 dark:border-slate-800/60 pt-4 md:pt-5 pb-6 md:pb-8 transition-all duration-300 supports-backdrop-filter:from-white/90 supports-backdrop-filter:dark:from-slate-950/90">
                    <div
                        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-blue-400/35 dark:via-blue-400/25 to-transparent"
                        aria-hidden
                    />
                    <div className={CHAT_MAX}>
                    <div
                        className={`flex flex-nowrap overflow-x-auto gap-2 px-4 md:px-5 pb-2 custom-scrollbar no-scrollbar md:flex-wrap md:overflow-visible transition-all duration-500 ease-in-out ${!prompt.trim()
                            ? 'max-h-20 opacity-100 mb-3 scale-100 translate-y-0'
                            : 'max-h-0 opacity-0 mb-0 scale-95 -translate-y-4 pointer-events-none'
                            }`}
                    >
                        {[
                            'Change theme',
                            'Best friends?',
                            'Skills?',
                            'Projects?',
                            'How can I contact you?',
                        ].map((suggestion, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => setPrompt(suggestion)}
                                className="shrink-0 px-3.5 py-1.5 rounded-full bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-[11px] font-medium text-slate-600 dark:text-slate-400 shadow-sm hover:shadow-md hover:bg-blue-50/90 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-300 hover:border-blue-300/60 dark:hover:border-blue-600/40 transition-all active:scale-95"
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                    <form onSubmit={handleSubmit} className="mb-3 w-full min-w-0 px-4 md:px-5">
                        <div className="group relative rounded-[1.35rem] p-[1.5px] bg-linear-to-br from-blue-500/55 via-violet-500/45 to-emerald-500/50 shadow-[0_8px_32px_-8px_rgba(59,130,246,0.25)] dark:from-blue-400/35 dark:via-violet-400/30 dark:to-emerald-400/35 dark:shadow-[0_12px_40px_-12px_rgba(99,102,241,0.35)] transition-all duration-300 focus-within:shadow-[0_12px_40px_-8px_rgba(59,130,246,0.35)] focus-within:from-blue-500/75 focus-within:via-violet-500/60 focus-within:to-emerald-500/65 dark:focus-within:shadow-[0_16px_48px_-12px_rgba(99,102,241,0.45)]">
                            <div className="flex min-w-0 items-end gap-2 rounded-[1.28rem] bg-white/95 py-2 pl-4 pr-2 backdrop-blur-xl dark:bg-slate-900/92 dark:backdrop-blur-xl transition-colors">
                                <div className="relative min-w-0 flex-1 pb-0.5">
                                    <textarea
                                        ref={textareaRef}
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        onKeyDown={handleComposerKeyDown}
                                        placeholder="Message Agent_B7…"
                                        rows={1}
                                        aria-label="Chat message"
                                        className="peer min-h-[44px] max-h-[168px] w-full resize-none border-0 bg-transparent py-2.5 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 md:py-3 md:text-[15px] dark:text-slate-100 dark:placeholder:text-slate-500"
                                    />
                                    <p className="hidden sm:block pointer-events-none select-none text-[10px] text-slate-400/90 dark:text-slate-500 mt-0.5 opacity-0 transition-opacity duration-200 peer-focus-visible:opacity-100 tabular-nums">
                                        <kbd className="rounded border border-slate-200/80 bg-slate-50 px-1 py-px font-sans text-[9px] dark:border-slate-600 dark:bg-slate-800">Enter</kbd>
                                        {' '}to send ·{' '}
                                        <kbd className="rounded border border-slate-200/80 bg-slate-50 px-1 py-px font-sans text-[9px] dark:border-slate-600 dark:bg-slate-800">Shift</kbd>
                                        {' + '}
                                        <kbd className="rounded border border-slate-200/80 bg-slate-50 px-1 py-px font-sans text-[9px] dark:border-slate-600 dark:bg-slate-800">Enter</kbd>
                                        {' '}new line
                                    </p>
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading || !prompt.trim()}
                                    title={loading ? 'Sending…' : 'Send message'}
                                    className="group/btn mb-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-600/25 transition-all hover:scale-[1.04] hover:shadow-xl hover:shadow-blue-500/30 active:scale-95 disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-400 disabled:shadow-none disabled:hover:scale-100 dark:disabled:from-slate-800 dark:disabled:to-slate-800 dark:disabled:text-slate-500"
                                >
                                    {loading ? (
                                        <Loader2 className="h-5 w-5 animate-spin opacity-90" aria-hidden strokeWidth={2.25} />
                                    ) : (
                                        <SendHorizontal className="h-5 w-5 -translate-x-px transition-transform group-hover/btn:translate-x-0" aria-hidden strokeWidth={2.25} />
                                    )}
                                    <span className="sr-only">{loading ? 'Sending' : 'Send'}</span>
                                </button>
                            </div>
                        </div>
                    </form>

                    <div className="pt-2 px-4 md:px-5">
                        <p className="text-center text-[11px] md:text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            <span className="font-semibold text-slate-600 dark:text-slate-300">Portfolio assistant · </span>
                            Answers from Barath&apos;s public profile.
                        </p>
                    </div>
                    </div>
                </div>
            )}
        </div>
    );
};
