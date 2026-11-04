"use client";
/** Controles del panel del taller para una orden: asignar, notas, fecha estimada y entrega. */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PackageCheck, Save, UserRound } from "lucide-react";
import { Button, Field, Modal, Alert, Stars } from "@/components/ui";
import { api } from "@/lib/api-client";
import { formatCOP } from "@/lib/format";
import type { ServiceOrder, User } from "@/lib/database/types";

export function AssignControl({ orderId, staff, actual }: { orderId: string; staff: Pick<User, "id" | "nombre">[]; actual?: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState(actual ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex items-end gap-2">
      <Field label="Mecánico responsable" className="flex-1">
        <div className="relative">
          <UserRound className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <select className="input pl-9!" value={value} onChange={(e) => setValue(e.target.value)}>
            <option value="">Sin asignar</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        </div>
      </Field>
      <Button
        variant="secondary"
        disabled={loading || value === (actual ?? "")}
        onClick={async () => {
          setLoading(true);
          setError(null);
          try {
            await api.post(`/api/ordenes/${orderId}/asignar`, { responsable_id: value });
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "No se pudo asignar.");
          } finally {
            setLoading(false);
          }
        }}
      >
        Asignar
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function NotesControl({ orderId, order }: { orderId: string; order: { notas_internas?: string | null; fecha_estimada_entrega?: string | null } }) {
  const router = useRouter();
  const [notas, setNotas] = useState(order.notas_internas ?? "");
  const [fecha, setFecha] = useState(order.fecha_estimada_entrega ? order.fecha_estimada_entrega.slice(0, 10) : "");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const sucio = notas !== (order.notas_internas ?? "") || fecha !== (order.fecha_estimada_entrega ? order.fecha_estimada_entrega.slice(0, 10) : "");

  return (
    <div className="space-y-3">
      <Field label="Fecha estimada de entrega" hint="Siempre se muestra como estimación, nunca como promesa">
        <input className="input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </Field>
      <Field label="Notas internas (solo el taller)">
        <textarea className="input" rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej: cliente prefiere contacto por WhatsApp…" />
      </Field>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={!sucio || loading}
          loading={loading}
          onClick={async () => {
            setLoading(true);
            try {
              await api.post(`/api/ordenes/${orderId}/notas`, {
                notas_internas: notas,
                fecha_estimada_entrega: fecha ? new Date(`${fecha}T17:00:00`).toISOString() : null,
              });
              setSaved(true);
              setTimeout(() => setSaved(false), 2000);
              router.refresh();
            } finally {
              setLoading(false);
            }
          }}
        >
          <Save className="h-3.5 w-3.5" /> Guardar cambios
        </Button>
        {saved && <span className="text-xs font-medium text-emerald-600">Guardado ✓</span>}
      </div>
    </div>
  );
}

export function DeliverControl({ orderId, order, montoSugerido }: { orderId: string; order: { estado: ServiceOrder["estado"]; valor_final?: number | null }; montoSugerido: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [valor, setValor] = useState(montoSugerido);
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (order.estado !== "listo_entrega") return null;

  return (
    <>
      <Button variant="success" onClick={() => setOpen(true)}>
        <PackageCheck className="h-4 w-4" /> Registrar entrega
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Entrega y cierre del servicio">
        <div className="space-y-4">
          <Alert tone="info">
            Al confirmar: la orden pasa a <strong>Entregado</strong>, se registra el valor final y el cliente
            recibe el aviso para calificar el servicio.
          </Alert>
          <Field label="Valor final cobrado (COP)" required>
            <input className="input" type="number" min={0} step={1000} value={valor || ""} onChange={(e) => setValor(Number(e.target.value))} />
            <p className="mt-1 text-xs text-slate-400">Sugerido según lo autorizado: {formatCOP(montoSugerido)}</p>
          </Field>
          <Field label="Nota de entrega (opcional)">
            <input className="input" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: Se entrega con garantía de 3 meses sobre la mano de obra" />
          </Field>
          {error && <Alert tone="error">{error}</Alert>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              variant="success"
              loading={loading}
              onClick={async () => {
                setLoading(true);
                setError(null);
                try {
                  await api.post(`/api/ordenes/${orderId}/entregar`, { valor_final: valor, nota });
                  setOpen(false);
                  router.refresh();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "No se pudo registrar la entrega.");
                } finally {
                  setLoading(false);
                }
              }}
            >
              <PackageCheck className="h-4 w-4" /> Confirmar entrega · {formatCOP(valor)}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

/** Calificación del cliente mostrada al taller (solo lectura). */
export function RatingView({ valor, comentario }: { valor: number | null | undefined; comentario?: string | null }) {
  if (!valor) return <p className="text-sm text-slate-400">El cliente aún no ha calificado el servicio.</p>;
  return (
    <div>
      <Stars value={valor} size={18} />
      {comentario && <p className="mt-1.5 text-sm italic text-slate-600">“{comentario}”</p>}
    </div>
  );
}
