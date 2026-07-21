import { useCallback, useRef, useState } from "react";
import { Animated, type View } from "react-native";

const ROW_GAP_PX = 8;
/** Ignore finger tremor until the drag intentionally moves past this. */
const MOVE_SLOP_PX = 12;
/** Extra dead-zone around slot midpoints so overIndex doesn't thrash. */
const SLOT_HYSTERESIS_PX = 12;
export const SECTION_REORDER_LONG_PRESS_MS = 350;

export type SectionReorderState = {
  dragIndex: number | null;
  overIndex: number | null;
  /** Row height + gap — 0 when idle. Used for translateY shifts. */
  rowStride: number;
  ghostWidth: number;
  ghostTX: Animated.Value;
  ghostTY: Animated.Value;
  isDragging: boolean;
  listRef: React.RefObject<View | null>;
  setRowRef: (key: string, el: View | null) => void;
  beginDrag: (index: number, key: string, pageX: number, pageY: number) => void;
  moveDrag: (pageX: number, pageY: number) => void;
  endDrag: () => void;
};

/**
 * Long-press → drag reorder for native AddSectionBar.
 * Ghost position is Animated (no per-frame React renders); list order stays
 * stable and rows only translateY when the drop slot changes.
 */
export function useSectionReorder(
  keys: readonly string[],
  onCommit: (from: number, to: number) => void,
): SectionReorderState {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [rowStride, setRowStride] = useState(0);
  const [ghostWidth, setGhostWidth] = useState(0);

  const ghostTX = useRef(new Animated.Value(0)).current;
  const ghostTY = useRef(new Animated.Value(0)).current;

  const listRef = useRef<View | null>(null);
  const rowRefs = useRef(new Map<string, View>());
  const rowHeightRef = useRef(0);
  const listLeftRef = useRef(0);
  const listTopRef = useRef(0);
  const grabOffsetRef = useRef({ x: 0, y: 0 });
  const dragIndexRef = useRef<number | null>(null);
  const overIndexRef = useRef<number | null>(null);
  const originPageRef = useRef({ x: 0, y: 0 });
  const armedRef = useRef(false);

  const dropIndexAt = useCallback(
    (pageY: number, currentOver: number): number => {
      if (rowHeightRef.current <= 0 || keys.length === 0) return 0;
      const rowH = rowHeightRef.current;
      const slotStride = rowH + ROW_GAP_PX;
      const raw = (pageY - listTopRef.current - rowH / 2) / slotStride;
      const rounded = Math.min(keys.length - 1, Math.max(0, Math.round(raw)));
      if (rounded === currentOver) return currentOver;
      const centerOfCurrent = listTopRef.current + currentOver * slotStride + rowH / 2;
      if (Math.abs(pageY - centerOfCurrent) < slotStride / 2 + SLOT_HYSTERESIS_PX) {
        return currentOver;
      }
      return rounded;
    },
    [keys.length],
  );

  const beginDrag = useCallback(
    (index: number, key: string, pageX: number, pageY: number) => {
      const row = rowRefs.current.get(key);
      const list = listRef.current;
      if (!row || !list) return;

      row.measureInWindow((rx, ry, rw, rh) => {
        list.measureInWindow((lx, ly) => {
          listLeftRef.current = lx;
          listTopRef.current = ly;
          rowHeightRef.current = rh;
          grabOffsetRef.current = { x: pageX - rx, y: pageY - ry };
          originPageRef.current = { x: pageX, y: pageY };
          armedRef.current = false;

          const localX = rx - lx;
          const localY = ry - ly;
          ghostTX.setValue(localX);
          ghostTY.setValue(localY);

          dragIndexRef.current = index;
          overIndexRef.current = index;
          setGhostWidth(rw);
          setRowStride(rh + ROW_GAP_PX);
          setDragIndex(index);
          setOverIndex(index);
        });
      });
    },
    [ghostTX, ghostTY],
  );

  const moveDrag = useCallback(
    (pageX: number, pageY: number) => {
      if (dragIndexRef.current === null) return;

      const dx = pageX - originPageRef.current.x;
      const dy = pageY - originPageRef.current.y;
      if (!armedRef.current) {
        if (dx * dx + dy * dy < MOVE_SLOP_PX * MOVE_SLOP_PX) return;
        armedRef.current = true;
      }

      ghostTX.setValue(pageX - grabOffsetRef.current.x - listLeftRef.current);
      ghostTY.setValue(pageY - grabOffsetRef.current.y - listTopRef.current);

      const currentOver = overIndexRef.current ?? dragIndexRef.current;
      const nextOver = dropIndexAt(pageY, currentOver);
      if (nextOver !== overIndexRef.current) {
        overIndexRef.current = nextOver;
        setOverIndex(nextOver);
      }
    },
    [dropIndexAt, ghostTX, ghostTY],
  );

  const endDrag = useCallback(() => {
    armedRef.current = false;
    const from = dragIndexRef.current;
    const to = overIndexRef.current;
    if (from !== null && to !== null) {
      onCommit(from, to);
    }
    dragIndexRef.current = null;
    overIndexRef.current = null;
    setDragIndex(null);
    setOverIndex(null);
    setRowStride(0);
    setGhostWidth(0);
  }, [onCommit]);

  const setRowRef = useCallback((key: string, el: View | null) => {
    if (el) rowRefs.current.set(key, el);
    else rowRefs.current.delete(key);
  }, []);

  return {
    dragIndex,
    overIndex,
    rowStride,
    ghostWidth,
    ghostTX,
    ghostTY,
    isDragging: dragIndex !== null,
    listRef,
    setRowRef,
    beginDrag,
    moveDrag,
    endDrag,
  };
}

export const sectionReorderMotion = {
  rowGapPx: ROW_GAP_PX,
  longPressMs: SECTION_REORDER_LONG_PRESS_MS,
  moveSlopPx: MOVE_SLOP_PX,
} as const;
