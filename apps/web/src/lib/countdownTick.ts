const MS_PER_SECOND = 1_000;
const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

/**
 * Adaptive re-render interval for airStamp countdowns — faster as air time nears.
 * Returns null when nothing remains to count down.
 */
export function countdownTickMs(msUntil: number | null): number | null {
  if (msUntil == null || msUntil <= 0) return null;
  if (msUntil < MS_PER_MINUTE) return MS_PER_SECOND;
  if (msUntil < MS_PER_DAY) return MS_PER_MINUTE;
  return MS_PER_HOUR;
}

/** Milliseconds until the viewer's local calendar day rolls over. */
export function msUntilLocalMidnight(now = Date.now()): number {
  const d = new Date(now);
  const nextMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return Math.max(nextMidnight.getTime() - now, MS_PER_SECOND);
}

/** Tick delay for calendar-day countdowns (no airStamp) or null when not counting. */
export function calendarDayTickMs(airDate: string | null, now = Date.now()): number | null {
  if (airDate == null) return null;
  const today = todayIsoFromMs(now);
  if (airDate <= today) return null;
  return msUntilLocalMidnight(now);
}

function todayIsoFromMs(now: number): string {
  const d = new Date(now);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export { MS_PER_DAY, MS_PER_HOUR, MS_PER_MINUTE, MS_PER_SECOND };
