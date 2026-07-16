import type { AuthSession } from "../api/types.ts";

export type ProfileParamResolution =
  | { kind: "self"; canonical: string }
  | { kind: "redirect"; canonical: string }
  | { kind: "not-found" };

/**
 * E57: resolves the `/user/:handle` route param against the session — self-only in 005.
 * Single mode: `me` is canonical, anything else 404s. Multi mode: the session's own handle
 * is canonical, `me` replace-navigates to it, any other handle 404s (no public profiles yet).
 */
export function resolveProfileParam(param: string, session: AuthSession): ProfileParamResolution {
  if (session.mode === "single") {
    return param === "me" ? { kind: "self", canonical: "me" } : { kind: "not-found" };
  }

  if (!session.handle) return { kind: "not-found" };
  if (param === session.handle) return { kind: "self", canonical: session.handle };
  if (param === "me") return { kind: "redirect", canonical: session.handle };
  return { kind: "not-found" };
}

/** The canonical self segment to link to from anywhere in the app. */
export function selfHandleParam(session: AuthSession): string {
  return session.mode === "single" ? "me" : (session.handle ?? "me");
}
