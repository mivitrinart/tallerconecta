"use client";
import { useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Button, Field, Alert } from "@/components/ui";

export default function RecuperarAccesoPage() {
  const [correo, setCorreo] = useState("");
  const [enviado, setEnviado] = useState(false);

  return (
    <div className="card p-7">
      <h1 className="text-xl font-bold text-slate-900">Recuperar acceso</h1>
      <p className="mt-1 text-sm text-slate-500">
        Te enviaremos un enlace para restablecer tu contraseña.
      </p>

      {enviado ? (
        <div className="mt-6">
          <Alert tone="success" title="Correo enviado (simulado)">
            Si existe una cuenta para <strong>{correo}</strong>, recibirá un enlace de recuperación.
            En el modo demo no se envían correos reales.
          </Alert>
          <Link href="/login" className="btn-secondary mt-5 w-full">
            Volver a iniciar sesión
          </Link>
        </div>
      ) : (
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setEnviado(true);
          }}
        >
          <Field label="Correo electrónico">
            <input className="input" type="email" required placeholder="tu@correo.co" value={correo} onChange={(e) => setCorreo(e.target.value)} />
          </Field>
          <Button type="submit" className="w-full">
            <MailCheck className="h-4 w-4" /> Enviar enlace de recuperación
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-slate-500">
        <Link href="/login" className="font-semibold text-brand-600 hover:underline">
          ← Volver a iniciar sesión
        </Link>
      </p>
    </div>
  );
}
