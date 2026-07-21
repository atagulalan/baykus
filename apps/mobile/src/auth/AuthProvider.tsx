import {
  type AuthSession,
  login as apiLogin,
  logout as apiLogout,
  getAuthSession,
  type OAuthCallbackResult,
  type OAuthProvider,
  oauthCallback,
  oauthClaim,
} from "@baykus/api-client";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { clearAccessToken, setAccessToken } from "../lib/session.ts";

export type OAuthFinishResult =
  | { status: "authenticated"; handle: string }
  | { status: "needs_handle"; pendingToken: string };

type AuthContextValue = {
  session: AuthSession | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  loginWithPassword: (handle: string, password: string) => Promise<void>;
  /** POST /auth/oauth/callback with returnToken; stores Bearer on authenticated. */
  finishOAuth: (payload: {
    provider: OAuthProvider;
    idToken: string;
    nonce?: string;
  }) => Promise<OAuthFinishResult>;
  /** Complete first-time OAuth handle claim (014 E114). */
  claimOAuthHandle: (pendingToken: string, handle: string) => Promise<string>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function toFinishResult(result: OAuthCallbackResult): OAuthFinishResult {
  if (result.status === "authenticated") {
    return { status: "authenticated", handle: result.handle };
  }
  return { status: "needs_handle", pendingToken: result.pendingToken };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const next = await getAuthSession();
      setSession(next);
    } catch (err) {
      setSession(null);
      setError(err instanceof Error ? err.message : "session_failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loginWithPassword = useCallback(
    async (handle: string, password: string) => {
      const result = await apiLogin({
        ...(handle ? { handle } : {}),
        password,
        returnToken: true,
      });
      if (result.token) await setAccessToken(result.token);
      await refresh();
    },
    [refresh],
  );

  const finishOAuth = useCallback(
    async (payload: {
      provider: OAuthProvider;
      idToken: string;
      nonce?: string;
    }): Promise<OAuthFinishResult> => {
      const result = await oauthCallback({
        ...payload,
        returnToken: true,
      });
      if (result.status === "authenticated") {
        if (result.token) await setAccessToken(result.token);
        await refresh();
      }
      return toFinishResult(result);
    },
    [refresh],
  );

  const claimOAuthHandle = useCallback(
    async (pendingToken: string, handle: string): Promise<string> => {
      const result = await oauthClaim({
        pendingToken,
        handle,
        returnToken: true,
      });
      if (result.token) await setAccessToken(result.token);
      await refresh();
      return result.handle;
    },
    [refresh],
  );

  const signOut = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // Still clear local token if the network call fails.
    }
    await clearAccessToken();
    await refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      session,
      loading,
      error,
      refresh,
      loginWithPassword,
      finishOAuth,
      claimOAuthHandle,
      signOut,
    }),
    [session, loading, error, refresh, loginWithPassword, finishOAuth, claimOAuthHandle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
