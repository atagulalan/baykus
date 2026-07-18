import { Loader2 } from "lucide-react";
import { type ImgHTMLAttributes, useEffect, useRef, useState } from "react";

type MediaImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "onLoad" | "onError" | "src"> & {
  src: string;
  /** Outer relative shell — size it when the image shouldn't collapse while loading. */
  wrapperClassName?: string;
  spinnerSize?: number;
  fadeDurationMs?: number;
  onLoad?: () => void;
  onError?: () => void;
};

/**
 * Image with a centered spinner until decode completes, then a short opacity
 * fade-in. Cached images skip the wait when `complete` is already true.
 */
export function MediaImage(props: MediaImageProps) {
  // Remount on src change so load/error phase resets cleanly.
  return <MediaImageInner key={props.src} {...props} />;
}

function MediaImageInner({
  src,
  alt,
  className,
  wrapperClassName,
  style,
  spinnerSize = 16,
  fadeDurationMs = 300,
  onLoad,
  onError,
  ...rest
}: MediaImageProps) {
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img?.complete) return;
    if (img.naturalWidth > 0) setPhase("ready");
    else setPhase("error");
  }, []);

  if (phase === "error") return null;

  const shell = wrapperClassName ?? "inline-block";
  // Spinner uses absolute inset — need a positioned ancestor. Skip adding
  // `relative` when the caller already supplies absolute/fixed/sticky.
  const positioned = /\b(absolute|fixed|sticky)\b/.test(shell) ? "" : "relative";

  return (
    <span
      className={`${positioned} overflow-hidden ${shell}`.trim()}
      aria-busy={phase === "loading" || undefined}
    >
      {phase === "loading" && (
        <span
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
          aria-hidden
        >
          <Loader2 size={spinnerSize} strokeWidth={1.5} className="animate-spin text-muted" />
        </span>
      )}
      <img
        {...rest}
        ref={imgRef}
        src={src}
        alt={alt}
        style={{ ...style, transitionDuration: `${fadeDurationMs}ms` }}
        className={`${className ?? ""} ${phase === "ready" ? "" : "opacity-0"} transition-opacity`.trim()}
        onLoad={() => {
          setPhase("ready");
          onLoad?.();
        }}
        onError={() => {
          setPhase("error");
          onError?.();
        }}
      />
    </span>
  );
}
