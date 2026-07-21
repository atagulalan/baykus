/** 011 E150 — post-watch rating popup only when the episode is unrated. */
export function shouldPromptEpisodeRating(myRating: 1 | 2 | 3 | null | undefined): boolean {
  return myRating == null;
}
