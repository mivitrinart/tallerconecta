"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui";
import { api } from "@/lib/api-client";

export function SignOutButton() {
  const router = useRouter();

  async function salir() {
    await api.post("/api/cuenta/logout").catch(() => {});
    router.push("/cuenta/login");
    router.refresh();
  }

  return (
    <Button size="sm" variant="secondary" onClick={salir} className="text-xs" title="Cerrar sesión">
      <LogOut className="h-3.5 w-3.5" /> Salir de la sesión
    </Button>
  );
}
