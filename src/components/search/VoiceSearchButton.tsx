"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { parseVoiceSearchAction } from "@/lib/actions/voice-search";
import type { VoiceChip } from "@/lib/core/voice-search/types";
import { Button } from "@/components/ui/Button";
import { MicIcon, XIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

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

/** Sunucuda false; istemcide tarayıcı desteğine göre (hydration güvenli). */
function useSpeechSupported(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => recognitionCtor() !== undefined,
    () => false,
  );
}

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

export function VoiceSearchButton({ className }: { className?: string }) {
  const supported = useSpeechSupported();
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
    rec.continuous = false;
    rec.maxAlternatives = 1;

    transcriptRef.current = "";
    cancelledRef.current = false;
    let failed = false;
    let retry = false;

    rec.onresult = (e) => {
      const results = Array.from(e.results);
      const text = results.map((r) => r[0].transcript).join(" ").replace(/\s+/g, " ").trim();
      transcriptRef.current = text;
      setState((s) => ({ ...s, transcript: text }));
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

  return (
    <>
      <button
        type="button"
        onClick={() => (listening ? recRef.current?.stop() : start())}
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
                    <p className="mt-1 text-sm text-faint">Örn. “İstanbul’da operatörlü JCB kepçe”</p>
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
