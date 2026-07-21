/**
 * Polyfill `globalThis.crypto.getRandomValues` for Hermes (expo-auth-session PKCE
 * uses expo-crypto directly, but other deps may touch `crypto`).
 * Must load before any API / AuthSession imports.
 */
import { getRandomValues as expoGetRandomValues } from "expo-crypto";

const g = globalThis as typeof globalThis & {
  crypto?: { getRandomValues?: typeof expoGetRandomValues; randomUUID?: () => string };
};

if (!g.crypto) {
  g.crypto = {} as NonNullable<typeof g.crypto>;
}

if (typeof g.crypto.getRandomValues !== "function") {
  g.crypto.getRandomValues = expoGetRandomValues as typeof g.crypto.getRandomValues;
}
