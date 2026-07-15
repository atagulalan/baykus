# Manuel Test Listesi

Bu dosya, spec 002 (`specs/002-watch-categories/`) çalışması boyunca her
CHECKPOINT görevinin gerektirdiği tarayıcı testlerini toplar. Ortamda tarayıcı
otomasyon aracı yok, o yüzden bu adımlar xava tarafından manuel yapılıyor —
tüm implementasyon bitene kadar biriktiriliyor, sonra hepsi birden gözden
geçirilecek.

Her bölüm ilgili checkpoint görevinin (`tasks.md`) DoD'sini birebir yansıtır.
Bir checkpoint testi geçince ilgili `tasks.md` kutucuğunu işaretleyip commit
atabilirsin (veya bana söyle, ben atarım).

---

## M10.8 — CHECKPOINT M10 ✅ (xava tarafından zaten test edildi ve işaretlendi)

Dinamik kategoriler uçtan uca: ana sayfa bölümleri, filtre paneli, manuel
liste davranışı (guard + auto-clear), zip v1 import, round-trip.

- [x] Zaten tamamlandı — `tasks.md`'de kutucuk işaretli, commit atıldı.

---

## M11.4 — CHECKPOINT M11 (bekliyor)

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
- [ ] "Takvim" sekmesine geç — Pazartesi başlangıçlı 7 sütunlu grid,
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
- [ ] Bölüm satırlarında/hücrelerinde YENİ, YAKLAŞAN, PREMIER, FİNAL,
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

## M12.4 — CHECKPOINT M12 (bekliyor)

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

## M13.1 — Kabul yürüyüşü (henüz implemente edilmedi)

spec 002'nin tam kabul checklist'i (`spec.md` §Acceptance checklist).
İmplementasyon tamamlanınca bu bölüm doldurulacak.

---

## M14.7 — CHECKPOINT M14 (bekliyor)

Spec 003, M14: dinamik İzleniyor sinyalleri (yeni bölüm lift'i, yeni
eklenen lift'i), yapılandırılabilir pencere, zip v3. Mekanik kısımlar
(tam gate + curl testi) benim tarafımdan doğrulandı; aşağıdaki üç satır
tarayıcı gerektiriyor (spec.md 003 §Acceptance checklist).

### HotD senaryosu — yeni bölüm lift'i (E33)
- [ ] Daha önce izlenmiş ama uzun süredir izlenmemiş (`up_to_date` veya
      `not_watched_recently`) bir dizinin yeni bir bölümü, pencere
      içinde airlendiğinde (gerçek veri yoksa episode air_date'i elle
      geçmişe/pencereye çekip refresh ile simüle edilebilir) dizi
      İzleniyor'a düşmeli — hiç izlenmemiş bölüm izlenmeden.
- [ ] Pencere geçip yeni izleme olmazsa dizi "Bir süredir izlenmedi"ye
      düşmeli.
- [ ] Hiç izlenmemiş (`not_started`) bir dizinin yeni bölümü airlense
      bile İzleniyor'a **atlamamalı** (lift sıfır-izlemeli dizilere
      ulaşmıyor — E33).

### Arama çubuğundan ekleme — yeni eklenen lift'i (E32)
- [x] Arama çubuğundan bir dizi ekle → hiç izlenmemiş olsa bile hemen
      İzleniyor'da görünmeli. **Mekanik olarak doğrulandı:** gerçek dev
      kütüphanesine "Pluribus" (tvmazeId 86175) POST `/api/library/series`
      ile eklendi, response'ta `"category": "watching"` döndü, sonra
      DELETE ile temizlendi. Yine de tarayıcıda arama kutusundan aynı
      akışı bir kez dene.
- [ ] TV Time / zip import'tan gelen bir dizi (sıfır izlemeyle) İzleniyor'a
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

## M15.4 — CHECKPOINT M15 (bekliyor)

Spec 003, M15: sezon-segmentli ilerleme çubuğu + dizi detay sayfası
düzenlemeleri. Mekanik kısım (tam gate + API'nin `seasonProgress`
döndürdüğünü curl ile doğrulama) benim tarafımdan yapıldı.

### Segmentli ilerleme çubuğu (kart + detay)
- [ ] Ana sayfada, birden fazla sezonu olan ve düzenli (atlama yapmadan)
      izlenmiş bir dizinin kartında sezon kareleri + "sınır" (frontier)
      çubuğu görünmeli (◼◼◼[▰▰▰▱▱]◻◻ gibi). **API tarafı mekanik
      doğrulandı:** gerçek kütüphanede (280 dizi, 197'si çok sezonlu)
      `seasonProgress` alanı doğru şekilde dolduruluyor (ör. "Gen V" →
      2 sezon, ikisi de watched==total).
- [ ] Aynı görünüm dizi detay sayfasının üst kısmında (poster yanındaki
      ilerleme alanı) da olmalı.
- [ ] Tamamı izlenmiş bir dizide tüm kareler dolu (◼◼◼◼) görünmeli.

### Fallback (atlama yapılmış / >12 sezon)
- [ ] Bölümleri sırayla değil atlayarak izlemiş bir dizide (ör. S2'yi
      bitirmeden S1'de boşluk bırakmış) segmentli görünüm yerine eski
      düz yüzde çubuğu çıkmalı. **API tarafı mekanik doğrulandı:**
      gerçek kütüphanede 5 dizi `sequential: false` dönüyor (ör. "The
      Last of Us" — S1 tam, S2'de 1/7); bu dizilerden birini açıp düz
      çubuğu gör.
- [ ] (Varsa) 12'den fazla sezonu olan bir dizide de düz çubuk
      görünmeli.

### Dizi detay sayfası (E37)
- [ ] Specials (Sezon 0) bölümü olan bir diziyi aç — Specials sezon
      listesinin **en altında** görünmeli (diğer sezonlar 1, 2, ... artan
      sırada üstte).
- [ ] 2:3 oranında olmayan bir poster (ör. TVmaze kaynaklı bir dizi)
      **kırpılmadan tam** görünmeli (üstte/altta beyaz boşluk kalması
      normal — artık `object-cover` yok).
- [ ] Posteri olmayan bir dizide placeholder kutusu hâlâ 2:3 oranında
      düzgün görünmeli (kırık görsel ikonu çıkmamalı).

### İki dil
- [ ] Ayarlar → Dil'den EN'e geç, yukarıdaki adımların tamamını tekrarla.

### Tam gate
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` — hepsi
      yeşil (ben zaten doğruladım).

---

## M16.4 — CHECKPOINT M16 (bekliyor)

Spec 003, M16: sticky header + mobil alt navigasyon, takvimde poster
görselleri, filtre RESET düzeltmesi. Mekanik kısım (tam gate) benim
tarafımdan doğrulandı.

### Sticky header
- [ ] Herhangi bir sayfada aşağı kaydır — üst bar (logo + arama +
      masaüstünde nav linkleri) ekranın üstünde sabit kalmalı, altındaki
      içeriğin üzerine binmeli (opak arka plan).

### Mobil alt navigasyon (<640px veya DevTools mobil görünüm)
- [ ] Üst barda nav linkleri (Kütüphane/İzleme/Takvim/İstatistik/Ayarlar)
      **kaybolmalı**; ekranın altında sabit bir tab bar'da 5 ikon +
      küçük etiket görünmeli (lucide-react ikonları — FontAwesome/ikon
      fontu **olmamalı**).
- [ ] Tab bar'daki 5 sekmenin hepsine tıklayıp ilgili sayfaya gittiğini
      doğrula; aktif sekme diğerlerinden görsel olarak ayrışmalı.
- [ ] Sayfa içeriği tab bar'ın arkasında kalmamalı (alt boşluk yeterli).
- [ ] Takvim → zaman çizelgesi modunda sayfa açılışında BUGÜN satırına
      otomatik scroll oluyor mu, satır sticky header'ın **altında kalmadan**
      tam görünür mü (scroll-mt).

### Takvimde poster görselleri (E35)
- [ ] Zaman çizelgesi modunda her satırda 40×56 poster thumbnail
      görünmeli.
- [ ] Ay modu (masaüstü) — hücrelerde küçük (~24px) poster + metin
      görünmeli; posteri olmayan bir bölüm sadece metin göstermeli
      (placeholder kutusu yok).
- [ ] Pencereyi <640px'e daralt → ay modu, zaman çizelgesi tarzı
      satırlara (poster thumb'lı) dönüşmeli.
- [ ] Posteri 404 dönen veya null olan bir girdi kırık görsel ikonu
      göstermeden temiz bir placeholder ile render olmalı.
- [ ] Bugün vurgusu hem zaman çizelgesinde hem ay modunda hâlâ doğru
      çalışıyor mu (2026-07-15 yerel tarih düzeltmesinin tekrar
      doğrulanması).

### Filtre RESET (E41)
- [ ] Kütüphane sayfasında Filtrele panelini aç, sıralamayı ve
      kategoriyi varsayılan olmayan bir değere değiştir, SIFIRLA'ya
      bas → radyo düğmeleri **Son izlenen** + **Tümü**'ne dönmeli (draft
      state, panel açık kalmalı). UYGULA ile onayla.

### İki dil
- [ ] Ayarlar → Dil'den EN'e geç, yukarıdaki adımların tamamını tekrarla.

### Tam gate
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` — hepsi
      yeşil (ben zaten doğruladım).

---

## M17 — İzleme sayfası + test bildirimi (bekliyor)

Spec 003, M17: birleşik izleme sayfası (paylaşılan satır bileşeni,
sabitlenmiş geçmiş, otomatik scroll), test bildirimi butonu. Sunucu
tarafı testleri (push.test.ts, history.test.ts, watches.test.ts) ve
saf yardımcı fonksiyon testleri (WatchNextRow.test.ts değişmedi,
seasons.test.ts yeni) zaten yeşil — burada sadece tarayıcı gerektiren
kısımlar listeleniyor.

### İzleme sayfası (E38)
- [ ] `/watch` sayfasını aç — sayfa açılışında otomatik olarak
      **"Sıradaki bölümler"** başlığına scroll olmalı (sticky header'ın
      altında kalmadan, tam görünür).
- [ ] İzleme geçmişi artık kutulu/kısa bir metin listesi değil, diğer
      bölümlerle (Sıradaki bölümler, Bir süredir izlenmedi) **aynı görsel
      satır** biçiminde olmalı: poster, başlık, SxEy, bölüm adı,
      EpisodeTags rozetleri, sağda göreli zaman ("Bugün 21:30" /
      "Dün 21:12" / "12 Tem 21:30").
- [ ] Geçmiş listesi artık **iç scroll kutusu içinde değil** — tüm
      liste (varsayılan 30 kayıt) sayfanın kendisinde, en eski üstte en
      yeni altta sırayla akmalı.
- [ ] Sıradaki bölümler / Bir süredir izlenmedi bölümlerindeki quick-mark
      checkbox'ı hâlâ çalışıyor mu (bir satırı işaretle → o dizi bir
      sonraki bölüme ilerlemeli veya kategoriden düşmeli).

### Test bildirimi (E39)
- [ ] Ayarlar → Bildirimler bölümünde, bildirimlere abone olduktan sonra
      **"Test bildirimi gönder"** butonu görünmeli (abone değilken
      görünmemeli).
- [ ] Butona bas → cihazda gerçek bir push bildirimi ("baykuş" /
      "Test bildirimi") gelmeli; başarı toast'ı ("Test bildirimi
      gönderildi") çıkmalı.
- [ ] Aboneliği iptal edip tekrar dene → buton kaybolmalı.

### İki dil
- [ ] Ayarlar → Dil'den EN'e geç, yukarıdaki adımların tamamını tekrarla.

### Tam gate
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` — hepsi
      yeşil (ben zaten doğruladım).

---

## M17.9–M17.14 — Plan dışı: tvtime düzeltmeleri, marka yenileme, aksiyon
## menüsü, bölüm işaretleme modalleri (bekliyor)

Spec 003, M17.9–M17.14 (E43–E47). Bu round tamamen uygulama içinde
tarayıcı erişimi olmadan geliştirildi (bu ortamda da chromium/playwright
bulunamadı — `pnpm dev` başlatılıp curl ile smoke test yapıldı, ama görsel
doğrulama insan gözü gerektiriyor). Sunucu/paket tarafı testleri
(parse.test.ts, match.test.ts, tvtime.test.ts) zaten yeşil; burada sadece
tarayıcı gerektiren kısımlar listeleniyor.

### TV Time içe aktarma canlı ilerleme (E44)
- [ ] Ayarlar → Veri → "TV Time'dan içe aktar" → gerçek/büyük bir GDPR
      zip'i yükle → yükleme sırasında ilerleme çubuğu + son eşleşmelerin
      canlı listesi (✓/?/✗ işaretli, en fazla 8 satır) görünmeli.

### Marka yenileme — tasarım sistemi (E45)
- [ ] Genel görünüm: koyu `#080808` zemin, sarı (`#f0e000`) tek vurgu
      rengi, başlıklarda italik serif font (DM Serif Display), etiket/
      buton metinlerinde mono+büyük harf; hiçbir yerde yuvarlatılmış köşe
      (`rounded-*`) kalmamalı.
- [ ] Puan kontrolü (RatingControl) ve istatistikler sayfasındaki puan
      dağılımı artık emoji değil, ok ikonları (yukarı/yatay/aşağı,
      yeşil/sarı/kırmızı) göstermeli.
- [ ] Tüm checkbox'lar (bölüm satırı, sezon "tümünü izledim", takvim,
      sıradaki bölümler, Ayarlar → ek kaynaklar) artık yeni sarı dolgulu
      kare bileşen — tarayıcının native checkbox'ı değil.
- [ ] Kütüphane kartlarında ve dizi detay başlığında watched/aired metni
      kategoriye göre renkleniyor mu (bırakıldı=kırmızı, bitirildi=mor,
      güncel=yeşil, diğerleri=sarı).

### Dizi aksiyonları — detay sayfası menüsü (E46)
- [ ] Kütüphane kartının üzerine gelince artık **hiçbir buton** çıkmamalı
      (kart sadece bir link).
- [ ] Bir diziye tıkla → detay sayfası başlığında "⋮" menüsü: listeye
      taşı / otomatiğe döndür / yenile / sessize al-aç / kaldır
      seçenekleri, eskisiyle aynı davranışta çalışmalı (ör. bitirilmiş
      dizide "bırakıldı" seçeneği görünmemeli).
- [ ] "Kaldır" → onay diyaloğu → kütüphaneden silinip ana sayfaya
      dönmeli.

### Bölüm işaretleme modalleri (E47)
- [ ] Daha önce izlenmemiş bölümü olan bir sezonda, aradaki bir bölümü
      işaretlemeye çalış → "Önceki bölümler işaretlensin mi?" modalı
      çıkmalı; "buraya kadar izledim" hepsini işaretlemeli, "sadece bu
      bölüm" yalnızca o bölümü işaretlemeli.
- [ ] Öncesinde izlenmemiş bölüm yoksa tek dokunuşla direkt işaretlenmeli
      (modal çıkmamalı — eski davranış).
- [ ] İzlenmiş bir bölümün checkbox'ına tıkla → "tekrar izledim / tarihi
      düzenle / izlenmedi işaretle" sayfası (sheet) açılmalı, üçü de
      çalışmalı.
- [ ] Sezon başlığındaki "tümünü izledim" butonu artık bir checkbox;
      sezon tamamlanmışsa işaretli ve devre dışı olmalı, sayfa
      açıldığında tamamlanmış sezonlar kapalı başlamalı.

### İki dil
- [ ] Ayarlar → Dil'den EN'e geç, yukarıdaki adımların tamamını tekrarla.

### Tam gate
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` — hepsi
      yeşil, her M17.9–M17.14 commit'inde ayrı ayrı doğrulandı.
