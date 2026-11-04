import Link from "next/link";
import { Wrench, ShieldCheck } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { ROL_LABEL } from "@/lib/permissions";
import { LogoutButton } from "@/components/shared/LogoutButton";
import PublicHeader from "@/components/shared/PublicHeader";

export const dynamic = "force-dynamic";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <PublicHeader session={session} />

      <main className="flex-1">{children}</main>

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-12">
            {/* Marca */}
            <div className="md:col-span-5">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white">
                  <Wrench className="h-4 w-4" />
                </span>
                <span className="text-lg">Taller<span className="text-brand-600">Conecta</span></span>
              </div>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-500">
                La plataforma que conecta talleres mecánicos con sus clientes: menos llamadas
                repetitivas, presupuestos aprobados desde el celular y más confianza durante el
                servicio.
              </p>
              <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" /> Conexión cifrada · datos aislados por taller
              </p>
            </div>
            {/* Producto */}
            <div className="text-sm text-slate-600 md:col-span-3">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Producto</p>
              <ul className="space-y-2">
                <li><Link href="/#como-funciona" className="hover:text-brand-600">Cómo funciona</Link></li>
                <li><Link href="/#beneficios" className="hover:text-brand-600">Beneficios</Link></li>
                <li><Link href="/precios" className="hover:text-brand-600">Planes y precios</Link></li>
                <li><Link href="/#preguntas-frecuentes" className="hover:text-brand-600">Preguntas frecuentes</Link></li>
              </ul>
            </div>
            {/* Cuenta */}
            <div className="text-sm text-slate-600 md:col-span-2">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Cuenta</p>
              <ul className="space-y-2">
                <li><Link href="/login" className="hover:text-brand-600">Iniciar sesión</Link></li>
                <li><Link href="/registro" className="hover:text-brand-600">Crear cuenta</Link></li>
                <li><Link href="/cuenta/login" className="hover:text-brand-600">Portal del cliente</Link></li>
              </ul>
            </div>
            {/* Legal */}
            <div className="text-sm text-slate-600 md:col-span-2">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Legal y seguridad</p>
              <ul className="space-y-2">
                <li><Link href="/legal/privacidad" className="hover:text-brand-600">Tratamiento de datos (Ley 1581)</Link></li>
                <li><Link href="/legal/terminos" className="hover:text-brand-600">Términos y condiciones</Link></li>
                <li><Link href="/legal/seguridad" className="hover:text-brand-600">Política de seguridad</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-8 text-xs text-slate-400 sm:flex-row">
            <p>© {new Date().getFullYear()} TallerConecta · Hecho con Next.js + TypeScript + Cloudflare</p>
            <p>Sitio de demostración del MVP · datos ficticios · precios en COP</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
