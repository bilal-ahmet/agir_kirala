// İl / ilçe verisi. Konum filtresi ve ilan ekleme formunda kullanılır.
// Mock kapsam: en çok kiralama hacmi olan iller + temsili ilçeler.

export interface Province {
  name: string;
  districts: string[];
}

export const PROVINCES: Province[] = [
  { name: "İstanbul", districts: ["Tuzla", "Pendik", "Hadımköy", "Esenyurt", "Sancaktepe", "Başakşehir", "Ümraniye"] },
  { name: "Ankara", districts: ["Sincan", "Etimesgut", "Yenimahalle", "Kazan", "Polatlı", "Çankaya"] },
  { name: "İzmir", districts: ["Kemalpaşa", "Torbalı", "Menemen", "Çiğli", "Bornova", "Aliağa"] },
  { name: "Bursa", districts: ["Nilüfer", "İnegöl", "Gemlik", "Osmangazi", "Kestel"] },
  { name: "Kocaeli", districts: ["Gebze", "Çayırova", "Körfez", "Dilovası", "İzmit"] },
  { name: "Antalya", districts: ["Kepez", "Döşemealtı", "Manavgat", "Serik", "Aksu"] },
  { name: "Adana", districts: ["Seyhan", "Yüreğir", "Sarıçam", "Ceyhan"] },
  { name: "Konya", districts: ["Selçuklu", "Karatay", "Meram", "Ereğli"] },
  { name: "Gaziantep", districts: ["Şehitkamil", "Şahinbey", "Nizip"] },
  { name: "Mersin", districts: ["Tarsus", "Akdeniz", "Toroslar", "Erdemli"] },
  { name: "Kayseri", districts: ["Melikgazi", "Kocasinan", "Talas"] },
  { name: "Samsun", districts: ["Tekkeköy", "Atakum", "Canik"] },
  { name: "Tekirdağ", districts: ["Çorlu", "Çerkezköy", "Ergene", "Kapaklı"] },
  { name: "Sakarya", districts: ["Adapazarı", "Serdivan", "Hendek"] },
  { name: "Eskişehir", districts: ["Odunpazarı", "Tepebaşı"] },
  { name: "Diyarbakır", districts: ["Bağlar", "Kayapınar", "Yenişehir"] },
  { name: "Trabzon", districts: ["Ortahisar", "Akçaabat", "Arsin"] },
  { name: "Manisa", districts: ["Yunusemre", "Şehzadeler", "Turgutlu"] },
  { name: "Balıkesir", districts: ["Altıeylül", "Karesi", "Bandırma"] },
  { name: "Hatay", districts: ["İskenderun", "Antakya", "Dörtyol"] },
];

export const PROVINCE_NAMES = PROVINCES.map((p) => p.name);

export function districtsOf(province: string | undefined): string[] {
  if (!province) return [];
  return PROVINCES.find((p) => p.name === province)?.districts ?? [];
}
