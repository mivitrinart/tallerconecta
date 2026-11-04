"use client";
/**
 * Portal en vivo: refresca la ventana de seguimiento cada 15 s (solo con la
 * pestaña visible) — como seguir un pedido de comida, sin iniciar sesión.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function LivePill({ label = "En vivo · se actualiza solo" }: { label?: string }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 15_000);
    return () => clearInterval(t);
  }, [router]);

  return (
    <span
      className="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300"
      title="Esta ventana se actualiza automáticamente cada 15 segundos con los cambios reales del taller"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
      </span>
      {label}
    </span>
  );
}
