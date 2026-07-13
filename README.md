# baykuş 🦉

Dizi (ve ileride film + kitap) takip uygulaması. TV Time / Serializd benzeri, ama:

- **Self-hosted önce**: Tek bir Docker container ile kendi sunucunda çalışır.
- **Hosted da var**: [baykus.xava.me](https://baykus.xava.me) üzerinde herkes bir handle claim edip kendi kütüphanesini tutabilir.
- **Verin senindir**: Tüm kütüphane (izleme geçmişi, puanlar, gelecek bölümler, platform bilgileri) tek bir zip dosyası olarak indirilebilir/yüklenebilir. Görseller hariç — onlar tekrar indirilebilir önbellektir.
- **Tamamen modüler**: Metadata sağlayıcıları (TMDB, TVmaze, IMDb, Serializd) bağımsız kütüphaneler olarak `packages/` altında yaşar ve çekirdek uygulama hiçbirine doğrudan bağımlı değildir.

## Özellikler (v1 — dizi modülü)

- Dizi arama ve kütüphaneye ekleme (TMDB birincil, TVmaze anahtar gerektirmeyen fallback)
- Bölüm bazında izleme takibi: izleme tarihi, tekrar izleme (rewatch), sezon/dizi toplu işaretleme
- Takip durumu: izliyorum / izleyeceğim / bitirdim / bıraktım / ara verdim
- 3'lü puanlama: **1 = kötü, 2 = normal, 3 = iyi** (dizi ve bölüm seviyesinde)
- Yaklaşan bölümler takvimi (uygulama içi) + web push bildirimi
- Hangi platformda yayında bilgisi (TMDB watch providers)
- Manuel metadata güncelleme — zamanlanmış arka plan işi gerekmez, "Yenile" butonu yeter
- Zip export/import (taşınabilir, sürümlü format)
- TV Time'dan veri aktarımı (GDPR export'u)
- Türkçe + İngilizce arayüz

Sonraki modüller: film, kitap. Mimari en baştan çoklu medya tipine göre tasarlandı; bkz. [specs/](specs/).

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
| [fixtures/README.md](fixtures/README.md) | Test fixture'ları — kaynak ve yeniden yakalama komutları |
| [docs/spec-kit.md](docs/spec-kit.md) | Spec-driven development metodolojisi ve yeni feature ekleme süreci |
| [AGENTS.md](AGENTS.md) | AI ajanları için proje talimatları |

## Geliştirme

Durum: **M0 (scaffold) tamam** — lint + typecheck + test + build yeşil.
Sıradaki iş: `specs/001-series-tracking/tasks.md` → M1.

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
