"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Menu, X, Wrench, ArrowRight, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import { LogoutButton } from "@/components/shared/LogoutButton";
import { usePathname } from "next/navigation";
interface PublicHeaderProps {
  session?: { nombre: string; rol: string } | null;
}

/** Navegación única y centralizada: se usa en escritorio y móvil. */
const NAV = [
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#beneficios", label: "Beneficios" },
  { href: "/precios", label: "Planes" },
  { href: "#preguntas-frecuentes", label: "Preguntas frecuentes" },
];

export default function PublicHeader({ session }: PublicHeaderProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const toggle = useCallback(() => setOpen((o) => !o), []);
  const isHome = pathname === "/";

  useEffect(() => {
    if (isHome && window.location.hash) {
      const id = window.location.hash.slice(1);
      const el = document.getElementById(id);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    }
  }, [isHome, pathname]);

  // Cierra el menú móvil con la tecla Escape (accesibilidad)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const navegarAncla = (href: string) => {
    window.location.href = `${window.location.origin}${isHome ? href : `/${href}`}`;
    setOpen(false);
  };

  const authLinks = session ? (
    <div className="flex items-center gap-2 sm:gap-3">
      <span className="hidden max-w-[14rem] truncate text-sm text-slate-500 lg:block">
        Hola,{" "}
        <strong className="text-slate-800">{session.nombre.split(" ")[0]}</strong>
      </span>
      <Link href="/cuenta" className="btn-primary px-3! py-1.5! text-xs sm:px-4! sm:py-2! sm:text-sm">
        Ir a la cuenta
      </Link>
      <LogoutButton
        destino="/"
        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600"
      />
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <Link href="/login" className="btn-secondary px-3! py-1.5! text-xs sm:px-4! sm:py-2! sm:text-sm">
        Iniciar sesión
      </Link>
      <Link
        href="/registro"
        className="btn-action px-3! py-1.5! text-xs sm:px-4! sm:py-2! sm:text-sm inline-flex items-center gap-1.5"
      >
        Empieza gratis <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        {/* Marca */}
        <Link href="/" className="flex items-center gap-2.5" aria-label="TallerConecta · Inicio">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
            <Wrench className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            Taller<span className="text-brand-600">Conecta</span>
          </span>
        </Link>

        {/* Navegación escritorio */}
        <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex" aria-label="Navegación principal">
          {NAV.map((item) =>
            item.href.startsWith("#") ? (
              <a
                key={item.href}
                href={isHome ? item.href : `/${item.href}`}
                className="relative py-1 transition-colors after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:rounded-full after:bg-brand-600 after:transition-all hover:text-brand-600 hover:after:w-full"
                onClick={(e) => {
                  e.preventDefault();
                  navegarAncla(item.href);
                }}
              >
                {item.label}
              </a>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative py-1 transition-colors after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:rounded-full after:bg-brand-600 after:transition-all hover:text-brand-600 hover:after:w-full",
                  pathname === item.href && "text-brand-600 after:w-full"
                )}
              >
                {item.label}
              </Link>
            )
          )}
        </nav>

        <div className="hidden md:flex items-center gap-2">{authLinks}</div>

        {/* Botón menú móvil */}
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden",
            open && "bg-slate-50"
          )}
          onClick={toggle}
          aria-expanded={open}
          aria-controls="menu-panel"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Panel móvil: drawer lateral izquierdo con secciones ordenadas */}
      <div
        id="menu-panel"
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] flex-col border-r border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-out md:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        aria-labelledby="menu-panel-title"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 id="menu-panel-title" className="font-semibold text-slate-900">Menú</h2>
          <button
            type="button"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            onClick={toggle}
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4" aria-label="Menú móvil">
          <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">Explorar</p>
          {NAV.map((item) =>
            item.href.startsWith("#") ? (
              <a
                key={item.href}
                href={isHome ? item.href : `/${item.href}`}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-700"
                onClick={(e) => {
                  e.preventDefault();
                  navegarAncla(item.href);
                }}
              >
                {item.label}
              </a>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-700"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            )
          )}
        </nav>

        <div className="space-y-2 border-t border-slate-100 px-5 py-4">
          {session ? (
            <div className="space-y-2">
              <p className="px-1 text-xs text-slate-500">
                Sesión iniciada como <strong className="text-slate-800">{session.nombre}</strong>
              </p>
              <Link href="/cuenta" className="btn-primary w-full text-sm">Ir a la cuenta</Link>
              <LogoutButton destino="/" className="btn-ghost w-full text-sm" />
            </div>
          ) : (
            <div className="grid gap-2">
              <Link href="/login" className="btn-secondary w-full justify-center text-sm">Iniciar sesión</Link>
              <Link href="/registro" className="btn-action w-full justify-center text-sm inline-flex items-center gap-1.5">
                Empieza gratis <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
          <p className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-600" /> Conexión cifrada · datos protegidos
          </p>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm md:hidden"
          onClick={toggle}
          aria-hidden="true"
        />
      )}
    </header>
  );
}
