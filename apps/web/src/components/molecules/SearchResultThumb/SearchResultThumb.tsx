import { useState } from "react";
import { buildImageUrl } from "../../../api/images.ts";
import type { SearchResult } from "../../../api/types.ts";
import { MediaImage } from "../../atoms/MediaImage/MediaImage.tsx";

/** Falls back to a plain glyph on a 404/missing poster — used by SearchPage (E77). */
export function SearchResultThumb({ result, id }: { result: SearchResult; id?: string }) {
  const [failed, setFailed] = useState(false);
  const url = buildImageUrl(result.posterRef);
  if (!url || failed) {
    return (
      <span
        id={id}
        className="flex h-10 w-7 shrink-0 items-center justify-center bg-white/5 text-xs"
      >
        🎬
      </span>
    );
  }
  return (
    <MediaImage
      id={id}
      src={url}
      alt=""
      wrapperClassName="block h-10 w-7 shrink-0 bg-white/5"
      className="h-full w-full object-cover"
      spinnerSize={12}
      onError={() => setFailed(true)}
    />
  );
}
