"use client";
/** Configuración del taller: datos del negocio y gestión del equipo. */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, UserPlus, RotateCcw, KeyRound, Image as ImageIcon, User as UserIcon, X } from "lucide-react";
import { Button, Field, Alert, Card, CardHeader, CardBody, Avatar, Badge } from "@/components/ui";
import { api } from "@/lib/api-client";
import type { User, Workshop, WorkshopMember } from "@/lib/database/types";
import { ROL_LABEL } from "@/lib/permissions";
import { LogoUpload } from "./LogoUpload";

export function WorkshopProfileForm({ workshop }: { workshop: Workshop }) {
  const router = useRouter();
  const [form, setForm] = useState({
    nombre: workshop.nombre,
    direccion: workshop.direccion,
    ciudad: workshop.ciudad,
    telefono: workshop.telefono,
    nit: workshop.nit ?? "",
    logo_url: workshop.logo_url ?? "",
    google_maps_url: workshop.google_maps_url ?? "",
  });
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function guardarTodo() {
    setLoading(true);
    setMsg(null);
    try {
      await api.patch("/api/taller/configuracion", form);
      setMsg({ tone: "success", text: "Datos del taller actualizados." });
      router.refresh();
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof Error ? err.message : "No se pudo guardar." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        await guardarTodo();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre del taller" required className="sm:col-span-2">
          <input className="input" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        </Field>
        <Field label="Dirección">
          <input className="input" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} placeholder="Carrera 68 # 25-40" />
        </Field>
        <Field label="Ciudad">
          <input className="input" value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} />
        </Field>
        <Field label="Teléfono">
          <input className="input" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
        </Field>
        <Field label="NIT (opcional)">
          <input className="input" value={form.nit} onChange={(e) => setForm({ ...form, nit: e.target.value })} />
        </Field>
        <Field label="Enlace de Google Maps (ubicación)">
          <input className="input" value={form.google_maps_url} onChange={(e) => setForm({ ...form, google_maps_url: e.target.value })} placeholder="https://www.google.com/maps/..." />
        </Field>
        <LogoUpload valor={form.logo_url} onChange={(v) => setForm({ ...form, logo_url: v })} onSave={guardarTodo} />
      </div>
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      <div className="flex justify-end">
        <Button type="submit" loading={loading}>
          <Save className="h-4 w-4" /> Guardar cambios
        </Button>
      </div>
    </form>
  );
}

export function TeamManager({
  members,
}: {
  members: { member: WorkshopMember; user: User }[];
}) {
  const router = useRouter();
  const [invitando, setInvitando] = useState(false);
  const [form, setForm] = useState({
    nombre: "", correo: "", telefono: "",
    rol: "mechanic" as "owner" | "advisor" | "mechanic",
    password: "",
  });
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [credenciales, setCredenciales] = useState<{ nombre: string; correo: string; password: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);

  async function actualizar(memberId: string, patch: { rol?: string; activo?: boolean }) {
    try {
      await api.patch(`/api/taller/miembros/${memberId}`, patch);
      router.refresh();
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof Error ? err.message : "No se pudo actualizar." });
    }
  }

  async function nuevaPassword(memberId: string, nombre: string) {
    try {
      const res = await api.post<{ password_temporal: string }>(`/api/taller/miembros/${memberId}/password`, {});
      setCredenciales({ nombre, correo: members.find((m) => m.member.id === memberId)?.user.correo ?? "", password: res.password_temporal });
      setMsg(null);
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof Error ? err.message : "No se pudo generar la contraseña." });
    }
  }

  async function copiar(texto: string, clave: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(clave);
      setTimeout(() => setCopiado(null), 1500);
    } catch {
      /* clipboard no disponible */
    }
  }

  return (
    <div className="space-y-4">
      {/* Credenciales generadas: se muestran UNA sola vez */}
      {credenciales && (
        <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4">
          <p className="text-sm font-bold text-emerald-800">
            ✓ Credenciales de {credenciales.nombre} — cópialas y compárteselas por un canal seguro
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2">
              <code className="flex-1 truncate font-mono text-xs text-slate-700">{credenciales.correo}</code>
              <button type="button" onClick={() => copiar(credenciales.correo, "correo")} className="text-xs font-semibold text-brand-600 hover:underline">
                {copiado === "correo" ? "✓" : "copiar"}
              </button>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2">
              <code className="flex-1 truncate font-mono text-xs text-slate-700">{credenciales.password}</code>
              <button type="button" onClick={() => copiar(credenciales.password, "pass")} className="text-xs font-semibold text-brand-600 hover:underline">
                {copiado === "pass" ? "✓" : "copiar"}
              </button>
            </div>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-emerald-700">
             Con estos datos entra en <strong>Iniciar sesión → “Soy un taller”</strong> sin necesidad de
            registrarse. Esta contraseña se muestra una sola vez; si la olvida, usa “Nueva contraseña”.
          </p>
          <div className="mt-2 flex justify-end">
            <Button size="sm" variant="secondary" onClick={() => setCredenciales(null)}>Listo</Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {members.map(({ member, user }) => (
          <div key={member.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
            <Avatar nombre={user.nombre} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">
                {user.nombre} {!member.activo && <Badge className="ml-1 border-slate-200 bg-slate-100 text-slate-400">inactivo</Badge>}
              </p>
              <p className="truncate text-xs text-slate-400">{user.correo} · {user.telefono}</p>
            </div>
            <select
              className="input !w-auto text-xs"
              value={member.rol}
              onChange={(e) => actualizar(member.id, { rol: e.target.value })}
              title="Rol en el taller"
            >
              <option value="owner">{ROL_LABEL.owner}</option>
              <option value="advisor">{ROL_LABEL.advisor}</option>
              <option value="mechanic">{ROL_LABEL.mechanic}</option>
            </select>
            <Button size="sm" variant="secondary" onClick={() => nuevaPassword(member.id, user.nombre)} title="Genera una contraseña nueva y la muestra una vez">
              <KeyRound className="h-3.5 w-3.5" /> Nueva contraseña
            </Button>
            <Button size="sm" variant="ghost" onClick={() => actualizar(member.id, { activo: !member.activo })}>
              {member.activo ? "Desactivar" : "Activar"}
            </Button>
          </div>
        ))}
      </div>

      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}

      {!invitando ? (
        <Button variant="secondary" onClick={() => setInvitando(true)}>
          <UserPlus className="h-4 w-4" /> Añadir mecánico o asesor
        </Button>
      ) : (
        <Card className="border-brand-200">
          <CardHeader
            title="Añadir miembro del equipo"
            subtitle="El taller crea la cuenta: el mecánico entra con estos datos SIN registrarse"
          />
          <CardBody>
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                setLoading(true);
                setMsg(null);
                try {
                  const res = await api.post<{ id: string; password_temporal: string | null; ya_existe: boolean }>(
                    "/api/taller/miembros",
                    form
                  );
                  setInvitando(false);
                  if (res.ya_existe) {
                    setMsg({ tone: "success", text: "Esa persona ya tenía cuenta: se añadió al taller. Usa su contraseña actual o genérale una nueva con el botón 'Nueva contraseña'." });
                  } else {
                    setCredenciales({ nombre: form.nombre, correo: form.correo, password: res.password_temporal ?? "" });
                  }
                  setForm({ nombre: "", correo: "", telefono: "", rol: "mechanic", password: "" });
                  router.refresh();
                } catch (err) {
                  setMsg({ tone: "error", text: err instanceof Error ? err.message : "No se pudo añadir." });
                } finally {
                  setLoading(false);
                }
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nombre completo" required>
                  <input className="input" required minLength={3} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Juan Torres" />
                </Field>
                <Field label="Correo" required hint="Con este correo entrará al panel">
                  <input className="input" type="email" required value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} placeholder="juan@mitaller.co" />
                </Field>
                <Field label="Teléfono" required>
                  <input className="input" required value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="+57 300 000 0000" />
                </Field>
                <Field label="Rol" required>
                  <select className="input" value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value as typeof form.rol })}>
                    <option value="mechanic">{ROL_LABEL.mechanic} — solo sus trabajos asignados, avances y evidencias</option>
                    <option value="advisor">{ROL_LABEL.advisor} — recepción, diagnósticos y presupuestos</option>
                    <option value="owner">{ROL_LABEL.owner} — control total del taller</option>
                  </select>
                </Field>
                <Field label="Contraseña inicial (opcional)" className="sm:col-span-2" hint="Si la dejas vacía se genera una temporal automáticamente y se muestra una sola vez">
                  <input className="input" type="text" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" />
                </Field>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setInvitando(false)}>Cancelar</Button>
                <Button type="submit" loading={loading}>
                  <UserPlus className="h-4 w-4" /> Crear cuenta y añadir al taller
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

export function OwnerProfileForm({ user }: { user: User }) {
  const [form, setForm] = useState({
    nombre: user.nombre,
    avatar_url: user.avatar_url ?? "",
  });
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function guardarTodo() {
    setLoading(true);
    setMsg(null);
    try {
      await api.patch("/api/taller/configuracion/propietario", form);
      setMsg({ tone: "success", text: "Perfil del propietario actualizado." });
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof Error ? err.message : "No se pudo guardar." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Perfil del propietario" subtitle="Nombre y foto del dueño del taller" icon={<UserIcon className="h-5 w-5" />} />
      <CardBody>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            await guardarTodo();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col items-center gap-3 sm:items-start">
              <div className="relative group">
                {form.avatar_url ? (
                  <>
                    <img
                      src={form.avatar_url}
                      alt="Foto del propietario"
                      className="w-32 h-32 rounded-full object-cover border-4 border-brand-200 bg-slate-100"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setForm({ ...form, avatar_url: "" })}
                      className="absolute -top-2 -right-2 text-red-600 hover:bg-red-50"
                      title="Quitar foto"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : (
                  <div className="w-32 h-32 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 font-bold border-4 border-slate-200">
                    ?
                  </div>
                )}
                <span className="absolute -bottom-2 -right-2 flex items-center gap-1 rounded-full bg-white border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 shadow-sm">
                  <ImageIcon className="h-3 w-3" /> Foto
                </span>
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (!file.type.startsWith("image/")) {
                    setMsg({ tone: "error", text: "Selecciona una imagen (JPG, PNG, WebP, etc.)." });
                    return;
                  }
                  if (file.size > 500 * 1024) {
                    setMsg({ tone: "error", text: "La imagen supera 500 KB." });
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => setForm({ ...form, avatar_url: String(reader.result) });
                  reader.readAsDataURL(file);
                }}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  (e.currentTarget.closest("div")?.querySelector('input[type="file"]') as HTMLInputElement | null)?.click();
                }}
              >
                Subir foto
              </Button>
            </div>
            <Field label="Nombre completo" required>
              <input
                className="input"
                required
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
            </Field>
          </div>
          {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
          <div className="flex justify-end">
            <Button type="submit" loading={loading}>
              <Save className="h-4 w-4" /> Guardar cambios
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

export function ResetDemoButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant="danger"
      loading={loading}
      onClick={async () => {
        if (!confirm("¿Restablecer TODOS los datos de la demostración al estado inicial? Se perderán los cambios hechos en esta sesión.")) return;
        setLoading(true);
        try {
          await api.post("/api/admin/reset-demo", {});
          router.refresh();
        } finally {
          setLoading(false);
        }
      }}
    >
      <RotateCcw className="h-4 w-4" /> Restablecer datos demo
    </Button>
  );
}
