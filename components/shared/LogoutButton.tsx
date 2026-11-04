"use client";
import { LogOut } from "lucide-react";
import { api } from "@/lib/api-client";
import { useRouter } from "next/navigation";

/** Cierra sesión y devuelve al destino indicado (login por defecto, "/" en el sitio público). */
export function LogoutButton({ destino = "/login", className }: { destino?: string; className?: string }) {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await api.post("/api/auth/logout").catch(() => {});
        router.push(destino);
        router.refresh();
      }}
      className={
        className ??
        "rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600"
      }
      title="Cerrar sesión"
      aria-label="Cerrar sesión"
    >
      <LogOut className="h-5 w-5" />
    </button>
  );
}
