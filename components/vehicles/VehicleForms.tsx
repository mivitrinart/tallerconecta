"use client";
/** Módulo 2 · Registro de vehículos desde el panel del taller. */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CarFront } from "lucide-react";
import { Button, Field, Modal, Alert } from "@/components/ui";
import { api } from "@/lib/api-client";

export function AddVehicleButton({ customerId, onCreated }: { customerId: string; onCreated?: (id: string) => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ placa: "", tipo: "carro" as "carro" | "moto" | "otro", marca: "", modelo: "", anio: new Date().getFullYear(), kilometraje: 0, color: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ id: string }>("/api/vehiculos", { ...form, customer_id: customerId });
      setOpen(false);
      router.refresh();
      onCreated?.(res.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el vehículo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <CarFront className="h-4 w-4" /> Agregar vehículo
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Registrar vehículo">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Placa" required>
              <input className="input uppercase" required value={form.placa} onChange={(e) => setForm({ ...form, placa: e.target.value.toUpperCase() })} placeholder="ABC-456" />
            </Field>
            <Field label="Tipo" required>
              <select className="input" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as typeof form.tipo })}>
                <option value="carro">Carro</option>
                <option value="moto">Moto</option>
                <option value="otro">Otro</option>
              </select>
            </Field>
            <Field label="Marca" required>
              <input className="input" required value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} placeholder="Mazda" />
            </Field>
            <Field label="Modelo" required>
              <input className="input" required value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} placeholder="3" />
            </Field>
            <Field label="Año" required>
              <input className="input" type="number" required min={1950} value={form.anio} onChange={(e) => setForm({ ...form, anio: Number(e.target.value) })} />
            </Field>
            <Field label="Kilometraje" required>
              <input className="input" type="number" required min={0} value={form.kilometraje || ""} onChange={(e) => setForm({ ...form, kilometraje: Number(e.target.value) })} />
            </Field>
          </div>
          <Field label="Color (opcional)">
            <input className="input" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="Rojo" />
          </Field>
          <Alert tone="info">La placa NO es la clave primaria: puede haber errores de digitación, cambios de matrícula o vehículos extranjeros.</Alert>
          {error && <Alert tone="error">{error}</Alert>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={loading}>Registrar vehículo</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

