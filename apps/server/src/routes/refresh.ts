import type { Library } from "@baykus/core";
import type { MetadataProvider } from "@baykus/provider-sdk";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { ApiError } from "../middleware/errors.ts";

function parseId(raw: string): number {
  const id = Number.parseInt(raw, 10);
  if (!Number.isFinite(id)) throw new ApiError("NOT_FOUND", `invalid id "${raw}"`);
  return id;
}

/** contracts/api.md §Refresh. */
export function createRefreshRoutes(library: Library, providers: MetadataProvider[]): Hono {
  const app = new Hono();

  app.post("/api/library/series/:id/refresh", async (c) => {
    const id = parseId(c.req.param("id"));
    if (!library.getSeries(id)) throw new ApiError("NOT_FOUND", `series ${id} not in library`);
    const provider = providers[0];
    if (!provider) throw new ApiError("INTERNAL", "no metadata providers registered");

    const result = await library.refreshItem(provider, id);
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
