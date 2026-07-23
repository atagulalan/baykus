import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { claim, exportZipUrl, importZip } from "../../api/client.ts";
import { HANDLE_PATTERN, sanitizeHandleInput } from "../../lib/handleInput.ts";

const AUTH_INPUT =
  "rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-snow transition-colors focus:border-yellow/50 focus:outline-none focus:ring-1 focus:ring-yellow/30";
const AUTH_PANEL =
  "flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-white/10 bg-[#101010] p-6 shadow-[0_16px_48px_rgba(0,0,0,0.5)] backdrop-blur-xl";
const AUTH_CTA =
  "rounded-full bg-yellow px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-[#080808] transition-opacity hover:opacity-90 disabled:opacity-50";
const AUTH_SECONDARY =
  "rounded-full border border-white/10 px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:border-white/20 hover:text-snow";

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
  const passwordValid = password.length >= 8;
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
      <div className="flex min-h-screen items-center justify-center bg-void px-4 text-snow">
        <div className={`${AUTH_PANEL} text-center`}>
          <p>
            <TriangleAlert
              size={32}
              strokeWidth={1.5}
              className="mx-auto text-yellow"
              aria-hidden
            />
          </p>
          <h1 className="font-display italic text-snow text-lg">{t("auth.claim.successTitle")}</h1>
          <p className="text-sm text-snow">{t("auth.claim.successBody")}</p>
          {seedWarning && <p className="text-sm text-yellow">{t("auth.claim.seedImportFailed")}</p>}
          <a href={exportZipUrl()} download className={AUTH_CTA}>
            {t("settings.data.export")}
          </a>
          <button
            type="button"
            onClick={() => navigate({ to: "/watch" })}
            className={AUTH_SECONDARY}
          >
            {t("auth.claim.continue")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-void px-4 text-snow">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          claimMutation.mutate();
        }}
        className={AUTH_PANEL}
      >
        <h1 className="text-center font-display italic text-snow text-xl">
          {t("auth.claim.title")}
        </h1>

        <label className="flex flex-col gap-1.5 text-sm">
          {t("auth.handle")}
          <input
            value={handle}
            onChange={(e) => setHandle(sanitizeHandleInput(e.target.value))}
            autoComplete="nickname"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            inputMode="text"
            pattern="[a-z0-9\-]{3,30}"
            className={AUTH_INPUT}
          />
          {handle.length > 0 && !handleValid && (
            <span className="text-xs text-red-400">{t("auth.claim.handleHint")}</span>
          )}
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          {t("auth.password")}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className={AUTH_INPUT}
          />
          {password.length > 0 && !passwordValid && (
            <span className="text-xs text-red-400">{t("auth.claim.passwordHint")}</span>
          )}
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          {t("auth.claim.confirmPassword")}
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            className={AUTH_INPUT}
          />
          {confirm.length > 0 && !passwordsMatch && (
            <span className="text-xs text-red-400">{t("auth.claim.passwordMismatch")}</span>
          )}
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          {t("auth.claim.seedZip")}
          <input
            type="file"
            accept=".zip,application/zip"
            onChange={(e) => setSeedFile(e.target.files?.[0] ?? null)}
            className="text-sm text-muted"
          />
        </label>

        {claimMutation.isError && <p className="text-sm text-red-400">{t("auth.claim.error")}</p>}

        <button
          type="submit"
          disabled={
            claimMutation.isPending || !handleValid || !passwordsMatch || !passwordValid
          }
          className={AUTH_CTA}
        >
          {t("auth.claim.submit")}
        </button>
      </form>
    </div>
  );
}
