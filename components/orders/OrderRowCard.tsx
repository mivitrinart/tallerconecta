import Link from "next/link";
import { MessageSquare, UserRound, ChevronRight } from "lucide-react";
import type { OrderRow } from "@/lib/database/queries";
import { StatusBadge, Avatar } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

/** Fila/tarjeta compacta de orden, usada en listas y dashboard. */
export function OrderRowCard({ row, compacto, extra }: { row: OrderRow; compacto?: boolean; extra?: string }) {
  const { order, customer, vehicle, responsable, unreadFromCustomer, latestEstimate } = row;
  return (
    <Link
      href={`/taller/ordenes/${order.id}`}
      className={cn(
        "flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 transition-colors hover:border-brand-300 hover:bg-brand-50/40",
        compacto ? "py-2.5" : "py-3.5"
      )}
    >
      <Avatar nombre={customer.nombre} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">
          {order.numero} · {vehicle.marca} {vehicle.modelo}
          <span className="ml-1.5 font-normal text-slate-400">{vehicle.placa}</span>
        </p>
        <p className="truncate text-xs text-slate-500">
          {customer.nombre}
          {order.fecha_estimada_entrega && (
            <> · Entrega estimada: {formatDate(order.fecha_estimada_entrega)}</>
          )}
          {extra && <> · {extra}</>}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {latestEstimate?.pendiente_aprobacion && (
          <span className="hidden rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 sm:inline">
            Esperando cliente
          </span>
        )}
        {responsable && (
          <span title={`Responsable: ${responsable.nombre}`} className="hidden text-slate-300 sm:block">
            <UserRound className="h-4 w-4" />
          </span>
        )}
        {unreadFromCustomer > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white" title="Mensajes sin leer del cliente">
            <MessageSquare className="h-3 w-3" /> {unreadFromCustomer}
          </span>
        )}
        <StatusBadge estado={order.estado} />
        <ChevronRight className="h-4 w-4 text-slate-300" />
      </div>
    </Link>
  );
}
