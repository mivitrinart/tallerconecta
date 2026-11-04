"use client";
/**
 * Módulo 5 · Decisiones del cliente: aprobar, rechazar o APLAZAR cada trabajo.
 * "Autorizo solo frenos, no suspensión por ahora": el taller puede iniciar lo
 * aprobado; lo aplazado queda registrado y puede retomarse con una versión nueva.
 * Semáforo de criticidad: verde = urgente/seguridad, amarillo = recomendado
 * pronto, rojo = puede esperar.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Clock, Send, FileCheck2 } from "lucide-react";
import { Button, Alert, Badge } from "@/components/ui";
import { api } from "@/lib/api-client";
import { formatCOP } from "@/lib/format";
import type { Criticidad, EstimateItem } from "@/lib/database/types";
import { cn } from "@/lib/cn";

const TIPO_LABEL: Record<string, string> = {
  repuesto: "Repuesto",
  mano_obra: "Mano de obra",
  servicio: "Servicio",
  otro: "Otro",
};

export const CRITICIDAD_LABEL: Record<Criticidad, string> = {
  urgente: "Urgente · seguridad",
  recomendado: "Recomendado pronto",
  puede_esperar: "Puede esperar",
};

export const CRITICIDAD_BADGE: Record<Criticidad, string> = {
  urgente: "border-emerald-300 bg-emerald-50 text-emerald-700",
  recomendado: "border-amber-300 bg-amber-50 text-amber-700",
  puede_esperar: "border-red-200 bg-red-50 text-red-600",
};

export const CRITICIDAD_PUNTO: Record<Criticidad, string> = {
  urgente: "🟢",
  recomendado: "🟡",
  puede_esperar: "🔴",
};

type Decision = "aprobar" | "rechazar" | "postergar";

export function PortalApprovalPanel({
  estimateId,
  version,
  items,
  token,
  subtotal,
  descuento,
  impuestoPct,
  impuestos,
  total,
  validezDias,
}: {
  estimateId: string;
  version: number;
  items: Pick<
    EstimateItem,
    | "id" | "tipo" | "descripcion" | "cantidad" | "precio_unitario" | "subtotal"
    | "criticidad" | "alternativa_descripcion" | "alternativa_precio_unitario" | "taller_recomienda"
  >[];
  token: string;
  subtotal: number;
  descuento: number;
  impuestoPct: number;
  impuestos: number;
  total: number;
  validezDias: number;
}) {
  const router = useRouter();
  const [decisiones, setDecisiones] = useState<Record<string, Decision>>({});
  // Opción elegida por ítem con comparativa (por defecto: la que recomienda el taller)
  const [opciones, setOpciones] = useState<Record<string, "principal" | "alternativa">>(() => {
    const ini: Record<string, "principal" | "alternativa"> = {};
    for (const i of items) {
      if (i.alternativa_precio_unitario != null) ini[i.id] = i.taller_recomienda ?? "principal";
    }
    return ini;
  });
  const [comentario, setComentario] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const marcados = Object.keys(decisiones).length;
  const aprobados = Object.values(decisiones).filter((d) => d === "aprobar");
  const postergados = Object.values(decisiones).filter((d) => d === "postergar");

  // Total dinámico según lo que el cliente va aprobando
  const precioOpcion = (i: (typeof items)[number]) =>
    opciones[i.id] === "alternativa" && i.alternativa_precio_unitario != null
      ? i.alternativa_precio_unitario * i.cantidad
      : i.subtotal;
  const brutoSel = items
    .filter((i) => decisiones[i.id] === "aprobar")
    .reduce((s, i) => s + precioOpcion(i), 0);
  const brutoTotal = items.reduce((s, i) => s + i.subtotal, 0);
  const descProporcional = brutoTotal > 0 ? descuento * (brutoSel / brutoTotal) : 0;
  const baseSel = Math.max(0, brutoSel - descProporcional);
  const totalSel = Math.round(baseSel * (1 + impuestoPct / 100));

  function decidir(itemId: string, d: Decision) {
    setDecisiones((prev) => {
      const next = { ...prev };
      if (next[itemId] === d) delete next[itemId];
      else next[itemId] = d;
      return next;
    });
  }

  function aprobarTodo() {
    const all: Record<string, Decision> = {};
    for (const i of items) all[i.id] = "aprobar";
    setDecisiones(all);
  }

  async function enviar() {
    setLoading(true);
    setError(null);
    try {
      await api.post(`/api/presupuestos/${estimateId}/decision`, {
        token,
        decisiones: Object.entries(decisiones).map(([item_id, decision]) => ({
          item_id,
          decision,
          ...(decision === "aprobar" && opciones[item_id] ? { opcion: opciones[item_id] } : {}),
        })),
        comentario: comentario || undefined,
      });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar tu decisión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-amber-300 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-bold text-amber-800">
          <FileCheck2 className="h-4 w-4" /> Presupuesto v{version} · Necesitamos tu aprobación
        </p>
        <Badge className="border-amber-300 bg-white text-amber-700">Validez: {validezDias} días</Badge>
      </div>

      {/* Semáforo: por qué pagar cada trabajo */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-b border-slate-100 bg-slate-50 px-4 py-2 text-[11px] text-slate-500">
        <span>🟢 <strong>Urgente</strong>: seguridad / no circular</span>
        <span>🟡 <strong>Recomendado</strong>: hazlo pronto</span>
        <span>🔴 <strong>Puede esperar</strong>: planéalo</span>
      </div>

      <div className="divide-y divide-slate-100">
        {items.map((item) => {
          const dec = decisiones[item.id];
          const crit: Criticidad = item.criticidad ?? "recomendado";
          return (
            <div
              key={item.id}
              className={cn(
                "px-4 py-3",
                dec === "aprobar" && "bg-emerald-50/60",
                dec === "rechazar" && "bg-red-50/60 opacity-75",
                dec === "postergar" && "bg-sky-50/60"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">
                    <span className="mr-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-500">{TIPO_LABEL[item.tipo]}</span>
                    {item.descripcion}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Badge className={CRITICIDAD_BADGE[crit]}>
                      {CRITICIDAD_PUNTO[crit]} {CRITICIDAD_LABEL[crit]}
                    </Badge>
                    <span className="text-xs text-slate-400">
                      {item.cantidad} × {formatCOP(item.precio_unitario)} = <strong className="text-slate-600">{formatCOP(item.subtotal)}</strong>
                    </span>
                  </p>
                  {item.alternativa_precio_unitario != null && (
                    <div className="mt-2 space-y-1.5">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Compara y elige — el poder de decisión es tuyo
                      </p>
                      {([
                        { op: "principal" as const, titulo: "Original", desc: item.descripcion, precio: item.precio_unitario },
                        { op: "alternativa" as const, titulo: "Homologado", desc: item.alternativa_descripcion ?? "Alternativa homologada", precio: item.alternativa_precio_unitario! },
                      ]).map((o) => {
                        const sel = (opciones[item.id] ?? "principal") === o.op;
                        const recomendada = item.taller_recomienda === o.op;
                        return (
                          <button
                            key={o.op}
                            type="button"
                            onClick={() => setOpciones((prev) => ({ ...prev, [item.id]: o.op }))}
                            className={cn(
                              "flex w-full items-center justify-between gap-2 rounded-xl border-2 px-3 py-2 text-left transition-colors",
                              sel ? "border-brand-500 bg-brand-50" : "border-slate-200 bg-white hover:border-slate-300"
                            )}
                          >
                            <span className="min-w-0">
                              <span className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-slate-700">
                                {o.titulo}
                                {recomendada && (
                                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                    ⭐ Lo recomienda el taller
                                  </span>
                                )}
                                {sel && <span className="text-[10px] font-bold text-brand-600">✓ Tu elección</span>}
                              </span>
                              <span className="block truncate text-[11px] text-slate-400">{o.desc}</span>
                            </span>
                            <span className="shrink-0 text-sm font-extrabold tabular-nums text-slate-800">
                              {formatCOP(o.precio)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    onClick={() => decidir(item.id, "aprobar")}
                    aria-label={`Aprobar ${item.descripcion}`}
                    title="Aprobar"
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl border-2 transition-colors",
                      dec === "aprobar" ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-200 text-slate-400 hover:border-emerald-400 hover:text-emerald-500"
                    )}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => decidir(item.id, "postergar")}
                    aria-label={`Aplazar ${item.descripcion}`}
                    title="Por ahora no — decidir después (el taller avanzará con lo que apruebes)"
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl border-2 transition-colors",
                      dec === "postergar" ? "border-sky-500 bg-sky-500 text-white" : "border-slate-200 text-slate-400 hover:border-sky-400 hover:text-sky-500"
                    )}
                  >
                    <Clock className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => decidir(item.id, "rechazar")}
                    aria-label={`Rechazar ${item.descripcion}`}
                    title="Rechazar"
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl border-2 transition-colors",
                      dec === "rechazar" ? "border-red-500 bg-red-500 text-white" : "border-slate-200 text-slate-400 hover:border-red-400 hover:text-red-500"
                    )}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {dec === "postergar" && (
                <p className="mt-1.5 text-[11px] font-medium text-sky-600">
                  Aplazado: el taller podrá avanzarlo después con una nueva autorización.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-3 border-t border-slate-100 bg-slate-50 px-4 py-4">
        <div className="flex justify-between text-sm text-slate-500">
          <span>Subtotal</span><span className="tabular-nums">{formatCOP(subtotal + descuento)}</span>
        </div>
        {descuento > 0 && (
          <div className="flex justify-between text-sm text-emerald-600">
            <span>Descuento</span><span className="tabular-nums">−{formatCOP(descuento)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm text-slate-500">
          <span>IVA ({impuestoPct}%)</span><span className="tabular-nums">{formatCOP(impuestos)}</span>
        </div>
        <div className="flex justify-between border-t border-slate-200 pt-2 text-lg font-extrabold text-slate-900">
          <span>Total del presupuesto</span><span className="tabular-nums">{formatCOP(total)}</span>
        </div>
        {marcados > 0 && (
          <div className="flex justify-between rounded-xl bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700">
            <span>
              Tu selección: {aprobados.length} aprobado{aprobados.length === 1 ? "" : "s"}
              {postergados.length > 0 && ` · ${postergados.length} aplazado${postergados.length === 1 ? "" : "s"}`}
            </span>
            <span className="tabular-nums">{formatCOP(totalSel)}</span>
          </div>
        )}

        <textarea
          className="input"
          rows={2}
          placeholder="¿Tienes dudas o un comentario? (opcional) — también puedes usar la sección de mensajes"
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
        />

        {error && <Alert tone="error">{error}</Alert>}

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={aprobarTodo} disabled={loading}>
            Aprobar todo
          </Button>
          <Button className="flex-1" onClick={enviar} loading={loading} disabled={marcados === 0 || loading}>
            <Send className="h-4 w-4" />
            {marcados === 0 ? "Marca qué apruebas, aplazas o rechazas" : `Enviar mi decisión (${marcados}/${items.length})`}
          </Button>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-400">
          ✓ Aprobar · ⏰ Después (el taller avanza con lo aprobado y te propondrá lo aplazado más adelante) · ✗ Rechazar.
          Tu decisión queda registrada con fecha, versión autorizada y tu nombre. Si el taller cambia el precio o el
          alcance, recibirás una versión nueva que deberás aprobar de nuevo.
        </p>
      </div>
    </div>
  );
}
