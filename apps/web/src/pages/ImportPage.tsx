import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type DragEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { confirmTvTimeImport, importTvTime } from "../api/client.ts";
import type { ExternalIds, TvTimeConfirmResult, TvTimeReport } from "../api/types.ts";

type Step = "upload" | "report" | "summary";

function candidateKey(candidate: { externalIds: ExternalIds }): string {
  const ids = candidate.externalIds;
  return `${ids.tmdbId ?? ""}:${ids.tvmazeId ?? ""}:${ids.imdbId ?? ""}:${ids.tvdbId ?? ""}`;
}

export function ImportPage() {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("upload");
  const [dragOver, setDragOver] = useState(false);
  const [report, setReport] = useState<TvTimeReport | null>(null);
  const [resolutions, setResolutions] = useState<Record<string, ExternalIds>>({});
  const [summary, setSummary] = useState<TvTimeConfirmResult | null>(null);

  const uploadMutation = useMutation({
    mutationFn: importTvTime,
    onSuccess: (result) => {
      setReport(result);
      setStep("report");
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => {
      if (!report) throw new Error("no report");
      const chosen = Object.entries(resolutions).map(([name, externalIds]) => ({
        name,
        externalIds,
      }));
      return confirmTvTimeImport(report.reportId, chosen);
    },
    onSuccess: (result) => {
      setSummary(result);
      setStep("summary");
    },
  });

  function handleFile(file: File) {
    uploadMutation.mutate(file);
  }

  function onDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  if (step === "upload") {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4">
        <h1 className="font-semibold text-2xl">{t("importWizard.title")}</h1>
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed p-10 text-center ${
            dragOver ? "border-emerald-500 bg-zinc-900" : "border-zinc-700"
          }`}
        >
          <p className="text-sm text-zinc-400">{t("importWizard.dropzone")}</p>
          <span className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white">
            {t("importWizard.chooseFile")}
          </span>
          <input
            type="file"
            accept=".zip,.csv,application/zip,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          {uploadMutation.isPending && (
            <p className="text-sm text-zinc-400">{t("importWizard.uploading")}</p>
          )}
          {uploadMutation.isError && (
            <p className="text-sm text-red-400">{t("importWizard.uploadError")}</p>
          )}
        </label>
      </div>
    );
  }

  if (step === "report" && report) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <h1 className="font-semibold text-2xl">{t("importWizard.reportTitle")}</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <section className="flex flex-col gap-2 rounded-lg bg-zinc-900 p-4">
            <h2 className="font-medium text-sm text-zinc-300">
              {t("importWizard.matched", { count: report.matched.length })}
            </h2>
            {report.matched.map((show) => (
              <div key={show.name} className="flex items-center justify-between text-sm">
                <span className="truncate">{show.name}</span>
                <span className="shrink-0 text-emerald-400">
                  ✓ {t("importWizard.episodeCount", { count: show.episodes })}
                </span>
              </div>
            ))}
            {report.matched.length === 0 && (
              <p className="text-xs text-zinc-500">{t("importWizard.none")}</p>
            )}
          </section>

          <section className="flex flex-col gap-2 rounded-lg bg-zinc-900 p-4">
            <h2 className="font-medium text-sm text-zinc-300">
              {t("importWizard.fuzzy", { count: report.fuzzy.length })}
            </h2>
            {report.fuzzy.map((show) => (
              <div key={show.name} className="flex flex-col gap-1 text-sm">
                <span className="truncate">{show.name}</span>
                <select
                  value={resolutions[show.name] ? JSON.stringify(resolutions[show.name]) : ""}
                  onChange={(e) => {
                    setResolutions((prev) => {
                      const next = { ...prev };
                      if (!e.target.value) {
                        delete next[show.name];
                      } else {
                        next[show.name] = JSON.parse(e.target.value) as ExternalIds;
                      }
                      return next;
                    });
                  }}
                  className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs"
                >
                  <option value="">{t("importWizard.pickCandidate")}</option>
                  {show.candidates.map((candidate) => (
                    <option
                      key={candidateKey(candidate)}
                      value={JSON.stringify(candidate.externalIds)}
                    >
                      {candidate.title}
                      {candidate.year ? ` (${candidate.year})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            {report.fuzzy.length === 0 && (
              <p className="text-xs text-zinc-500">{t("importWizard.none")}</p>
            )}
          </section>

          <section className="flex flex-col gap-2 rounded-lg bg-zinc-900 p-4">
            <h2 className="font-medium text-sm text-zinc-300">
              {t("importWizard.unmatched", { count: report.unmatched.length })}
            </h2>
            {report.unmatched.map((show) => (
              <div
                key={show.name}
                className="flex items-center justify-between text-sm text-zinc-500"
              >
                <span className="truncate">{show.name}</span>
                <span className="shrink-0">
                  {t("importWizard.episodeCount", { count: show.episodes })}
                </span>
              </div>
            ))}
            {report.unmatched.length === 0 && (
              <p className="text-xs text-zinc-500">{t("importWizard.none")}</p>
            )}
          </section>
        </div>

        {confirmMutation.isError && (
          <p className="text-sm text-red-400">{t("importWizard.confirmError")}</p>
        )}
        <button
          type="button"
          onClick={() => confirmMutation.mutate()}
          disabled={confirmMutation.isPending}
          className="self-start rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {t("importWizard.confirm")}
        </button>
      </div>
    );
  }

  if (step === "summary" && summary) {
    return (
      <div className="mx-auto flex max-w-sm flex-col gap-4 rounded-lg bg-zinc-900 p-6 text-center">
        <h1 className="font-semibold text-xl">{t("importWizard.summaryTitle")}</h1>
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-400">{t("importWizard.itemsCreated")}</dt>
            <dd>{summary.itemsCreated}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-400">{t("importWizard.watchesCreated")}</dt>
            <dd>{summary.watchesCreated}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-400">{t("importWizard.skipped")}</dt>
            <dd>{summary.skipped}</dd>
          </div>
        </dl>
        <Link to="/" className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white">
          {t("importWizard.goToLibrary")}
        </Link>
      </div>
    );
  }

  return null;
}
