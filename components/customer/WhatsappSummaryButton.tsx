"use client";
/**
 * Botón "¿Dónde va mi carro?" — un solo botón gigante que genera el resumen
 * automático del estado y lo envía por WhatsApp (en demo: registra el envío en
 * la bandeja de salida del taller y abre wa.me con el texto listo).
 */
import { useState } from "react";
import { MessageCircle, Copy, Check, Car } from "lucide-react";
import { Modal, Button, Alert } from "@/components/ui";
import { api } from "@/lib/api-client";

export function WhatsappSummaryButton({ orderId, token }: { orderId: string; token: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resumen, setResumen] = useState<string | null>(null);
  const [waUrl, setWaUrl] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pedir() {
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const r = await api.post<{ resumen: string; whatsapp_url: string }>("/api/portal/resumen", { token, order_id: orderId });
      setResumen(r.resumen);
      setWaUrl(r.whatsapp_url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo generar el resumen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Botón gigante: si existe, el cliente no llama */}
      <button
        type="button"
        onClick={pedir}
        className="flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-600 px-5 py-4 text-base font-extrabold text-white shadow-md transition-all hover:bg-emerald-700 active:scale-[0.99]"
      >
        <Car className="h-6 w-6" />
        ¿Dónde va mi carro?
        <MessageCircle className="h-5 w-5" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Resumen de tu servicio">
        {loading && <p className="py-6 text-center text-sm text-slate-400">Generando resumen…</p>}
        {error && <Alert tone="error">{error}</Alert>}
        {resumen && (
          <div className="space-y-4">
            <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-4 font-sans text-sm leading-relaxed text-slate-700">
              {resumen}
            </pre>
            <div className="flex flex-wrap gap-2">
              <a
                href={waUrl ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-success flex-1"
              >
                <MessageCircle className="h-4 w-4" /> Enviar por WhatsApp
              </a>
              <Button
                variant="secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(resumen);
                    setCopiado(true);
                    setTimeout(() => setCopiado(false), 1500);
                  } catch {
                    /* clipboard no disponible */
                  }
                }}
              >
                {copiado ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                {copiado ? "Copiado" : "Copiar"}
              </Button>
            </div>
            <p className="text-[11px] text-slate-400">
              El resumen refleja el estado real registrado por el taller. En la versión productiva se envía por
              WhatsApp Business con plantilla autorizada.
            </p>
          </div>
        )}
      </Modal>
    </>
  );
}
