import { join } from "node:path";

/** Multi mode's per-handle library file layout, shared by the auth routes (delete) and the library resolver (open/pool). */
export function libraryDbPath(dataDir: string, handle: string): string {
  return join(dataDir, "libraries", `${handle}.db`);
}
