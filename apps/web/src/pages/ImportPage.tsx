import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Check, CircleHelp, type LucideIcon, TriangleAlert, X } from "lucide-react";
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

const MATCH_STATUS_ICON: Record<TvTimeImportProgressEvent["status"], LucideIcon> = {
  matched: Check,
  fuzzy: CircleHelp,
  unmatched: X,
};

const MATCH_STATUS_CLASS: Record<TvTimeImportProgressEvent["status"], string> = {
  matched: "text-green-400",
  fuzzy: "text-yellow",
  unmatched: "text-muted",
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
        <h1 className="font-display italic text-snow text-2xl">{t("importWizard.title")}</h1>
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`flex cursor-pointer flex-col items-center gap-3 border-2 border-dashed p-10 text-center ${
            dragOver ? "border-yellow bg-yellow/5" : "border-white/10"
          }`}
        >
          <p className="text-sm text-muted">{t("importWizard.dropzone")}</p>
          <span className="bg-yellow px-4 py-2.5 font-mono text-[10px] text-[#080808] uppercase tracking-widest">
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
                    <p className="text-sm text-muted">
                      {latest
                        ? t("importWizard.uploadProgress", {
                            done: latest.done,
                            total: latest.total,
                          })
                        : t("importWizard.uploading")}
                    </p>
                    {latest && (
                      <div className="h-2 w-full overflow-hidden bg-white/10">
                        <div
                          className="h-full bg-yellow transition-[width] duration-300 ease-out"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    )}
                  </>
                );
              })()}
              <ul className="flex flex-col gap-0.5 text-left text-xs">
                {uploadLog.map((event, i) => {
                  const StatusIcon = MATCH_STATUS_ICON[event.status];
                  return (
                    <li
                      // biome-ignore lint/suspicious/noArrayIndexKey: log entries are append-only and never reordered
                      key={i}
                      className="truncate text-muted"
                    >
                      <span className={MATCH_STATUS_CLASS[event.status]}>
                        <StatusIcon
                          size={14}
                          strokeWidth={1.5}
                          className="inline shrink-0"
                          aria-hidden
                        />
                      </span>{" "}
                      {event.name}
                    </li>
                  );
                })}
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
      <div className="mx-auto flex max-w-md flex-col gap-4 border border-white/5 p-6">
        <h1 className="font-display italic text-snow text-xl">{t("importWizard.confirming")}</h1>

        <div className="flex flex-col gap-2">
          <div className="h-3 w-full overflow-hidden bg-white/10">
            <div
              className="h-full bg-yellow"
              style={{
                width: `${percent}%`,
                transition: "width 300ms ease-out",
              }}
            />
          </div>
          <div className="flex items-center justify-between font-mono text-xs text-muted">
            <span>
              {t("importWizard.confirmProgress", {
                done,
                total,
                percent,
              })}
            </span>
          </div>
          {progress?.name && <p className="truncate text-sm text-snow">{progress.name}</p>}
        </div>
      </div>
    );
  }

  if (step === "report" && report) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <h1 className="font-display italic text-snow text-2xl">{t("importWizard.reportTitle")}</h1>
        <div className="flex flex-col gap-4">
          <details
            className="border border-white/5 p-4 bg-[#101010]"
            open={report.fuzzy.length > 0}
          >
            <summary className="cursor-pointer select-none font-mono text-[10px] text-yellow uppercase tracking-widest flex items-center gap-2">
              <CircleHelp size={14} />
              {t("importWizard.fuzzy", { count: report.fuzzy.length })}
            </summary>
            <div className="mt-4 flex flex-col gap-2">
              {report.fuzzy.map((show) => (
                <div
                  key={show.name}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between text-sm p-3 bg-white/5 border border-white/5"
                >
                  <span className="truncate flex-1 font-display italic text-snow">{show.name}</span>
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
                    className="border border-white/10 bg-void px-3 py-2 text-sm text-snow focus:border-yellow focus:outline-none w-full sm:w-64 shrink-0"
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
                <p className="text-xs text-muted">{t("importWizard.none")}</p>
              )}
            </div>
          </details>

          <details
            className="border border-white/5 p-4 bg-[#101010]"
            open={report.fuzzy.length === 0}
          >
            <summary className="cursor-pointer select-none font-mono text-[10px] text-green-400 uppercase tracking-widest flex items-center gap-2">
              <Check size={14} />
              {t("importWizard.matched", { count: report.matched.length })}
            </summary>
            <div className="mt-4 flex flex-col gap-1">
              {report.matched.map((show) => {
                const hasDiscrepancy = show.episodes > show.providerEpisodeCount;
                return (
                  <div
                    key={show.name}
                    className="flex items-center justify-between text-sm py-1.5 border-b border-white/5 last:border-0 px-1"
                  >
                    <span className="truncate text-snow flex items-center gap-2">
                      {show.name}
                      {hasDiscrepancy && (
                        <span
                          title={t("importWizard.episodeDiscrepancy", {
                            tvTime: show.episodes,
                            provider: show.providerEpisodeCount,
                          })}
                        >
                          <TriangleAlert size={14} className="text-yellow" />
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-muted font-mono text-xs">
                      {t("importWizard.episodeCount", { count: show.episodes })}
                    </span>
                  </div>
                );
              })}
              {report.matched.length === 0 && (
                <p className="text-xs text-muted">{t("importWizard.none")}</p>
              )}
            </div>
          </details>

          <details className="border border-white/5 p-4 bg-[#101010]">
            <summary className="cursor-pointer select-none font-mono text-[10px] text-muted uppercase tracking-widest flex items-center gap-2">
              <X size={14} />
              {t("importWizard.unmatched", { count: report.unmatched.length })}
            </summary>
            <div className="mt-4 flex flex-col gap-1">
              {report.unmatched.map((show) => (
                <div
                  key={show.name}
                  className="flex items-center justify-between text-sm py-1.5 border-b border-white/5 last:border-0 px-1 text-muted"
                >
                  <span className="truncate">{show.name}</span>
                  <span className="shrink-0 font-mono text-xs">
                    {t("importWizard.episodeCount", { count: show.episodes })}
                  </span>
                </div>
              ))}
              {report.unmatched.length === 0 && (
                <p className="text-xs text-muted">{t("importWizard.none")}</p>
              )}
            </div>
          </details>
        </div>

        {report.skippedRelics.length > 0 && (
          <details className="border border-white/5 p-4 text-sm text-muted">
            <summary className="cursor-pointer select-none">
              {t("importWizard.skippedRelics", { count: report.skippedRelics.length })}
            </summary>
            <p className="mt-2 text-xs text-muted">{t("importWizard.skippedRelicsHint")}</p>
            <p className="mt-2 text-xs text-snow">
              {report.skippedRelics.map((relic) => relic.name).join(" · ")}
            </p>
          </details>
        )}

        {confirmError && <p className="text-sm text-red-400">{t("importWizard.confirmError")}</p>}
        <button
          type="button"
          onClick={handleConfirm}
          className="self-start bg-yellow px-4 py-2.5 font-mono text-[10px] text-[#080808] uppercase tracking-widest disabled:opacity-50"
        >
          {t("importWizard.confirm")}
        </button>
      </div>
    );
  }

  if (step === "summary" && summary) {
    return (
      <div className="mx-auto flex max-w-sm flex-col gap-4 border border-white/5 p-6 text-center">
        <h1 className="font-display italic text-snow text-xl">{t("importWizard.summaryTitle")}</h1>
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">{t("importWizard.itemsCreated")}</dt>
            <dd>{summary.itemsCreated}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">{t("importWizard.watchesCreated")}</dt>
            <dd>{summary.watchesCreated}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">{t("importWizard.skipped")}</dt>
            <dd>{summary.skipped}</dd>
          </div>
        </dl>
        <Link
          to="/"
          className="bg-yellow px-4 py-2.5 font-mono text-[10px] text-[#080808] uppercase tracking-widest"
        >
          {t("importWizard.goToLibrary")}
        </Link>
      </div>
    );
  }

  return null;
}
