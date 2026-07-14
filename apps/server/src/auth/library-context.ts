import { AsyncLocalStorage } from "node:async_hooks";
import type { Library } from "@baykus/core";

const storage = new AsyncLocalStorage<Library>();

/**
 * Runs `next` (a Hono middleware's continuation) with `library` as the active
 * library for every downstream call made through a createLibraryProxy() —
 * better-sqlite3 is fully synchronous, so there's no risk of the ALS context
 * escaping across a detached async gap within a single request.
 */
export function runWithLibrary<T>(library: Library, next: () => T): T {
  return storage.run(library, next);
}

/**
 * A Library-shaped object whose every call forwards to whichever library is
 * active in the current request's AsyncLocalStorage scope, falling back to
 * `defaultLibrary` outside of one (single mode, and every existing test that
 * builds AppDeps directly without going through multi-mode middleware).
 *
 * This is the whole trick behind "handlers receive Library and cannot tell
 * modes apart" (tasks.md M7.3): every route factory goes on capturing this
 * one proxy exactly as it always captured `deps.library` — the per-handle
 * swap in multi mode happens invisibly underneath, in library-resolver
 * middleware, with zero changes to the ~11 existing route files or their
 * tests.
 */
export function createLibraryProxy(defaultLibrary: Library): Library {
  return new Proxy(defaultLibrary, {
    get(target, prop) {
      const active = storage.getStore() ?? target;
      const value = Reflect.get(active, prop, active);
      return typeof value === "function" ? value.bind(active) : value;
    },
  }) as Library;
}
