import * as SecureStore from "expo-secure-store";

/** SecureStore key for the opaque Bearer session token (014 E118). */
export const ACCESS_TOKEN_KEY = "baykus.accessToken";

let memoryToken: string | null | undefined;

export async function getAccessToken(): Promise<string | null> {
  if (memoryToken !== undefined) return memoryToken;
  try {
    memoryToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch {
    memoryToken = null;
  }
  return memoryToken;
}

export async function setAccessToken(token: string | null): Promise<void> {
  memoryToken = token;
  try {
    if (token === null) {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    } else {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
    }
  } catch {
    // SecureStore unavailable (web / restricted) — memory still works for the session.
  }
}

export async function clearAccessToken(): Promise<void> {
  await setAccessToken(null);
}
