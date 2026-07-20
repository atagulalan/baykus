import { X } from "lucide-react";
import {
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { focusInitialElement, handleFocusTrapKeyDown } from "../../../lib/focusTrap.ts";
import { Z } from "../../../lib/zIndex.ts";

/** Tailwind `sm` breakpoint — where the bottom sheet hands over to the desktop presentation. */
const DESKTOP_QUERY = "(min-width: 640px)";

/** Soft overlay panel fill — 012 E160–E161. */
const PANEL =
  "border border-white/10 bg-[#101010] shadow-[0_16px_48px_rgba(0,0,0,0.5)] backdrop-blur-xl";

const EXIT_MS = 280;
const SHEET_DISMISS_PX = 100;
const SHEET_FLING_VELOCITY = 0.6;

/**
 * Nested modals must share one body scroll lock. Saving/restoring
 * `style.overflow` per instance leaves `overflow: hidden` stuck when the
 * under-modal cleans up first (or both exit in the same tick / Escape).
 */
let bodyScrollLockCount = 0;
let bodyScrollLockPrev = "";

function acquireBodyScrollLock() {
  if (bodyScrollLockCount === 0) {
    bodyScrollLockPrev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  bodyScrollLockCount += 1;
}

function releaseBodyScrollLock() {
  if (bodyScrollLockCount === 0) return;
  bodyScrollLockCount -= 1;
  if (bodyScrollLockCount === 0) {
    document.body.style.overflow = bodyScrollLockPrev;
  }
}

/** LIFO stack so Escape closes only the topmost open overlay. */
const escapeStack: Array<() => void> = [];

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(DESKTOP_QUERY).matches);
  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY);
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return isDesktop;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /**
   * Desktop (≥sm) presentation; mobile is always a bottom sheet.
   * - `"modal"` (default): centered dialog, portaled to `<body>`.
   * - `"popover"`: panel anchored to the nearest positioned ancestor — render
   *   the Modal inside a `relative` wrapper next to its trigger. Always
   *   portaled to `<body>` so it escapes local stacking contexts (e.g. hero
   *   `z-10`, sticky headers).
   * - `"none"`: nothing on desktop (mobile-only sheet).
   */
  desktop?: "modal" | "popover" | "none";
  /**
   * desktop="popover" only: size/visual classes for the panel (e.g. `w-56`).
   * Placement is computed from the anchor; avoid absolute utilities like
   * `right-0` / `top-full` — they are ignored once portaled.
   */
  popoverClassName?: string;
  /**
   * desktop="popover" only: placement relative to the anchor.
   * - `"end"` (default): below the anchor, right edges lined up (⋮ menus).
   * - `"center"`: below the anchor, horizontally centered (season progress ring).
   * - `"end-top"`: to the left of the anchor, top edges lined up (episode
   *   checkbox — panel opens inward from the trailing control).
   * - `"end-middle"`: to the left of the anchor, vertically centered.
   */
  popoverAlign?: "end" | "center" | "end-top" | "end-middle";
  /** Bottom-sheet header (title + close button). Desktop modal/popover render children only. */
  title?: string;
  /**
   * Rendered right of the sheet-header title (e.g. a status badge). Sheet
   * header only — desktop modal/popover have no header, so consumers that
   * need it there must render it themselves in `children`.
   */
  titleAccessory?: ReactNode;
  /** Added classes for the sheet/modal container, typically for padding/layout. */
  className?: string;
  /** Centered desktop modal width only (`default` = max-w-sm, `large` = max-w-lg). */
  size?: "default" | "large";
}

function ModalCloseButton({ onClose, label }: { onClose: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label={label}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/5 hover:text-snow"
    >
      <X size={18} strokeWidth={1.5} aria-hidden />
    </button>
  );
}

interface AnchorRect {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
}

function useAnchorRect(active: boolean): {
  markerRef: RefObject<HTMLSpanElement | null>;
  rect: AnchorRect | null;
} {
  const markerRef = useRef<HTMLSpanElement>(null);
  const [rect, setRect] = useState<AnchorRect | null>(null);

  useLayoutEffect(() => {
    if (!active) {
      setRect(null);
      return;
    }
    const anchor = markerRef.current?.parentElement;
    if (!anchor) return;

    const update = () => {
      const r = anchor.getBoundingClientRect();
      setRect({ top: r.top, right: r.right, bottom: r.bottom, left: r.left, width: r.width });
    };
    update();
    window.addEventListener("resize", update);
    // Capture scroll from any scrollable ancestor.
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [active]);

  return { markerRef, rect };
}

function wireDialogLabels(
  dialog: HTMLElement,
  titleId: string,
  bodyId: string,
  hasBody: boolean,
  fallbackTitle?: string,
) {
  const heading = dialog.querySelector<HTMLElement>("h1, h2");
  if (heading) {
    if (!heading.id) heading.id = titleId;
    dialog.setAttribute("aria-labelledby", heading.id);
    dialog.removeAttribute("aria-label");
  } else if (fallbackTitle) {
    dialog.setAttribute("aria-label", fallbackTitle);
    dialog.removeAttribute("aria-labelledby");
  }

  if (!hasBody) return;
  const body =
    dialog.querySelector<HTMLElement>(`#${CSS.escape(bodyId)}`) ??
    dialog.querySelector<HTMLElement>("p");
  if (body) {
    if (!body.id) body.id = bodyId;
    dialog.setAttribute("aria-describedby", body.id);
  }
}

function useModalFocusManagement(
  active: boolean,
  trapFocus: boolean,
  dialogRef: RefObject<HTMLElement | null>,
) {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!active) {
      previousFocusRef.current?.focus();
      return;
    }

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const dialog = dialogRef.current;
    if (dialog) focusInitialElement(dialog);
  }, [active, dialogRef]);

  useEffect(() => {
    if (!active || !trapFocus) return;

    function onKeyDown(event: KeyboardEvent) {
      const dialog = dialogRef.current;
      if (!dialog) return;
      handleFocusTrapKeyDown(event, dialog);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, trapFocus, dialogRef]);
}

function useExitMount(active: boolean): { mounted: boolean; closing: boolean } {
  const [mounted, setMounted] = useState(active);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (active) {
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      setClosing(true);
    }
  }, [active, mounted]);

  useEffect(() => {
    if (!closing) return;
    const id = window.setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, EXIT_MS);
    return () => window.clearTimeout(id);
  }, [closing]);

  return { mounted, closing };
}

function SheetDragHandle() {
  return (
    <div className="flex shrink-0 justify-center pt-3 pb-1" aria-hidden>
      <div className="h-1 w-9 rounded-full bg-white/20" />
    </div>
  );
}

function useSheetSwipe(onClose: () => void, enabled: boolean) {
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [springing, setSpringing] = useState(false);
  const draggingRef = useRef(false);
  /** Keep offset through the exit animation so the sheet doesn't snap back up. */
  const dismissHeldRef = useRef(false);
  const startYRef = useRef(0);
  const lastYRef = useRef(0);
  const lastTimeRef = useRef(0);
  const velocityRef = useRef(0);
  const dragYRef = useRef(0);
  const onCloseRef = useRef(onClose);
  const springTimerRef = useRef(0);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (enabled) {
      // A prior swipe-dismiss leaves dragY offscreen (held through exit). Clear
      // it on reopen or the sheet stays translated away while the backdrop enters.
      dismissHeldRef.current = false;
      draggingRef.current = false;
      dragYRef.current = 0;
      setDragY(0);
      setDragging(false);
      setSpringing(false);
      window.clearTimeout(springTimerRef.current);
      return;
    }
    draggingRef.current = false;
    setDragging(false);
    setSpringing(false);
    window.clearTimeout(springTimerRef.current);
    if (!dismissHeldRef.current) {
      dragYRef.current = 0;
      setDragY(0);
    }
  }, [enabled]);

  useEffect(() => () => window.clearTimeout(springTimerRef.current), []);

  function moveDrag(clientY: number) {
    if (!draggingRef.current) return;
    const now = performance.now();
    const delta = Math.max(0, clientY - startYRef.current);
    const dt = Math.max(1, now - lastTimeRef.current);
    velocityRef.current = (clientY - lastYRef.current) / dt;
    lastYRef.current = clientY;
    lastTimeRef.current = now;
    dragYRef.current = delta;
    setDragY(delta);
  }

  function endDrag() {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    const delta = dragYRef.current;
    const velocity = velocityRef.current;
    if (delta >= SHEET_DISMISS_PX || velocity >= SHEET_FLING_VELOCITY) {
      dismissHeldRef.current = true;
      const offscreen = Math.max(delta, typeof window !== "undefined" ? window.innerHeight : 800);
      dragYRef.current = offscreen;
      setDragY(offscreen);
      onCloseRef.current();
      return;
    }
    // Spring back: keep the transform for one frame, then animate to 0.
    setSpringing(true);
    requestAnimationFrame(() => {
      dragYRef.current = 0;
      setDragY(0);
    });
    window.clearTimeout(springTimerRef.current);
    springTimerRef.current = window.setTimeout(() => setSpringing(false), EXIT_MS);
  }

  function onPointerDown(e: ReactPointerEvent<HTMLElement>) {
    if (!enabled || prefersReducedMotion()) return;
    if (e.button != null && e.button !== 0) return;
    if (e.pointerType === "touch" && e.isPrimary === false) return;
    e.preventDefault();
    window.clearTimeout(springTimerRef.current);
    setSpringing(false);
    startYRef.current = e.clientY;
    lastYRef.current = e.clientY;
    lastTimeRef.current = performance.now();
    velocityRef.current = 0;
    dragYRef.current = 0;
    draggingRef.current = true;
    setDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // jsdom has no PointerEvent capture; real browsers use it so move/up
      // keep flowing after the finger leaves the handle.
    }
  }

  function onMouseDown(e: ReactMouseEvent<HTMLElement>) {
    // Prefer Pointer Events when the runtime supports them (avoids double-firing
    // pointerdown→mousedown). jsdom lacks PointerEvent — mouse path covers tests.
    if (typeof PointerEvent !== "undefined") return;
    if (!enabled || prefersReducedMotion()) return;
    if (e.button !== 0) return;
    e.preventDefault();
    window.clearTimeout(springTimerRef.current);
    setSpringing(false);
    startYRef.current = e.clientY;
    lastYRef.current = e.clientY;
    lastTimeRef.current = performance.now();
    velocityRef.current = 0;
    dragYRef.current = 0;
    draggingRef.current = true;
    setDragging(true);
  }

  function onMouseMove(e: ReactMouseEvent<HTMLElement>) {
    if (typeof PointerEvent !== "undefined") return;
    moveDrag(e.clientY);
  }

  function onMouseUp() {
    if (typeof PointerEvent !== "undefined") return;
    endDrag();
  }

  return {
    dragY,
    dragging,
    springing,
    swipeHandlers: {
      onPointerDown,
      onPointerMove: (e: ReactPointerEvent<HTMLElement>) => moveDrag(e.clientY),
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onMouseDown,
      onMouseMove,
      onMouseUp,
    },
  };
}

/** Fixed-position styles for a portaled popover — `translate` stays off `transform` so scale anims keep working. */
function popoverStyle(
  rect: AnchorRect,
  align: "end" | "center" | "end-top" | "end-middle",
): {
  zIndex: number;
  top: number;
  left?: number;
  right?: number;
  translate?: string;
} {
  if (align === "center") {
    return {
      zIndex: Z.overlayPanel,
      top: rect.bottom + 4,
      left: rect.left + rect.width / 2,
      translate: "-50% 0",
    };
  }
  if (align === "end-top" || align === "end-middle") {
    // Panel sits just left of the anchor (inward from a trailing control).
    return {
      zIndex: Z.overlayPanel,
      top: align === "end-middle" ? (rect.top + rect.bottom) / 2 : rect.top,
      right: Math.max(8, window.innerWidth - rect.left + 4),
      ...(align === "end-middle" ? { translate: "0 -50%" } : {}),
    };
  }
  return {
    zIndex: Z.overlayPanel,
    top: rect.bottom + 4,
    right: Math.max(8, window.innerWidth - rect.right),
  };
}

export function Modal({
  isOpen,
  onClose,
  children,
  desktop = "modal",
  popoverClassName = "",
  popoverAlign = "end",
  title,
  titleAccessory,
  className = "",
  size = "default",
}: ModalProps) {
  const { t } = useTranslation();
  const isDesktop = useIsDesktop();
  const variant = isDesktop ? desktop : "sheet";
  const active = isOpen && variant !== "none";
  const titleId = useId();
  const bodyId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const trapFocus = variant === "sheet" || variant === "modal";
  useModalFocusManagement(active, trapFocus, variant === "popover" ? popoverRef : dialogRef);

  const { mounted, closing } = useExitMount(active);
  // Keep measuring through the exit animation so the popover doesn't snap away.
  const { markerRef, rect } = useAnchorRect(mounted && variant === "popover");
  const sheetSwipe = useSheetSwipe(onClose, active && variant === "sheet" && !closing);

  useEffect(() => {
    if (!active) return;
    escapeStack.push(onClose);
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (escapeStack[escapeStack.length - 1] !== onClose) return;
      onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      const idx = escapeStack.lastIndexOf(onClose);
      if (idx >= 0) escapeStack.splice(idx, 1);
    };
  }, [active, onClose]);

  // The sheet and the centered modal own the screen; popovers keep the page
  // scrollable. Stay locked through the exit animation (mounted, not active).
  const lockScroll = mounted && variant !== "popover";
  useEffect(() => {
    if (!lockScroll) return;
    acquireBodyScrollLock();
    return () => releaseBodyScrollLock();
  }, [lockScroll]);

  useLayoutEffect(() => {
    if (!active) return;
    const dialog = variant === "popover" ? popoverRef.current : dialogRef.current;
    if (!dialog) return;
    wireDialogLabels(dialog, titleId, bodyId, true, title);
  }, [active, bodyId, title, titleId, variant]);

  if (variant === "popover") {
    if (!mounted) return null;
    // Marker stays in the relative wrapper so we can measure the anchor; the
    // panel is portaled so Z.overlay* compete at the root (above chrome/sticky).
    return (
      <>
        <span ref={markerRef} className="pointer-events-none absolute size-0" aria-hidden />
        {rect &&
          createPortal(
            <>
              <div
                className="fixed inset-0"
                style={{ zIndex: Z.overlay }}
                onClick={onClose}
                aria-hidden="true"
              />
              <div
                ref={popoverRef}
                role="dialog"
                aria-modal="false"
                {...(title ? { "aria-label": title } : {})}
                className={`fixed overflow-hidden rounded-xl ${PANEL} ${
                  closing ? "animate-modal-out" : "animate-modal"
                } ${popoverClassName}`}
                style={popoverStyle(rect, popoverAlign)}
              >
                {children}
              </div>
            </>,
            document.body,
          )}
      </>
    );
  }

  if (!mounted) return null;

  const isSheet = variant === "sheet";
  const modalWidthClass = size === "large" ? "max-w-lg" : "max-w-sm";
  // With a sheet header, the consumer's className styles the content below the
  // header (so its padding never wraps the header bar); otherwise it styles the
  // container itself, as the plain dialogs expect.
  const hasHeader = isSheet && title !== undefined;
  const labelledByProps = title !== undefined ? { "aria-labelledby": titleId } : {};
  const describedByProps = hasHeader ? { "aria-describedby": bodyId } : {};
  const sheetDragging = isSheet && sheetSwipe.dragging;
  const sheetOffset = isSheet ? sheetSwipe.dragY : 0;
  const sheetGestureActive = isSheet && (sheetDragging || sheetOffset > 0 || sheetSwipe.springing);
  // Drag / spring / held-dismiss owns the transform; CSS enter/exit only when idle.
  const sheetAnimClass = sheetGestureActive ? "" : closing ? "animate-sheet-out" : "animate-sheet";
  const sheetTransformStyle = sheetGestureActive
    ? {
        transform: `translateY(${sheetOffset}px)`,
        transition: sheetDragging
          ? "none"
          : `transform ${EXIT_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`,
      }
    : undefined;

  const hasDesktopHeader = !isSheet && title !== undefined;

  return createPortal(
    <div
      className={`fixed inset-0 flex justify-center ${isSheet ? "items-end" : "items-center p-4"}`}
      style={{ zIndex: Z.overlay }}
    >
      {/* Backdrop — not in tab order; Escape and in-dialog close buttons remain available. */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={onClose}
        className={`absolute inset-0 cursor-default bg-black/40 ${
          closing ? "animate-backdrop-out" : "animate-backdrop"
        }`}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        {...labelledByProps}
        {...describedByProps}
        className={`relative w-full overflow-y-auto ${PANEL} ${
          isSheet
            ? `max-h-[90vh] rounded-t-[1.5rem] border-x-0 border-b-0 pb-[calc(1rem+env(safe-area-inset-bottom))] ${sheetAnimClass}`
            : `${modalWidthClass} max-h-[85vh] rounded-2xl ${closing ? "animate-modal-out" : "animate-modal"}`
        }`}
        style={{
          zIndex: Z.overlayPanel,
          ...sheetTransformStyle,
        }}
      >
        {hasDesktopHeader && (
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <h2 id={titleId} className="truncate font-display italic text-lg text-snow">
                {title}
              </h2>
              {titleAccessory}
            </div>
            <ModalCloseButton onClose={onClose} label={t("modal.close")} />
          </div>
        )}
        {isSheet && (
          <div
            className="touch-none select-none"
            {...sheetSwipe.swipeHandlers}
            style={{ touchAction: "none" }}
          >
            <SheetDragHandle />
            {hasHeader && (
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <h2 id={titleId} className="truncate font-display italic text-lg text-snow">
                    {title}
                  </h2>
                  {titleAccessory}
                </div>
                <ModalCloseButton onClose={onClose} label={t("modal.close")} />
              </div>
            )}
          </div>
        )}
        {hasHeader || hasDesktopHeader ? (
          <div id={bodyId} className={className}>
            {children}
          </div>
        ) : (
          <>
            {title !== undefined && (
              <h2 id={titleId} className="sr-only">
                {title}
              </h2>
            )}
            {isSheet ? (
              <div className={className}>{children}</div>
            ) : (
              <div className={className}>{children}</div>
            )}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
