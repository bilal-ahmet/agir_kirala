# /api/v1 — Mobil istemci API'si

Flutter uygulaması bu katmanı kullanır. Web (RSC + server action) değişmedi.

## Katmanlar

```
src/lib/core/          iş mantığı — Result<T> / MutationResult<T> döner, oturum OKUMAZ
├── src/lib/actions/   "use server" ince sarmalayıcı (web): oturum + revalidatePath + { error }
└── src/app/api/v1/    route handler (mobil): oturum + HTTP statü + JSON zarf
```

Route handler'lar server action'ları **sarmaz** — ikisi de aynı core fonksiyonunu
çağırır. Böylece `redirect()`, `revalidatePath()` ve Türkçe string hata bagajı
API'ye sızmaz, iş kuralı da iki yerde kopyalanmaz.

## Tuzak: "use server" dosyaları tip export EDEMEZ

`src/lib/actions/*.ts` dosyaları **yalnızca async fonksiyon** export edebilir.
`export type { X }` yazmak çalışma anında `ReferenceError: X is not defined`
üretir: derleyici modülü dönüştürürken tip-only işaretini kaybedip tanımsız bir
runtime bağı bırakıyor.

Bunu **`tsc` de `next build` de yakalamaz** — hata yalnızca o modülü içeren bir
sayfada herhangi bir server action çağrıldığında ortaya çıkar ve tarayıcıda
"This page couldn't load" olarak görünür. Tipleri kaynağından import edin
(`@/lib/core/schemas`, `@/lib/core/uploads`).

## Hata sözleşmesi

```json
{ "error": { "code": "not_found", "message": "İlan bulunamadı.", "fieldErrors": { } } }
```

HTTP statüsünü **`code` belirler** (`src/lib/core/errors.ts` → `httpStatus`).
`message` yalnız gösterim içindir ve haber verilmeden değişebilir — istemci
akış kararlarını asla mesaja bakarak vermez. Mobil istemci mağaza güncellemesine
kadar geri alınamadığı için sözleşme string'e değil koda bağlanmıştır.

Kodlar: `unauthorized` `forbidden` `not_found` `validation` `conflict`
`listing_not_active` `self_action` `already_exists` `limit_exceeded`
`rate_limited` `internal`

## Kimlik doğrulama

`Authorization: Bearer <token>` — token `/auth/login` veya `/auth/register`'dan
alınır, 60 gün geçerlidir ve her kullanımda süresi uzar (günde en çok bir yazma).
Opak token olduğu için DB'den silinerek anında iptal edilebilir.

**GET dışı tüm uçlarda cookie fallback KAPALIDIR.** Server Action'lardaki
yerleşik origin kontrolü düz route handler'da yoktur; cookie mutasyonda kabul
edilseydi kötü niyetli bir site kullanıcı adına istek üretebilirdi (CSRF).

| mod | anlamı |
|---|---|
| `bearer` | oturum zorunlu, yalnız Authorization başlığı — tüm mutasyonlar |
| `session` | oturum zorunlu, Bearer yoksa cookie — özel veri GET'leri |
| `optional` | oturum isteğe bağlı; varsa çözülür — görünürlüğü izleyene göre değişen halka açık GET'ler |
| `none` | oturum aranmaz |

## Veri tipi sözleşmesi

- **Para**: `totalPrice` ve `rating` ondalık **STRING**'dir (`"24000.00"`).
  numeric → double → Dart double zincirinde yuvarlama hatası oluşur.
  `prices` tam sayı TL olduğu için sayıdır.
- **Tarih**: timestamp'ler ISO-8601 **UTC**; `startDate`/`endDate` `YYYY-MM-DD`
  (yerel gün, saat dilimi taşımaz); `availability.startTime/endTime` `HH:mm`
  yerel duvar saati.
- **Fotoğraf**: `{ id, thumb, original }`. `thumb` asla null değildir — küçük boyu
  olmayan eski kayıtlarda orijinale düşer.

## Görsel yükleme

Dosyalar sunucudan **geçmez** (Vercel'de istek gövdesi 4.5 MB ile sabit sınırlı).

1. `POST /listings/{id}/upload-ticket` → `{ original, thumb }` imzalı hedefler
2. İstemci iki dosyayı doğrudan Supabase'e yükler
   (Flutter: `storage.from(bucket).uploadToSignedUrl(path, token, file)`)
3. `POST /listings/{id}/media` → `{ path, thumbPath? }` ile kayıt

İstemci her fotoğraftan **iki** çıktı üretir — ham dosya hiç yüklenmez:

| | boyut | format |
|---|---|---|
| thumb | 400 px | WebP q75 |
| original | 1600 px'e sığdırılmış | WebP q80 |

Flutter için: `flutter_image_compress` → `CompressFormat.webp`, `minWidth: 400`
ve `minWidth: 1600`. Küçültme yapılamazsa `thumbPath` gönderilmez; sunucu bunu
opsiyonel kabul eder ve ilan yine kaydedilir.

## Sayfalama

Sayfa tabanlı, 12 ilan/sayfa (`?sayfa=N`). Filtre parametre adları web ile
birebir aynıdır (`kategori`, `marka`, `il`, `spec_<key>`, …) çünkü aynı
`parseFilters` kullanılır.

Bilinçli taviz: sonsuz kaydırma sırasında yeni ilan eklenirse nadiren tekrar/
atlama olabilir. Yedi sıralama anahtarını cursor'a uyarlamak orantısız iş olurdu.

## Eksik alanlar (Dart nullability)

`required` olmayan bir alanın değeri yoksa anahtar yanıttan **tamamen düşer** —
`null` gönderilmez (`videoUrl`, `fuel`, `companyName`, `accent`, `phone`,
`ownerRating`). Gerçekten null olabilen alanlar şemada açıkça nullable'dır
(`Session.deviceName`, `AppConfig.maintenance.message`, `ListingDetail.owner`).

## Dart model üretimi

```bash
NEXT_PUBLIC_SITE_URL=https://alanadiniz.com npm run openapi
```

Üretim adresi verilmezse `servers[0]` yer tutucu kalır ve script uyarır; kod
üreteçleri ilk sunucuyu varsayılan basePath olarak gömer.

`operationId`'ler kararlıdır; codegen metot adlarını oradan alır. `GET /listings`
filtrelerinin **hepsi** açık parametre olarak tanımlı (enum'lar dahil), tek istisna
dinamik `spec_*`. Alt nesneler (`Photo`, `PriceMap`, `SpecMap`, `Availability`,
`Message`, `SignedTarget`) `$ref` ile bağlı — anonim sınıf üretilmez.

## Push bildirimleri (OneSignal)

Adresleme **External ID** iledir; backend cihaz token'ı saklamaz. Bu yüzden
`device_tokens` tablosu ve `/device-tokens` uçları kaldırıldı — abonelikleri,
fan-out'u, tekrar denemeyi ve ölü token temizliğini OneSignal yönetiyor.

**Flutter tarafında gereken tek şey:**

```dart
OneSignal.initialize(ONESIGNAL_APP_ID);
await OneSignal.Notifications.requestPermission(true);
await OneSignal.login(user.id);   // giriş sonrası — External ID
await OneSignal.logout();         // çıkış / hesap silme sonrası
```

`OneSignal.login()` çağrılmazsa bildirim gitmez: backend kullanıcı id'siyle
hedefliyor ve OneSignal o id'yi tanımıyor.

**Env:** `ONESIGNAL_APP_ID`, `ONESIGNAL_API_KEY` (REST API Key — gizli).
Tanımlı değilse bildirim sessizce atlanır; geliştirme ve testler etkilenmez.

### Tetikleyiciler

| Olay | Alıcı | `data.type` | `data.id` |
|---|---|---|---|
| Yeni mesaj | karşı katılımcı | `message` | sohbet id |
| Yeni kiralama talebi | ilan sahibi | `request_created` | talep id |
| Talep onaylandı | kiralayan | `request_approved` | talep id |
| Talep reddedildi | kiralayan | `request_rejected` | talep id |
| Talep iptal edildi | ilan sahibi | `request_cancelled` | talep id |
| Yeni değerlendirme | ilan sahibi | `review_created` | yorum id |

Bildirim **hiçbir zaman eylemi yapana gitmez.** `data` içindeki her değer
STRING'dir (OneSignal sözleşmesi) ve `listingId` de taşınır — derin bağlantı
için yeterli.

### Mimari

Core `next/server`'ı import edemez (testler ve taşıma-bağımsızlığı buna dayalı),
o yüzden `revalidate` ile aynı bölünme kullanılır:

```
core mutasyonu → MutationResult { value, revalidate, notify }
                                                      ↓
                action sarmalayıcı / withApi → after() içinde gönderilir
```

`after()` şart: Vercel'de yanıttan sonra başlatılan ateşle-unut bir iş, lambda
donduğu için tamamlanmayabilir. Beklemek de yanlış olurdu — mesaj zaten
kaydedildi, kullanıcı OneSignal'i beklememeli. Gönderim hataları loglanır ve
yutulur; bildirim gidemedi diye mutasyon başarısız sayılmaz.
