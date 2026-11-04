import { requireSession } from "@/lib/auth/session";
import { AppShell } from "@/components/shared/AppShell";
import { listNotificationsFor } from "@/lib/database/queries";
import { listVinculacionesPendientes } from "@/lib/database/queries";
import { query } from "@/lib/database/index";
import { initStore } from "@/lib/api/init-store";
import { ROL_LABEL, ROLES_TALLER } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function TallerLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession(ROLES_TALLER);

  // Inicializar el store de D1 para leer de la base de datos real
  await initStore();

  const notifIniciales = listNotificationsFor("user", session.user_id, { canal: "in_app", limit: 15 }).map((n) => ({
    id: n.id,
    tipo: n.tipo,
    titulo: n.titulo,
    cuerpo: n.cuerpo,
    estado: n.estado,
    created_at: n.created_at,
    link: n.link,
  }));

  const vinculacionesPendientes = query((db) =>
    db.customer_account_links.filter(
      (l) => l.workshop_id === session.workshop_id && l.estado === "pendiente"
    ).length
  );

  const unreadMensajes = query(
    (db) =>
      db.messages.filter(
        (m) => m.workshop_id === session.workshop_id && m.remitente_tipo === "customer" && !m.leido
      ).length
  );

  return (
    <AppShell
      usuario={{
        nombre: session.nombre,
        correo: session.correo,
        rolLabel: ROL_LABEL[session.rol],
        rol: session.rol,
      }}
      subtitulo={session.workshop_nombre ?? "Panel del taller"}
      notifIniciales={notifIniciales}
      unreadMensajes={unreadMensajes}
      vinculacionesPendientes={vinculacionesPendientes}
    >
      {children}
    </AppShell>
  );
}
