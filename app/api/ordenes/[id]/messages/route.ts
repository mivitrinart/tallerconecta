import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { guardCustomerToken, guardStaff, fail, okJson } from "@/lib/auth/guards";
import { getSession } from "@/lib/auth/session";
import { messageSchema } from "@/lib/validations/schemas";
import { sendMessage, markThreadRead } from "@/lib/orders/workflows";
import { query } from "@/lib/database/index";

/** Obtener mensajes de una orden (staff o cliente con token). */
export async function GET(req: NextRequest, { params: paramsP }: { params: Promise<{ id: string }> }) {
  await initStore();
  const params = await paramsP;
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  // Autenticación: staff O cliente con token
  let customerId: string | null = null;
  let workshopId: string | null = null;
  let isStaff = false;
  let userId: string | null = null;
  let userRole: string | null = null;

  if (token) {
    const auth = guardCustomerToken(token);
    if (!auth.ok) return auth.response;
    customerId = auth.customer.id;
    workshopId = auth.workshopId;
  } else {
    // Para staff, permitir a mechanics ver mensajes de sus órdenes asignadas
    const session = await getSession();
    if (!session || session.rol === "platform_admin" || session.rol === "customer" || !session.workshop_id) {
      return NextResponse.json({ error: "Sesión requerida. Inicia de nuevo." }, { status: 401 });
    }
    // Verificación en vivo
    const user = query((db) => db.users.find((u) => u.id === session.user_id));
    if (!user || user.estado !== "activo") {
      return NextResponse.json({ error: "Usuario no encontrado o desactivado." }, { status: 401 });
    }
    const member = query((db) => db.workshop_members.find((m) => m.workshop_id === session.workshop_id && m.user_id === session.user_id));
    if (!member || !member.activo) {
      return NextResponse.json({ error: "Miembro no activo en el taller." }, { status: 401 });
    }
    const workshop = query((db) => db.workshops.find((w) => w.id === session.workshop_id));
    if (!workshop || workshop.estado === "suspendido") {
      return NextResponse.json({ error: "Taller suspendido." }, { status: 401 });
    }
    
    userId = session.user_id;
    userRole = session.rol;
    workshopId = session.workshop_id;
    isStaff = true;
  }

  // Verificar que la orden pertenece al taller/cliente
  const order = query((db) => {
    const o = db.service_orders.find((ord) => ord.id === params.id && ord.workshop_id === workshopId);
    if (!o) return null;
    // Para staff: si es mechanic, solo puede ver mensajes de órdenes asignadas a él
    if (isStaff && userRole === "mechanic" && o.responsable_id !== userId) return null;
    if (!isStaff && o.customer_id !== customerId) return null;
    return o;
  });

  if (!order) return fail("Orden no encontrada.", 404);

  // Obtener mensajes de la orden
  const messages = query((db) =>
    db.messages
      .filter((m) => m.service_order_id === params.id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((m) => ({
        id: m.id,
        contenido: m.contenido,
        remitente_tipo: m.remitente_tipo,
        remitente_nombre: m.remitente_nombre,
        leido: m.leido,
        created_at: m.created_at,
      }))
  );

  return okJson({ messages });
}

/** Respuesta del personal al cliente (canal de comunicación de la orden). */
export async function POST(req: NextRequest, { params: paramsP }: { params: Promise<{ id: string }> }) {
  await initStore();
  const params = await paramsP;
  const auth = await guardStaff("messages.reply");
  if (!auth.ok) return auth.response;

  const parsed = messageSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Mensaje inválido.", 400);

  const order = query((db) => db.service_orders.find((o) => o.id === params.id && o.workshop_id === auth.workshopId)) ?? null;
  if (!order) return fail("Orden no encontrada en este taller.", 404);
  if (auth.session.rol === "mechanic" && order.responsable_id !== auth.session.user_id) {
    return fail("Solo puedes responder mensajes de órdenes asignadas a ti.", 403);
  }

  const msg = sendMessage(params.id, "staff", auth.session.user_id, auth.session.nombre, parsed.data.contenido, auth.workshopId);
  if (!msg) return fail("Orden no encontrada en este taller.", 404);
  markThreadRead(params.id, "staff", auth.workshopId);
  return okJson({ id: msg.id });
}