/** Routes that stay reachable without a session (web Layout `BARE_PATHS` parity). */
export const AUTH_BARE_SEGMENTS = new Set(["login", "claim", "dev"]);

/** True when the session is loaded and the user must not see app chrome. */
export function needsAuthRedirect(
  session: { authenticated: boolean } | null,
  rootSegment: string | undefined,
): boolean {
  if (!session || session.authenticated) return false;
  if (rootSegment && AUTH_BARE_SEGMENTS.has(rootSegment)) return false;
  return true;
}
