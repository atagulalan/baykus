import type { Library } from "@baykus/core";
import { Hono } from "hono";
import { z } from "zod";

// Standard browser PushSubscription.toJSON() shape — not our own DTO, so
// unknown extra fields (e.g. expirationTime) are simply dropped, not rejected.
const subscribeSchema = z.object({
  endpoint: z.string(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
});

const unsubscribeSchema = z.object({ endpoint: z.string() }).strict();

/** contracts/api.md §Push. */
export function createPushRoutes(library: Library, vapidPublicKey: string): Hono {
  const app = new Hono();

  app.post("/api/push/subscribe", async (c) => {
    const body = subscribeSchema.parse(await c.req.json());
    library.addPushSubscription({
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
    });
    return c.json({}, 201);
  });

  app.delete("/api/push/subscribe", async (c) => {
    const body = unsubscribeSchema.parse(await c.req.json());
    library.removePushSubscription(body.endpoint);
    return c.body(null, 204);
  });

  app.get("/api/push/vapid-public-key", (c) => c.json({ key: vapidPublicKey }));

  return app;
}
