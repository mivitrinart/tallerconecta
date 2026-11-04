import Link from "next/link";
import type { Metadata } from "next";
import { FileText, Filter } from "lucide-react";
import { requireSession } from "@/lib/auth/session";
import { listEstimates } from "@/lib/database/queries";
import { EmptyState, EstimateStatusBadge, Badge } from "@/components/ui";
import { CriticidadControl, CriticidadResumen } from "@/components/estimates/CriticidadControl";
import type { Criticidad } from "@/lib/database/types";
import { formatCOP, formatDateTime, formatTimeAgo } from "@/lib/format";
import { puede } from "@/lib/permissions";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Presupuestos" };
export const dynamic = "force-dynamic";

export default async function PresupuestosPage({ searchParams: searchParamsP }: { searchParams: Promise<{ pendientes?: string }> }) {
  const searchParams = await searchParamsP;
  const session = await requireSession();
  if (!puede(session.rol, "estimates.manage") && session.rol !== "mechanic") {
    return <EmptyState title="Vista no disponible para tu rol" />;
  }
  const puedeEditar = puede(session.rol, "estimates.manage");
  const soloPendientes = searchParams.pendientes === "1";
  const rows = listEstimates(session.workshop_id!, { soloPendientes });
  const pendientesCount = rows.filter((r) => r.estimate.estado === "enviada").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Presupuestos y autorizaciones</h1>
          <p className="mt-1 text-sm text-slate-500">
            {rows.length} versión(es) · <strong className="text-amber-600">{pendientesCount} pendiente(s) de aprobación</strong>
          </p>
        </div>
        <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-medium">
          <Link href="/taller/presupuestos" className={cn("rounded-md px-3 py-1.5", !soloPendientes ? "bg-brand-600 text-white" : "text-slate-500 hover:text-slate-800")}>
            Todos
          </Link>
          <Link href="/taller/presupuestos?pendientes=1" className={cn("flex items-center gap-1 rounded-md px-3 py-1.5", soloPendientes ? "bg-brand-600 text-white" : "text-slate-500 hover:text-slate-800")}>
            <Filter className="h-3 w-3" /> Pendientes
          </Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={<FileText className="h-10 w-10" />} title={soloPendientes ? "Ningún presupuesto pendiente" : "Sin presupuestos"} description={soloPendientes ? "Todos los presupuestos enviados ya tienen decisión del cliente." : "Crea presupuestos desde el detalle de cada orden."} />
      ) : (
        <div className="space-y-2.5">
          {rows.map(({ estimate, items, order, customer, vehicle, authorization, pendientes }) => {
            const counts = { urgente: 0, recomendado: 0, puede_esperar: 0 } as Record<Criticidad, number>;
            for (const i of items) counts[i.criticidad ?? "recomendado"]++;
            const editable = puedeEditar && estimate.estado === "borrador";
            return (
              <div
                key={estimate.id}
                className={cn("card px-5 py-4 transition-shadow hover:shadow-md", estimate.estado === "enviada" && "border-amber-300")}
              >
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  <Link href={`/taller/ordenes/${order.id}?tab=presupuesto`} className="min-w-[10rem] flex-1">
                    <p className="text-sm font-bold text-slate-800 hover:text-brand-700">
                      {order.numero} · v{estimate.version}
                    </p>
                    <p className="text-xs text-slate-500">
                      {customer.nombre} — {vehicle.marca} {vehicle.modelo} ({vehicle.placa})
                    </p>
                  </Link>
                  <div className="text-xs text-slate-500">
                    {items.length} trabajo(s) · <CriticidadResumen counts={counts} />
                    {estimate.estado === "enviada" && (
                      <p className="mt-0.5 font-medium text-amber-600">
                        {pendientes} pendiente(s) · enviada {estimate.enviada_at ? formatTimeAgo(estimate.enviada_at) : "—"}
                      </p>
                    )}
                    {authorization && (
                      <p className="mt-0.5 text-emerald-600">
                        Decidió {authorization.decided_by_nombre} · {formatDateTime(authorization.created_at)}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-base font-extrabold tabular-nums text-slate-900">{formatCOP(estimate.total)}</p>
                    {authorization && authorization.decision !== "rechazada" && authorization.decision !== "postergada" && (
                      <p className="text-xs font-semibold text-emerald-600">Aprobado: {formatCOP(authorization.monto_aprobado)}</p>
                    )}
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <EstimateStatusBadge estado={estimate.estado} />
                  </div>
                </div>

                {/* Ítems con semáforo: editable mientras sea borrador */}
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-semibold text-brand-600 hover:text-brand-700">
                    Ver ítems y semáforo
                    {editable && <span className="ml-1 font-normal text-emerald-600">(editable: es borrador)</span>}
                    {!editable && <span className="ml-1 font-normal text-slate-400">(solo lectura: lo enviado/aprobado no se modifica)</span>}
                  </summary>
                  <div className="mt-2.5 space-y-2">
                    {items.map((item) => (
                      <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-700">
                            <span className="mr-1.5 rounded bg-white px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-400 ring-1 ring-slate-200">
                              {item.tipo.replace("_", " ")}
                            </span>
                            {item.descripcion}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {item.cantidad} × {formatCOP(item.precio_unitario)} = <strong>{formatCOP(item.subtotal)}</strong>
                            {item.estado !== "pendiente" && (
                              <span className={cn("ml-2 font-semibold", item.estado === "aprobada" ? "text-emerald-600" : item.estado === "postergada" ? "text-sky-600" : "text-red-500")}>
                                · {item.estado === "aprobada" ? "Aprobado" : item.estado === "postergada" ? "Aplazado" : "Rechazado"}
                              </span>
                            )}
                          </p>
                        </div>
                        <CriticidadControl
                          estimateId={estimate.id}
                          itemId={item.id}
                          value={item.criticidad ?? "recomendado"}
                          editable={editable}
                        />
                      </div>
                    ))}
                    {editable && (
                      <p className="text-[11px] text-slate-400">
                        💡 Marca el semáforo antes de enviar: 🟢 urgente/seguridad · 🟡 recomendado pronto · 🔴 puede
                        esperar. El cliente lo verá en su portal y entenderá por qué pagar. Los cambios quedan en el
                        historial de la orden.
                      </p>
                    )}
                  </div>
                </details>
              </div>
            );
          })}
        </div>
      )}

      <div className="card px-5 py-4 text-xs text-slate-500">
        <p className="font-semibold text-slate-700">Reglas de autorización del sistema</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Las autorizaciones se refieren a una versión concreta del presupuesto: si cambia el precio o el alcance, se crea una versión nueva que debe aprobarse de nuevo.</li>
          <li>El precio autorizado se conserva aunque cambien los precios del catálogo.</li>
          <li>Queda registrada la fecha, el usuario y la versión autorizada de cada decisión.</li>
        </ul>
      </div>
    </div>
  );
}
