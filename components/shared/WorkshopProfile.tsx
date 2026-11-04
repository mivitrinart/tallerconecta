"use client";
/** Perfil público del taller: foto de perfil, información del negocio y ubicación en Google Maps. */
import Image from "next/image";
import Link from "next/link";
import { MapPin, Phone, Building2, Clock, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Workshop } from "@/lib/database/types";

interface WorkshopProfileProps {
  workshop: Workshop;
  className?: string;
}

export function WorkshopProfile({ workshop, className }: WorkshopProfileProps) {
  const logo = workshop.logo_url ?? "/logos/default.svg";
  return (
    <section className={cn("rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 md:p-8 shadow-sm max-h-[85vh] overflow-y-auto", className)}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* Foto de perfil */}
        <div className="flex flex-col items-center gap-3 md:text-left md:items-start">
          <div className="relative group h-24 w-24">
            <Image
              fill
              src={logo}
              alt={`Logo ${workshop.nombre}`}
              className="rounded-full object-cover bg-slate-100 border-4 border-slate-100 group-hover:border-brand-300 transition-colors"
              sizes="96px"
            />
            <span className="absolute -bottom-1 -left-1 flex items-center gap-1 rounded-full bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600 shadow-sm">
              <Building2 className="h-3 w-3" /> Taller
            </span>
          </div>
          <p className="text-base font-bold uppercase text-slate-900">{workshop.nombre}</p>
          {workshop.nit && (
            <p className="text-[11px] text-slate-500">NIT {workshop.nit}</p>
          )}
        </div>

        {/* Información del taller */}
        <div className="space-y-2 md:space-y-3">
          <div className="flex items-start gap-2 md:gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 md:p-4">
            <MapPin className="mt-0.5 h-4 w-4 md:h-5 md:w-5 text-slate-400 shrink-0" />
            <div className="leading-snug">
              <p className="text-[12px] md:text-sm font-semibold text-slate-900">{workshop.direccion}</p>
              <p className="text-[11px] md:text-xs text-slate-500">{workshop.ciudad}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 md:gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 md:p-4">
            <Phone className="mt-0.5 h-4 w-4 md:h-5 md:w-5 text-slate-400 shrink-0" />
            <div className="leading-snug">
              <p className="text-[12px] md:text-sm font-semibold text-slate-900">{workshop.telefono}</p>
              <p className="text-[11px] md:text-xs text-slate-500">Llámanos o escríbenos por WhatsApp</p>
            </div>
          </div>
          <div className="flex items-start gap-2 md:gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 md:p-4">
            <Clock className="mt-0.5 h-4 w-4 md:h-5 md:w-5 text-slate-400 shrink-0" />
            <div className="leading-snug">
              <p className="text-[12px] md:text-sm font-semibold text-slate-900">Lunes a Sábado</p>
              <p className="text-[11px] md:text-xs text-slate-500">8:00 a. m. – 6:00 p. m.</p>
            </div>
          </div>
          <div className="flex items-start gap-2 md:gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 md:p-4">
            <Users className="mt-0.5 h-4 w-4 md:h-5 md:w-5 text-slate-400 shrink-0" />
            <div className="leading-snug">
              <p className={cn("text-[12px] md:text-sm font-semibold", workshop.acepta_vehiculos !== false ? "text-emerald-900" : "text-amber-900")}>
                {workshop.acepta_vehiculos !== false ? "Recibiendo vehículos" : "Cupos llenos"}
              </p>
              <p className="text-[11px] md:text-xs text-slate-500">
                {workshop.cupos_disponibles != null ? `Cupos disponibles: ${workshop.cupos_disponibles}` : "Consulta con el taller"}
              </p>
            </div>
          </div>
        </div>

        {/* Ubicación Google Maps */}
        <div className="md:col-span-3 flex flex-col items-start gap-2 md:gap-3">
          <div className="flex items-center gap-1 md:gap-2">
            <Users className="h-4 w-4 md:h-5 md:w-5 text-brand-600" />
            <h3 className="text-[13px] md:text-base font-semibold text-slate-900">Ubícanos en Google Maps</h3>
          </div>
          {workshop.google_maps_url ? (
            <Link
              href={workshop.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between w-full rounded-xl border border-slate-200 bg-white p-3 md:p-4 hover:border-brand-300 hover:bg-brand-50/50 transition-colors"
            >
              <div className="flex items-center gap-1 md:gap-2">
                <MapPin className="h-4 w-4 md:h-5 md:w-5 text-brand-600" />
                <span className="text-[11px] md:text-sm font-medium text-slate-800">Abrir en Google Maps →</span>
              </div>
              <span className="text-[10px] text-slate-400">Ver ruta</span>
            </Link>
          ) : (
            <p className="text-[11px] text-slate-500">Ubicación no configurada.</p>
          )}
        </div>
      </div>
    </section>
  );
}
