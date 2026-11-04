import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { query } from "@/lib/database/index";
import { NewOrderForm } from "@/components/orders/NewOrderForm";
import { puede } from "@/lib/permissions";

export const metadata: Metadata = { title: "Recibir vehículo" };
export const dynamic = "force-dynamic";

export default async function NuevaOrdenPage() {
  const session = await requireSession();
  if (!puede(session.rol, "orders.create")) redirect("/taller/ordenes");

  const data = query((db) => ({
    customers: db.customers
      .filter((c) => c.workshop_id === session.workshop_id)
      .map((c) => ({ id: c.id, nombre: c.nombre, telefono: c.telefono, correo: c.correo }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    vehicles: db.vehicles
      .filter((v) => v.workshop_id === session.workshop_id)
      .map((v) => ({ id: v.id, customer_id: v.customer_id, placa: v.placa, marca: v.marca, modelo: v.modelo, anio: v.anio, kilometraje: v.kilometraje, tipo: v.tipo, origen: v.origen ?? ("taller" as const) })),
    staff: db.workshop_members
      .filter((m) => m.workshop_id === session.workshop_id && m.activo)
      .map((m) => db.users.find((u) => u.id === m.user_id)!)
      .filter(Boolean)
      .map((u) => ({ id: u.id, nombre: u.nombre })),
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Flujo · Paso 1</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">Recepción del vehículo</h1>
        <p className="mt-1 text-sm text-slate-500">
          Registra el cliente, el vehículo, el kilometraje, los daños visibles y el motivo de ingreso.
          El cliente recibirá el aviso “Recibimos tu vehículo”.
        </p>
      </div>
      <NewOrderForm customers={data.customers} vehicles={data.vehicles} staff={data.staff} />
    </div>
  );
}
