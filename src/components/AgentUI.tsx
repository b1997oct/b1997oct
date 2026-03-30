import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { UserProfile } from './UserProfile';
import { OnboardingModal } from './OnboardingModal';
import { ConfirmModal } from './ConfirmModal';

interface UserData {
    _id: string;
    username: string;
    theme: 'light' | 'dark' | 'system';
    client_control: boolean;
}

interface AgentUIProps {
    initialMessage?: string;
}

export const AgentUI = ({ initialMessage }: AgentUIProps) => {
    const [prompt, setPrompt] = useState('');
    const [results, setResults] = useState<{ role: 'user' | 'agent', text: string }[]>([]);
    const [isTypingInitial, setIsTypingInitial] = useState(false);
    const [displayedInitial, setDisplayedInitial] = useState('');
    const [loading, setLoading] = useState(false);
    const [historyLoaded, setHistoryLoaded] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [user, setUser] = useState<UserData | null>(null);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [userChecked, setUserChecked] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = (smooth = false) => {
        if (scrollRef.current) {
            const scrollContainer = scrollRef.current;
            const behavior = smooth ? 'smooth' : 'auto';
            
            const doScroll = () => {
                scrollContainer.scrollTo({
                    top: scrollContainer.scrollHeight,
                    behavior
                });
            };

            // Immediate scroll
            doScroll();

            // Multi-stage catch to handle late layout shifts (like Markdown or syntax highlighting)
            setTimeout(() => {
                requestAnimationFrame(doScroll);
            }, 100);
        }
    };

    // Load user from localStorage on mount
    useEffect(() => {
        const storedUserId = localStorage.getItem('user_id');
        if (storedUserId) {
            fetch(`/api/user?userId=${storedUserId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.user) {
                        setUser(data.user);
                        const theme = data.user.theme || 'system';
                        localStorage.setItem('theme', theme);
                        applyThemeToDOM(theme);
                    } else {
                        setShowOnboarding(true);
                    }
                    setUserChecked(true);
                })
                .catch(() => {
                    setShowOnboarding(true);
                    setUserChecked(true);
                });
        } else {
            setShowOnboarding(true);
            setUserChecked(true);
        }
    }, []);

    const applyThemeToDOM = (theme: string) => {
        const root = document.documentElement;
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const effective = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
        if (effective === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    };

    const handleOnboardingComplete = (userData: { _id: string; username: string; theme: string; client_control: boolean }, restoredSessionId?: string | null) => {
        const u: UserData = {
            _id: userData._id,
            username: userData.username,
            theme: userData.theme as UserData['theme'],
            client_control: userData.client_control,
        };
        setUser(u);
        setShowOnboarding(false);
        setShowEditProfile(false);
        localStorage.setItem('user_id', u._id);
        localStorage.setItem('theme', u.theme);
        applyThemeToDOM(u.theme);

        if (restoredSessionId) {
            localStorage.setItem('chat_session_id', restoredSessionId);
            setSessionId(restoredSessionId);
            setResults([]);
            setDisplayedInitial('');
            setHistoryLoaded(false);
        }
    };

    const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
        if (user) {
            setUser({ ...user, theme });
            fetch('/api/user', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user._id, theme }),
            }).catch(console.error);
        }
    };

    // Initialize Session ID only after user is resolved (not during onboarding)
    useEffect(() => {
        if (!userChecked || showOnboarding) return;
        let id = localStorage.getItem('chat_session_id');
        if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem('chat_session_id', id);
        }
        setSessionId(id);
    }, [userChecked, showOnboarding]);

    // Load history when session ID is set
    useEffect(() => {
        if (!sessionId) return;

        const loadHistory = async () => {
            try {
                const res = await fetch(`/api/chat?sessionId=${sessionId}`);
                const data = await res.json();
                if (data.messages && data.messages.length > 0) {
                    const mappedMessages = data.messages.map((m: any) => ({
                        role: m.role === 'assistant' ? 'agent' : 'user',
                        text: m.content || m.text
                    }));
                    setResults(mappedMessages);
                    setIsTypingInitial(false);
                } else if (initialMessage) {
                    setResults([{ role: 'user', text: 'show profile' }]);
                    setIsTypingInitial(true);
                }
                setHistoryLoaded(true);
            } catch (err) {
                console.error("Failed to load history:", err);
                setHistoryLoaded(true);
            }
        };

        loadHistory();
    }, [sessionId, initialMessage]);

    const handleReset = () => {
        const newId = crypto.randomUUID();
        localStorage.setItem('chat_session_id', newId);
        setSessionId(newId);
        setResults([]);
        setDisplayedInitial('');
        setIsTypingInitial(true);
        setIsModalOpen(false);
    };

    // Initial message typing effect
    useEffect(() => {
        if (!initialMessage || !isTypingInitial) return;

        let index = 0;
        const interval = setInterval(() => {
            if (index < initialMessage.length) {
                setDisplayedInitial(initialMessage.slice(0, index + 1));
                index++;
            } else {
                const agentMsg = { role: 'agent' as const, text: initialMessage };
                setResults(prev => {
                    const newResults = [...prev, agentMsg];
                    if (sessionId) {
                        fetch('/api/chat', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                sessionId,
                                userId: user?._id,
                                saveOnly: true,
                                messages: newResults.map(m => ({
                                    role: m.role === 'agent' ? 'assistant' : 'user',
                                    content: m.text
                                }))
                            })
                        }).catch(err => console.error("Failed to save initial history:", err));
                    }
                    return newResults;
                });
                setIsTypingInitial(false);
                clearInterval(interval);
            }
        }, 1);

        return () => clearInterval(interval);
    }, [initialMessage, isTypingInitial, sessionId]);

    const chatReady = userChecked && !showOnboarding && !!user;

    // Combined results for rendering
    const allMessages = [
        ...results,
        ...(isTypingInitial ? [{ role: 'agent' as const, text: displayedInitial }] : [])
    ];

    // Auto-scroll to bottom of chat
    useEffect(() => {
        // Use smooth scroll for new messages, auto for typing phase to avoid stutter
        scrollToBottom(!isTypingInitial);
    }, [allMessages, loading, isTypingInitial]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading || isTypingInitial || !prompt.trim()) return;

        const userMsg = prompt;
        setResults(prev => [...prev, { role: 'user', text: userMsg }]);
        setPrompt('');
        setLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: userMsg, sessionId, userId: user?._id }),
            });

            const data = await response.json();
            setResults(prev => [...prev, { role: 'agent', text: data.response || 'No response from agent.' }]);
        } catch (err) {
            setResults(prev => [...prev, { role: 'agent', text: 'Error: Could not connect to agent.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-screen max-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden transition-colors duration-300">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-md z-10 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-linear-to-tr from-blue-500 to-purple-500 animate-pulse" />
                    <h1 className="text-xl md:text-2xl font-bold bg-linear-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                        Agent_B1997
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    {user && (
                        <UserProfile
                            username={user.username}
                            theme={user.theme}
                            onThemeChange={handleThemeChange}
                            onEditProfile={() => setShowEditProfile(true)}
                        />
                    )}
                    <div className="hidden md:block text-xs text-slate-400 dark:text-slate-500 font-mono tracking-widest uppercase">Neural Interface</div>
                </div>
            </header>

            {/* Chat Area - only render when user is resolved */}
            {chatReady ? (
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto px-4 py-8 md:px-6 custom-scrollbar"
                >
                    <div className="max-w-4xl mx-auto space-y-8">
                        {allMessages.map((res, i) => (
                            <div key={i} className={`flex ${res.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                <div className={`group relative max-w-[85%] md:max-w-[75%] px-5 py-4 rounded-2xl shadow-sm dark:shadow-xl wrap-break-word ${res.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-tr-none'
                                    : 'bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 text-slate-900 dark:text-slate-200 rounded-tl-none backdrop-blur-sm'
                                    }`}>
                                    {res.role === 'agent' ? (
                                        <div className="prose dark:prose-invert text-sm md:text-base max-w-none prose-p:leading-relaxed prose-pre:bg-slate-50 dark:prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-200 dark:prose-pre:border-slate-700 prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:font-bold hover:prose-a:underline transition-colors text-slate-800 dark:text-slate-100">
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
                                                    h3: ({ node, ...props }) => <h3 {...props} className="text-sm md:text-base font-bold mb-1" />
                                                }}
                                            >
                                                {res.text}
                                            </ReactMarkdown>
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
                                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 p-5 rounded-2xl rounded-tl-none flex gap-3 items-center backdrop-blur-sm shadow-sm dark:shadow-none">
                                    <div className="flex gap-1.5">
                                        <span className="w-2 h-2 bg-blue-400 dark:bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                        <span className="w-2 h-2 bg-blue-400 dark:bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                        <span className="w-2 h-2 bg-blue-400 dark:bg-blue-400 rounded-full animate-bounce"></span>
                                    </div>
                                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Processing request...</span>
                                </div>
                            </div>
                        )}

                        {!loading && !isTypingInitial && results.length > 0 && (
                            <div className="flex justify-center pt-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="group flex items-center gap-2 text-red-500/60 hover:text-red-500 transition-all active:scale-95 text-[10px] font-bold uppercase"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-12 transition-transform"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                                    <span className="group-hover:underline dark:text-white decoration-red-500/50 underline-offset-4">Clear chat history</span>
                                </button>
                            </div>
                        )}
                        
                        {/* Dummy div for scrolling */}
                        <div ref={messagesEndRef} />
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-linear-to-tr from-blue-500 to-purple-500 animate-pulse" />
                        <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">Setting up your experience...</p>
                    </div>
                </div>
            )}

            {/* Onboarding Modal (first-time) */}
            <OnboardingModal
                isOpen={showOnboarding}
                onComplete={handleOnboardingComplete}
            />

            {/* Edit Profile Modal */}
            <OnboardingModal
                isOpen={showEditProfile}
                editUser={user}
                onClose={() => setShowEditProfile(false)}
                onComplete={handleOnboardingComplete}
            />

            {/* Confirm Reset Modal */}
            <ConfirmModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleReset}
                description="Resetting the chat will permanently clear your current conversation history from this session. You will start a fresh session with the agent."
            />

            {/* Fixed Input Bar */}
            {chatReady && <div className="shrink-0 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 p-4 md:p-6 pb-8 md:pb-10 transition-all duration-300">
                <div 
                    className={`max-w-4xl mx-auto flex flex-nowrap overflow-x-auto gap-2 px-2 pb-2 custom-scrollbar no-scrollbar md:flex-wrap md:overflow-visible transition-all duration-500 ease-in-out ${
                        !prompt.trim() 
                            ? 'max-h-20 opacity-100 mb-4 scale-100 translate-y-0' 
                            : 'max-h-0 opacity-0 mb-0 scale-95 -translate-y-4 pointer-events-none'
                    }`}
                >
                    {[
                        "Who are your best friends?",
                        "What are your top skills?",
                        "Tell me about your projects",
                        "How can I contact you?"
                        ].map((suggestion, idx) => (
                        <button
                            key={idx}
                            onClick={() => setPrompt(suggestion)}
                            className="shrink-0 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 transition-all active:scale-95"
                        >
                            {suggestion}
                        </button>
                    ))}
                </div>
                <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative group">
                    <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Ask Question..."
                        className="w-full bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl pl-6 pr-32 py-4 md:py-5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-md dark:shadow-lg text-sm md:text-base"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 pr-2">
                        <button
                            type="submit"
                            disabled={loading || isTypingInitial || !prompt.trim()}
                            className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 px-6 py-2.5 md:py-3 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center min-w-[80px] text-white"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                'Send'
                            )}
                        </button>
                    </div>
                </form>
                <div className="max-w-4xl mx-auto mt-3 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-600 uppercase tracking-widest font-bold px-2">
                    <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                        Neural Link Established
                    </div>
                    <div>v1.0.4-stable</div>
                </div>
            </div>}
        </div>
    );
};
