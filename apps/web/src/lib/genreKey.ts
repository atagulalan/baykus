/**
 * Converts a raw provider genre string (e.g. "Sci-Fi & Fantasy") into a safe
 * i18n translation key (e.g. "sci_fi___fantasy").
 */
export function genreKey(genre: string): string {
  return genre.toLowerCase().replace(/[^a-z0-9]/g, "_");
}
