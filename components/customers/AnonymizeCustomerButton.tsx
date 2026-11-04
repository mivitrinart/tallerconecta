"use client";
/**
 * Solicitud de supresión de datos (Ley 1581 de 2012).
 * Solo el propietario del taller. Anonimiza contactos, invalida el enlace
 * personal y conserva el historial por obligación legal.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldOff } from "lucide-react";
import { Button, Modal, Alert } from "@/components/ui";
import { api } from "@/lib/api-client";

export function AnonymizeCustomerButton({ customerId, customerNombre }: { customerId: string; customerNombre: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function ejecutar() {
    setLoading(true);
    setError(null);
    try {
      await api.post(`/api/clientes/${customerId}/anonimizar`, {});
      setOpen(false);
      router.push("/taller/clientes");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo anonimizar la ficha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="ghost" className="text-slate-400! hover:text-red-600!" onClick={() => setOpen(true)}>
        <ShieldOff className="h-3.5 w-3.5" /> Solicitud de supresión de datos
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Anonimizar datos del cliente">
        <div className="space-y-4">
          <Alert tone="warning" title="Derecho de supresión · Ley 1581 de 2012">
            Se anonimizarán los datos de contacto de <strong>{customerNombre}</strong> (nombre, teléfono, correo y
            documento) y se invalidará su enlace personal de seguimiento.
          </Alert>
          <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
            <li>El <strong>historial de órdenes, autorizaciones y mensajes se conserva</strong>: es prueba de las decisiones del cliente y soporte de obligaciones legales y de garantía.</li>
            <li>No se puede anonimizar si el cliente tiene órdenes activas: ciérralas o cancélalas primero.</li>
            <li>La acción queda registrada en la auditoría y no se puede deshacer.</li>
          </ul>
          {error && <Alert tone="error">{error}</Alert>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="danger" loading={loading} onClick={ejecutar}>
              <ShieldOff className="h-4 w-4" /> Sí, anonimizar ficha
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
