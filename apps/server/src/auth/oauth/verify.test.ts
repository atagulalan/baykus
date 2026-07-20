import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import {
  appleNonceHash,
  OAuthVerifyError,
  verifyAppleIdToken,
  verifyGoogleIdToken,
} from "./verify.ts";

const GOOGLE_AUD = "google-web.apps.googleusercontent.com";
const APPLE_AUD = "me.xava.baykus.web";

describe("oauth verify", () => {
  let googlePrivate: CryptoKey;
  let applePrivate: CryptoKey;
  let googleGetKey: ReturnType<typeof createLocalJWKSet>;
  let appleGetKey: ReturnType<typeof createLocalJWKSet>;

  beforeAll(async () => {
    const google = await generateKeyPair("RS256", { extractable: true });
    const apple = await generateKeyPair("RS256", { extractable: true });
    googlePrivate = google.privateKey;
    applePrivate = apple.privateKey;

    const googleJwk = await exportJWK(google.publicKey);
    googleJwk.kid = "google-test";
    googleJwk.alg = "RS256";
    googleJwk.use = "sig";
    googleGetKey = createLocalJWKSet({ keys: [googleJwk] });

    const appleJwk = await exportJWK(apple.publicKey);
    appleJwk.kid = "apple-test";
    appleJwk.alg = "RS256";
    appleJwk.use = "sig";
    appleGetKey = createLocalJWKSet({ keys: [appleJwk] });
  });

  async function signGoogle(claims: Record<string, unknown> = {}) {
    return new SignJWT({ email: "user@gmail.com", ...claims })
      .setProtectedHeader({ alg: "RS256", kid: "google-test" })
      .setIssuer("https://accounts.google.com")
      .setAudience(GOOGLE_AUD)
      .setSubject("google-sub-1")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(googlePrivate);
  }

  async function signApple(claims: Record<string, unknown> = {}) {
    return new SignJWT({ email: "user@privaterelay.appleid.com", ...claims })
      .setProtectedHeader({ alg: "RS256", kid: "apple-test" })
      .setIssuer("https://appleid.apple.com")
      .setAudience(APPLE_AUD)
      .setSubject("apple-sub-1")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(applePrivate);
  }

  it("verifies a Google id_token", async () => {
    const token = await signGoogle();
    const result = await verifyGoogleIdToken(token, {
      googleClientIds: [GOOGLE_AUD],
      appleClientIds: [],
      googleGetKey,
    });
    expect(result).toEqual({
      provider: "google",
      subject: "google-sub-1",
      email: "user@gmail.com",
    });
  });

  it("rejects Google when audience is wrong", async () => {
    const token = await signGoogle();
    await expect(
      verifyGoogleIdToken(token, {
        googleClientIds: ["other-client"],
        appleClientIds: [],
        googleGetKey,
      }),
    ).rejects.toBeInstanceOf(OAuthVerifyError);
  });

  it("verifies an Apple id_token with hashed nonce", async () => {
    const rawNonce = "client-nonce-abc";
    const token = await signApple({ nonce: appleNonceHash(rawNonce) });
    const result = await verifyAppleIdToken(
      token,
      { googleClientIds: [], appleClientIds: [APPLE_AUD], appleGetKey },
      rawNonce,
    );
    expect(result.provider).toBe("apple");
    expect(result.subject).toBe("apple-sub-1");
  });

  it("rejects Apple when nonce mismatches", async () => {
    const token = await signApple({ nonce: appleNonceHash("a") });
    await expect(
      verifyAppleIdToken(
        token,
        { googleClientIds: [], appleClientIds: [APPLE_AUD], appleGetKey },
        "b",
      ),
    ).rejects.toBeInstanceOf(OAuthVerifyError);
  });
});
