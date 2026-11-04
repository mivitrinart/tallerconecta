"use client";

import { UserPlus, LogIn } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui";
import { CopyBox } from "@/components/customers/CustomerForms";
import { api } from "@/lib/api-client";
import { useState } from "react";

interface TallerConectarFormProps {
  workshop: { nombre: string; ciudad: string; telefono: string };
  token: string;
  esCliente: boolean;
  session: { rol: string } | null;
  logoUrl: string | null;
}

export function TallerConectarForm({ workshop, token, esCliente, session, logoUrl }: TallerConectarFormProps) {
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function vincular() {
    setLoading(true);
    setMsg(null);
    setErr(null);
    try {
      await api.post("/api/cuenta/vincular-publico", { enlace_publico: token });
      setMsg("Solicitud de vinculación enviada. El taller la aceptará o rechazará.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo enviar la solicitud.");
    } finally {
      setLoading(false);
    }
  }

  const haySesion = !!session;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <span className="relative h-10 w-10 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 shrink-0 block">
          {logoUrl ? (
            <Image
              fill
              src={logoUrl}
              alt={`Logo ${workshop.nombre}`}
              className="rounded-full object-cover"
              sizes="48px"
            />
          ) : (
            <Image
              fill
              src="/logos/default.svg"
              alt={`Logo ${workshop.nombre}`}
              className="rounded-full object-cover"
              sizes="48px"
            />
          )}
        </span>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{workshop.nombre}</h1>
          <p className="text-xs text-slate-500">{workshop.ciudad} · {workshop.telefono}</p>
        </div>
      </div>

      <p className="text-sm text-slate-600 mb-6">
        Este es el enlace público de vinculación de <strong>{workshop.nombre}</strong>. Si ya tienes una
        cuenta de cliente, puedes solicitar que tu cuenta se vincule a este taller. El taller revisará y
        aceptará o rechazará la solicitud.
      </p>

      {esCliente ? (
        <>
          <Button
            onClick={vincular}
            disabled={loading}
            className="w-full btn-primary"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" /> Solicitar vinculación a mi cuenta
              </>
            )}
          </Button>
          {msg && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{msg}</div>}
          {err && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</div>}
        </>
      ) : haySesion ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center mb-6">
          <p className="text-sm font-medium text-slate-700">Ya iniciaste sesión con otra cuenta.</p>
          <p className="mt-1 text-xs text-slate-500">Cierra sesión e inicia con una cuenta de cliente para solicitar la vinculación.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center mb-6">
          <p className="text-sm font-medium text-slate-700">Inicia sesión como cliente para solicitar la vinculación</p>
          <p className="mt-1 text-xs text-slate-500">Necesitas una cuenta de cliente para vincularte a este taller.</p>
          <div className="mt-4 flex gap-2 justify-center">
            <a href="/cuenta/login" className="btn-primary px-6">
              <LogIn className="h-4 w-4 mr-2" /> Iniciar sesión
            </a>
            <a href="/cuenta/registro" className="btn-secondary px-6">
              <UserPlus className="h-4 w-4 mr-2" /> Crear cuenta
            </a>
          </div>
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-slate-100">
        <p className="text-xs text-slate-400">Enlace público:</p>
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3">
          <span className="flex-shrink-0 text-xs font-mono text-slate-500">/taller-conectar/</span>
          <span className="flex-1 truncate text-xs font-mono text-slate-700">{token}</span>
          <CopyBox label="" value={`/taller-conectar/${token}`} />
        </div>
      </div>
    </div>
  );
}
