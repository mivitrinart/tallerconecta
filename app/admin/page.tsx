import type { Metadata } from "next";
import { Wrench, Users, ClipboardList, BadgeDollarSign, CalendarClock, ShieldCheck, Building2 } from "lucide-react";
import { getAdminOverview, listAdminWorkshops } from "@/lib/database/queries";
import { KpiCard, Card, CardHeader, CardBody, Badge, EmptyState } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Panel de administración" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const overview = getAdminOverview();
  const workshops = listAdminWorkshops().slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Taller Conecta · SaaS</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Panel de administración</h1>
        <p className="mt-1 text-sm text-slate-500">Gestión de talleres registrados, suscripciones y soporte.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Talleres registrados" value={overview.talleres} icon={<Wrench className="h-5 w-5" />} tone="info" sub={`${overview.talleresActivos} activos`} />
        <KpiCard label="Usuarios" value={overview.usuarios} icon={<Users className="h-5 w-5" />} />
        <KpiCard label="Órdenes (plataforma)" value={overview.ordenesTotales} icon={<ClipboardList className="h-5 w-5" />} sub={`${overview.ordenesHoy} creadas hoy`} />
        <KpiCard label="Suscripciones activas" value={overview.suscripcionesActivas} icon={<BadgeDollarSign className="h-5 w-5" />} tone="success" sub={`${overview.pruebasPorVencer} prueba(s) por vencer`} />
      </div>

      {overview.pruebasPorVencer > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          <CalendarClock className="h-5 w-5 shrink-0" />
          <p>
            <strong>{overview.pruebasPorVencer}</strong> suscripción(es) en prueba vencen en menos de 7 días.
            Revisa la página de <strong>Suscripciones</strong> para gestionar la conversión a pago.
          </p>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Talleres recientes" icon={<Building2 className="h-5 w-5" />} />
          <CardBody>
            {workshops.length === 0 ? (
              <EmptyState title="Sin talleres registrados" />
            ) : (
              <div className="space-y-2">
                {workshops.map(({ workshop, members, orders, subscription }) => (
                  <div key={workshop.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800">{workshop.nombre}</p>
                      <p className="text-xs text-slate-400">
                        {workshop.ciudad} · {members} miembro(s) · {orders} orden(es) · registrada {formatDateTime(workshop.created_at)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge className="border-brand-200 bg-brand-50 capitalize text-brand-700">{workshop.plan}</Badge>
                      <Badge className={
                        subscription?.estado === "activa" ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                        : subscription?.estado === "en_prueba" ? "border-amber-200 bg-amber-50 text-amber-600"
                        : "border-slate-200 bg-slate-50 text-slate-400"
                      }>
                        {subscription?.estado ?? "sin suscripción"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Actividad reciente (auditoría global)" icon={<ShieldCheck className="h-5 w-5" />} />
          <CardBody>
            {overview.ultimosAudit.length === 0 ? (
              <EmptyState title="Sin actividad" />
            ) : (
              <ol className="space-y-2.5">
                {overview.ultimosAudit.map((a) => (
                  <li key={a.id} className="flex items-start gap-2.5 text-sm">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-400" />
                    <div>
                      <p className="text-slate-700">
                        <strong>{a.actor_nombre}</strong>{" "}
                        <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-500">{a.accion}</code>{" "}
                        <span className="text-xs text-slate-400">→ {a.entidad}</span>
                      </p>
                      <p className="text-xs text-slate-400">{formatDateTime(a.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
