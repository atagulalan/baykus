import { and, eq } from "drizzle-orm";
import type { LibraryDatabase } from "../db/open.ts";
import type { RatingTargetType } from "../db/schema.ts";
import * as schema from "../db/schema.ts";

export interface Rating {
  targetType: RatingTargetType;
  targetId: number;
  value: 1 | 2 | 3;
  ratedAt: string;
}

/** Upsert. Out-of-range values are rejected by the DB's `ratings_value_range` CHECK. */
export function setRating(
  db: LibraryDatabase,
  targetType: RatingTargetType,
  targetId: number,
  value: 1 | 2 | 3,
): Rating {
  const ratedAt = new Date().toISOString();
  return db
    .insert(schema.ratings)
    .values({ targetType, targetId, value, ratedAt })
    .onConflictDoUpdate({
      target: [schema.ratings.targetType, schema.ratings.targetId],
      set: { value, ratedAt },
    })
    .returning()
    .get();
}

export function clearRating(
  db: LibraryDatabase,
  targetType: RatingTargetType,
  targetId: number,
): boolean {
  const result = db
    .delete(schema.ratings)
    .where(and(eq(schema.ratings.targetType, targetType), eq(schema.ratings.targetId, targetId)))
    .run();
  return result.changes > 0;
}

export function getRating(
  db: LibraryDatabase,
  targetType: RatingTargetType,
  targetId: number,
): Rating | null {
  const row = db
    .select()
    .from(schema.ratings)
    .where(and(eq(schema.ratings.targetType, targetType), eq(schema.ratings.targetId, targetId)))
    .get();
  return row ?? null;
}
