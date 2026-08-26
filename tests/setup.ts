/**
 * Test ortamı kurulumu.
 *
 * DATABASE_URL her koşulda ÜZERİNE YAZILIR. Bariyerin özü budur: geliştiricinin
 * kabuğunda üretim DATABASE_URL'i tanımlı olsa bile testler ona ulaşamaz.
 *
 * TEST_DATABASE_URL verilmemişse ulaşılamaz bir sentinel adres yazılır —
 * veritabanına dokunan testler bağlantı hatasıyla düşer (saf birim testleri
 * çalışmaya devam eder), ama hiçbir durumda gerçek bir veritabanına yazılmaz.
 */

const testUrl = process.env.TEST_DATABASE_URL;

const SENTINEL = "postgres://test:test@127.0.0.1:1/asla-baglanma";

process.env.DATABASE_URL = testUrl ?? SENTINEL;

if (!testUrl) {
  console.warn(
    [
      "",
      "TEST_DATABASE_URL tanımlı değil — veritabanına dokunan testler ATLANMAYACAK, HATA VERECEK.",
      "Saf birim testleri (ör. filter-params) yine de koşar.",
      "",
      "Entegrasyon testleri için ayrı bir veritabanı verin:",
      "  TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/avk_test npm run db:push",
      "  TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/avk_test npm test",
      "",
    ].join("\n"),
  );
}

// Supabase Storage core testlerinde çağrılmıyor, ama modül yüklenmesi
// patlamasın diye zararsız yer tutucular.
process.env.SUPABASE_URL ??= "http://localhost:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service-role-key";
