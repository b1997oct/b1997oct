import { type RefObject, useCallback, useEffect, useState } from 'react';

const BOT_IMG = '/cute-bot.png';
const BOT_SIZE = 72;
const MARGIN = 16;

function clamp(n: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, n));
}

function boundsForViewport() {
    const w = typeof window !== 'undefined' ? window.innerWidth : 400;
    const h = typeof window !== 'undefined' ? window.innerHeight : 700;
    return {
        x: clamp(w - BOT_SIZE - MARGIN, MARGIN, w - BOT_SIZE - MARGIN),
        y: clamp(h - BOT_SIZE - MARGIN, MARGIN, h - BOT_SIZE - MARGIN),
    };
}

function shouldIgnoreReposition(el: HTMLElement): boolean {
    return !!el.closest(
        [
            '[data-floating-bot]',
            'header',
            'button',
            'a[href]',
            'input',
            'textarea',
            'select',
            '[role="button"]',
            '[role="switch"]',
            'summary',
        ].join(','),
    );
}

type FloatingBotAssistantProps = {
    composerRef: RefObject<HTMLTextAreaElement | null>;
    /** Disabled while modals overlay the app so backdrop clicks stay predictable */
    repositionEnabled?: boolean;
};

export const FloatingBotAssistant = ({
    composerRef,
    repositionEnabled = true,
}: FloatingBotAssistantProps) => {
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [ready, setReady] = useState(false);
    const [instantMove, setInstantMove] = useState(false);

    useEffect(() => {
        const next = boundsForViewport();
        setPos(next);
        requestAnimationFrame(() => setReady(true));

        const onResize = () => {
            setPos((prev) => ({
                x: clamp(prev.x, MARGIN, window.innerWidth - BOT_SIZE - MARGIN),
                y: clamp(prev.y, MARGIN, window.innerHeight - BOT_SIZE - MARGIN),
            }));
        };

        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const sync = () => setInstantMove(mq.matches);
        sync();
        mq.addEventListener('change', sync);
        return () => mq.removeEventListener('change', sync);
    }, []);

    useEffect(() => {
        if (!repositionEnabled) return;

        const onPointerDown = (e: PointerEvent) => {
            if (!ready || e.button !== 0) return;
            const target = e.target;
            if (!(target instanceof HTMLElement)) return;
            if (shouldIgnoreReposition(target)) return;

            const x = clamp(
                e.clientX - BOT_SIZE / 2,
                MARGIN,
                window.innerWidth - BOT_SIZE - MARGIN,
            );
            const y = clamp(
                e.clientY - BOT_SIZE / 2,
                MARGIN,
                window.innerHeight - BOT_SIZE - MARGIN,
            );
            setPos({ x, y });
        };

        window.addEventListener('pointerdown', onPointerDown, { capture: true });
        return () => window.removeEventListener('pointerdown', onPointerDown, { capture: true });
    }, [ready, repositionEnabled]);

    const focusComposer = useCallback(() => {
        const el = composerRef.current;
        if (!el) return;
        el.focus({ preventScroll: false });
        el.scrollIntoView({ behavior: instantMove ? 'auto' : 'smooth', block: 'nearest' });
    }, [composerRef, instantMove]);

    return (
        <div
            data-floating-bot
            className="pointer-events-none fixed z-40"
            style={{
                left: pos.x,
                top: pos.y,
                width: BOT_SIZE,
                height: BOT_SIZE,
                transition: instantMove
                    ? 'none'
                    : 'left 0.34s cubic-bezier(0.22, 0.92, 0.26, 1), top 0.34s cubic-bezier(0.22, 0.92, 0.26, 1)',
                opacity: ready ? 1 : 0,
            }}
            aria-hidden={!ready}
        >
            <button
                type="button"
                onClick={focusComposer}
                aria-label="Focus chat composer"
                className="pointer-events-auto flex size-full cursor-pointer items-center justify-center rounded-full border border-emerald-200/80 bg-linear-to-br from-white/95 via-emerald-50/85 to-teal-50/90 p-2 shadow-xl ring-emerald-300/55 backdrop-blur-md transition hover:scale-105 active:scale-95 dark:border-emerald-800/60 dark:from-slate-900/92 dark:via-emerald-950/65 dark:to-slate-950/90 dark:shadow-emerald-950/55 dark:ring-emerald-500/25 motion-reduce:hover:scale-100 motion-reduce:active:scale-100"
            >
                <img
                    src={BOT_IMG}
                    alt=""
                    draggable={false}
                    width={56}
                    height={56}
                    className="select-none rounded-full object-cover motion-reduce:transition-none pointer-events-none"
                    decoding="async"
                />
            </button>
        </div>
    );
};
