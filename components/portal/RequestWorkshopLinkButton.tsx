"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { api } from "@/lib/api-client";

export function RequestWorkshopLinkButton({ enlacePublico }: { enlacePublico: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const solicitar = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.post("/api/cuenta/vincular-publico", { enlace_publico: enlacePublico });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo solicitar la vinculación.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full sm:w-auto">
      <Button size="sm" variant="primary" loading={loading} onClick={solicitar} className="w-full sm:w-auto">
        Vincularse
      </Button>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
