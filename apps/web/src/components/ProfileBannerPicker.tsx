import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { updateSettings } from "../api/client.ts";
import { buildImageUrl } from "../api/images.ts";
import type { SeriesSummary, Settings } from "../api/types.ts";
import { MediaImage } from "./MediaImage.tsx";
import { Modal } from "./Modal.tsx";

interface ProfileBannerPickerProps {
  bannerRef: string | null;
  /** Watched-series backdrops to offer, already filtered to `backdropRef != null` by the caller. */
  candidates: SeriesSummary[];
}

/** WP4: banner shown at the top of the profile, picked from the library's own backdrops. */
export function ProfileBannerPicker({ bannerRef, candidates }: ProfileBannerPickerProps) {
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
    <div className="relative aspect-[3/1] w-full overflow-hidden border border-white/5 bg-[#101010] sm:aspect-[4/1]">
      {bannerUrl && (
        <MediaImage
          src={bannerUrl}
          alt=""
          wrapperClassName="block h-full w-full"
          className="h-full w-full object-cover"
        />
      )}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("profile.banner.edit")}
        title={t("profile.banner.edit")}
        className="absolute right-2 bottom-2 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-void/80 text-snow backdrop-blur-sm transition-colors hover:bg-void"
      >
        <Camera size={16} strokeWidth={1.5} aria-hidden="true" />
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={t("profile.banner.title")}>
        <div className="p-4">
          {candidates.length === 0 ? (
            <p className="py-6 text-center font-mono text-xs text-muted/70">
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
    </div>
  );
}
