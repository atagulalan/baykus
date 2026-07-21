# Native push (blocked on spec)

Web push today is **VAPID + `PushSubscription` JSON** only
(`endpoint`, `keys.p256dh`, `keys.auth`) — see `specs/001-series-tracking`
§Push and `specs/003-dynamic-watching-ux` `POST /api/push/test`.

There is **no** normative field for Expo / FCM / APNs device tokens.

<!-- DECISION: do not wire `expo-notifications` or invent subscription shapes
until a numbered spec amends `contracts/api.md` with an explicit native
device-token (or dual web+native) schema. Tracked in
`docs/react-native-migration.md` §5.3. -->

When that delta exists, the mobile shell should:

1. Request permission via Expo Notifications.
2. Register the device token with the new API.
3. Keep web PushSubscription path unchanged.
