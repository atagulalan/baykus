import { Clapperboard } from "lucide-react";
import { useState } from "react";
import { buildImageUrl } from "../../../api/images.ts";
import type { SearchResult } from "../../../api/types.ts";
import { MediaImage } from "../../atoms/MediaImage/MediaImage.tsx";

/**
 * Poster-sized thumb, wider on phones where the result list is the browsing
 * surface (mirrors the browse grid's 2/3 posters) and compact from `sm` up
 * where the list stays dense and keyboard-driven.
 */
const THUMB_BOX =
  "aspect-[2/3] w-12 shrink-0 rounded-md bg-white/5 ring-1 ring-white/5 ring-inset sm:w-8";

/** Falls back to a clapperboard glyph on a 404/missing poster — used by SearchPage (E77). */
export function SearchResultThumb({ result, id }: { result: SearchResult; id?: string }) {
  const [failed, setFailed] = useState(false);
  const url = buildImageUrl(result.posterRef);
  if (!url || failed) {
    return (
      <span
        id={id}
        className={`flex items-center justify-center text-muted ${THUMB_BOX}`}
        aria-hidden
      >
        <Clapperboard className="size-5 sm:size-3.5" strokeWidth={1.5} />
      </span>
    );
  }
  return (
    <MediaImage
      id={id}
      src={url}
      alt=""
      wrapperClassName={`block overflow-hidden ${THUMB_BOX}`}
      className="h-full w-full object-cover"
      spinnerSize={14}
      onError={() => setFailed(true)}
    />
  );
}
