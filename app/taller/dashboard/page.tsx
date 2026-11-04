import Link from "next/link";
import type { Metadata } from "next";
import {
  ClipboardList, FileClock, Wrench, PackageCheck, Plus, AlertTriangle, MessageSquare,
  Stethoscope, Clock3, CarFront, CalendarClock, ArrowRight, CheckCircle2,
} from "lucide-react";
import { requireSession } from "@/lib/auth/session";
import { getDashboard, getWorkshop, getMaintenanceReminders, listCustomers, listOrders } from "@/lib/database/queries";
import { KpiCard, Card, CardHeader, CardBody, StatusBadge, EmptyState, Badge, Alert, SectionTitle } from "@/components/ui";
import { OrderRowCard } from "@/components/orders/OrderRowCard";
import { NotifyReminderButton } from "@/components/notifications/NotifyReminderButton";
import { BellRing } from "lucide-react";
import { WorkshopProfile } from "@/components/shared/WorkshopProfile";
import { DashboardOnboarding } from "@/components/taller/DashboardOnboarding";
import { formatCOP, formatDate, formatTimeAgo } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Panel de control" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireSession();
  const dash = getDashboard(session.workshop_id!);
  const workshop = getWorkshop(session.workshop_id!);
  const esMecanico = session.rol === "mechanic";

  // Check if workshop is new (no orders, no customers) - only for owners
  const isNewWorkshop = !esMecanico && session.rol === "owner" && dash.activas === 0 && listCustomers(session.workshop_id!).length === 0;

  return (
    <div className="space-y-6">
      {workshop && <WorkshopProfile workshop={workshop} className="mb-2" />}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            {session.workshop_nombre} · Resumen
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Panel de control
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Hola {session.nombre.split(" ")[0]} — esto es lo que está pasando hoy en el taller.
          </p>
        </div>
        {!esMecanico && (
          <div className="flex gap-2">
            <Link href="/taller/clientes?nuevo=1" className="btn-secondary">
              <Plus className="h-4 w-4" /> Cliente
            </Link>
            <Link href="/taller/ordenes/nueva" className="btn-primary">
              <Plus className="h-4 w-4" /> Recibir vehículo
            </Link>
          </div>
        )}
      </div>

      {/* Onboarding wizard for new workshops */}
      {!esMecanico && session.rol === "owner" && isNewWorkshop && (
        <DashboardOnboarding
          show={true}
          onComplete={() => {}}
        />
      )}

      {/* KPIs (Módulo 1) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Órdenes activas" value={dash.activas} icon={<ClipboardList className="h-5 w-5" />} href="/taller/ordenes?activas=1" tone="info" />
        <KpiCard label="Por aprobar" value={dash.porAprobar} icon={<FileClock className="h-5 w-5" />} href="/taller/ordenes?estado=esperando_aprobacion" tone="warning" sub="Esperando al cliente" />
        <KpiCard label="En reparación" value={dash.enReparacion} icon={<Wrench className="h-5 w-5" />} href="/taller/ordenes?estado=en_reparacion" />
        <KpiCard label="Listos para entregar" value={dash.listos} icon={<PackageCheck className="h-5 w-5" />} href="/taller/ordenes?estado=listo_entrega" tone="success" />
      </div>

      {/* Pendientes de atención (alertas) */}
      <Card>
        <CardHeader
          title="Pendientes de atención"
          subtitle="Alertas generadas por el estado real de las órdenes"
          icon={<AlertTriangle className="h-5 w-5" />}
          actions={<Badge className="border-red-200 bg-red-50 text-red-600">
            {dash.alertas.sinRespuesta.length + dash.alertas.retrasadas.length + dash.alertas.diagnosticoPendiente.length + dash.alertas.mensajesSinLeer
            } pendientes</Badge>}
        />
        <CardBody className="space-y-3">
          {dash.alertas.diagnosticoPendiente.map(({ order, vehicle }) => (
            <AlertRow key={order.id} tone="warning" icon={<Stethoscope className="h-4 w-4" />}>
              <Link href={`/taller/ordenes/${order.id}`} className="font-semibold hover:underline">
                Orden {order.numero} · {vehicle.marca} {vehicle.modelo}
              </Link>{" "}
              — falta registrar el diagnóstico (ingresó {formatTimeAgo(order.fecha_ingreso)}).
            </AlertRow>
          ))}
          {dash.alertas.sinRespuesta.map(({ row, enviadaHaceDias }) => (
            <AlertRow key={row.order.id} tone="warning" icon={<Clock3 className="h-4 w-4" />}>
              <Link href={`/taller/ordenes/${row.order.id}`} className="font-semibold hover:underline">
                Orden {row.order.numero} · {row.customer.nombre}
              </Link>{" "}
              — presupuesto pendiente de aprobación hace {enviadaHaceDias} días (cliente sin respuesta).
            </AlertRow>
          ))}
          {dash.alertas.retrasadas.map(({ row, diasRetraso }) => (
            <AlertRow key={row.order.id} tone="error" icon={<CalendarClock className="h-4 w-4" />}>
              <Link href={`/taller/ordenes/${row.order.id}`} className="font-semibold hover:underline">
                Orden {row.order.numero} · {row.vehicle.marca} {row.vehicle.modelo}
              </Link>{" "}
              — superó la fecha estimada de entrega hace {diasRetraso} día(s). Actualiza la estimación o avisa al cliente.
            </AlertRow>
          ))}
          {dash.alertas.mensajesSinLeer > 0 && (
            <AlertRow tone="info" icon={<MessageSquare className="h-4 w-4" />}>
              <Link href="/taller/mensajes" className="font-semibold hover:underline">
                {dash.alertas.mensajesSinLeer} mensaje(s) de clientes sin leer
              </Link>{" "}
              — responde desde la bandeja de mensajes.
            </AlertRow>
          )}
          {dash.alertas.sinRespuesta.length + dash.alertas.retrasadas.length + dash.alertas.diagnosticoPendiente.length + dash.alertas.mensajesSinLeer === 0 && (
            <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <CheckCircle2 className="h-4 w-4" /> Todo al día: no hay retrasos, presupuestos sin respuesta ni mensajes pendientes.
            </p>
          )}
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recibidos hoy */}
        <Card>
          <CardHeader
            title="Vehículos recibidos hoy"
            icon={<CarFront className="h-5 w-5" />}
            actions={<Link href="/taller/ordenes" className="text-sm font-medium text-brand-600 hover:underline">Ver todas →</Link>}
          />
          <CardBody className="space-y-2.5">
            {dash.recibidosHoy.length === 0 && (
              <EmptyState icon={<CarFront className="h-8 w-8" />} title="Sin recepciones hoy" description="Cuando registres un vehículo recibido aparecerá aquí." />
            )}
            {dash.recibidosHoy.map((row) => (
              <OrderRowCard key={row.order.id} row={row} compacto />
            ))}
          </CardBody>
        </Card>

        {/* Presupuestos pendientes */}
        <Card>
          <CardHeader
            title="Presupuestos pendientes de aprobación"
            icon={<FileClock className="h-5 w-5" />}
            actions={<Link href="/taller/presupuestos?pendientes=1" className="text-sm font-medium text-brand-600 hover:underline">Ver todos →</Link>}
          />
          <CardBody className="space-y-2.5">
            {dash.pendientesAprobacion.length === 0 && (
              <EmptyState icon={<CheckCircle2 className="h-8 w-8" />} title="Nada por aprobar" description="Todos los presupuestos enviados ya tienen decisión del cliente." />
            )}
            {dash.pendientesAprobacion.map((row) => (
              <OrderRowCard
                key={row.order.id}
                row={row}
                compacto
                extra={row.latestEstimate ? formatCOP(row.latestEstimate.total) : undefined}
              />
            ))}
          </CardBody>
        </Card>

        {/* Listos para entregar */}
        <Card>
          <CardHeader
            title="Listos para entregar"
            icon={<PackageCheck className="h-5 w-5" />}
            actions={<Link href="/taller/ordenes?estado=listo_entrega" className="text-sm font-medium text-brand-600 hover:underline">Ver todos →</Link>}
          />
          <CardBody className="space-y-2.5">
            {dash.listosEntrega.length === 0 && (
              <EmptyState icon={<PackageCheck className="h-8 w-8" />} title="Ningún vehículo listo" description="Aparecerán aquí cuando terminen pruebas de calidad." />
            )}
            {dash.listosEntrega.map((row) => (
              <OrderRowCard key={row.order.id} row={row} compacto />
            ))}
          </CardBody>
        </Card>

        {/* Tablero por estado */}
        <Card>
          <CardHeader title="Tablero por estado" subtitle="Toca un estado para filtrar las órdenes" icon={<ClipboardList className="h-5 w-5" />} />
          <CardBody>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(dash.porEstado) as [string, number][])
                .filter(([estado]) => estado !== "entregado" && estado !== "cancelado")
                .map(([estado, count]) => (
                  <Link
                    key={estado}
                    href={`/taller/ordenes?estado=${estado}`}
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2.5 transition-colors hover:border-brand-300 hover:bg-brand-50/50"
                  >
                    <StatusBadge estado={estado as never} />
                    <span className="text-lg font-bold text-slate-800">{count}</span>
                  </Link>
                ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {(["entregado", "cancelado"] as const).map((estado) => (
                <Link key={estado} href={`/taller/ordenes?estado=${estado}`} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 hover:bg-slate-100">
                  <StatusBadge estado={estado} />
                  <span className="text-lg font-bold text-slate-500">{dash.porEstado[estado]}</span>
                </Link>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Recordatorios automáticos de mantenimiento (retención) */}
      {!esMecanico && (() => {
        const recordatorios = getMaintenanceReminders(session.workshop_id!).slice(0, 5);
        if (recordatorios.length === 0) return null;
        return (
          <Card>
            <CardHeader
              title="Recordatorios automáticos de mantenimiento"
              subtitle="Retención: clientes cuyo último servicio fue hace 3+ meses. Avísales antes de que te olviden."
              icon={<BellRing className="h-5 w-5" />}
              actions={<Badge className="border-brand-200 bg-brand-50 text-brand-700">{recordatorios.length} candidato(s)</Badge>}
            />
            <CardBody className="space-y-2">
              {recordatorios.map((r) => {
                const reciente = r.diasDesdeRecordatorio !== null && r.diasDesdeRecordatorio < 30;
                return (
                  <div key={r.vehicle.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800">
                        {r.customer.nombre} — {r.vehicle.marca} {r.vehicle.modelo}{" "}
                        <span className="font-normal text-slate-400">({r.vehicle.placa})</span>
                      </p>
                      <p className="text-xs text-slate-500">
                        Último servicio hace <strong>{r.mesesDesdeServicio} meses</strong> ({formatDate(r.ultimaEntrega)}) · {r.vehicle.kilometraje.toLocaleString("es-CO")} km
                        {reciente && <> · <span className="font-medium text-emerald-600">avisado hace {r.diasDesdeRecordatorio} día(s)</span></>}
                      </p>
                    </div>
                    {reciente ? (
                      <span className="text-xs font-medium text-emerald-600">Avisado ✓</span>
                    ) : (
                      <NotifyReminderButton vehicleId={r.vehicle.id} />
                    )}
                  </div>
                );
              })}
              <p className="text-[11px] text-slate-400">
                El aviso llega al cliente por su portal y por correo (simulado): “Tu {`{vehículo}`} necesita mantenimiento”.
                No se repite antes de 30 días por vehículo.
              </p>
            </CardBody>
          </Card>
        );
      })()}

      <p className="text-center text-xs text-slate-400">
        Las fechas de entrega del panel son <strong>estimaciones</strong>, no promesas. Actualízalas cuando cambien las condiciones.
      </p>
    </div>
  );
}

function AlertRow({ tone, icon, children }: { tone: "warning" | "error" | "info"; icon: React.ReactNode; children: React.ReactNode }) {
  const tones = {
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    error: "border-red-200 bg-red-50 text-red-800",
    info: "border-sky-200 bg-sky-50 text-sky-900",
  };
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${tones[tone]}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <p className="leading-snug">{children}</p>
      <ArrowRight className="ml-auto mt-0.5 h-4 w-4 shrink-0 opacity-40" />
    </div>
  );
}
