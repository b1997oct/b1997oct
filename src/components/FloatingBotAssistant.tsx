import type { RefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Draggable, { type DraggableEventHandler } from 'react-draggable';

const BOT_IMG = '/cute-bot.png';
const BOT_SIZE = 72;
const MARGIN = 16;
const DRAG_THRESHOLD_PX = 8;
/** Start bouncing only after the composer stays empty this long */
const EMPTY_BEFORE_BOUNCE_MS = 5000;

export const FLOATING_BOT_SUGGESTIONS = [
    "Check Barath's skills…",
    "Meet Barath's best friends…",
    "Explore Barath's projects…",
    "How can I contact Barath?",
] as const;

function clamp(n: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, n));
}

function clampPuckWithinViewport(prev: { left: number; top: number }) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    return {
        left: clamp(prev.left, MARGIN, vw - BOT_SIZE - MARGIN),
        top: clamp(prev.top, MARGIN, vh - BOT_SIZE - MARGIN),
    };
}

function initialCorner() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    return clampPuckWithinViewport({
        left: vw - BOT_SIZE - MARGIN,
        top: vh - BOT_SIZE - MARGIN,
    });
}

export type FloatingBotPhase = 'puck' | 'dragging' | 'expanded';

type Props = {
    composerRef: RefObject<HTMLTextAreaElement | null>;
    /** When false (composer has text), bounce is never armed. While already bouncing, this is ignored until the user taps the puck. */
    composerEmpty: boolean;
    repositionEnabled?: boolean;
    onSuggestionSelect?: (prompt: string) => void;
};

export const FloatingBotAssistant = ({
    composerRef,
    composerEmpty,
    repositionEnabled = true,
    onSuggestionSelect,
}: Props) => {
    const [ready, setReady] = useState(false);
    const [phase, setPhase] = useState<FloatingBotPhase>('puck');
    const [pos, setPos] = useState({ left: MARGIN, top: MARGIN });
    const [bouncing, setBouncing] = useState(false);

    const phaseRef = useRef(phase);
    phaseRef.current = phase;

    const puckDragStartRef = useRef({ x: 0, y: 0 });
    const botNodeRef = useRef<HTMLButtonElement>(null);
    const bounceTimerRef = useRef<number | null>(null);
    const composerEmptyRef = useRef(composerEmpty);
    composerEmptyRef.current = composerEmpty;

    const clearBounceTimer = useCallback(() => {
        if (bounceTimerRef.current) {
            clearTimeout(bounceTimerRef.current);
            bounceTimerRef.current = null;
        }
    }, []);

    const armIdleBounceCountdown = useCallback(() => {
        clearBounceTimer();
        if (!composerEmptyRef.current) return;
        bounceTimerRef.current = window.setTimeout(() => {
            bounceTimerRef.current = null;
            if (!composerEmptyRef.current) return;
            if (phaseRef.current !== 'puck') return;
            setBouncing(true);
        }, EMPTY_BEFORE_BOUNCE_MS);
    }, [clearBounceTimer]);

    useEffect(() => {
        setPos(initialCorner());
        requestAnimationFrame(() => setReady(true));
    }, []);

    /** Arm idle countdown when composer is empty and puck visible; never stops an active bounce from composer edits. */
    useEffect(() => {
        clearBounceTimer();
        if (!ready || !repositionEnabled) setBouncing(false);
        else if (!bouncing && composerEmpty && phase === 'puck') armIdleBounceCountdown();

        return () => clearBounceTimer();
    }, [
        composerEmpty,
        phase,
        ready,
        repositionEnabled,
        bouncing,
        armIdleBounceCountdown,
        clearBounceTimer,
    ]);

    useEffect(() => {
        const onResize = () => {
            setPos((prev) => clampPuckWithinViewport(prev));
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const focusComposer = useCallback(() => {
        const el = composerRef.current;
        if (!el) return;
        el.focus({ preventScroll: false });
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [composerRef]);

    const closeExpandedModal = useCallback(() => {
        if (!repositionEnabled) return;
        setPhase('puck');
    }, [repositionEnabled]);

    const clampDrag = useCallback((x: number, y: number) => {
        const { left, top } = clampPuckWithinViewport({ left: x, top: y });
        return { left, top };
    }, []);

    const puckDragStart: DraggableEventHandler = (_, data) => {
        setBouncing(false);
        puckDragStartRef.current = { x: data.x, y: data.y };
        setPhase('dragging');
    };

    const puckDrag: DraggableEventHandler = (_, data) => {
        setPos(clampDrag(data.x, data.y));
    };

    const puckDragStop: DraggableEventHandler = (_, data) => {
        const { left, top } = clampDrag(data.x, data.y);
        setPos({ left, top });

        const o = puckDragStartRef.current;
        const moved = Math.hypot(left - o.x, top - o.y) >= DRAG_THRESHOLD_PX;

        if (moved) {
            setPhase('puck');
        } else {
            clearBounceTimer();
            setBouncing(false);
            setPhase('expanded');
        }
    };

    const pickSuggestion = (text: string) => {
        onSuggestionSelect?.(text);
        closeExpandedModal();
        focusComposer();
    };

    const puckInteractive = repositionEnabled && ready && (phase === 'puck' || phase === 'dragging');

    return (
        <>
            {phase === 'expanded' && (
                <button
                    type="button"
                    aria-label="Close assistant"
                    className="fixed inset-0 z-[38] cursor-default bg-slate-950/25 backdrop-blur-[2px] dark:bg-slate-950/40"
                    onClick={() => closeExpandedModal()}
                />
            )}

            {phase === 'expanded' ? (
                <div
                    data-floating-bot
                    className="pointer-events-none fixed z-[42] flex w-full justify-center px-4"
                    style={{ left: 0, right: 0, top: '50%', transform: 'translateY(-50%)' }}
                >
                    <div
                        className="pointer-events-auto w-full max-w-[min(320px,calc(100vw-32px))] rounded-2xl border border-emerald-200/80 bg-linear-to-b from-white/98 via-emerald-50/90 to-teal-50/95 p-4 shadow-2xl shadow-teal-500/20 backdrop-blur-xl dark:border-emerald-800/55 dark:from-slate-900/98 dark:via-emerald-950/65 dark:to-slate-950/95 dark:shadow-black/55"
                        onClick={(ev) => ev.stopPropagation()}
                    >
                        <p className="text-center text-[11px] font-semibold uppercase tracking-wider text-emerald-800/85 dark:text-emerald-200/85">
                            Quick questions
                        </p>
                        <ul className="mt-3 flex flex-col gap-2">
                            {FLOATING_BOT_SUGGESTIONS.map((s) => (
                                <li key={s}>
                                    <button
                                        type="button"
                                        onClick={() => pickSuggestion(s)}
                                        className="w-full rounded-xl border border-emerald-200/70 bg-white/80 px-3 py-2.5 text-left text-[13px] font-medium text-slate-700 shadow-sm transition hover:border-teal-300 hover:bg-teal-50/80 hover:text-teal-900 active:scale-[0.99] dark:border-emerald-800/50 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-emerald-950/80 dark:hover:text-emerald-100"
                                    >
                                        {s}
                                    </button>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-4 flex flex-col items-center gap-3 border-t border-emerald-200/50 pt-4 dark:border-emerald-800/40">
                            <button
                                type="button"
                                onClick={() => focusComposer()}
                                aria-label="Focus chat"
                                className="flex cursor-pointer items-center justify-center rounded-[1.1rem] border border-emerald-200/80 bg-linear-to-br from-white via-emerald-50/90 to-teal-50/95 p-2 shadow-lg ring-1 ring-emerald-400/35 dark:border-emerald-800 dark:from-slate-900 dark:via-emerald-950/55 dark:to-slate-950 dark:ring-emerald-700/35"
                            >
                                <img
                                    src={BOT_IMG}
                                    alt=""
                                    draggable={false}
                                    width={BOT_SIZE}
                                    height={BOT_SIZE}
                                    className="pointer-events-none size-[72px] select-none rounded-full object-cover"
                                    decoding="async"
                                />
                            </button>
                            <button
                                type="button"
                                onClick={() => closeExpandedModal()}
                                className="text-[11px] font-medium text-slate-500 underline-offset-4 hover:text-slate-700 hover:underline dark:text-slate-400 dark:hover:text-slate-200"
                            >
                                Minimize assistant
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <Draggable
                    nodeRef={botNodeRef}
                    axis="both"
                    bounds={false}
                    disabled={!puckInteractive}
                    position={{ x: pos.left, y: pos.top }}
                    enableUserSelectHack={false}
                    onStart={puckDragStart}
                    onDrag={puckDrag}
                    onStop={puckDragStop}
                >
                    <button
                        ref={botNodeRef}
                        type="button"
                        data-floating-bot
                        aria-label="Tap for quick questions. Drag to move."
                        title="Tap · questions · Drag · move"
                        style={{
                            position: 'fixed',
                            left: 0,
                            top: 0,
                            width: BOT_SIZE,
                            height: BOT_SIZE,
                            opacity: ready ? 1 : 0,
                            pointerEvents: repositionEnabled && ready ? 'auto' : 'none',
                        }}
                        className={`z-[42] flex ${puckInteractive ? 'cursor-grab active:cursor-grabbing' : 'cursor-not-allowed'}`}
                    >
                        <span
                            className={`pointer-events-none inline-flex shrink-0 items-center justify-center rounded-full ${bouncing ? 'animate-bounce' : ''}`}
                        >
                            <img
                                src={BOT_IMG}
                                alt=""
                                draggable={false}
                                width={56}
                                height={56}
                                className="pointer-events-none size-14 select-none rounded-full object-cover"
                                decoding="async"
                            />
                        </span>
                    </button>
                </Draggable>
            )}
        </>
    );
};
