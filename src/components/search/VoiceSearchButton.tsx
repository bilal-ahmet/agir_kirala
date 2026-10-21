"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { parseVoiceSearchAction } from "@/lib/actions/voice-search";
import type { VoiceChip } from "@/lib/core/voice-search/types";
import { Button } from "@/components/ui/Button";
import { ChevronRightIcon, MicIcon, XIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { mergeTranscripts } from "./voice-transcript";

/**
 * Sesli arama düğmesi.
 *
 * Ses → metin tarayıcıda (Web Speech API, tr-TR) yapılır; metin sunucuda
 * filtrelere çevrilir ve /ilanlar'a yönlendirilir. Tarayıcı desteklemiyorsa
 * (Firefox) düğme hiç görünmez — işlevsiz bir mikrofon göstermekten iyidir.
 *
 * Not: Chrome'da Web Speech sesi tanıma için Google sunucularına gönderir.
 */

// lib.dom tanımları tarayıcılar arasında tutarsız (webkit öneki); yalnız
// kullandığımız yüzey tanımlanır.
interface RecognitionResult {
  0: { transcript: string };
}
interface RecognitionEvent {
  results: ArrayLike<RecognitionResult>;
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => Recognition;

/**
 * Arayüzü sunup arkasındaki tanıma servisine erişemeyen tarayıcılar.
 *
 * Chromium türevleri `webkitSpeechRecognition`'ı Chrome'dan miras alır, ama
 * servis Google'ın Chrome'a özel anahtarıyla çalışır. Brave, Opera, Vivaldi ve
 * Electron tabanlı uygulama içi tarayıcılarda (ör. VS Code) her deneme anında
 * "network" hatasıyla biter — kullanıcının internet bağlantısından bağımsız.
 * Firefox gibi burada da işlevsiz bir mikrofon göstermemek daha doğru.
 */
function serviceUnavailable(): boolean {
  const nav = navigator as Navigator & { brave?: unknown };
  return Boolean(nav.brave) || /Electron|OPR\/|Opera|Vivaldi/.test(nav.userAgent);
}

function recognitionCtor(): RecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  if (serviceUnavailable()) return undefined;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

const noopSubscribe = () => () => {};

/**
 * İstemcide tarayıcı desteğine göre (hydration güvenli).
 *
 * Sunucuda varsayılan false — küçük ikon sonradan belirse kimse fark etmez.
 * `optimistic` ise sunucuda true: büyük CTA sonradan belirseydi altındaki
 * arama çubuğunu aşağı iterdi (kitlenin çoğu Chrome/Safari'de). Desteklemeyen
 * azınlıkta (Firefox) düğme hydration'dan sonra kaybolur.
 */
function useSpeechSupported(optimistic: boolean): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => recognitionCtor() !== undefined,
    () => optimistic,
  );
}

/** Örnek cümle — CTA ve dinleme paneli aynısını gösterir (mobilde kVoiceSearchExample). */
export const VOICE_SEARCH_EXAMPLE = "İstanbul’da operatörlü JCB kepçe";

/**
 * Konuşma bittikten sonra aramadan önce beklenen sessizlik.
 *
 * `continuous: false` iken Chrome ilk kısa sessizlikte kesiyordu: kullanıcı
 * "ekskavatör" deyip "...Ankara'da" diye düşünürken arama başlıyordu. Web
 * Speech API'de bekleme süresi ayarı yok; sürekli dinleyip sessizliği kendimiz
 * ölçüyoruz. Uzun tutulmadı — işini bitiren "Bitti"ye basabilir. Değerler
 * mobildeki pauseFor ile aynı (3 sn).
 */
const SILENCE_MS = 3000;
/**
 * Bir dinleme oturumunun üst sınırı. Kullanıcı konuşmayı bitirip susunca
 * SILENCE_MS sonra zaten durulur; bu yalnız uzun, duraksamalı cümleler için pay.
 */
const MAX_LISTEN_MS = 20_000;

const ERRORS: Record<string, string> = {
  "not-allowed": "Mikrofon izni verilmedi. Adres çubuğundaki simgeden mikrofona izin verin.",
  "service-not-allowed": "Mikrofon izni verilmedi. Adres çubuğundaki simgeden mikrofona izin verin.",
  "no-speech": "Ses algılanmadı. Tekrar deneyin.",
  "audio-capture": "Mikrofon bulunamadı.",
  // Bağlantı varken de görülür: tarayıcının ses tanıma servisine ulaşılamadı.
  network:
    "Tarayıcınızın ses tanıma servisine ulaşılamadı. Sorun sürerse Chrome, Edge veya Safari ile deneyin ya da aramanızı yazın.",
  "language-not-supported": "Tarayıcınız Türkçe ses tanımayı desteklemiyor.",
};

type Phase = "idle" | "listening" | "parsing" | "done" | "error";

interface State {
  phase: Phase;
  transcript: string;
  chips: VoiceChip[];
  error?: string;
}

const IDLE: State = { phase: "idle", transcript: "", chips: [] };

/**
 * `icon`: arama alanlarının yanındaki küçük mikrofon.
 * `cta`: ana sayfanın birincil eylemi — kitle çoğunlukla sesle arayacak ve
 * bunu ilk girişte görmeli.
 */
type Variant = "icon" | "cta";

export function VoiceSearchButton({ className, variant = "icon" }: { className?: string; variant?: Variant }) {
  const supported = useSpeechSupported(variant === "cta");
  const router = useRouter();
  const [state, setState] = useState<State>(IDLE);
  const recRef = useRef<Recognition | null>(null);
  const transcriptRef = useRef("");
  const cancelledRef = useRef(false);
  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = useCallback(() => {
    cancelledRef.current = true;
    recRef.current?.abort();
    recRef.current = null;
    if (navTimer.current) clearTimeout(navTimer.current);
    setState(IDLE);
  }, []);

  const submit = useCallback(
    async (text: string) => {
      setState((s) => ({ ...s, phase: "parsing", transcript: text }));
      let res: Awaited<ReturnType<typeof parseVoiceSearchAction>>;
      try {
        res = await parseVoiceSearchAction(text);
      } catch {
        res = { error: "Bağlantı hatası. Tekrar deneyin." };
      }
      if (cancelledRef.current) return;
      if ("error" in res) {
        setState((s) => ({ ...s, phase: "error", error: res.error }));
        return;
      }
      const { params, chips } = res.result;
      if (!Object.keys(params).length) {
        setState((s) => ({
          ...s,
          phase: "error",
          error: "Ne aradığınızı anlayamadım. Örneğin il, makine türü veya marka söyleyin.",
        }));
        return;
      }
      setState((s) => ({ ...s, phase: "done", chips }));
      // Anlaşılanı kısa bir an göster, sonra sonuçlara geç. Yeni bir arama
      // olduğu için mevcut filtreler korunmaz.
      navTimer.current = setTimeout(() => {
        router.push(`/ilanlar?${new URLSearchParams(params)}`);
        setState(IDLE);
      }, 700);
    },
    [router],
  );

  const start = useCallback(function start(isRetry = false) {
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    recRef.current?.abort();

    const rec = new Ctor();
    rec.lang = "tr-TR";
    rec.interimResults = true;
    // Sürekli: tarayıcı kısa duraksamada kesmesin; bitişi SILENCE_MS belirler.
    rec.continuous = true;
    rec.maxAlternatives = 1;

    transcriptRef.current = "";
    cancelledRef.current = false;
    let failed = false;
    let retry = false;

    // stop(): son sonucu teslim eder, ardından onend → arama.
    let silenceTimer: ReturnType<typeof setTimeout> | undefined;
    const maxTimer = setTimeout(() => rec.stop(), MAX_LISTEN_MS);

    rec.onresult = (e) => {
      const text = mergeTranscripts(Array.from(e.results, (r) => r[0].transcript));
      transcriptRef.current = text;
      setState((s) => ({ ...s, transcript: text }));
      // Her yeni kelime süreyi sıfırlar: sayaç son duyulan sesten başlar.
      clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => rec.stop(), SILENCE_MS);
    };
    rec.onerror = (e) => {
      if (e.error === "aborted") return;
      // Chrome'da servis bağlantısı ara sıra ilk denemede kopar; kullanıcıyı
      // hataya düşürmeden bir kez yeniden denenir. Ses alınmışsa denenmez.
      if (e.error === "network" && !isRetry && !transcriptRef.current) {
        retry = true;
        return;
      }
      failed = true;
      setState((s) => ({ ...s, phase: "error", error: ERRORS[e.error] ?? "Ses tanınamadı. Tekrar deneyin." }));
    };
    rec.onend = () => {
      clearTimeout(silenceTimer);
      clearTimeout(maxTimer);
      recRef.current = null;
      if (cancelledRef.current) return;
      if (retry) {
        start(true);
        return;
      }
      if (failed) return;
      const text = transcriptRef.current;
      if (text) void submit(text);
      else setState((s) => ({ ...s, phase: "error", error: ERRORS["no-speech"] }));
    };

    recRef.current = rec;
    if (!isRetry) setState({ ...IDLE, phase: "listening" });
    try {
      rec.start();
    } catch {
      clearTimeout(maxTimer);
      setState({ ...IDLE, phase: "error", error: "Ses tanıma başlatılamadı. Tekrar deneyin." });
    }
  }, [submit]);

  const open = state.phase !== "idle";

  // Esc ile kapat. Effect yalnız dinleyici bağlar; durum olay içinde değişir.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  // Bileşen kaldırılırsa mikrofonu bırak.
  useEffect(
    () => () => {
      recRef.current?.abort();
      if (navTimer.current) clearTimeout(navTimer.current);
    },
    [],
  );

  if (!supported) return null;

  const listening = state.phase === "listening";
  const toggle = () => (listening ? recRef.current?.stop() : start());

  return (
    <>
      {variant === "cta" ? (
        <button
          type="button"
          onClick={toggle}
          aria-label={listening ? "Dinlemeyi bitir" : `Sesle ara. Örneğin: ${VOICE_SEARCH_EXAMPLE}`}
          aria-pressed={listening}
          className={cn(
            "group flex items-center gap-4 rounded-xl bg-accent py-3.5 pl-3.5 pr-4 text-left text-accent-fg shadow-xl shadow-black/30 transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-base",
            className,
          )}
        >
          {/* Koyu kare içinde mikrofon + dışa atan halka. Halka yalnız dikkat
              çekmek için; "hareketi azalt" açıksa durur (motion-safe). */}
          <span className="relative grid h-13 w-13 shrink-0 place-items-center rounded-lg bg-accent-fg text-accent" aria-hidden>
            <span className="absolute inset-0 rounded-lg border-2 border-accent-fg/45 motion-safe:animate-ping" />
            <MicIcon size={26} className="relative" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-2xl font-bold uppercase leading-snug">Sesle ara</span>
            <span className="block text-sm font-medium text-accent-fg/75">“{VOICE_SEARCH_EXAMPLE}” deyin</span>
          </span>
          <ChevronRightIcon size={22} className="shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </button>
      ) : (
        <button
          type="button"
          onClick={toggle}
          aria-label={listening ? "Dinlemeyi bitir" : "Sesli arama"}
          aria-pressed={listening}
          title="Sesli arama"
          className={cn(
            "relative grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70",
            listening && "bg-accent text-accent-fg hover:bg-accent-hover hover:text-accent-fg",
            className,
          )}
        >
          {listening && <span className="absolute inset-0 animate-ping rounded-full bg-accent/40" aria-hidden />}
          <MicIcon size={18} className="relative" />
        </button>
      )}

      {/*
        Portal şart: düğme ana sayfada bir <form> içinde duruyor. Panel formun
        içinde kalırsa (1) paneldeki düğmeler formu gönderip boş aramayla
        /ilanlar'a götürür, (2) formun backdrop-blur'u fixed konumu formun
        kutusuna hapseder.
      */}
      {open &&
        createPortal(
          <div
            role="dialog"
            aria-label="Sesli arama"
            className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-xl border border-line bg-surface p-4 shadow-2xl shadow-black/40 sm:bottom-8"
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "relative grid h-10 w-10 shrink-0 place-items-center rounded-full",
                  state.phase === "error" ? "bg-surface-2 text-muted" : "bg-accent text-accent-fg",
                )}
                aria-hidden
              >
                {listening && <span className="absolute inset-0 animate-ping rounded-full bg-accent/40" />}
                <MicIcon size={18} className="relative" />
              </span>

              <div className="min-w-0 flex-1" aria-live="polite">
                <p className="text-sm font-semibold text-fg">
                  {state.phase === "listening" && "Dinliyorum…"}
                  {state.phase === "parsing" && "Anlamaya çalışıyorum…"}
                  {state.phase === "done" && "Aranıyor"}
                  {state.phase === "error" && "Olmadı"}
                </p>
                {state.transcript ? (
                  <p className="mt-1 break-words text-sm text-muted">“{state.transcript}”</p>
                ) : (
                  listening && (
                    <p className="mt-1 text-sm text-faint">Örn. “{VOICE_SEARCH_EXAMPLE}”</p>
                  )
                )}
                {state.phase === "error" && state.error && (
                  <p className="mt-2 text-sm text-danger">{state.error}</p>
                )}
                {state.phase === "done" && state.chips.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {state.chips.map((c) => (
                      <li
                        key={`${c.param}:${c.value}`}
                        className="rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-xs text-fg"
                      >
                        {c.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <button
                type="button"
                onClick={close}
                aria-label="Kapat"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-fg"
              >
                <XIcon size={16} />
              </button>
            </div>

            {listening && (
              <p className="mt-3 border-t border-line pt-2 text-xs leading-relaxed text-faint">
                Sesiniz, metne çevrilmesi için tarayıcınızın ses tanıma hizmetine iletilir (Chrome’da
                Google). Sunucumuza yalnızca metin ulaşır ve saklanmaz. Anlaşılamayan aramalar,
                yorumlanması için yapay zekâ hizmetine (Anthropic) gönderilebilir.
              </p>
            )}

            {(state.phase === "error" || listening) && (
              <div className="mt-3 flex justify-end gap-2">
                {listening ? (
                  <Button type="button" size="sm" variant="ghost" onClick={() => recRef.current?.stop()}>
                    Bitti
                  </Button>
                ) : (
                  <Button type="button" size="sm" onClick={() => start()}>
                    <MicIcon size={16} /> Tekrar dene
                  </Button>
                )}
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
