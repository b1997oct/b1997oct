import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface AgentUIProps {
    initialMessage?: string;
}

export const AgentUI = ({ initialMessage }: AgentUIProps) => {
    const [prompt, setPrompt] = useState('');
    const [results, setResults] = useState<{ role: 'user' | 'agent', text: string }[]>(
        initialMessage ? [{ role: 'user', text: 'show profile' }] : []
    );
    const [isTypingInitial, setIsTypingInitial] = useState(!!initialMessage);
    const [displayedInitial, setDisplayedInitial] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Initial message typing effect
    useEffect(() => {
        if (!initialMessage) return;

        let index = 0;
        const interval = setInterval(() => {
            if (index < initialMessage.length) {
                setDisplayedInitial(initialMessage.slice(0, index + 1));
                index++;
            } else {
                setResults(prev => [...prev, { role: 'agent', text: initialMessage }]);
                setIsTypingInitial(false);
                clearInterval(interval);
            }
        }, 1); // Very fast typing for large README

        return () => clearInterval(interval);
    }, [initialMessage]);

    // Combined results for rendering
    const allMessages = [
        ...results,
        ...(isTypingInitial ? [{ role: 'agent' as const, text: displayedInitial }] : [])
    ];

    // Auto-scroll to bottom of chat
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [allMessages, loading]);

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
                body: JSON.stringify({ prompt: userMsg }),
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
        <div className="flex flex-col h-screen max-h-screen bg-slate-950 text-slate-100 overflow-hidden">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md z-10 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-linear-to-tr from-blue-500 to-purple-500 animate-pulse" />
                    <h1 className="text-xl md:text-2xl font-bold bg-linear-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                        Agent_B1997
                    </h1>
                </div>
                <div className="hidden md:block text-xs text-slate-500 font-mono tracking-widest uppercase">Neural Interface</div>
            </header>

            {/* Chat Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-4 py-8 md:px-6 scroll-smooth custom-scrollbar"
            >
                <div className="max-w-4xl mx-auto space-y-8">
                    {allMessages.map((res, i) => (
                        <div key={i} className={`flex ${res.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                            <div className={`group relative max-w-[85%] md:max-w-[75%] px-5 py-4 rounded-2xl shadow-xl ${res.role === 'user'
                                ? 'bg-blue-600 text-white rounded-tr-none'
                                : 'bg-slate-800/80 border border-slate-700/50 text-slate-200 rounded-tl-none backdrop-blur-sm'
                                }`}>
                                {res.role === 'agent' ? (
                                    <div className="prose prose-invert prose-sm md:prose-base max-w-none prose-p:leading-relaxed prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-700">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            rehypePlugins={[rehypeRaw]}
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
                            <div className="bg-slate-800/50 border border-slate-700/50 p-5 rounded-2xl rounded-tl-none flex gap-3 items-center backdrop-blur-sm">
                                <div className="flex gap-1.5">
                                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></span>
                                </div>
                                <span className="text-sm font-medium text-slate-400">Processing request...</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Fixed Input Bar */}
            <div className="shrink-0 bg-slate-950 border-t border-slate-800 p-4 md:p-6 pb-8 md:pb-10">
                <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative group">
                    <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Ask Question..."
                        className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl pl-6 pr-32 py-4 md:py-5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-slate-100 placeholder:text-slate-500 shadow-lg text-sm md:text-base"
                        // disabled={loading || isTypingInitial}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 pr-2">
                        <button
                            type="submit"
                            disabled={loading || isTypingInitial || !prompt.trim()}
                            className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 px-6 py-2.5 md:py-3 rounded-xl font-bold transition-all shadow-md active:scale-95 flex items-center justify-center min-w-[80px]"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                'Send'
                            )}
                        </button>
                    </div>
                </form>
                <div className="max-w-4xl mx-auto mt-3 flex items-center justify-between text-[10px] text-slate-600 uppercase tracking-widest font-bold px-2">
                    <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                        Neural Link Established
                    </div>
                    <div>v1.0.4-stable</div>
                </div>
            </div>
        </div>
    );
};
