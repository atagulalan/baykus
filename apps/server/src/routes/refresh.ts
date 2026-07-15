import type { Library, WatchCategory } from "@baykus/core";
import type { MetadataProvider } from "@baykus/provider-sdk";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { ApiError } from "../middleware/errors.ts";
import { notifyNewEpisodes } from "../push/notify.ts";
import type { VapidKeys } from "../push/vapid.ts";

/** E22: push notifications are scoped to the active trio. */
const ACTIVE_TRIO: ReadonlySet<WatchCategory> = new Set([
  "watching",
  "not_watched_recently",
  "up_to_date",
]);

function parseId(raw: string): number {
  const id = Number.parseInt(raw, 10);
  if (!Number.isFinite(id)) throw new ApiError("NOT_FOUND", `invalid id "${raw}"`);
  return id;
}

/** Category must be read AFTER the refresh — a finished→up_to_date revival should still notify. */
function inActiveTrio(library: Library, itemId: number): boolean {
  const after = library.getSeries(itemId);
  return after != null && ACTIVE_TRIO.has(after.category);
}

/** Never lets a push failure break the refresh response — notify.ts already isolates per-subscription errors. */
async function notifySafely(
  library: Library,
  vapid: VapidKeys,
  itemId: number,
  title: string,
  newEpisodes: number,
) {
  try {
    await notifyNewEpisodes(library, vapid, { itemId, title, newEpisodes });
  } catch {
    // best-effort — a push failure never fails the refresh itself.
  }
}

/** contracts/api.md §Refresh. */
export function createRefreshRoutes(
  library: Library,
  providers: MetadataProvider[],
  vapid: VapidKeys,
): Hono {
  const app = new Hono();

  app.post("/api/library/series/:id/refresh", async (c) => {
    const id = parseId(c.req.param("id"));
    const before = library.getSeries(id);
    if (!before) throw new ApiError("NOT_FOUND", `series ${id} not in library`);
    const provider = providers[0];
    if (!provider) throw new ApiError("INTERNAL", "no metadata providers registered");

    const result = await library.refreshItem(provider, id);
    if (result.ok && result.newEpisodes > 0 && inActiveTrio(library, id)) {
      await notifySafely(library, vapid, id, before.title, result.newEpisodes);
    }
    return c.json({
      itemId: result.itemId,
      ok: result.ok,
      newEpisodes: result.newEpisodes,
      refreshedAt: result.refreshedAt,
    });
  });

  app.post("/api/library/refresh", async (c) => {
    const provider = providers[0];
    if (!provider) throw new ApiError("INTERNAL", "no metadata providers registered");

    const { items } = library.listSeries();
    const titleById = new Map(items.map((item) => [item.id, item.title]));
    const itemIds = items.map((item) => item.id);
    const total = itemIds.length;

    return streamSSE(c, async (stream) => {
      let done = 0;
      let ok = 0;
      let failed = 0;
      let newEpisodes = 0;

      for await (const result of library.refreshAll(provider, itemIds, 3)) {
        done++;
        if (result.ok) {
          ok++;
          newEpisodes += result.newEpisodes;
          if (result.newEpisodes > 0 && inActiveTrio(library, result.itemId)) {
            const title = titleById.get(result.itemId) ?? "";
            await notifySafely(library, vapid, result.itemId, title, result.newEpisodes);
          }
        } else {
          failed++;
        }
        await stream.writeSSE({
          event: "progress",
          data: JSON.stringify({
            done,
            total,
            itemId: result.itemId,
            ok: result.ok,
            newEpisodes: result.newEpisodes,
            ...(result.error ? { error: result.error } : {}),
          }),
        });
      }

      await stream.writeSSE({
        event: "complete",
        data: JSON.stringify({ ok, failed, newEpisodes }),
      });
    });
  });

  return app;
}
