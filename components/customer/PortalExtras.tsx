"use client";
/** Portal del cliente: calificación del servicio y marcado de lecturas. */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { Button, Alert, Stars } from "@/components/ui";
import { api } from "@/lib/api-client";

export function PortalRatingForm({ orderId, token }: { orderId: string; token: string }) {
  const router = useRouter();
  const [valor, setValor] = useState(0);
  const [comentario, setComentario] = useState("");
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 px-4 py-4">
      <p className="flex items-center gap-2 text-sm font-bold text-amber-800">
        <Star className="h-4 w-4" /> ¿Cómo calificarías el servicio?
      </p>
      <div className="mt-2 flex items-center gap-3">
        <Stars value={valor} size={30} onChange={setValor} />
        <span className="text-xs text-amber-600">{valor ? `${valor}/5` : "Toca las estrellas"}</span>
      </div>
      <textarea
        className="input mt-3"
        rows={2}
        placeholder="Cuéntanos tu experiencia (opcional)"
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
      />
      {msg && <Alert tone={msg.tone} className="mt-3">{msg.text}</Alert>}
      <Button
        className="mt-3 w-full"
        disabled={!valor || loading}
        loading={loading}
        onClick={async () => {
          setLoading(true);
          try {
            await api.post("/api/portal/calificar", { token, order_id: orderId, calificacion: valor, comentario });
            setMsg({ tone: "success", text: "¡Gracias por tu calificación!" });
            router.refresh();
          } catch (e) {
            setMsg({ tone: "error", text: e instanceof Error ? e.message : "No se pudo guardar." });
          } finally {
            setLoading(false);
          }
        }}
      >
        Enviar calificación
      </Button>
    </div>
  );
}

/** Marca las notificaciones del portal como leídas al cargar (una sola vez). */
export function PortalReadMarker({ token }: { token: string }) {
  useEffect(() => {
    api.post("/api/portal/leer", { token }).catch(() => {});
  }, [token]);
  return null;
}
