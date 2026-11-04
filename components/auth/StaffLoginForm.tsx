"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { KeyRound, Users } from "lucide-react";
import { Button, Field } from "@/components/ui";
import { api } from "@/lib/api-client";

export default function StaffLoginForm({ onIrACliente }: { onIrACliente?: () => void }) {
  const router = useRouter();
  const params = useSearchParams();
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [sitioWeb, setSitioWeb] = useState("");
  const [automationDetected, setAutomationDetected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined" && (navigator as { webdriver?: boolean }).webdriver === true) {
      setAutomationDetected(true);
    }
  }, []);

  async function entrar(mail: string, pass: string) {
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      const res = await api.post<{ redirect: string }>("/api/auth/login", { correo: mail, password: pass, sitio_web: sitioWeb, automation_detected: automationDetected });
      const next = params.get("next");
      const destino = next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/api") ? next : res.redirect;
      router.push(destino);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
      setLoading(false);
    }
  }

  return (
    <div className="card p-7">
      <h1 className="text-xl font-bold text-slate-900">Iniciar sesión</h1>
      <p className="mt-1 text-sm text-slate-500">
        Panel del taller y portal de administración.
      </p>

      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          entrar(correo, password);
        }}
      >
        <Field label="Correo electrónico">
          <input className="input" type="email" required placeholder="tu@correo.co" value={correo} onChange={(e) => setCorreo(e.target.value)} />
        </Field>
        <Field label="Contraseña">
          <input className="input" type="password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
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

        {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">{error}</p>}
        {msg && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">{msg}</p>}

        <div className="flex items-center justify-between gap-3">
          <Link href="/recuperar-acceso" className="text-sm font-medium text-brand-600 hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
          <Button type="submit" loading={loading} disabled={loading}>
            Entrar
          </Button>
        </div>
      </form>

      <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs leading-relaxed text-emerald-800">
        <strong>¿El taller te creó la cuenta?</strong> Entra con el correo y la contraseña inicial que te dio el
        propietario — <u>no necesitas registrarte</u>. Si la olvidaste, pídele que genere una nueva desde
        Panel → Equipo.
      </div>

      {onIrACliente && (
        <button
          type="button"
          onClick={onIrACliente}
          className="mt-5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-600 hover:border-brand-300 hover:text-brand-700"
        >
          👤 ¿Eres cliente? Inicia sesión como cliente
        </button>
      )}

      <p className="mt-5 text-center text-sm text-slate-500">
        ¿Tu taller aún no está registrado?{" "}
        <Link href="/registro" className="font-semibold text-brand-600 hover:underline">
          Crea una cuenta
        </Link>
      </p>
    </div>
  );
}
