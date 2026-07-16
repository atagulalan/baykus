import { useState } from "react";
import { buildImageUrl } from "../api/images.ts";
import type { SearchResult } from "../api/types.ts";

/** Falls back to a plain glyph on a 404/missing poster — shared by SearchBar and SearchPage. */
export function SearchResultThumb({ result }: { result: SearchResult }) {
  const [failed, setFailed] = useState(false);
  const url = buildImageUrl(result.posterRef);
  if (!url || failed) {
    return (
      <span className="flex h-10 w-7 shrink-0 items-center justify-center rounded bg-zinc-800 text-xs">
        🎬
      </span>
    );
  }
  return (
    <img
      src={url}
      alt=""
      className="h-10 w-7 shrink-0 rounded object-cover"
      onError={() => setFailed(true)}
    />
  );
}
