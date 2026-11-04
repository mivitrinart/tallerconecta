"use client";
/**
 * Módulo 4 · Presupuestos y autorizaciones (vista del taller).
 * - Varias versiones por orden; cada cambio de precio/alcance exige re-aprobación.
 * - Aprobación o rechazo POR ÍTEM con registro de fecha, usuario y versión.
 * - Factura electrónica (DIAN · Colombia) generada desde un presupuesto autorizado.
 */
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, Send, Trash2, Copy, CheckCircle2, XCircle, Clock3, Download, AlertTriangle } from "lucide-react";
import { Button, Field, Alert, Card, CardHeader, CardBody, EstimateStatusBadge, Badge } from "@/components/ui";
import { api } from "@/lib/api-client";
import { CriticidadControl } from "@/components/estimates/CriticidadControl";
import { InvoiceView } from "@/components/invoices/InvoiceView";
import { formatCOP, formatDateTime } from "@/lib/format";
import type { Authorization, Criticidad, Estimate, EstimateItem, EstadoOrden, EstadoFactura, Invoice, TipoItem } from "@/lib/database/types";
import { CRITICIDAD_BADGE, CRITICIDAD_LABEL, CRITICIDAD_PUNTO } from "@/components/customer/PortalApprovalPanel";

export interface EstimateView {
  estimate: Estimate;
  items: EstimateItem[];
  authorization: Authorization | null;
}

const TIPO_LABEL: Record<TipoItem, string> = {
  repuesto: "Repuesto",
  mano_obra: "Mano de obra",
  servicio: "Servicio",
  otro: "Otro",
};

const TIPO_BADGE: Record<TipoItem, string> = {
  repuesto: "border-sky-200 bg-sky-50 text-sky-700",
  mano_obra: "border-violet-200 bg-violet-50 text-violet-700",
  servicio: "border-teal-200 bg-teal-50 text-teal-700",
  otro: "border-slate-200 bg-slate-50 text-slate-600",
};

function ItemEstadoBadge({ estado }: { estado: EstimateItem["estado"] }) {
  if (estado === "aprobada") return <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Aprobado</Badge>;
  if (estado === "rechazada") return <Badge className="border-red-200 bg-red-50 text-red-600"><XCircle className="h-3 w-3" /> Rechazado</Badge>;
  if (estado === "postergada") return <Badge className="border-sky-200 bg-sky-50 text-sky-700"><Clock3 className="h-3 w-3" /> Aplazado por el cliente</Badge>;
  return <Badge className="border-amber-200 bg-amber-50 text-amber-700"><Clock3 className="h-3 w-3" /> Pendiente de decisión</Badge>;
}

export function EstimatePanel({
  orderId,
  orderEstado,
  estimates,
  puedeGestionar,
}: {
  orderId: string;
  orderEstado: EstadoOrden;
  estimates: EstimateView[];
  puedeGestionar: boolean;
}) {
  const router = useRouter();
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [facturando, setFacturando] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [invoiceCreada, setInvoiceCreada] = useState<Invoice | null>(null);
  const [verFacturaModal, setVerFacturaModal] = useState<Invoice | null>(null);
  const [facturaModal, setFacturaModal] = useState<{ estimateId: string; estimateTotal: number } | null>(null);
  const [medioPago, setMedioPago] = useState("transferencia");

  const vigente = estimates[0] ?? null;
  const hayEnviada = estimates.some((e) => e.estimate.estado === "enviada");
  const hayBorrador = estimates.some((e) => e.estimate.estado === "borrador");
  const puedeCrear =
    puedeGestionar &&
    !hayEnviada &&
    !hayBorrador &&
    ["en_diagnostico", "esperando_aprobacion", "autorizado", "en_reparacion", "en_espera", "recibido"].includes(orderEstado);

  async function enviar(estimateId: string) {
    setEnviando(estimateId);
    setError(null);
    try {
      await api.post(`/api/presupuestos/${estimateId}/enviar`, {});
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar.");
    } finally {
      setEnviando(null);
    }
  }

  async function crearFactura(estimateId: string, medioPago: string) {
    setFacturando(true);
    setInvoiceError(null);
    try {
      const res = await api.post<Invoice>("/api/facturas", {
        estimate_id: estimateId,
        medio_pago: medioPago,
      });
      setFacturando(false);
      setInvoiceCreada(res);
      setVerFacturaModal(res);
      setFacturaModal(null);
    } catch (e) {
      setFacturando(false);
      setInvoiceError(e instanceof Error ? e.message : "No se pudo crear la factura.");
    }
  }

  function abrirModalFactura(estimateId: string, estimateTotal: number) {
    setMedioPago("transferencia");
    setFacturaModal({ estimateId, estimateTotal });
  }

  function cerrarModalFactura() {
    setFacturaModal(null);
    setInvoiceError(null);
  }

  function cerrarVerFactura() {
    setVerFacturaModal(null);
  }

  return (
    <div className="space-y-4">
      {error && <Alert tone="error">{error}</Alert>}

      {puedeCrear && (
        <button
          type="button"
          onClick={() => setCreando(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/50 px-4 py-4 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50"
        >
          <Plus className="h-4 w-4" />
          {estimates.length ? `Crear versión ${estimates[0].estimate.version + 1} del presupuesto` : "Crear presupuesto"}
        </button>
      )}

      {creando && puedeCrear && (
        <EstimateBuilder
          orderId={orderId}
          copiaDe={vigente && vigente.estimate.estado === "superada" ? vigente.items : undefined}
          onDone={() => { setCreando(false); router.refresh(); }}
          onCancel={() => setCreando(false)}
        />
      )}

      {estimates.length === 0 && !creando && (
        <Card>
          <CardBody>
            <p className="py-6 text-center text-sm text-slate-400">
              Esta orden aún no tiene presupuesto. Registra primero el diagnóstico y luego crea el presupuesto
              con repuestos, mano de obra y servicios.
            </p>
          </CardBody>
        </Card>
      )}

      {estimates.map(({ estimate, items, authorization }) => (
        <React.Fragment key={estimate.id}>
          <Card key={estimate.id} className={estimate.estado === "enviada" ? "border-amber-300 ring-1 ring-amber-200" : ""}>
            <CardHeader
              title={
                <span className="flex flex-wrap items-center gap-2">
                  Presupuesto · Versión {estimate.version}
                  <EstimateStatusBadge estado={estimate.estado} />
                </span>
              }
              subtitle={
                estimate.enviada_at
                  ? `Enviada ${formatDateTime(estimate.enviada_at)} · Validez ${estimate.validez_dias} días`
                  : `Creada ${formatDateTime(estimate.created_at)} (borrador)`
              }
              icon={<FileText className="h-5 w-5" />}
              actions={
                <>
                  {estimate.estado === "borrador" && puedeGestionar ? (
                    <Button size="sm" onClick={() => enviar(estimate.id)} loading={enviando === estimate.id}>
                      <Send className="h-3.5 w-3.5" /> Enviar al cliente
                    </Button>
                  ) : undefined}
                  {(estimate.estado === "aprobada" || estimate.estado === "parcialmente_aprobada") && puedeGestionar && !invoiceCreada ? (
                    <Button
                      size="sm"
                      onClick={() => abrirModalFactura(estimate.id, estimate.total)}
                      loading={facturando}
                      disabled={facturando}
                    >
                      <FileText className="h-3.5 w-3.5" /> Crear factura electrónica
                    </Button>
                  ) : undefined}
                </>
              }
            />
            <CardBody>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[540px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-left">
                      <th className="th pl-0!">Trabajo</th>
                      <th className="th text-center">Cant.</th>
                      <th className="th text-right">Unitario</th>
                      <th className="th text-right">Subtotal</th>
                      <th className="th pr-0! text-right">Decisión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b border-slate-50 last:border-0">
                        <td className="td pl-0!">
                          <span className={`badge mr-2 ${TIPO_BADGE[item.tipo]}`}>{TIPO_LABEL[item.tipo]}</span>
                          <span className="font-medium text-slate-800">{item.descripcion}</span>
                          <span className="ml-2 inline-block align-middle">
                            <CriticidadControl
                              estimateId={estimate.id}
                              itemId={item.id}
                              value={item.criticidad ?? "recomendado"}
                              editable={puedeGestionar && estimate.estado === "borrador"}
                            />
                          </span>
                          {item.alternativa_precio_unitario != null && (
                            <span className="mt-0.5 block text-[11px] text-slate-400">
                              ⇄ Homologado: {item.alternativa_descripcion ?? "alternativa"} · {formatCOP(item.alternativa_precio_unitario)}
                              {item.taller_recomienda === "alternativa" && <span className="ml-1 font-semibold text-emerald-600">⭐ recomendado por el taller</span>}
                              {authorization?.items_con_alternativa?.includes(item.id) && (
                                <span className="ml-1 font-semibold text-brand-600">· el cliente ELIGIÓ el homologado</span>
                              )}
                            </span>
                          )}
                        </td>
                        <td className="td text-center">{item.cantidad}</td>
                        <td className="td text-right tabular-nums">{formatCOP(item.precio_unitario)}</td>
                        <td className="td text-right font-semibold tabular-nums">{formatCOP(item.subtotal)}</td>
                        <td className="td pr-0! text-right">
                          {estimate.estado === "enviada" || authorization ? <ItemEstadoBadge estado={item.estado} /> : <span className="text-xs text-slate-300">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex justify-end">
                <div className="w-full max-w-xs space-y-1.5 text-sm">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal</span><span className="tabular-nums">{formatCOP(estimate.subtotal + estimate.descuento)}</span>
                  </div>
                  {estimate.descuento > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Descuento</span><span className="tabular-nums">−{formatCOP(estimate.descuento)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-500">
                    <span>IVA ({estimate.impuesto_porcentaje}%)</span><span className="tabular-nums">{formatCOP(estimate.impuestos)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-extrabold text-slate-900">
                    <span>Total</span><span className="tabular-nums">{formatCOP(estimate.total)}</span>
                  </div>
                </div>
              </div>

              {authorization && (
                <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                  authorization.decision === "rechazada" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-900"
                }`}>
                  <p className="font-semibold">
                    {authorization.decision === "aprobada_total" && "✓ Cliente aprobó la versión completa"}
                    {authorization.decision === "aprobada_parcial" && "✓ Cliente aprobó parcialmente esta versión"}
                    {authorization.decision === "rechazada" && "✗ Cliente rechazó esta versión"}
                  </p>
                  <p className="mt-0.5 text-xs opacity-80">
                    {authorization.decided_by_nombre} · {formatDateTime(authorization.created_at)} · Versión autorizada: v{authorization.version_aceptada}
                    {authorization.decision !== "rechazada" && authorization.decision !== "postergada" && <> · Monto aprobado: <strong>{formatCOP(authorization.monto_aprobado)}</strong></>}
                    {(authorization.items_postergados?.length ?? 0) > 0 && <> · {authorization.items_postergados!.length} trabajo(s) aplazado(s) por el cliente — propón una versión nueva cuando corresponda</>}
                  </p>
                  <p className="mt-1 text-[11px] opacity-70">
                    El precio autorizado se conserva aunque cambien los precios del catálogo. Los trabajos adicionales requieren una autorización nueva.
                  </p>
                </div>
              )}
            </CardBody>
          </Card>

          {invoiceCreada && invoiceCreada.estimate_id === estimate.id && (
            <div className="mt-3">
              <InvoiceView invoice={invoiceCreada} onChange={() => router.refresh()} />
            </div>
          )}
        </React.Fragment>
      ))}

      {/* Modal: generar factura electrónica */}
      {facturaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-slate-900/60" onClick={cerrarModalFactura} />
          <div className="relative z-50 bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-5 w-5 text-brand-600" />
              <h2 className="text-lg font-bold text-slate-900">Generar Factura Electrónica DIAN</h2>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Se creará la factura para la orden {facturaModal.estimateId} con total{" "}
              <span className="font-semibold">{formatCOP(facturaModal.estimateTotal)}</span>.
            </p>

            <div className="space-y-3 mb-5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Medio de pago</label>
              <div className="grid grid-cols-3 gap-2">
                {["efectivo", "transferencia", "tarjeta", "otro"].map((mp) => (
                  <button
                    key={mp}
                    type="button"
                    onClick={() => setMedioPago(mp)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      medioPago === mp
                        ? "border-brand-600 bg-brand-50 text-brand-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    {mp.charAt(0).toUpperCase() + mp.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {invoiceError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
                {invoiceError}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={cerrarModalFactura} disabled={facturando}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => crearFactura(facturaModal.estimateId, medioPago)}
                loading={facturando}
                disabled={facturando}
              >
                <Download className="h-4 w-4" /> Generar y descargar PDF
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: ver factura creada */}
      {verFacturaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-slate-900/60" onClick={cerrarVerFactura} />
          <div className="relative z-50 bg-white rounded-2xl shadow-2xl p-0 w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-brand-600" />
                <h2 className="text-lg font-bold text-slate-900">Factura Electrónica DIAN</h2>
              </div>
              <Button type="button" variant="ghost" onClick={cerrarVerFactura}>
                Cerrar
              </Button>
            </div>
            <div className="overflow-y-auto p-6">
              <InvoiceView invoice={verFacturaModal} onChange={() => {}} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Constructor de presupuesto ─────────────────────────────────────────────

interface ItemDraft {
  tipo: TipoItem;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  criticidad: Criticidad;
  conAlternativa: boolean;
  alternativa_descripcion: string;
  alternativa_precio_unitario: number | "";
  taller_recomienda: "principal" | "alternativa";
}

function EstimateBuilder({ orderId, copiaDe, onDone, onCancel }: { orderId: string; copiaDe?: EstimateItem[]; onDone: () => void; onCancel: () => void }) {
  const router = useRouter();
  const [items, setItems] = useState<ItemDraft[]>(
    copiaDe?.map((i) => ({
      tipo: i.tipo, descripcion: i.descripcion, cantidad: i.cantidad, precio_unitario: i.precio_unitario,
      criticidad: i.criticidad ?? ("recomendado" as Criticidad),
      conAlternativa: i.alternativa_precio_unitario != null,
      alternativa_descripcion: i.alternativa_descripcion ?? "",
      alternativa_precio_unitario: i.alternativa_precio_unitario ?? "",
      taller_recomienda: i.taller_recomienda ?? ("principal" as "principal" | "alternativa"),
    })) ?? [
      { tipo: "repuesto" as TipoItem, descripcion: "", cantidad: 1, precio_unitario: 0, criticidad: "recomendado" as Criticidad, conAlternativa: false, alternativa_descripcion: "", alternativa_precio_unitario: "" as const, taller_recomienda: "principal" as const },
    ]
  );
  const [descuento, setDescuento] = useState(0);
  const [impuesto, setImpuesto] = useState(19);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const bruto = items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0);
  const subtotal = Math.max(0, bruto - descuento);
  const impuestos = Math.round(subtotal * (impuesto / 100));
  const total = subtotal + impuestos;

  function setItem(idx: number, patch: Partial<ItemDraft>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  async function guardarYEnviar(enviar: boolean) {
    setLoading(true);
    setError(null);
    try {
      const validos = items
        .filter((i) => i.descripcion.trim().length >= 3 && i.precio_unitario >= 0 && i.cantidad > 0)
        .map((i) => ({
          tipo: i.tipo,
          descripcion: i.descripcion,
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
          criticidad: i.criticidad,
          alternativa_descripcion: i.conAlternativa ? i.alternativa_descripcion : "",
          alternativa_precio_unitario: i.conAlternativa && i.alternativa_precio_unitario !== "" ? i.alternativa_precio_unitario : null,
          taller_recomienda: i.conAlternativa ? i.taller_recomienda : null,
        }));
      if (validos.length === 0) throw new Error("Agrega al menos un ítem con descripción y precio.");
      const res = await api.post<{ id: string }>("/api/presupuestos", {
        service_order_id: orderId,
        items: validos,
        descuento,
        impuesto_porcentaje: impuesto,
      });
      if (enviar) {
        await api.post(`/api/presupuestos/${res.id}/enviar`, {});
      }
      router.refresh();
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el presupuesto.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-brand-300 ring-1 ring-brand-100">
      <CardHeader title="Nuevo presupuesto" subtitle="Los precios autorizados quedarán congelados en la versión" icon={<Plus className="h-5 w-5" />} />
      <CardBody className="space-y-4">
        {copiaDe && (
          <Alert tone="info">
            <Copy className="mr-1 inline h-3.5 w-3.5" /> Copiamos los ítems de la versión anterior. Ajusta lo que cambió — el cliente deberá aprobar de nuevo. Marca el semáforo de cada trabajo: el cliente entiende <strong>por qué pagar</strong>.
          </Alert>
        )}

        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 items-center gap-2 rounded-xl border border-slate-200 p-2.5">
            <div className="col-span-12 flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400">Semáforo:</span>
              {(["urgente", "recomendado", "puede_esperar"] as Criticidad[]).map((cr) => (
                <button
                  key={cr}
                  type="button"
                  onClick={() => setItem(idx, { criticidad: cr })}
                  className={`badge cursor-pointer transition-all ${CRITICIDAD_BADGE[cr]} ${item.criticidad === cr ? "ring-2 ring-brand-400" : "opacity-50 hover:opacity-90"}`}
                >
                  {CRITICIDAD_PUNTO[cr]} {CRITICIDAD_LABEL[cr]}
                </button>
              ))}
            </div>
              <select className="input col-span-12 sm:col-span-3" value={item.tipo} onChange={(e) => setItem(idx, { tipo: e.target.value as TipoItem })}>
                <option value="repuesto">Repuesto</option>
                <option value="mano_obra">Mano de obra</option>
                <option value="servicio">Servicio</option>
                <option value="otro">Otro</option>
              </select>
              <input className="input col-span-12 sm:col-span-5" placeholder="Descripción (ej: Juego de amortiguadores)" value={item.descripcion} onChange={(e) => setItem(idx, { descripcion: e.target.value })} />
              <input className="input col-span-4 sm:col-span-1" type="number" min={1} title="Cantidad" value={item.cantidad} onChange={(e) => setItem(idx, { cantidad: Math.max(1, Number(e.target.value)) })} />
              <input className="input col-span-7 sm:col-span-2" type="number" min={0} step={1000} title="Precio unitario (COP)" placeholder="Precio" value={item.precio_unitario || ""} onChange={(e) => setItem(idx, { precio_unitario: Math.max(0, Number(e.target.value)) })} />
              <button type="button" className="col-span-1 justify-self-end rounded-lg p-2 text-slate-300 hover:bg-red-50 hover:text-red-500" onClick={() => setItems((p) => p.filter((_, i) => i !== idx))} aria-label="Quitar ítem">
                <Trash2 className="h-4 w-4" />
              </button>
              <div className="col-span-12">
                {!item.conAlternativa ? (
                  <button
                    type="button"
                    onClick={() => setItem(idx, { conAlternativa: true })}
                    className="text-[11px] font-semibold text-brand-600 hover:underline"
                  >
                    ⇄ Añadir comparativa original/homologado (sube el ticket y da poder de decisión)
                  </button>
                ) : (
                  <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-brand-700">Comparativa para el cliente</p>
                      <button type="button" className="text-[11px] font-medium text-slate-400 hover:text-red-500" onClick={() => setItem(idx, { conAlternativa: false })}>quitar</button>
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <input
                        className="input text-xs"
                        placeholder="Homologado: descripción (ej: Bujías NGK LZKR)"
                        value={item.alternativa_descripcion}
                        onChange={(e) => setItem(idx, { alternativa_descripcion: e.target.value })}
                      />
                      <input
                        className="input text-xs"
                        type="number" min={0} step={1000}
                        placeholder="Precio homologado (COP)"
                        value={item.alternativa_precio_unitario}
                        onChange={(e) => setItem(idx, { alternativa_precio_unitario: e.target.value === "" ? "" : Math.max(0, Number(e.target.value)) })}
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] font-medium text-slate-600">
                      <span>El taller recomienda:</span>
                      {(["principal", "alternativa"] as const).map((op) => (
                        <label key={op} className="flex cursor-pointer items-center gap-1">
                          <input
                            type="radio"
                            name={`rec-${idx}`}
                            checked={item.taller_recomienda === op}
                            onChange={() => setItem(idx, { taller_recomienda: op })}
                            className="h-3.5 w-3.5 text-brand-600 focus:ring-brand-500"
                          />
                          {op === "principal" ? "Original" : "Homologado"}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <Button type="button" variant="secondary" size="sm" onClick={() => setItems((p) => [...p, { tipo: "repuesto", descripcion: "", cantidad: 1, precio_unitario: 0, criticidad: "recomendado" as Criticidad, conAlternativa: false, alternativa_descripcion: "", alternativa_precio_unitario: "", taller_recomienda: "principal" }])}>
          <Plus className="h-4 w-4" /> Agregar ítem
        </Button>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Descuento (COP)">
            <input className="input" type="number" min={0} step={1000} value={descuento || ""} onChange={(e) => setDescuento(Math.max(0, Number(e.target.value)))} placeholder="0" />
          </Field>
          <Field label="Impuesto (%) — IVA Colombia por defecto">
            <input className="input" type="number" min={0} max={100} value={impuesto} onChange={(e) => setImpuesto(Number(e.target.value))} />
          </Field>
        </div>

        <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
          <div className="flex justify-between text-slate-500"><span>Bruto</span><span className="tabular-nums">{formatCOP(bruto)}</span></div>
          {descuento > 0 && <div className="flex justify-between text-emerald-600"><span>Descuento</span><span className="tabular-nums">−{formatCOP(descuento)}</span></div>}
          <div className="flex justify-between text-slate-500"><span>IVA ({impuesto}%)</span><span className="tabular-nums">{formatCOP(impuestos)}</span></div>
          <div className="mt-1 flex justify-between border-t border-slate-200 pt-2 text-lg font-extrabold text-slate-900"><span>Total</span><span className="tabular-nums">{formatCOP(total)}</span></div>
        </div>

        {error && <Alert tone="error">{error}</Alert>}

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button type="button" variant="secondary" onClick={() => guardarYEnviar(false)} loading={loading} disabled={loading}>
            Guardar borrador
          </Button>
          <Button type="button" onClick={() => guardarYEnviar(true)} loading={loading} disabled={loading}>
            <Send className="h-4 w-4" /> Guardar y enviar al cliente
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
