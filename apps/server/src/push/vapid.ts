import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import webpush from "web-push";

export interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

/**
 * Single mode: a keypair is generated once and persisted under
 * `<dataDir>/vapid.json`, so every restart reuses the same identity (a
 * regenerated keypair would silently invalidate every existing subscription).
 * Multi mode passes `envKeys` instead — one shared identity across accounts.
 */
export function loadOrCreateVapidKeys(dataDir: string, envKeys?: VapidKeys): VapidKeys {
  if (envKeys) return envKeys;

  const path = join(dataDir, "vapid.json");
  if (existsSync(path)) {
    return JSON.parse(readFileSync(path, "utf-8")) as VapidKeys;
  }

  const keys = webpush.generateVAPIDKeys();
  writeFileSync(path, JSON.stringify(keys));
  return keys;
}
