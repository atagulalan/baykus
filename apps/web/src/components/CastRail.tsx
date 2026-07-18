import { User } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { buildImageUrl } from "../api/images.ts";
import type { CastMember } from "../api/types.ts";
import { MediaImage } from "./MediaImage.tsx";

/** Circular actor photo; falls back to a placeholder glyph when there's no
 * profileRef, or the image 404s (e.g. its provider isn't registered right now). */
function CastPhoto({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        className="flex size-16 shrink-0 items-center justify-center rounded-full bg-white/5 text-muted"
        aria-hidden="true"
      >
        <User size={22} strokeWidth={1.5} />
      </div>
    );
  }
  return (
    <MediaImage
      src={src}
      alt={alt}
      wrapperClassName="block size-16 shrink-0 overflow-hidden rounded-full bg-white/5"
      className="size-full object-cover"
      spinnerSize={16}
      onError={() => setFailed(true)}
    />
  );
}

/** Horizontal rail of top-billed cast: photo, name, character (WP3 — spec 010). */
export function CastRail({ cast }: { cast: CastMember[] }) {
  const { t } = useTranslation();
  if (cast.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted">
        {t("series.cast.title")}
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {cast.map((member) => (
          <div
            key={member.id ?? `${member.name}-${member.order}`}
            className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5 text-center"
          >
            <CastPhoto src={buildImageUrl(member.profileRef ?? null, "thumb")} alt={member.name} />
            <p className="line-clamp-2 text-xs leading-tight text-snow">{member.name}</p>
            {member.character && (
              <p className="line-clamp-2 text-[11px] leading-tight text-muted">
                {member.character}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
