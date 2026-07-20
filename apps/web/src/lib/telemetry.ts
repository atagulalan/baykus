import * as Sentry from "@sentry/react";
import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";

type AnalyticsProps = Record<string, string | number | boolean | undefined>;

let enabled = false;

type ScrubableEvent = {
  request?: {
    headers?: Record<string, string>;
  };
};

function scrubEvent<T extends ScrubableEvent>(event: T): T | null {
  const headers = event.request?.headers;
  if (headers) {
    for (const key of Object.keys(headers)) {
      const lower = key.toLowerCase();
      if (
        lower === "cookie" ||
        lower === "authorization" ||
        lower === "set-cookie" ||
        lower.includes("password") ||
        lower.includes("token") ||
        lower.includes("secret")
      ) {
        headers[key] = "[Filtered]";
      }
    }
  }
  return event;
}

/**
 * Init Sentry only when VITE_SENTRY_DSN is set (E189/E190). Safe no-op otherwise.
 */
export function initTelemetry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn || enabled) return;
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    beforeSend(event) {
      return scrubEvent(event);
    },
  });
  enabled = true;
}

export function isTelemetryEnabled(): boolean {
  return enabled;
}

/** Light product analytics (E196). No-op without DSN. Never pass PII props. */
export function track(event: string, props?: AnalyticsProps): void {
  if (!enabled) return;
  const attributes: Record<string, string> = { analytics: "true" };
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value === undefined) continue;
      attributes[key] = String(value);
    }
  }
  Sentry.captureMessage(event, {
    level: "info",
    tags: attributes,
    fingerprint: ["analytics", event],
  });
}

export function captureError(
  err: unknown,
  context?: { requestId?: string; path?: string; status?: number },
): void {
  if (!enabled) return;
  Sentry.withScope((scope) => {
    if (context?.requestId) scope.setTag("requestId", context.requestId);
    if (context?.path) scope.setTag("route", context.path);
    if (context?.status != null) scope.setTag("status", String(context.status));
    Sentry.captureException(err);
  });
}

export function addApiBreadcrumb(data: { path: string; status: number; requestId?: string }): void {
  if (!enabled) return;
  Sentry.addBreadcrumb({
    category: "api",
    level: data.status >= 500 ? "error" : "info",
    data: {
      path: data.path,
      status: data.status,
      requestId: data.requestId,
    },
  });
}

type FallbackRender = (args: { error: unknown; resetError: () => void }) => ReactNode;

interface BoundaryProps {
  children: ReactNode;
  fallback: FallbackRender;
}

interface BoundaryState {
  error: unknown | null;
}

/**
 * Thin error boundary that reports to Sentry when enabled, then renders
 * the provided fallback (keeps UI copy in i18n at the call site).
 */
export class AppErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): BoundaryState {
    return { error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    captureError(error, { path: "react" });
    if (enabled) {
      const stack = info.componentStack?.slice(0, 500);
      Sentry.addBreadcrumb({
        category: "react",
        level: "error",
        ...(stack ? { message: stack } : {}),
      });
    }
  }

  resetError = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error != null) {
      return this.props.fallback({ error: this.state.error, resetError: this.resetError });
    }
    return this.props.children;
  }
}
