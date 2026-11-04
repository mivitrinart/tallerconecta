"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft, Car, User, CalendarClock, Gauge, Wrench, History, Camera,
  MessageSquare, Stethoscope, FileText, Eye, EyeOff, MapPin, AlertTriangle, ClipboardList,
} from "lucide-react";
import {
  Card, CardHeader, CardBody, Tabs, StatusBadge, Alert, Badge, EmptyState, Stars, SectionTitle,
} from "@/components/ui";
import { StatusControl } from "@/components/orders/StatusControl";
import { StatusTimeline } from "@/components/orders/StatusTimeline";
import { DiagnosticPanel } from "@/components/orders/DiagnosticPanel";
import { EstimatePanel } from "@/components/estimates/EstimatePanel";
import { EvidenceUpload } from "@/components/orders/EvidenceUpload";
import { MessageThread } from "@/components/shared/MessageThread";
import { AssignControl, NotesControl, DeliverControl, RatingView } from "@/components/orders/OrderControls";
import { formatCOP, formatDateTime, formatDate, formatKm } from "@/lib/format";
import { mediaSrc } from "@/lib/media";
import { puede, AVANCES_MECANICO } from "@/lib/permissions";
import type { EstadoOrden } from "@/lib/database/types";
import type { OrderEvent } from "@/lib/database/types";
import type { OrderMedia } from "@/lib/database/types";
import type { ServiceOrder, Customer, Vehicle, User as UserType, Estimate } from "@/lib/database/types";

const CATEGORIA_LABEL: Record<string, string> = {
  antes: "Antes", durante: "Durante", despues: "Después", documento: "Documento", otro: "Otro",
};

const EVENTO_ICONO: Record<string, string> = {
  creacion: "🚗", cambio_estado: "🔄", diagnostico: "🩺", presupuesto: "📄",
  autorizacion: "✅", evidencia: "📷", mensaje: "💬", nota: "📝", entrega: "🔑",
};

interface OptimisticMedia {
  id: string;
  categoria: string;
  nombre: string;
  url: string;
  visible_cliente: boolean;
  created_at: string;
  autor_nombre: string;
  pending: boolean;
}

interface OrderDetailClientProps {
  order: ServiceOrder;
  customer: Customer;
  vehicle: Vehicle;
  responsable: UserType | null;
  latestEstimate: (Estimate & { pendiente_aprobacion: boolean }) | null;
  detail: {
    diagnostics: any[];
    estimates: any[];
    media: OrderMedia[];
    events: OrderEvent[];
    messages: any[];
    unreadFromCustomer: number;
  };
  esMecanico: boolean;
  session: any;
  pendientes: boolean | undefined;
  puedeEstados: boolean;
  puedeGestionar: boolean;
  puedeEditar: boolean;
  montoAutorizado: number;
  staff: UserType[];
  initialTab: string | undefined;
}

export function OrderDetailClient({
  order,
  customer,
  vehicle,
  responsable,
  latestEstimate,
  detail,
  esMecanico,
  session,
  pendientes,
  puedeEstados,
  puedeGestionar,
  puedeEditar,
  montoAutorizado,
staff,
    initialTab,
  }: OrderDetailClientProps) {
  // Optimistic media state
  const [optimisticMedia, setOptimisticMedia] = useState<OptimisticMedia[]>([]);

  const handleMediaAdded = (media: OptimisticMedia) => {
    setOptimisticMedia((prev) => [...prev, media]);
  };

  // Combine server media with optimistic media
  const allMedia = [
    ...detail.media.map((m) => ({ ...m, pending: false })),
    ...optimisticMedia,
  ];

  const resumen = (
    <div className="space-y-4">
      {pendientes && (
        <Alert tone="warning" title="Presupuesto esperando decisión del cliente">
          No es posible iniciar la reparación de los trabajos pendientes de autorización. Cuando el cliente
          decida, la orden pasará a "Autorizado".
        </Alert>
      )}
      {order.estado === "en_espera" && (
        <Alert tone="warning" title="Orden en espera">Falta un repuesto, una respuesta u otro recurso. El cliente ya fue notificado.</Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Información del servicio" icon={<ClipboardList className="h-5 w-5" />} />
          <CardBody>
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <Info icon={<User className="h-4 w-4" />} label="Cliente">
                <Link href={`/taller/clientes/${customer.id}`} className="font-semibold text-brand-700 hover:underline">{customer.nombre}</Link>
                <span className="block text-xs text-slate-400">{customer.telefono} · {customer.correo}</span>
              </Info>
              <Info icon={<Car className="h-4 w-4" />} label="Vehículo">
                <span className="font-semibold">{vehicle.marca} {vehicle.modelo} ({vehicle.anio})</span>
                <span className="block text-xs text-slate-400">Placa {vehicle.placa} · {vehicle.tipo === "moto" ? "Moto" : "Carro"}{vehicle.color ? ` · ${vehicle.color}` : ""}</span>
              </Info>
              <Info icon={<Gauge className="h-4 w-4" />} label="Kilometraje de ingreso">
                <span className="font-semibold">{formatKm(vehicle.kilometraje)}</span>
              </Info>
              <Info icon={<CalendarClock className="h-4 w-4" />} label="Ingreso / Entrega estimada">
                <span className="font-semibold">{formatDate(order.fecha_ingreso)}</span>
                <span className="block text-xs text-slate-400">
                  {order.fecha_estimada_entrega ? `Estimada: ${formatDate(order.fecha_estimada_entrega)} (estimación, no promesa)` : "Sin fecha estimada"}
                </span>
              </Info>
              <div className="sm:col-span-2">
                <Info icon={<Wrench className="h-4 w-4" />} label="Motivo de ingreso">
                  <span className="font-semibold">{order.motivo_ingreso}</span>
                  {order.sintomas && <span className="block text-xs text-slate-500">Síntomas: {order.sintomas}</span>}
                </Info>
              </div>
              {order.valor_final !== null && (
                <Info icon={<FileText className="h-4 w-4" />} label="Valor final">
                  <span className="font-extrabold text-emerald-600">{formatCOP(order.valor_final)}</span>
                </Info>
              )}
              {order.fecha_entrega && (
                <Info icon={<MapPin className="h-4 w-4" />} label="Entregado">
                  <span className="font-semibold">{formatDateTime(order.fecha_entrega)}</span>
                </Info>
              )}
            </dl>

            {order.calificacion && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Calificación del cliente</p>
                <div className="mt-1"><Stars value={order.calificacion} /></div>
                {order.calificacion_comentario && <p className="mt-1 text-sm italic text-amber-900">"{order.calificacion_comentario}"</p>}
              </div>
            )}
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Estado de la orden" icon={<History className="h-5 w-5" />} />
            <CardBody className="space-y-4">
              {puedeEstados ? (
                <StatusControl
                  orderId={order.id}
                  estado={order.estado}
                  puedeCancelar={!esMecanico}
                  permitidos={esMecanico ? (AVANCES_MECANICO[order.estado] as EstadoOrden[] | undefined) : undefined}
                />
              ) : (
                <StatusBadge estado={order.estado} />
              )}
              <StatusTimeline estado={order.estado} events={detail.events} />
            </CardBody>
          </Card>

          {(puedeEditar || order.estado === "listo_entrega" || order.estado === "entregado") && (
            <Card>
              <CardHeader title="Gestión" icon={<Wrench className="h-5 w-5" />} />
              <CardBody className="space-y-4">
                {order.estado === "entregado" ? (
                  <RatingView valor={order.calificacion} comentario={order.calificacion_comentario} />
                ) : (
                  <DeliverControl orderId={order.id} order={order} montoSugerido={montoAutorizado} />
                )}
                {puedeEditar && <AssignControl orderId={order.id} staff={staff} actual={order.responsable_id} />}
                {puedeEditar && <NotesControl orderId={order.id} order={order} />}
                {puedeEditar && responsable && (
                  <p className="text-xs text-slate-400">Responsable actual: <strong>{responsable.nombre}</strong></p>
                )}
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );

  const evidencias = (
    <div className="space-y-4">
      {puede(session.rol, "media.upload") && <EvidenceUpload orderId={order.id} onMediaAdded={handleMediaAdded} />}
      {allMedia.length === 0 ? (
        <EmptyState icon={<Camera className="h-10 w-10" />} title="Sin evidencias todavía" description="Carga fotos del antes, durante y después. El cliente las verá en su portal (si las marcas como visibles)." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {allMedia.map((m) => (
            <figure key={m.id} className="card overflow-hidden relative">
              {m.url.startsWith("data:video") ? (
                <video src={mediaSrc(m)} controls className="aspect-[4/3] w-full bg-black object-cover" title={m.nombre} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaSrc(m)} alt={m.nombre} className="aspect-[4/3] w-full object-cover" />
              )}
              {m.pending && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-700">
                    <span className="h-4 w-4 animate-spin border-2 border-brand-600 border-t-transparent rounded-full" />
                    Subiendo…
                  </div>
                </div>
              )}
              <figcaption className="space-y-1 p-3">
                <p className="flex items-center justify-between gap-1 text-xs font-bold text-slate-700">
                  {CATEGORIA_LABEL[m.categoria] ?? m.categoria}
                  {m.visible_cliente ? (
                    <Badge className="border-emerald-200 bg-emerald-50 text-emerald-600"><Eye className="h-3 w-3" /> Cliente</Badge>
                  ) : (
                    <Badge className="border-slate-200 bg-slate-50 text-slate-400"><EyeOff className="h-3 w-3" /> Interna</Badge>
                  )}
                </p>
                <p className="truncate text-xs text-slate-500" title={m.nombre}>{m.nombre}</p>
                <p className="text-[11px] text-slate-400">{m.autor_nombre} · {formatDate(m.created_at)}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );

  const historial = (
    <Card>
      <CardHeader title="Historial de la orden" subtitle="Cambios de estado, decisiones y evidencias — conservado para auditoría" icon={<History className="h-5 w-5" />} />
      <CardBody>
        <ol className="relative space-y-4 border-l-2 border-slate-100 pl-6">
          {detail.events.map((ev: OrderEvent) => (
            <li key={ev.id} className="relative">
              <span className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[10px]">
                {EVENTO_ICONO[ev.tipo] ?? "•"}
              </span>
              <p className="text-sm font-medium text-slate-700">{ev.descripcion}</p>
              <p className="mt-0.5 text-xs text-slate-400">
                {formatDateTime(ev.created_at)} · {ev.actor_nombre}
                {ev.estado_nuevo && <> · <StatusBadge estado={ev.estado_nuevo} /></>}
              </p>
            </li>
          ))}
        </ol>
      </CardBody>
    </Card>
  );

  const tabs = [
    { id: "resumen", label: <span className="flex items-center gap-1.5"><ClipboardList className="h-4 w-4" /> Resumen</span>, content: resumen },
    { id: "diagnostico", label: <span className="flex items-center gap-1.5"><Stethoscope className="h-4 w-4" /> Diagnóstico</span>, content: <DiagnosticPanel orderId={order.id} diagnostics={detail.diagnostics} puedeEscribir={puede(session.rol, "diagnostics.write")} /> },
    ...(esMecanico
      ? []
      : [{ id: "presupuesto", label: <span className="flex items-center gap-1.5"><FileText className="h-4 w-4" /> Presupuestos {detail.estimates.length > 0 && <span className="text-xs text-slate-400">({detail.estimates.length})</span>}</span>, content: <EstimatePanel orderId={order.id} orderEstado={order.estado} estimates={detail.estimates} puedeGestionar={puedeGestionar} /> }]),
    { id: "evidencias", label: <span className="flex items-center gap-1.5"><Camera className="h-4 w-4" /> Evidencias {allMedia.length > 0 && <span className="text-xs text-slate-400">({allMedia.length})</span>}</span>, content: evidencias },
    {
      id: "mensajes",
      label: <span className="flex items-center gap-1.5"><MessageSquare className="h-4 w-4" /> Mensajes</span>,
      badge: detail.unreadFromCustomer,
      content: (
        <MessageThread
          orderId={order.id}
          messages={detail.messages}
          viewer="staff"
          tituloOcupado="Escribe una respuesta para el cliente…"
        />
      ),
    },
    { id: "historial", label: <span className="flex items-center gap-1.5"><History className="h-4 w-4" /> Historial</span>, content: historial },
  ];

  return (
    <div className="space-y-5">
      <div>
        <Link href="/taller/ordenes" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-brand-600">
          <ArrowLeft className="h-4 w-4" /> Órdenes
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex flex-wrap items-center gap-3 text-2xl font-extrabold tracking-tight text-slate-900">
              Orden {order.numero}
              <StatusBadge estado={order.estado} />
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {vehicle.marca} {vehicle.modelo} · {vehicle.placa} — {customer.nombre}
            </p>
          </div>
          <Link href={`/seguimiento/${customer.portal_token}`} target="_blank" className="btn-secondary text-xs">
            <Eye className="h-3.5 w-3.5" /> Ver portal del cliente
          </Link>
        </div>
      </div>

      <Tabs tabs={tabs} initial={initialTab} />
    </div>
  );
}

function Info({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">
        <span className="text-slate-300">{icon}</span> {label}
      </dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}