"use client";
/**
 * Semáforo de criticidad de un ítem del presupuesto.
 * editable=true (solo borradores): tres chips para clasificar el trabajo.
 * editable=false: badge de solo lectura (lo enviado/aprobado no se modifica).
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui";
import { api } from "@/lib/api-client";
import type { Criticidad } from "@/lib/database/types";
import { CRITICIDAD_BADGE, CRITICIDAD_LABEL, CRITICIDAD_PUNTO } from "@/components/customer/PortalApprovalPanel";
import { cn } from "@/lib/cn";

export function CriticidadControl({
  estimateId,
  itemId,
  value,
  editable,
}: {
  estimateId: string;
  itemId: string;
  value: Criticidad;
  editable: boolean;
}) {
  const router = useRouter();
  const [guardando, setGuardando] = useState<Criticidad | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!editable) {
    return (
      <Badge className={CRITICIDAD_BADGE[value]}>
        {CRITICIDAD_PUNTO[value]} {CRITICIDAD_LABEL[value]}
      </Badge>
    );
  }

  async function cambiar(c: Criticidad) {
    if (c === value || guardando) return;
    setGuardando(c);
    setError(null);
    try {
      await api.patch(`/api/presupuestos/${estimateId}/items/${itemId}`, { criticidad: c });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setGuardando(null);
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1" title="Semáforo: el cliente entiende por qué pagar">
      {(["urgente", "recomendado", "puede_esperar"] as Criticidad[]).map((c) => (
        <button
          key={c}
          type="button"
          disabled={guardando !== null}
          onClick={() => cambiar(c)}
          className={cn(
            "badge cursor-pointer transition-all disabled:opacity-60",
            CRITICIDAD_BADGE[c],
            value === c ? "ring-2 ring-brand-400" : "opacity-45 hover:opacity-90"
          )}
        >
          {CRITICIDAD_PUNTO[c]} {CRITICIDAD_LABEL[c]}
          {guardando === c && " …"}
        </button>
      ))}
      {error && <span className="text-[11px] font-medium text-red-600">{error}</span>}
    </span>
  );
}

/** Resumen compacto 🟢2 🟡1 🔴1 para listas de presupuestos. */
export function CriticidadResumen({ counts }: { counts: Record<Criticidad, number> }) {
  return (
    <span className="flex items-center gap-1.5 text-xs" title="Semáforo del presupuesto: urgente / recomendado / puede esperar">
      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700">🟢 {counts.urgente}</span>
      <span className="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-700">🟡 {counts.recomendado}</span>
      <span className="rounded-full border border-red-200 bg-red-50 px-1.5 py-0.5 font-semibold text-red-600">🔴 {counts.puede_esperar}</span>
    </span>
  );
}
