"use client";
/**
 * Voz a texto para el mecánico (y el cliente): "Cambié pastillas, estaban
 * gastadas" → se transcribe y se añade al mensaje o al diagnóstico.
 * Usa la Web Speech API del navegador; si no está soportada, se oculta.
 */
import { useEffect, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/cn";

export function DictationButton({
  onText,
  className,
}: {
  /** Recibe el texto transcrito para añadirlo al campo destino. */
  onText: (texto: string) => void;
  className?: string;
}) {
  const [soporte, setSoporte] = useState<boolean | null>(null);
  const [escuchando, setEscuchando] = useState(false);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    setSoporte(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  if (soporte === null) return null;
  if (!soporte) {
    return (
      <span
        className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] text-slate-300"
        title="Tu navegador no soporta dictado por voz (funciona en Chrome y Edge)"
      >
        <MicOff className="h-3.5 w-3.5" /> Voz no disponible
      </span>
    );
  }

  function iniciar() {
    const w = window as unknown as Record<string, new () => SpeechRecognitionLike>;
    const Rec = w.SpeechRecognition || w.webkitSpeechRecognition;
    const rec = new Rec();
    rec.lang = "es-CO";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (ev: SpeechResultEvent) => {
      const texto = ev.results[0]?.[0]?.transcript;
      if (texto) onText(texto);
    };
    rec.onend = () => setEscuchando(false);
    rec.onerror = () => setEscuchando(false);
    try {
      rec.start();
      setEscuchando(true);
    } catch {
      setEscuchando(false);
    }
  }

  return (
    <button
      type="button"
      onClick={iniciar}
      disabled={escuchando}
      title="Dictar por voz (se transcribe en español)"
      className={cn(
        "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
        escuchando
          ? "animate-pulse border-red-300 bg-red-50 text-red-600"
          : "border-slate-200 text-slate-500 hover:border-brand-300 hover:text-brand-600",
        className
      )}
    >
      <Mic className="h-3.5 w-3.5" />
      {escuchando ? "Escuchando… habla ahora" : "Dictar por voz"}
    </button>
  );
}

// Tipos mínimos de la Web Speech API (no están en lib.dom de todos los entornos)
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((ev: SpeechResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
}
interface SpeechResultEvent {
  results: { 0: { 0: { transcript: string } } };
}
