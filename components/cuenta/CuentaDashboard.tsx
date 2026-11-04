"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Wrench, Building2, CarFront, ChevronDown, Bell, ShieldCheck, User, Settings, HelpCircle, AlertCircle, Trash } from "lucide-react";
import Link from "next/link";
import { AccountPanel, AutoLink, type Vinculo } from "@/components/customer/AccountPanel";
import { MyVehiclesPanel, type FichaVehiculos } from "@/components/customer/MyVehiclesPanel";
import { TallerProfileCard } from "@/components/customer/TallerProfileCard";
import { PortalNotifications, PortalOrders, PortalLegalFooter } from "@/components/customer/PortalSections";
import { PortalReadMarker } from "@/components/customer/PortalExtras";
import { LivePill } from "@/components/shared/LivePill";
import { Badge, Accordion, Button, StatCard, Card, CardHeader, CardBody, Modal, Field, Alert } from "@/components/ui";
import { ChatButton } from "@/components/customer/ChatButton";
import { ListaTalleresPublicos } from "@/components/cuenta/ListaTalleresPublicos";
import { SignOutButton } from "@/components/customer/SignOutButton";
import { esEstadoActivo } from "@/lib/orders/helpers";
import { listWorkshops } from "@/lib/database/queries";
import type { Workshop } from "@/lib/database/types";
import type { AccountVinculacion } from "@/lib/database/queries";
import { api } from "@/lib/api-client";

export function CuentaDashboard({
  account,
  vinculaciones,
  searchParams,
}: {
  account: { id: string; nombre: string; correo: string; telefono: string; consentimiento_datos_at: string | null; created_at: string };
  vinculaciones: AccountVinculacion[];
  searchParams: { vincular?: string };
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const vinculadosAceptados = vinculaciones.filter((v) => v.estado === "aceptado");
  const vinculadosPendientes = vinculaciones.filter((v) => v.estado === "pendiente");
  const vinculadosRechazados = vinculaciones.filter((v) => v.estado === "rechazado");

  const estadoPorTaller: Record<string, "pendiente" | "aceptado" | "rechazado"> = {};
  for (const v of vinculaciones) {
    if (!(v.portal.workshop.id in estadoPorTaller)) {
      estadoPorTaller[v.portal.workshop.id] = v.estado as any;
    }
  }

  const vinculos: Vinculo[] = vinculaciones.map((v) => ({
    customer_id: v.portal.customer.id,
    customer_nombre: v.portal.customer.nombre,
    workshop_nombre: v.portal.workshop.nombre,
    origen: v.linkOrigen,
    estado: v.estado,
  }));

  const fichas: FichaVehiculos[] = vinculadosAceptados.map((v) => ({
    customer_id: v.portal.customer.id,
    customer_nombre: v.portal.customer.nombre,
    workshop_nombre: v.portal.workshop.nombre,
    vehicles: v.vehicles,
  }));

  const ordenesActivas = vinculadosAceptados.reduce(
    (n, v) => n + v.portal.ordenes.filter((po) => esEstadoActivo(po.order.estado)).length,
    0,
  );
  const avisosNuevos = vinculadosAceptados.reduce(
    (n, v) => n + v.portal.notificaciones.filter((nt) => nt.estado === "pendiente").length,
    0,
  );
  const totalVehiculos = vinculadosAceptados.reduce((n, v) => n + v.vehicles.length, 0);

  let ordenActiva: { orderId: string; messages: any[]; token: string; numero: string } | null = null;
  for (const v of vinculadosAceptados) {
    const activa = v.portal.ordenes
      .filter((po) => po.order.estado !== "entregado" && po.order.estado !== "cancelado")
      .sort((a, b) => b.order.updated_at.localeCompare(a.order.updated_at))[0];
    if (activa) {
      ordenActiva = {
        orderId: activa.order.id,
        messages: activa.messages,
        token: v.portal.customer.portal_token ?? "",
        numero: activa.order.numero,
      };
      break;
    }
  }

  const tieneVinculaciones = vinculaciones.length > 0;

  const handleProfileSaved = () => {
    setRefreshKey((k) => k + 1);
  };

  const handleSaveSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsError(null);
    const formData = new FormData(e.currentTarget);
    const nombre = formData.get("nombre") as string;
    const telefono = formData.get("telefono") as string;
    const passwordActual = formData.get("passwordActual") as string;
    const passwordNueva = formData.get("passwordNueva") as string;
    const passwordConfirmar = formData.get("passwordConfirmar") as string;

    try {
      await api.patch("/api/cuenta/perfil", { nombre, telefono });

      if (passwordActual && passwordNueva && passwordConfirmar) {
        if (passwordNueva !== passwordConfirmar) {
          throw new Error("Las contraseñas no coinciden");
        }
        await api.patch("/api/cuenta/password", { passwordActual, passwordNueva, passwordConfirmar });
      }

      setSettingsOpen(false);
      handleProfileSaved();
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : "No se pudo guardar la configuración");
    } finally {
      setSavingSettings(false);
    }
  };

  const SECTIONS = [
    { id: "perfil" as const, label: "Mi perfil", icon: <User className="h-6 w-6" />, description: "Editar datos y vinculaciones" },
    { id: "vehiculos" as const, label: "Mis vehículos", icon: <CarFront className="h-6 w-6" />, description: `${totalVehiculos} registrado(s)` },
    { id: "seguimiento" as const, label: "Seguimiento", icon: <Wrench className="h-6 w-6" />, description: `${ordenesActivas} orden(es) activa(s)` },
    { id: "talleres" as const, label: "Más talleres", icon: <Building2 className="h-6 w-6" />, description: "Descubre otros talleres" },
  ] as const;

  const [activeSection, setActiveSection] = useState<"perfil" | "vehiculos" | "seguimiento" | "talleres">("perfil");

  return (
    <div className="min-h-screen bg-slate-50 page-fade-in" key={refreshKey}>
      <PortalReadMarker token={vinculadosAceptados[0]?.portal.customer.portal_token ?? ""} />

      <header className="border-b border-slate-200 bg-white sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/25">
                <Wrench className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  Taller Conecta
                  <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300" title="Esta ventana se actualiza automáticamente cada 15 segundos con los cambios reales del taller">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400"></span>
                    </span>
                    En vivo · se actualiza solo
                  </span>
                </p>
                <h1 className="mt-0.5 text-xl font-extrabold tracking-tight text-slate-900">Hola, {account.nombre.split(" ")[0]}</h1>
                <p className="mt-1 text-sm text-slate-500">Gestiona tus talleres, vehículos y seguimiento de servicios desde un solo lugar.</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSettingsOpen(true)}
                aria-label="Configuraciones"
                title="Configuraciones"
                className="text-violet-600 hover:text-violet-700 hover:bg-violet-50 p-2"
              >
                <Settings className="h-5 w-5" />
              </Button>
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {searchParams.vincular && <AutoLink token={searchParams.vincular} />}

        {/* ── Resumen de cuenta ── */}
        <section className="mb-10" aria-label="Resumen de tu cuenta">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Talleres vinculados"
              value={vinculadosAceptados.length}
              icon={<Building2 className="h-5 w-5 text-brand-600" />}
              sub={vinculadosPendientes.length > 0 ? `${vinculadosPendientes.length} solicitud(es) pendiente(s)` : "Todo al día"}
            />
            <StatCard
              label="Vehículos registrados"
              value={totalVehiculos}
              icon={<CarFront className="h-5 w-5 text-sky-600" />}
              sub="El taller los verá al recibirte"
            />
            <StatCard
              label="Órdenes activas"
              value={ordenesActivas}
              icon={<Wrench className="h-5 w-5 text-amber-600" />}
              sub="En diagnóstico, reparación o pendientes de tu aprobación"
            />
            <StatCard
              label="Avisos nuevos"
              value={avisosNuevos}
              icon={<Bell className="h-5 w-5 text-red-600" />}
              sub="El taller te notifica cuando avanza tu servicio"
            />
          </div>
        </section>

        {/* ── Acciones rápidas ── */}
        <section className="mb-10" aria-label="Acciones rápidas">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SECTIONS.map((s) => (
              <Button
                key={s.id}
                variant={activeSection === s.id ? "primary" : "secondary"}
                className="h-24 flex-col items-center justify-center gap-2 text-left px-4 transition-all hover:shadow-lg"
                onClick={() => setActiveSection(s.id)}
              >
                <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${activeSection === s.id ? "bg-brand-100 text-brand-600" : "bg-slate-100 text-slate-500"}`}>
                  {s.icon}
                </span>
                <span className="font-semibold text-sm">{s.label}</span>
                <span className="text-xs text-slate-400">{s.description}</span>
              </Button>
            ))}
          </div>
        </section>

        {/* ── Contenido de la sección activa ── */}
        <div className="animate-fade-in-up">
          {activeSection === "perfil" && (
            <div className="max-w-full">
              {/* Talleres vinculados (incluye info personal) */}
              <section id="talleres-vinculados" className="mb-10" aria-label="Tus talleres vinculados">
                <div className="mb-6">
                  <AccountPanel account={account as any} vinculos={vinculos} />
                </div>

                {tieneVinculaciones ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {vinculadosAceptados.map((v) => (
                      <TallerProfileCard
                        key={v.portal.customer.id}
                        workshop={v.portal.workshop}
                        estado="aceptado"
                        href={`#seguimiento-${v.portal.customer.id}`}
                      />
                    ))}
                    {vinculadosPendientes.map((v) => (
                      <TallerProfileCard key={v.portal.customer.id} workshop={v.portal.workshop} estado="pendiente" />
                    ))}
                    {vinculadosRechazados.map((v) => (
                      <TallerProfileCard key={v.portal.customer.id} workshop={v.portal.workshop} estado="rechazado" />
                    ))}
                  </div>
                ) : (
                  <Card className="border-dashed border-slate-300 bg-slate-50/50">
                    <CardBody className="py-12 px-6 text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                        <Building2 className="h-8 w-8 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900">Aún no tienes talleres vinculados</h3>
                      <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
                        Por privacidad, las fichas se vinculan <strong>solo con el enlace personal</strong> que te envió
                        tu taller (no por coincidencia de correo).
                      </p>
                      <Button className="mt-4" variant="secondary" onClick={() => setSettingsOpen(true)}>
                        Vincular mi primer taller
                      </Button>
                    </CardBody>
                  </Card>
                )}
              </section>
            </div>
          )}

          {activeSection === "vehiculos" && (
            <section id="mis-vehiculos" className="mb-10" aria-label="Tus vehículos registrados">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h2 className="section-title flex items-center gap-2">
                    <CarFront className="h-6 w-6 text-sky-600" />
                    Mis vehículos
                  </h2>
                  <p className="mt-1 section-sub">Registra la información de tu carro o moto para agilizar la recepción en el taller.</p>
                </div>
              </div>
              <MyVehiclesPanel accountId={account.id} fichas={fichas} />
            </section>
          )}

          {activeSection === "seguimiento" && (
            <section id="seguimiento-servicios" className="mb-10" aria-label="Seguimiento de servicios">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h2 className="section-title flex items-center gap-2">
                    <Wrench className="h-6 w-6 text-amber-600" />
                    Seguimiento de servicios
                  </h2>
                  <p className="mt-1 section-sub">Consulta el estado, aprueba presupuestos y comunica con el taller.</p>
                </div>
              </div>

              {vinculadosAceptados.map((v) => (
                <section key={v.portal.customer.id} id={`seguimiento-${v.portal.customer.id}`} className="space-y-4">
                  <div className="card panel">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 text-brand-600">
                          <Wrench className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-slate-900">{v.portal.workshop.nombre} · Seguimiento de servicios</h3>
                          <p className="mt-0.5 text-sm text-slate-500">
                            {v.portal.ordenes.length} orden(es) total · {v.portal.ordenes.filter((po) => esEstadoActivo(po.order.estado)).length} activa(s)
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="px-5 py-4 space-y-4 pt-0">
                      {v.portal.notificaciones.length > 0 && (
                        <Accordion title="Avisos recientes" defaultOpen icon={<Bell className="h-4 w-4" />}>
                          <PortalNotifications notificaciones={v.portal.notificaciones} />
                        </Accordion>
                      )}
                      <Accordion title="Mis servicios" defaultOpen icon={<Wrench className="h-4 w-4" />}>
                        <PortalOrders ordenes={v.portal.ordenes} token={v.portal.customer.portal_token ?? ""} workshop={v.portal.workshop} />
                      </Accordion>
                      <PortalLegalFooter workshop={v.portal.workshop} />
                    </div>
                  </div>
                </section>
              ))}
            </section>
          )}

          {activeSection === "talleres" && (
            <section id="talleres-publicos" className="mb-10" aria-label="Otros talleres disponibles">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h2 className="section-title flex items-center gap-2">
                    <Building2 className="h-6 w-6 text-emerald-600" />
                    Otros talleres en la red
                  </h2>
                  <p className="mt-1 section-sub">Descubre más talleres conectados y solicita tu enlace personal.</p>
                </div>
              </div>
              <ListaTalleresPublicos talleres={listWorkshops()} vinculaciones={estadoPorTaller} />
            </section>
          )}
        </div>
      </main>

      {/* Botón fijo de chat - siempre visible (fixed, no aside) */}
      <ChatButton
        orderId={ordenActiva?.orderId ?? ""}
        token={ordenActiva?.token ?? ""}
        titulo={ordenActiva ? `Chat · ${ordenActiva.numero}` : "Chat con el taller"}
        ordenActiva={ordenActiva ?? null}
      />

      {/* Modal Configuraciones */}
      <Modal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Configuraciones de tu cuenta"
        wide
      >
        <div className="space-y-6">
          <Alert tone="info" title="Editar tu cuenta">
            Los cambios se guardan en el servidor. El correo electrónico es tu identificador único y no se puede cambiar desde aquí.
          </Alert>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <Field label="Nombre completo" required>
              <input
                className="input"
                name="nombre"
                defaultValue={account.nombre}
                placeholder="Tu nombre completo"
              />
            </Field>
            <Field label="Correo electrónico">
              <input className="input bg-slate-50" value={account.correo} readOnly />
              <p className="mt-1 text-xs text-slate-500">El correo no se puede modificar. Para cambiarlo, contacta con soporte.</p>
            </Field>
            <Field label="Teléfono">
              <input
                className="input"
                name="telefono"
                defaultValue={account.telefono}
                placeholder="+57 3XX XXX XXXX"
              />
            </Field>

            <hr className="border-slate-200" />

            <p className="text-sm font-semibold text-slate-900">Cambiar contraseña</p>
            <p className="text-xs text-slate-500">Deja en blanco si no quieres cambiarla.</p>
            <Field label="Contraseña actual">
              <input className="input" name="passwordActual" type="password" placeholder="Tu contraseña actual" />
            </Field>
            <Field label="Nueva contraseña">
              <input className="input" name="passwordNueva" type="password" placeholder="Mínimo 8 caracteres" minLength={8} />
            </Field>
            <Field label="Confirmar nueva contraseña">
              <input className="input" name="passwordConfirmar" type="password" placeholder="Repite la nueva contraseña" />
            </Field>

            {settingsError && <Alert tone="error" className="mt-4">{settingsError}</Alert>}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => setSettingsOpen(false)} disabled={savingSettings}>Cancelar</Button>
              <Button type="submit" loading={savingSettings}>Guardar cambios</Button>
            </div>
          </form>

          <hr className="border-slate-200" />

          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex shrink-0 mt-0.5">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div className="text-red-700 min-w-0">
                <p className="font-medium">Zona de peligro</p>
                <p className="mt-1 text-sm">Si eliminas tu cuenta, se borrarán tus datos personales, vinculaciones y vehículos registrados sin órdenes. Los historiales de servicios se conservan en los talleres por obligación legal.</p>
                <form action="/api/cuenta/eliminar" method="POST" className="mt-4">
                  <Button type="submit" variant="danger" className="w-full sm:w-auto">
                    <Trash className="h-4 w-4 mr-2" /> Eliminar mi cuenta definitivamente
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}