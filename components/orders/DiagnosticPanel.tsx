"use client";
/** Módulo 3 · Registro de diagnóstico y recomendaciones. */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Stethoscope } from "lucide-react";
import { Button, Field, Alert, Card, CardHeader, CardBody } from "@/components/ui";
import { DictationButton } from "@/components/shared/DictationButton";
import { api } from "@/lib/api-client";
import type { Diagnostic } from "@/lib/database/types";
import { formatDateTime } from "@/lib/format";

export function DiagnosticPanel({ orderId, diagnostics, puedeEscribir }: { orderId: string; diagnostics: Diagnostic[]; puedeEscribir: boolean }) {
  const router = useRouter();
  const [descripcion, setDescripcion] = useState("");
  const [recomendaciones, setRecomendaciones] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post(`/api/ordenes/${orderId}/diagnostico`, { descripcion, recomendaciones });
      setDescripcion("");
      setRecomendaciones("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el diagnóstico.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {diagnostics.map((d) => (
        <Card key={d.id}>
          <CardHeader
            title="Diagnóstico registrado"
            subtitle={`${formatDateTime(d.created_at)}`}
            icon={<Stethoscope className="h-5 w-5" />}
          />
          <CardBody className="space-y-3 text-sm">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Hallazgos</p>
              <p className="mt-1 whitespace-pre-wrap text-slate-700">{d.descripcion}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Recomendaciones</p>
              <p className="mt-1 whitespace-pre-wrap text-emerald-900">{d.recomendaciones}</p>
            </div>
          </CardBody>
        </Card>
      ))}

      {puedeEscribir && (
        <Card>
          <CardHeader
            title={diagnostics.length ? "Actualizar diagnóstico" : "Registrar diagnóstico"}
            subtitle="El cliente recibirá el aviso “Diagnóstico listo” cuando lo guardes"
            icon={<Stethoscope className="h-5 w-5" />}
          />
          <CardBody>
            <form onSubmit={guardar} className="space-y-4">
              <Field label="Hallazgos de la revisión" required hint="¿Sin ganas de escribir? Dicta por voz: “cambié pastillas, estaban gastadas”">
                <textarea className="input" rows={4} required minLength={10} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Qué se encontró en la revisión, qué se descartó y en qué estado está cada sistema…" />
                <DictationButton className="mt-1.5" onText={(t) => setDescripcion((prev) => (prev ? `${prev} ${t}` : t))} />
              </Field>
              <Field label="Trabajos recomendados" required>
                <textarea className="input" rows={3} required minLength={5} value={recomendaciones} onChange={(e) => setRecomendaciones(e.target.value)} placeholder="Qué se recomienda hacer y por qué…" />
                <DictationButton className="mt-1.5" onText={(t) => setRecomendaciones((prev) => (prev ? `${prev} ${t}` : t))} />
              </Field>
              {error && <Alert tone="error">{error}</Alert>}
              <div className="flex justify-end">
                <Button type="submit" loading={loading}>
                  Guardar y notificar al cliente
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {diagnostics.length === 0 && !puedeEscribir && (
        <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-400">
          Aún no hay diagnóstico registrado para esta orden.
        </p>
      )}
    </div>
  );
}
