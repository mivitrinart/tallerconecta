"use client";
/** Acordeón con el perfil del taller para que el cliente lo visualice. */
import { useState } from "react";
import { ChevronDown, MapPin } from "lucide-react";
import { cn } from "@/lib/cn";
import { WorkshopProfile } from "@/components/shared/WorkshopProfile";
import type { Workshop } from "@/lib/database/types";

interface TallerProfileAccordionProps {
  workshop: Workshop;
}

export function TallerProfileAccordion({ workshop }: TallerProfileAccordionProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden", open ? "ring-1 ring-brand-200" : "")}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-5 py-4 text-left bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-100"
        aria-expanded={open}
        aria-controls={`taller-profile-${workshop.id}`}
      >
        <div className="flex items-center gap-2.5">
          <MapPin className="h-5 w-5 text-brand-600" />
          <span className="font-semibold text-slate-900">{workshop.nombre}</span>
          <span className="text-xs text-slate-500">· {workshop.ciudad}</span>
        </div>
        <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <div
        id={`taller-profile-${workshop.id}`}
        className={cn(`border-t border-slate-100 ${open ? "block" : "hidden"}`)}
      >
        <WorkshopProfile workshop={workshop} className="p-0 border-0 bg-transparent shadow-none" />
      </div>
    </div>
  );
}
