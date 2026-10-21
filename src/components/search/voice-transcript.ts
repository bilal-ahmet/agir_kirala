/**
 * Sürekli dinleme modunda (`continuous: true`) gelen sonuç parçalarını tek
 * cümleye birleştirir. Saf — test edilir.
 *
 * Tarayıcılar parçaları iki farklı biçimde verir:
 * - Masaüstü Chrome/Safari: her parça yeni bir bölüm → ["ekskavatör", "Ankara'da"]
 * - Android Chrome: her parça o ana kadarki TÜM metni tekrar eder
 *   → ["ekskavatör", "ekskavatör Ankara'da"]
 * Düz birleştirme ikincisinde "ekskavatör ekskavatör Ankara'da" üretirdi.
 * Bir parça birikmiş metinle başlıyorsa onun yerine geçer, yoksa eklenir.
 */
export function mergeTranscripts(parts: string[]): string {
  let acc = "";
  for (const raw of parts) {
    const part = raw.replace(/\s+/g, " ").trim();
    if (!part) continue;
    if (part.toLocaleLowerCase("tr").startsWith(acc.toLocaleLowerCase("tr"))) acc = part;
    else acc = `${acc} ${part}`;
  }
  return acc;
}
