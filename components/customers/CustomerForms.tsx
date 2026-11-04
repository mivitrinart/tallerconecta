"use client";
/** Módulo 2 · Alta de clientes y vehículos desde el panel del taller. */
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, UserPlus, CarFront, Copy, Check } from "lucide-react";
import { Button, Field, Modal, Alert } from "@/components/ui";
import { api } from "@/lib/api-client";

export function NewCustomerButton({ autoOpen }: { autoOpen?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(Boolean(autoOpen));
  const [form, setForm] = useState({ nombre: "", telefono: "", correo: "", documento: "" });
  const [error, setError] = useState<string | null>(null);
  const [creado, setCreado] = useState<{ portal: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ id: string; portal: string }>("/api/clientes", form);
      setCreado({ portal: res.portal });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el cliente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" /> Nuevo cliente
      </Button>
      <Modal open={open} onClose={() => { setOpen(false); setCreado(null); }} title={creado ? "Cliente creado ✓" : "Nuevo cliente"}>
        {creado ? (
          <div className="space-y-4">
            <Alert tone="success" title="Listo">
              El cliente quedó registrado. Comparte su enlace personal de seguimiento:
            </Alert>
            <CopyBox label="Enlace del portal del cliente" value={`${window.location.origin}${creado.portal}`} />
            <div className="flex justify-end">
              <Button onClick={() => { setOpen(false); setCreado(null); }}>Cerrar</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <Field label="Nombre completo" required>
              <input className="input" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="María Gómez" />
            </Field>
            <Field label="Teléfono (WhatsApp)" required>
              <input className="input" required value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="+57 310 555 4821" />
            </Field>
            <Field label="Correo electrónico" required>
              <input className="input" type="email" required value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} placeholder="maria@example.co" />
            </Field>
            <Field label="Documento (opcional)">
              <input className="input" value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} />
            </Field>
            <Alert tone="info">
              Ley 1581 de 2012: al registrar, el taller declara contar con la autorización previa del cliente para
              tratar sus datos con la finalidad de prestar el servicio. La plataforma guarda constancia de la fecha y
              el origen del consentimiento.{" "}
              <a href="/legal/privacidad" target="_blank" className="font-semibold underline">Ver política</a>.
            </Alert>
            {error && <Alert tone="error">{error}</Alert>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" loading={loading}>Crear cliente</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

export function CopyBox({ label, value }: { label: string; value: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div>
      <p className="label">{label}</p>
      <div className="flex gap-2">
        <input className="input font-mono text-xs" readOnly value={value} onFocus={(e) => e.target.select()} />
        <Button
          type="button"
          variant="secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopiado(true);
              setTimeout(() => setCopiado(false), 1500);
            } catch {
              /* clipboard no disponible */
            }
          }}
        >
          {copiado ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
