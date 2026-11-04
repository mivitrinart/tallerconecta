"use client";
/**
 * Shell de la aplicación interna: sidebar fijo en escritorio con navegación
 * agrupada por secciones, drawer en móvil y topbar con notificaciones.
 * Identidad visual: azul brand sobre azul noche (slate-900), texto claro.
 */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef, type ReactNode } from "react";
import {
  LayoutDashboard, ClipboardList, Users, Car, FileText, MessageSquare,
  Settings, Menu, X, ChevronLeft, ChevronRight, Wrench, ShieldCheck, BadgeDollarSign, UserCog, LogOut, HardHat,
  UserPlus, Link as LinkIcon, FolderOpen, Building2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Avatar, DemoBadge } from "@/components/ui";
import { NotificationBell, type BellNotification } from "@/components/notifications/NotificationBell";
import { LogoutButton } from "./LogoutButton";

export interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  badge?: number;
  soloOwner?: boolean;
}

interface NavSeccion {
  titulo: string;
  items: NavItem[];
}

/** Navegación del taller organizada en secciones lógicas. */
const NAV_TALLER: NavSeccion[] = [
  {
    titulo: "Operación",
    items: [
      { href: "/taller/dashboard", label: "Inicio", icon: <LayoutDashboard className="h-5 w-5" /> },
      { href: "/taller/ordenes", label: "Órdenes", icon: <ClipboardList className="h-5 w-5" /> },
      { href: "/taller/mensajes", label: "Mensajes", icon: <MessageSquare className="h-5 w-5" /> },
    ],
  },
  {
    titulo: "Gestión",
    items: [
      { href: "/taller/clientes", label: "Clientes", icon: <Users className="h-5 w-5" /> },
      { href: "/taller/vehiculos", label: "Vehículos", icon: <Car className="h-5 w-5" /> },
      { href: "/taller/vinculaciones", label: "Vinculaciones", icon: <UserPlus className="h-5 w-5" /> },
      { href: "/taller/presupuestos", label: "Presupuestos", icon: <FileText className="h-5 w-5" /> },
    ],
  },
  {
    titulo: "Administración",
    items: [
      { href: "/taller/equipo", label: "Equipo", icon: <HardHat className="h-5 w-5" />, soloOwner: true },
      { href: "/taller/configuracion", label: "Configuración", icon: <Settings className="h-5 w-5" /> },
    ],
  },
];

/** El mecánico solo ve lo que le corresponde: sus trabajos y mensajes. */
const NAV_MECANICO: NavSeccion[] = [
  {
    titulo: "Mi trabajo",
    items: [
      { href: "/taller/dashboard", label: "Inicio", icon: <LayoutDashboard className="h-5 w-5" /> },
      { href: "/taller/ordenes", label: "Mis trabajos", icon: <ClipboardList className="h-5 w-5" /> },
      { href: "/taller/mensajes", label: "Mensajes", icon: <MessageSquare className="h-5 w-5" /> },
    ],
  },
];

const NAV_ASESOR: NavSeccion[] = NAV_TALLER.map((s) => ({
  ...s,
  items: s.items.filter((n) => n.href !== "/taller/configuracion" && !n.soloOwner),
})).filter((s) => s.items.length > 0);

const NAV_ADMIN: NavSeccion[] = [
  {
    titulo: "Plataforma",
    items: [
      { href: "/admin", label: "Resumen", icon: <ShieldCheck className="h-5 w-5" /> },
      { href: "/admin/talleres", label: "Talleres", icon: <Wrench className="h-5 w-5" /> },
      { href: "/admin/usuarios", label: "Usuarios", icon: <UserCog className="h-5 w-5" /> },
      { href: "/admin/suscripciones", label: "Suscripciones", icon: <BadgeDollarSign className="h-5 w-5" /> },
    ],
  },
];

export interface AppShellProps {
  usuario: { nombre: string; correo: string; rolLabel: string; rol?: string };
  subtitulo: string;
  notifIniciales: BellNotification[];
  unreadMensajes?: number;
  vinculacionesPendientes?: number;
  /** Refresca el panel cada 15 s para ver los cambios del cliente sin recargar. */
  liveRefresh?: boolean;
  children: ReactNode;
}

export function AppShell({
  usuario,
  subtitulo,
  notifIniciales,
  unreadMensajes = 0,
  vinculacionesPendientes = 0,
  liveRefresh = false,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const routerReadyRef = useRef(false);

  // Panel en vivo: los cambios hechos por los clientes (vehículos registrados,
  // aprobaciones, mensajes, desvinculaciones…) aparecen sin recargar la página.
  useEffect(() => {
    routerReadyRef.current = true;
    if (!liveRefresh) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible" && routerReadyRef.current) router.refresh();
    }, 15_000);
    return () => clearInterval(t);
  }, [liveRefresh, router]);
  const [drawer, setDrawer] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const isAdmin = pathname.startsWith("/admin");
  const secciones = isAdmin
    ? NAV_ADMIN
    : usuario.rol === "mechanic"
      ? NAV_MECANICO
      : usuario.rol === "advisor"
        ? NAV_ASESOR
        : NAV_TALLER; // owner
  const items = secciones
    .flatMap((s) => s.items)
    .map((it) => {
      if (it.href === "/taller/mensajes") return { ...it, badge: unreadMensajes };
      if (it.href === "/taller/vinculaciones") return { ...it, badge: vinculacionesPendientes };
      return it;
    });

  const Sidebar = (
    <div className={`flex max-h-[calc(100vh-1rem)] flex-col gap-1 overflow-y-auto p-4 ${collapsed ? "px-2" : "px-4"}`}>
      {/* Marca */}
      <Link href={isAdmin ? "/admin" : "/taller/dashboard"} className={`mb-4 flex items-center gap-2.5 px-2 ${collapsed ? "justify-center" : ""}`}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white">
          <Wrench className="h-5 w-5" />
        </span>
        {!collapsed && (
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold leading-tight text-white">Taller Conecta</span>
            <span className="block truncate text-xs text-slate-400">{subtitulo}</span>
          </span>
        )}
      </Link>

      {/* Secciones de navegación */}
      {secciones.map((sec) => {
        if (sec.items.length === 0) return null;
        return (
          <div key={sec.titulo} className="mb-2">
            {!collapsed && (
              <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">{sec.titulo}</p>
            )}
            {sec.items.map((item) => {
              const conBadge = items.find((i) => i.href === item.href) ?? item;
              const esRaiz = item.href === "/admin" || item.href === "/taller/dashboard";
              const activo = esRaiz ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setDrawer(false)}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    `relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${collapsed ? "justify-center" : ""}`,
                    activo
                      ? "bg-brand-600 text-white shadow-sm"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  {activo && !collapsed && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-300" />}
                  {item.icon}
                  {!collapsed && (
                    <>
                      <span className="flex-1">{item.label}</span>
                      {!!conBadge.badge && (
                        <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {conBadge.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        );
      })}

      {!collapsed && (
        <div className="mt-auto space-y-3 pt-4">
          <div className="rounded-xl border border-slate-700/60 bg-slate-800/60 p-3 text-xs text-slate-400">
            <p className="flex items-center gap-1.5 font-medium text-slate-300">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Espacio privado del taller
            </p>
            <p className="mt-1">Aislamiento por taller: nunca verás datos de otros talleres.</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 lg:flex">
      {/* Sidebar escritorio */}
      <aside className={`fixed inset-y-0 left-0 z-30 hidden bg-slate-900 transition-all duration-300 lg:block ${collapsed ? "w-16" : "w-64"}`}>{Sidebar}</aside>

      {/* Drawer móvil */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-slate-900 shadow-2xl">
            <button onClick={() => setDrawer(false)} className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800" aria-label="Cerrar menú">
              <X className="h-5 w-5" />
            </button>
            {Sidebar}
          </aside>
        </div>
      )}

      <div className={`flex min-w-0 flex-1 flex-col transition-all duration-300 ${collapsed ? "lg:pl-16" : "lg:pl-64"}`}>
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
          <button onClick={() => setDrawer(true)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Abrir menú">
            <Menu className="h-5 w-5" />
          </button>
          <button onClick={() => setCollapsed((c) => !c)} className="hidden items-center rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:flex" aria-label={collapsed ? "Expandir menú lateral" : "Ocultar menú lateral"}>
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
          <div className="hidden items-center gap-3 sm:flex">
            <DemoBadge />
            {liveRefresh && (
              <span
                className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600"
                title="El panel se actualiza automáticamente cada 15 segundos: verás aquí los cambios que hagan tus clientes sin recargar"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Panel en vivo
              </span>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-4">
            <NotificationBell initial={notifIniciales} />
            <div className="h-6 w-px bg-slate-200" aria-hidden="true" />
            <div className="flex items-center gap-2.5">
              <Avatar nombre={usuario.nombre} size="sm" />
              <div className="hidden leading-tight md:block">
                <p className="text-sm font-semibold text-slate-800">{usuario.nombre}</p>
                <p className="text-xs text-slate-400">{usuario.rolLabel}</p>
              </div>
            </div>
            <LogoutButton />
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">{children}</main>

        <footer className="flex items-center justify-center gap-1.5 px-6 py-4 text-center text-xs text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-brand-600" />
          Taller Conecta · MVP de demostración — datos ficticios · conexión cifrada
        </footer>
      </div>
    </div>
  );
}
