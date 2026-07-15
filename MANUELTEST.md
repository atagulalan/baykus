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
