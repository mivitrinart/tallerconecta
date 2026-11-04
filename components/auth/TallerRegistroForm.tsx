"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button, Field } from "@/components/ui";
import { api } from "@/lib/api-client";

export default function TallerRegistroForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [form, setForm] = useState({
    taller_nombre: "",
    ciudad: "",
    telefono: "+57 ",
    nit: "",
    nombre: "",
    correo: "",
    password: "",
    sitio_web: "",
  });
  const [acepta, setAcepta] = useState(false);
  const [automationDetected, setAutomationDetected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined" && (navigator as { webdriver?: boolean }).webdriver === true) {
      setAutomationDetected(true);
    }
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const setTelefono = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (!value.startsWith("+57")) {
      value = "+57 " + value.replace(/\D/g, "");
    } else {
      const rest = value.slice(3).replace(/\D/g, "");
      value = "+57 " + rest;
    }
    setForm((f) => ({ ...f, telefono: value }));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!acepta) {
      setError("Debes aceptar los términos de uso y la política de tratamiento de datos.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const telefonoLimpio = form.telefono.replace(/\s/g, "");
      const res = await api.post<{ ok: boolean }>("/api/registro", { ...form, telefono: telefonoLimpio, acepta_terminos: true, automation_detected: automationDetected });
      if (res.ok) {
        router.push("/taller/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar el registro.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Registra tu taller</h1>
        <p className="mt-2 text-slate-500">
          7 días de prueba gratis · Plan{" "}
          <span className="font-semibold capitalize text-brand-600">{params.get("plan") ?? "pro"}</span> · Sin
          tarjeta de crédito
        </p>
      </div>

      <form onSubmit={submit} className="card mt-8 space-y-6 p-7">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-slate-400">Datos del taller</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Nombre del taller" required className="sm:col-span-2">
              <input className="input" required minLength={3} placeholder="Ej: Taller MotorX" value={form.taller_nombre} onChange={set("taller_nombre")} />
            </Field>
            <Field label="Ciudad" required>
              <input className="input" required placeholder="Bogotá" value={form.ciudad} onChange={set("ciudad")} />
            </Field>
            <Field label="Teléfono (WhatsApp)" required>
              <input className="input" type="tel" required minLength={7} value={form.telefono} onChange={setTelefono} placeholder="+57 310 555 4821" />
            </Field>
            <Field label="NIT (opcional)" className="sm:col-span-2">
              <input className="input" placeholder="901.234.567-8" value={form.nit} onChange={set("nit")} />
            </Field>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-6">
          <p className="text-sm font-bold uppercase tracking-wide text-slate-400">Tu cuenta (propietario)</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Nombre completo" required>
              <input className="input" required placeholder="Carlos Mejía" value={form.nombre} onChange={set("nombre")} />
            </Field>
            <Field label="Correo electrónico" required>
              <input className="input" type="email" required placeholder="carlos@mitaller.co" value={form.correo} onChange={set("correo")} />
            </Field>
            <Field label="Contraseña" required hint="Mínimo 8 caracteres" className="sm:col-span-2">
              <input className="input" type="password" required minLength={8} placeholder="••••••••" value={form.password} onChange={set("password")} />
            </Field>
          </div>
        </div>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>
        )}

        {/* Autorización de tratamiento — Ley 1581 de 2012 */}
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
          <input
            type="checkbox"
            checked={acepta}
            onChange={(e) => setAcepta(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          <span>
            He leído y acepto los{" "}
            <Link href="/legal/terminos" target="_blank" className="font-semibold text-brand-600 underline">Términos de uso</Link>{" "}
            y la{" "}
            <Link href="/legal/privacidad" target="_blank" className="font-semibold text-brand-600 underline">Política de Tratamiento de Datos</Link>{" "}
            (Ley 1581 de 2012). Como responsable de mi taller, declaro contar con la autorización de mis clientes
            para el tratamiento de los datos que registre en la plataforma.
          </span>
        </label>

        {/* Honeypot: campo oculto para detectar bots. */}
        <div className="absolute -top-10 left-[-9999px]">
          <input
            name="sitio_web"
            id="sitio_web"
            value={form.sitio_web}
            onChange={(e) => setForm((f) => ({ ...f, sitio_web: e.target.value }))}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="input"
          />
        </div>

        <div className="flex flex-col items-center gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-between">
          <p className="text-xs text-slate-400">
            Al registrarte aceptas que este es un MVP de demostración con datos ficticios.
          </p>
          <Button type="submit" size="lg" loading={loading} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Crear cuenta y entrar
          </Button>
        </div>

        <ul className="grid gap-2 border-t border-slate-100 pt-6 text-sm text-slate-600 sm:grid-cols-2">
          {[
            "Panel de órdenes y clientes desde el primer día",
            "Portal del cliente con enlace personal",
            "Presupuestos con aprobación por trabajo",
            "Notificaciones automáticas de estado",
          ].map((t) => (
            <li key={t} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> {t}
            </li>
          ))}
        </ul>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-semibold text-brand-600 hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
