import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { listAdminWorkshops } from "@/lib/database/queries";
import { Card, EmptyState } from "@/components/ui";
import { AdminWorkshopRow } from "@/components/shared/AdminRows";

export const metadata: Metadata = { title: "Talleres registrados" };
export const dynamic = "force-dynamic";

export default async function AdminTalleresPage() {
  const rows = listAdminWorkshops();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Talleres registrados</h1>
        <p className="mt-1 text-sm text-slate-500">{rows.length} taller(es) en la plataforma</p>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={<Building2 className="h-10 w-10" />} title="Sin talleres" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[780px]">
            <thead className="border-b border-slate-100 bg-slate-50/60">
              <tr>
                <th className="th">Taller</th>
                <th className="th">Propietario</th>
                <th className="th text-center">Equipo / Clientes / Órdenes</th>
                <th className="th">Plan</th>
                <th className="th">Cambiar estado</th>
                <th className="th pr-4!">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <AdminWorkshopRow key={r.workshop.id} {...r} />
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
