import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";

function randomNonce(): string {
  const bytes = Crypto.getRandomBytes(16);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** True when iOS can show Apple Sign-In (capability + device). */
export async function appleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Native Apple Sign-In → identityToken + raw nonce for POST /auth/oauth/callback.
 * Server hashes the raw nonce (014 / verify.ts appleNonceHash).
 */
export async function obtainAppleIdToken(): Promise<{ idToken: string; nonce: string }> {
  const nonce = randomNonce();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  const idToken = credential.identityToken;
  if (!idToken) throw new Error("apple_missing_id_token");
  return { idToken, nonce };
}
