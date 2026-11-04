"use client";
/**
 * Firma digital de conformidad de la entrega.
 * El cliente firma con el dedo o el mouse; la firma se guarda como evidencia
 * (junto con las fotos de salida) para evitar el "me entregaron rayado".
 */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PenLine, Eraser, CheckCircle2 } from "lucide-react";
import { Button, Alert } from "@/components/ui";
import { api } from "@/lib/api-client";

export function SignaturePad({ orderId, token }: { orderId: string; token: string }) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dibujando = useRef(false);
  const tieneTrazo = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [firmado, setFirmado] = useState(false);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  function punto(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * c.width,
      y: ((e.clientY - r.top) / r.height) * c.height,
    };
  }

  function limpiar() {
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    tieneTrazo.current = false;
  }

  async function firmar() {
    if (!tieneTrazo.current) {
      setError("Dibuja tu firma primero.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const dataUrl = canvasRef.current!.toDataURL("image/png");
      await api.post("/api/portal/firma", { token, order_id: orderId, firma: dataUrl });
      setFirmado(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar la firma.");
    } finally {
      setLoading(false);
    }
  }

  if (firmado) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
        <p className="flex items-center gap-2 font-bold">
          <CheckCircle2 className="h-4 w-4" /> Entrega firmada
        </p>
        <p className="mt-1 text-xs opacity-80">
          Tu firma de conformidad quedó guardada como evidencia junto con las fotos de salida.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="flex items-center gap-2 text-sm font-bold text-slate-800">
        <PenLine className="h-4 w-4 text-brand-600" /> Firma digital de conformidad
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Revisa las fotos de salida y firma si recibiste el vehículo conforme. Tu firma se guarda como evidencia
        de la entrega (protege al cliente y al taller).
      </p>
      <canvas
        ref={canvasRef}
        width={640}
        height={180}
        className="mt-3 w-full cursor-crosshair touch-none rounded-xl border-2 border-dashed border-slate-300 bg-white"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          dibujando.current = true;
          const ctx = e.currentTarget.getContext("2d")!;
          const p = punto(e);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
        }}
        onPointerMove={(e) => {
          if (!dibujando.current) return;
          tieneTrazo.current = true;
          const ctx = e.currentTarget.getContext("2d")!;
          const p = punto(e);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }}
        onPointerUp={() => (dibujando.current = false)}
        onPointerLeave={() => (dibujando.current = false)}
      />
      {error && <Alert tone="error" className="mt-3">{error}</Alert>}
      <div className="mt-3 flex justify-end gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={limpiar}>
          <Eraser className="h-3.5 w-3.5" /> Borrar
        </Button>
        <Button type="button" size="sm" onClick={firmar} loading={loading}>
          <PenLine className="h-3.5 w-3.5" /> Firmar conformidad de entrega
        </Button>
      </div>
    </div>
  );
}
