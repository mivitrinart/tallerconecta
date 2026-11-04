import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { getAccountView, listWorkshops } from "@/lib/database/queries";
import { redirect } from "next/navigation";
import { Wrench, Clock, Users, AlertCircle, CheckCircle, MapPin, Phone, ChevronLeft } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui";
import { RequestWorkshopLinkButton } from "@/components/portal/RequestWorkshopLinkButton";
import { initStore } from "@/lib/api/init-store";

export const dynamic = "force-dynamic";

export default async function TallerPerfilPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await initStore();
  const session = await getSession();
  if (!session || session.rol !== "customer") {
    redirect("/cuenta/login");
  }

  const view = getAccountView(session.user_id);
  const talleres = listWorkshops();
  const taller = talleres.find((t) => t.id === id);

  if (!taller) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="card max-w-md p-8 text-center">
          <h1 className="text-xl font-bold text-slate-900">Taller no encontrado</h1>
          <p className="mt-2 text-sm text-slate-500">El taller que buscas no existe.</p>
          <Link href="/cuenta" className="btn-primary mt-6 w-full">Volver a talleres</Link>
        </div>
      </div>
    );
  }

  const vinculaciones = view?.vinculaciones ?? [];
  const vinculacion = vinculaciones.find((v) => v.portal.workshop.id === id);
  const estado = vinculacion?.estado;
  const estaPendiente = estado === "pendiente";
  const estaAceptado = estado === "aceptado";
  const tienePublico = Boolean(taller.enlace_publico);

  return (
    <div className="min-h-screen bg-slate-50 pb-24 page-fade-in">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/cuenta" className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700">
            <ChevronLeft className="h-4 w-4" /> Volver a talleres
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm max-h-[80vh] overflow-y-auto">
          <div className="flex flex-col md:flex-row md:items-center gap-6 mb-6">
            <div className="relative h-20 w-20 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 shrink-0">
              {taller.logo_url ? (
                <Image
                  fill
                  src={taller.logo_url}
                  alt={`Logo ${taller.nombre}`}
                  className="rounded-xl object-cover"
                  sizes="80px"
                />
              ) : (
                <Wrench className="h-10 w-10" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold text-slate-900">{taller.nombre}</h1>
            </div>
              <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                <MapPin className="h-3 w-3" /> {taller.ciudad}
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                <Phone className="h-3 w-3" /> {taller.telefono}
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-4 w-4 text-slate-400 shrink-0" />
                <div className="leading-snug">
                  <p className="text-sm font-semibold text-slate-900">Horario</p>
                  <p className="text-xs text-slate-500">Lunes a Sábado · 8:00 a. m.  6:00 p. m.</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <Users className="mt-0.5 h-4 w-4 text-slate-400 shrink-0" />
                <div className="leading-snug">
                  <p className={["text-sm font-semibold", taller.acepta_vehiculos !== false ? "text-emerald-900" : "text-amber-900"].join(" ")}>
                    {taller.acepta_vehiculos !== false ? "Recibiendo vehículos" : "Cupos llenos"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {taller.cupos_disponibles != null ? `Cupos disponibles: ${taller.cupos_disponibles}` : "Consulta con el taller"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
            {estaPendiente ? (
              <Button size="sm" variant="secondary" disabled className="w-full sm:w-auto">
                Esperando respuesta del taller
              </Button>
            ) : estaAceptado ? (
              <Button size="sm" variant="secondary" disabled className="w-full sm:w-auto">
                Vinculado ?
              </Button>
            ) : tienePublico ? (
              <RequestWorkshopLinkButton enlacePublico={taller.enlace_publico ?? ""} />
            ) : (
              <Button size="sm" variant="secondary" disabled className="w-full sm:w-auto">
                Sin enlace público
              </Button>
            )}
            <Link href="/cuenta" className="w-full sm:w-auto btn-secondary text-xs text-center">
              Volver a la lista
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
