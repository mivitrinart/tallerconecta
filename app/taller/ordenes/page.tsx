import Link from "next/link";
import type { Metadata } from "next";
import { Plus, Search, ClipboardList } from "lucide-react";
import { requireSession } from "@/lib/auth/session";
import { listOrders } from "@/lib/database/queries";
import { EmptyState, Badge } from "@/components/ui";
import { OrderRowCard } from "@/components/orders/OrderRowCard";
import { ESTADO_LABEL, ESTADOS_ORDEN } from "@/lib/orders/state-machine";
import type { EstadoOrden } from "@/lib/database/types";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Órdenes de servicio" };
export const dynamic = "force-dynamic";

export default async function OrdenesPage({
  searchParams: searchParamsP,
}: {
  searchParams: Promise<{ estado?: string; q?: string; activas?: string; asignadas?: string }>;
}) {
  const searchParams = await searchParamsP;
  const session = await requireSession();
  const esMecanico = session.rol === "mechanic";

  const estado = ESTADOS_ORDEN.includes(searchParams.estado as EstadoOrden)
    ? (searchParams.estado as EstadoOrden)
    : undefined;

  const rows = listOrders(session.workshop_id!, {
    estados: estado ? [estado] : undefined,
    q: searchParams.q,
    soloActivas: searchParams.activas === "1" ? true : undefined,
    // El mecánico consulta sus trabajos asignados
    responsableId: esMecanico || searchParams.asignadas === "1" ? session.user_id : undefined,
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            {esMecanico ? "Mis trabajos asignados" : "Órdenes de servicio"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {rows.length} orden(es) {estado ? `en estado "${ESTADO_LABEL[estado]}"` : searchParams.activas ? "activas" : "en total"}
            {searchParams.q ? ` · búsqueda: “${searchParams.q}”` : ""}
          </p>
        </div>
        {!esMecanico && (
          <Link href="/taller/ordenes/nueva" className="btn-primary">
            <Plus className="h-4 w-4" /> Recibir vehículo
          </Link>
        )}
      </div>

      {/* Búsqueda + filtros por estado */}
      <div className="card space-y-3 p-4">
        <form className="relative" action="/taller/ordenes" method="GET">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            className="input pl-9!"
            name="q"
            defaultValue={searchParams.q ?? ""}
            placeholder="Buscar por número de orden, nombre del cliente o placa… (Módulo 2)"
          />
          {estado && <input type="hidden" name="estado" value={estado} />}
        </form>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip href={searchParams.q ? `/taller/ordenes?q=${encodeURIComponent(searchParams.q)}` : "/taller/ordenes"} activo={!estado && !searchParams.activas}>
            Todas
          </FilterChip>
          <FilterChip href={`/taller/ordenes?activas=1${searchParams.q ? `&q=${encodeURIComponent(searchParams.q)}` : ""}`} activo={!estado && searchParams.activas === "1"}>
            Activas
          </FilterChip>
          {ESTADOS_ORDEN.map((e) => (
            <FilterChip key={e} href={`/taller/ordenes?estado=${e}${searchParams.q ? `&q=${encodeURIComponent(searchParams.q)}` : ""}`} activo={estado === e}>
              {ESTADO_LABEL[e]}
            </FilterChip>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-10 w-10" />}
          title="No hay órdenes con estos filtros"
          description={esMecanico ? "Cuando el asesor te asigne trabajos aparecerán aquí." : "Recibe un vehículo para crear la primera orden de servicio."}
          action={!esMecanico ? <Link href="/taller/ordenes/nueva" className="btn-primary"><Plus className="h-4 w-4" /> Recibir vehículo</Link> : undefined}
        />
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <OrderRowCard key={row.order.id} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({ href, activo, children }: { href: string; activo: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        activo ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700"
      )}
    >
      {children}
    </Link>
  );
}
