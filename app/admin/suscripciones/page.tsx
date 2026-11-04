import type { Metadata } from "next";
import { BadgeDollarSign } from "lucide-react";
import { listAdminSubscriptions } from "@/lib/database/queries";
import { Card, EmptyState } from "@/components/ui";
import { AdminSubscriptionRow } from "@/components/shared/AdminSubscriptionRow";

export const metadata: Metadata = { title: "Suscripciones" };
export const dynamic = "force-dynamic";

export default async function AdminSuscripcionesPage() {
  const rows = listAdminSubscriptions();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Suscripciones</h1>
        <p className="mt-1 text-sm text-slate-500">{rows.length} suscripción(es) registradas</p>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={<BadgeDollarSign className="h-10 w-10" />} title="Sin suscripciones" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="border-b border-slate-100 bg-slate-50/60">
              <tr>
                <th className="th">Taller</th>
                <th className="th">Plan</th>
                <th className="th">Estado</th>
                <th className="th">Vigencia</th>
                <th className="th pr-4!">Alerta</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ sub, workshop }) => (
                <AdminSubscriptionRow key={sub.id} sub={sub} workshop={workshop} />
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
