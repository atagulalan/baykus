import {
  type ReactNode,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Z } from "../lib/zIndex.ts";

/** Tailwind `sm` breakpoint — where the bottom sheet hands over to the desktop presentation. */
const DESKTOP_QUERY = "(min-width: 640px)";

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
  /** Bottom-sheet header (title + close button). Desktop modal/popover render children only. */
  title?: string;
  /** Added classes for the sheet/modal container, typically for padding/layout. */
  className?: string;
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

export function Modal({
  isOpen,
  onClose,
  children,
  desktop = "modal",
  popoverClassName = "",
  title,
  className = "",
}: ModalProps) {
  const { t } = useTranslation();
  const isDesktop = useIsDesktop();
  const variant = isDesktop ? desktop : "sheet";
  const active = isOpen && variant !== "none";
  const { markerRef, rect } = useAnchorRect(active && variant === "popover");

  // Keep the sheet/centered modal mounted through its exit animation so closing
  // doesn't snap away. `closing` swaps the entrance classes for the reverse
  // ones; a timeout (not onAnimationEnd, which never fires under
  // prefers-reduced-motion) unmounts once the animation window elapses.
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
    }, 200);
    return () => window.clearTimeout(id);
  }, [closing]);

  useEffect(() => {
    if (!active) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, onClose]);

  // The sheet and the centered modal own the screen; popovers keep the page
  // scrollable. Stay locked through the exit animation (mounted, not active).
  const lockScroll = mounted && variant !== "popover";
  useEffect(() => {
    if (!lockScroll) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [lockScroll]);

  if (variant === "popover") {
    if (!active) return null;
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
                className={`fixed overflow-hidden border border-white/10 bg-[#101010] shadow-2xl backdrop-blur-md ${popoverClassName}`}
                style={{
                  zIndex: Z.overlayPanel,
                  top: rect.bottom + 4,
                  right: Math.max(8, window.innerWidth - rect.right),
                }}
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
  // With a sheet header, the consumer's className styles the content below the
  // header (so its padding never wraps the header bar); otherwise it styles the
  // container itself, as the plain dialogs expect.
  const hasHeader = isSheet && title !== undefined;
  return createPortal(
    <div
      className={`fixed inset-0 flex justify-center ${isSheet ? "items-end" : "items-center p-4"}`}
      style={{ zIndex: Z.overlay }}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label={t("modal.close")}
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 cursor-default ${
          closing ? "animate-backdrop-out" : "animate-backdrop"
        }`}
      />

      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full overflow-y-auto bg-[#101010] shadow-2xl backdrop-blur-md ${
          isSheet
            ? `max-h-[90vh] border-t border-white/10 pb-[calc(1rem+env(safe-area-inset-bottom))] ${
                closing ? "animate-sheet-out" : "animate-sheet"
              }`
            : `max-h-[85vh] max-w-sm border border-white/10 ${
                closing ? "animate-modal-out" : "animate-modal"
              }`
        } ${hasHeader ? "" : className}`}
        style={{ zIndex: Z.overlayPanel }}
      >
        {hasHeader ? (
          <>
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <h2 className="font-display italic text-lg text-snow">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                className="font-mono text-[10px] text-muted uppercase tracking-widest transition-colors hover:text-snow"
              >
                {t("modal.close")}
              </button>
            </div>
            <div className={className}>{children}</div>
          </>
        ) : (
          children
        )}
      </div>
    </div>,
    document.body,
  );
}
