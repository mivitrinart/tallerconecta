"use client";
/**
 * Control de cambio de estado (panel del taller).
 * Solo ofrece transiciones permitidas por la máquina de estados y exige
 * motivo para cancelar. El servidor revalida todo (regla fundamental).
 * Optimistic UI: muestra el nuevo estado inmediatamente y revierte si falla.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, X } from "lucide-react";
import { Button, Modal, Field, StatusBadge, Alert } from "@/components/ui";
import { api } from "@/lib/api-client";
import { ESTADO_DESCRIPCION, ESTADO_LABEL, TRANSICIONES } from "@/lib/orders/state-machine";
import type { EstadoOrden } from "@/lib/database/types";

export function StatusControl({
  orderId,
  estado,
  puedeCancelar = true,
  permitidos,
}: {
  orderId: string;
  estado: EstadoOrden;
  puedeCancelar?: boolean;
  /** Restricción adicional de rol (p. ej. mecánicos: solo avances). */
  permitidos?: EstadoOrden[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [destino, setDestino] = useState<EstadoOrden | "">("");
  const [motivo, setMotivo] = useState("");
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Optimistic UI: track pending state change
  const [pendingEstado, setPendingEstado] = useState<EstadoOrden | null>(null);

  const opciones = (TRANSICIONES[estado] ?? [])
    .filter((e) => (e === "cancelado" ? puedeCancelar : true))
    .filter((e) => (permitidos ? permitidos.includes(e) : true));

  const displayEstado = pendingEstado ?? estado;

  async function confirmar() {
    if (!destino) return;
    // Optimistic: set pending state immediately
    setPendingEstado(destino);
    setLoading(true);
    setError(null);
    try {
      await api.post(`/api/ordenes/${orderId}/estado`, { estado: destino, motivo, nota });
      // Success: clear pending, refresh to get server state
      setPendingEstado(null);
      setOpen(false);
      setDestino("");
      setMotivo("");
      setNota("");
      router.refresh();
    } catch (e) {
      // Rollback on error
      setPendingEstado(null);
      setError(e instanceof Error ? e.message : "No se pudo cambiar el estado.");
    } finally {
      setLoading(false);
    }
  }

  if (opciones.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <StatusBadge estado={displayEstado} />
        <span className="text-xs text-slate-400">Estado final</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge estado={displayEstado} />
        {pendingEstado && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700 animate-pulse">
            Actualizando…
          </span>
        )}
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)} disabled={loading || pendingEstado !== null}>
          <ArrowRightLeft className="h-3.5 w-3.5" /> Cambiar estado
        </Button>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Actualizar estado de la orden">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Estado actual: <StatusBadge estado={estado} />
          </p>
          <p className="text-xs text-slate-400">
            {ESTADO_DESCRIPCION[estado]}
          </p>

          <div className="space-y-2">
            <p className="label mb-0">Nuevo estado</p>
            {opciones.map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => setDestino(op)}
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-2.5 text-left text-sm font-medium transition-colors ${
                  destino === op
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : op === "cancelado"
                    ? "border-red-200 text-red-600 hover:bg-red-50"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {ESTADO_LABEL[op]}
                <span className="text-xs font-normal text-slate-400">{ESTADO_DESCRIPCION[op]}</span>
              </button>
            ))}
          </div>

          {destino === "cancelado" && (
            <Field label="Motivo de la cancelación" required hint="Queda registrado en el historial y se notifica al cliente.">
              <textarea className="input" rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: El cliente decidió no autorizar la reparación" />
            </Field>
          )}

          {destino && destino !== "cancelado" && (
            <Field label="Nota para el historial (opcional)">
              <input className="input" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: Se recibió el repuesto del proveedor" />
            </Field>
          )}

          {destino === "en_espera" && (
            <Field label="¿Qué falta?" hint="Se incluye en la notificación al cliente.">
              <input className="input" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: Repuesto pedido al proveedor, llega el jueves" />
            </Field>
          )}

          {error && <Alert tone="error">{error}</Alert>}
          {destino === "en_reparacion" && (
            <Alert tone="info">
              Recuerda: si hay un presupuesto pendiente de autorización, el sistema no permitirá iniciar la reparación.
            </Alert>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading || pendingEstado !== null}>
              <X className="h-4 w-4" /> Cancelar
            </Button>
            <Button onClick={confirmar} loading={loading} disabled={!destino || (destino === "cancelado" && motivo.trim().length < 3) || pendingEstado !== null} variant={destino === "cancelado" ? "danger" : "primary"}>
              Confirmar cambio
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
