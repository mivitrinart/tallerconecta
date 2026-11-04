"use client";
/**
 * Cuenta del cliente · Mis vehículos.
 * El cliente registra la información del carro/moto que usa; los datos quedan
 * visibles en el panel del taller correspondiente (marcados como "registrado
 * por el cliente") para agilizar la recepción de órdenes.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CarFront, Pencil, Plus, UserRoundCheck, Truck, Bike, Settings, Eye, Trash2 } from "lucide-react";
import { Button, Field, Modal, Alert, Badge, Card, CardHeader, CardBody } from "@/components/ui";
import { api } from "@/lib/api-client";
import { formatKm } from "@/lib/format";
import type { Vehicle } from "@/lib/database/types";

export interface FichaVehiculos {
  customer_id: string;
  customer_nombre: string;
  workshop_nombre: string;
  vehicles: Vehicle[];
}

interface FormState {
  customer_id: string;
  placa: string;
  tipo: "carro" | "moto" | "otro";
  marca: string;
  modelo: string;
  anio: number;
  kilometraje: number;
  color: string;
}

const VACIO = (fichas: FichaVehiculos[]): FormState => ({
  customer_id: fichas[0]?.customer_id ?? "",
  placa: "",
  tipo: "carro",
  marca: "",
  modelo: "",
  anio: new Date().getFullYear(),
  kilometraje: 0,
  color: "",
});

const TIPO_ICON: Record<string, React.ReactNode> = {
  carro: <CarFront className="h-5 w-5" />,
  moto: <Bike className="h-5 w-5" />,
  otro: <Truck className="h-5 w-5" />,
};

const TIPO_LABEL: Record<string, string> = { carro: "Carro", moto: "Moto", otro: "Otro" };
const TIPO_COLOR: Record<string, string> = { carro: "brand", moto: "sky", otro: "amber" };

export function MyVehiclesPanel({ accountId, fichas }: { accountId: string; fichas: FichaVehiculos[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Vehicle | null>(null);
  const [form, setForm] = useState<FormState>(VACIO(fichas));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function abrirNuevo() {
    setEditando(null);
    setForm(VACIO(fichas));
    setError(null);
    setOpen(true);
  }

  function abrirEdicion(v: Vehicle) {
    setEditando(v);
    setForm({
      customer_id: v.customer_id,
      placa: v.placa,
      tipo: v.tipo,
      marca: v.marca,
      modelo: v.modelo,
      anio: v.anio,
      kilometraje: v.kilometraje,
      color: v.color ?? "",
    });
    setError(null);
    setOpen(true);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (editando) {
        const { customer_id: _cid, ...patch } = form;
        await api.patch(`/api/cuenta/vehiculos/${editando.id}`, patch);
      } else {
        await api.post("/api/cuenta/vehiculos", form);
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el vehículo.");
    } finally {
      setLoading(false);
    }
  }

  const total = fichas.reduce((s, f) => s + f.vehicles.length, 0);
  const tieneVehiculos = total > 0;
  const tieneFichas = fichas.length > 0;

  return (
    <div className="space-y-6">
      {/* Header con resumen */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <CarFront className="h-6 w-6 text-brand-600" />
            Mis vehículos
            {tieneVehiculos && <Badge className="ml-2 bg-brand-100 text-brand-700">{total}</Badge>}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Registra la información de tu carro o moto: el taller la verá en su panel al atenderte,
            agilizando la recepción y evitando errores de digitación.
          </p>
        </div>
        {tieneFichas && (
          <Button onClick={abrirNuevo} className="whitespace-nowrap">
            <Plus className="h-4 w-4" /> Agregar vehículo
          </Button>
        )}
      </div>

      {/* Tarjetas por ficha/taller */}
      {tieneFichas ? (
        <div className="space-y-6">
          {fichas.map((f) => (
            <Card key={f.customer_id} className="panel overflow-hidden">
              <CardHeader
                title={f.workshop_nombre}
                subtitle={f.vehicles.length > 0 ? `${f.vehicles.length} vehículo(s) registrado(s)` : "Sin vehículos registrados"}
                icon={TIPO_ICON.carro}
              />
              <CardBody className="pt-0">
                {f.vehicles.length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                      <CarFront className="h-7 w-7 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-900">No hay vehículos en esta ficha</p>
                    <p className="mt-1 text-xs text-slate-500">Agrega tu primer vehículo para que el taller lo tenga listo al recibirte.</p>
                    <Button className="mt-3" size="sm" onClick={abrirNuevo}>
                      <Plus className="h-3.5 w-3.5" /> Agregar vehículo
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {f.vehicles.map((v) => {
                      const mio = v.origen === "cliente" && v.registrado_por_account_id === accountId;
                      const tipoColor = TIPO_COLOR[v.tipo] as "brand" | "sky" | "amber";
                      return (
                        <div key={v.id} className="group relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-lg transition-all duration-200">
                          {/* Badge de tipo de vehículo */}
                          <div className="absolute top-3 right-3">
                            <span className={`inline-flex h-5 w-5 items-center justify-center rounded-lg bg-${tipoColor}-100 text-${tipoColor}-600`}>
                              {TIPO_ICON[v.tipo]}
                            </span>
                          </div>

                          <div className="mb-4">
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="flex shrink-0 items-center justify-center rounded-lg bg-slate-100 px-3 py-1.5 font-mono text-sm font-bold tracking-wider text-slate-900">
                                {v.placa}
                              </span>
                              {mio && (
                                <Badge className="border-sky-200 bg-sky-50 text-sky-700 flex items-center gap-1">
                                  <UserRoundCheck className="h-3 w-3" /> Tu registro
                                </Badge>
                              )}
                            </div>
                            <p className="text-base font-semibold text-slate-900 leading-snug">
                              {v.marca} {v.modelo} <span className="font-normal text-slate-400">({v.anio})</span>
                            </p>
                          </div>

                          <div className="space-y-2 text-sm text-slate-600">
                            <div className="flex items-center gap-2">
                              {TIPO_ICON[v.tipo]}
                              <span className="font-medium text-slate-800">{TIPO_LABEL[v.tipo]}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <span className="font-mono">{formatKm(v.kilometraje)}</span>
                              {v.color && <span>· {v.color}</span>}
                            </div>
                          </div>

                          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Eye className="h-3 w-3" /> Visible para {f.workshop_nombre}
                            </span>
                            {mio && (
                              <button
                                onClick={() => abrirEdicion(v)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50"
                                title="Editar mi vehículo"
                              >
                                <Pencil className="h-3.5 w-3.5" /> Editar
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        /* Estado vacío - sin talleres vinculados */
        <Card className="panel border-dashed border-slate-300 bg-slate-50/50">
          <CardBody className="py-12 px-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              <CarFront className="h-8 w-8 text-slate-400" />
            </div>
            <h4 className="text-lg font-semibold text-slate-900">Primero vincula un taller</h4>
            <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
              Para registrar tus vehículos necesitas tener al menos un taller vinculado a tu cuenta.
              Ve a la sección <strong>«Mi perfil»</strong> y usa el botón <strong>«Vincular enlace personal»</strong>.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button variant="secondary" onClick={() => document.getElementById('mi-perfil')?.scrollIntoView({ behavior: 'smooth' })}>
                <Settings className="h-4 w-4" /> Ir a mi perfil
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Modal registrar/editar vehículo */}
      <Modal open={open} onClose={() => setOpen(false)} title={editando ? `Editar ${editando.marca} {editando.modelo}` : "Registrar mi vehículo"} wide>
        <form onSubmit={guardar} className="space-y-5">
          {!editando && fichas.length > 1 && (
            <Field label="¿En cuál de tus fichas lo registras?" required>
              <select className="input" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
                {fichas.map((f) => (
                  <option key={f.customer_id} value={f.customer_id}>
                    {f.workshop_nombre} — {f.customer_nombre}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Placa" required>
              <div className="relative">
                <Settings className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  className="input pl-10 uppercase"
                  required
                  minLength={4}
                  maxLength={10}
                  value={form.placa}
                  onChange={(e) => setForm({ ...form, placa: e.target.value.toUpperCase() })}
                  placeholder="ABC-456"
                />
              </div>
            </Field>
            <Field label="Tipo" required>
              <select className="input" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as FormState["tipo"] })}>
                <option value="carro">🚗 Carro</option>
                <option value="moto">🏍️ Moto</option>
                <option value="otro">🚚 Otro</option>
              </select>
            </Field>
            <Field label="Marca" required>
              <input className="input" required minLength={2} value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} placeholder="Mazda, Toyota, AKT..." />
            </Field>
            <Field label="Modelo" required>
              <input className="input" required value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} placeholder="3, CX-5, NKD..." />
            </Field>
            <Field label="Año" required>
              <input className="input" type="number" required min={1950} max={new Date().getFullYear() + 2} value={form.anio || ""} onChange={(e) => setForm({ ...form, anio: Number(e.target.value) })} placeholder={new Date().getFullYear().toString()} />
            </Field>
            <Field label="Kilometraje actual" required>
              <input className="input" type="number" required min={0} value={form.kilometraje || ""} onChange={(e) => setForm({ ...form, kilometraje: Number(e.target.value) })} placeholder="0" />
            </Field>
            <Field label="Color" className="sm:col-span-2">
              <input className="input" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="Rojo, Azul, Negro (opcional)" />
            </Field>
          </div>

          <Alert tone="info" className="flex items-start gap-3">
            <div className="flex shrink-0 mt-0.5">
              <Eye className="h-5 w-5 text-brand-600" />
            </div>
            <div className="text-sm text-slate-700">
              <p className="font-medium">El taller verá estos datos en su panel marcados como <strong>"registrado por el cliente"</strong>.</p>
              <p className="mt-1">Verificarán la información cuando lleves el vehículo (la placa no es un identificador único: puede haber cambios de matrícula o errores de digitación).</p>
            </div>
          </Alert>

          {error && <Alert tone="error">{error}</Alert>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={loading} className="min-w-[160px]">
              {editando ? "Guardar cambios" : "Registrar vehículo"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
