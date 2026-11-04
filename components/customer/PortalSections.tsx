"use client";

import { Wrench, Bell, ShieldCheck, ChevronDown } from "lucide-react";
import Link from "next/link";
import { Card, CardHeader, CardBody, Badge, EmptyState } from "@/components/ui";
import { PortalOrderCard } from "@/components/customer/PortalOrderCard";
import { formatTimeAgo } from "@/lib/format";
import { esEstadoActivo } from "@/lib/orders/helpers";
import type { Notification, Workshop } from "@/lib/database/types";
import type { PortalOrder } from "@/lib/database/queries";

/**
 * Secciones compartidas de la ventana de seguimiento.
 * Las usan /seguimiento/[token] y /cuenta (misma vista para el cliente).
 */

export function PortalNotifications({ notificaciones }: { notificaciones: Notification[] }) {
  if (notificaciones.length === 0) return null;
  const noLeidas = notificaciones.filter((nt) => nt.estado === "pendiente").length;
  return (
    <Card className="panel">
      <CardHeader
        title="Avisos recientes"
        subtitle="Generados solo cuando el taller actualiza tu servicio"
        icon={<Bell className="h-5 w-5 text-brand-600" />}
        actions={noLeidas > 0 ? <Badge className="border-red-200 bg-red-50 text-red-600">{noLeidas} nuevo(s)</Badge> : undefined}
      />
      <CardBody className="space-y-2">
        {notificaciones.slice(0, 5).map((nt) => (
          <div key={nt.id} className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm ${nt.estado === "pendiente" ? "border-brand-200 bg-brand-50/60" : "border-slate-100 bg-slate-50"}`}>
            <span className="mt-0.5 text-base">
              {nt.tipo === "vehiculo_listo" ? "🔑" : nt.tipo === "presupuesto_pendiente" ? "📄" : nt.tipo === "mensaje_nuevo" ? "💬" : "🔔"}
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-slate-800">{nt.titulo}</p>
              <p className="text-xs text-slate-500">{nt.cuerpo}</p>
              <p className="mt-0.5 text-[11px] text-slate-400">{formatTimeAgo(nt.created_at)}</p>
            </div>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}

export function PortalOrders({
  ordenes,
  token,
  workshop,
}: {
  ordenes: PortalOrder[];
  token: string;
  workshop: Workshop;
}) {
  const activas = ordenes.filter((o) => esEstadoActivo(o.order.estado));
  const historicas = ordenes.filter((o) => !esEstadoActivo(o.order.estado));

  return (
    <>
      {ordenes.length === 0 && (
        <EmptyState
          icon={<Wrench className="h-10 w-10 text-brand-600" />}
          title="Aún no tienes servicios en este taller"
          description={`Cuando ${workshop.nombre} reciba tu vehículo, aquí verás el estado, las fotos y los presupuestos para aprobar.`}
        />
      )}

      <div className="space-y-4">
        {activas.map((po) => (
          <PortalOrderCard key={po.order.id} po={po} token={token} tallerTelefono={workshop.telefono} />
        ))}

        {historicas.length > 0 && (
          <Card className="panel">
            <CardHeader title="Historial de servicios" subtitle={`${historicas.length} servicio(s) anterior(es)`} icon={<ShieldCheck className="h-5 w-5 text-emerald-600" />} />
            <CardBody className="space-y-2">
              {historicas.map((po) => (
                <details key={po.order.id} className="group rounded-xl border border-slate-200">
                  <summary className="flex cursor-pointer items-center justify-between gap-2 px-4 py-3 text-sm">
                    <span className="font-semibold text-slate-700">
                      {po.order.numero} · {po.vehicle.marca} {po.vehicle.modelo} ({po.vehicle.placa})
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="hidden text-xs text-slate-400 sm:inline">
                        {po.order.estado === "entregado" ? "Entregado" : "Cancelado"}
                      </span>
                      <ChevronDown className="h-4 w-4 text-slate-300 transition-transform group-open:rotate-180" />
                    </span>
                  </summary>
                  <div className="px-4 pb-4">
                    <PortalOrderCard po={po} token={token} tallerTelefono={workshop.telefono} compacto />
                  </div>
                </details>
              ))}
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}

export function PortalLegalFooter({ workshop }: { workshop: Workshop }) {
  return (
    <>
      <p className="pt-4 text-center text-xs leading-relaxed text-slate-400">
        Las fechas de entrega mostradas son <strong>estimaciones</strong>, no promesas: el taller las actualiza
        si cambian las condiciones. ¿Dudas urgentes? Llama o escribe a {workshop.nombre}:{" "}
        <a className="text-brand-600 hover:underline font-medium" href={`tel:${workshop.telefono.replace(/\s/g, "")}`}>
          {workshop.telefono}
        </a>
        .
        <br />
        Tus datos se tratan conforme a la{" "}
        <Link href="/legal/privacidad" className="underline hover:text-brand-600">Política de Tratamiento de Datos</Link>{" "}
        (Ley 1581 de 2012) y los{" "}
        <Link href="/legal/terminos" className="underline hover:text-brand-600">Términos de uso</Link>.
        <br />
        <span className="opacity-70">Demostración con datos ficticios · Taller Conecta MVP</span>
      </p>
    </>
  );
}
