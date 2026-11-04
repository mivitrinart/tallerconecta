import { Check, CircleDashed, X as XIcon } from "lucide-react";
import type { EstadoOrden, OrderEvent } from "@/lib/database/types";
import { ESTADO_LABEL, FLUJO_PRINCIPAL } from "@/lib/orders/state-machine";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * Línea de tiempo visual del flujo principal.
 * Para el cliente muestra dónde va su vehículo; para el taller, el progreso.
 */
export function StatusTimeline({
  estado,
  events,
  compacto,
}: {
  estado: EstadoOrden;
  events?: OrderEvent[];
  compacto?: boolean;
}) {
  if (estado === "cancelado") {
    const evt = events?.filter((e) => e.estado_nuevo === "cancelado").at(-1);
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
        <p className="flex items-center gap-2 text-sm font-bold text-red-700">
          <XIcon className="h-4 w-4" /> Orden cancelada
        </p>
        {evt && (
          <p className="mt-1 text-xs text-red-600">
            {evt.descripcion} · {formatDateTime(evt.created_at)} · {evt.actor_nombre}
          </p>
        )}
      </div>
    );
  }

  const idxActual = FLUJO_PRINCIPAL.indexOf(estado);
  // Estados fuera de la ruta feliz (en_espera) se marcan en el paso más cercano
  const idxEfectivo = idxActual >= 0 ? idxActual : estado === "en_espera" ? FLUJO_PRINCIPAL.indexOf("en_reparacion") : 0;

  return (
    <div className={cn("w-full", compacto ? "px-1" : "px-2 py-2")}>
      <ol className="flex items-start">
        {FLUJO_PRINCIPAL.map((paso, i) => {
          const hecho = i < idxEfectivo;
          const actual = i === idxEfectivo;
          return (
            <li key={paso} className="relative flex-1">
              {i > 0 && (
                <span
                  className={cn(
                    "absolute -left-1/2 top-3.5 h-0.5 w-full",
                    hecho || actual ? "bg-brand-500" : "bg-slate-200"
                  )}
                  style={{ zIndex: 0 }}
                />
              )}
              <div className="relative z-10 flex flex-col items-center gap-1.5">
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full border-2 text-[11px] font-bold",
                    hecho
                      ? "border-brand-500 bg-brand-500 text-white"
                      : actual
                        ? "border-brand-600 bg-white text-brand-600 ring-4 ring-brand-100"
                        : "border-slate-200 bg-white text-slate-300"
                  )}
                >
                  {hecho ? <Check className="h-3.5 w-3.5" /> : actual ? <CircleDashed className="h-3.5 w-3.5 animate-pulse" /> : i + 1}
                </span>
                {!compacto && (
                  <span className={cn("text-center text-[11px] font-medium leading-tight", actual ? "text-brand-700" : hecho ? "text-slate-500" : "text-slate-300")}>
                    {ESTADO_LABEL[paso]}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {estado === "en_espera" && !compacto && (
        <p className="mt-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-center text-xs font-medium text-orange-700">
          En espera: falta un repuesto, una respuesta u otro recurso
        </p>
      )}
    </div>
  );
}
