import Link from "next/link";
import type { Metadata } from "next";
import { Search, Users, ChevronRight, Smartphone, Link2Off, AlertCircle } from "lucide-react";
import { requireSession } from "@/lib/auth/session";
import { listCustomers } from "@/lib/database/queries";
import { EmptyState, Avatar, Badge } from "@/components/ui";
import { NewCustomerButton } from "@/components/customers/CustomerForms";
import { formatDate } from "@/lib/format";
import { puede } from "@/lib/permissions";

export const metadata: Metadata = { title: "Clientes" };
export const dynamic = "force-dynamic";

export default async function ClientesPage({ searchParams: searchParamsP }: { searchParams: Promise<{ q?: string; nuevo?: string }> }) {
  const searchParams = await searchParamsP;
  const session = await requireSession();
  const rows = listCustomers(session.workshop_id!, searchParams.q);
  const puedeGestionar = puede(session.rol, "customers.manage");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Clientes</h1>
          <p className="mt-1 text-sm text-slate-500">{rows.length} cliente(s) · búsqueda por nombre, placa o número de orden desde la página de órdenes</p>
        </div>
        {puedeGestionar && <NewCustomerButton autoOpen={searchParams.nuevo === "1"} />}
      </div>

      <form className="card p-4" action="/taller/clientes" method="GET">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input className="input pl-9!" name="q" defaultValue={searchParams.q ?? ""} placeholder="Buscar por nombre, teléfono, correo o documento…" />
        </div>
      </form>

      {rows.length === 0 ? (
        <EmptyState icon={<Users className="h-10 w-10" />} title={searchParams.q ? "Sin resultados" : "Aún no hay clientes"} description="Registra un cliente para asociarle vehículos y órdenes de servicio." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="border-b border-slate-100 bg-slate-50/60">
              <tr>
                <th className="th">Cliente</th>
                <th className="th">Contacto</th>
                <th className="th">Vehículos</th>
                <th className="th text-center">Órdenes</th>
                <th className="th">Última visita</th>
                <th className="th">Portal</th>
                <th className="th pr-4!" />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ customer, vehicles, ordenesActivas, ordenesTotales, ultimaVisita }) => {
                const portalInactivo = customer.portal_activo === false;
                const portalAnonimizado = customer.anonimizado === true;
                return (
                  <tr key={customer.id} className={`border-b border-slate-50 transition-colors last:border-0 ${portalInactivo ? "bg-amber-50/50" : portalAnonimizado ? "bg-red-50/50" : "hover:bg-brand-50/30"}`}>
                    <td className="td">
                      <Link href={`/taller/clientes/${customer.id}`} className="flex items-center gap-3 font-semibold text-slate-800 hover:text-brand-700">
                        <Avatar nombre={customer.nombre} size="sm" />
                        <span>
                          {customer.nombre}
                          {ordenesActivas > 0 && <Badge className="ml-2 border-blue-200 bg-blue-50 text-blue-600">{ordenesActivas} activa(s)</Badge>}
                          {portalInactivo && (
                            <span title="El cliente desvinculó su ficha">
                              <Badge className="ml-2 border-amber-200 bg-amber-50 text-amber-700">
                                <Link2Off className="h-3 w-3" /> Desvinculado
                              </Badge>
                            </span>
                          )}
                          {portalAnonimizado && (
                            <span title="Ficha anonimizada por solicitud de supresión">
                              <Badge className="ml-2 border-red-200 bg-red-50 text-red-700">
                                <AlertCircle className="h-3 w-3" /> Anonimizada
                              </Badge>
                            </span>
                          )}
                        </span>
                      </Link>
                    </td>
                    <td className="td text-xs text-slate-500">
                      <p>{customer.telefono}</p>
                      <p className="text-slate-400">{customer.correo}</p>
                    </td>
                    <td className="td text-xs text-slate-600">
                      {vehicles.map((v) => v.placa).join(", ") || "—"}
                    </td>
                    <td className="td text-center font-semibold">{ordenesTotales}</td>
                    <td className="td text-xs text-slate-500">{formatDate(ultimaVisita)}</td>
                    <td className="td text-center">
                      {portalInactivo ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                          <Link2Off className="h-3 w-3" /> Enlace anulado
                        </span>
                      ) : portalAnonimizado ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700">
                          <AlertCircle className="h-3 w-3" /> Anonimizada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                          <Smartphone className="h-3 w-3" /> Activo
                        </span>
                      )}
                    </td>
                    <td className="td pr-4! text-right">
                      <Link href={`/taller/clientes/${customer.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
                        Ver ficha <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
        <Smartphone className="h-3.5 w-3.5" /> Cada cliente tiene un enlace personal de seguimiento que puedes compartir por WhatsApp.
      </p>
    </div>
  );
}
