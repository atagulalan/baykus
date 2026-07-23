/**
 * Multi-mode handle — specs/001 US-10 / contracts/api.md:
 * `^[a-z0-9-]{3,30}$` (no email, no punctuation beyond hyphen).
 */
export const HANDLE_PATTERN = /^[a-z0-9-]{3,30}$/;

/**
 * Strip email suggestions / specials as the user types.
 * `user@mail.com` → `user`; drops `.`, `;`, spaces, etc.; lowercases; caps at 30.
 */
export function sanitizeHandleInput(raw: string): string {
  const at = raw.indexOf("@");
  const local = at === -1 ? raw : raw.slice(0, at);
  return local.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 30);
}
