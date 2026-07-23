/**
 * Ephemeral login → claim handoff (in-memory only).
 * Used when sign-in failed and the user opens create-account with fields filled.
 */
type ClaimPrefill = {
  handle: string;
  password: string;
};

let pending: ClaimPrefill | null = null;

export function stashClaimPrefill(next: ClaimPrefill): void {
  pending = next;
}

/** Read-once — clears so a later visit to claim starts blank. */
export function takeClaimPrefill(): ClaimPrefill | null {
  const next = pending;
  pending = null;
  return next;
}
