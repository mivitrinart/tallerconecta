import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import { getOrderDetail, listStaffUsers } from "@/lib/database/queries";
import { OrderDetailClient } from "./OrderDetailClient";
import { puede, AVANCES_MECANICO } from "@/lib/permissions";
import type { EstadoOrden } from "@/lib/database/types";

export const metadata: Metadata = { title: "Detalle de la orden" };
export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params: paramsP,
  searchParams: searchParamsP,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await paramsP;
  const searchParams = await searchParamsP;
  const session = await requireSession();
  const detail = getOrderDetail(params.id, session.workshop_id!);
  if (!detail) notFound();

  const esMecanico = session.rol === "mechanic";
  if (esMecanico && detail.order.responsable_id !== session.user_id) {
    return (
      <div className="mx-auto max-w-lg py-16">
        <div className="card p-8 text-center">
          <h2 className="text-xl font-bold text-slate-900">Trabajo no asignado a ti</h2>
          <p className="mt-2 text-slate-500">Los mecánicos solo pueden consultar los trabajos que tienen asignados. Habla con el asesor del taller.</p>
          <Link href="/taller/ordenes" className="btn-secondary mt-4 inline-block">Volver a mis trabajos</Link>
        </div>
      </div>
    );
  }

  const { order, customer, vehicle, responsable, latestEstimate } = detail;
  const puedeEstados = puede(session.rol, "orders.update_status") || esMecanico;
  const puedeGestionar = puede(session.rol, "estimates.manage");
  const puedeEditar = puede(session.rol, "orders.assign");
  const montoAutorizado = detail.estimates.find((e) => e.authorization)?.authorization?.monto_aprobado ?? latestEstimate?.total ?? 0;
  const staff = puedeEditar ? listStaffUsers(session.workshop_id!) : [];

  const pendientes = latestEstimate?.pendiente_aprobacion;

  return (
    <OrderDetailClient
      order={order}
      customer={customer}
      vehicle={vehicle}
      responsable={responsable}
      latestEstimate={latestEstimate}
      detail={detail}
      esMecanico={esMecanico}
      session={session}
      pendientes={pendientes}
      puedeEstados={puedeEstados}
      puedeGestionar={puedeGestionar}
      puedeEditar={puedeEditar}
      montoAutorizado={montoAutorizado}
      staff={staff}
      initialTab={searchParams.tab}
    />
  );
}