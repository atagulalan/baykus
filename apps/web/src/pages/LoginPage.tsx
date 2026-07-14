import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { getAuthSession, login } from "../api/client.ts";

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
      navigate({ to: "/" });
    },
  });

  if (sessionQuery.isLoading) return null;
  if (sessionQuery.data?.authenticated) return <Navigate to="/" />;

  const mode = sessionQuery.data?.mode;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-100">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          loginMutation.mutate();
        }}
        className="flex w-full max-w-sm flex-col gap-4 rounded-lg bg-zinc-900 p-6"
      >
        <h1 className="text-center font-bold text-xl">🦉 {t("app.name")}</h1>

        {mode === "multi" && (
          <label className="flex flex-col gap-1 text-sm">
            {t("auth.handle")}
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              autoComplete="username"
              className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5"
            />
          </label>
        )}

        <label className="flex flex-col gap-1 text-sm">
          {t("auth.password")}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5"
          />
        </label>

        {loginMutation.isError && <p className="text-sm text-red-400">{t("auth.loginError")}</p>}

        <button
          type="submit"
          disabled={loginMutation.isPending || !password || (mode === "multi" && !handle)}
          className="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {t("auth.login")}
        </button>

        {mode === "multi" && (
          <Link to="/claim" className="text-center text-sm text-zinc-400 underline">
            {t("auth.needAccount")}
          </Link>
        )}
      </form>
    </div>
  );
}
