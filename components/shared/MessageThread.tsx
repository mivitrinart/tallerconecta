"use client";
/**
 * Canal de comunicación orden ↔ cliente (Módulos 5 y 6).
 * Un mismo componente para el panel del taller y el portal del cliente.
 * Mensajes cifrados end-to-end con AES-GCM (descifrado en servidor).
 */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Button } from "@/components/ui";
import { DictationButton } from "@/components/shared/DictationButton";
import { api } from "@/lib/api-client";
import { formatTimeAgo } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Message } from "@/lib/database/types";

export function MessageThread({
  orderId,
  messages,
  viewer,
  token,
  tituloOcupado = "Escribe tu respuesta…",
}: {
  orderId: string;
  messages: Pick<Message, "id" | "remitente_tipo" | "remitente_nombre" | "contenido" | "created_at">[];
  viewer: "staff" | "customer";
  token?: string;
  tituloOcupado?: string;
}) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const marcadoRef = useRef(false);
  const routerReadyRef = useRef(false);

  // Marcar como leído al abrir el hilo + sondeo suave de novedades
  useEffect(() => {
    routerReadyRef.current = true;
    if (!marcadoRef.current) {
      marcadoRef.current = true;
      const url = viewer === "staff" ? `/api/ordenes/${orderId}/leer` : "/api/portal/leer";
      const body = viewer === "staff" ? {} : { token, order_id: orderId };
      api.post(url, body).then(() => {
        if (routerReadyRef.current) router.refresh();
      }).catch(() => {});
    }
    const t = setInterval(() => {
      if (document.visibilityState === "visible" && routerReadyRef.current) router.refresh();
    }, 20_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, viewer, token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    setLoading(true);
    setError(null);
    try {
      if (viewer === "staff") {
        await api.post(`/api/ordenes/${orderId}/messages`, { contenido: texto });
      } else {
        await api.post("/api/portal/mensajes", { token, order_id: orderId, contenido: texto });
      }
      setTexto("");
      if (routerReadyRef.current) router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el mensaje.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white">
      <div className="max-h-[26rem] min-h-[10rem] flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">
            Aún no hay mensajes. {viewer === "customer" ? "Escribe tu primera pregunta al taller." : "Responde aquí las consultas del cliente."}
          </p>
        )}
        {messages.map((m) => {
          const mio =
            (viewer === "staff" && m.remitente_tipo === "staff") ||
            (viewer === "customer" && m.remitente_tipo === "customer");
          return (
            <div key={m.id} className={cn("flex", mio ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm sm:max-w-[70%]",
                  mio ? "rounded-br-md bg-brand-600 text-white" : "rounded-bl-md bg-slate-100 text-slate-800"
                )}
              >
                <p className={cn("text-[11px] font-bold", mio ? "text-brand-100" : "text-slate-400")}>
                  {m.remitente_tipo === "customer" ? m.remitente_nombre : `${m.remitente_nombre} · Taller`}
                </p>
                <p className="mt-0.5 whitespace-pre-wrap break-words">{m.contenido}</p>
                <p className={cn("mt-1 text-right text-[10px]", mio ? "text-brand-200" : "text-slate-400")}>
                  {formatTimeAgo(m.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={enviar} className="border-t border-slate-100 p-3">
        <div className="mb-2 flex justify-end">
          <DictationButton onText={(t) => setTexto((prev) => (prev ? `${prev} ${t}` : t))} />
        </div>
        <div className="flex items-end gap-2">
        <textarea
          className="input max-h-28 min-h-[2.6rem] flex-1 resize-y"
          rows={1}
          placeholder={tituloOcupado}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              enviar(e);
            }
          }}
        />
        <Button type="submit" loading={loading} disabled={!texto.trim() || loading} className="shrink-0">
          <Send className="h-4 w-4" /> Enviar
        </Button>
        </div>
      </form>
      {error && <p className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs font-medium text-red-600">{error}</p>}
      <p className="border-t border-slate-100 px-4 py-2 text-center text-[11px] text-slate-400">
        Los mensajes quedan registrados en el historial de la orden para auditoría.
      </p>
    </div>
  );
}
