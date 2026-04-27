import { useCallback, useEffect, useRef, useState } from 'react';

export interface MarqueeRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface MarqueeState {
  active: boolean;
  rect: MarqueeRect | null;
  /** modifiers held when drag started */
  additive: boolean; // shift OR ctrl/cmd
}

interface Options {
  /** Called continuously while dragging — receives rect in container coords. */
  onUpdate?: (rect: MarqueeRect, additive: boolean) => void;
  /** Called once when the drag ends. */
  onEnd?: (rect: MarqueeRect | null, additive: boolean) => void;
  /** Minimum movement (px) before treating as marquee (vs click). */
  threshold?: number;
  /** When true, ignore pointer events. */
  disabled?: boolean;
}

/**
 * Excel-style rectangular drag-selection.
 * Attach `bindContainer` to the scroll/grid container and `onPointerDown` to it.
 * The hook tracks mouse globally so the rectangle keeps growing when leaving the container.
 */
export function useMarqueeSelection({ onUpdate, onEnd, threshold = 4, disabled }: Options = {}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const startRef = useRef<{ x: number; y: number; additive: boolean } | null>(null);
  const movedRef = useRef(false);
  const [state, setState] = useState<MarqueeState>({ active: false, rect: null, additive: false });

  const computeRect = (sx: number, sy: number, cx: number, cy: number): MarqueeRect => ({
    left: Math.min(sx, cx),
    top: Math.min(sy, cy),
    width: Math.abs(cx - sx),
    height: Math.abs(cy - sy),
  });

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled) return;
    if (e.button !== 0) return;
    // ignore drags started on interactive elements (buttons/inputs/links/draggable items)
    const target = e.target as HTMLElement;
    if (target.closest('[data-no-marquee]')) return;
    if (target.closest('[draggable="true"]')) return;
    const container = containerRef.current;
    if (!container) return;
    const r = container.getBoundingClientRect();
    const x = e.clientX - r.left + container.scrollLeft;
    const y = e.clientY - r.top + container.scrollTop;
    startRef.current = { x, y, additive: e.shiftKey || e.metaKey || e.ctrlKey };
    movedRef.current = false;
  }, [disabled]);

  useEffect(() => {
    if (disabled) return;
    const handleMove = (e: PointerEvent) => {
      const start = startRef.current;
      const container = containerRef.current;
      if (!start || !container) return;
      const r = container.getBoundingClientRect();
      const x = e.clientX - r.left + container.scrollLeft;
      const y = e.clientY - r.top + container.scrollTop;
      const dx = x - start.x;
      const dy = y - start.y;
      if (!movedRef.current && Math.hypot(dx, dy) < threshold) return;
      movedRef.current = true;
      const rect = computeRect(start.x, start.y, x, y);
      setState({ active: true, rect, additive: start.additive });
      onUpdate?.(rect, start.additive);
    };
    const handleUp = () => {
      const start = startRef.current;
      if (!start) return;
      const wasActive = movedRef.current;
      const finalRect = state.rect;
      const additive = start.additive;
      startRef.current = null;
      movedRef.current = false;
      setState({ active: false, rect: null, additive: false });
      if (wasActive) onEnd?.(finalRect, additive);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [onUpdate, onEnd, threshold, disabled, state.rect]);

  return {
    containerRef,
    onPointerDown,
    state,
    /** Was the last pointer-up actually a drag (vs click)? */
    didDrag: () => movedRef.current,
  };
}
