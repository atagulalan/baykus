import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

const ROW_GAP_PX = 8;
const SLIDE_MS = 180;

/** Where index `i` appears while dragging from `from` to `to`. */
export function visualIndex(i: number, from: number, to: number): number {
  if (from === to) return i;
  if (i === from) return to;
  if (from < to) {
    if (i > from && i <= to) return i - 1;
  } else if (i >= to && i < from) {
    return i + 1;
  }
  return i;
}

type GhostState = { x: number; y: number; width: number; height: number };

export type SectionReorderState = {
  dragIndex: number | null;
  overIndex: number | null;
  ghost: GhostState | null;
  rowShift: (key: string) => number;
  isDragging: boolean;
  isDraggingKey: (key: string) => boolean;
  onRowPointerDown: (index: number, key: string, e: ReactPointerEvent<HTMLElement>) => void;
  listRef: React.RefObject<HTMLUListElement | null>;
  setRowRef: (key: string, el: HTMLLIElement | null) => void;
};

/** Pointer-driven reorder with FLIP slide animation and a floating ghost row. */
export function useSectionReorder(
  keys: readonly string[],
  onCommit: (from: number, to: number) => void,
): SectionReorderState {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [ghost, setGhost] = useState<GhostState | null>(null);
  const [rowShift, setRowShift] = useState<Record<string, number>>({});

  const listRef = useRef<HTMLUListElement | null>(null);
  const rowRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  const rowHeightRef = useRef(0);
  const grabOffsetRef = useRef({ x: 0, y: 0 });
  const dragIndexRef = useRef<number | null>(null);
  const overIndexRef = useRef<number | null>(null);
  const flipFromRef = useRef<Map<string, number>>(new Map());

  const dropIndexAt = useCallback(
    (clientY: number): number => {
      const list = listRef.current;
      if (!list || rowHeightRef.current <= 0) return 0;

      const listTop = list.getBoundingClientRect().top;
      const rowH = rowHeightRef.current;
      const slotStride = rowH + ROW_GAP_PX;
      const raw = (clientY - listTop - rowH / 2) / slotStride;
      return Math.min(keys.length - 1, Math.max(0, Math.round(raw)));
    },
    [keys.length],
  );

  const captureFlipOrigins = useCallback(() => {
    const origins = new Map<string, number>();
    for (const [key, el] of rowRefs.current) {
      origins.set(key, el.getBoundingClientRect().top);
    }
    flipFromRef.current = origins;
  }, []);

  useLayoutEffect(() => {
    if (dragIndex === null || overIndex === null) {
      setRowShift({});
      return;
    }

    const from = flipFromRef.current;
    if (from.size === 0) return;

    const next: Record<string, number> = {};
    for (const [key, el] of rowRefs.current) {
      const origin = from.get(key);
      if (origin === undefined) continue;
      const delta = origin - el.getBoundingClientRect().top;
      if (delta !== 0) next[key] = delta;
    }

    setRowShift(next);
    const id = requestAnimationFrame(() => setRowShift({}));
    return () => cancelAnimationFrame(id);
  }, [dragIndex, overIndex]);

  const finishDrag = useCallback(() => {
    const from = dragIndexRef.current;
    const to = overIndexRef.current;
    if (from !== null && to !== null) {
      onCommit(from, to);
    }
    dragIndexRef.current = null;
    overIndexRef.current = null;
    flipFromRef.current = new Map();
    setDragIndex(null);
    setOverIndex(null);
    setGhost(null);
    setRowShift({});
  }, [onCommit]);

  const onRowPointerDown = useCallback(
    (index: number, key: string, e: ReactPointerEvent<HTMLElement>) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target.closest("button, select, a, input, textarea, label")) return;

      const row = rowRefs.current.get(key);
      if (!row) return;

      e.preventDefault();
      row.setPointerCapture(e.pointerId);

      const rect = row.getBoundingClientRect();
      rowHeightRef.current = rect.height;
      grabOffsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };

      dragIndexRef.current = index;
      overIndexRef.current = index;
      captureFlipOrigins();
      setDragIndex(index);
      setOverIndex(index);
      setGhost({ x: rect.left, y: rect.top, width: rect.width, height: rect.height });

      const onMove = (ev: PointerEvent) => {
        if (dragIndexRef.current === null) return;
        setGhost({
          x: ev.clientX - grabOffsetRef.current.x,
          y: ev.clientY - grabOffsetRef.current.y,
          width: rect.width,
          height: rect.height,
        });
        const nextOver = dropIndexAt(ev.clientY);
        if (nextOver !== overIndexRef.current) {
          captureFlipOrigins();
          overIndexRef.current = nextOver;
          setOverIndex(nextOver);
        }
      };

      const onEnd = () => {
        row.releasePointerCapture(e.pointerId);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onEnd);
        window.removeEventListener("pointercancel", onEnd);
        finishDrag();
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onEnd);
      window.addEventListener("pointercancel", onEnd);
    },
    [captureFlipOrigins, dropIndexAt, finishDrag],
  );

  const setRowRef = useCallback((key: string, el: HTMLLIElement | null) => {
    if (el) rowRefs.current.set(key, el);
    else rowRefs.current.delete(key);
  }, []);

  const getRowShift = useCallback((key: string) => rowShift[key] ?? 0, [rowShift]);

  return {
    dragIndex,
    overIndex,
    ghost,
    rowShift: getRowShift,
    isDragging: dragIndex !== null,
    isDraggingKey: (key) => dragIndex !== null && keys[dragIndex] === key,
    onRowPointerDown,
    listRef,
    setRowRef,
  };
}

export const sectionReorderMotion = {
  rowGapPx: ROW_GAP_PX,
  slideMs: SLIDE_MS,
} as const;
