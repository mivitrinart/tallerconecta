import type { Metadata } from "next";
import Link from "next/link";
import { UserCog, Users, ClipboardCheck } from "lucide-react";
import { requireSession } from "@/lib/auth/session";
import { listMembers, listOrders } from "@/lib/database/queries";
import { Card, CardHeader, CardBody, EmptyState, Avatar, Badge } from "@/components/ui";
import { TeamManager } from "@/components/shared/SettingsComponents";
import { MemberAssignments } from "@/components/shared/MemberAssignments";
import { puede, ROL_LABEL } from "@/lib/permissions";

export const metadata: Metadata = { title: "Equipo" };
export const dynamic = "force-dynamic";

/**
 * Equipo del taller: el propietario añade mecánicos y asesores y les crea la
 * cuenta con credenciales listas — ellos entran sin registrarse.
 */
export default async function EquipoPage() {
  const session = await requireSession();
  if (!puede(session.rol, "members.manage")) {
    return (
      <EmptyState
        icon={<UserCog className="h-10 w-10" />}
        title="Vista no disponible para tu rol"
        description="Solo el propietario del taller puede añadir miembros y gestionar sus credenciales."
      />
    );
  }
  const members = listMembers(session.workshop_id!);

  // Órdenes activas para la asignación directa desde esta página
  const rowsActivas = listOrders(session.workshop_id!, { soloActivas: true });
  const asignables = rowsActivas.map((r) => ({
    id: r.order.id,
    numero: r.order.numero,
    vehiculo: `${r.vehicle.marca} ${r.vehicle.modelo} (${r.vehicle.placa})`,
    cliente: r.customer.nombre,
    responsableId: r.order.responsable_id,
    responsableNombre: r.responsable?.nombre ?? null,
    estado: r.order.estado,
  }));
  const miembrosActivos = members.filter((m) => m.member.activo);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Equipo del taller</h1>
        <p className="mt-1 text-sm text-slate-500">
          Añade a tus mecánicos y asesores: <strong>el taller les crea la cuenta</strong> con correo y contraseña
          inicial (definida por ti o generada automáticamente). Ellos entran en <em>Iniciar sesión → “Soy del
          taller”</em> sin registrarse.
        </p>
      </div>

      <Card>
        <CardHeader
          title={`Miembros (${members.length})`}
          subtitle="Permisos por rol: propietario (todo) · asesor (recepción, diagnósticos y presupuestos) · mecánico (solo sus trabajos asignados, avances y evidencias)"
          icon={<Users className="h-5 w-5" />}
        />
        <CardBody>
          <TeamManager members={members} />
        </CardBody>
      </Card>

      {/* Asignación directa de órdenes */}
      <Card>
        <CardHeader
          title="Carga de trabajo y asignación de órdenes"
          subtitle="Asigna órdenes activas directamente aquí: el miembro recibe una notificación y la orden queda marcada con su responsable"
          icon={<ClipboardCheck className="h-5 w-5" />}
          actions={
            <Badge className="border-brand-200 bg-brand-50 text-brand-700">
              {asignables.filter((o) => !o.responsableId).length} sin asignar · {asignables.length} activas
            </Badge>
          }
        />
        <CardBody className="space-y-4">
          {miembrosActivos.length === 0 && (
            <EmptyState title="Añade miembros para poder asignarles trabajos" />
          )}
          {miembrosActivos.map(({ member, user }) => {
            const assigned = asignables
              .filter((o) => o.responsableId === user.id)
              .map((o) => ({ id: o.id, numero: o.numero, vehiculo: o.vehiculo, estado: o.estado }));
            const disponibles = asignables
              .filter((o) => o.responsableId !== user.id)
              .map(({ id, numero, vehiculo, cliente, responsableNombre }) => ({ id, numero, vehiculo, cliente, responsableNombre }));
            return (
              <div key={member.id} className="rounded-xl border border-slate-200 px-4 py-3.5">
                <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
                  <Avatar nombre={user.nombre} size="sm" />
                  <p className="text-sm font-bold text-slate-800">{user.nombre}</p>
                  <Badge className="border-slate-200 bg-slate-50 text-slate-500">{ROL_LABEL[member.rol]}</Badge>
                  <Badge className={assigned.length > 0 ? "border-blue-200 bg-blue-50 text-blue-600" : "border-slate-200 bg-slate-50 text-slate-400"}>
                    {assigned.length} trabajo(s) activo(s)
                  </Badge>
                </div>
                <MemberAssignments userId={user.id} assigned={assigned} assignable={disponibles} />
              </div>
            );
          })}
          {asignables.length === 0 && (
            <p className="text-xs text-slate-400">
              No hay órdenes activas que asignar. Recibe un vehículo desde{" "}
              <Link href="/taller/ordenes/nueva" className="font-semibold text-brand-600 hover:underline">Órdenes → Recibir vehículo</Link>.
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="text-sm text-slate-600">
          <p className="font-bold text-slate-800">¿Cómo entra tu mecánico?</p>
          <ol className="mt-2 list-inside list-decimal space-y-1 text-slate-500">
            <li>Compártele su correo y la contraseña inicial (botón copiar).</li>
             <li>Entra a <Link href="/login" className="font-semibold text-brand-600 hover:underline">Iniciar sesión</Link> → pestaña <strong>“Soy un taller”</strong>.</li>
            <li>Ve su panel de <Link href="/taller/ordenes" className="font-semibold text-brand-600 hover:underline">trabajos asignados</Link>: cuando un asesor le asigne una orden, le llega una notificación.</li>
            <li>Si olvida la contraseña, usa <strong>“Nueva contraseña”</strong> aquí y le compartes la nueva (queda en la auditoría).</li>
          </ol>
          <p className="mt-3 text-xs text-slate-400">
            {ROL_LABEL.mechanic}: cada mecánico solo ve y actualiza los trabajos que tiene asignados; no puede crear
            presupuestos ni gestionar clientes. Cada cuenta creada y cada contraseña generada quedan registradas en
            Configuración → Auditoría.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
