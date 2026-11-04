import type { Metadata } from "next";
import { UserCog } from "lucide-react";
import { listAdminUsers } from "@/lib/database/queries";
import { Card, EmptyState } from "@/components/ui";
import { AdminUserRow } from "@/components/shared/AdminSubscriptionRow";

export const metadata: Metadata = { title: "Usuarios" };
export const dynamic = "force-dynamic";

export default async function AdminUsuariosPage() {
  const rows = listAdminUsers();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Usuarios de la plataforma</h1>
        <p className="mt-1 text-sm text-slate-500">
          {rows.length} usuario(s) · propietarios, asesores, mecánicos y administradores
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={<UserCog className="h-10 w-10" />} title="Sin usuarios" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="border-b border-slate-100 bg-slate-50/60">
              <tr>
                <th className="th">Usuario</th>
                <th className="th">Rol y taller</th>
                <th className="th">Registro</th>
                <th className="th pr-4! text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ user, memberships }) => (
                <AdminUserRow key={user.id} user={user} memberships={memberships} />
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
