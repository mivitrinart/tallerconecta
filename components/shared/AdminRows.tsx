"use client";
/** Fila de gestión de taller en el panel de administración (SaaS). */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import type { EstadoTaller, PlanSaaS, Subscription, User, Workshop } from "@/lib/database/types";
import { Badge } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

export function AdminWorkshopRow({
  workshop,
  members,
  customers,
  orders,
  ordersToday,
  subscription,
  owner,
}: {
  workshop: Workshop;
  members: number;
  customers: number;
  orders: number;
  ordersToday: number;
  subscription: Subscription | null;
  owner: User | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function patch(body: { estado?: EstadoTaller; plan?: PlanSaaS }) {
    setLoading(true);
    try {
      await api.patch(`/api/admin/talleres/${workshop.id}`, body);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <tr className="border-b border-slate-50 last:border-0">
      <td className="td">
        <p className="font-bold text-slate-800">{workshop.nombre}</p>
        <p className="text-xs text-slate-400">
          {workshop.ciudad} · {workshop.telefono}
          {workshop.nit && <> · NIT {workshop.nit}</>}
        </p>
      </td>
      <td className="td text-xs text-slate-500">
        {owner ? (
          <>
            <p className="font-medium text-slate-700">{owner.nombre}</p>
            <p>{owner.correo}</p>
          </>
        ) : "—"}
      </td>
      <td className="td text-center text-xs tabular-nums">
        {members} / {customers} / {orders}
        {ordersToday > 0 && <span className="ml-1 text-emerald-600">(+{ordersToday} hoy)</span>}
      </td>
      <td className="td">
        <select
          className="input w-auto! py-1! text-xs"
          value={workshop.plan}
          disabled={loading}
          onChange={(e) => patch({ plan: e.target.value as PlanSaaS })}
        >
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="premium">Premium</option>
        </select>
        {subscription && (
          <p className="mt-1 text-[11px] text-slate-400">
            Suscripción {subscription.estado} · vence {formatDateTime(subscription.fin).split(",")[0]}
          </p>
        )}
      </td>
      <td className="td">
        <select
          className="input w-auto! py-1! text-xs"
          value={workshop.estado}
          disabled={loading}
          onChange={(e) => patch({ estado: e.target.value as EstadoTaller })}
        >
          <option value="activo">Activo</option>
          <option value="en_prueba">En prueba</option>
          <option value="suspendido">Suspendido</option>
        </select>
      </td>
      <td className="td pr-4!">
        <Badge className={
          workshop.estado === "activo" ? "border-emerald-200 bg-emerald-50 text-emerald-600"
          : workshop.estado === "en_prueba" ? "border-amber-200 bg-amber-50 text-amber-600"
          : "border-red-200 bg-red-50 text-red-600"
        }>
          {workshop.estado.replace("_", " ")}
        </Badge>
      </td>
    </tr>
  );
}
