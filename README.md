# baykuş 🦉

Dizi (ve ileride film + kitap) takip uygulaması. TV Time / Serializd benzeri, ama:

- **Self-hosted önce**: Tek bir Docker container ile kendi sunucunda çalışır.
- **Hosted da var**: [baykus.xava.me](https://baykus.xava.me) üzerinde herkes bir handle claim edip kendi kütüphanesini tutabilir.
- **Verin senindir**: Tüm kütüphane (izleme geçmişi, puanlar, gelecek bölümler, platform bilgileri) tek bir zip dosyası olarak indirilebilir/yüklenebilir. Görseller hariç — onlar tekrar indirilebilir önbellektir.
- **Tamamen modüler**: Metadata sağlayıcıları (TMDB, TVmaze, IMDb, Serializd) bağımsız kütüphaneler olarak `packages/` altında yaşar ve çekirdek uygulama hiçbirine doğrudan bağımlı değildir.

## Özellikler (v1 — dizi modülü)

- Dizi arama ve kütüphaneye ekleme (TMDB birincil, TVmaze anahtar gerektirmeyen fallback)
- Bölüm bazında izleme takibi: izleme tarihi, tekrar izleme (rewatch), sezon/dizi toplu işaretleme
- Dinamik kategoriler (otomatik hesaplanır): izleniyor, bir süredir izlenmedi, daha başlanmadı,
  güncel, bitirildi — artı iki manuel liste (sonra izlenecek, bırakıldı) kullanıcı tarafından
  ayarlanabilir ve bir bölüm izlenince otomatik temizlenir
- 3'lü puanlama: **1 = kötü, 2 = normal, 3 = iyi** (dizi ve bölüm seviyesinde)
- Takvim: zaman çizelgesi (gün gün, BUGÜN'e otomatik scroll) ve ay görünümü modları, artı web
  push bildirimi — ikisi de sadece aktif (izlenen) dizilere odaklanır
- İzleme sayfası: son 30 izlemenin geçmişi, sıradaki bölümler ve bir süredir izlenmeyenler
  bölümleri, hızlı işaretleme
- Hangi platformda yayında bilgisi (TMDB watch providers)
- Manuel metadata güncelleme — zamanlanmış arka plan işi gerekmez, "Yenile" butonu yeter
- Zip export/import (taşınabilir, sürümlü format)
- TV Time'dan veri aktarımı (GDPR export'u)
- Türkçe + İngilizce arayüz

Sonraki modüller: film, kitap. Mimari en baştan çoklu medya tipine göre tasarlandı; bkz. [specs/](specs/).

## Ekran görüntüleri

| Kütüphane | Dizi detayı | Takvim |
|---|---|---|
| ![Kütüphane](docs/images/library.png) | ![Dizi detayı](docs/images/series-detail.png) | ![Takvim](docs/images/calendar.png) |

> Bu görüntüler spec 002 (dinamik kategoriler, takvim modları, izleme
> sayfası) öncesinden kalma — güncel arayüzü tam yansıtmıyor. Otonom
> yürütmede tarayıcı erişimi olmadığı için yenilenemedi; bir sonraki
> tarayıcılı oturumda güncellenmeli.

## Mimari (özet)

```
baykus/  (pnpm monorepo — paketler npm'e yayınlanmaz, workspace olarak yaşar)
├── apps/
│   ├── web/                  # Vite + React SPA
│   └── server/               # Hono API — single (self-host) & multi (hosted) mod
├── packages/
│   ├── core/                 # Domain modeli, SQLite (Drizzle), zip export/import
│   ├── provider-sdk/         # MetadataProvider arayüzü + ortak tipler
│   ├── provider-tmdb/        # TMDB sağlayıcısı (API key gerekir)
│   ├── provider-tvmaze/      # TVmaze sağlayıcısı (anahtarsız)
│   ├── provider-imdb/        # IMDb scraper (opsiyonel, sadece puanlar)
│   ├── provider-serializd/   # Serializd scraper (opsiyonel)
│   └── importer-tvtime/      # TV Time export dönüştürücü
└── specs/                    # Spec-driven development dokümanları
```

**Tek kavram: Kütüphane (Library).** Çekirdek uygulama tek kullanıcılık bir kütüphane yönetir. Self-hosted kurulumda bir tane kütüphane vardır. baykus.xava.me'de ise her handle bir kütüphaneye eşlenir — çok kullanıcılılık çekirdeğe sızmaz, ince bir katmandır.

**Veri:** Canonical veri SQLite'tadır (hız + sorgu kolaylığı). Zip, taşınabilirlik formatıdır: içinde sürümlü JSON dosyaları bulunur ve kayıpsız round-trip garanti edilir. Görseller zip'e girmez; disk üzerindeki önbellekte tutulur ve gerektiğinde sağlayıcılardan yeniden indirilir.

## Dokümanlar

| Doküman | İçerik |
|---|---|
| [.specify/memory/constitution.md](.specify/memory/constitution.md) | Proje anayasası — değişmez ilkeler |
| [specs/001-series-tracking/spec.md](specs/001-series-tracking/spec.md) | v1 fonksiyonel spec (user story + gereksinimler) |
| [specs/001-series-tracking/plan.md](specs/001-series-tracking/plan.md) | Teknik plan (stack, modüller, API) |
| [specs/001-series-tracking/data-model.md](specs/001-series-tracking/data-model.md) | SQLite şeması + zip formatı (normatif kopya: `packages/core/src/db/schema.ts`) |
| [specs/001-series-tracking/contracts/api.md](specs/001-series-tracking/contracts/api.md) | HTTP API kontratı — endpoint başına istek/yanıt örnekleri |
| [specs/001-series-tracking/ui.md](specs/001-series-tracking/ui.md) | Ekran spesifikasyonları, wireframe'ler, i18n kuralları |
| [specs/001-series-tracking/research.md](specs/001-series-tracking/research.md) | Sağlayıcı API'leri, scraping riskleri, TV Time formatı |
| [specs/001-series-tracking/tasks.md](specs/001-series-tracking/tasks.md) | Dikey milestone'lar (M0–M9), görev başına Files/DoD/Tests/Verify |
| [specs/002-watch-categories/spec.md](specs/002-watch-categories/spec.md) | v2 delta spec — dinamik kategoriler, takvim modları, izleme sayfası (001 üzerine, 001 ile çakışırsa 002 kazanır) |
| [specs/002-watch-categories/tasks.md](specs/002-watch-categories/tasks.md) | 002'nin milestone'ları (M10–M13) |
| [fixtures/README.md](fixtures/README.md) | Test fixture'ları — kaynak ve yeniden yakalama komutları |
| [docs/spec-kit.md](docs/spec-kit.md) | Spec-driven development metodolojisi ve yeni feature ekleme süreci |
| [docs/self-hosting.md](docs/self-hosting.md) | Self-host kurulum rehberi (Docker, ortam değişkenleri, yedekleme) |
| [AGENTS.md](AGENTS.md) | AI ajanları için proje talimatları |

## Hızlı başlangıç (Docker)

Kendi sunucunda tek komutla çalıştırmak için (tek kullanıcı modu):

```bash
cp compose.example.yml compose.yml
docker compose up -d
```

`http://localhost:4004` üzerinden açılır. Detaylı kurulum, ortam
değişkenleri ve yedekleme için [docs/self-hosting.md](docs/self-hosting.md)'ye
bakın.

## Geliştirme

Durum: **v1 (M0–M9.4) tamam**, M9.2 hariç (bkz.
[001 tasks.md](specs/001-series-tracking/tasks.md)) — gerçek DNS/TLS/hosting
erişimi gerektirdiği için otonom yürütme kapsamı dışında bırakıldı.

**Spec 002 (dinamik kategoriler, takvim modları, izleme sayfası) — M10–M13.1
tamam** (bkz. [002 tasks.md](specs/002-watch-categories/tasks.md)): lint +
typecheck + test yeşil (394 test), her E16–E29 kararının en az bir testi var,
zip round-trip v2'de yeşil. Kalan iş: M10.8/M11.4/M12.4 checkpoint'lerinin
tarayıcı doğrulaması — otonom yürütmede tarayıcı erişimi yok, adımlar
[MANUELTEST.md](MANUELTEST.md)'de toplandı; sonrasında M13.2 kapanır.

```bash
pnpm install
pnpm dev          # server (4004) + web (5173, /api ve /img proxy'li)
pnpm test         # vitest, tüm workspace (pnpm test packages/core gibi daraltılabilir)
pnpm typecheck
pnpm lint         # biome (düzeltme: pnpm exec biome check --write .)
pnpm build        # web → apps/web/dist, server → apps/server/dist
```

## Lisans

MIT (planlanan).
