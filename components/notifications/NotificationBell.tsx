"use client";
/**
 * Campana de notificaciones del personal (Módulo 6).
 * Solo muestra avisos generados por cambios reales del taller.
 */
import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, Inbox } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { api } from "@/lib/api-client";
import { formatTimeAgo } from "@/lib/format";

export interface BellNotification {
  id: string;
  tipo: string;
  titulo: string;
  cuerpo: string;
  estado: string;
  created_at: string;
  link?: string | null;
}

export function NotificationBell({ initial }: { initial: BellNotification[] }) {
  const [items, setItems] = useState<BellNotification[]>(initial);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const unread = items.filter((n) => n.estado === "pendiente").length;

  // Sondeo cada 30 s (en producción: Supabase Realtime)
  useEffect(() => {
    let vivo = true;
    const cargar = async () => {
      try {
        const data = await api.get<{ notifications: BellNotification[] }>("/api/notificaciones?canal=in_app");
        if (vivo) {
          setItems((prev) => {
            const serverById = new Map(data.notifications.map((n) => [n.id, n]));
            return prev.map((n) => {
              // Si localmente ya está leída, conservar ese estado (evita parpadeo del sondeo)
              if (n.estado === "leida") return n;
              const server = serverById.get(n.id);
              return server ?? n;
            });
          });
        }
      } catch {
        /* silencioso */
      }
    };
    const t = setInterval(cargar, 10_000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const marcarTodas = async () => {
    setLoading(true);
    try {
      await api.post("/api/notificaciones/leer", {});
      // Eliminar todas de la lista local para que desaparezcan inmediatamente
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        aria-label={`Notificaciones (${unread} sin leer)`}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-full max-w-[95vw] sm:max-w-md md:w-[24rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold">Notificaciones</p>
            {unread > 0 && (
              <button onClick={marcarTodas} disabled={loading} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50">
                <CheckCheck className="h-3.5 w-3.5" /> Marcar leídas
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-slate-400">
                <Inbox className="h-8 w-8" />
                <p className="text-sm">Sin notificaciones</p>
              </div>
            )}
            {items.map((n) => {
              const pendiente = n.estado === "pendiente";
              const handleClick = async () => {
                // Marcar como leída en el servidor; si falla, igual se limpia localmente
                try {
                  await api.post("/api/notificaciones/leer", { ids: [n.id] });
                } catch {
                  /* tolerante a fallos: no bloquea la limpieza local */
                }
                // Eliminar de la lista local inmediatamente para que desaparezca al hacer clic
                setItems((prev) => prev.filter((x) => x.id !== n.id));
                setOpen(false);
                if (n.link) {
                  try {
                    await router.push(n.link);
                  } catch {
                    window.location.href = n.link;
                  }
                }
              };
              const body = (
                <div
                  className={cn("border-b border-slate-50 px-4 py-3 transition-colors hover:bg-slate-50", pendiente && "bg-brand-50/40")}
                >
                  <div className="flex items-start gap-2">
                    {pendiente && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                    <div className={cn("min-w-0", !pendiente && "pl-4")}>
                      <p className={cn("truncate text-sm", pendiente ? "font-semibold text-slate-900" : "font-medium text-slate-600")}>
                        {n.titulo}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{n.cuerpo}</p>
                      <p className="mt-1 text-[11px] text-slate-400">{formatTimeAgo(n.created_at)}</p>
                    </div>
                  </div>
                </div>
              );
              return n.link ? (
                <Link key={n.id} href={n.link} onClick={(e) => {
                  e.preventDefault();
                  handleClick();
                }}>
                  {body}
                </Link>
              ) : (
                <div key={n.id} onClick={handleClick}>{body}</div>
              );
            })}
          </div>
          <p className="bg-slate-50 px-4 py-2 text-center text-[11px] text-slate-400">
            Las notificaciones solo se envían cuando el taller actualiza el estado.
          </p>
        </div>
      )}
    </div>
  );
}
