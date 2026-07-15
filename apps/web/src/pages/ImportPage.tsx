import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type DragEvent, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { confirmTvTimeImport, importTvTime } from "../api/client.ts";
import type {
  ExternalIds,
  TvTimeConfirmProgressEvent,
  TvTimeConfirmResult,
  TvTimeImportProgressEvent,
  TvTimeReport,
} from "../api/types.ts";

type Step = "upload" | "report" | "confirming" | "summary";

const UPLOAD_LOG_LIMIT = 8;

const MATCH_STATUS_MARK: Record<TvTimeImportProgressEvent["status"], string> = {
  matched: "✓",
  fuzzy: "?",
  unmatched: "✗",
};

const MATCH_STATUS_CLASS: Record<TvTimeImportProgressEvent["status"], string> = {
  matched: "text-emerald-400",
  fuzzy: "text-amber-400",
  unmatched: "text-zinc-600",
};

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
  const [progress, setProgress] = useState<TvTimeConfirmProgressEvent | null>(null);
  const [confirmError, setConfirmError] = useState(false);
  const [uploadLog, setUploadLog] = useState<TvTimeImportProgressEvent[]>([]);
  const confirmingRef = useRef(false);

  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      importTvTime(file, (event) => {
        setUploadLog((prev) => [event, ...prev].slice(0, UPLOAD_LOG_LIMIT));
      }),
    onSuccess: (result) => {
      setReport(result);
      setStep("report");
    },
  });

  function handleConfirm() {
    if (!report || confirmingRef.current) return;
    confirmingRef.current = true;
    setConfirmError(false);
    setProgress(null);
    setStep("confirming");

    const chosen = Object.entries(resolutions).map(([name, externalIds]) => ({
      name,
      externalIds,
    }));

    confirmTvTimeImport(report.reportId, chosen, (event) => {
      setProgress(event);
    })
      .then((result) => {
        setSummary(result);
        setStep("summary");
      })
      .catch(() => {
        setConfirmError(true);
        setStep("report");
      })
      .finally(() => {
        confirmingRef.current = false;
      });
  }

  function handleFile(file: File) {
    setUploadLog([]);
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
            <div className="flex w-full flex-col gap-2">
              {(() => {
                const latest = uploadLog[0];
                const percent =
                  latest && latest.total > 0 ? Math.round((latest.done / latest.total) * 100) : 0;
                return (
                  <>
                    <p className="text-sm text-zinc-400">
                      {latest
                        ? t("importWizard.uploadProgress", {
                            done: latest.done,
                            total: latest.total,
                          })
                        : t("importWizard.uploading")}
                    </p>
                    {latest && (
                      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-[width] duration-300 ease-out"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    )}
                  </>
                );
              })()}
              <ul className="flex flex-col gap-0.5 text-left text-xs">
                {uploadLog.map((event, i) => (
                  <li
                    // biome-ignore lint/suspicious/noArrayIndexKey: log entries are append-only and never reordered
                    key={i}
                    className="truncate text-zinc-500"
                  >
                    <span className={MATCH_STATUS_CLASS[event.status]}>
                      {MATCH_STATUS_MARK[event.status]}
                    </span>{" "}
                    {event.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {uploadMutation.isError && (
            <p className="text-sm text-red-400">{t("importWizard.uploadError")}</p>
          )}
        </label>
      </div>
    );
  }

  if (step === "confirming") {
    const done = progress?.done ?? 0;
    const total = progress?.total ?? 1;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;

    return (
      <div className="mx-auto flex max-w-md flex-col gap-4 rounded-lg bg-zinc-900 p-6">
        <h1 className="font-semibold text-xl">{t("importWizard.confirming")}</h1>

        <div className="flex flex-col gap-2">
          <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{
                width: `${percent}%`,
                transition: "width 300ms ease-out",
              }}
            />
          </div>
          <div className="flex items-center justify-between text-sm text-zinc-400">
            <span>
              {t("importWizard.confirmProgress", {
                done,
                total,
                percent,
              })}
            </span>
          </div>
          {progress?.name && <p className="truncate text-sm text-zinc-300">{progress.name}</p>}
        </div>
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

        {confirmError && <p className="text-sm text-red-400">{t("importWizard.confirmError")}</p>}
        <button
          type="button"
          onClick={handleConfirm}
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
