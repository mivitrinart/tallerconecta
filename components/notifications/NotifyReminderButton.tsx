"use client";
/** Retención: avisar al cliente que su vehículo ya necesita mantenimiento. */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui";
import { api } from "@/lib/api-client";

export function NotifyReminderButton({ vehicleId }: { vehicleId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  return (
    <span className="inline-flex items-center gap-2">
      {listo ? (
        <span className="text-xs font-semibold text-emerald-600">Avisado ✓</span>
      ) : (
        <Button
          size="sm"
          variant="secondary"
          loading={loading}
          onClick={async () => {
            setLoading(true);
            setError(null);
            try {
              await api.post("/api/taller/recordatorios-mantenimiento", { vehicle_id: vehicleId });
              setListo(true);
              router.refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : "No se pudo enviar");
            } finally {
              setLoading(false);
            }
          }}
        >
          <BellRing className="h-3.5 w-3.5" /> Avisar ahora
        </Button>
      )}
      {error && <span className="text-[11px] font-medium text-red-600">{error}</span>}
    </span>
  );
}
