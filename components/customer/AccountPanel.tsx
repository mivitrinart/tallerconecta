"use client";
/**
 * Cuenta del cliente: perfil de solo lectura, vinculación de enlaces
 * personales, desvinculación (propagada al panel del taller).
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, Link2Off, Plus, Check, AlertTriangle, Loader2, User, Phone, Mail, Key, Shield, X } from "lucide-react";
import { Button, Badge, Avatar, Card, CardHeader, CardBody, Alert, Modal } from "@/components/ui";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/format";

export interface Vinculo {
  customer_id: string;
  customer_nombre: string;
  workshop_nombre: string;
  origen: "email" | "token" | "public";
  estado: "aceptado" | "pendiente" | "rechazado";
}

const ESTADO_BADGE: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  aceptado: { label: "Vinculado", className: "border-emerald-200 bg-emerald-50 text-emerald-700", icon: <Check className="h-3 w-3" /> },
  pendiente: { label: "Pendiente", className: "border-amber-200 bg-amber-50 text-amber-700", icon: <span className="h-3 w-3 animate-pulse rounded-full bg-amber-500" /> },
  rechazado: { label: "Rechazado", className: "border-red-200 bg-red-50 text-red-700", icon: <X className="h-3 w-3" /> },
};

const ORIGEN_BADGE: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  email: { label: "Por correo", className: "border-emerald-200 bg-emerald-50 text-emerald-700", icon: <Mail className="h-3 w-3" /> },
  token: { label: "Por enlace", className: "border-sky-200 bg-sky-50 text-sky-700", icon: <Link2 className="h-3 w-3" /> },
  public: { label: "Público", className: "border-violet-200 bg-violet-50 text-violet-700", icon: <Key className="h-3 w-3" /> },
};

export function AccountPanel({
  account,
  vinculos,
}: {
  account: { nombre: string; correo: string; telefono: string; consentimiento_datos_at: string; created_at: string };
  vinculos: Vinculo[];
}) {
  const router = useRouter();

  // ── Modales y acciones ───────────────────────────────────────────────────
  const [linkOpen, setLinkOpen] = useState(false);
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [desvinculando, setDesvinculando] = useState<string | null>(null);

  async function vincular(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res: { ok?: boolean; id?: string; pendiente?: boolean; error?: string } = await api.post("/api/cuenta/vincular", { token });
      setLinkOpen(false);
      setToken("");
      if (res.pendiente) {
        setMsg("Solicitud de vinculación enviada. Queda pendiente de aceptación por el taller.");
      } else {
        setMsg("Ficha vinculada a tu cuenta.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo vincular.");
    } finally {
      setLoading(false);
    }
  }

  async function desvincular(customerId: string) {
    if (desvinculando === customerId) return;
    if (
      !confirm(
        "¿Desvincular esta ficha de tu cuenta?\n\n" +
          "• La desvinculación se reflejará en el panel del taller: tu ficha quedará marcada como 'Acceso desactivado'.\n" +
          "• Tu enlace personal de seguimiento quedará DESACTIVADO (podrás restaurarlo volviendo a vincularlo, o el taller puede reactivarlo).\n" +
          "• Se retirarán del panel del taller los vehículos que TÚ registraste bajo esa ficha (los que tengan órdenes se conservan por historial)."
      )
    )
      return;
    setDesvinculando(customerId);
    setError(null);
    try {
      const res = await api.post<{ ok?: boolean; id?: string; error?: string }>("/api/cuenta/desvincular", { customer_id: customerId });
      if (!res.ok && res.error) {
        setError(res.error);
        setDesvinculando(null);
        return;
      }
      setMsg("Ficha desvinculada correctamente.");
      setDesvinculando(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo desvincular. Intenta de nuevo.");
      setDesvinculando(null);
    }
  }

  const vinculosAceptados = vinculos.filter(v => v.estado === "aceptado");
  const vinculosPendientes = vinculos.filter(v => v.estado === "pendiente");
  const vinculosRechazados = vinculos.filter(v => v.estado === "rechazado");

  return (
    <div className="space-y-6">
      {/* Perfil - solo lectura */}
      <Card className="panel">
        <CardHeader
          title="Información personal"
          subtitle="Tus datos de registro"
          icon={<User className="h-5 w-5 text-brand-600" />}
        />
        <CardBody className="space-y-4 pt-0">
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
            <Avatar nombre={account.nombre} size="lg" />
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold text-slate-900">{account.nombre}</h3>
              <p className="mt-0.5 text-sm text-slate-500 truncate" title={account.correo}>{account.correo}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-emerald-500" />
                  Tratamiento de datos autorizado el {formatDate(account.consentimiento_datos_at)} (Ley 1581 de 2012)
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <label className="label">Nombre completo</label>
              <p className="mt-1 text-slate-900">{account.nombre}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <label className="label">Teléfono</label>
              <p className="mt-1 text-slate-900">{account.telefono || "No registrado"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <label className="label">Correo electrónico</label>
              <p className="mt-1 text-slate-900">{account.correo}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <label className="label">Fecha de registro</label>
              <p className="mt-1 text-slate-900">{formatDate(account.created_at)}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Talleres vinculados */}
      <Card className="panel">
        <CardHeader
          title="Mis talleres vinculados"
          subtitle={vinculos.length > 0 ? `${vinculosAceptados.length} vinculado(s)${vinculosPendientes.length > 0 ? ` · ${vinculosPendientes.length} pendiente(s)` : ""}${vinculosRechazados.length > 0 ? ` · ${vinculosRechazados.length} rechazado(s)` : ""}` : "Aún no has vinculado ningún taller"}
          icon={<Link2 className="h-5 w-5 text-brand-600" />}
          actions={
            <Button size="sm" variant="secondary" onClick={() => setLinkOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Vincular enlace
            </Button>
          }
        />
        <CardBody className="pt-0">
          {vinculos.length === 0 ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                <Link2 className="h-8 w-8 text-slate-400" />
              </div>
              <h4 className="text-lg font-semibold text-slate-900">Sin talleres vinculados</h4>
              <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
                Por privacidad, la vinculación es <strong>solo con el enlace personal</strong> que te envió
                tu taller (no por coincidencia de correo).
              </p>
              <Button className="mt-4" variant="secondary" onClick={() => setLinkOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Vincular mi primer taller
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { estado: "aceptado" as const, items: vinculosAceptados, emptyMsg: null },
                { estado: "pendiente" as const, items: vinculosPendientes, emptyMsg: null },
                { estado: "rechazado" as const, items: vinculosRechazados, emptyMsg: null },
              ].map(({ estado, items, emptyMsg }) => {
                if (items.length === 0) return null;
                const cfg = ESTADO_BADGE[estado];
                return (
                  <div key={estado} className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                      <span className={cfg.className + " text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1"}>
                        {cfg.icon} {cfg.label}
                      </span>
                      <span className="text-xs text-slate-400">{items.length} ficha(s)</span>
                    </div>
                    <div className="space-y-2">
                      {items.map((v) => {
                        const origenCfg = ORIGEN_BADGE[v.origen];
                        const estadoCfg = ESTADO_BADGE[v.estado];
                        return (
                          <div key={v.customer_id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-semibold text-slate-900 truncate">{v.workshop_nombre}</h4>
                                <Badge className={estadoCfg.className}>
                                  {estadoCfg.icon} {estadoCfg.label}
                                </Badge>
                                <Badge className={origenCfg.className}>
                                  {origenCfg.icon} {origenCfg.label}
                                </Badge>
                              </div>
                              <p className="mt-1 text-sm text-slate-500">Ficha: <span className="font-medium text-slate-700">{v.customer_nombre}</span></p>
                            </div>
                            <div className="flex shrink-0">
                              {(v.estado === "aceptado" || v.estado === "pendiente") && (
                                <button
                                  onClick={() => desvincular(v.customer_id)}
                                  disabled={desvinculando === v.customer_id}
                                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                                    desvinculando === v.customer_id
                                      ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                                      : v.estado === "pendiente"
                                      ? "border-amber-200 text-amber-700 hover:border-amber-300 hover:bg-amber-50"
                                      : "border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50"
                                  }`}
                                  title={v.estado === "pendiente" ? "Cancelar solicitud de vinculación" : "Desvincular ficha (retira del panel del taller los vehículos que registraste)"}
                                >
                                  {desvinculando === v.customer_id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : v.estado === "pendiente" ? (
                                    <>
                                      <X className="h-3.5 w-3.5" /> Cancelar
                                    </>
                                  ) : (
                                    <>
                                      <Link2Off className="h-3.5 w-3.5" /> Desvincular
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {vinculosPendientes.length > 0 && (
            <Alert tone="warning" className="mt-4" title="Vinculaciones pendientes">
              {vinculosPendientes.map((v) => v.workshop_nombre).join(", ")} aún no ha aceptado tu
              solicitud de vinculación. Mientras tanto no verás el seguimiento de sus órdenes aquí.
            </Alert>
          )}
          {vinculosRechazados.length > 0 && (
            <Alert tone="error" className="mt-4" title="Vinculaciones rechazadas">
              {vinculosRechazados.map((v) => v.workshop_nombre).join(", ")} rechazó tu solicitud de
              vinculación. Contacta al taller para más información.
            </Alert>
          )}
        </CardBody>
      </Card>

      {msg && <Alert tone="success" className="mt-4">{msg}</Alert>}
      {error && !linkOpen && <Alert tone="error" className="mt-4">{error}</Alert>}

      {/* Modal vincular enlace */}
      <Modal open={linkOpen} onClose={() => setLinkOpen(false)} title="Vincular enlace personal" wide>
        <form onSubmit={vincular} className="space-y-4">
          <Alert tone="info" title="¿Cómo funciona?">
            Pega el enlace de seguimiento <strong>vigente</strong> que te envió tu taller (o solo su código). La
            ficha quedará asociada a tu cuenta y verás ese seguimiento aquí, con tu perfil. Si desvinculaste esa
            ficha antes, su enlace quedó anulado: pide uno nuevo al taller.
          </Alert>
          <Alert tone="warning" title="Privacidad">
            <strong>Solo puedes vincular enlaces que te pertenezcan.</strong> Si el enlace ya está en
            uso por la cuenta de otra persona, será rechazado y no podrás añadirlo.
          </Alert>
          <div className="space-y-2">
            <label className="label">Enlace o token</label>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                className="input pl-10 font-mono text-xs"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="/seguimiento/tok_… o tok_…"
              />
            </div>
          </div>
          {error && <Alert tone="error">{error}</Alert>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setLinkOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={loading}>
              <Link2 className="h-4 w-4" /> Vincular
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/** Vinculación automática al llegar desde el portal con ?vincular=<token>. */
export function AutoLink({ token }: { token: string }) {
  const router = useRouter();
  const [aviso, setAviso] = useState<string | null>(null);
  useEffect(() => {
    api
      .post<{ ok?: boolean; pendiente?: boolean }>("/api/cuenta/vincular", { token })
      .then((res) => {
        if (res.pendiente) {
          setAviso("Solicitud de vinculación enviada. Queda pendiente de aceptación por el taller.");
        } else {
          setAviso("Ficha vinculada a tu cuenta ✓");
          router.refresh();
        }
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : "";
        if (!msg.includes("ya está vinculada a tu cuenta")) setAviso(msg || null);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
  if (!aviso) return null;
  return <Alert tone={aviso.includes("✓") ? "success" : "warning"}>{aviso}</Alert>;
}