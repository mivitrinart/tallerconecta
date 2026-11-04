import Link from "next/link";
import type { Metadata } from "next";
import { Wrench, Lock } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { query } from "@/lib/database/index";
import { initStoreFromEnv } from "@/lib/database/index";
import { CopyBox } from "@/components/customers/CustomerForms";
import { TallerConectarForm } from "@/components/cuenta/TallerConectarForm";

export const metadata: Metadata = { title: "Vincular con el taller" };

export default async function TallerConectarPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // Inicializar store de D1 para leer datos reales de producción (no demo-store local)
  try {
    const { env } = await import("@opennextjs/cloudflare").then((m) => m.getCloudflareContext());
    await initStoreFromEnv(env);
  } catch {
    // Si falla, se usará demo-store como fallback
  }

  const workshop = query((db) => db.workshops.find((w) => w.enlace_publico === token) ?? null);
  const session = await getSession();
  const esCliente = session?.rol === "customer";

  if (!workshop) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div className="w-full max-w-md text-center">
          <div className="card mx-auto max-w-md p-8">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
              <Lock className="h-7 w-7" />
            </span>
            <h1 className="mt-4 text-xl font-bold text-slate-900">Enlace inválido</h1>
            <p className="mt-2 text-sm text-slate-500">Este enlace de vinculación pública no existe o ya no está activo.</p>
            <Link href="/" className="btn-primary mt-6 w-full">Ir al inicio</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white border-b border-slate-200 px-4 py-4">
        <Link href="/" className="flex items-center gap-2 text-brand-600 font-bold text-sm">
          <Wrench className="h-4 w-4" /> Taller Conecta
        </Link>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <TallerConectarForm workshop={workshop} token={token} esCliente={esCliente} session={session} logoUrl={workshop.logo_url ?? null} />
      </main>
    </div>
  );
}
