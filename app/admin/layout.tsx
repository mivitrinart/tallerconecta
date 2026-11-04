import { requireSession } from "@/lib/auth/session";
import { AppShell } from "@/components/shared/AppShell";
import { listNotificationsFor } from "@/lib/database/queries";
import { ROL_LABEL } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession(["platform_admin"]);

  const notifIniciales = listNotificationsFor("user", session.user_id, { canal: "in_app", limit: 15 }).map((n) => ({
    id: n.id,
    tipo: n.tipo,
    titulo: n.titulo,
    cuerpo: n.cuerpo,
    estado: n.estado,
    created_at: n.created_at,
    link: n.link,
  }));

  return (
    <AppShell
      usuario={{ nombre: session.nombre, correo: session.correo, rolLabel: ROL_LABEL[session.rol], rol: session.rol }}
      subtitulo="Administración de la plataforma"
      notifIniciales={notifIniciales}
    >
      {children}
    </AppShell>
  );
}
