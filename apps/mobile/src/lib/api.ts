import { configureApiClient } from "@baykus/api-client";
import { getAccessToken } from "./session.ts";

/** Call once at app root before any API request. */
export function initApiClient(): void {
  configureApiClient({
    transport: "bearer",
    baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
    getAccessToken: () => getAccessToken(),
  });
}
