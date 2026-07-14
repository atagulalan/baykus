import { eq } from "drizzle-orm";
import type { LibraryDatabase } from "../db/open.ts";
import * as schema from "../db/schema.ts";

export interface PushSubscriptionRecord {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export function addPushSubscription(db: LibraryDatabase, sub: PushSubscriptionRecord): void {
  db.insert(schema.pushSubscriptions)
    .values({ ...sub, createdAt: new Date().toISOString() })
    .onConflictDoUpdate({
      target: schema.pushSubscriptions.endpoint,
      set: { p256dh: sub.p256dh, auth: sub.auth },
    })
    .run();
}

export function removePushSubscription(db: LibraryDatabase, endpoint: string): boolean {
  const result = db
    .delete(schema.pushSubscriptions)
    .where(eq(schema.pushSubscriptions.endpoint, endpoint))
    .run();
  return result.changes > 0;
}

export function listPushSubscriptions(db: LibraryDatabase): PushSubscriptionRecord[] {
  return db
    .select({
      endpoint: schema.pushSubscriptions.endpoint,
      p256dh: schema.pushSubscriptions.p256dh,
      auth: schema.pushSubscriptions.auth,
    })
    .from(schema.pushSubscriptions)
    .all();
}
