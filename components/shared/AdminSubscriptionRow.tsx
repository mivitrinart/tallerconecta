"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import type { EstadoSuscripcion, PlanSaaS, Subscription, User, Workshop, WorkshopMember } from "@/lib/database/types";
import { Badge, Avatar } from "@/components/ui";
import { ROL_LABEL } from "@/lib/permissions";
import { formatDate } from "@/lib/format";

export function AdminUserRow({ user, memberships }: { user: User; memberships: (WorkshopMember & { workshop: Workshop })[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      await api.patch(`/api/admin/usuarios/${user.id}`, { estado: user.estado === "activo" ? "inactivo" : "activo" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <tr className="border-b border-slate-50 last:border-0">
      <td className="td">
        <div className="flex items-center gap-3">
          <Avatar nombre={user.nombre} size="sm" />
          <div>
            <p className="font-semibold text-slate-800">{user.nombre}</p>
            <p className="text-xs text-slate-400">{user.correo} · {user.telefono}</p>
          </div>
        </div>
      </td>
      <td className="td text-xs">
        {user.es_admin_plataforma ? (
          <Badge className="border-violet-200 bg-violet-50 text-violet-700">{ROL_LABEL.platform_admin}</Badge>
        ) : memberships.length ? (
          memberships.map((m) => (
            <p key={m.id} className="text-slate-600">
              <Badge className="mr-1.5 border-slate-200 bg-slate-50">{ROL_LABEL[m.rol]}</Badge>
              {m.workshop?.nombre}
              {!m.activo && <span className="ml-1 text-slate-300">(inactivo)</span>}
            </p>
          ))
        ) : (
          <span className="text-slate-300">Sin taller</span>
        )}
      </td>
      <td className="td text-xs text-slate-400">{formatDate(user.created_at)}</td>
      <td className="td pr-4! text-right">
        <button
          onClick={toggle}
          disabled={loading || user.es_admin_plataforma}
          className={`rounded-lg border px-3 py-1 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            user.estado === "activo"
              ? "border-red-200 text-red-600 hover:bg-red-50"
              : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
          }`}
        >
          {user.estado === "activo" ? "Desactivar" : "Activar"}
        </button>
      </td>
    </tr>
  );
}

export function AdminSubscriptionRow({ sub, workshop }: { sub: Subscription; workshop: Workshop }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function patch(body: { plan?: PlanSaaS; estado?: EstadoSuscripcion }) {
    setLoading(true);
    try {
      await api.patch(`/api/admin/suscripciones/${sub.id}`, body);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const diasRestantes = Math.ceil((new Date(sub.fin).getTime() - Date.now()) / 86_400_000);

  return (
    <tr className="border-b border-slate-50 last:border-0">
      <td className="td">
        <p className="font-semibold text-slate-800">{workshop.nombre}</p>
        <p className="text-xs text-slate-400">{workshop.ciudad}</p>
      </td>
      <td className="td">
        <select className="input w-auto! py-1! text-xs" value={sub.plan} disabled={loading} onChange={(e) => patch({ plan: e.target.value as PlanSaaS })}>
          <option value="starter">Starter · $0</option>
          <option value="pro">Pro · $159.900</option>
          <option value="premium">Premium · $249.900</option>
        </select>
      </td>
      <td className="td">
        <select className="input w-auto! py-1! text-xs" value={sub.estado} disabled={loading} onChange={(e) => patch({ estado: e.target.value as EstadoSuscripcion })}>
          <option value="activa">Activa</option>
          <option value="en_prueba">En prueba</option>
          <option value="vencida">Vencida</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </td>
      <td className="td text-xs text-slate-500">
        {formatDate(sub.inicio)} → {formatDate(sub.fin)}
      </td>
      <td className="td pr-4!">
        {sub.estado === "en_prueba" && diasRestantes <= 7 ? (
          <Badge className="border-amber-300 bg-amber-50 text-amber-700">Vence en {diasRestantes} día(s)</Badge>
        ) : sub.estado === "activa" ? (
          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-600">Al día</Badge>
        ) : (
          <Badge className="border-slate-200 bg-slate-50 text-slate-500">{sub.estado}</Badge>
        )}
      </td>
    </tr>
  );
}
