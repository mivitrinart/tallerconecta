"use client";
/** Tarjeta de taller vinculado en el panel del cliente: perfil resumido,
 * estado de la vinculación y acceso directo a su seguimiento. */
import Image from "next/image";
import Link from "next/link";
import { MapPin, Phone, ChevronRight, CheckCircle, Clock, Wrench, Building2, X } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { Workshop } from "@/lib/database/types";

const ESTADO: Record<string, { label: string; shortLabel: string; dot: string; cls: string; icon: React.ReactNode; color: string }> = {
  aceptado: { label: "Vinculado", shortLabel: "Activo", dot: "bg-emerald-500", cls: "border-emerald-200 bg-emerald-50 text-emerald-700", icon: <CheckCircle className="h-3 w-3" />, color: "emerald" },
  pendiente: { label: "Pendiente de aceptación", shortLabel: "Pendiente", dot: "bg-amber-500", cls: "border-amber-200 bg-amber-50 text-amber-700", icon: <Clock className="h-3 w-3 animate-pulse" />, color: "amber" },
  rechazado: { label: "Rechazado por el taller", shortLabel: "Rechazado", dot: "bg-red-500", cls: "border-red-200 bg-red-50 text-red-700", icon: <X className="h-3 w-3" />, color: "red" },
};

interface TallerProfileCardProps {
  workshop: Workshop;
  estado: "aceptado" | "pendiente" | "rechazado";
  href?: string;
}

export function TallerProfileCard({ workshop, estado, href }: TallerProfileCardProps) {
  const cfg = ESTADO[estado];
  const logo = workshop.logo_url ?? "/logos/default.svg";
  const hasLogo = Boolean(workshop.logo_url);
  const isAceptado = estado === "aceptado";

  return (
    <div className="panel hover:shadow-lg transition-all duration-200 group border-slate-200 bg-white">
      {/* Header con logo y estado */}
      <div className="panel-head relative overflow-hidden">
        {/* Barra de color superior según estado */}
        <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: `var(--color-${cfg.color}-500)` }} />
        
        <div className="flex items-start gap-4 p-4">
          <div className="flex shrink-0 relative">
            <div className="relative h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 ring-4 ring-white shadow-sm">
              {hasLogo ? (
                <Image
                  fill
                  src={logo}
                  alt={`Logo ${workshop.nombre}`}
                  className="rounded-xl object-cover"
                  sizes="64px"
                />
              ) : (
                <span className="text-2xl font-bold text-brand-600">{workshop.nombre ? workshop.nombre.split(" ").map((p) => p[0]).join("").toUpperCase() : ""}</span>
              )}
            </div>
            {/* Badge de estado en la esquina del logo */}
            <span className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white ${cfg.dot}`}>
              {cfg.icon}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-slate-900 leading-snug truncate pr-4">{workshop.nombre}</h3>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                  <Building2 className="h-4 w-4 shrink-0" />
                  <span className="truncate">{workshop.ciudad}</span>
                </p>
              </div>
              <Badge className={cfg.cls + " shrink-0 px-2.5 py-1 text-xs"}>
                <span className={cn("chip-dot", cfg.dot)} aria-hidden="true" />
                {cfg.shortLabel}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Info de contacto */}
      <div className="panel-body space-y-3 px-4 pb-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="flex items-center gap-2.5 text-sm text-slate-600 p-3 rounded-xl bg-slate-50/50">
            <Phone className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="font-medium text-slate-800 truncate">{workshop.telefono}</span>
          </div>
          {workshop.direccion && (
            <div className="flex items-center gap-2.5 text-sm text-slate-600 p-3 rounded-xl bg-slate-50/50">
              <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="font-medium text-slate-800 truncate">{workshop.direccion}</span>
            </div>
          )}
        </div>

        {isAceptado && (
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>Acceso activo al seguimiento de servicios</span>
          </div>
        )}

        {!isAceptado && (
          <div className="flex items-center gap-2 text-sm text-slate-500 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <Clock className="h-4 w-4 shrink-0" />
            <span>{estado === "pendiente" ? "Esperando respuesta del taller para activar el seguimiento" : "Esta vinculación fue rechazada. Contacta al taller para más información."}</span>
          </div>
        )}
      </div>

      {/* Footer con acción */}
      {!isAceptado && estado === "pendiente" ? (
        <Button variant="secondary" className="w-full" disabled>
          <Clock className="h-4 w-4" /> Esperando aceptación del taller
        </Button>
      ) : null}
    </div>
  );
}
