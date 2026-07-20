import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { updateSettings } from "../../../api/client.ts";
import { buildImageUrl } from "../../../api/images.ts";
import type { SeriesSummary, Settings } from "../../../api/types.ts";
import { MediaImage } from "../../atoms/MediaImage/MediaImage.tsx";
import { Modal } from "../../molecules/Modal/Modal.tsx";

interface ProfileBannerPickerProps {
  bannerRef: string | null;
  /** Watched-series backdrops to offer, already filtered to `backdropRef != null` by the caller. */
  candidates: SeriesSummary[];
  children: (openPicker: () => void) => ReactNode;
}

/** WP4: banner shown at the top of the profile, picked from the library's own backdrops. */
export function ProfileBannerPicker({ bannerRef, candidates, children }: ProfileBannerPickerProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: (ref: string | null) => updateSettings({ bannerRef: ref }),
    onSuccess: (settings) => {
      queryClient.setQueryData<Settings>(["settings"], settings);
      setOpen(false);
    },
  });

  const bannerUrl = buildImageUrl(bannerRef, "large");

  return (
    <section className="relative -mt-[var(--app-header-height)]">
      {/* Same backdrop stack as SeriesDetailPage hero (E146 / E183) — only when a banner is set. */}
      {bannerUrl ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <MediaImage
            src={bannerUrl}
            alt=""
            wrapperClassName="absolute inset-0 block size-full bg-void"
            className="size-full object-cover object-top"
            fadeDurationMs={1200}
            spinnerSize={24}
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-black/45" />
          <div className="absolute inset-0 hidden bg-gradient-to-r from-void via-transparent to-void sm:block" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-void/20 to-void" />
        </div>
      ) : null}

      <div
        className={
          bannerUrl
            ? "relative z-10 flex min-h-[24rem] items-end pb-4 pt-20 sm:min-h-[30rem] sm:pb-12 sm:pt-32"
            : "relative z-10 flex items-end pb-2 pt-[calc(var(--app-header-height)+0.75rem)]"
        }
      >
        <div className="w-full">{children(() => setOpen(true))}</div>
      </div>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={t("profile.banner.title")}>
        <div className="p-4">
          {candidates.length === 0 ? (
            <p className="py-6 text-center font-mono text-xs text-muted-dim">
              {t("profile.banner.empty")}
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {bannerRef && (
                <button
                  type="button"
                  onClick={() => mutation.mutate(null)}
                  disabled={mutation.isPending}
                  className="border border-white/10 py-2 font-mono text-[10px] text-muted uppercase tracking-widest transition-colors hover:text-snow disabled:opacity-50"
                >
                  {t("profile.banner.clear")}
                </button>
              )}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {candidates.map((series) => {
                  const thumbUrl = buildImageUrl(series.backdropRef, "medium");
                  if (!thumbUrl) return null;
                  const selected = series.backdropRef === bannerRef;
                  return (
                    <button
                      key={series.id}
                      type="button"
                      onClick={() => mutation.mutate(series.backdropRef)}
                      disabled={mutation.isPending}
                      aria-pressed={selected}
                      className={`relative aspect-video overflow-hidden border transition-colors disabled:opacity-50 ${
                        selected ? "border-yellow" : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      <MediaImage
                        src={thumbUrl}
                        alt={series.title}
                        wrapperClassName="block h-full w-full"
                        className="h-full w-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </section>
  );
}
