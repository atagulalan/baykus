# Self-hosting baykuş

baykuş's primary mode is **single mode**: one Docker container, one library,
no accounts, no hosted infrastructure required (Article I — everything
below works without any of it ever touching a shared/hosted instance).

## Quickstart (Docker Compose)

```bash
git clone <this repo>
cd baykus
cp compose.example.yml compose.yml
docker compose up -d
```

Open `http://localhost:4004`. That's it — no database to provision, no
build step to run by hand. Data (SQLite files, the image cache, push keys)
lives in the `baykus-data` Docker volume; nothing else is required to keep
working.

To build and run the image directly instead of via Compose:

```bash
docker build -t baykus .
docker run -d --name baykus -p 4004:4004 -v baykus-data:/data baykus
```

## Environment variables

All are optional — the app is fully usable with none of them set
(Article IV).

| Variable | Default | Purpose |
|---|---|---|
| `BAYKUS_MODE` | `single` | `single` (this guide) or `multi` (hosted, multiple handles — see below) |
| `BAYKUS_DATA_DIR` | `./data` | Where SQLite files, the image cache, and VAPID keys live. Set to `/data` automatically in the Docker image (the `VOLUME`). |
| `BAYKUS_PASSWORD` | *(unset)* | Optional password gate (FR-013). Unset means anyone who can reach the instance can use it — fine on a private network or behind your own auth layer. |
| `BAYKUS_TMDB_API_KEY` | *(unset)* | A [TMDB](https://www.themoviedb.org/settings/api) v4 read token (or v3 API key) for richer metadata, watch-provider info, and posters. Without one, search/details fall back to the keyless [TVmaze](https://www.tvmaze.com/api) provider automatically — nothing breaks. Can also be set later from Ayarlar (Settings) in the UI; the Settings value takes priority over this env var. |
| `BAYKUS_ENABLE_SCRAPERS` | `0` | Set to `1` to make the optional IMDb ratings dataset and Serializd tags/ratings available. This is a deployment-level floor: it can turn extra sources on even if the per-library Settings toggle is off, but the Settings toggle can also turn them on independently. IMDb's data is a bulk, ToS-fine, keyless dataset (~25 MB, refreshed every 24h); Serializd is genuine page scraping and may occasionally break if their site's markup changes (isolated failure — never breaks adding or refreshing a series). |
| `BAYKUS_VAPID_PUBLIC_KEY` / `BAYKUS_VAPID_PRIVATE_KEY` | *(auto-generated)* | Web Push keys. Single mode generates and persists its own keypair on first boot — you never need to set these unless you're pinning a specific keypair (e.g. across a full data-volume reset). Push notifications require HTTPS in real deployments; `http://localhost` is exempt during local testing. |
| `PORT` | `4004` | The port the server listens on inside the container. Change the Compose/`docker run` port *mapping*, not this, unless you also change the container's `EXPOSE`. |

`BAYKUS_MIGRATIONS_DIR` and `BAYKUS_WEB_DIST` are set automatically by the
Docker image's own `ENV` — you shouldn't need to touch them.

## Data & backups

Everything that matters is either:

- **On disk, in the `/data` volume** — SQLite is the canonical store. Back
  this volume up however you'd back up any file (a nightly `docker run
  --rm -v baykus-data:/data -v $(pwd):/backup alpine tar czf /backup/baykus-$(date +%F).tar.gz /data`
  works fine), or
- **In a zip export** — Ayarlar → Zip indir downloads your entire library
  (tracking, watch history, ratings, settings) as a single versioned,
  re-importable file. This is portable across instances and across
  versions (Article III) — images are excluded on purpose, they're a
  re-downloadable cache, never canonical data.

Restoring: point a fresh instance's `/data` volume at your backed-up files,
or import a zip export into an empty library from Ayarlar.

## Updating

Updates are manual by design (Article V — no background jobs baykuş
depends on):

```bash
git pull
docker compose up -d --build
```

Or, once images are published: `docker compose pull && docker compose up -d`.

## Reverse proxy / HTTPS

The container itself speaks plain HTTP on port 4004. For anything beyond
local/LAN use, put a reverse proxy in front that terminates TLS — any of
Caddy, nginx, Traefik, or a tunnel (e.g. Cloudflare Tunnel, Tailscale
Funnel) works; baykuş has no opinion here. Web Push notifications
specifically require the site to be served over HTTPS (or `localhost`) to
function in the browser.

## Multi mode

`BAYKUS_MODE=multi` is the mode behind the hosted baykus.xava.me instance:
multiple people claim a handle each, get an isolated per-handle SQLite
library (Article I: the multi-tenancy mapping is a thin layer in
`apps/server`, never leaking into the core domain model), and log in with a
handle + password. There is **no password recovery** — a claimed handle's
only durable backup is its zip export, and the claim screen says so loudly.
Multi mode additionally needs:

- `BAYKUS_TMDB_API_KEY` set server-side (search/metadata calls are proxied
  through the server so the key is never exposed to clients).
- A reverse proxy providing HTTPS (session cookies are `Secure`).
- Optionally, `BAYKUS_VAPID_PUBLIC_KEY`/`BAYKUS_VAPID_PRIVATE_KEY` set
  explicitly (rather than relying on single mode's auto-generate-on-boot
  behavior, since a horizontally-scaled or frequently-recreated multi-mode
  deployment should pin one keypair rather than generating a new one per
  container).

Most self-hosters only ever need single mode — multi mode exists for the
one-instance-many-users hosted case.
