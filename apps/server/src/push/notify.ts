import type { Library } from "@baykus/core";
import webpush from "web-push";
import type { VapidKeys } from "./vapid.ts";

const VAPID_SUBJECT = "mailto:noreply@baykus.local";

export interface NewEpisodesEvent {
  itemId: number;
  title: string;
  newEpisodes: number;
}

/**
 * Notifies every subscription about a series' new episodes — skipped
 * entirely if that series is muted. A subscription the push service reports
 * as gone (404/410) is removed so it's never retried.
 */
export async function notifyNewEpisodes(
  library: Library,
  vapid: VapidKeys,
  event: NewEpisodesEvent,
): Promise<void> {
  if (event.newEpisodes <= 0) return;

  const detail = library.getSeries(event.itemId);
  if (!detail || detail.pushMuted) return;

  const subscriptions = library.listPushSubscriptions();
  if (subscriptions.length === 0) return;

  webpush.setVapidDetails(VAPID_SUBJECT, vapid.publicKey, vapid.privateKey);

  const payload = JSON.stringify({
    title: event.title,
    body: `${event.newEpisodes} yeni bölüm`,
    url: `/series/${event.itemId}`,
  });

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          library.removePushSubscription(sub.endpoint);
        }
      }
    }),
  );
}
