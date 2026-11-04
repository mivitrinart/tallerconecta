"use client";

import { Clock3 } from "lucide-react";
import type { OrderEvent, OrderMedia } from "@/lib/database/types";
import { formatDateTime, formatTimeAgo } from "@/lib/format";

const ICONO: Record<string, string> = {
  creacion: "🚗",
  cambio_estado: "🔄",
  diagnostico: "🩺",
  presupuesto: "📄",
  autorizacion: "✅",
  evidencia: "📷",
  mensaje: "💬",
  nota: "📝",
  entrega: "🔑",
};

/** Fotos de la etapa según el evento (checklist visual antes/durante/después). */
const FOTOS_ETAPA: Record<string, OrderMedia["categoria"]> = {
  creacion: "antes",
  diagnostico: "antes",
};

/**
 * Línea de tiempo tipo Rappi/Uber: cada paso real del taller con su hora y,
 * donde aplica, las fotos de la etapa. Solo eventos registrados de verdad
 * (una notificación nunca afirma algo que el taller no actualizó).
 */
export function PortalEventFeed({ events, media }: { events: OrderEvent[]; media: OrderMedia[] }) {
  const relevantes = events
    .filter((e) => ["creacion", "cambio_estado", "diagnostico", "presupuesto", "autorizacion", "entrega"].includes(e.tipo))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 10);

  const fotosPara = (ev: OrderEvent): OrderMedia[] => {
    const cat =
      FOTOS_ETAPA[ev.tipo] ??
      (ev.estado_nuevo === "en_reparacion" || ev.estado_nuevo === "en_espera" ? "durante" : undefined) ??
      (ev.estado_nuevo === "listo_entrega" || ev.tipo === "entrega" ? "despues" : undefined);
    if (!cat) return [];
    return media.filter((m) => m.categoria === cat).slice(0, 2);
  };

  if (relevantes.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
        <Clock3 className="h-4 w-4 text-brand-600" /> Paso a paso (con hora y fotos)
      </p>
      <ol className="relative space-y-4 border-l-2 border-slate-100 pl-5">
        {relevantes.map((ev, i) => {
          const fotos = fotosPara(ev);
          return (
            <li key={ev.id} className="relative">
              <span
                className={`absolute -left-[27px] flex h-5 w-5 items-center justify-center rounded-full border-2 border-white text-[10px] ${
                  i === 0 ? "bg-brand-100 ring-2 ring-brand-200" : "bg-slate-100"
                }`}
              >
                {ICONO[ev.tipo] ?? "•"}
              </span>
              <p className={`text-sm leading-snug ${i === 0 ? "font-semibold text-slate-900" : "text-slate-600"}`}>
                {ev.descripcion}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {formatDateTime(ev.created_at)} · {formatTimeAgo(ev.created_at)} · {ev.actor_nombre}
              </p>
              {fotos.length > 0 && (
                <div className="mt-1.5 flex gap-2">
                  {fotos.map((m) =>
                    m.url.startsWith("data:video") ? (
                      <video key={m.id} src={m.url} controls className="h-16 w-24 rounded-lg border border-slate-200 object-cover" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={m.id} src={m.url} alt={m.nombre} className="h-16 w-24 rounded-lg border border-slate-200 object-cover" />
                    )
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
