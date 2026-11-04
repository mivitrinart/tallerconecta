"use client";
/** Perfil del taller para el cliente: foto, datos y Google Maps (sin fijar). */
import Image from "next/image";
import { MapPin, Phone, Clock } from "lucide-react";
import { WorkshopProfile } from "@/components/shared/WorkshopProfile";
import type { Workshop } from "@/lib/database/types";

interface TallerProfileFixedProps {
  workshop: Workshop;
}

export function TallerProfileFixed({ workshop }: TallerProfileFixedProps) {
  const logo = workshop.logo_url ?? "/logos/default.svg";
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="relative h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 shrink-0">
          <Image
            fill
            src={logo}
            alt={`Logo ${workshop.nombre}`}
            className="rounded-2xl object-cover"
            sizes="56px"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900">{workshop.nombre.toUpperCase()}</p>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500">
            <MapPin className="h-3.5 w-3.5" /> {workshop.direccion}, {workshop.ciudad}
          </p>
          <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
            <Phone className="h-3.5 w-3.5" /> {workshop.telefono}
          </p>
        </div>
      </div>
      <WorkshopProfile workshop={workshop} className="border-0 bg-transparent p-0 shadow-none" />
    </section>
  );
}
