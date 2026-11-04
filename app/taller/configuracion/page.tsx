import type { Metadata } from "next";
import { Settings, Users, Mail, Smartphone, ShieldCheck, MessageCircle, Link2, User } from "lucide-react";
import { requireSession } from "@/lib/auth/session";
import { query } from "@/lib/database/index";
import { initStore } from "@/lib/api/init-store";
import { getWorkshop, listMembers, getOutbox, listCustomers, listAuditLogs } from "@/lib/database/queries";
import { caducarSuscripcionesVencidas } from "@/lib/orders/workflows";
import { Card, CardHeader, CardBody, Tabs, Badge, EmptyState } from "@/components/ui";
import { WorkshopProfileForm, TeamManager, OwnerProfileForm } from "@/components/shared/SettingsComponents";
import { CopyBox } from "@/components/customers/CustomerForms";
import { RegenerarEnlaceButton } from "@/components/customers/RegenerarEnlaceButton";
import { formatDateTime } from "@/lib/format";
import { puede, ROL_LABEL } from "@/lib/permissions";

export const metadata: Metadata = { title: "Configuración" };
export const dynamic = "force-dynamic";

const CANAL_ICONO: Record<string, string> = { email: "✉️", whatsapp: "💬" };

export default async function ConfiguracionPage({ searchParams: searchParamsP }: { searchParams: Promise<{ tab?: string }> }) {
  const searchParams = await searchParamsP;
  const session = await requireSession();
  if (!puede(session.rol, "settings.manage")) {
    return <EmptyState title="Vista no disponible para tu rol" description="Solo el propietario del taller puede acceder a la configuración." />;
  }

  // Inicializar el store de D1 para leer de la base de datos real
  // (sin esto, los server components leen del demo-store y no encuentran el taller en producción)
  await initStore();

  // Sincronizar planes vencidos antes de renderizar (caduca pruebas de 7 días -> starter)
  caducarSuscripcionesVencidas();

  const workshop = getWorkshop(session.workshop_id!);
  if (!workshop) {
    return <EmptyState title="Taller no encontrado" description="No se encontró el taller asociado a tu cuenta." />;
  }

  const subscription = query((db) => db.subscriptions.find((s) => s.workshop_id === workshop.id && (s.estado === "activa" || s.estado === "en_prueba")) ?? null);
  const members = listMembers(session.workshop_id!);
  const owner = members.find((m) => m.member.rol === "owner");
  const outbox = getOutbox(session.workshop_id!);
  const customers = listCustomers(session.workshop_id!);
  const audit = listAuditLogs(session.workshop_id!, 30);

  const tabs = [
    {
      id: "datos",
      label: <span key="datos" className="flex items-center gap-1.5"><Settings className="h-4 w-4" /> Datos del taller</span>,
      content: (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader title="Información del negocio" icon={<Settings className="h-5 w-5" />} />
            <CardBody>
              <WorkshopProfileForm workshop={workshop} />
            </CardBody>
          </Card>
          {owner && (
            <Card>
              <CardHeader title="Perfil del propietario" icon={<User className="h-5 w-5" />} />
              <CardBody>
                <OwnerProfileForm user={owner.user} />
              </CardBody>
            </Card>
          )}
          <Card>
            <CardHeader title="Plan y estado" icon={<ShieldCheck className="h-5 w-5" />} />
            <CardBody className="space-y-3 text-sm">
              <p className="flex items-center justify-between">
                <span className="text-slate-500">Plan actual</span>
                <Badge className="border-brand-200 bg-brand-50 font-bold capitalize text-brand-700">{workshop.plan ?? "starter"}</Badge>
              </p>
              <p className="flex items-center justify-between">
                <span className="text-slate-500">Estado de la cuenta</span>
                <Badge className={workshop.estado === "activo" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}>
                  {workshop.estado === "activo" ? "Activa" : workshop.estado === "en_prueba" ? `En prueba gratis · ${Math.max(0, Math.ceil((new Date(subscription?.fin ?? 0).getTime() - Date.now()) / 86_400_000))} días restantes` : "Suspendida"}
                </Badge>
              </p>
              <p className="flex items-center justify-between">
                <span className="text-slate-500">NIT</span>
                <span className="font-medium">{workshop.nit ?? "—"}</span>
              </p>
              <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
                Los cambios de plan y facturación los gestiona el administrador de la plataforma. En esta demo,
                entra como <strong>admin@tallerconecta.co</strong> para ver el panel del SaaS.
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Enlace público de vinculación" icon={<Link2 className="h-5 w-5" />} />
            <CardBody>
              <p className="text-sm text-slate-600">
                Comparte este enlace con tus clientes para que puedan solicitar vinculación de su cuenta a tu
                taller desde su panel de cliente ("Talleres registrados").
              </p>
              {workshop.enlace_publico ? (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3">
                  <CopyBox label="" value={`/taller-conectar/${workshop.enlace_publico}`} />
                </div>
              ) : (
                <p className="mt-3 text-xs text-slate-400">Este taller no tiene enlace público configurado.</p>
              )}
            </CardBody>
          </Card>
        </div>
      ),
    },
    {
      id: "equipo",
      label: <span key="equipo" className="flex items-center gap-1.5"><Users className="h-4 w-4" /> Equipo ({members.length})</span>,
      content: (
        <Card>
          <CardHeader
            title="Miembros del taller"
            subtitle="Propietario, asesores de servicio y mecánicos — cada rol con sus permisos"
            icon={<Users className="h-5 w-5" />}
          />
          <CardBody>
            <TeamManager members={members} />
            <div className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
              <p className="font-semibold text-slate-600">Permisos por rol</p>
              <ul className="mt-1.5 list-inside list-disc space-y-1">
                <li><strong>{ROL_LABEL.owner}</strong>: configura el negocio, gestiona empleados, clientes y órdenes.</li>
                <li><strong>{ROL_LABEL.advisor}</strong>: recibe vehículos, registra diagnósticos, elabora presupuestos y responde consultas.</li>
                <li><strong>{ROL_LABEL.mechanic}</strong>: consulta trabajos asignados, actualiza avances y carga evidencias.</li>
              </ul>
            </div>
          </CardBody>
        </Card>
      ),
    },
    {
      id: "comunicaciones",
      label: <span key="comunicaciones" className="flex items-center gap-1.5"><Mail className="h-4 w-4" /> Comunicaciones</span>,
      content: (
        <Card>
          <CardHeader
            title="Bandeja de salida (simulada)"
            subtitle="Correos transaccionales y WhatsApp que el sistema generaría con los cambios reales de estado"
            icon={<MessageCircle className="h-5 w-5" />}
          />
          <CardBody>
            {outbox.length === 0 ? (
              <EmptyState icon={<Mail className="h-8 w-8" />} title="Sin comunicaciones todavía" description="Cuando registres recepciones, diagnósticos o presupuestos aparecerán aquí los avisos generados." />
            ) : (
              <div className="space-y-2">
                {outbox.map((nt) => {
                  const customer = customers.find((c) => c.customer.id === nt.destinatario_id)?.customer;
                  return (
                    <div key={nt.id} className="flex items-start gap-3 rounded-xl border border-slate-200 px-4 py-3">
                      <span className="text-lg">{CANAL_ICONO[nt.canal] ?? "🔔"}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800">{nt.titulo}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{nt.cuerpo}</p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          Para: {customer ? `${customer.nombre} <${customer.correo}>` : nt.destinatario_id} · {formatDateTime(nt.created_at)} ·{" "}
                          <Badge className={nt.canal === "whatsapp" ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-sky-200 bg-sky-50 text-sky-600"}>
                            {nt.canal === "whatsapp" ? "WhatsApp (fase 2)" : "Correo"} · {nt.estado}
                          </Badge>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="mt-4 text-xs text-slate-400">
              Regla fundamental: ninguna notificación afirma algo que el taller no haya actualizado. Las fechas
              estimadas siempre se identifican como estimaciones. WhatsApp Business Platform se integrará de
              forma oficial cuando el MVP esté validado.
            </p>
          </CardBody>
        </Card>
      ),
    },
    {
      id: "portales",
      label: <span key="portales" className="flex items-center gap-1.5"><Smartphone className="h-4 w-4" /> Portales de clientes</span>,
      content: (
        <Card>
          <CardHeader
            title="Enlaces personales de seguimiento"
            subtitle="Cada cliente accede a su portal con un enlace privado (sin contraseña)"
            icon={<Smartphone className="h-5 w-5" />}
          />
          <CardBody className="space-y-4">
            {customers.map(({ customer, ordenesActivas }) => (
              <div key={customer.id} className="rounded-xl border border-slate-200 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">
                    {customer.nombre}
                    {ordenesActivas > 0 && <Badge className="ml-2 border-blue-200 bg-blue-50 text-blue-600">{ordenesActivas} activa(s)</Badge>}
                    {customer.portal_activo === false && (
                      <Badge className="ml-2 border-amber-300 bg-amber-50 text-amber-700">Enlace anulado · cliente desvinculó</Badge>
                    )}
                  </p>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{customer.telefono}</span>
                    {customer.portal_activo === false && <RegenerarEnlaceButton customerId={customer.id} compacto />}
                  </span>
                </div>
                <div className="mt-2">
                  <CopyBox label="" value={`/seguimiento/${customer.portal_token ?? ""}`} />
                  {customer.portal_activo === false && (
                    <p className="mt-1.5 text-[11px] text-amber-600">
                      El cliente desvinculó su ficha: el enlace que se le compartió quedó <strong>anulado
                      permanentemente</strong> (por privacidad no puede volver a usarse). Genera un enlace nuevo y
                      compártelo. La ficha y su historial se conservan.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      ),
    },
    {
      id: "auditoria",
      label: <span key="auditoria" className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> Auditoría</span>,
      content: (
        <Card>
          <CardHeader title="Registro de auditoría" subtitle="Mensajes, cambios de estado y autorizaciones conservan su historial" icon={<ShieldCheck className="h-5 w-5" />} />
          <CardBody>
            {audit.length === 0 ? (
              <EmptyState title="Sin registros" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px]">
                  <thead className="border-b border-slate-100">
                    <tr><th className="th">Fecha</th><th className="th">Actor</th><th className="th">Acción</th><th className="th">Entidad</th></tr>
                  </thead>
                  <tbody>
                    {audit.map((a) => (
                      <tr key={a.id} className="border-b border-slate-50 last:border-0">
                        <td className="td whitespace-nowrap text-xs text-slate-400">{formatDateTime(a.created_at)}</td>
                        <td className="td font-medium">{a.actor_nombre}</td>
                        <td className="td"><code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">{a.accion}</code></td>
                        <td className="td text-xs text-slate-400">{a.entidad}{a.detalle ? ` · ${JSON.stringify(a.detalle)}`.slice(0, 90) : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Configuración</h1>
        <p className="mt-1 text-sm text-slate-500">{workshop.nombre} · {workshop.ciudad}</p>
      </div>
      <Tabs tabs={tabs} initial={searchParams.tab ?? "datos"} />
    </div>
  );
}
