"use client";
/**
 * Asignación de órdenes desde la página Equipo:
 * el propietario ve la carga de trabajo de cada miembro y le asigna órdenes
 * directamente (el miembro recibe notificación y la orden queda marcada).
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ClipboardList, UserPlus2 } from "lucide-react";
import { Button, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api-client";
import type { EstadoOrden } from "@/lib/database/types";

export interface OrdenAsignada {
  id: string;
  numero: string;
  vehiculo: string;
  estado: EstadoOrden;
}

export interface OrdenAsignable {
  id: string;
  numero: string;
  vehiculo: string;
  cliente: string;
  responsableNombre: string | null;
}

export function MemberAssignments({
  userId,
  assigned,
  assignable,
}: {
  userId: string;
  assigned: OrdenAsignada[];
  assignable: OrdenAsignable[];
}) {
  const router = useRouter();
  const [sel, setSel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function asignar() {
    if (!sel) return;
    setLoading(true);
    setError(null);
    setOk(null);
    try {
      await api.post(`/api/ordenes/${sel}/asignar`, { responsable_id: userId });
      const orden = assignable.find((o) => o.id === sel);
      setOk(`${orden?.numero ?? "Orden"} asignada ✓ (se le notificó)`);
      setSel("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo asignar.");
    } finally {
      setLoading(false);
    }
  }

  // Sin asignar primero (son la prioridad de reparto)
  const opciones = [...assignable].sort((a, b) =>
    (a.responsableNombre ? 1 : 0) - (b.responsableNombre ? 1 : 0)
  );

  return (
    <div className="space-y-2.5">
      {/* Trabajos activos del miembro */}
      {assigned.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {assigned.map((o) => (
            <Link
              key={o.id}
              href={`/taller/ordenes/${o.id}`}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-brand-300 hover:text-brand-700"
              title={`Abrir ${o.numero}`}
            >
              <ClipboardList className="h-3.5 w-3.5 text-slate-400" />
              {o.numero} · {o.vehiculo}
              <StatusBadge estado={o.estado} />
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400">Sin trabajos activos asignados.</p>
      )}

      {/* Asignar una orden */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="input !w-auto min-w-[16rem] flex-1 text-xs"
          value={sel}
          onChange={(e) => setSel(e.target.value)}
        >
          <option value="">Asignar orden activa…</option>
          {opciones.map((o) => (
            <option key={o.id} value={o.id}>
              {o.numero} · {o.vehiculo} — {o.cliente}
              {o.responsableNombre ? ` (actual: ${o.responsableNombre})` : " (sin asignar)"}
            </option>
          ))}
        </select>
        <Button size="sm" variant="secondary" onClick={asignar} disabled={!sel || loading} loading={loading}>
          <UserPlus2 className="h-3.5 w-3.5" /> Asignar
        </Button>
      </div>
      {ok && <p className="text-xs font-semibold text-emerald-600">{ok}</p>}
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
