"use client";
/** El taller genera un enlace NUEVO tras la anulación por desvinculación del cliente. */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui";
import { api } from "@/lib/api-client";

export function RegenerarEnlaceButton({ customerId, compacto }: { customerId: string; compacto?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex items-center gap-2">
      <Button
        size="sm"
        variant="secondary"
        loading={loading}
        onClick={async () => {
          setLoading(true);
          setError(null);
          try {
            await api.post(`/api/clientes/${customerId}/regenerar-enlace`, {});
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "No se pudo generar el enlace.");
          } finally {
            setLoading(false);
          }
        }}
        title="Genera un enlace personal nuevo (el anterior quedó anulado y no volverá a funcionar)"
      >
        <KeyRound className="h-3.5 w-3.5" /> {compacto ? "Nuevo enlace" : "Generar enlace nuevo"}
      </Button>
      {error && <span className="text-xs font-medium text-red-600">{error}</span>}
    </span>
  );
}
