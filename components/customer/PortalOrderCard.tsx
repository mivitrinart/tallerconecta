"use client";

import {
  Wrench, Camera, Stethoscope, CalendarClock,
  ShieldCheck, PhoneCall,
} from "lucide-react";
import { StatusBadge, Card, CardHeader, CardBody, Badge, EstimateStatusBadge, Stars } from "@/components/ui";
import { StatusTimeline } from "@/components/orders/StatusTimeline";
import { PortalApprovalPanel } from "@/components/customer/PortalApprovalPanel";
import { PortalRatingForm } from "@/components/customer/PortalExtras";
import { PortalEventFeed } from "@/components/customer/PortalEventFeed";
import { WhatsappSummaryButton } from "@/components/customer/WhatsappSummaryButton";
import { SignaturePad } from "@/components/customer/SignaturePad";
import { formatTimeAgo } from "@/lib/format";
import type { PortalOrder } from "@/lib/database/queries";
import { formatCOP, formatDate, formatDateTime } from "@/lib/format";
import { mediaSrc } from "@/lib/media";

const CATEGORIA_LABEL: Record<string, string> = { antes: "Antes", durante: "Durante", despues: "Después", documento: "Documento", otro: "Otro" };

/**
 * Ventana de seguimiento de una orden (Módulo 5).
 * Componente de servidor compartido por:
 *  · /seguimiento/[token] — enlace personal
 *  · /cuenta              — cuenta del cliente (misma vista + perfil)
 */
export function PortalOrderCard({
  po,
  token,
  tallerTelefono,
  compacto,
}: {
  po: PortalOrder;
  token: string;
  tallerTelefono: string;
  compacto?: boolean;
}) {
  const { order, vehicle, diagnostics, estimates, media, events, messages } = po;
  const vigente = estimates[0] ?? null;
  const requiereDecision = vigente?.estimate.estado === "enviada";
  const ultimaAprobada = estimates.find((e) => e.authorization && e.authorization.decision !== "rechazada");

  return (
    <section className={!compacto ? "space-y-4" : "space-y-4 pt-2"}>
      {!compacto && (
        <Card>
          <CardHeader
            title={`Orden ${order.numero} · ${vehicle.marca} ${vehicle.modelo}`}
            subtitle={`Placa ${vehicle.placa} · Ingreso ${formatDate(order.fecha_ingreso)}`}
            icon={<Wrench className="h-5 w-5" />}
            actions={<StatusBadge estado={order.estado} />}
          />
          <CardBody className="space-y-4">
            <AhoraMismo orden={po} />
            <StatusTimeline estado={order.estado} events={events} />
            <WhatsappSummaryButton orderId={order.id} token={token} />
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p className="flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-slate-600">
                <CalendarClock className="h-4 w-4 shrink-0 text-brand-500" />
                {order.fecha_entrega ? (
                  <>Entregado: <strong className="ml-1">{formatDate(order.fecha_entrega)}</strong></>
                ) : order.fecha_estimada_entrega ? (
                  <>Entrega <strong className="mx-1">estimada</strong>: {formatDate(order.fecha_estimada_entrega)}</>
                ) : (
                  <>Entrega estimada: por confirmar</>
                )}
              </p>
              <p className="flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-slate-600">
                <PhoneCall className="h-4 w-4 shrink-0 text-brand-500" />
                ¿Preguntas? <a className="ml-1 font-semibold text-brand-600 hover:underline" href={`tel:${tallerTelefono.replace(/\s/g, "")}`}>{tallerTelefono}</a>
              </p>
            </div>
            <p className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm">
              <strong className="text-slate-600">Motivo de ingreso:</strong> {order.motivo_ingreso}
              {order.sintomas ? ` · Síntomas: ${order.sintomas}` : ""}
            </p>
            {order.calificacion && (
              <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5">
                <span className="text-xs font-bold uppercase tracking-wide text-amber-700">Tu calificación</span>
                <Stars value={order.calificacion} size={14} />
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Línea de tiempo tipo Rappi: hora + fotos de cada paso */}
      {!compacto && <PortalEventFeed events={events} media={media} />}

      {/* Diagnóstico */}
      {diagnostics.length > 0 && (
        <Card>
          <CardHeader title="Diagnóstico del taller" icon={<Stethoscope className="h-5 w-5" />} subtitle={formatDateTime(diagnostics[0].created_at)} />
          <CardBody className="space-y-3 text-sm">
            <p className="whitespace-pre-wrap text-slate-600">{diagnostics[0].descripcion}</p>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Recomendaciones</p>
              <p className="mt-1 whitespace-pre-wrap text-emerald-900">{diagnostics[0].recomendaciones}</p>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Presupuesto pendiente de decisión */}
      {requiereDecision && vigente && (
        <PortalApprovalPanel
          estimateId={vigente.estimate.id}
          version={vigente.estimate.version}
          items={vigente.items}
          token={token}
          subtotal={vigente.estimate.subtotal}
          descuento={vigente.estimate.descuento}
          impuestoPct={vigente.estimate.impuesto_porcentaje}
          impuestos={vigente.estimate.impuestos}
          total={vigente.estimate.total}
          validezDias={vigente.estimate.validez_dias}
        />
      )}

      {/* Última decisión registrada — inmutable: versión, usuario, fecha y resultado */}
      {!requiereDecision && ultimaAprobada && (
        <Card>
          <CardHeader
            title={`Presupuesto v${ultimaAprobada.estimate.version} · decisión registrada`}
            icon={<ShieldCheck className="h-5 w-5" />}
            actions={<EstimateStatusBadge estado={ultimaAprobada.estimate.estado} />}
          />
          <CardBody>
            <div className="space-y-1.5 text-sm">
              {ultimaAprobada.items.map((i) => (
                <div key={i.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  <span className="min-w-0 truncate text-slate-700">{i.descripcion}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="tabular-nums text-slate-500">{formatCOP(i.subtotal)}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {ultimaAprobada.authorization?.items_con_alternativa?.includes(i.id) && (
                        <Badge className="border-brand-200 bg-brand-50 text-brand-600">⇄ Elegiste homologado</Badge>
                      )}
                      {i.estado === "postergada" && <Badge className="border-sky-200 bg-sky-50 text-sky-600">Aplazado</Badge>}
                      <Badge className={i.estado === "aprobada" ? "border-emerald-200 bg-emerald-50 text-emerald-600" : i.estado === "rechazada" ? "border-red-200 bg-red-50 text-red-500" : "border-slate-200 bg-white text-slate-400"}>
                        {i.estado === "aprobada" ? "Aprobado" : i.estado === "rechazada" ? "Rechazado" : i.estado === "postergada" ? "Después" : "Pendiente"}
                      </Badge>
                    </span>
                  </span>
                </div>
              ))}
            </div>
            {ultimaAprobada.authorization && (
              <p className="mt-3 text-xs text-slate-400">
                Decidiste el {formatDateTime(ultimaAprobada.authorization.created_at)} · Monto autorizado:{" "}
                <strong className="text-emerald-600">{formatCOP(ultimaAprobada.authorization.monto_aprobado)}</strong> · Versión v{ultimaAprobada.authorization.version_aceptada}
                <span className="block">Este registro no puede modificarse: cualquier cambio genera una versión nueva que debes aprobar de nuevo.</span>
              </p>
            )}
            {order.valor_final !== null && order.valor_final !== undefined && (
              <p className="mt-1 text-sm font-bold text-slate-800">Valor final del servicio: {formatCOP(order.valor_final)}</p>
            )}
          </CardBody>
        </Card>
      )}

      {/* Evidencias fotográficas (acceso restringido en el servidor) */}
      {media.length > 0 && (
        <Card>
          <CardHeader title={`Evidencias fotográficas (${media.length})`} icon={<Camera className="h-5 w-5" />} subtitle="Fotos reales del proceso publicadas por el taller" />
          <CardBody>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {media.map((m) => (
                <figure key={m.id} className="overflow-hidden rounded-xl border border-slate-200">
                  {m.url.startsWith("data:video") ? (
                    <video src={mediaSrc(m, { token })} controls className="aspect-[4/3] w-full bg-black object-cover" title={m.nombre} />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaSrc(m, { token })} alt={m.nombre} className="aspect-[4/3] w-full object-cover" />
                  )}
                  <figcaption className="bg-white px-2.5 py-2">
                    <p className="text-[11px] font-bold text-slate-600">{CATEGORIA_LABEL[m.categoria] ?? m.categoria}</p>
                    <p className="truncate text-[11px] text-slate-400">{m.nombre}</p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Entrega: firma digital de conformidad + fotos de salida + calificación */}
      {order.estado === "entregado" &&
        !media.some((m) => m.nombre.startsWith("Firma de conformidad")) && (
          <SignaturePad orderId={order.id} token={token} />
        )}
      {order.estado === "entregado" && !order.calificacion && (
        <PortalRatingForm orderId={order.id} token={token} />
      )}

    </section>
  );
}


const AHORA: Record<string, (resp: string | null) => string> = {
  recibido: () => "Recibimos tu vehículo en el taller",
  en_diagnostico: (r) => `${r ?? "El equipo"} está diagnosticando tu vehículo`,
  esperando_aprobacion: () => "Estamos esperando tu aprobación del presupuesto",
  autorizado: () => "Trabajo autorizado: empezamos pronto",
  en_reparacion: (r) => `${r ?? "Tu mecánico"} está reparando tu vehículo`,
  en_espera: () => "En pausa: falta un repuesto o una respuesta",
  en_pruebas: () => "Estamos verificando todo con pruebas de calidad",
  listo_entrega: () => "¡Listo para recoger!",
  entregado: () => "Servicio entregado. ¡Gracias por confiar en el taller!",
  cancelado: () => "Orden cancelada",
};

function AhoraMismo({ orden }: { orden: PortalOrder }) {
  const { order, responsableNombre } = orden;
  const frase = (AHORA[order.estado] ?? (() => ""))(responsableNombre ? responsableNombre.split(" ")[0] : null);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-500/30 bg-brand-600 px-4 py-3 text-white">
      <p className="text-sm font-bold">
        <span className="mr-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        Ahora mismo: {frase}
      </p>
      <p className="text-[11px] text-slate-300">
        Actualizado {formatTimeAgo(order.updated_at)}
        {order.fecha_estimada_entrega && !order.fecha_entrega && (
          <> · Entrega estimada: {new Date(order.fecha_estimada_entrega).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })} (se mueve si el taller la actualiza)</>
        )}
      </p>
    </div>
  );
}
