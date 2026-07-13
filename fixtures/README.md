# Fixtures

Recorded provider responses used by tests (Constitution Article II: **no network
in tests, ever**). All fixtures use House of the Dragon as the reference series:
TMDB `94997` · TVmaze `44778` · TVDB `371572` · IMDb `tt11198330`.

| Path | Provenance | Notes |
|---|---|---|
| `tvmaze/search-shows.json` | **REAL** capture, 2026-07-14 | `GET https://api.tvmaze.com/search/shows?q=house%20of%20the%20dragon` |
| `tvmaze/lookup-by-imdb.json` | **REAL** capture, 2026-07-14 | `GET https://api.tvmaze.com/lookup/shows?imdb=tt11198330` (follows 301) |
| `tvmaze/show-details-embed-episodes.json` | **REAL** capture, 2026-07-14 | `GET https://api.tvmaze.com/shows/44778?embed=episodes` — 26 eps incl. future air dates (calendar tests) |
| `serializd/show-94997-next-data.json` | **REAL** capture, 2026-07-13 | Full `__NEXT_DATA__` JSON from `https://www.serializd.com/show/House-of-the-Dragon-94997`. Parser input = `props.pageProps.data` |
| `tmdb/search-tv.json` | ⚠️ RECONSTRUCTED from docs | No API key available at capture time |
| `tmdb/tv-details.json` | ⚠️ RECONSTRUCTED from docs | incl. `external_ids` + `content_ratings` appends |
| `tmdb/tv-season-1.json` | ⚠️ RECONSTRUCTED from docs | 3 of 10 episodes; crew/guest_stars emptied |
| `tmdb/tv-watch-providers.json` | ⚠️ RECONSTRUCTED from docs | JustWatch-sourced; attribution required in UI |
| `tvtime/*.csv` | ⚠️ SYNTHETIC | Header names representative of TV Time GDPR exports; importer must detect files by header, not filename |

## Rules

- Reconstructed TMDB fixtures carry a `__fixture_note` field. **Milestone M4
  task M4.1 replaces them with real captures** (and deletes the note fields).
  Until then, treat field names as authoritative, sample values as plausible.
- Never hand-edit REAL captures. Re-capture instead:

```bash
# TVmaze (keyless; respect 20 req / 10 s)
curl -s "https://api.tvmaze.com/search/shows?q=house%20of%20the%20dragon" > tvmaze/search-shows.json
curl -sL "https://api.tvmaze.com/lookup/shows?imdb=tt11198330" > tvmaze/lookup-by-imdb.json
curl -s "https://api.tvmaze.com/shows/44778?embed=episodes" > tvmaze/show-details-embed-episodes.json

# TMDB (needs $TMDB_KEY, v4 read token)
curl -s -H "Authorization: Bearer $TMDB_KEY" "https://api.themoviedb.org/3/search/tv?query=house%20of%20the%20dragon" > tmdb/search-tv.json
curl -s -H "Authorization: Bearer $TMDB_KEY" "https://api.themoviedb.org/3/tv/94997?append_to_response=external_ids,content_ratings" > tmdb/tv-details.json
curl -s -H "Authorization: Bearer $TMDB_KEY" "https://api.themoviedb.org/3/tv/94997/season/1" > tmdb/tv-season-1.json
curl -s -H "Authorization: Bearer $TMDB_KEY" "https://api.themoviedb.org/3/tv/94997/watch/providers" > tmdb/tv-watch-providers.json

# Serializd (browser UA required, otherwise Cloudflare 403)
curl -s -A "Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0" \
  "https://www.serializd.com/show/House-of-the-Dragon-94997" \
  | python3 -c "import sys,re,json; print(re.search(r'__NEXT_DATA__\" type=\"application/json\">(.*?)</script>', sys.stdin.read(), re.S).group(1))" \
  > serializd/show-94997-next-data.json
```
