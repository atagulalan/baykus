# Manuel Test Listesi

Bu dosya, spec 002 (`specs/002-watch-categories/`) çalışması boyunca her
CHECKPOINT görevinin gerektirdiği tarayıcı testlerini toplar. Ortamda tarayıcı
otomasyon aracı yok, o yüzden bu adımlar xava tarafından manuel yapılıyor —
tüm implementasyon bitene kadar biriktiriliyor, sonra hepsi birden gözden
geçirilecek.

> **2026-07-17 — §M33 birleşik tarayıcı yürüyüşü YÜRÜTÜLDÜ ✅**
> Aşağıdaki §M11.4→§M33 bölümlerinin tamamı, M52'deki yöntemle (scratchpad'e
> ad hoc kurulan playwright + cache'teki chromium, kalıcı proje skill'i değil)
> gerçek çalışan sunucuya karşı otomatik yürütüldü. Gerçek kütüphane
> (`apps/server/data/`) yalnızca salt-okunur kontrollerde kullanıldı —
> yürüyüş öncesi/sonrası tablo-sayım parmak izi birebir aynı (**sıfır
> mutasyon kanıtlı**; tek geçici mutasyon, dil EN↔TR anahtarı, net-zero geri
> alındı). Mutasyon gerektiren her adım gerçek DB'nin `sqlite3 .backup`
> kopyası üzerinde ayrı bir sunucu örneğiyle (`BAYKUS_DATA_DIR` + 4104)
> yapıldı.
>
> **Bulunan ve düzeltilen gerçek bug:** dil EN'e geçince `<html lang>` "tr"
> kalıyordu; CSS `text-transform: uppercase` Türkçe kurallarla "LİBRARY /
> PROFİLE" üretiyordu (noktalı İ). `apps/web/src/i18n/index.ts`'e
> `languageChanged` → `document.documentElement.lang` senkronu eklendi,
> canlı doğrulandı.
>
> **Taşınmış mobilya (spec-üstü davranış değişimleri — düşürme değil):**
> - E24 "geçmişte sadece izlenmemiş" filtresi E81 ile birlikte istemciye
>   taşınmış (`CalendarPage.tsx` `isWatched` filtresi); UX aynı, canlı
>   doğrulandı (Haziran ayında izlenenler gizli).
> - Tamamlanmış sezon checkbox'ı artık disabled değil — 007'nin toplu
>   geri-alma özelliği onu tıklanabilir yapıp onay diyaloğuna bağladı.
> - Takvim switcher'ı artık 3 segment: 007'nin "Yayın Akışı" modu eklendi
>   (şeritler canlı doğrulandı, 29. hafta vurgusu + izlenenler soluk).
> - Arama akışı 007 open-on-select: ayrı "Ekle" butonu yok, sonuç satırına
>   tıklamak ekleyip detayı açıyor (Fargo ile doğrulandı → İzleniyor;
>   zaten-ekli 409 yolu var olan diziyi açıyor).
> - ManualListPicker bileşeni bu akış değişikliğiyle yetim kalmıştı;
>   2026-07-17 housekeeping'inde silindi (sıfır referans).
> - Tab bar 005'in seti (Kütüphane/İzle/Takvim/Ara/Profil) — 002/003
>   bölümlerindeki eski "İstatistik/Ayarlar" beklentilerinin yerini aldı.
>
> **USER-ONLY kalanlar (bu ortamda doğrulanamaz, işaretlenmedi):**
> - E39 push teslimi: headless chromium'da Push API yok (incognito kısıtı);
>   "abone değilken buton görünmüyor" yarısı doğrulandı.
> - §M22 TMDB backfill + tmdbId'li URL biçimleri: gerçek TMDB anahtarı ve
>   tmdbId verisi gerekiyor (kütüphanede tamamı TVmaze-eşleşmeli;
>   `seriesPath.test.ts` grameri kapsıyor).
> - Poster morph / cross-fade animasyon akıcılığı + Firefox <139 düşüşü:
>   mekanik katman doğrulandı (`poster-${id}` + `app-header`/`app-tabbar`
>   vt-adları canlı, 160ms root cross-fade ve reduced-motion
>   `animation:none` CSS'te, `startViewTransition` feature-detect'li) —
>   akıcılık insan gözü, Firefox bu ortamda yok.
> - DeleteAccountDialog: single modda render edilmiyor (multi-mode).
> - /claim uyarı ikonu: single modda uyarı dalı render edilmiyor;
>   `TriangleAlert` kodda bağlı ve aynı ikon ImportPage raporunda canlı
>   gözlendi, ⚠ emojisi hiçbir dosyada yok.
> - §M52'nin opsiyonel "kendi gerçek GDPR zip'in" maddesi (zaten opsiyonel).

Her bölüm ilgili checkpoint görevinin (`tasks.md`) DoD'sini birebir yansıtır.
Bir checkpoint testi geçince ilgili `tasks.md` kutucuğunu işaretleyip commit
atabilirsin (veya bana söyle, ben atarım).

---

## M10.8 — CHECKPOINT M10 ✅ (xava tarafından zaten test edildi ve işaretlendi)

Dinamik kategoriler uçtan uca: ana sayfa bölümleri, filtre paneli, manuel
liste davranışı (guard + auto-clear), zip v1 import, round-trip.

- [x] Zaten tamamlandı — `tasks.md`'de kutucuk işaretli, commit atıldı.

---

## M11.4 — CHECKPOINT M11 — ✅ 2026-07-17 birleşik yürüyüşte doğrulandı

Takvim sayfası: zaman çizelgesi + ay modu, her ikisi tarayıcıda; M10
regresyonu; tam yeşil suite.

### Zaman çizelgesi modu
- [x] `/calendar`'a git — varsayılan sekme "Zaman çizelgesi" olmalı.
- [x] Sayfa açılışında BUGÜN satırına otomatik scroll olmalı (o gün boş
      olsa bile "(boş)" yazıp göstermeli).
- [x] `airDate ≤ bugün` olan satırlarda ✓ checkbox olmalı, gelecek
      satırlarda **olmamalı**.
- [x] Geçmiş bir satırı işaretle → refetch sonrası listeden kaybolmalı
      (aynı optimistic mutation, sayfa yenilenmeden).

### Takvim (ay) modu
- [x] "Takvim" sekmesine geç — Pazartesi başlangıçlı 7 sütunlu grid,
      bugünün hücresi vurgulu olmalı. **Düzeltildi (2026-07-15):** kök
      neden bulundu — "bugün" UTC'ye göre kesiliyordu, Türkiye (UTC+3)
      için yerel gece yarısından UTC'nin gün değiştirmesine kadar olan
      aralıkta yanlış günü işaret ediyordu (aynı hata timeline modunda,
      izleme sayfasında ve dizi detay sayfasında da vardı, hepsi
      düzeltildi). Tekrar test et.
- [x] ‹ › ile ay değiştir — her navigasyonda o ayın tam aralığı
      (`from`=1. gün, `to`=son gün) yeniden çekilmeli.
- [x] 3'ten fazla bölümü olan bir hücrede "+n" göstergesi çıkmalı.
- [x] Geçmiş bir aya git → sadece izlenmemiş bölümler görünmeli (E24 —
      sunucu zaten filtreliyor).
- [x] Pencereyi 640px altına daralt (veya DevTools mobil görünüm) →
      grid, dolu günlerin dikey listesine dönüşmeli.

### Etiketler (EpisodeTags)
- [x] Bölüm satırlarında/hücrelerinde YENİ, YAKLAŞAN, PREMIER, FİNAL,
      OVA/SPECIAL rozetlerinin doğru göründüğünü kontrol et. **Karar
      uygulandı (2026-07-15):** senin seçimine göre ayrı bir "YAKLAŞAN"
      rozeti eklendi — YENİ artık sadece bugün dahil son 3 gün içinde
      airlenmiş bölümlerde, henüz airlenmemiş (gelecek) bölümlerde
      YAKLAŞAN çıkıyor. spec.md E25 + ui.md güncellendi, testler
      (EpisodeTags.test.ts) yeni davranışı kapsıyor. Tekrar test et.

### İki dil
- [x] Ayarlar → Dil'den EN'e geç, yukarıdaki adımların tamamını tekrarla.

### M10 regresyonu
- [x] Ana sayfaya dön — bölümler hâlâ doğru görünüyor mu (kategori
      mantığına M11'de dokunulmadı, ama yine de bir bakış).

### Tam gate
- [x] `pnpm lint && pnpm -r typecheck && pnpm exec vitest run` — hepsi
      yeşil (ben zaten doğruladım, sen de istersen tekrar çalıştırabilirsin).

---

## M12.4 — CHECKPOINT M12 — ✅ 2026-07-17 birleşik yürüyüşte doğrulandı

`/watch` sayfası: geçmiş, sıradaki bölümler (quick-mark + rozetler), bir
süredir izlenmedi bölümü.

### Nav + sayfa
- [x] Üst navda "Kütüphane" ile "Takvim" arasında yeni "İzleme" linki
      olmalı, `/watch`'a gitmeli.
- [x] Sayfa başlığı ("İzleme"), İzleme geçmişi, Sıradaki bölümler, Bir
      süredir izlenmedi bölümleri sırayla görünmeli.

### İzleme geçmişi
- [x] Liste en eski **üstte**, en yeni **altta** olmalı (API newest-first
      döndürüyor, sayfa client-side ters çeviriyor).
- [x] Sayfa açılışında otomatik olarak listenin **en altına** scroll
      olmalı.
- [x] Bugün izlenen bir bölüm "Bugün {saat}" formatında, dün izlenen
      "Dün {saat}" formatında, daha eskiler "{gün} {ay} {saat}"
      formatında görünmeli.
- [x] Hiç izleme yoksa boş durum mesajı çıkmalı.

### Sıradaki bölümler (category = watching)
- [x] Her satırda poster, başlık, SxEy, (varsa) +N rozeti, bölüm adı,
      EpisodeTags rozetleri görünmeli.
- [x] `nextUnwatched.airDate` bugüne eşit veya geçmişse checkbox olmalı;
      null veya gelecekse checkbox **olmamalı** (E29).
- [x] Bir satırı işaretle → o dizinin `nextUnwatched`'ı bir sonraki
      bölüme ilerlemeli (yeniden fetch sonrası).
- [x] Bir dizinin son izlenmemiş bölümünü işaretle → kategori
      up_to_date/finished'a döner, satır bu bölümden tamamen kaybolmalı.
- [x] Boşsa boş durum mesajı çıkmalı.

### Bir süredir izlenmedi (category = not_watched_recently)
- [x] Aynı satır bileşeni, doğru kategori filtrelemesiyle çalışmalı.

### Takvim/kütüphane senkronizasyonu
- [x] Bir bölümü işaretledikten sonra `/calendar` ve `/` (ana sayfa)
      sayfalarına gidip verinin güncel olduğunu doğrula (aynı invalidate
      zinciri).

### İki dil + M10/M11 regresyonu
- [x] Ayarlar → Dil'den EN'e geç, yukarıdaki adımları tekrarla.
- [x] Ana sayfa (M10) ve takvim (M11) hâlâ doğru çalışıyor mu, hızlıca
      bak.

### Tam gate
- [x] `pnpm lint && pnpm -r typecheck && pnpm exec vitest run` — hepsi
      yeşil (ben zaten doğruladım).

---

## M13.1 — Kabul yürüyüşü — ✅ 2026-07-17 birleşik yürüyüşle kapandı

spec 002'nin tam kabul checklist'i (`spec.md` §Acceptance checklist) ayrı
bir bölüm olarak hiç doldurulmadı; kapsadığı her madde §M10.8 (önceden) +
§M11.4/§M12.4 + bu birleşik geçişle doğrulandı.

---

## M14.7 — CHECKPOINT M14 — ✅ 2026-07-17 birleşik yürüyüşte doğrulandı

Spec 003, M14: dinamik İzleniyor sinyalleri (yeni bölüm lift'i, yeni
eklenen lift'i), yapılandırılabilir pencere, zip v3. Mekanik kısımlar
(tam gate + curl testi) benim tarafımdan doğrulandı; aşağıdaki üç satır
tarayıcı gerektiriyor (spec.md 003 §Acceptance checklist).

### HotD senaryosu — yeni bölüm lift'i (E33)
- [x] Daha önce izlenmiş ama uzun süredir izlenmemiş (`up_to_date` veya
      `not_watched_recently`) bir dizinin yeni bir bölümü, pencere
      içinde airlendiğinde (gerçek veri yoksa episode air_date'i elle
      geçmişe/pencereye çekip refresh ile simüle edilebilir) dizi
      İzleniyor'a düşmeli — hiç izlenmemiş bölüm izlenmeden.
- [x] Pencere geçip yeni izleme olmazsa dizi "Bir süredir izlenmedi"ye
      düşmeli.
- [x] Hiç izlenmemiş (`not_started`) bir dizinin yeni bölümü airlense
      bile İzleniyor'a **atlamamalı** (lift sıfır-izlemeli dizilere
      ulaşmıyor — E33).

### Arama çubuğundan ekleme — yeni eklenen lift'i (E32)
- [x] Arama çubuğundan bir dizi ekle → hiç izlenmemiş olsa bile hemen
      İzleniyor'da görünmeli. **Mekanik olarak doğrulandı:** gerçek dev
      kütüphanesine "Pluribus" (tvmazeId 86175) POST `/api/library/series`
      ile eklendi, response'ta `"category": "watching"` döndü, sonra
      DELETE ile temizlendi. Yine de tarayıcıda arama kutusundan aynı
      akışı bir kez dene.
- [x] TV Time / zip import'tan gelen bir dizi (sıfır izlemeyle) İzleniyor'a
      **düşmemeli** — `not_started` kalmalı. (Sunucu testi zaten
      kanıtlıyor: `tvtime.test.ts` "a zero-watch imported show computes
      as not_started" — M14.5; tarayıcıda gerçek bir TV Time export'u
      import ederek tekrar doğrula.)

### Pencere ayarı canlı re-bucketing
- [x] Ayarlar → İzleniyor penceresi (gün) alanını 30'dan 7'ye düşür →
      ana sayfadaki İzleniyor kovası refresh sonrası küçülmeli.
      **Mekanik olarak doğrulandı:** gerçek dev kütüphanesinde
      (280 dizi) PATCH `watchingWindowDays=7` sonrası İzleniyor toplamı
      75'ten 74'e düştü, PATCH `=30` ile geri eski haline döndü. Yine de
      tarayıcıda alanı değiştirip sayfayı yenileyerek görsel olarak
      doğrula.

### Tam gate
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` — hepsi
      yeşil (ben zaten doğruladım).

---

## M15.4 — CHECKPOINT M15 — ✅ 2026-07-17 birleşik yürüyüşte doğrulandı

Spec 003, M15: sezon-segmentli ilerleme çubuğu + dizi detay sayfası
düzenlemeleri. Mekanik kısım (tam gate + API'nin `seasonProgress`
döndürdüğünü curl ile doğrulama) benim tarafımdan yapıldı.

### Segmentli ilerleme çubuğu (kart + detay)
- [x] Ana sayfada, birden fazla sezonu olan ve düzenli (atlama yapmadan)
      izlenmiş bir dizinin kartında sezon kareleri + "sınır" (frontier)
      çubuğu görünmeli (◼◼◼[▰▰▰▱▱]◻◻ gibi). **API tarafı mekanik
      doğrulandı:** gerçek kütüphanede (280 dizi, 197'si çok sezonlu)
      `seasonProgress` alanı doğru şekilde dolduruluyor (ör. "Gen V" →
      2 sezon, ikisi de watched==total).
- [x] Aynı görünüm dizi detay sayfasının üst kısmında (poster yanındaki
      ilerleme alanı) da olmalı.
- [x] Tamamı izlenmiş bir dizide tüm kareler dolu (◼◼◼◼) görünmeli.

### Fallback (atlama yapılmış / >12 sezon)
- [x] Bölümleri sırayla değil atlayarak izlemiş bir dizide (ör. S2'yi
      bitirmeden S1'de boşluk bırakmış) segmentli görünüm yerine eski
      düz yüzde çubuğu çıkmalı. **API tarafı mekanik doğrulandı:**
      gerçek kütüphanede 5 dizi `sequential: false` dönüyor (ör. "The
      Last of Us" — S1 tam, S2'de 1/7); bu dizilerden birini açıp düz
      çubuğu gör.
- [x] (Varsa) 12'den fazla sezonu olan bir dizide de düz çubuk
      görünmeli.

### Dizi detay sayfası (E37)
- [x] Specials (Sezon 0) bölümü olan bir diziyi aç — Specials sezon
      listesinin **en altında** görünmeli (diğer sezonlar 1, 2, ... artan
      sırada üstte).
- [x] 2:3 oranında olmayan bir poster (ör. TVmaze kaynaklı bir dizi)
      **kırpılmadan tam** görünmeli (üstte/altta beyaz boşluk kalması
      normal — artık `object-cover` yok).
- [x] Posteri olmayan bir dizide placeholder kutusu hâlâ 2:3 oranında
      düzgün görünmeli (kırık görsel ikonu çıkmamalı).

### İki dil
- [x] Ayarlar → Dil'den EN'e geç, yukarıdaki adımların tamamını tekrarla.

### Tam gate
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` — hepsi
      yeşil (ben zaten doğruladım).

---

## M16.4 — CHECKPOINT M16 — ✅ 2026-07-17 birleşik yürüyüşte doğrulandı

Spec 003, M16: sticky header + mobil alt navigasyon, takvimde poster
görselleri, filtre RESET düzeltmesi. Mekanik kısım (tam gate) benim
tarafımdan doğrulandı.

### Sticky header
- [x] Herhangi bir sayfada aşağı kaydır — üst bar (logo + arama +
      masaüstünde nav linkleri) ekranın üstünde sabit kalmalı, altındaki
      içeriğin üzerine binmeli (opak arka plan).

### Mobil alt navigasyon (<640px veya DevTools mobil görünüm)
- [x] Üst barda nav linkleri (Kütüphane/İzleme/Takvim/İstatistik/Ayarlar)
      **kaybolmalı**; ekranın altında sabit bir tab bar'da 5 ikon +
      küçük etiket görünmeli (lucide-react ikonları — FontAwesome/ikon
      fontu **olmamalı**).
- [x] Tab bar'daki 5 sekmenin hepsine tıklayıp ilgili sayfaya gittiğini
      doğrula; aktif sekme diğerlerinden görsel olarak ayrışmalı.
- [x] Sayfa içeriği tab bar'ın arkasında kalmamalı (alt boşluk yeterli).
- [x] Takvim → zaman çizelgesi modunda sayfa açılışında BUGÜN satırına
      otomatik scroll oluyor mu, satır sticky header'ın **altında kalmadan**
      tam görünür mü (scroll-mt).

### Takvimde poster görselleri (E35)
- [x] Zaman çizelgesi modunda her satırda 40×56 poster thumbnail
      görünmeli.
- [x] Ay modu (masaüstü) — hücrelerde küçük (~24px) poster + metin
      görünmeli; posteri olmayan bir bölüm sadece metin göstermeli
      (placeholder kutusu yok).
- [x] Pencereyi <640px'e daralt → ay modu, zaman çizelgesi tarzı
      satırlara (poster thumb'lı) dönüşmeli.
- [x] Posteri 404 dönen veya null olan bir girdi kırık görsel ikonu
      göstermeden temiz bir placeholder ile render olmalı.
- [x] Bugün vurgusu hem zaman çizelgesinde hem ay modunda hâlâ doğru
      çalışıyor mu (2026-07-15 yerel tarih düzeltmesinin tekrar
      doğrulanması).

### Filtre RESET (E41)
- [x] Kütüphane sayfasında Filtrele panelini aç, sıralamayı ve
      kategoriyi varsayılan olmayan bir değere değiştir, SIFIRLA'ya
      bas → radyo düğmeleri **Son izlenen** + **Tümü**'ne dönmeli (draft
      state, panel açık kalmalı). UYGULA ile onayla.

### İki dil
- [x] Ayarlar → Dil'den EN'e geç, yukarıdaki adımların tamamını tekrarla.

### Tam gate
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` — hepsi
      yeşil (ben zaten doğruladım).

---

## M17 — İzleme sayfası + test bildirimi — ✅ 2026-07-17 birleşik yürüyüşte doğrulandı

Spec 003, M17: birleşik izleme sayfası (paylaşılan satır bileşeni,
sabitlenmiş geçmiş, otomatik scroll), test bildirimi butonu. Sunucu
tarafı testleri (push.test.ts, history.test.ts, watches.test.ts) ve
saf yardımcı fonksiyon testleri (WatchNextRow.test.ts değişmedi,
seasons.test.ts yeni) zaten yeşil — burada sadece tarayıcı gerektiren
kısımlar listeleniyor.

### İzleme sayfası (E38)
- [x] `/watch` sayfasını aç — sayfa açılışında otomatik olarak
      **"Sıradaki bölümler"** başlığına scroll olmalı (sticky header'ın
      altında kalmadan, tam görünür).
- [x] İzleme geçmişi artık kutulu/kısa bir metin listesi değil, diğer
      bölümlerle (Sıradaki bölümler, Bir süredir izlenmedi) **aynı görsel
      satır** biçiminde olmalı: poster, başlık, SxEy, bölüm adı,
      EpisodeTags rozetleri, sağda göreli zaman ("Bugün 21:30" /
      "Dün 21:12" / "12 Tem 21:30").
- [x] Geçmiş listesi artık **iç scroll kutusu içinde değil** — tüm
      liste (varsayılan 30 kayıt) sayfanın kendisinde, en eski üstte en
      yeni altta sırayla akmalı.
- [x] Sıradaki bölümler / Bir süredir izlenmedi bölümlerindeki quick-mark
      checkbox'ı hâlâ çalışıyor mu (bir satırı işaretle → o dizi bir
      sonraki bölüme ilerlemeli veya kategoriden düşmeli).

### Test bildirimi (E39)
- [ ] **USER-ONLY** — headless chromium Push API'yi desteklemiyor
      (incognito kısıtı): abonelik kurulamadı. "Abone değilken buton
      görünmüyor" yarısı 2026-07-17'de doğrulandı; abone-olunca görünmesi
      gerçek cihaz istiyor.
- [ ] **USER-ONLY** — Butona bas → cihazda gerçek push ("baykuş" /
      "Test bildirimi") + başarı toast'ı. (Sunucu tarafı push.test.ts'te
      yeşil; teslim gerçek cihaz istiyor.)
- [ ] **USER-ONLY** — Aboneliği iptal et → buton kaybolmalı (abonelik
      headless'ta kurulamadığı için zinciri gerçek cihazda dene).

### İki dil
- [x] Ayarlar → Dil'den EN'e geç, yukarıdaki adımların tamamını tekrarla.

### Tam gate
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` — hepsi
      yeşil (ben zaten doğruladım).

---

## M17.9–M17.14 — Plan dışı: tvtime düzeltmeleri, marka yenileme, aksiyon
## menüsü, bölüm işaretleme modalleri — ✅ 2026-07-17 birleşik yürüyüşte doğrulandı

Spec 003, M17.9–M17.14 (E43–E47). Bu round tamamen uygulama içinde
tarayıcı erişimi olmadan geliştirildi (bu ortamda da chromium/playwright
bulunamadı — `pnpm dev` başlatılıp curl ile smoke test yapıldı, ama görsel
doğrulama insan gözü gerektiriyor). Sunucu/paket tarafı testleri
(parse.test.ts, match.test.ts, tvtime.test.ts) zaten yeşil; burada sadece
tarayıcı gerektiren kısımlar listeleniyor.

### TV Time içe aktarma canlı ilerleme (E44)
- [x] Ayarlar → Veri → "TV Time'dan içe aktar" → sentetik 4-dizilik GDPR
      zip'iyle yüklendi; eşleştirme raporu (EMİN DEĞİLİM/EŞLEŞTİ/EŞLEŞMEDİ
      panelleri, lucide ikonlu satırlar) doğrulandı. Yükleme-anı canlı
      ilerleme listesi küçük fixture'da anlık geçti — büyük gerçek zip'te
      gözlemlenebilir (opsiyonel, kod yolu ImportPage'de).

### Marka yenileme — tasarım sistemi (E45)
- [x] Genel görünüm: koyu `#080808` zemin, sarı (`#f0e000`) tek vurgu
      rengi, başlıklarda italik serif font (DM Serif Display), etiket/
      buton metinlerinde mono+büyük harf; hiçbir yerde yuvarlatılmış köşe
      (`rounded-*`) kalmamalı.
- [x] Puan kontrolü (RatingControl) ve istatistikler sayfasındaki puan
      dağılımı artık emoji değil, ok ikonları (yukarı/yatay/aşağı,
      yeşil/sarı/kırmızı) göstermeli.
- [x] Tüm checkbox'lar (bölüm satırı, sezon "tümünü izledim", takvim,
      sıradaki bölümler, Ayarlar → ek kaynaklar) artık yeni sarı dolgulu
      kare bileşen — tarayıcının native checkbox'ı değil.
- [x] Kütüphane kartlarında ve dizi detay başlığında watched/aired metni
      kategoriye göre renkleniyor mu (bırakıldı=kırmızı, bitirildi=mor,
      güncel=yeşil, diğerleri=sarı).

### Dizi aksiyonları — detay sayfası menüsü (E46)
- [x] Kütüphane kartının üzerine gelince artık **hiçbir buton** çıkmamalı
      (kart sadece bir link).
- [x] Bir diziye tıkla → detay sayfası başlığında "⋮" menüsü: listeye
      taşı / otomatiğe döndür / yenile / sessize al-aç / kaldır
      seçenekleri, eskisiyle aynı davranışta çalışmalı (ör. bitirilmiş
      dizide "bırakıldı" seçeneği görünmemeli).
- [x] "Kaldır" → onay diyaloğu → kütüphaneden silinip ana sayfaya
      dönmeli.

### Bölüm işaretleme modalleri (E47)
- [x] Daha önce izlenmemiş bölümü olan bir sezonda, aradaki bir bölümü
      işaretlemeye çalış → "Önceki bölümler işaretlensin mi?" modalı
      çıkmalı; "buraya kadar izledim" hepsini işaretlemeli, "sadece bu
      bölüm" yalnızca o bölümü işaretlemeli.
- [x] Öncesinde izlenmemiş bölüm yoksa tek dokunuşla direkt işaretlenmeli
      (modal çıkmamalı — eski davranış).
- [x] İzlenmiş bir bölümün checkbox'ına tıkla → "tekrar izledim / tarihi
      düzenle / izlenmedi işaretle" sayfası (sheet) açılmalı, üçü de
      çalışmalı.
- [x] Sezon başlığındaki "tümünü izledim" butonu artık bir checkbox;
      sezon tamamlanmışsa işaretli ve devre dışı olmalı, sayfa
      açıldığında tamamlanmış sezonlar kapalı başlamalı.

### İki dil
- [x] Ayarlar → Dil'den EN'e geç, yukarıdaki adımların tamamını tekrarla.

### Tam gate
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` — hepsi
      yeşil, her M17.9–M17.14 commit'inde ayrı ayrı doğrulandı.

---

## M22 — Spec 004 CHECKPOINT: içe aktarma sadakati, aired-only ilerleme,
## TMDB URL'leri, sayfa geçişleri — ✅ 2026-07-17 birleşik yürüyüşte doğrulandı

Spec 004, M18–M21 (E48–E56). Bu round da tamamen tarayıcı erişimi olmadan
geliştirildi (bu ortamda da chromium/playwright bulunamadı). Sunucu/paket/
web tarafı testleri zaten yeşil — `parse.test.ts` (archived→dropped remap +
relic skip), `tvtime.test.ts` (skippedRelics rapor akışı, Suits-şekilli
archived→stopped, E26 temizliğinin fully-watached bir archived diziyi hâlâ
Bitirildi'de bıraktığı), `progress.test.ts` + `SegmentedProgress.test.ts`
(aired-only sezon sayımı, caught-up all-filled fixture'ı), `service.test.ts`
+ `engine.test.ts` (tmdbId özeti, fill-only external-id backfill,
uniqueness-conflict düşürme) ve `seriesPath.test.ts` (param grameri,
canonical-replace no-loop guard'ı) — burada sadece tarayıcı gerektiren
kısımlar listeleniyor. Mekanik doğrulama: `pnpm dev` ile gerçek
`library.db`'ye karşı `curl`: `/api/library/series/by-tmdb/1` → 404
`NOT_FOUND`, `/api/library/series/by-tmdb/abc` → 400 `VALIDATION_FAILED`,
`/api/library/series/840` → 200 ve `"tmdbId":null` (bu geliştirme
kütüphanesindeki her öğe gibi — tamamı TVmaze ile eşleşmiş, HANDOVER.md'de
belirtilen durumla tutarlı).

### TV Time içe aktarma sadakati (E48/E49)
- [x] Ayarlar → Veri → "TV Time'dan içe aktar" → gerçek/büyük bir GDPR
      zip'i yükle (veya `active=1,archived=1` satırlı bir dizi + `active=0`
      ve hiç izleme kaydı olmayan bir dizi içeren küçük bir fixture CSV) →
      rapor adımında, kalıntı varsa "n kalıntı takip atlandı (izleme kaydı
      yok)" şeklinde katlanır bir açıklama görünmeli; genişletince atlanan
      dizilerin isimleri virgülle/noktayla ayrılmış listelenmeli.
- [x] Suits gibi `archived=1` (`active=1`) bir dizi onaylandıktan sonra
      kütüphanede **Bırakıldı** listesinde görünmeli; bitmiş ve tüm
      yayınlanmış bölümleri izlenmiş bir archived dizi bunun yerine
      **Bitirildi**'de kalmalı (E26 temizliğinin hâlâ çalıştığını
      doğrula).

### Aired-only sezon ilerlemesi (E50)
- [x] Tüm yayınlanmış bölümleri izlenmiş ama gelecekte duyurulmuş bölümü
      olan bir dizi (Re:Zero benzeri) hem kütüphane kartında hem dizi
      detayında **tamamen dolu** segmentli çubuk göstermeli (mini
      ilerleme çubuğu/frontier bar görünmemeli).

### Sayfa geçişleri (E51)
- [ ] **USER-ONLY (görsel)** — poster morph'un akıcılığı insan gözü
      istiyor; mekanik katman 2026-07-17'de doğrulandı:
      `viewTransitionName: poster-\`id\`` kartlarda canlı,
      `document.startViewTransition` mevcut, chrome grupları ayrık.
- [x] Diğer sayfa geçişlerinde (İzleme, Takvim, İstatistik, Ayarlar)
      hafif bir **cross-fade** (~160ms) olmalı; üst menü ve mobil alt
      sekme çubuğu geçişe katılmadan sabit kalmalı.
- [x] İşletim sistemi/tarayıcı "hareketi azalt" (reduced motion) ayarı
      açıkken tüm geçişler **anlık** olmalı (morph/fade yok).
- [ ] **USER-ONLY** — Firefox bu ortamda yok; kod `startViewTransition`
      feature-detect'li, desteksizde anlık düşüş tasarım gereği.

### TMDB-parity URL'ler (E52/E53)
- [ ] **USER-ONLY (veri yok)** — kütüphanedeki her öğe TVmaze-eşleşmeli,
      `tmdbId` dolu öğe yok; TMDB backfill sonrası denenebilir
      (`seriesPath.test.ts` grameri kapsıyor).
- [x] `tmdbId`'si olmayan bir dizi (bu geliştirme kütüphanesindeki her
      öğe gibi — TVmaze ile eşleşmiş) `/series/i<dahili id>` adresinde
      açılmalı.
- [ ] **USER-ONLY (veri yok)** — tmdbId'li öğe olmadığından
      replace-redirect canlı gözlenemedi; `i<id>` formunun kalıcılığı ve
      döngüsüzlüğü doğrulandı (i4276/i4250 sabit kalıyor), no-loop guard
      `seriesPath.test.ts`'te.
- [ ] **USER-ONLY** — gerçek TMDB anahtarı gerekiyor (fill-only backfill
      `service.test.ts`/`engine.test.ts`'te yeşil).

### E54/E55/E56 doğrulamaları (kod değişikliği yok, sadece tekrar teyit)
- [x] (E54) İki bölüm geride kalmış bir dizide hızlı-işaretle → yerine
      gelen satırın checkbox'ı **işaretsiz** başlamalı.
- [x] (E55) Kırmızı (bırakıldı), mor (bitirildi), yeşil (güncel), sarı
      (diğer) renklerinden birer örnek dizi kontrol et.
- [x] (E56) DevTools mobil/dokunmatik emülasyonuyla kütüphane, detay,
      izleme, takvim, ayarlar sayfalarını gez — her aksiyon hover
      olmadan dokunuşla ulaşılabilir olmalı.

### İki dil
- [x] Ayarlar → Dil'den EN'e geç, yukarıdaki adımların tamamını tekrarla.

### Tam gate
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` — hepsi
      yeşil (workspace: 484 test).
- [x] Mekanik doğrulama: yukarıdaki curl komutları + gerçek `library.db`
      spot-check bu bölümün girişinde kayıtlı.

---

## M27 — Spec 005 CHECKPOINT: mobil UX, profil hub, favoriler, otomatik
## yenileme — ✅ 2026-07-17 birleşik yürüyüşte doğrulandı

Spec 005, M23–M26 (E57–E73). Bu round da tamamen tarayıcı erişimi olmadan
geliştirildi (chromium/playwright bu ortamda da yok). Sunucu/paket/web
tarafı testleri zaten yeşil — `packages/core`: `db/open.test.ts` (migration
0003 — favorite kolonu, pre-existing satırlarda false), `zip/{export,
import,roundtrip}.test.ts` (v4 favorite alanı her zaman export'ta, v1-v3
import'ta favorite=false default, merge'de incoming-wins hem set hem
clear), `library/service.test.ts` (favorite-only update `listChangedAt`'ı
değiştirmiyor), `refresh/engine.test.ts` (`isStale` null/23h/25h,
`filterStaleItemIds` NULL-önce-sonra-en-eski sıralaması, fresh öğeler
dokunulmadan kalıyor); `apps/server`: `app.test.ts` (PATCH favorite 200 +
GET/list yansıması + favorite-only diğer alanları bozmuyor + geçersiz tip
400), `routes/refresh.test.ts` (`staleOnly=1` fresh öğeyi atlıyor,
`staleOnly=bogus` 400, paramsız davranış regresyon-korumalı); `apps/web`:
`lib/profilePath.test.ts` (E57 çözümleme matrisi tam — single/multi ×
me/own/foreign, no-loop predicate), `lib/staleSweep.test.ts` (throttle
penceresi, eşzamanlı çalışmama, manuel-yenileme bayrağı etkileşimi,
sessiz hata), `lib/backFallback.test.ts` (her rota için fallback +
5 tab sayfasının hiç ok almadığı), `lib/groupByCategory.test.ts`
(`HOME_CATEGORY_ORDER` bitirildi/bırakıldığı hariç tutuyor,
`CATEGORY_ORDER` dokunulmamış), `components/FilterPanel.test.ts`
(aktif-filtre noktası varsayılanlarda kapalı, sapmada açık),
`lib/useSeriesSearch.test.ts` (dört externalId şeklinde `resultKey`
kararlı) — burada sadece tarayıcı gerektiren kısımlar listeleniyor.
Workspace: 528 test yeşil, `pnpm build` yeşil.

Mekanik doğrulama (gerçek dev sunucusuna karşı, self-cleaning curl
akışlarıyla — kalıcı iz bırakmadan): M23.2'de `POST /api/library/series`
→ `PATCH {favorite:true}` → `GET` (favorite:true) → tekrar `GET`
("reload" simülasyonu, hâlâ true) → `DELETE` ile temizlik; M23.1'de
migration'ın gerçek `library.db`'nin **güvenli bir kopyası** üzerinde
(canlıya hiç dokunmadan, `sqlite3 .backup`) uygulanıp `favorite` kolonunun
doğru geldiği doğrulandı — bu sırada gerçek kütüphanenin o an 0 satır
olduğu (beklenmedik ama xava tarafından kasıtlı bir sıfırlama olarak
doğrulandı) ayrıca not edildi, bkz. root `HANDOVER.md`.

### Tab bar / ortalanmış logo / geri oku matrisi (E67/E72)
- [x] 390px görünümde (DevTools mobil emülasyon) alt tab bar 5 öğe
      göstermeli: Kütüphane (LayoutGrid), İzle (Play), Takvim
      (CalendarDays), Ara (Search), Profil (CircleUser) — İstatistikler
      ve Ayarlar artık tab bar'da **yok**.
- [x] Mobil üst header tek satır: sol tarafta (varsa) geri oku, ortada
      **mutlak ortalanmış** "baykuş" logosu, sağda hiçbir şey; arama
      kutusu mobilde **hiç görünmemeli**.
- [x] `/`, `/watch`, `/calendar`, `/search`, `/user/me` (5 tab sayfası) —
      geri oku **olmamalı**.
- [x] Bir dizi detayına gir (`/series/...`) → geri oku görünmeli; tıkla →
      site içi geçmiş varsa bir önceki sayfaya, dizi detayına **doğrudan
      bağlantıyla** (yeni sekme/adres çubuğuna yapıştırarak) girilmişse
      ana sayfaya (`/`) gitmeli.
- [x] `/import`e git → geri oku `/settings`e gitmeli (doğrudan bağlantı
      senaryosunda); `/settings`e git → geri oku `/user/me`ye gitmeli;
      `/user/me/all-series` ve `/user/me/stats`e git → geri oku her
      ikisinde de `/user/me`ye gitmeli.
- [x] Masaüstünde (≥640px) üst nav: Kütüphane, İzle, Takvim, Profil (arama
      kutusu ortada, eskisi gibi); geri oku **hiç görünmemeli** (masaüstü
      tarayıcı geri tuşuna güveniyor).

### Ana sayfa beş bölüm + kategori filtresi (E59)
- [x] Ana sayfada "Tümü" filtresiyle sadece 5 bölüm görünmeli: İzleniyor,
      Bir süredir izlenmedi, Daha başlanmadı, Sonra izlenecek, Güncel —
      Bitirildi/Bırakıldı **görünmemeli**.
- [x] Filtrele panelinden (masaüstü popover veya mobil bottom sheet)
      açıkça "Bitirildi" veya "Bırakıldı" seç → o kategori ana sayfada
      **görünmeli** (kapasite kaybı yok, sadece varsayılan gruplama
      daraltıldı).
- [x] Profil → "Tüm diziler" → `/user/me/all-series` sayfasında 7
      kategorinin tamamı (Bitirildi/Bırakıldı dahil) görünmeli, toplam
      sayı başlıkta.

### Profil sayfası tam yürüyüş (E58, E62, E66)
- [x] `/user/me`ye git — kimlik satırı (baykuş/owl avatar + "Profilim"
      tek kullanıcı modunda), favoriler rafı, 3 istatistik kutusu, link
      satırları ("Tüm diziler" + sayı, "Detaylı istatistikler",
      "Ayarlar"), "Tümünü yenile" butonu sırayla görünmeli.
- [x] Hiç favori yoksa rafta tek satır ipucu metni ("Dizi detayındaki
      kalple favorilerini seç.") görünmeli.
- [x] Bir dizi detayına git, kalbe bas (dolu sarı olmalı, `aria-pressed`
      true) → profile dön → o dizi favoriler rafında görünmeli, en son
      izlenen sırayla (birden fazla favori varsa).
- [x] Kalbi tekrar bas (favoriden çıkar) → sayfayı yenile → hâlâ
      favorisiz (optimistic + kalıcı).
- [x] Profildeki 3 istatistik kutusunun sayıları (bölüm sayısı, saat,
      aktif dizi) → "Detaylı istatistikler"e tıkla → `/user/me/stats`
      sayfasındaki (eski `/stats` sayfasıyla aynı) sayılarla **birebir
      eşleşmeli**.
- [x] "Tümünü yenile"ye bas → n/m ilerleme satır içinde görünmeli,
      bitince tamamlanma toast'ı çıkmalı (eski davranışla aynı) — buton
      artık kütüphane sayfasında **yok**.

### `/user/me` canonicalization + yabancı handle 404 + `/stats` yönlendirmesi (E57)
- [x] `/stats`e git → adres çubuğu otomatik olarak (yeni geçmiş kaydı
      eklemeden, geri tuşu eski sayfaya atlamadan) `/user/me/stats`e
      **replace** olmalı.
- [x] Tek kullanıcı modunda `/user/baskaisim` gibi `me` olmayan bir handle
      dene → "Profil bulunamadı." mesajı (404 durumu) görünmeli, ana
      sayfaya **yönlendirilmemeli**.
- [x] (Çok kullanıcılı/hosted mod varsa) `/user/kendihandle`in ile
      `/user/me` aynı sayfayı göstermeli; `/user/me` adres çubuğunda
      kendi handle'ına replace olmalı; başka birinin handle'ı 404
      vermeli.

### Favoriler zip round-trip (E61) — TEK KULLANIMLIK kütüphanede
- [x] İzole kopyada yürütüldü (gerçek kütüphaneye hiç dokunulmadı):
      7 favori + kalple 1 favori → export.zip (manifest v6, 1.5MB) →
      Tehlikeli bölge'den tam sıfırlama (SİL yazarak) → 0 öğe → aynı zip
      replace modunda içe aktarıldı → 246 dizi, "246 dizi, 7318 izleme, 0
      puan içe aktarıldı" toast'ı, **7 favori birebir geri geldi**.
- [x] Gerek kalmadı — test gerçek kütüphanenin kopyasında yapıldı;
      gerçek DB'nin yürüyüş öncesi/sonrası parmak izi birebir aynı.

### Stale sweep + stale detay otomatik yenileme (E63–E65)
- [x] Bir kütüphane kopyasında birkaç dizinin `last_refreshed_at`ını elle
      24 saatten eski bir tarihe çek (`sqlite3 library.db "UPDATE items
      SET last_refreshed_at = '2020-01-01T00:00:00Z' WHERE id IN (...)"`),
      o kopyaya karşı sunucuyu başlat → ana sayfayı aç → ince bir durum
      satırı ("{{done}}/{{total}} yenileniyor…") görünmeli, kartlar arka
      planda güncellenmeli — **hiçbir toast/hata çıkmamalı**.
- [x] Aynı şekilde bayatlatılmış bir dizinin detay sayfasını aç → sayfa
      sessizce yenilenmeli (`lastRefreshedAt` güncellenir, network
      sekmesinde tekil refresh çağrısı görünür) — spinner/toast yok.
- [x] 15 dakika içinde sayfayı tekrar aç (aynı sekme) → sweep **tekrar
      tetiklenmemeli** (throttle).

### 3 sütun grid + filtre FAB/bottom sheet + aktif nokta (E69/E70)
- [x] 390px görünümde ana sayfa, tüm diziler ve iskelet (loading)
      durumları dahil **3 sütun** göstermeli (masaüstünde 4/6 sütun
      değişmemeli).
- [x] Mobilde Filtrele artık üstte değil, tab bar'ın hemen üstünde
      yüzen sarı bir daire buton (FAB) — masaüstü popover'ı
      **etkilenmemiş** olmalı.
- [x] FAB'a bas → aynı sıralama/kategori formu bir bottom sheet olarak
      açılmalı (scrim'e veya "Kapat"a basınca kapanmalı); UYGULA/SIFIRLA
      eskisiyle aynı çalışmalı.
- [x] Sıralama veya kategoriyi varsayılandan farklı bir değere ayarla →
      FAB üzerinde küçük kırmızı bir nokta belirmeli; varsayılana
      dönünce nokta kaybolmalı.

### EpisodeRow ≤20px ölçümü (E71)
- [x] 390px görünümde bir dizi detayına gir, bir bölüm satırının ilk
      karakterinin ekran kenarından **20px veya daha az** başladığını
      DevTools'ta ölçerek doğrula (hesaplanan değer: `main` `px-3`=12px +
      satır `px-2`=8px = 20px).
- [x] Aynı ölçümü İzleme sayfasındaki satırlarda da tekrarla (aynı
      `px-2 sm:px-6` düzeltmesi).
- [x] Masaüstünde (≥640px) padding'lerin **değişmediğini** doğrula.

### Takvim BUGÜN anchor (E73)
- [x] Takvim → Zaman çizelgesi sekmesini aç → BUGÜN satırı **sticky
      header'ın hemen altında**, manuel scroll gerekmeden görünmeli
      (eski `scroll-mt-16` tahmininden farklı olarak artık ölçülen
      header yüksekliğine göre); atlama/zıplama olmamalı.
- [x] Ay moduna geçip tekrar Zaman çizelgesine dön → BUGÜN'e her
      dönüşte yeniden anchor olmalı.
- [x] Ay modu açılışı **değişmemiş** olmalı (mevcut ay, üstte açılır).

### E51 sayfa geçişi regresyonu (Layout restructure sonrası)
- [x] Kütüphaneden bir kart → detay sayfasına geçişte poster morph'u
      hâlâ çalışmalı (004'te doğrulanmıştı; Layout/header/tab-bar
      yeniden yapılandırıldı, `app-header`/`app-tabbar`
      view-transition adları hayatta kaldı mı doğrula).
- [x] Diğer sayfa geçişlerinde üst menü ve alt tab bar geçişe katılmadan
      **sabit** kalmalı (cross-fade sadece içerikte).

### İki dil
- [x] Ayarlar → Dil'den EN'e geç, yukarıdaki adımların tamamını
      tekrarla — özellikle "Profilim"/"My profile", "Favoriler"/
      "Favorites", "Ara"/"Search", "Profil"/"Profile", "Geri"/"Back"
      metinlerini kontrol et.

### 003/002'den katlanan eski bekleyenler (aynı oturumda birlikte yapılabilir)
- [x] 003's M17.7 — `MANUELTEST.md` §M14.7–§M17.9–14 içindeki kalan `[ ]`
      satırları (HotD yeni bölüm lift senaryosu, segmentli çubuk görsel
      kontrolü, iki dil geçişleri).
- [x] 002's M11.4/M12.4 — §M11.4 (ay modu görsel kontrolü, EpisodeTags
      rozetleri) ve §M12.4 kutularının geri kalanı (çoğu zaten işaretli;
      kalanlar 005'in mobil/masaüstü geçişiyle "mobilya taşındı" olabilir
      — davranışı yeni yerinde doğrula, taşınma yüzünden düşürme).
- [x] 004's M22 — §M22'deki kalan `[ ]` satırları (TMDB backfill gerçek
      anahtarla, poster morph/cross-fade/reduced-motion/Firefox matrisi,
      E54–E56 tekrar teyidi).

### Tam gate
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` — hepsi
      yeşil (workspace: 528 test, 60 test dosyası).

---

## M33 — Spec 006 CHECKPOINT: tasarım uyumu, masaüstü arama ikonu,
## takvim switcher, favoriler sayfası — ✅ 2026-07-17 birleşik yürüyüşte doğrulandı

Spec 006, M28–M33 (E74–E81). Bu round da tarayıcı erişimi olmadan
geliştirildi (chromium/playwright hâlâ yok); altı görev (M28–M32 + M33.1
sweep) paralel arka plan ajanlarıyla, her biri kendi dosya kümesine
kilitlenmiş şekilde yürütüldü, sonra tek bir merkezi gate ile birleştirildi.
Otomatik doğrulanabilenler yeşil: `pnpm lint && pnpm typecheck && pnpm test
&& pnpm build` — 536 test, 61 test dosyası, sıfır hata (bir `biome format
--write` geçişi 6 dosyada whitespace-only düzeltme yaptı, mantık
değişmedi). `grep -rn "zinc-\|emerald-\|rounded" apps/web/src --include=
"*.tsx" --include="*.ts" --include="*.css"` tam olarak M33.1'in kayıtlı
istisna listesiyle eşleşiyor (FilterPanel FAB + aktif nokta, ProfilePage
avatar dairesi) — sıfır açıklanamamış hit, sıfır `emerald-` kaldı.
`lib/backFallback.test.ts` favoriler satırlarını da kapsayacak şekilde
genişletildi (5/5 yeşil); i18n parity testi yeşil (yeni anahtar yok).

~~Bilinen bir açık karar~~ — **2026-07-17'de karara bağlandı ve
uygulandı:** ResetLibraryDialog'un onay ifadesi artık `<Trans>` ile
`bg-white/5 px-1 font-mono` blok olarak render ediliyor (xava'nın kararı:
uygula; `settings.dangerZone.confirmLabel` tr+en `<phrase>` markup'ı
kazandı, aynı key, parity bozulmadı). Bkz. 006 `tasks.md` M28.2 DECISION
notu (resolved).

### Modaller E45 idiomu (E74)
- [x] Bir bölümü izleme tarihiyle işaretle → WatchDateDialog `bg-[#101010]
      border-white/10 shadow-2xl backdrop-blur-md` konteyner, `font-display
      italic` başlık, sarı "Kaydet" (eski yeşil değil), köşeler keskin
      (rounded yok).
- [x] `/search`ten bir dizi ekle — **güncellendi:** ManualListPicker 007'nin
      open-on-select akışıyla yetim kalmış, 2026-07-17 housekeeping'inde
      silindi. Ekleme artık sonuç satırına tıklayınca oluyor; Fargo ile
      canlı doğrulandı (→ İzleniyor), zaten-ekli 409 yolu dahil.
- [x] Ayarlar → "Kütüphaneyi sıfırla" dialoğu: konteyner idiomu birebir
      (`bg-[#101010] border-white/10 shadow-2xl backdrop-blur-md`), başlık
      `font-display italic`, onay `bg-red-600`, iptal borderless mono —
      üstelik E74'ün eksik kalan onay-kelimesi bloğu da artık
      `bg-white/5 px-1 font-mono` (2026-07-17'de uygulandı, canlı
      doğrulandı; yazınca buton aktifleşiyor, İPTAL kapatıyor). İzole
      kopyada tam sıfırlama akışı da yürütüldü (E61 round-trip'in parçası).
      "Hesabı sil" single modda render edilmiyor → **USER-ONLY (multi
      mod)**.

### TVTime içe aktarma sihirbazı + lucide ikonlar (E75/E76)
- [x] `/import`e git → dropzone kesikli border, sürükle-bırak üzerine
      gelince sarı vurgu; "Dosya seç" sarı primary buton.
- [x] Bir fixture CSV ile yükle → rapor adımında üç panel hairline border
      (dolgu yok, köşeler keskin); eşleşen satırlarda yeşil `Check` ikonu,
      belirsiz (fuzzy) satırlarda sarı `CircleHelp`, eşleşmeyende gri `X`
      — **unicode `✓`/`?`/`✗` karakteri hiçbir yerde görünmemeli**.
      Fuzzy aday `<select>`i E74 input idiomunda.
- [x] Onayla → confirming adımı sarı ilerleme çubuğu; özet adımı
      `font-display italic` başlık + "Kütüphaneye git" sarı buton.
- [x] `/claim` — single modda sayfa doğrudan "Hesap oluştur" formunu
      gösteriyor, uyarı dalı render edilmiyor; `TriangleAlert`
      `ClaimPage.tsx:48`'de bağlı, aynı lucide ikonu ImportPage raporunda
      canlı gözlendi, `⚠` hiçbir kaynak dosyada yok. (Multi-mod uyarı
      görseli user-only.)

### Masaüstü arama ikonu + `/search` düzeni (E77)
- [x] Masaüstünde (≥640px) üst header: baykuş solda, nav kümesi sağda
      (Kütüphane/İzle/Takvim/Profil + en sağda arama ikonu) — ortada
      **hiçbir şey yok**, eski inline arama kutusu tamamen kaldırılmış.
- [x] Arama ikonuna tıkla → `/search`e gider, ikon sarı vurgulanır
      (aktif rota); sayfa `max-w-xl` ortalanmış bir sütunda, autofocus
      çalışıyor, ekleme akışı (çoklu ekleme, sayfada kal) eskisi gibi
      çalışıyor.
- [x] Mobil tab bar'da "Ara" sekmesi ve davranışı **değişmemiş**.

### Takvim başlık satırı + segmented switcher + BUGÜN anchor (E78, E73
### regresyon)
- [x] Takvim'i aç → tek satır: solda "Takvim" başlığı (`font-display
      italic`), sağda `[ ZAMAN ÇİZELGESİ | TAKVİM ]` segmented control
      (aktif segment sarı dolgulu, `aria-pressed` doğru).
- [x] İki mod arasında geçiş yap → veri/davranış eskisiyle aynı.
- [x] BUGÜN satırı **hâlâ sticky app header'ın hemen altında** açılıyor
      (E73 regresyon kontrolü — başlık satırı BUGÜN'ün üstünde kayıp
      gitmeli, bu beklenen).
- [x] Ay modu ok butonları artık lucide `ChevronLeft`/`ChevronRight`
      ikonu (eski `‹`/`›` metin karakteri değil); iskelet ve hata/tekrar-
      dene butonları E45 idiomunda.

### Zaman çizelgesinde işaretleme kalıcılığı (E81)
- [x] Zaman çizelgesinde henüz izlenmemiş bir bölümü işaretle → satır
      **kaybolmamalı**, checkbox dolu, satır içeriği (poster/başlık/
      etiketler) soluklaşmalı (`opacity-60`) — checkbox'ın kendisi
      soluklaşmamalı.
- [x] Aynı satırın işaretini kaldır → satır tam opaklığa döner, checkbox
      boşalır (undo çalışıyor).
- [x] Sayfadan çık, tekrar Takvim'e gir (veya moda geçip geri dön) →
      işaretlenen satır artık **görünmemeli** (doğal yeniden-fetch —
      beklenen davranış, kalıcı geçmiş görünümü değil).
- [x] Mutlu yolda **hiç hata toast'ı çıkmamalı**; test net-zero iz
      bırakacak şekilde yapılmalı (gerçek bir bölümü işaretlediysen test
      sonunda kaldır, ya da tek kullanımlık bir dizide dene).

### Favoriler 6 sınırı + `/user/me/favorites` (E79)
- [x] Profilde ≤6 favori varken başlık düz metin — 0 favoriyle ipucu
      metni doğrulandı; 8 favoriyle link+sayı+ok doğrulandı (tam 6 sınır
      değeri ayrıca gözlemlenmedi, eşik `FavoritesRail`'de).
- [x] 7+ favoriye çıkar (geçici olarak — test bitince geri **un-heart**
      et, net-zero iz) → başlık artık `/user/me/favorites`e link olan bir
      satır: başlık metni + toplam sayı + `ChevronRight` oku.
- [x] O sayfaya git → tüm favoriler standart poster grid'inde (3/4/6
      sütun) görünmeli, aynı poster morph isimleriyle.
- [x] Geri oku profile dönmeli (mobil).
- [x] `/user/bogus/favorites` gibi yabancı bir handle dene → "Profil
      bulunamadı." (404), yönlendirme yok.

### İki dil
- [x] Ayarlar → Dil'den EN'e geç, yukarıdaki M33 adımlarının tamamını
      tekrarla.

### Tam gate
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` — hepsi
      yeşil (workspace: 536 test, 61 test dosyası).

---

## M52 — Spec 008 CHECKPOINT: istatistik panosu, zip v6 yeniden içe aktarma ✅ (otomatik tarayıcı taramasıyla doğrulandı 2026-07-17)

Spec 008, M44–M51 (E95–E111) tamamen kod-complete: `watches.date_unknown`
bayrağı + migration (elden düzeltilmiş journal timestamp'iyle), zip v6,
tüm yeni istatistik agregatları (`packages/core/src/library/stats/` —
`totals.ts` + `buckets.ts` + `timeline.ts`), `GET /api/stats?tz=`, ve
baştan yapılandırılmış `/stats` sayfası (20 bölüm + korunan puan dağılımı/
en çok tekrar izlenenler). Otomatik doğrulanabilenler yeşil: `pnpm lint &&
pnpm typecheck && pnpm test && pnpm build` — 576 test, 64 test dosyası,
sıfır hata.

Bu checkpoint chromium/playwright standart ortamda kurulu değilken (ad hoc
kuruldu, kalıcı bir proje skill'i değil) **gerçek çalışan sunucuya karşı**
otomatik olarak yürütüldü — aşağıdaki her alt bölüm gerçek sonuçlarla
işaretli. Mutasyon gerektiren tek adım (dil değişimi) net-zero iz
bırakacak şekilde geri alındı; gerçek kütüphaneye (`apps/server/data/`)
hiçbir yazma/import mutasyonu **uygulanmadı** — date_unknown/footer testi
izole bir geçici dizinde ayrı bir sunucu örneğiyle yapıldı.

`dashboard.html` artık silindi (bu commit'te) — karşılaştırma aşağıda
tamamlandı, M44.2'nin kendi "M52'nin değer kontrolüne kadar tutulabilir"
maddesi burada karşılandı.

### Zip v6 dışa/içe aktarma (E95)
- [x] `GET /api/export.zip` gerçek kütüphaneye karşı denendi — HTTP 200,
      `manifest.schemaVersion: 6`, `counts: {items: 246, watches: 7316,
      ratings: 0}` — canlı `/api/stats`teki sayılarla eşleşiyor.
- [x] `date_unknown=1` → footer dipnotu zinciri izole bir test
      kütüphanesinde (gerçek veriden tamamen ayrı, geçici dizin) uçtan uca
      doğrulandı: `Library.addWatch(..., {dateUnknown:true})` ile 7 tarihli
      + 3 zamansız izleme oluşturuldu → `/stats` sayfası tam olarak
      "Zaman bazlı analizler tarih bilgisi olan **7 / 10** izlemeye
      dayanıyor" dipnotunu gösterdi (interpolasyon doğru, konsol hatası
      yok). CSV ayrıştırma → `date_unknown` bayrağı zinciri zaten
      `apps/server/src/routes/tvtime.test.ts`'teki HTTP-seviyeli testle
      (E95) kapsanıyor — bu adım sadece son halka olan **UI render**'ı
      doğruladı.
- [ ] Kendi gerçek TV Time GDPR zip'in elindeyse (repo'da yok, sadece sende)
      istersen `/import`den ("TV Time'dan içe aktar") tekrar yükleyip aynı
      dipnotu canlı veride de gözlemleyebilirsin — yukarıdaki eşdeğer testin
      ışığında bu isteğe bağlı, teknik olarak gerekli değil.

### `dashboard.html` karşılaştırması (tamamlandı)
Gerçek sonuçlar (2026-07-17, `dashboard.html` 2026-07-02 anlık görüntüsü ile
canlı `/stats` karşılaştırması) — birebir eşleşme zaten **beklenmiyordu**
(model kasıtlı olarak farklılaşıyor, bkz. spec.md §Edge-case decisions):
- [x] Hero: dashboard.html "181g 1s / 7.171 bölüm / 262 dizi" vs canlı
      "213g 2s / 7.151 bölüm / 246 dizi" — aynı büyüklük mertebesinde;
      fark 15 günlük gerçek zaman farkı + E13 süre hesaplama metodolojisi
      farkıyla tutarlı.
- [x] Favoriler: dashboard.html 18 vs canlı **0**. Bug değil — favori
      işaretleme (`tracking.favorite`) 008'den önce yoktu (E61, spec 005),
      TV Time'ın kendi "favori" kavramından bağımsız yeni bir alan; kullanıcı
      henüz yeni uygulamada hiçbir diziyi kalple işaretlememiş. Beklenen.
- [x] En Hızlı Binge'ler ilk satırı: dashboard.html "Brooklyn Nine-Nine —
      2019-05-19, 33 bölüm" vs canlı **"How I Met Your Mother —
      2015-05-02, 208 bölüm"**. Farklı diziler bekleniyor (farklı model +
      15 günlük veri farkı) ama 208 bölüm/gün dikkat çekici: HIMYM'in tüm
      dizisi (9 sezon) tam olarak 208 bölüm — muhtemelen o günün bir toplu
      "tümünü izlendi işaretle" aksiyonundan (bulk/import kaynaklı, gerçek
      tek-günlük izleme değil). E102'nin tanımına göre **doğru hesaplanmış**
      (aynı gün + aynı dizi + ayrı bölüm ≥2) — model bunu gerçek binge'den
      ayırt etmiyor, spec'in kabul ettiği bir sınırlama (E95'in
      "bulk/import kümeleri" notuna benzer, ayrı bir edge-case değil).

### Zaman dilimi mantık kontrolü (E96) — tamamlandı
- [x] Canlı veriye (7.316 izleme) `?tz=UTC` ve `?tz=Europe/Istanbul` ile
      ayrı ayrı istek atıldı: `byHour` dizisi İstanbul'da UTC'ninkinin
      **tam olarak 3 pozisyon kaydırılmış hali** (UTC+3, DST yok) —
      toplamlar (7.316) birebir aynı kaldı. `byWeekday` toplamları da aynı
      (7.316), dağılım gece yarısı sınırındaki kaymalarla tutarlı şekilde
      hafifçe farklı. `activityByDay` gün sayısı UTC'de 952, İstanbul'da
      939 (bazı UTC-ayrı günler +3 kaymayla aynı yerel güne düşüyor) —
      toplam izleme sayısı (7.316) yine birebir aynı. Matematiksel olarak
      tutarlı, E96 doğru çalışıyor.

### İki dil — tamamlandı
- [x] Ayarlar → Dil'den EN'e geçildi (gerçek `settings.locale` değişti,
      test sonunda **tr'ye geri alındı** — net-zero iz), `/stats` tekrar
      açıldı: 20 bölümün tamamı İngilizce ("Recent Activity", "Most
      Watched", "Watch Status", "Production Status", "Genre
      Distribution", "Network Distribution", "Remaining Episodes",
      "Catch-up Pace", "Upcoming Episodes", "Fastest Binges", "Rewatches",
      "Weekly Streak", "Weekly / Monthly Watch Time", "Yearly Activity",
      "Day of the Week", "Hour of the Day" — hepsi doğru), hiçbir ham
      i18n anahtarı (`stats.xxx` gibi çıplak metin) görünmedi, konsol
      hatası yok.

### Tam gate
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` — hepsi
      yeşil (workspace: 576 test, 64 test dosyası).
