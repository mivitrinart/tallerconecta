import Link from "next/link";
import type { Metadata } from "next";
import { SessionGate } from "@/components/shared/SessionGate";
import { SessionActions } from "@/components/shared/SessionActions";
import {
  ArrowRight,
  Car,
  CheckCircle2,
  Clock,
  Headphones,
  Phone,
  ShieldCheck,
  Smartphone,
  Wrench,
} from "lucide-react";
import { Card } from "@/components/ui";

export const metadata: Metadata = {
  title: "Taller Conecta",
  description:
    "Taller Conecta: recibe, cotiza, recibe aprobación y entrega con evidencia, todo desde una sola app. Hecho para talleres en Colombia. Empieza gratis.",
};

const PILARES = [
  {
    icon: <Wrench className="h-5 w-5" />,
    titulo: "Panel del taller",
    texto: "Órdenes, mecánicos, presupuestos y clientes en un solo lugar, sin papel ni llamadas perdidas.",
  },
  {
    icon: <Smartphone className="h-5 w-5" />,
    titulo: "Portal del cliente",
    texto: "Tu cliente sigue el avance de su carro desde el celular, aprueba presupuestos y te escribe cuando lo necesite.",
  },
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    titulo: "Menos llamadas",
    texto: "El estado de la orden se actualiza solo. El cliente ya no tiene que llamar para preguntar \"¿ya quedó mi carro?\".",
  },
  {
    icon: <Headphones className="h-5 w-5" />,
    titulo: "Más confianza",
    texto: "Evidencia fotográfica y decisiones registradas. El cliente sabe exactamente qué se hizo y por qué se cobra.",
  },
];

const PASOS = [
  {
    n: 1,
    titulo: "Recibes el carro",
    texto: "Registras el cliente, el vehículo, el kilometraje y los daños visibles al ingreso.",
  },
  {
    n: 2,
    titulo: "Haces el diagnóstico",
    texto: "Anotas los hallazgos, las recomendaciones y tomas fotos del estado inicial del carro.",
  },
  {
    n: 3,
    titulo: "Envías el presupuesto",
    texto: "Detallas repuestos, mano de obra y el total. El cliente lo recibe en su celular y lo aprueba o consulta.",
  },
  {
    n: 4,
    titulo: "El cliente decide",
    texto: "Aprueba, rechaza o pregunta. Cualquier trabajo nuevo requiere una autorización aparte, sin sorpresas al entregar.",
  },
  {
    n: 5,
    titulo: "Reparas con seguimiento",
    texto: "Subes avances y evidencias; el cliente recibe notificaciones en cada cambio real de estado.",
  },
  {
    n: 6,
    titulo: "Entregas y cierras",
    texto: "Cobras el valor acordado, entregas el vehículo y pides la calificación del servicio.",
  },
];

const PREGUNTAS = [
  {
    q: "¿Qué incluye el plan gratuito?",
    a: "El plan Starter es para talleres que están comenzando: un usuario propietario, hasta 10 órdenes de servicio al mes, portal del cliente con enlace personal, presupuestos con aprobación por trabajo e historial con evidencias fotográficas.",
  },
  {
    q: "¿Cuánto cuesta el plan Pro y qué incluye?",
    a: "Cuesta $159.900 al mes (pesos colombianos). Incluye hasta 10 usuarios, órdenes ilimitadas, tablero de alertas, versiones de presupuesto con re-aprobación, auditoría completa y WhatsApp Business cuando esté validado.",
  },
  {
    q: "¿El cliente debe instalar alguna aplicación?",
    a: "No. El portal del cliente es una página web que se abre con un enlace personal desde el celular o el computador. Funciona como app web, sin descargas de tiendas de aplicaciones.",
  },
  {
    q: "¿Para qué sirve cada color del semáforo?",
    a: "Es funcional, no decorativo: rojo indica una reparación urgente (atención inmediata), ámbar indica una tarea recomendada pronto y verde indica mantenimiento preventivo que el cliente puede aprobar con tiempo.",
  },
  {
    q: "¿Los precios incluyen impuestos?",
    a: "Los precios mostrados son referenciales para la demostración del MVP y se expresan en pesos colombianos ($ COP). Al contratar, se confirma el valor final con los impuestos aplicables.",
  },
  {
    q: "¿Puedo cambiar de plan en cualquier momento?",
    a: "Sí. Puedes subir o bajar de plan cuando lo necesites desde tu cuenta. Los cambios se aplican al siguiente ciclo de facturación.",
  },
];

const DEMO_DB = [
  { placa: "XYZ-123", cliente: "María Gómez", estado: "en_diagnostico" as const, urgencia: "urgente" as const },
  { placa: "JKL-456", cliente: "Carlos Ruiz", estado: "esperando_aprobacion" as const, urgencia: "recomendado" as const },
  { placa: "MNO-789", cliente: "Ana Peña", estado: "autorizado" as const, urgencia: "preventivo" as const },
];

const URGENCIA_CFG: Record<string, { cls: string; dot: string; label: string }> = {
  urgente: { cls: "urgente", dot: "urgente-dot", label: "Urgente" },
  recomendado: { cls: "recomendado", dot: "recomendado-dot", label: "Recomendado pronto" },
  preventivo: { cls: "preventivo", dot: "preventivo-dot", label: "Preventivo" },
};

/** Encabezado de sección numerado: da orden visual a la página. */
function SeccionHeader({ n, kicker, titulo, sub }: { n: string; kicker: string; titulo: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-200 bg-brand-50 text-sm font-extrabold text-brand-600">
        {n}
      </span>
      <p className="mt-4 text-xs font-bold uppercase tracking-widest text-brand-600">{kicker}</p>
      <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{titulo}</h2>
      {sub && <p className="mx-auto mt-4 max-w-2xl text-slate-500">{sub}</p>}
    </div>
  );
}

export default function LandingPage() {
  return (
    <SessionGate customerRedirect="/cuenta">
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden bg-brand-900 text-white">
        {/* Patrón de rejilla sutil + halos de marca */}
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              "linear-gradient(var(--color-brand-300) 1px, transparent 1px), linear-gradient(90deg, var(--color-brand-300) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--color-action-400)/20,transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,var(--color-brand-800)/50,transparent_50%)]" />

        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:py-36">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              🇨🇴 Disponible para talleres en Colombia
            </div>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Que tu cliente siempre sepa qué pasa con su carro,{" "}
              <span className="text-brand-300">sin tener que llamar al taller.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-brand-100">
              Taller Conecta: tu taller y tus clientes, en un solo lugar. Recibe el vehículo,
              envía el presupuesto, consigue la aprobación con un clic y entrega con evidencia
              en foto y video. Tus clientes ven cómo va su carro desde el celular, sin llamarte
              y sin descargar nada. Hecho para talleres en Colombia: precios en pesos colombianos
              y todo en español.
            </p>
            <div className="mt-10 flex flex-wrap gap-3 sm:gap-4">
                <SessionActions
                  authedHref="/taller/dashboard"
                  authedLabel="Ir al panel"
                  guestHref="/registro"
                  guestLabel="Empieza gratis"
                  guestSecondaryHref="/precios"
                  guestSecondaryLabel="Ver planes"
                />
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-brand-200/80">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> 7 días gratis, sin tarjeta</span>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Datos aislados por taller</span>
              <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-emerald-400" /> Menos llamadas repetitivas</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 01 · CÓMO FUNCIONA ═══ */}
      <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 sm:py-24">
        <SeccionHeader
          n="01"
          kicker="Cómo funciona"
          titulo="El flujo de atención, de principio a fin"
          sub="Todo lo que el taller y el cliente necesitan desde el primer día, sin tecnicismos."
        />
        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {PASOS.map((p) => (
            <div
              key={p.n}
              className="card group relative p-6 transition-all hover:-translate-y-1 hover:shadow-lift hover:border-brand-200"
            >
              <span className="absolute -top-3 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white shadow-glow">
                {p.n}
              </span>
              <h3 className="mt-1 font-bold text-slate-900">{p.titulo}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{p.texto}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          <SessionActions
            authedHref="/taller/ordenes/nueva"
            authedLabel="Crear mi primera orden"
            guestHref="/registro"
            guestLabel="Empieza gratis"
            guestSecondaryHref="/precios"
            guestSecondaryLabel="Conocer los planes"
          />
        </div>
      </section>

      {/* ═══ 02 · BENEFICIOS ═══ */}
      <section id="beneficios" className="border-y border-slate-200 bg-slate-50 scroll-mt-20">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <SeccionHeader
            n="02"
            kicker="Beneficios"
            titulo="Cuatro razones para digitalizar tu taller"
            sub="Menos caos operativo y más clientes que confían en tu trabajo."
          />
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PILARES.map((p) => (
              <div key={p.titulo} className="card p-7 transition-all hover:-translate-y-1 hover:shadow-lift hover:border-brand-200">
                <div className="inline-flex rounded-xl bg-brand-50 p-3 text-brand-600 ring-1 ring-brand-100">
                  {p.icon}
                </div>
                <h3 className="mt-5 font-bold text-slate-900">{p.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{p.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 03 · SEMÁFORO ═══ */}
      <section id="semaforo" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 sm:py-24">
        <SeccionHeader
          n="03"
          kicker="Semáforo de urgencia"
          titulo="Cada reparación tiene su prioridad, y el cliente lo entiende"
          sub="Los colores sirven para decidir, no para decorar. El taller clasifica cada trabajo y el cliente sabe si su carro puede esperar o no."
        />
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          <div className="card p-6">
            <div className="flex items-start gap-3">
              <div className="urgente-dot mt-1.5" />
              <div>
                <p className="font-bold text-red-800">Rojo · Urgente</p>
                <p className="text-xs text-red-600">Riesgo de seguridad o avería crítica</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              El taller lo prioriza y avisa al cliente de inmediato. Reparaciones que no pueden
              esperar, como frenos, dirección o pérdida de aceite.
            </p>
          </div>
          <div className="card p-6">
            <div className="flex items-start gap-3">
              <div className="recomendado-dot mt-1.5" />
              <div>
                <p className="font-bold text-amber-800">Ámbar · Recomendado pronto</p>
                <p className="text-xs text-amber-600">Desgaste que conviene atender pronto</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Tareas que no detienen el carro hoy, pero que es mejor programar antes de que se
              compliquen: pastillas, cinturón, neumáticos desgastados.
            </p>
          </div>
          <div className="card p-6">
            <div className="flex items-start gap-3">
              <div className="preventivo-dot mt-1.5" />
              <div>
                <p className="font-bold text-emerald-800">Verde · Preventivo</p>
                <p className="text-xs text-emerald-600">Mantenimiento programado</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Revisión planificada con tiempo: cambio de aceite, filtros, alineación. El cliente lo
              aprueba con antelación y evita sorpresas al entregar.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ 04 · EN ACCIÓN ═══ */}
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <SeccionHeader
            n="04"
            kicker="Verlo en acción"
            titulo="Dos pantallas, una misma orden"
            sub="El taller gestiona desde su panel y el cliente sigue el avance desde su celular, sin instalar nada."
          />
          <div className="mt-14 flex flex-col items-center justify-center gap-10 sm:flex-row sm:gap-8">
            {/* Celular — portal del cliente */}
            <div className="flex flex-col items-center">
              <p className="mb-8 text-xs font-semibold uppercase tracking-wider text-slate-500">Portal del cliente</p>
              <div className="relative h-[420px] w-[200px] overflow-hidden rounded-[2rem] border-2 border-slate-900 bg-slate-900 shadow-2xl sm:h-[520px] sm:w-[250px]">
                <div className="flex h-10 items-center justify-between border-b border-slate-700 px-3 sm:px-4">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-brand-400" />
                    <span className="text-[10px] font-medium text-slate-300 sm:text-xs">TallerConecta</span>
                  </div>
                  <div className="text-[9px] text-slate-400 sm:text-[10px]">10:42</div>
                </div>
                <div className="h-[calc(100%-2.5rem)] space-y-3 overflow-y-auto p-3 sm:space-y-4 sm:p-4">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white sm:h-8 sm:w-8">
                      <Car className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-semibold leading-none text-white sm:text-sm">Chevrolet Spark · XYZ-123</p>
                      <p className="mt-1 truncate text-[10px] leading-none text-slate-300 sm:text-xs">En diagnóstico · María Gómez</p>
                    </div>
                    <span className="urgente text-[10px] sm:text-xs">Urgente</span>
                  </div>
                  <div className="space-y-2 rounded-xl bg-slate-800/50 p-2 sm:space-y-2 sm:p-3">
                    <p className="text-[10px] font-semibold text-white sm:text-xs">Presupuesto #4521</p>
                    <p className="text-[10px] text-slate-300 sm:text-xs">Frenos delanteros · $98.000</p>
                    <div className="flex gap-1 pt-2 sm:gap-2">
                      <span className="btn-action flex-1 text-center text-[10px] py-1.5 sm:text-xs sm:py-2">Aprobar</span>
                      <span className="btn-secondary flex-1 border-slate-600 text-center text-[10px] text-slate-300 sm:text-xs sm:py-2">Consultar</span>
                    </div>
                  </div>
                  <div className="grid gap-1 sm:gap-2">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 sm:text-[10px]">Evidencias</p>
                    <div className="grid grid-cols-2 gap-1 sm:gap-1.5">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-7 rounded-lg bg-slate-700 sm:h-10" />
                      ))}
                    </div>
                  </div>
                  <p className="text-center text-[9px] text-slate-400 sm:text-xs">Última actualización: hace 12 min</p>
                </div>
              </div>
            </div>

            {/* Laptop — panel del taller */}
            <div className="flex flex-col items-center">
              <p className="mb-8 text-xs font-semibold uppercase tracking-wider text-slate-500">Panel del taller</p>
              <div className="relative h-[210px] w-[320px] overflow-hidden rounded-[1.6rem] border-2 border-slate-900 bg-slate-900 shadow-2xl sm:h-[270px] sm:w-[400px] lg:h-[340px] lg:w-[520px]">
                <div className="flex h-8 items-center justify-between border-b border-slate-700 px-3 sm:h-10 sm:px-4">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="flex h-4 w-4 items-center justify-center rounded-lg bg-brand-600 text-white sm:h-6 sm:w-6">
                      <Wrench className="h-2 w-2 sm:h-3 sm:w-3" />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-200 sm:text-xs">Panel del taller</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] text-slate-400 sm:gap-1.5 sm:text-[10px]">
                    <div className="h-2 w-2 rounded-full bg-slate-600 sm:h-3 sm:w-3" />
                    <div className="h-2 w-2 rounded-full bg-slate-600 sm:h-3 sm:w-3" />
                    <div className="h-2 w-2 rounded-full bg-slate-600 sm:h-3 sm:w-3" />
                    <span>Viernes · 10:42</span>
                  </div>
                </div>
                <div className="flex h-[calc(100%-2rem)] flex-col overflow-hidden p-2 sm:h-[calc(100%-2.5rem)] sm:p-4">
                  <div className="mb-2 flex items-center justify-between sm:mb-3">
                    <h3 className="text-[10px] font-semibold text-white sm:text-xs">Órdenes de hoy</h3>
                    <span className="text-[10px] text-slate-400 sm:text-xs">12 órdenes · 3 pendientes</span>
                  </div>
                  <div className="flex-1 space-y-2 overflow-y-auto sm:space-y-2.5">
                    {DEMO_DB.map((o, i) => {
                      const cfg = URGENCIA_CFG[o.urgencia];
                      return (
                        <div key={o.placa} className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 p-1.5 sm:gap-3 sm:p-2.5">
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[9px] font-bold text-white sm:h-7 sm:w-7 sm:text-xs">
                            {i + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[10px] font-medium text-slate-200 sm:text-xs">{o.placa} — {o.cliente}</p>
                            <p className="truncate text-[9px] text-slate-400 sm:text-[10px]">{o.estado.replace("_", " ")}</p>
                          </div>
                          <span className={`text-[10px] font-bold sm:text-xs ${cfg.cls}`}>{cfg.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-10 text-center text-xs text-slate-400">
            Maquetas construidas con componentes y Tailwind. Las órdenes, nombres y precios son
            ficticios (demostración del MVP).
          </p>
        </div>
      </section>

      {/* ═══ 05 · PLANES ═══ */}
      <section id="planes" className="scroll-mt-20">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <SeccionHeader
            n="05"
            kicker="Planes"
            titulo="Planes simples, en pesos colombianos"
            sub="Prueba gratis el plan Pro 7 días. Sin tarjeta de crédito. Elige el plan que le cuadra a tu taller y paga mes a mes."
          />

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {/* Starter */}
            <div className="card relative flex flex-col p-8 transition-all hover:shadow-lift">
              <h3 className="text-lg font-bold text-slate-900">Starter</h3>
              <p className="mt-1 text-sm text-slate-500">Para talleres que empiezan a digitalizarse.</p>
              <p className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900">
                Gratis<span className="text-base font-medium text-slate-400"> /mes</span>
              </p>
              <ul className="mt-7 flex-1 space-y-3 text-sm text-slate-600">
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> 1 usuario propietario</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> Hasta 10 órdenes de servicio al mes</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> Portal del cliente con enlace personal</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> Presupuestos y aprobaciones por trabajo</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> Historial y evidencias fotográficas</li>
              </ul>
              <Link href="/registro" className="btn-primary mt-8 w-full text-sm">Empezar gratis</Link>
            </div>

            {/* Pro */}
            <div className="card relative flex flex-col border-brand-600 p-8 shadow-glow ring-1 ring-brand-600">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white">
                Más popular
              </span>
              <h3 className="text-lg font-bold text-slate-900">Pro</h3>
              <p className="mt-1 text-sm text-slate-500">Para talleres con varios mecánicos.</p>
              <p className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900">
                $159.900<span className="text-base font-medium text-slate-400"> /mes</span>
              </p>
              <ul className="mt-7 flex-1 space-y-3 text-sm text-slate-600">
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> Hasta 10 usuarios (propietario, asesores, mecánicos)</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> Órdenes de servicio ilimitadas</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> Todo lo del plan Starter</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> Tablero de alertas: clientes sin respuesta y retrasos</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> Versiones de presupuesto con re-aprobación</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> Auditoría completa de decisiones</li>
              </ul>
              <Link href="/registro" className="btn-action mt-8 w-full text-sm">Empezar con Pro</Link>
            </div>

            {/* Premium */}
            <div className="card relative flex flex-col p-8 transition-all hover:shadow-lift">
              <h3 className="text-lg font-bold text-slate-900">Premium</h3>
              <p className="mt-1 text-sm text-slate-500">Para redes de talleres y operaciones grandes.</p>
              <p className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900">
                $249.900<span className="text-base font-medium text-slate-400"> /mes</span>
              </p>
              <ul className="mt-7 flex-1 space-y-3 text-sm text-slate-600">
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> Usuarios ilimitados</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> Todo lo del plan Pro</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> Reportes de ingresos y calificaciones</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> Soporte prioritario</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> Acceso anticipado a la app móvil</li>
              </ul>
              <Link href="/registro" className="btn-primary mt-8 w-full text-sm">Empezar con Premium</Link>
            </div>
          </div>

          <p className="mt-10 text-center text-xs text-slate-400">
            Los precios son referenciales para la demostración del MVP y se expresan en pesos
            colombianos ($ COP). Al contratar se confirma el valor final con los impuestos
            aplicables.
          </p>
        </div>
      </section>

      {/* ═══ 06 · PREGUNTAS ═══ */}
      <section id="preguntas-frecuentes" className="border-t border-slate-200 bg-slate-50 scroll-mt-20">
        <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 sm:py-24">
          <SeccionHeader
            n="06"
            kicker="Preguntas frecuentes"
            titulo="Las dudas más comunes de los talleres"
          />
          <div className="mt-12 space-y-3">
            {PREGUNTAS.map((p) => (
              <Card key={p.q} className="overflow-hidden border-slate-200 bg-white">
                <div className="flex w-full items-center justify-between gap-2 bg-slate-50 px-5 py-4 text-left">
                  <span className="font-semibold text-slate-900">{p.q}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-brand-600" />
                </div>
                <div className="border-t border-slate-100 px-5 py-4">
                  <p className="text-sm leading-relaxed text-slate-600">{p.a}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA FINAL ═══ */}
      <section className="relative overflow-hidden bg-brand-900 text-white">
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(var(--color-brand-300) 1px, transparent 1px), linear-gradient(90deg, var(--color-brand-300) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--color-action-400)/20,transparent_55%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            ¿Listo para recibir menos llamadas y más aprobaciones?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-brand-100">
            Conecta tu taller con tus clientes desde hoy. Prueba gratis durante 7 días, sin tarjeta
            de crédito.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <SessionActions
              authedHref="/taller/dashboard"
              authedLabel="Ir al panel"
              guestHref="/registro"
              guestLabel="Empieza gratis"
              guestSecondaryHref="/precios"
              guestSecondaryLabel="Ver planes"
            />
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Taller Conecta",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            "offers": { "@type": "Offer", "price": "0", "priceCurrency": "COP" },
            "description":
              "Taller Conecta conecta talleres mecánicos con sus clientes. El cliente siempre sabe qué pasa con su carro sin tener que llamar al taller. Registro de vehículos, diagnóstico, presupuestos con aprobación del cliente, evidencias y entregas. Para talleres en Colombia, precios en COP, cumplimiento Ley 1581 de 2012.",
            "author": { "@type": "Organization", "name": "Taller Conecta" },
          }),
        }}
      />
    </SessionGate>
  );
}
