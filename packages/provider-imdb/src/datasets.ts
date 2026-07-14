import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";

const DATASET_URL = "https://datasets.imdbws.com/title.ratings.tsv.gz";
const TTL_MS = 24 * 60 * 60 * 1000;

export interface ImdbRating {
  rating: number;
  votes: number;
}

interface DatasetMeta {
  downloadedAt: string;
}

function paths(dataDir: string) {
  const dir = join(dataDir, "imdb");
  return {
    dir,
    gzPath: join(dir, "title.ratings.tsv.gz"),
    metaPath: join(dir, "title.ratings.meta.json"),
  };
}

function isFresh(meta: DatasetMeta, now: number): boolean {
  return now - new Date(meta.downloadedAt).getTime() < TTL_MS;
}

async function downloadDataset(dataDir: string): Promise<void> {
  const { dir, gzPath, metaPath } = paths(dataDir);
  mkdirSync(dir, { recursive: true });

  const res = await fetch(DATASET_URL);
  if (!res.ok) throw new Error(`imdb dataset download failed: HTTP ${res.status}`);
  const body = Buffer.from(await res.arrayBuffer());

  writeFileSync(gzPath, body);
  const meta: DatasetMeta = { downloadedAt: new Date().toISOString() };
  writeFileSync(metaPath, JSON.stringify(meta));
}

/** `title.ratings.tsv.gz` columns: tconst, averageRating, numVotes (tab-separated, header row first). */
export function parseRatingsTsv(text: string): Map<string, ImdbRating> {
  const index = new Map<string, ImdbRating>();
  const lines = text.split("\n");

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const [tconst, ratingRaw, votesRaw] = line.split("\t");
    if (!tconst || ratingRaw === undefined || votesRaw === undefined) continue;
    const rating = Number.parseFloat(ratingRaw);
    const votes = Number.parseInt(votesRaw, 10);
    if (!Number.isFinite(rating) || !Number.isFinite(votes)) continue;
    index.set(tconst, { rating, votes });
  }

  return index;
}

export interface RatingsIndex {
  get(imdbId: string): Promise<ImdbRating | undefined>;
}

/**
 * Downloads+caches IMDb's public non-commercial dataset (24h TTL, keyless —
 * distinct from scraping a live page, hence enabled by default in single
 * mode per M8.3's DoD) and serves lookups from an in-memory Map built once
 * per fresh download (~1.5-2M rows; multi mode keeps this provider off by
 * default specifically to avoid the recurring ~25MB/day bandwidth, not
 * memory). The Map is only rebuilt when the on-disk file's downloadedAt
 * timestamp actually changes.
 */
export function createRatingsIndex(dataDir: string): RatingsIndex {
  let index: Map<string, ImdbRating> | null = null;
  let indexBuiltFromDownloadedAt: string | null = null;

  async function ensureIndex(): Promise<Map<string, ImdbRating>> {
    const { gzPath, metaPath } = paths(dataDir);
    const now = Date.now();

    const currentMeta = existsSync(metaPath)
      ? (JSON.parse(readFileSync(metaPath, "utf-8")) as DatasetMeta)
      : null;
    if (!currentMeta || !isFresh(currentMeta, now)) {
      await downloadDataset(dataDir);
    }

    const meta = JSON.parse(readFileSync(metaPath, "utf-8")) as DatasetMeta;
    if (index && indexBuiltFromDownloadedAt === meta.downloadedAt) return index;

    const text = gunzipSync(readFileSync(gzPath)).toString("utf-8");
    index = parseRatingsTsv(text);
    indexBuiltFromDownloadedAt = meta.downloadedAt;
    return index;
  }

  return {
    async get(imdbId: string): Promise<ImdbRating | undefined> {
      const idx = await ensureIndex();
      return idx.get(imdbId);
    },
  };
}
