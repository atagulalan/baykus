import { useQuery } from "@tanstack/react-query";
import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { getAuthSession } from "../api/client.ts";
import type { AuthSession } from "../api/types.ts";
import { resolveProfileParam } from "../lib/profilePath.ts";

type ProfileRoutePath =
  | "/user/$handle"
  | "/user/$handle/all-series"
  | "/user/$handle/stats"
  | "/user/$handle/favorites";

/**
 * E57: wraps every `/user/:handle*` route. Self-only in 005 — renders children when the
 * param already resolves to the session's own handle, replace-navigates `me` to the
 * canonical handle (no history entry, no redirect loop), and 404s any foreign handle.
 * Children are a render prop so callers get the already-resolved session (mode/handle)
 * without re-deriving it from the (by then canonical) route param.
 */
export function ProfileGuard({
  handle,
  to,
  children,
}: {
  handle: string;
  to: ProfileRoutePath;
  children: (session: AuthSession) => ReactNode;
}) {
  const { t } = useTranslation();
  const sessionQuery = useQuery({ queryKey: ["auth-session"], queryFn: getAuthSession });

  if (sessionQuery.isLoading || !sessionQuery.data) return null;

  const resolution = resolveProfileParam(handle, sessionQuery.data);
  if (resolution.kind === "not-found") {
    return (
      <div className="content-inset flex flex-col items-center gap-2 py-24 text-center">
        <p className="text-muted">{t("notFound.profile")}</p>
      </div>
    );
  }
  if (resolution.kind === "redirect") {
    return <Navigate to={to} params={{ handle: resolution.canonical }} replace />;
  }

  return <>{children(sessionQuery.data)}</>;
}
