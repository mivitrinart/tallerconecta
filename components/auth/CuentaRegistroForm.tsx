"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Button, Field, Alert } from "@/components/ui";
import { api } from "@/lib/api-client";

export default function CuentaRegistroForm() {
  const router = useRouter();
  const params = useSearchParams();
  const volver = params.get("volver");
  const [form, setForm] = useState({ nombre: "", correo: "", telefono: "+57 ", password: "", sitio_web: "" });
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
      setError("Debes autorizar el tratamiento de datos y aceptar los términos para continuar.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const telefonoLimpio = form.telefono.replace(/\s/g, "");
      await api.post("/api/cuenta/registro", { ...form, telefono: telefonoLimpio, acepta_terminos: true, automation_detected: automationDetected });
      router.push(volver ? `/cuenta?vincular=${encodeURIComponent(volver)}` : "/cuenta");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cuenta.");
      setLoading(false);
    }
  }

  return (
    <div className="card p-7">
      <h1 className="text-xl font-bold text-slate-900">Crear mi cuenta de cliente</h1>
      <p className="mt-1 text-sm text-slate-500">
        Reúne el seguimiento de todos tus talleres en una sola ventana, con tu perfil. Gratis y sin tarjeta.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label="Nombre completo" required>
          <input className="input" required minLength={3} value={form.nombre} onChange={set("nombre")} placeholder="María Gómez" />
        </Field>
        <Field label="Correo electrónico" required hint="Correo con el que iniciarás sesión en tu cuenta">
          <input className="input" type="email" required value={form.correo} onChange={set("correo")} placeholder="maria@example.co" />
        </Field>
        <Field label="Teléfono (WhatsApp)" required>
          <input className="input" type="tel" required minLength={7} value={form.telefono} onChange={setTelefono} placeholder="+57 310 555 4821" />
        </Field>
        <Field label="Contraseña" required hint="Mínimo 8 caracteres">
          <input className="input" type="password" required minLength={8} value={form.password} onChange={set("password")} placeholder="••••••••" />
        </Field>

        {/* Honeypot: campo oculto para detectar bots. Los humanos no lo ven ni lo rellenan. */}
        <div className="absolute -top-10 left-[-9999px]">
          <label htmlFor="sitio_web">Sitio web</label>
          <input
            name="sitio_web"
            id="sitio_web"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="input"
          />
        </div>

        {/* Autorización de tratamiento de datos — Ley 1581 de 2012 */}
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
          <input
            type="checkbox"
            checked={acepta}
            onChange={(e) => setAcepta(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          <span>
            Autorizo el tratamiento de mis datos personales conforme a la{" "}
            <Link href="/legal/privacidad" target="_blank" className="font-semibold text-brand-600 underline">
              Política de Tratamiento de Datos
            </Link>{" "}
            (Ley 1581 de 2012): contacto, vehículos, órdenes, decisiones de aprobación y mensajes, con la finalidad
            de prestar el servicio de seguimiento. Conozco mis derechos a conocer, actualizar, rectificar y
            solicitar la supresión de mis datos. Acepto también los{" "}
            <Link href="/legal/terminos" target="_blank" className="font-semibold text-brand-600 underline">
              Términos de uso
            </Link>
            .
          </span>
        </label>

        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" className="w-full" loading={loading} disabled={loading}>
          <ShieldCheck className="h-4 w-4" /> Crear cuenta y entrar
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-500">
        ¿Ya tienes cuenta?{" "}
        <Link href={`/cuenta/login${volver ? `?volver=${encodeURIComponent(volver)}` : ""}`} className="font-semibold text-brand-600 hover:underline">
          Inicia sesión
        </Link>
      </p>
      <p className="mt-3 text-center text-xs text-slate-400">
        También puedes usar solo tu <strong>enlace personal</strong> de seguimiento, sin crear cuenta.
      </p>
    </div>
  );
}
