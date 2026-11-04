"use client";
/**
 * Componente de vista de factura electrónica (DIAN · Colombia).
 * Muestra número, CUFE, XML, totales y permite descargar el PDF.
 * Según el estado, permite anular o marcar como pagada.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Download, CheckCircle2, AlertTriangle, Copy } from "lucide-react";
import { Button, Badge, Card, CardHeader, CardBody } from "@/components/ui";
import { api } from "@/lib/api-client";
import { formatCOP, formatDateTime } from "@/lib/format";
import type { Invoice, EstadoFactura } from "@/lib/database/types";

const ESTADO_BADGE: Record<EstadoFactura, string> = {
  borrador: "border-slate-200 bg-slate-50 text-slate-600",
  emitida: "border-emerald-200 bg-emerald-50 text-emerald-700",
  anulada: "border-red-200 bg-red-50 text-red-700",
  pagada: "border-blue-200 bg-blue-50 text-blue-700",
};

const ESTADO_LABEL: Record<EstadoFactura, string> = {
  borrador: "Borrador",
  emitida: "Emitida",
  anulada: "Anulada",
  pagada: "Pagada",
};

interface InvoiceViewProps {
  invoice: Invoice;
  onChange?: () => void;
}

export function InvoiceView({ invoice, onChange }: InvoiceViewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<{ id: string; action: string } | null>(null);

  async function cambiarEstado(action: "anular" | "pagar") {
    setLoading({ id: invoice.id, action });
    try {
      await api.patch(`/api/facturas/${invoice.id}`, { action });
      router.refresh();
      onChange?.();
    } catch (e) {
      setLoading(null);
    }
  }

  function descargarPDF() {
    const link = document.createElement("a");
    link.href = invoice.pdf_url;
    link.download = `factura-${invoice.numero}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function copiarCUFE() {
    navigator.clipboard.writeText(invoice.cufe);
  }

  return (
    <Card className="border-brand-200 ring-1 ring-brand-100">
      <CardHeader
        title="Factura Electrónica DIAN"
        subtitle={`Número ${invoice.numero} · ${invoice.numero}`}
        icon={<FileText className="h-5 w-5" />}
        actions={
          <Badge className={ESTADO_BADGE[invoice.estado]}>
            {ESTADO_LABEL[invoice.estado]}
          </Badge>
        }
      />
      <CardBody className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Número</p>
            <p className="font-mono text-sm font-semibold text-slate-800">{invoice.numero}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Fecha de emisión</p>
            <p className="text-sm font-semibold text-slate-800">{formatDateTime(invoice.fecha_emision)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">CUFE</p>
            <div className="flex items-center gap-2">
              <p className="text-xs font-mono font-semibold text-slate-600 truncate max-w-[120px]" title={invoice.cufe}>
                {invoice.cufe}
              </p>
              <button
                type="button"
                onClick={copiarCUFE}
                className="rounded p-1 text-slate-400 hover:text-brand-600 hover:bg-slate-100"
                title="Copiar CUFE"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Total</p>
            <p className="text-lg font-extrabold tabular-nums text-emerald-700">{formatCOP(invoice.total)}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">NIT Emisor</p>
            <p className="text-sm font-semibold text-slate-800">{invoice.nit_emisor}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Nombre Emisor</p>
            <p className="text-sm font-semibold text-slate-800">{invoice.nombre_emisor}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Cliente</p>
            <p className="text-sm font-semibold text-slate-800">{invoice.nombre_cliente}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Medio de pago</p>
            <p className="text-sm font-semibold text-slate-800">{invoice.medio_pago}</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Orden de servicio</p>
          <p className="text-sm font-semibold text-slate-800">{invoice.service_order_id}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex justify-between text-sm text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span>Subtotal</span><span className="tabular-nums">{formatCOP(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Descuento</span><span className="tabular-nums">−{formatCOP(invoice.descuento)}</span>
            </div>
            <div className="flex justify-between">
              <span>IVA ({invoice.impuesto_porcentaje}%)</span><span className="tabular-nums">{formatCOP(invoice.impuestos)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1 mt-1 font-bold">
              <span>Total</span><span className="tabular-nums text-emerald-700">{formatCOP(invoice.total)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <Button type="button" onClick={descargarPDF} variant="secondary">
              <Download className="h-4 w-4" /> Descargar factura PDF
            </Button>
            <span className="text-xs text-slate-500">DIAN · Formato PDF (demo)</span>
          </div>
        </div>

        {invoice.estado === "emitida" && (
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              onClick={() => cambiarEstado("pagar")}
              loading={loading?.id === invoice.id && loading?.action === "pagar"}
              disabled={loading?.id === invoice.id}
            >
              <CheckCircle2 className="h-4 w-4" /> Marcar como pagada
            </Button>
            <Button
              type="button"
              onClick={() => cambiarEstado("anular")}
              variant="danger"
              loading={loading?.id === invoice.id && loading?.action === "anular"}
              disabled={loading?.id === invoice.id}
            >
              <AlertTriangle className="h-4 w-4" /> Anular factura
            </Button>
          </div>
        )}

        {invoice.estado !== "emitida" && (
          <p className="text-xs text-slate-400">
            Factura {ESTADO_LABEL[invoice.estado]}. No se pueden realizar más cambios.
          </p>
        )}

        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-semibold text-brand-600 hover:text-brand-700">
            Ver XML de factura electrónica (DIAN)
          </summary>
          <div className="mt-2 rounded-xl border border-slate-200 bg-slate-900 p-3 overflow-x-auto text-xs font-mono text-slate-200">
            {invoice.xml.split("\n").map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </details>
      </CardBody>
    </Card>
  );
}
