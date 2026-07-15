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
- [ ] `/calendar`'a git — varsayılan sekme "Zaman çizelgesi" olmalı.
- [ ] Sayfa açılışında BUGÜN satırına otomatik scroll olmalı (o gün boş
      olsa bile "(boş)" yazıp göstermeli).
- [ ] `airDate ≤ bugün` olan satırlarda ✓ checkbox olmalı, gelecek
      satırlarda **olmamalı**.
- [ ] Geçmiş bir satırı işaretle → refetch sonrası listeden kaybolmalı
      (aynı optimistic mutation, sayfa yenilenmeden).

### Takvim (ay) modu
- [ ] "Takvim" sekmesine geç — Pazartesi başlangıçlı 7 sütunlu grid,
      bugünün hücresi vurgulu olmalı.
- [ ] ‹ › ile ay değiştir — her navigasyonda o ayın tam aralığı
      (`from`=1. gün, `to`=son gün) yeniden çekilmeli.
- [ ] 3'ten fazla bölümü olan bir hücrede "+n" göstergesi çıkmalı.
- [ ] Geçmiş bir aya git → sadece izlenmemiş bölümler görünmeli (E24 —
      sunucu zaten filtreliyor).
- [ ] Pencereyi 640px altına daralt (veya DevTools mobil görünüm) →
      grid, dolu günlerin dikey listesine dönüşmeli.

### Etiketler (EpisodeTags)
- [ ] Bölüm satırlarında/hücrelerinde YENİ, PREMIER, FİNAL, OVA/SPECIAL
      rozetlerinin doğru göründüğünü kontrol et.
- [ ] ⚠️ **Bilinen nokta:** YENİ rozetinin üst sınırı yok (spec.md E25'in
      literal metnine göre uygulandı: `airDate ≥ bugün−3g`, üst sınır
      yok) — bu yüzden takvimdeki hemen hemen tüm gelecek bölümler YENİ
      rozeti taşıyacak. ui.md'deki mockup bunun yerine ±3 günlük simetrik
      bir pencere gösteriyor gibi duruyordu (spec metniyle çelişkili).
      Tarayıcıda tuhaf/gürültülü görünürse haber ver, simetrik pencereye
      çevirebilirim.

### İki dil
- [ ] Ayarlar → Dil'den EN'e geç, yukarıdaki adımların tamamını tekrarla.

### M10 regresyonu
- [ ] Ana sayfaya dön — bölümler hâlâ doğru görünüyor mu (kategori
      mantığına M11'de dokunulmadı, ama yine de bir bakış).

### Tam gate
- [ ] `pnpm lint && pnpm -r typecheck && pnpm exec vitest run` — hepsi
      yeşil (ben zaten doğruladım, sen de istersen tekrar çalıştırabilirsin).

---

## M12.4 — CHECKPOINT M12 (bekliyor)

`/watch` sayfası: geçmiş, sıradaki bölümler (quick-mark + rozetler), bir
süredir izlenmedi bölümü.

### Nav + sayfa
- [ ] Üst navda "Kütüphane" ile "Takvim" arasında yeni "İzleme" linki
      olmalı, `/watch`'a gitmeli.
- [ ] Sayfa başlığı ("İzleme"), İzleme geçmişi, Sıradaki bölümler, Bir
      süredir izlenmedi bölümleri sırayla görünmeli.

### İzleme geçmişi
- [ ] Liste en eski **üstte**, en yeni **altta** olmalı (API newest-first
      döndürüyor, sayfa client-side ters çeviriyor).
- [ ] Sayfa açılışında otomatik olarak listenin **en altına** scroll
      olmalı.
- [ ] Bugün izlenen bir bölüm "Bugün {saat}" formatında, dün izlenen
      "Dün {saat}" formatında, daha eskiler "{gün} {ay} {saat}"
      formatında görünmeli.
- [ ] Hiç izleme yoksa boş durum mesajı çıkmalı.

### Sıradaki bölümler (category = watching)
- [ ] Her satırda poster, başlık, SxEy, (varsa) +N rozeti, bölüm adı,
      EpisodeTags rozetleri görünmeli.
- [ ] `nextUnwatched.airDate` bugüne eşit veya geçmişse checkbox olmalı;
      null veya gelecekse checkbox **olmamalı** (E29).
- [ ] Bir satırı işaretle → o dizinin `nextUnwatched`'ı bir sonraki
      bölüme ilerlemeli (yeniden fetch sonrası).
- [ ] Bir dizinin son izlenmemiş bölümünü işaretle → kategori
      up_to_date/finished'a döner, satır bu bölümden tamamen kaybolmalı.
- [ ] Boşsa boş durum mesajı çıkmalı.

### Bir süredir izlenmedi (category = not_watched_recently)
- [ ] Aynı satır bileşeni, doğru kategori filtrelemesiyle çalışmalı.

### Takvim/kütüphane senkronizasyonu
- [ ] Bir bölümü işaretledikten sonra `/calendar` ve `/` (ana sayfa)
      sayfalarına gidip verinin güncel olduğunu doğrula (aynı invalidate
      zinciri).

### İki dil + M10/M11 regresyonu
- [ ] Ayarlar → Dil'den EN'e geç, yukarıdaki adımları tekrarla.
- [ ] Ana sayfa (M10) ve takvim (M11) hâlâ doğru çalışıyor mu, hızlıca
      bak.

### Tam gate
- [ ] `pnpm lint && pnpm -r typecheck && pnpm exec vitest run` — hepsi
      yeşil (ben zaten doğruladım).

---

## M13.1 — Kabul yürüyüşü (henüz implemente edilmedi)

spec 002'nin tam kabul checklist'i (`spec.md` §Acceptance checklist).
İmplementasyon tamamlanınca bu bölüm doldurulacak.
