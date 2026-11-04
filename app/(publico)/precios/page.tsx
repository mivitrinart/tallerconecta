import { CheckCircle2, Star, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { formatCOP } from "@/lib/format";
import { Button } from "@/components/ui";

const PLANES = [
  {
    codigo: "starter",
    nombre: "Starter",
    precio: 0,
    destacado: false,
    descripcion: "Para talleres que empiezan a digitalizar su atención.",
    features: [
      "1 usuario propietario",
      "Hasta 10 órdenes de servicio al mes",
      "Portal del cliente con enlace personal",
      "Presupuestos y aprobaciones por trabajo",
      "Historial y evidencias fotográficas",
      "Soporte por comunidad",
    ],
  },
  {
    codigo: "pro",
    nombre: "Pro",
    precio: 159900,
    destacado: true,
    descripcion: "Para talleres con varios mecánicos y alto volumen.",
    features: [
      "Hasta 10 usuarios (propietario, asesores y mecánicos)",
      "Órdenes de servicio ilimitadas",
      "Todo lo del plan Starter",
      "Tablero de alertas: clientes sin respuesta y retrasos",
      "Versiones de presupuesto con re-aprobación",
      "Auditoría completa de decisiones",
      "WhatsApp Business (cuando esté validado)*",
    ],
  },
  {
    codigo: "premium",
    nombre: "Premium",
    precio: 249900,
    destacado: false,
    descripcion: "Para redes de talleres y operaciones grandes.",
    features: [
      "Usuarios ilimitados",
      "Todo lo del plan Pro",
      "Reportes de ingresos y calificaciones",
      "Soporte prioritario",
      "Acceso anticipado a app móvil",
    ],
  },
];

export const metadata: Metadata = { title: "Planes y precios" };

export default function PreciosPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <section className="relative overflow-hidden rounded-3xl border border-brand-200 bg-brand-900 text-white p-8 sm:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--color-action-400)/15,transparent_60%)]" />
        <div className="relative text-center">
          <p className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-widest text-yellow-400">
            <Star className="h-3 w-3" /> Planes
          </p>
          <h1 className="mt-3 text-white text-4xl font-extrabold tracking-tight sm:text-5xl">
            Precios simples, en pesos colombianos
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-white">
            Prueba gratis el plan pro / 7 días. Sin tarjeta de crédito. Paga mes a mes en pesos colombianos
            ($ COP). Precios referenciales para la demostración del MVP.
          </p>
        </div>
      </section>

      <div className="mt-14 grid gap-6 lg:grid-cols-3">
        {PLANES.map((plan) => (
          <div
            key={plan.codigo}
            className={`card relative flex flex-col p-8 ${
              plan.destacado
                ? "border-brand-600 shadow-lg shadow-brand-500/20 ring-1 ring-brand-600"
                : ""
            }`}
          >
            {plan.destacado && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white">
                Más popular
              </span>
            )}
            <h2 className="text-lg font-bold text-slate-900">{plan.nombre}</h2>
            <p className="mt-1 text-sm text-slate-500">{plan.descripcion}</p>
            <p className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900">
              {formatCOP(plan.precio)}
              <span className="text-base font-medium text-slate-400"> /mes</span>
            </p>
            <ul className="mt-8 flex-1 space-y-3 text-sm text-slate-600">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> {f}
                </li>
              ))}
            </ul>
            <Button
              href={`/precios?plan=${plan.codigo}`}
              variant={plan.destacado ? "action" : "primary"}
              className="mt-9 w-full"
            >
              {plan.destacado ? "Empezar con Pro" : "Elegir plan"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <p className="mt-12 text-center text-xs text-slate-400">
        * Las notificaciones por WhatsApp requieren configuración, consentimiento, plantillas cuando
        correspondan y consideración de sus costos. No dependemos de automatizaciones no oficiales.
      </p>
    </div>
  );
}
