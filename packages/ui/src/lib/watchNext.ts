import { isEpisodeAired } from "./airing.ts";

/** E28: how many more aired episodes queue behind the shown next one, hidden when 0. */
export function computeOverflowBadge(progress: { aired: number; watched: number }): number {
  return Math.max(0, progress.aired - progress.watched - 1);
}

/** E29: hide the quick-mark checkbox when the next episode has not aired yet. */
export function shouldShowQuickMarkCheckbox(ep: {
  airDate: string | null;
  airStamp?: string | null;
}): boolean {
  return isEpisodeAired(ep);
}
