import type { OAuthProvider } from "../api/types.ts";

const GOOGLE_PENDING_KEY = "baykus.oauth.google.pending";

declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (config: {
          clientId: string;
          scope: string;
          redirectURI: string;
          usePopup: boolean;
          state?: string;
          nonce?: string;
        }) => void;
        signIn: () => Promise<{
          authorization: { id_token: string; code?: string };
        }>;
      };
    };
  }
}

export function loadScript(src: string, id: string): Promise<void> {
  const existing = document.getElementById(id);
  if (existing) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`failed to load ${src}`));
    document.head.appendChild(script);
  });
}

function randomNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function googleOAuthRedirectUri(): string {
  return `${window.location.origin}/oauth-google.html`;
}

/**
 * Start Google sign-in via full-page redirect (no popup).
 * Avoids COOP / postMessage races that made popup flow ~50% reliable.
 * The static callback page writes the id_token into sessionStorage and
 * returns to returnTo; call takePendingGoogleIdToken() on that page.
 */
export function beginGoogleSignIn(clientId: string, returnTo = "/login"): void {
  const returnPath = returnTo.startsWith("/") ? returnTo : "/login";
  sessionStorage.setItem(
    GOOGLE_PENDING_KEY,
    JSON.stringify({ returnTo: returnPath, t: Date.now() }),
  );

  const redirectUri = googleOAuthRedirectUri();
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "id_token");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("nonce", randomNonce());
  authUrl.searchParams.set("prompt", "select_account");

  window.location.assign(authUrl.toString());
}

/** Consume id_token left by /oauth-google.html (once). Throws if Google stored an error. */
export function takePendingGoogleIdToken(): string | null {
  const tokenKey = "baykus.oauth.google.id_token";
  const errorKey = "baykus.oauth.google.error";
  const error = sessionStorage.getItem(errorKey);
  sessionStorage.removeItem(errorKey);
  sessionStorage.removeItem(GOOGLE_PENDING_KEY);
  if (error) {
    sessionStorage.removeItem(tokenKey);
    throw new Error(error);
  }
  const idToken = sessionStorage.getItem(tokenKey);
  sessionStorage.removeItem(tokenKey);
  return idToken;
}

/** Peek whether a Google callback just landed (without consuming). */
export function hasPendingGoogleIdToken(): boolean {
  return (
    Boolean(sessionStorage.getItem("baykus.oauth.google.id_token")) ||
    Boolean(sessionStorage.getItem("baykus.oauth.google.error"))
  );
}

/** @deprecated use beginGoogleSignIn + takePendingGoogleIdToken */
export async function signInWithGoogle(clientId: string): Promise<{ idToken: string }> {
  beginGoogleSignIn(clientId);
  // Navigation never resolves; callers must use the redirect flow.
  return new Promise(() => {});
}

/** Kept for Settings/DeleteAccount — uses redirect when Google. */
export async function mountGoogleButton(
  parent: HTMLElement,
  clientId: string,
  _onCredential: (idToken: string) => void,
  onError: (message: string) => void,
): Promise<() => void> {
  parent.replaceChildren();
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Continue with Google";
  btn.className =
    "rounded-full border border-white/10 px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-snow";
  btn.onclick = () => {
    try {
      beginGoogleSignIn(clientId, window.location.pathname || "/login");
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    }
  };
  parent.append(btn);
  return () => parent.replaceChildren();
}

/** Apple JS SDK popup — returns id_token + the nonce we sent. */
export async function signInWithApple(
  clientId: string,
): Promise<{ idToken: string; nonce: string }> {
  await loadScript(
    "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js",
    "baykus-apple-auth",
  );
  if (!window.AppleID?.auth) {
    throw new Error("AppleID SDK unavailable");
  }

  const nonce = randomNonce();
  window.AppleID.auth.init({
    clientId,
    scope: "name email",
    redirectURI: window.location.origin,
    usePopup: true,
    nonce,
  });

  const result = await window.AppleID.auth.signIn();
  const idToken = result.authorization?.id_token;
  if (!idToken) throw new Error("Apple sign-in returned no id_token");
  return { idToken, nonce };
}

export async function obtainIdToken(
  provider: OAuthProvider,
  clientId: string,
): Promise<{ idToken: string; nonce?: string }> {
  if (provider === "google") {
    beginGoogleSignIn(clientId);
    return new Promise(() => {});
  }
  return signInWithApple(clientId);
}
