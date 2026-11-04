import type { Metadata } from "next";
import Link from "next/link";
import { Wrench, Building2, CarFront, ChevronDown, Bell, ShieldCheck, User, Settings, HelpCircle, AlertCircle, Trash } from "lucide-react";
import { requireSession } from "@/lib/auth/session";
import { initStore } from "@/lib/api/init-store";
import { sanitizeAccount } from "@/lib/auth/sanitize";
import { getAccountView, getCustomerAccountById, listWorkshops } from "@/lib/database/queries";
import { query } from "@/lib/database/index";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/customer/SignOutButton";
import { CuentaDashboard } from "@/components/cuenta/CuentaDashboard";
import type { Workshop } from "@/lib/database/types";

export const metadata: Metadata = { title: "Mi cuenta · Seguimiento de servicios" };
export const dynamic = "force-dynamic";

/**
 * Cuenta del cliente: la MISMA ventana de seguimiento del enlace personal
 * (/seguimiento/[token]), ahora reunida por ficha vinculada y con perfil.
 * Plantilla visual ordenada: encabezado → resumen → talleres vinculados →
 * seguimiento por taller → vehículos → perfil → talleres públicos → legal.
 */
export default async function CuentaPage({ searchParams: searchParamsP }: { searchParams: Promise<{ vincular?: string }> }) {
  const searchParams = await searchParamsP;
  await initStore();
  const session = await requireSession(["customer"]);
  let view = getAccountView(session.user_id);
  const talleres = listWorkshops();
  if (!view) {
    const cuentaActiva = getCustomerAccountById(session.user_id);
    if (cuentaActiva) {
      view = { account: sanitizeAccount(cuentaActiva), vinculaciones: [] };
    } else {
      const cuentaCualquiera = query((db) => db.customer_accounts.find((a) => a.id === session.user_id) ?? null);
      if (!cuentaCualquiera) {
        redirect("/cuenta/login");
      }
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
          <div className="card max-w-md p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <Wrench className="h-7 w-7 text-slate-400" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Cuenta no encontrada</h1>
            <p className="mt-2 text-sm text-slate-500">No se encontró tu cuenta de cliente.</p>
            <Link href="/cuenta/login" className="btn-primary mt-6 w-full block">Iniciar sesión</Link>
          </div>
        </div>
      );
    }
  }

  const { account, vinculaciones } = view;

  return (
    <CuentaDashboard
      account={{
        id: account.id,
        nombre: account.nombre,
        correo: account.correo,
        telefono: account.telefono,
        consentimiento_datos_at: account.consentimiento_datos_at,
        created_at: account.created_at,
      }}
      vinculaciones={vinculaciones}
      searchParams={searchParams}
    />
  );
}