"use client";
/**
 * Entrada única de sesión: selector "Soy un taller" / "Soy cliente".
 * Cada opción muestra su formulario (personal de taller o cuenta de cliente).
 */
import { useState } from "react";
import { Wrench, UserRound } from "lucide-react";
import { cn } from "@/lib/cn";
import StaffLoginForm from "./StaffLoginForm";
import CuentaLoginForm from "./CuentaLoginForm";

export type TipoLogin = "taller" | "cliente";

export default function LoginTabs({ initialTab }: { initialTab: TipoLogin }) {
  const [tab, setTab] = useState<TipoLogin>(initialTab);

  return (
    <div>
      {/* Selector de tipo de acceso */}
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-2xl border border-slate-700 bg-slate-900 p-1">
        <button
          type="button"
          onClick={() => setTab("taller")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
            tab === "taller" ? "bg-brand-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
          )}
        >
          <Wrench className="h-4 w-4" /> Soy un taller
        </button>
        <button
          type="button"
          onClick={() => setTab("cliente")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
            tab === "cliente" ? "bg-brand-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
          )}
        >
          <UserRound className="h-4 w-4" /> Soy cliente
        </button>
      </div>

      {/* Contenido con animación al cambiar de pestaña */}
      <div className="page-fade-in" key={`login-${tab}`}>
        {tab === "taller" ? (
          <StaffLoginForm onIrACliente={() => setTab("cliente")} />
        ) : (
          <CuentaLoginForm onIrATaller={() => setTab("taller")} />
        )}
      </div>
    </div>
  );
}
