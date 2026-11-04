"use client";
/**
 * Módulo 3, paso 1 · Recepción del vehículo.
 * Registra cliente, vehículo, kilometraje, motivo de ingreso y observaciones.
 */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Search, ArrowLeft, CarFront, UserPlus } from "lucide-react";
import { Button, Field, Alert, Card, CardBody } from "@/components/ui";
import { api } from "@/lib/api-client";
import type { Customer, User, Vehicle } from "@/lib/database/types";

interface Props {
  customers: Pick<Customer, "id" | "nombre" | "telefono" | "correo">[];
  vehicles: Pick<Vehicle, "id" | "customer_id" | "placa" | "marca" | "modelo" | "anio" | "kilometraje" | "tipo" | "origen">[];
  staff: Pick<User, "id" | "nombre">[];
}

const HOY = new Date().toISOString().slice(0, 10);
const EN_3_DIAS = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);

export function NewOrderForm({ customers, vehicles, staff }: Props) {
  const router = useRouter();

  const [modoCliente, setModoCliente] = useState<"existente" | "nuevo">(customers.length ? "existente" : "nuevo");
  const [customerId, setCustomerId] = useState("");
  const [busqCliente, setBusqCliente] = useState("");
  const [nuevoCliente, setNuevoCliente] = useState({ nombre: "", telefono: "", correo: "", documento: "" });

  const [modoVehiculo, setModoVehiculo] = useState<"existente" | "nuevo">("existente");
  const [vehicleId, setVehicleId] = useState("");
  const [nuevoVehiculo, setNuevoVehiculo] = useState({ placa: "", tipo: "carro" as "carro" | "moto" | "otro", marca: "", modelo: "", anio: new Date().getFullYear(), color: "" });

  const [kilometraje, setKilometraje] = useState<string>("");
  const [motivo, setMotivo] = useState("");
  const [sintomas, setSintomas] = useState("");
  const [fechaEstimada, setFechaEstimada] = useState(EN_3_DIAS);
  const [responsableId, setResponsableId] = useState("");
  const [notas, setNotas] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const clientesFiltrados = useMemo(() => {
    const q = busqCliente.toLowerCase();
    return customers.filter(
      (c) => !q || c.nombre.toLowerCase().includes(q) || c.telefono.includes(q) || c.correo.toLowerCase().includes(q)
    );
  }, [busqCliente, customers]);

  const vehiculosDisponibles = useMemo(() => {
    if (modoCliente === "nuevo") return [];
    return vehicles.filter((v) => v.customer_id === customerId);
  }, [customerId, modoCliente, vehicles]);

  const vehiculoSeleccionado = vehicles.find((v) => v.id === vehicleId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        customer_id: modoCliente === "existente" ? customerId : undefined,
        new_customer: modoCliente === "nuevo" ? nuevoCliente : undefined,
        vehicle_id: modoVehiculo === "existente" ? vehicleId : undefined,
        new_vehicle:
          modoVehiculo === "nuevo"
            ? { ...nuevoVehiculo, customer_id: customerId || undefined, kilometraje: Number(kilometraje) || 0 }
            : undefined,
        kilometraje: kilometraje ? Number(kilometraje) : undefined,
        motivo_ingreso: motivo,
        sintomas,
        fecha_estimada_entrega: fechaEstimada,
        responsable_id: responsableId,
        notas_internas: notas,
      };
      const res = await api.post<{ redirect: string; numero: string }>("/api/ordenes", payload);
      router.push(res.redirect);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar la recepción.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Cliente */}
      <Card>
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <UserPlus className="h-4 w-4 text-brand-600" /> 1 · Cliente
            </p>
            <div className="flex rounded-lg border border-slate-200 p-0.5 text-xs font-medium">
              {(["existente", "nuevo"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setModoCliente(m); setCustomerId(""); setVehicleId(""); setModoVehiculo(m === "nuevo" ? "nuevo" : "existente"); }}
                  className={`rounded-md px-3 py-1.5 ${modoCliente === m ? "bg-brand-600 text-white" : "text-slate-500 hover:text-slate-800"}`}
                >
                  {m === "existente" ? "Ya registrado" : "Cliente nuevo"}
                </button>
              ))}
            </div>
          </div>

          {modoCliente === "existente" ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input className="input pl-9!" placeholder="Buscar por nombre, teléfono o correo…" value={busqCliente} onChange={(e) => setBusqCliente(e.target.value)} />
              </div>
              <div className="max-h-52 space-y-1.5 overflow-y-auto rounded-xl border border-slate-100 p-1.5">
                {clientesFiltrados.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setCustomerId(c.id); setVehicleId(""); }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${customerId === c.id ? "bg-brand-50 font-semibold text-brand-700 ring-1 ring-brand-200" : "hover:bg-slate-50"}`}
                  >
                    <span>{c.nombre}</span>
                    <span className="text-xs text-slate-400">{c.telefono}</span>
                  </button>
                ))}
                {clientesFiltrados.length === 0 && (
                  <p className="px-3 py-4 text-center text-sm text-slate-400">Sin resultados. Puedes crear un cliente nuevo.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nombre completo" required>
                <input className="input" required value={nuevoCliente.nombre} onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })} placeholder="María Gómez" />
              </Field>
              <Field label="Teléfono (WhatsApp)" required>
                <input className="input" required value={nuevoCliente.telefono} onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })} placeholder="+57 310 555 4821" />
              </Field>
              <Field label="Correo electrónico" required>
                <input className="input" type="email" required value={nuevoCliente.correo} onChange={(e) => setNuevoCliente({ ...nuevoCliente, correo: e.target.value })} placeholder="maria@example.co" />
              </Field>
              <Field label="Documento (opcional)">
                <input className="input" value={nuevoCliente.documento} onChange={(e) => setNuevoCliente({ ...nuevoCliente, documento: e.target.value })} />
              </Field>
              <p className="text-xs text-slate-400 sm:col-span-2">
                El cliente recibirá un enlace personal de seguimiento y notificaciones en cada cambio real de estado.
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Vehículo */}
      <Card>
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <CarFront className="h-4 w-4 text-brand-600" /> 2 · Vehículo
            </p>
            {modoCliente === "existente" && customerId && vehiculosDisponibles.length > 0 && (
              <div className="flex rounded-lg border border-slate-200 p-0.5 text-xs font-medium">
                {(["existente", "nuevo"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setModoVehiculo(m); setVehicleId(""); }}
                    className={`rounded-md px-3 py-1.5 ${modoVehiculo === m ? "bg-brand-600 text-white" : "text-slate-500 hover:text-slate-800"}`}
                  >
                    {m === "existente" ? "Ya registrado" : "Vehículo nuevo"}
                  </button>
                ))}
              </div>
            )}
          </div>

          {modoVehiculo === "existente" ? (
            vehiculosDisponibles.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {vehiculosDisponibles.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => { setVehicleId(v.id); setKilometraje(String(v.kilometraje)); }}
                    className={`rounded-xl border px-4 py-3 text-left text-sm ${vehicleId === v.id ? "border-brand-400 bg-brand-50 ring-1 ring-brand-200" : "border-slate-200 hover:border-brand-200"}`}
                  >
                    <p className="font-bold text-slate-800">{v.placa}</p>
                    <p className="text-xs text-slate-500">
                      {v.marca} {v.modelo} · {v.anio} · {v.kilometraje.toLocaleString("es-CO")} km
                      {v.origen === "cliente" && <span className="ml-1 font-semibold text-sky-600">· registrado por el cliente ✓ verifícalo en la recepción</span>}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-slate-300 px-4 py-5 text-center text-sm text-slate-400">
                {customerId ? "Este cliente no tiene vehículos registrados. Agrega uno nuevo." : "Selecciona primero un cliente."}
              </p>
            )
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Placa" required>
                <input className="input uppercase" required value={nuevoVehiculo.placa} onChange={(e) => setNuevoVehiculo({ ...nuevoVehiculo, placa: e.target.value.toUpperCase() })} placeholder="ABC-456" />
              </Field>
              <Field label="Tipo" required>
                <select className="input" value={nuevoVehiculo.tipo} onChange={(e) => setNuevoVehiculo({ ...nuevoVehiculo, tipo: e.target.value as typeof nuevoVehiculo.tipo })}>
                  <option value="carro">Carro</option>
                  <option value="moto">Moto</option>
                  <option value="otro">Otro</option>
                </select>
              </Field>
              <Field label="Color">
                <input className="input" value={nuevoVehiculo.color} onChange={(e) => setNuevoVehiculo({ ...nuevoVehiculo, color: e.target.value })} placeholder="Rojo" />
              </Field>
              <Field label="Marca" required>
                <input className="input" required value={nuevoVehiculo.marca} onChange={(e) => setNuevoVehiculo({ ...nuevoVehiculo, marca: e.target.value })} placeholder="Mazda" />
              </Field>
              <Field label="Modelo" required>
                <input className="input" required value={nuevoVehiculo.modelo} onChange={(e) => setNuevoVehiculo({ ...nuevoVehiculo, modelo: e.target.value })} placeholder="3" />
              </Field>
              <Field label="Año" required>
                <input className="input" type="number" required min={1950} max={new Date().getFullYear() + 2} value={nuevoVehiculo.anio} onChange={(e) => setNuevoVehiculo({ ...nuevoVehiculo, anio: Number(e.target.value) })} />
              </Field>
            </div>
          )}

          <Field label="Kilometraje de ingreso" hint={vehiculoSeleccionado ? `Último registro: ${vehiculoSeleccionado.kilometraje.toLocaleString("es-CO")} km` : "Se guarda en la ficha del vehículo"}>
            <input className="input sm:max-w-xs" type="number" min={0} value={kilometraje} onChange={(e) => setKilometraje(e.target.value)} placeholder="62.300" />
          </Field>
        </CardBody>
      </Card>

      {/* Datos del servicio */}
      <Card>
        <CardBody className="space-y-4">
          <p className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <Plus className="h-4 w-4 text-brand-600" /> 3 · Datos del servicio
          </p>
          <Field label="Motivo de ingreso" required>
            <input className="input" required minLength={5} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: Ruidos en suspensión delantera" />
          </Field>
          <Field label="Síntomas reportados por el cliente">
            <textarea className="input" rows={2} value={sintomas} onChange={(e) => setSintomas(e.target.value)} placeholder="Ej: Golpe seco al pasar baches, más notorio en frío" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Fecha estimada de entrega" hint="Es una estimación, no una promesa">
              <input className="input" type="date" min={HOY} value={fechaEstimada} onChange={(e) => setFechaEstimada(e.target.value)} />
            </Field>
            <Field label="Mecánico responsable (opcional)">
              <select className="input" value={responsableId} onChange={(e) => setResponsableId(e.target.value)}>
                <option value="">Sin asignar</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </Field>
            <Field label="Daños visibles / observaciones" className="sm:col-span-1">
              <input className="input" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej: Rayón puerta trasera izquierda" />
            </Field>
          </div>
        </CardBody>
      </Card>

      {error && <Alert tone="error" title="No se pudo registrar la recepción">{error}</Alert>}

      <div className="flex items-center justify-between gap-3">
        <Link href="/taller/ordenes" className="btn-ghost">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
        <Button type="submit" size="lg" loading={loading}>
          Registrar recepción y notificar al cliente
        </Button>
      </div>
    </form>
  );
}
