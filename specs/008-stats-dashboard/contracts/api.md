# API Contract Delta 008 — Extended GET /api/stats

**NORMATIVE.** Overrides the `stats` section of 001's contracts/api.md as
amended by 005 and 007 (E86). Every section not listed here is unchanged.
Conventions (error envelope, `X-Baykus` header, zod validation, ISO
timestamps) unchanged. Every change is **additive** — no field is removed,
renamed, or reshaped, so server and web may land in either order.

## GET /api/stats?tz=<IANA>

- New optional query param `tz` — an IANA timezone name (e.g.
  `Europe/Istanbul`). Invalid or absent → **UTC** (no error; E96). All
  day/week/month/hour bucketing below uses this zone; rolling windows
  (last 7/30 days, pace) are instant-based and zone-independent.
- "Dated" below = watches with `dateUnknown = false` (E95).
- All `watchTimeMin` values use the E13 runtime fallback, rounded to
  integer minutes.

### Response (existing fields unchanged, new fields appended)

```jsonc
{
  // ——— unchanged from 001/007 ———
  "episodesWatched": 7171,            // distinct episodes, all watches
  "watchTimeMin": 260700,             // all watch events
  "itemCount": { "needs_review": 0, "watching": 14, /* …8 categories */ },
  "episodesPerMonth": [{ "month": "2026-01", "count": 12 }],  // legacy, UI-unused (E111)
  "ratingDistribution": { "1": 0, "2": 0, "3": 0 },
  "mostRewatched": [ /* E86 shape */ ],

  // ——— new (008) ———
  "seriesCount": 262,
  "favoritesCount": 18,
  "datedWatches": { "dated": 3099, "total": 7171 },          // E95

  "recent": {                                                 // E96; dated only
    "last7Days":  { "episodes": 2,  "watchTimeMin": 46 },
    "last30Days": { "episodes": 21, "watchTimeMin": 512 },
    "thisMonth":  { "episodes": 0,  "watchTimeMin": 0 }
  },

  "mostWatchedByTime": [                                      // E110; top 12
    { "itemId": 1, "title": "House", "watchTimeMin": 7920 }
  ],

  "favoriteProgress": [                                       // E108; all favorites, watched desc
    { "itemId": 2, "title": "The Mentalist",
      "watchedEpisodes": 151, "airedEpisodes": 151 }
  ],

  "production": {                                             // E109
    "ongoing": 47, "ended": 215,
    "ongoingItems": [                                         // alphabetical
      { "itemId": 3, "title": "Ahsoka",
        "watchedEpisodes": 8, "airedEpisodes": 8 }
    ]
  },

  "genreDistribution": {                                      // E98; distinct watched episodes
    "top":   [{ "name": "Drama", "episodes": 4492 }],         // max 8
    "other": 7847                                             // overlap-counted remainder
  },
  "networkDistribution": {                                    // E98; primary network only
    "networkCount": 51,
    "top":   [{ "name": "Netflix", "episodes": 1186 }],       // max 8
    "other": 2801
  },

  "backlog": {                                                // E99; active trio
    "episodes": 137, "seriesCount": 14, "watchTimeMin": 3900,
    "topSeries": [{ "itemId": 4, "title": "…", "episodes": 24 }]  // top 10
  },
  "pace": {                                                   // E100; null when no dated
    "episodesPerWeek": 4.2, "projectedWeeks": 33              //      watches in 56 days
  },

  "upcoming": {                                               // E101; active trio
    "months": [                                               // current month → last with data,
      { "month": "2026-07", "episodes": 17, "watchTimeMin": 597 } // current+next always present
    ]
  },

  "binges": [                                                 // E102; top 10, dated only
    { "itemId": 5, "title": "Brooklyn Nine-Nine",
      "date": "2019-05-19", "episodes": 33 }
  ],

  "rewatchSummary": {                                         // E103
    "totalRewatches": 1, "rewatchedEpisodes": 1,
    "bySeries": [{ "itemId": 6, "title": "Person of Interest", "rewatches": 1 }]
  },

  "streaks": {                                                // E104; dated only
    "longestWeeks": 32, "currentWeeks": 4,
    "bySeries": [{ "itemId": 7, "title": "Suits", "weeks": 16 }]  // top 10; [0] = mostConsistent
  },

  "timeByYear": [                                             // E105; years desc, dated only
    { "year": 2026, "totalMin": 2160,
      "monthlyMin": [277, 193, 201, 522, 0, 0, 0, 0, 0, 0, 0, 0],   // 12, calendar year
      "weeklyMin": [{ "week": 1, "min": 130 }] }                    // ISO weeks, non-zero only
  ],

  "activityByDay": [                                          // E106; non-zero local days,
    { "date": "2026-01-05", "count": 2 }                      //       all years, dated only
  ],

  "byWeekday": [474, 356, 426, 411, 441, 562, 429],           // E107; Monday-first, 7 ints
  "byHour": [176, 59, /* … 24 ints, hour 0–23 */]             // E107
}
```

### Notes

- `pace` is `null` (not `{0, null}`) when the 56-day window has no dated
  watches.
- `activityByDay` spans every year with data; the client groups by year for
  the selector. Zero-count days are never emitted.
- `timeByYear[].monthlyMin` is always length 12 (zeros included);
  `weeklyMin` lists only non-zero ISO weeks of that ISO week-year.
- Empty library ⇒ all new arrays empty, counters 0, `pace: null`,
  `datedWatches: {0,0}` — never an error.
- Auth: unchanged (session-gated like the rest of `/api/*`, 005 rules).
