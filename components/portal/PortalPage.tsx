import Link from "next/link";
import type { Metadata } from "next";
import { Wrench, Lock, UserCircle2, LogIn } from "lucide-react";
import { getPortalData, getPortalTokenStatus, isCustomerLinkedToAccount } from "@/lib/database/queries";
import { getSession } from "@/lib/auth/session";
import { PortalReadMarker } from "@/components/customer/PortalExtras";
import { LivePill } from "@/components/shared/LivePill";
import { PortalDashboard } from "@/components/portal/PortalDashboard";

export const metadata: Metadata = { title: "Portal de seguimiento" };
export const dynamic = "force-dynamic";

export default async function PortalPage({ params: paramsP }: { params: Promise<{ token: string }> }) {
  const params = await paramsP;
  const estadoToken = getPortalTokenStatus(params.token);
  const portal = estadoToken === "ok" ? getPortalData(params.token) : null;
  const session = await getSession();

  if (!portal) {
    const revocado = estadoToken === "revocado";
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md text-center">
          <div className="card mx-auto max-w-md p-8">
            <span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-3xl ${revocado ? "bg-amber-50 text-amber-500" : "bg-red-50 text-red-500"}`}>
              <Lock className="h-8 w-8" />
            </span>
            <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              {revocado ? "Enlace desactivado por el cliente" : "Enlace inválido o expirado"}
            </h1>
            <p className="mt-3 text-sm text-slate-500 leading-relaxed">
              {revocado ? (
                <>
                  Este enlace fue <strong>anulado</strong> cuando el cliente desvinculó su ficha del taller. Por
                  privacidad no vuelve a funcionar. El taller puede generar un <strong>enlace nuevo</strong> en{" "}
                  <em>Configuración → Portales de clientes</em> y compartirlo con el cliente.
                </>
              ) : (
                <>
                  Este enlace de seguimiento no existe o ya no está activo. Pídele a tu taller uno nuevo: cada
                  enlace es personal y privado.
                </>
              )}
            </p>
            <div className="mt-8 space-y-3">
              {revocado && (
                <Link href="/cuenta/login" className="btn-primary w-full">
                  Entrar a mi cuenta
                </Link>
              )}
              <Link href="/" className={revocado ? "btn-secondary w-full" : "btn-primary w-full"}>Ir al inicio</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { customer, workshop, ordenes, notificaciones } = portal;

  const esCuentaCliente = session?.rol === "customer";
  const yaVinculada = esCuentaCliente ? isCustomerLinkedToAccount(session!.user_id, params.token) : false;

  const customerForDashboard = {
    ...customer,
    consentimiento_datos_at: customer.consentimiento_datos_at ?? "",
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <PortalReadMarker token={params.token} />

      {/* Encabezado del portal */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 backdrop-blur backdrop-saturate-150">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-600 text-white">
                <Wrench className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-brand-600">
                  <LivePill /> Portal de seguimiento
                </p>
                <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">{workshop.nombre}</h1>
              </div>
              <p className="mt-1 sm:mt-0 text-sm text-slate-500">
                <Lock className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                Acceso seguro con tu enlace personal
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 w-full sm:w-auto justify-end sm:justify-start">
              {esCuentaCliente ? (
                yaVinculada ? (
                  <Link href="/cuenta" className="btn-primary px-4 py-2 text-xs sm:text-sm">
                    <UserCircle2 className="h-3.5 w-3.5" /> Mi cuenta
                  </Link>
                ) : (
                  <Link href={`/cuenta?vincular=${encodeURIComponent(params.token)}`} className="btn-primary px-4 py-2 text-xs sm:text-sm">
                    <UserCircle2 className="h-3.5 w-3.5" /> Vincular a mi cuenta
                  </Link>
                )
              ) : (
                <Link href={`/login?tipo=cliente&volver=${encodeURIComponent(params.token)}`} className="btn-secondary px-4 py-2 text-xs sm:text-sm">
                  <LogIn className="h-3.5 w-3.5" /> Mi cuenta
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <PortalDashboard
          customer={customerForDashboard}
          vinculos={[]}
          workshop={workshop}
          ordenes={ordenes}
          notificaciones={notificaciones}
          token={params.token}
        />
      </main>
    </div>
  );
}