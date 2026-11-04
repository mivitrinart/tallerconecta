import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import { listVinculacionesPendientes } from "@/lib/database/queries";
import { Card, EmptyState } from "@/components/ui";
import { VinculacionesTable } from "@/components/taller/VinculacionesTable";
import { UserPlus, Link as LinkIcon } from "lucide-react";
import Link from "next/link";
import { initStore } from "@/lib/api/init-store";

export const metadata: Metadata = { title: "Vinculaciones de clientes" };
export const dynamic = "force-dynamic";

interface VinculacionPendiente {
  id: string;
  account_id: string;
  account_nombre: string;
  account_correo: string;
  customer_id: string;
  customer_nombre: string;
  customer_telefono: string;
  customer_correo: string;
  workshop_id: string;
  estado: "pendiente";
  created_at: string;
}

export default async function VinculacionesPage() {
  await initStore();
  const session = await requireSession();
  if (session.rol === "mechanic") {
    return (
      <div className="card p-8 text-center">
        <EmptyState icon={<UserPlus className="h-8 w-8" />} title="Vista no disponible para tu rol" description="Los mecánicos no gestionan vinculaciones de clientes." />
      </div>
    );
  }

  const pendientes: VinculacionPendiente[] = listVinculacionesPendientes(session.workshop_id!);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Vinculaciones de clientes</h1>
        <p className="mt-1 text-sm text-slate-500">
          Los clientes que peguen su enlace personal de seguimiento en su cuenta generan una solicitud de vinculación.
          Aquí la aceptas o rechazas. Solo las vinculaciones aceptadas otorgan acceso al portal del cliente.
        </p>
      </div>

      <VinculacionesTable pendientes={pendientes} />

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <p className="flex items-center gap-1.5">
          <Link href="/" className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700">
            <LinkIcon className="h-4 w-4" />
            Volver al inicio
          </Link>
        </p>
      </div>
    </div>
  );
}
