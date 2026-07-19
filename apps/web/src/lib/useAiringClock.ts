import { useEffect, useState } from "react";
import { msUntilAir } from "./airing.ts";
import { calendarDayTickMs, countdownTickMs } from "./countdownTick.ts";

function airingTickMs(
  airDate: string | null,
  airStamp: string | null | undefined,
  now: number,
): number | null {
  const ms = msUntilAir({ airDate, airStamp }, now);
  if (ms != null) return countdownTickMs(ms);
  return calendarDayTickMs(airDate, now);
}

/**
 * Returns a `now` timestamp that advances on an adaptive schedule while an
 * episode is still unaired — 1s in the last minute, 1m under a day, 1h beyond.
 */
export function useAiringClock(
  airDate: string | null,
  airStamp?: string | null,
  enabled = true,
): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return;
    const delay = airingTickMs(airDate, airStamp, now);
    if (delay == null) return;
    const id = setTimeout(() => setNow(Date.now()), delay);
    return () => clearTimeout(id);
  }, [airDate, airStamp, enabled, now]);

  return now;
}
