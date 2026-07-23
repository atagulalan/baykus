import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { updateSettings } from "../../../api/client.ts";
import { buildImageUrl } from "../../../api/images.ts";
import type { Settings } from "../../../api/types.ts";
import { MediaImage } from "../../atoms/MediaImage/MediaImage.tsx";
import { Modal } from "../../molecules/Modal/Modal.tsx";

interface ProfileBannerPickerProps {
  bannerRef: string | null;
  children: (openPicker: () => void) => ReactNode;
}

/** WP4: banner shown at the top of the profile; set via series menu “Use as profile cover”. */
export function ProfileBannerPicker({ bannerRef, children }: ProfileBannerPickerProps) {
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
        <div className="flex flex-col gap-4 p-4">
          <p className="font-sans text-sm leading-relaxed text-muted">
            {t("profile.banner.howto")}
          </p>
          {bannerRef ? (
            <button
              type="button"
              onClick={() => mutation.mutate(null)}
              disabled={mutation.isPending}
              className="border border-white/10 py-2.5 font-sans text-sm text-muted transition-colors hover:text-snow disabled:opacity-50"
            >
              {t("profile.banner.clear")}
            </button>
          ) : null}
        </div>
      </Modal>
    </section>
  );
}
