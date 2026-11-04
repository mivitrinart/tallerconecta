import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Car, Smartphone, Star, Wrench, Receipt } from "lucide-react";
import { requireSession } from "@/lib/auth/session";
import { getCustomerDetail } from "@/lib/database/queries";
import { Card, CardHeader, CardBody, StatusBadge, Avatar, KpiCard, EmptyState } from "@/components/ui";
import { CopyBox } from "@/components/customers/CustomerForms";
import { AddVehicleButton } from "@/components/vehicles/VehicleForms";
import { AnonymizeCustomerButton } from "@/components/customers/AnonymizeCustomerButton";
import { RegenerarEnlaceButton } from "@/components/customers/RegenerarEnlaceButton";
import { OrderRowCard } from "@/components/orders/OrderRowCard";
import { formatCOP, formatDate, formatKm } from "@/lib/format";
import { puede } from "@/lib/permissions";

export const metadata: Metadata = { title: "Ficha del cliente" };
export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({ params: paramsP }: { params: Promise<{ id: string }> }) {
  const params = await paramsP;
  const session = await requireSession();
  const detail = getCustomerDetail(params.id, session.workshop_id!);
  if (!detail) notFound();

  const { customer, vehicles, orders, stats } = detail;
  const puedeGestionar = puede(session.rol, "customers.manage");

  return (
    <div className="space-y-5">
      <Link href="/taller/clientes" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-brand-600">
        <ArrowLeft className="h-4 w-4" /> Clientes
      </Link>

      <div className="card flex flex-wrap items-center gap-4 p-5">
        <Avatar nombre={customer.nombre} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{customer.nombre}</h1>
          <p className="text-sm text-slate-500">
            {customer.telefono} · {customer.correo}
            {customer.documento && <> · Doc. {customer.documento}</>}
          </p>
          <p className="text-xs text-slate-400">Cliente desde {formatDate(customer.created_at)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {puedeGestionar && <AddVehicleButton customerId={customer.id} />}
          {session.rol === "owner" && !customer.anonimizado && (
            <AnonymizeCustomerButton customerId={customer.id} customerNombre={customer.nombre} />
          )}
        </div>
      </div>

      {!customer.anonimizado && customer.portal_activo === false && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          <p>
            <strong>El cliente desvinculó su ficha: el enlace de seguimiento anterior quedó ANULADO</strong>{" "}
            (por privacidad no vuelve a funcionar). La ficha y su historial se conservan. Genera un enlace
            nuevo para compartirlo con el cliente.
          </p>
          <RegenerarEnlaceButton customerId={customer.id} />
        </div>
      )}

      {customer.anonimizado ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
          <strong>Ficha anonimizada (solicitud de supresión · Ley 1581 de 2012).</strong> Los datos de contacto
          fueron suprimidos y el enlace personal invalidado. El historial de órdenes y autorizaciones se conserva
          por obligación legal.
        </div>
      ) : (
        <p className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs text-slate-500">
          Tratamiento de datos: autorización registrada por el taller
          {customer.consentimiento_datos_at ? ` el ${formatDate(customer.consentimiento_datos_at)}` : ""}
          {" "}· origen: <strong>{customer.consentimiento_origen ?? "taller"}</strong> · el cliente puede ejercer sus
          derechos (conocer, actualizar, rectificar, suprimir) ante el taller o la plataforma. Ver{" "}
          <a href="/legal/privacidad" target="_blank" className="font-semibold text-brand-600 underline">Política de Tratamiento de Datos</a>.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Visitas totales" value={stats.visitas} icon={<Receipt className="h-5 w-5" />} />
        <KpiCard label="Órdenes activas" value={stats.activas} icon={<Wrench className="h-5 w-5" />} tone="info" />
        <KpiCard label="Facturado (entregas)" value={<span className="text-xl">{formatCOP(stats.gastoTotal)}</span>} icon={<Car className="h-5 w-5" />} tone="success" />
        <KpiCard label="Calificación promedio" value={stats.calificacionPromedio ? `${stats.calificacionPromedio.toFixed(1)} ★` : "—"} icon={<Star className="h-5 w-5" />} tone="warning" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Vehículos" icon={<Car className="h-5 w-5" />} />
          <CardBody className="space-y-2.5">
            {vehicles.length === 0 && <EmptyState title="Sin vehículos" description="Agrega el primer vehículo del cliente." />}
            {vehicles.map((v) => (
              <div key={v.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                <div>
                  <p className="font-bold text-slate-800">{v.marca} {v.modelo} <span className="font-normal text-slate-400">({v.anio})</span></p>
                  <p className="text-xs text-slate-500">
                    Placa {v.placa} · {v.tipo === "moto" ? "Moto" : "Carro"} · {formatKm(v.kilometraje)}
                    {v.color ? ` · ${v.color}` : ""}
                    {v.origen === "cliente" && (
                      <span className="ml-1.5 rounded-full border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-700">
                        registrado por el cliente
                      </span>
                    )}
                  </p>
                </div>
                <Link href={`/taller/vehiculos?q=${encodeURIComponent(v.placa)}`} className="text-xs font-medium text-brand-600 hover:underline">
                  Historial →
                </Link>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Portal de seguimiento"
            subtitle="Enlace personal del cliente (acceso seguro)"
            icon={<Smartphone className="h-5 w-5" />}
          />
          <CardBody>
            <CopyBox label="Comparte este enlace por WhatsApp o correo" value={`/seguimiento/${customer.portal_token}`} />
            <p className="mt-3 text-xs text-slate-400">
              Con este enlace el cliente consulta el estado, ve fotos, aprueba presupuestos y hace preguntas
              sin crear una cuenta. No lo compartas con otras personas.
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Historial de visitas y reparaciones" subtitle={`${orders.length} orden(es)`} icon={<Wrench className="h-5 w-5" />} />
        <CardBody className="space-y-2.5">
          {orders.length === 0 && <EmptyState title="Sin órdenes todavía" description="Cuando recibas un vehículo de este cliente aparecerá aquí su historial." />}
          {orders.map((row) => (
            <OrderRowCard key={row.order.id} row={row} compacto extra={row.order.valor_final ? formatCOP(row.order.valor_final) : undefined} />
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
