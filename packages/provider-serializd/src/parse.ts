import type { ExternalRating, TagInfo } from "@baykus/provider-sdk";
import { ProviderError } from "@baykus/provider-sdk";
import { z } from "zod";

const PROVIDER_ID = "serializd";

const NEXT_DATA_PATTERN =
  /<script id="__NEXT_DATA__" type="application\/json">([\s\S]+?)<\/script>/;

const showDataSchema = z.object({
  showDetails: z.object({
    id: z.number(),
    name: z.string(),
  }),
  averageRating: z.number().nullable(),
  ratings: z.array(z.object({ rating: z.number(), ratingCount: z.number() })),
  nanogenres: z.array(z.object({ id: z.number(), name: z.string() })),
});

const nextDataSchema = z.object({
  props: z.object({
    pageProps: z.object({
      data: showDataSchema,
    }),
  }),
});

export type ShowData = z.infer<typeof showDataSchema>;

/** Extracts the raw JSON payload embedded by Next.js — everything downstream reads from here, never the DOM. */
export function extractNextData(html: string): unknown {
  const match = html.match(NEXT_DATA_PATTERN);
  if (!match?.[1]) {
    throw new ProviderError(PROVIDER_ID, "PARSE_FAILED", "__NEXT_DATA__ script tag not found");
  }
  try {
    return JSON.parse(match[1]);
  } catch (cause) {
    throw new ProviderError(PROVIDER_ID, "PARSE_FAILED", "malformed __NEXT_DATA__ JSON", { cause });
  }
}

/** Validates the shape we actually depend on; any drift (Serializd changing their page data) fails loudly and specifically, per Article IV's "scraper failure never breaks core flows" — the caller catches this and just omits the enrichment. */
export function parseShowData(nextData: unknown): ShowData {
  const result = nextDataSchema.safeParse(nextData);
  if (!result.success) {
    throw new ProviderError(
      PROVIDER_ID,
      "PARSE_FAILED",
      `unexpected __NEXT_DATA__ shape: ${result.error.message}`,
    );
  }
  return result.data.props.pageProps.data;
}

/** Serializd ratings are already on a 1-10 scale; `ratings[]` is the full per-step distribution. */
export function mapExternalRatings(data: ShowData): ExternalRating[] {
  if (data.averageRating === null || data.ratings.length === 0) return [];

  const distribution: Record<string, number> = {};
  let votes = 0;
  for (const step of data.ratings) {
    distribution[String(step.rating)] = step.ratingCount;
    votes += step.ratingCount;
  }

  return [
    {
      source: PROVIDER_ID,
      value: data.averageRating,
      scale: 10,
      votes,
      distribution,
      fetchedAt: new Date().toISOString(),
    },
  ];
}

/** "Nanogenres" are Serializd's curated mood/theme tags (e.g. "🏛️ Politics") — no imageRef: Serializd doesn't implement resolveImageUrl, so a persisted ref could never be displayed. */
export function mapTags(data: ShowData): TagInfo[] {
  return data.nanogenres.map((genre) => ({ source: PROVIDER_ID, id: genre.id, name: genre.name }));
}
