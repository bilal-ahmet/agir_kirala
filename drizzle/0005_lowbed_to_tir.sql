-- Lowbed ilanları Damperli Kamyonlar'dan yeni Tır kategorisine taşınır.
--
-- Eski alt kategori "Lowbed Çekici Dorse" idi ve bu ilanlar dorse kiralamasıydı;
-- bu yüzden kiralamaKapsami "Yalnız Dorse" yazılır (ilan sahibi düzenleyebilir).
-- Eski "uzunluk" alanı tırdaki "kasaUzunlugu"na çevrilir; tasimaKapasitesi ve
-- dingilSayisi aynı anahtarla tırda da var, olduğu gibi kalır.
-- Var olan kiralamaKapsami değeri ezilmez (migration iki kez koşarsa da güvenli).
UPDATE "listings"
SET
  "category_slug" = 'tir',
  "sub_category_slug" = 'lowbed',
  "specs" = jsonb_build_object('kiralamaKapsami', 'Yalnız Dorse')
    || ("specs" - 'uzunluk')
    || CASE
         WHEN "specs" ? 'uzunluk' THEN jsonb_build_object('kasaUzunlugu', "specs" -> 'uzunluk')
         ELSE '{}'::jsonb
       END,
  "updated_at" = now()
WHERE "category_slug" = 'damperli-kamyon'
  AND "sub_category_slug" = 'lowbed-cekici';
