/**
 * Sürekli dinlemede sonuç parçalarının birleştirilmesi.
 *
 * Sessizlik payı için `continuous: true`'ya geçildi; tarayıcılar parçaları
 * farklı biçimde verdiği için yanlış birleştirme aramaya tekrarlanan kelime
 * olarak sızar ve ayrıştırıcıyı şaşırtır.
 */

import { describe, expect, it } from "vitest";
import { mergeTranscripts } from "@/components/search/voice-transcript";

describe("mergeTranscripts", () => {
  it("masaüstü: ayrı bölümler eklenir", () => {
    expect(mergeTranscripts(["ekskavatör", " Ankara'da"])).toBe("ekskavatör Ankara'da");
  });

  it("Android Chrome: birikmiş metni tekrar eden parça öncekinin yerine geçer", () => {
    expect(mergeTranscripts(["ekskavatör", "ekskavatör Ankara'da", "ekskavatör Ankara'da operatörlü"])).toBe(
      "ekskavatör Ankara'da operatörlü",
    );
  });

  it("büyük/küçük harf farkı tekrarı gizlemez (Türkçe İ/i)", () => {
    expect(mergeTranscripts(["istanbul", "İstanbul'da vinç"])).toBe("İstanbul'da vinç");
  });

  it("boş parçalar ve fazla boşluk atılır", () => {
    expect(mergeTranscripts(["", "  forklift   kiralık ", "  "])).toBe("forklift kiralık");
    expect(mergeTranscripts([])).toBe("");
  });
});
