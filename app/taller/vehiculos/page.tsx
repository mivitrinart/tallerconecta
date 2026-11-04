import Link from "next/link";
import type { Metadata } from "next";
import { Search, CarFront, ChevronRight } from "lucide-react";
import { requireSession } from "@/lib/auth/session";
import { listVehicles } from "@/lib/database/queries";
import { EmptyState, Badge, StatusBadge } from "@/components/ui";
import { formatKm } from "@/lib/format";
import { puede } from "@/lib/permissions";

export const metadata: Metadata = { title: "Vehículos" };
export const dynamic = "force-dynamic";

export default async function VehiculosPage({ searchParams: searchParamsP }: { searchParams: Promise<{ q?: string; origen?: string }> }) {
  const searchParams = await searchParamsP;
  const session = await requireSession();
  if (session.rol === "mechanic") {
    return (
      <EmptyState title="Vista no disponible para tu rol" description="Los mecánicos consultan sus trabajos asignados desde la página de Órdenes." />
    );
  }
  const origen = searchParams.origen === "cliente" ? "cliente" : searchParams.origen === "taller" ? "taller" : undefined;
  const rows = listVehicles(session.workshop_id!, searchParams.q, origen);
  const porCliente = origen === "cliente";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Vehículos</h1>
        <p className="mt-1 text-sm text-slate-500">
          {rows.length} vehículo(s) registrado(s). La placa no es clave primaria: puede haber cambios de matrícula o vehículos extranjeros.
        </p>
      </div>

      {puede(session.rol, "vehicles.manage") && (
        <p className="text-sm text-slate-500">
          Para registrar un vehículo nuevo entra a la{" "}
          <Link href="/taller/clientes" className="font-semibold text-brand-600 hover:underline">ficha del cliente</Link>{" "}
          o hazlo durante la <Link href="/taller/ordenes/nueva" className="font-semibold text-brand-600 hover:underline">recepción de una orden</Link>.
        </p>
      )}

      <form className="card p-4" action="/taller/vehiculos" method="GET">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input className="input pl-9!" name="q" defaultValue={searchParams.q ?? ""} placeholder="Buscar por placa, marca, modelo o cliente…" />
        </div>
      </form>

      {rows.length === 0 ? (
        <EmptyState icon={<CarFront className="h-10 w-10" />} title="Sin vehículos" description="Los vehículos aparecen al registrar clientes y recepciones." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead className="border-b border-slate-100 bg-slate-50/60">
              <tr>
                <th className="th">Placa</th>
                <th className="th">Vehículo</th>
                <th className="th">Propietario</th>
                <th className="th text-right">Kilometraje</th>
                <th className="th text-center">Origen del dato</th>
                <th className="th text-center">Estado</th>
                <th className="th pr-4!" />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ vehicle, customer, ordenesActivas }) => (
                <tr key={vehicle.id} className="border-b border-slate-50 last:border-0 hover:bg-brand-50/30">
                  <td className="td">
                    <span className="rounded-lg border-2 border-slate-800 bg-amber-50 px-2.5 py-1 font-mono text-sm font-bold tracking-wider text-slate-900">
                      {vehicle.placa}
                    </span>
                  </td>
                  <td className="td font-medium text-slate-800">
                    {vehicle.marca} {vehicle.modelo}
                    <span className="block text-xs font-normal text-slate-400">{vehicle.anio} · {vehicle.tipo === "moto" ? "Moto" : "Carro"}{vehicle.color ? ` · ${vehicle.color}` : ""}</span>
                  </td>
                  <td className="td">
                    <Link href={`/taller/clientes/${customer.id}`} className="font-medium text-brand-700 hover:underline">{customer.nombre}</Link>
                    <span className="block text-xs text-slate-400">{customer.telefono}</span>
                  </td>
                  <td className="td text-right tabular-nums">{formatKm(vehicle.kilometraje)}</td>
                  <td className="td text-center">
                    {(vehicle.origen ?? "taller") === "cliente" ? (
                      <Badge className="border-sky-200 bg-sky-50 text-sky-700" >Registrado por el cliente</Badge>
                    ) : (
                      <Badge className="border-slate-200 bg-slate-50 text-slate-500">Taller</Badge>
                    )}
                  </td>
                  <td className="td text-center">
                    {ordenesActivas > 0 ? (
                      <Badge className="border-blue-200 bg-blue-50 text-blue-600">{ordenesActivas} orden activa</Badge>
                    ) : (
                      <span className="text-xs text-slate-300">En taller: no</span>
                    )}
                  </td>
                  <td className="td pr-4! text-right">
                    <Link href={`/taller/clientes/${customer.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
                      Ficha <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
