"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserX, Check, AlertCircle } from "lucide-react";
import { api } from "@/lib/api-client";
import { Card, Badge, EmptyState, Button } from "@/components/ui";
import { formatDate } from "@/lib/format";
import Link from "next/link";

interface VinculacionPendiente {
  id: string;
  account_id: string;
  account_nombre: string;
  account_correo: string;
  customer_id: string;
  customer_nombre: string;
  customer_telefono: string;
  customer_correo: string;
  workshop_id: string;
  estado: "pendiente";
  created_at: string;
}

interface VinculacionesTableProps {
  pendientes: VinculacionPendiente[];
}

export function VinculacionesTable({ pendientes }: VinculacionesTableProps) {
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [localPendientes, setLocalPendientes] = useState(pendientes);
  const router = useRouter();

  async function aceptar(id: string) {
    setLoadingIds((prev) => new Set([...prev, id]));
    try {
      await api.post(`/api/taller/vinculaciones/${id}/aceptar`);
      setLocalPendientes((prev) => prev.filter((v) => v.id !== id));
      router.refresh();
    } catch {
      alert("No se pudo aceptar la vinculación.");
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function rechazar(id: string) {
    setLoadingIds((prev) => new Set([...prev, id]));
    try {
      await api.post(`/api/taller/vinculaciones/${id}/rechazar`);
      setLocalPendientes((prev) => prev.filter((v) => v.id !== id));
      router.refresh();
    } catch {
      alert("No se pudo rechazar la vinculación.");
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  if (localPendientes.length === 0) {
    return (
      <EmptyState icon={<AlertCircle className="h-10 w-10" />} title="Sin solicitudes pendientes" description="Cuando un cliente vincule su ficha a tu taller con su enlace personal, aparecerá aquí para que lo aceptes o rechaces." />
    );
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[720px]">
        <thead className="border-b border-slate-100 bg-slate-50/60">
          <tr>
            <th className="th">Cliente (cuenta)</th>
            <th className="th">Contacto</th>
            <th className="th">Ficha del taller</th>
            <th className="th text-center">Solicitada</th>
            <th className="th pr-4!" />
          </tr>
        </thead>
        <tbody>
          {localPendientes.map((v) => (
            <tr key={v.id} className="border-b border-slate-50 last:border-0">
              <td className="td">
                <p className="font-medium text-slate-800">{v.account_nombre}</p>
                <p className="text-xs text-slate-500">{v.account_correo}</p>
              </td>
              <td className="td text-xs text-slate-500">
                <p>{v.customer_telefono}</p>
                <p className="text-slate-400">{v.customer_correo}</p>
              </td>
              <td className="td">
                <p className="text-sm font-semibold text-slate-800">{v.customer_nombre}</p>
                <Badge className="mt-1 border-amber-200 bg-amber-50 text-amber-700 text-xs">Pendiente de aceptación</Badge>
              </td>
              <td className="td text-center text-xs text-slate-500">{formatDate(v.created_at)}</td>
              <td className="td pr-4! text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => aceptar(v.id)}
                    loading={loadingIds.has(v.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5"
                    disabled={loadingIds.has(v.id)}
                  >
                    <Check className="h-3.5 w-3.5" /> Aceptar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => rechazar(v.id)}
                    loading={loadingIds.has(v.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50"
                    disabled={loadingIds.has(v.id)}
                  >
                    <UserX className="h-3.5 w-3.5" /> Rechazar
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
