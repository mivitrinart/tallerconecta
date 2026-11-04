import type { Metadata } from "next";
import { MessageSquare, Inbox } from "lucide-react";
import { requireSession } from "@/lib/auth/session";
import { getInbox, getOrderDetail } from "@/lib/database/queries";
import { EmptyState, StatusBadge, Badge } from "@/components/ui";
import { MessageThread } from "@/components/shared/MessageThread";
import { formatTimeAgo } from "@/lib/format";
import { cn } from "@/lib/cn";
import Link from "next/link";

export const metadata: Metadata = { title: "Mensajes" };
export const dynamic = "force-dynamic";

export default async function MensajesPage({ searchParams: searchParamsP }: { searchParams: Promise<{ orden?: string }> }) {
  const searchParams = await searchParamsP;
  const session = await requireSession();
  const inbox = getInbox(session.workshop_id!);
  const seleccionado = searchParams.orden ? inbox.find((r) => r.order.id === searchParams.orden) : null;
  const detail = seleccionado ? getOrderDetail(seleccionado.order.id, session.workshop_id!) : null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Mensajes</h1>
        <p className="mt-1 text-sm text-slate-500">
          Atención centralizada: menos consultas repetidas y respuestas más oportunas (Módulo 6).
        </p>
      </div>

      {inbox.length === 0 ? (
        <EmptyState icon={<Inbox className="h-10 w-10" />} title="Bandeja vacía" description="Cuando los clientes escriban desde su portal, los hilos aparecerán aquí." />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[22rem_1fr]">
          <div className="card max-h-[36rem] space-y-1 overflow-y-auto p-2">
            {inbox.map((row) => (
              <Link
                key={row.order.id}
                href={`/taller/mensajes?orden=${row.order.id}`}
                className={cn(
                  "flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors",
                  seleccionado?.order.id === row.order.id ? "bg-brand-50 ring-1 ring-brand-200" : "hover:bg-slate-50"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-semibold text-slate-800">
                    {row.customer.nombre}
                    {row.unreadFromCustomer > 0 && (
                      <Badge className="border-red-200 bg-red-500 px-1.5 text-white">{row.unreadFromCustomer}</Badge>
                    )}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {row.order.numero} · {row.vehicle.placa}
                  </p>
                  {row.ultimo && (
                    <p className="mt-0.5 truncate text-xs text-slate-400">
                      {row.ultimo.remitente_tipo === "customer" ? "Cliente" : row.ultimo.remitente_nombre}: {row.ultimo.contenido}
                    </p>
                  )}
                </div>
                {row.ultimo && <span className="shrink-0 text-[10px] text-slate-300">{formatTimeAgo(row.ultimo.created_at)}</span>}
              </Link>
            ))}
          </div>

          <div className="min-w-0">
            {detail ? (
              <div className="space-y-3">
                <div className="card flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {detail.order.numero} · {detail.customer.nombre}
                    </p>
                    <p className="text-xs text-slate-400">
                      {detail.vehicle.marca} {detail.vehicle.modelo} ({detail.vehicle.placa})
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge estado={detail.order.estado} />
                    <Link href={`/taller/ordenes/${detail.order.id}`} className="text-xs font-medium text-brand-600 hover:underline">
                      Abrir orden →
                    </Link>
                  </div>
                </div>
                <MessageThread orderId={detail.order.id} messages={detail.messages} viewer="staff" tituloOcupado="Responde al cliente…" />
              </div>
            ) : (
              <EmptyState
                icon={<MessageSquare className="h-10 w-10" />}
                title="Selecciona una conversación"
                description="Elige un hilo de la izquierda para leer y responder los mensajes del cliente."
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
