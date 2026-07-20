import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate, useNavigate } from "@tanstack/react-router";
import { Bird } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { getAuthSession, login } from "../../api/client.ts";

const AUTH_INPUT =
  "rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-snow transition-colors focus:border-yellow/50 focus:outline-none focus:ring-1 focus:ring-yellow/30";
const AUTH_PANEL =
  "flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-white/10 bg-[#101010] p-6 shadow-[0_16px_48px_rgba(0,0,0,0.5)] backdrop-blur-xl";
const AUTH_CTA =
  "rounded-full bg-yellow px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-[#080808] transition-opacity hover:opacity-90 disabled:opacity-50";

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");

  const sessionQuery = useQuery({ queryKey: ["auth-session"], queryFn: getAuthSession });

  const loginMutation = useMutation({
    mutationFn: () =>
      login(sessionQuery.data?.mode === "multi" ? { handle, password } : { password }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth-session"] });
      navigate({ to: "/watch" });
    },
  });

  if (sessionQuery.isLoading) return null;
  if (sessionQuery.data?.authenticated) return <Navigate to="/watch" />;

  const mode = sessionQuery.data?.mode;

  return (
    <div className="flex min-h-screen items-center justify-center bg-void px-4 text-snow">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          loginMutation.mutate();
        }}
        className={AUTH_PANEL}
      >
        <h1 className="flex items-center justify-center gap-2 text-center font-display italic text-xl text-snow">
          <Bird size={22} strokeWidth={1.5} aria-hidden />
          {t("app.name")}
        </h1>

        {mode === "multi" && (
          <label className="flex flex-col gap-1.5 text-sm">
            {t("auth.handle")}
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              autoComplete="username"
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
          <Link to="/claim" className="text-center text-sm text-muted underline hover:text-snow">
            {t("auth.needAccount")}
          </Link>
        )}
      </form>
    </div>
  );
}
