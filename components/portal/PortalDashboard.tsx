"use client";

import React, { useState, Suspense, lazy } from "react";
import { User, Car, Wrench, Link2, ChevronLeft, Bell, Settings } from "lucide-react";
import { Card, Button, Modal, Field, Alert } from "@/components/ui";
import { PortalNotifications, PortalOrders, PortalLegalFooter } from "@/components/customer/PortalSections";
import { Accordion } from "@/components/ui";
import { api } from "@/lib/api-client";
import type { Notification, Workshop } from "@/lib/database/types";
import type { PortalOrder } from "@/lib/database/queries";

const MyVehiclesPanel = lazy(() => import("@/components/customer/MyVehiclesPanel").then((m) => ({ default: m.MyVehiclesPanel })));
const AccountPanel = lazy(() => import("@/components/customer/AccountPanel").then((m) => ({ default: m.AccountPanel })));

type Section = "perfil" | "vehiculos" | "seguimiento" | "talleres";

interface AccountPanelVinculo {
  customer_id: string;
  customer_nombre: string;
  workshop_nombre: string;
  origen: "email" | "token" | "public";
  estado: "aceptado" | "pendiente" | "rechazado";
}

interface PortalDashboardProps {
  customer: { id: string; nombre: string; correo: string; telefono: string; consentimiento_datos_at: string | null; created_at: string };
  vinculos: AccountPanelVinculo[];
  workshop: Workshop;
  ordenes: PortalOrder[];
  notificaciones: Notification[];
  token: string;
}

const SECTIONS: { id: Section; label: string; icon: React.ReactNode; description: string }[] = [
  { id: "perfil", label: "Mi perfil", icon: <User className="h-6 w-6" />, description: "Información personal y registro" },
  { id: "vehiculos", label: "Mis vehículos", icon: <Car className="h-6 w-6" />, description: "Vehículos registrados y su historial" },
  { id: "seguimiento", label: "Seguimiento", icon: <Wrench className="h-6 w-6" />, description: "Órdenes de servicio y presupuestos" },
  { id: "talleres", label: "Más talleres", icon: <Link2 className="h-6 w-6" />, description: "Vincular y gestionar talleres" },
];

function SkeletonCard() {
  return (
    <Card className="pulse-soft bg-slate-200 h-28 rounded-xl">
      <div className="h-full" />
    </Card>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

function EditProfileModal({
  open,
  onClose,
  customer,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  customer: { nombre: string; telefono: string; correo: string; consentimiento_datos_at: string | null; created_at: string };
  onSaved: () => void;
}) {
  const [nombre, setNombre] = useState(customer.nombre);
  const [telefono, setTelefono] = useState(customer.telefono);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.patch("/api/cuenta/perfil", {
        nombre: nombre.trim(),
        telefono: telefono.trim(),
      });
      onClose();
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title="Editar perfil" wide>
      <form onSubmit={handleSave} className="space-y-4">
        <Alert tone="info" title="Editar datos personales">
          Tus cambios se guardarán en el servidor. El correo no se puede modificar desde aquí.
        </Alert>
        <Field label="Nombre completo" required>
          <input
            className="input"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Tu nombre completo"
          />
        </Field>
        <Field label="Teléfono" required>
          <input
            className="input"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="+57 3XX XXX XXXX"
          />
        </Field>
        <Field label="Correo electrónico">
          <input className="input bg-slate-50" value={customer.correo} readOnly />
        </Field>
        {error && <Alert tone="error">{error}</Alert>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button type="submit" loading={loading}>Guardar cambios</Button>
        </div>
      </form>
    </Modal>
  );
}

function SectionView({
  section,
  customer,
  vinculos,
  workshop,
  ordenes,
  notificaciones,
  token,
}: PortalDashboardProps & { section: Section }) {
  switch (section) {
    case "perfil":
      return (
        <Suspense fallback={<SkeletonGrid />}>
          <AccountPanel
            account={{
              nombre: customer.nombre,
              correo: customer.correo,
              telefono: customer.telefono,
              consentimiento_datos_at: customer.consentimiento_datos_at ?? "",
              created_at: customer.created_at,
            }}
            vinculos={vinculos}
          />
        </Suspense>
      );
    case "vehiculos":
      return (
        <Suspense fallback={<SkeletonGrid />}>
          <MyVehiclesPanel accountId={customer.id} fichas={[]} />
        </Suspense>
      );
    case "seguimiento":
      return (
        <div className="space-y-6">
          {notificaciones.length > 0 && (
            <Accordion title="Avisos recientes" defaultOpen icon={<Bell className="h-4 w-4" />}>
              <PortalNotifications notificaciones={notificaciones} />
            </Accordion>
          )}
          <Accordion title="Mis servicios" defaultOpen icon={<Wrench className="h-4 w-4" />}>
            <PortalOrders ordenes={ordenes} token={token} workshop={workshop} />
          </Accordion>
          <PortalLegalFooter workshop={workshop} />
        </div>
      );
    case "talleres":
      return (
        <Suspense fallback={<SkeletonGrid />}>
          <AccountPanel
            account={{
              nombre: customer.nombre,
              correo: customer.correo,
              telefono: customer.telefono,
              consentimiento_datos_at: customer.consentimiento_datos_at ?? "",
              created_at: customer.created_at,
            }}
            vinculos={vinculos}
          />
        </Suspense>
      );
  }
}

export function PortalDashboard({
  customer,
  vinculos,
  workshop,
  ordenes,
  notificaciones,
  token,
}: PortalDashboardProps) {
  const [activeSection, setActiveSection] = useState<Section>("perfil");
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleProfileSaved = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-6" key={refreshKey}>
      {/* Grid de acciones rápidas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SECTIONS.map((s) => (
          <Button
            key={s.id}
            variant={activeSection === s.id ? "primary" : "secondary"}
            className="h-28 flex-col items-start justify-center gap-3 text-left w-full transition-all hover:shadow-lg"
            onClick={() => setActiveSection(s.id)}
          >
            <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${activeSection === s.id ? "bg-brand-100 text-brand-600" : "bg-slate-100 text-slate-500"}`}>
              {s.icon}
            </span>
            <span className="font-semibold text-sm">{s.label}</span>
            <span className="text-xs text-slate-500">{s.description}</span>
          </Button>
        ))}
        {/* Botón Configuraciones - abre modal */}
        <Button
          variant="secondary"
          className="h-28 flex-col items-start justify-center gap-3 text-left w-full transition-all hover:shadow-lg"
          onClick={() => setEditProfileOpen(true)}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <Settings className="h-6 w-6" />
          </span>
          <span className="font-semibold text-sm">Configuraciones</span>
          <span className="text-xs text-slate-500">Editar nombre, teléfono</span>
        </Button>
      </div>

      {/* Vista de sección activa */}
      <div className="animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900">
            {SECTIONS.find((s) => s.id === activeSection)?.label}
          </h2>
          <Button variant="ghost" size="sm" onClick={() => setActiveSection("perfil")}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Volver al inicio
          </Button>
        </div>
        <SectionView
          section={activeSection}
          customer={customer}
          vinculos={vinculos}
          workshop={workshop}
          ordenes={ordenes}
          notificaciones={notificaciones}
          token={token}
        />
      </div>

      {/* Modal editar perfil */}
      <EditProfileModal
        open={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        customer={customer}
        onSaved={handleProfileSaved}
      />
    </div>
  );
}