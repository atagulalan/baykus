import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate, useNavigate } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { getAuthSession, login, oauthCallback, oauthClaim } from "../../api/client.ts";
import { OAuthButtons } from "../../components/molecules/OAuthButtons/OAuthButtons.tsx";
import { HANDLE_PATTERN, sanitizeHandleInput } from "../../lib/handleInput.ts";

const AUTH_INPUT =
  "rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-snow transition-colors focus:border-yellow/50 focus:outline-none focus:ring-1 focus:ring-yellow/30";
const AUTH_PANEL =
  "flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-white/10 bg-[#101010] p-6 shadow-[0_16px_48px_rgba(0,0,0,0.5)] backdrop-blur-xl";
const AUTH_CTA =
  "rounded-full bg-yellow px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-[#080808] transition-opacity hover:opacity-90 disabled:opacity-50";
const AUTH_SECONDARY =
  "rounded-full border border-white/10 px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:border-white/20 hover:text-snow";

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [oauthHandle, setOauthHandle] = useState("");
  const [claimedHandle, setClaimedHandle] = useState<string | null>(null);

  const sessionQuery = useQuery({ queryKey: ["auth-session"], queryFn: getAuthSession });

  const loginMutation = useMutation({
    mutationFn: () =>
      login(sessionQuery.data?.mode === "multi" ? { handle, password } : { password }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth-session"] });
      navigate({ to: "/watch" });
    },
  });

  const oauthClaimMutation = useMutation({
    mutationFn: () => {
      if (!pendingToken) throw new Error("no pending token");
      return oauthClaim({ pendingToken, handle: oauthHandle });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["auth-session"] });
      setClaimedHandle(result.handle);
      setPendingToken(null);
    },
  });

  if (sessionQuery.isLoading) return null;
  if (sessionQuery.data?.authenticated && !claimedHandle) return <Navigate to="/watch" />;

  const mode = sessionQuery.data?.mode;
  const oauthProviders = sessionQuery.data?.oauthProviders ?? {};
  const oauthHandleValid = HANDLE_PATTERN.test(oauthHandle);

  if (claimedHandle) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-void px-4 text-snow">
        <div className={`${AUTH_PANEL} text-center`}>
          <TriangleAlert size={32} strokeWidth={1.5} className="mx-auto text-yellow" aria-hidden />
          <h1 className="font-display italic text-snow text-lg">{t("auth.claim.successTitle")}</h1>
          <p className="text-sm text-snow">{t("auth.oauth.backupReminder")}</p>
          <button type="button" onClick={() => navigate({ to: "/watch" })} className={AUTH_CTA}>
            {t("auth.claim.continue")}
          </button>
        </div>
      </div>
    );
  }

  if (pendingToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-void px-4 text-snow">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            oauthClaimMutation.mutate();
          }}
          className={AUTH_PANEL}
        >
          <h1 className="text-center font-display italic text-xl text-snow">
            {t("auth.oauth.pickHandle")}
          </h1>
          <label className="flex flex-col gap-1.5 text-sm">
            {t("auth.handle")}
            <input
              value={oauthHandle}
              onChange={(e) => setOauthHandle(sanitizeHandleInput(e.target.value))}
              autoComplete="nickname"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
              pattern="[a-z0-9\-]{3,30}"
              className={AUTH_INPUT}
            />
            {oauthHandle.length > 0 && !oauthHandleValid && (
              <span className="text-xs text-red-400">{t("auth.claim.handleHint")}</span>
            )}
          </label>
          {oauthClaimMutation.isError && (
            <p className="text-sm text-red-400">{t("auth.claim.error")}</p>
          )}
          <button
            type="submit"
            disabled={oauthClaimMutation.isPending || !oauthHandleValid}
            className={AUTH_CTA}
          >
            {t("auth.oauth.finish")}
          </button>
          <button type="button" onClick={() => setPendingToken(null)} className={AUTH_SECONDARY}>
            {t("search.cancel")}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-void px-4 text-snow">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          loginMutation.mutate();
        }}
        className={AUTH_PANEL}
      >
        <h1 className="text-center font-display italic text-xl text-snow">{t("app.name")}</h1>

        {mode === "multi" && (
          <label className="flex flex-col gap-1.5 text-sm">
            {t("auth.handle")}
            <input
              value={handle}
              onChange={(e) => setHandle(sanitizeHandleInput(e.target.value))}
              autoComplete="username"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
              pattern="[a-z0-9\-]{3,30}"
              className={AUTH_INPUT}
            />
          </label>
        )}

        <label className="flex flex-col gap-1.5 text-sm">
          {t("auth.password")}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className={AUTH_INPUT}
          />
        </label>

        {loginMutation.isError && <p className="text-sm text-red-400">{t("auth.loginError")}</p>}

        <button
          type="submit"
          disabled={loginMutation.isPending || !password || (mode === "multi" && !handle)}
          className={AUTH_CTA}
        >
          {t("auth.login")}
        </button>

        {mode === "multi" && (
          <OAuthButtons
            providers={oauthProviders}
            callback={oauthCallback}
            onAuthenticated={() => {
              queryClient.invalidateQueries({ queryKey: ["auth-session"] });
              navigate({ to: "/watch" });
            }}
            onNeedsHandle={setPendingToken}
          />
        )}

        {mode === "multi" && (
          <Link to="/claim" className="text-center text-sm text-muted underline hover:text-snow">
            {t("auth.needAccount")}
          </Link>
        )}
      </form>
    </div>
  );
}
