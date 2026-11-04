"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Field, Alert } from "@/components/ui";
import { api } from "@/lib/api-client";

export default function CuentaLoginForm({ onIrATaller }: { onIrATaller?: () => void }) {
  const router = useRouter();
  const params = useSearchParams();
  const volver = params.get("volver");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [sitioWeb, setSitioWeb] = useState("");
  const [automationDetected, setAutomationDetected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined" && (navigator as { webdriver?: boolean }).webdriver === true) {
      setAutomationDetected(true);
    }
  }, []);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post("/api/cuenta/login", { correo, password, sitio_web: sitioWeb, automation_detected: automationDetected });
      // Si llegó desde un enlace personal, lo vincula automáticamente al entrar
      router.push(volver ? `/cuenta?vincular=${encodeURIComponent(volver)}` : "/cuenta");
      router.refresh();
    } catch (err) {
      const apiErr = err as { status?: number; message?: string };
      setError(apiErr.message ?? "No se pudo iniciar sesión. Verifica tu correo y contraseña.");
      setLoading(false);
    }
  }

  return (
    <div className="card p-7">
      <h1 className="text-xl font-bold text-slate-900">Iniciar sesión como cliente</h1>
      <p className="mt-1 text-sm text-slate-500">
        Tu cuenta reúne el seguimiento de todos tus talleres en una sola ventana, con tu perfil.
      </p>

      <form onSubmit={entrar} className="mt-6 space-y-4">
        <Field label="Correo electrónico">
          <input className="input" type="email" required value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="tu@correo.co" />
        </Field>
        <Field label="Contraseña">
          <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </Field>

        {/* Honeypot: campo oculto para detectar bots. */}
        <div className="absolute -top-10 left-[-9999px]">
          <label htmlFor="sitio_web">Sitio web</label>
          <input
            id="sitio_web"
            name="sitio_web"
            value={sitioWeb}
            onChange={(e) => setSitioWeb(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="input"
          />
        </div>

        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" className="w-full" loading={loading}>Entrar a mi cuenta</Button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-500">
        ¿Aún no tienes cuenta?{" "}
        <Link href={`/registro${volver ? `?volver=${encodeURIComponent(volver)}` : ""}`} className="font-semibold text-brand-600 hover:underline">
          Créala gratis
        </Link>
      </p>
      {onIrATaller ? (
        <button
          type="button"
          onClick={onIrATaller}
          className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600 hover:border-brand-300 hover:text-brand-700"
        >
          🔧 ¿Eres del taller? Cambiar al acceso del personal
        </button>
      ) : (
        <p className="mt-3 text-center text-xs text-slate-400">
          ¿Eres del taller? <Link href="/login" className="font-medium text-slate-500 underline">Entrar al panel del taller</Link>
        </p>
      )}
    </div>
  );
}
