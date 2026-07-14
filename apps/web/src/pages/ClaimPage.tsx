import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { claim, exportZipUrl, importZip } from "../api/client.ts";

const HANDLE_PATTERN = /^[a-z0-9-]{3,30}$/;

export function ClaimPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [seedFile, setSeedFile] = useState<File | null>(null);
  const [claimedHandle, setClaimedHandle] = useState<string | null>(null);
  const [seedWarning, setSeedWarning] = useState(false);

  const passwordsMatch = password.length > 0 && password === confirm;
  const handleValid = HANDLE_PATTERN.test(handle);

  const claimMutation = useMutation({
    mutationFn: async () => {
      const result = await claim({ handle, password });
      if (seedFile) {
        try {
          await importZip(seedFile, "replace");
        } catch {
          setSeedWarning(true);
        }
      }
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["auth-session"] });
      setClaimedHandle(result.handle);
    },
  });

  if (claimedHandle) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-100">
        <div className="flex w-full max-w-sm flex-col gap-4 rounded-lg bg-zinc-900 p-6 text-center">
          <p className="text-3xl">⚠️</p>
          <h1 className="font-bold text-lg">{t("auth.claim.successTitle")}</h1>
          <p className="text-sm text-zinc-300">{t("auth.claim.successBody")}</p>
          {seedWarning && (
            <p className="text-sm text-amber-400">{t("auth.claim.seedImportFailed")}</p>
          )}
          <a
            href={exportZipUrl()}
            download
            className="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white"
          >
            {t("settings.data.export")}
          </a>
          <button
            type="button"
            onClick={() => navigate({ to: "/" })}
            className="rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-300"
          >
            {t("auth.claim.continue")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-100">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          claimMutation.mutate();
        }}
        className="flex w-full max-w-sm flex-col gap-4 rounded-lg bg-zinc-900 p-6"
      >
        <h1 className="text-center font-bold text-xl">🦉 {t("auth.claim.title")}</h1>

        <label className="flex flex-col gap-1 text-sm">
          {t("auth.handle")}
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            autoComplete="username"
            className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5"
          />
          {handle.length > 0 && !handleValid && (
            <span className="text-xs text-red-400">{t("auth.claim.handleHint")}</span>
          )}
        </label>

        <label className="flex flex-col gap-1 text-sm">
          {t("auth.password")}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          {t("auth.claim.confirmPassword")}
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5"
          />
          {confirm.length > 0 && !passwordsMatch && (
            <span className="text-xs text-red-400">{t("auth.claim.passwordMismatch")}</span>
          )}
        </label>

        <label className="flex flex-col gap-1 text-sm">
          {t("auth.claim.seedZip")}
          <input
            type="file"
            accept=".zip,application/zip"
            onChange={(e) => setSeedFile(e.target.files?.[0] ?? null)}
            className="text-sm text-zinc-400"
          />
        </label>

        {claimMutation.isError && <p className="text-sm text-red-400">{t("auth.claim.error")}</p>}

        <button
          type="submit"
          disabled={
            claimMutation.isPending || !handleValid || !passwordsMatch || password.length < 8
          }
          className="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {t("auth.claim.submit")}
        </button>
      </form>
    </div>
  );
}
