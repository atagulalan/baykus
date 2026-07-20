import { createHash } from "node:crypto";
import {
  createRemoteJWKSet,
  customFetch,
  type JWTPayload,
  type JWTVerifyGetKey,
  jwtVerify,
} from "jose";
import type { OAuthProvider } from "../accounts.ts";

export interface VerifiedIdToken {
  provider: OAuthProvider;
  subject: string;
  email: string | null;
}

export interface OAuthVerifyConfig {
  googleClientIds: string[];
  appleClientIds: string[];
  /** Test injection — skips remote JWKS fetch when provided. */
  googleGetKey?: JWTVerifyGetKey;
  appleGetKey?: JWTVerifyGetKey;
  /** Optional custom fetch for remote JWKS (tests / proxies). */
  jwksFetch?: (url: string, options: RequestInit) => Promise<Response>;
}

const GOOGLE_ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);
const APPLE_ISSUER = "https://appleid.apple.com";
const GOOGLE_JWKS_URL = new URL("https://www.googleapis.com/oauth2/v3/certs");
const APPLE_JWKS_URL = new URL("https://appleid.apple.com/auth/keys");

export class OAuthVerifyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OAuthVerifyError";
  }
}

function emailFromPayload(payload: JWTPayload): string | null {
  const email = payload.email;
  return typeof email === "string" && email.length > 0 ? email : null;
}

function remoteKey(url: URL, jwksFetch?: OAuthVerifyConfig["jwksFetch"]): JWTVerifyGetKey {
  if (!jwksFetch) return createRemoteJWKSet(url);
  return createRemoteJWKSet(url, {
    // jose FetchImplementation is stricter than DOM fetch; cast at the boundary.
    [customFetch]: jwksFetch as never,
  });
}

function googleKey(config: OAuthVerifyConfig): JWTVerifyGetKey {
  return config.googleGetKey ?? remoteKey(GOOGLE_JWKS_URL, config.jwksFetch);
}

function appleKey(config: OAuthVerifyConfig): JWTVerifyGetKey {
  return config.appleGetKey ?? remoteKey(APPLE_JWKS_URL, config.jwksFetch);
}

/** Apple puts SHA-256(hex) of the client nonce into the id_token `nonce` claim. */
export function appleNonceHash(rawNonce: string): string {
  return createHash("sha256").update(rawNonce).digest("hex");
}

export async function verifyGoogleIdToken(
  idToken: string,
  config: OAuthVerifyConfig,
): Promise<VerifiedIdToken> {
  if (config.googleClientIds.length === 0) {
    throw new OAuthVerifyError("google sign-in is not configured");
  }

  try {
    const { payload } = await jwtVerify(idToken, googleKey(config), {
      audience: config.googleClientIds,
    });
    const iss = payload.iss;
    if (typeof iss !== "string" || !GOOGLE_ISSUERS.has(iss)) {
      throw new OAuthVerifyError("invalid google token issuer");
    }
    if (typeof payload.sub !== "string" || payload.sub.length === 0) {
      throw new OAuthVerifyError("invalid google token subject");
    }
    return { provider: "google", subject: payload.sub, email: emailFromPayload(payload) };
  } catch (cause) {
    if (cause instanceof OAuthVerifyError) throw cause;
    throw new OAuthVerifyError("invalid google id token");
  }
}

export async function verifyAppleIdToken(
  idToken: string,
  config: OAuthVerifyConfig,
  nonce?: string,
): Promise<VerifiedIdToken> {
  if (config.appleClientIds.length === 0) {
    throw new OAuthVerifyError("apple sign-in is not configured");
  }

  try {
    const { payload } = await jwtVerify(idToken, appleKey(config), {
      audience: config.appleClientIds,
      issuer: APPLE_ISSUER,
    });
    if (typeof payload.sub !== "string" || payload.sub.length === 0) {
      throw new OAuthVerifyError("invalid apple token subject");
    }
    if (nonce !== undefined) {
      const tokenNonce = payload.nonce;
      if (typeof tokenNonce !== "string" || tokenNonce !== appleNonceHash(nonce)) {
        throw new OAuthVerifyError("invalid apple token nonce");
      }
    }
    return { provider: "apple", subject: payload.sub, email: emailFromPayload(payload) };
  } catch (cause) {
    if (cause instanceof OAuthVerifyError) throw cause;
    throw new OAuthVerifyError("invalid apple id token");
  }
}

export async function verifyIdToken(
  provider: OAuthProvider,
  idToken: string,
  config: OAuthVerifyConfig,
  nonce?: string,
): Promise<VerifiedIdToken> {
  if (provider === "google") return verifyGoogleIdToken(idToken, config);
  return verifyAppleIdToken(idToken, config, nonce);
}
