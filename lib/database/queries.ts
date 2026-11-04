/**
 * Capa de lectura · arma las vistas (joins) que consumen las pantallas.
 * Es el punto de intercambio hacia Supabase: las firmas no cambian,
 * solo la implementación (ver lib/database/supabase-client.ts).
 */
import { query, mutate, uid, nowISO } from "./index";
import { notify } from "@/lib/notify";
import { sanitizeTexto } from "@/lib/format";
import type {
  Authorization,
  Customer,
  CustomerAccount,
  Database,
  Diagnostic,
  Estimate,
  EstimateItem,
  EstadoFactura,
  EstadoOrden,
  Invoice,
  Message,
  Notification,
  OrderEvent,
  OrderMedia,
  ServiceOrder,
  Subscription,
  User,
  Vehicle,
  Workshop,
  WorkshopMember,
} from "./types";
import { esEstadoActivo, esMismaFechaLocal } from "@/lib/orders/helpers";
import { sanitizeAccount, sanitizeUser } from "@/lib/auth/sanitize";

// ── Vistas ─────────────────────────────────────────────────────────────────

export interface OrderRow {
  order: ServiceOrder;
  customer: Customer;
  vehicle: Vehicle;
  responsable: User | null;
  latestEstimate: (Estimate & { pendiente_aprobacion: boolean }) | null;
  unreadFromCustomer: number;
  diagnosticoPendiente: boolean;
}

export interface OrderDetail extends OrderRow {
  diagnostics: Diagnostic[];
  estimates: { estimate: Estimate; items: EstimateItem[]; authorization: Authorization | null }[];
  media: OrderMedia[];
  events: OrderEvent[];
  messages: Message[];
}

export interface CustomerRow {
  customer: Customer;
  vehicles: Vehicle[];
  ordenesActivas: number;
  ordenesTotales: number;
  ultimaVisita: string | null;
}

export interface VehicleRow {
  vehicle: Vehicle;
  customer: Customer;
  ordenesActivas: number;
}

export interface MemberRow {
  member: WorkshopMember;
  user: User;
}

export interface DashboardData {
  porEstado: Record<EstadoOrden, number>;
  activas: number;
  porAprobar: number;
  enReparacion: number;
  listos: number;
  recibidosHoy: OrderRow[];
  listosEntrega: OrderRow[];
  pendientesAprobacion: OrderRow[];
  alertas: {
    sinRespuesta: { row: OrderRow; enviadaHaceDias: number }[];
    retrasadas: { row: OrderRow; diasRetraso: number }[];
    diagnosticoPendiente: OrderRow[];
    mensajesSinLeer: number;
  };
}

export interface EstimateRow {
  estimate: Estimate;
  items: EstimateItem[];
  order: ServiceOrder;
  customer: Customer;
  vehicle: Vehicle;
  authorization: Authorization | null;
  pendientes: number;
}

export interface InboxRow {
  order: ServiceOrder;
  customer: Customer;
  vehicle: Vehicle;
  ultimo: Message | null;
  unreadFromCustomer: number;
}

export interface PortalOrder {
  order: ServiceOrder;
  vehicle: Vehicle;
  /** Nombre de quién está trabajando ahora (línea de tiempo estilo Rappi). */
  responsableNombre: string | null;
  diagnostics: Diagnostic[];
  estimates: { estimate: Estimate; items: EstimateItem[]; authorization: Authorization | null }[];
  media: OrderMedia[];
  events: OrderEvent[];
  messages: Message[];
}

export interface PortalData {
  customer: Customer;
  workshop: Workshop;
  ordenes: PortalOrder[];
  notificaciones: Notification[];
}

// ── Talleres y miembros ────────────────────────────────────────────────────

export function listWorkshops(): Workshop[] {
  return query((db) => [...db.workshops]);
}

export function getWorkshop(id: string): Workshop | null {
  return query((db) => db.workshops.find((w) => w.id === id) ?? null);
}

export function getWorkshopOfUser(userId: string): { workshop: Workshop; member: WorkshopMember } | null {
  return query((db) => {
    const member = db.workshop_members.find((m) => m.user_id === userId && m.activo);
    if (!member) return null;
    const workshop = db.workshops.find((w) => w.id === member.workshop_id);
    if (!workshop) return null;
    return { workshop, member };
  });
}

export function listMembers(workshopId: string): MemberRow[] {
  return query((db) =>
    db.workshop_members
      .filter((m) => m.workshop_id === workshopId)
      .map((m) => {
        const rawUser = db.users.find((u) => u.id === m.user_id);
        return rawUser ? { member: m, user: sanitizeUser(rawUser) as User } : null;
      })
      .filter((r): r is MemberRow => r !== null)
  );
}

export function listStaffUsers(workshopId: string): User[] {
  return listMembers(workshopId)
    .filter((r) => r.member.activo)
    .map((r) => r.user);
}

// ── Órdenes ────────────────────────────────────────────────────────────────

function buildOrderRow(db: Database, o: ServiceOrder): OrderRow {
  const latestEstimate = db.estimates
    .filter((e) => e.service_order_id === o.id)
    .sort((a, b) => b.version - a.version)[0] ?? null;
  let pendiente = false;
  if (latestEstimate && latestEstimate.estado === "enviada") {
    pendiente = db.estimate_items.some(
      (i) => i.estimate_id === latestEstimate.id && i.requiere_autorizacion && i.estado === "pendiente"
    );
  }
  return {
    order: o,
    customer: db.customers.find((c) => c.id === o.customer_id)!,
    vehicle: db.vehicles.find((v) => v.id === o.vehicle_id)!,
    responsable: o.responsable_id ? db.users.find((u) => u.id === o.responsable_id) ?? null : null,
    latestEstimate: latestEstimate ? { ...latestEstimate, pendiente_aprobacion: pendiente } : null,
    unreadFromCustomer: db.messages.filter(
      (m) => m.service_order_id === o.id && m.remitente_tipo === "customer" && !m.leido
    ).length,
    diagnosticoPendiente:
      (o.estado === "recibido" || o.estado === "en_diagnostico") &&
      !db.diagnostics.some((d) => d.service_order_id === o.id),
  };
}

export interface OrderFilters {
  estados?: EstadoOrden[];
  q?: string;
  responsableId?: string;
  soloActivas?: boolean;
}

export function listOrders(workshopId: string, filters: OrderFilters = {}): OrderRow[] {
  return query((db) => {
    let rows = db.service_orders
      .filter((o) => o.workshop_id === workshopId)
      .map((o) => buildOrderRow(db, o));

    if (filters.soloActivas) rows = rows.filter((r) => esEstadoActivo(r.order.estado));
    if (filters.estados?.length) rows = rows.filter((r) => filters.estados!.includes(r.order.estado));
    if (filters.responsableId) rows = rows.filter((r) => r.order.responsable_id === filters.responsableId);
    if (filters.q) {
      const q = filters.q.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.order.numero.toLowerCase().includes(q) ||
          r.customer.nombre.toLowerCase().includes(q) ||
          r.vehicle.placa.toLowerCase().includes(q) ||
          `${r.vehicle.marca} ${r.vehicle.modelo}`.toLowerCase().includes(q)
      );
    }
    // Más recientes primero
    rows.sort((a, b) => b.order.fecha_ingreso.localeCompare(a.order.fecha_ingreso));
    return rows;
  });
}

export function getOrderDetail(id: string, workshopId: string): OrderDetail | null {
  return query((db) => {
    const o = db.service_orders.find((x) => x.id === id && x.workshop_id === workshopId);
    if (!o) return null;
    const row = buildOrderRow(db, o);
    const estimates = db.estimates
      .filter((e) => e.service_order_id === o.id)
      .sort((a, b) => b.version - a.version)
      .map((estimate) => ({
        estimate,
        items: db.estimate_items.filter((i) => i.estimate_id === estimate.id),
        authorization: db.authorizations.find((a) => a.estimate_id === estimate.id) ?? null,
      }));
    return {
      ...row,
      diagnostics: db.diagnostics
        .filter((d) => d.service_order_id === o.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
      estimates,
      media: db.order_media
        .filter((m) => m.service_order_id === o.id)
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
      events: db.order_events
        .filter((e) => e.service_order_id === o.id)
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
      messages: db.messages
        .filter((m) => m.service_order_id === o.id)
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    };
  });
}

export function getDashboard(workshopId: string): DashboardData {
  return query((db) => {
    const orders = db.service_orders.filter((o) => o.workshop_id === workshopId);
    const rows = orders.map((o) => buildOrderRow(db, o));
    const activas = rows.filter((r) => esEstadoActivo(r.order.estado));

    const porEstado = {
      recibido: 0, en_diagnostico: 0, esperando_aprobacion: 0, autorizado: 0,
      en_reparacion: 0, en_espera: 0, en_pruebas: 0, listo_entrega: 0,
      entregado: 0, cancelado: 0,
    } as Record<EstadoOrden, number>;
    for (const r of rows) porEstado[r.order.estado]++;

    const ahora = Date.now();

    // Clientes sin respuesta: presupuesto enviado hace más de 48 h
    const sinRespuesta = rows
      .filter((r) => r.order.estado === "esperando_aprobacion" && r.latestEstimate?.enviada_at)
      .map((r) => ({
        row: r,
        enviadaHaceDias: Math.floor((ahora - new Date(r.latestEstimate!.enviada_at!).getTime()) / 86_400_000),
      }))
      .filter((x) => x.enviadaHaceDias >= 2)
      .sort((a, b) => b.enviadaHaceDias - a.enviadaHaceDias);

    // Trabajos retrasados: fecha estimada superada (es una estimación → alerta, no culpa)
    const retrasadas = activas
      .filter(
        (r) =>
          r.order.fecha_estimada_entrega &&
          new Date(r.order.fecha_estimada_entrega).getTime() < ahora &&
          !["listo_entrega"].includes(r.order.estado)
      )
      .map((r) => ({
        row: r,
        diasRetraso: Math.floor((ahora - new Date(r.order.fecha_estimada_entrega!).getTime()) / 86_400_000),
      }));

    // Diagnóstico pendiente: >24 h en recibido/en_diagnostico sin diagnóstico
    const diagnosticoPendiente = rows.filter(
      (r) =>
        r.diagnosticoPendiente &&
        ahora - new Date(r.order.fecha_ingreso).getTime() > 24 * 3600_000
    );

    const mensajesSinLeer = db.messages.filter(
      (m) => m.workshop_id === workshopId && m.remitente_tipo === "customer" && !m.leido
    ).length;

    return {
      porEstado,
      activas: activas.length,
      porAprobar: porEstado["esperando_aprobacion"],
      enReparacion: porEstado["en_reparacion"],
      listos: porEstado["listo_entrega"],
      recibidosHoy: rows.filter((r) => esMismaFechaLocal(r.order.fecha_ingreso)),
      listosEntrega: rows.filter((r) => r.order.estado === "listo_entrega"),
      pendientesAprobacion: rows.filter((r) => r.order.estado === "esperando_aprobacion"),
      alertas: { sinRespuesta, retrasadas, diagnosticoPendiente, mensajesSinLeer },
    };
  });
}

// ── Clientes y vehículos ───────────────────────────────────────────────────

export function listCustomers(workshopId: string, q?: string): CustomerRow[] {
  return query((db) => {
    let customers = db.customers.filter((c) => c.workshop_id === workshopId);
    if (q) {
      const qq = q.toLowerCase();
      customers = customers.filter(
        (c) =>
          c.nombre.toLowerCase().includes(qq) ||
          c.telefono.includes(qq) ||
          c.correo.toLowerCase().includes(qq) ||
          (c.documento ?? "").includes(qq)
      );
    }
    return customers
      .map((customer) => {
        const vehicles = db.vehicles.filter((v) => v.customer_id === customer.id);
        const orders = db.service_orders.filter((o) => o.customer_id === customer.id);
        return {
          customer,
          vehicles,
          ordenesActivas: orders.filter((o) => esEstadoActivo(o.estado)).length,
          ordenesTotales: orders.length,
          ultimaVisita: orders.map((o) => o.fecha_ingreso).sort().at(-1) ?? null,
        };
      })
      .sort((a, b) => a.customer.nombre.localeCompare(b.customer.nombre));
  });
}

export function getCustomerDetail(id: string, workshopId: string) {
  return query((db) => {
    const customer = db.customers.find((c) => c.id === id && c.workshop_id === workshopId);
    if (!customer) return null;
    const vehicles = db.vehicles.filter((v) => v.customer_id === customer.id);
    const orders = db.service_orders
      .filter((o) => o.customer_id === customer.id)
      .map((o) => buildOrderRow(db, o))
      .sort((a, b) => b.order.fecha_ingreso.localeCompare(a.order.fecha_ingreso));
    const calificaciones = orders
      .map((r) => r.order.calificacion)
      .filter((c): c is number => typeof c === "number");
    return {
      customer,
      vehicles,
      orders,
      stats: {
        visitas: orders.length,
        activas: orders.filter((r) => esEstadoActivo(r.order.estado)).length,
        gastoTotal: orders.reduce((s, r) => s + (r.order.valor_final ?? 0), 0),
        calificacionPromedio: calificaciones.length
          ? calificaciones.reduce((s, c) => s + c, 0) / calificaciones.length
          : null,
      },
    };
  });
}

export function listVehicles(workshopId: string, q?: string, origen?: "taller" | "cliente"): VehicleRow[] {
  return query((db) => {
    let vehicles = db.vehicles.filter((v) => v.workshop_id === workshopId);
    if (origen) {
      vehicles = vehicles.filter((v) => (v.origen ?? "taller") === origen);
    }
    if (q) {
      const qq = q.toLowerCase();
      vehicles = vehicles.filter(
        (v) =>
          v.placa.toLowerCase().includes(qq) ||
          v.marca.toLowerCase().includes(qq) ||
          v.modelo.toLowerCase().includes(qq) ||
          (db.customers.find((c) => c.id === v.customer_id)?.nombre.toLowerCase().includes(qq) ?? false)
      );
    }
    return vehicles
      .map((vehicle) => ({
        vehicle,
        customer: db.customers.find((c) => c.id === vehicle.customer_id)!,
        ordenesActivas: db.service_orders.filter(
          (o) => o.vehicle_id === vehicle.id && esEstadoActivo(o.estado)
        ).length,
      }))
      .sort((a, b) => a.vehicle.placa.localeCompare(b.vehicle.placa));
  });
}

export function findCustomerByPortalToken(token: string): Customer | null {
  return query((db) => db.customers.find((c) => c.portal_token === token) ?? null);
}

// ── Presupuestos ───────────────────────────────────────────────────────────

export function listEstimates(workshopId: string, opts: { soloPendientes?: boolean } = {}): EstimateRow[] {
  return query((db) => {
    return db.estimates
      .filter((e) => e.workshop_id === workshopId)
      .map((estimate) => {
        const items = db.estimate_items.filter((i) => i.estimate_id === estimate.id);
        const order = db.service_orders.find((o) => o.id === estimate.service_order_id)!;
        return {
          estimate,
          items,
          order,
          customer: db.customers.find((c) => c.id === order.customer_id)!,
          vehicle: db.vehicles.find((v) => v.id === order.vehicle_id)!,
          authorization: db.authorizations.find((a) => a.estimate_id === estimate.id) ?? null,
          pendientes: items.filter((i) => i.estado === "pendiente" && i.requiere_autorizacion).length,
        };
      })
      .filter((r) => (opts.soloPendientes ? r.estimate.estado === "enviada" : true))
      .sort((a, b) => (b.estimate.enviada_at ?? b.estimate.created_at).localeCompare(a.estimate.enviada_at ?? a.estimate.created_at));
  });
}

// ── Mensajes ───────────────────────────────────────────────────────────────

export function getInbox(workshopId: string): InboxRow[] {
  return query((db) => {
    const orders = db.service_orders.filter((o) => o.workshop_id === workshopId);
    return orders
      .map((order) => {
        const msgs = db.messages
          .filter((m) => m.service_order_id === order.id)
          .sort((a, b) => a.created_at.localeCompare(b.created_at));
        return {
          order,
          customer: db.customers.find((c) => c.id === order.customer_id)!,
          vehicle: db.vehicles.find((v) => v.id === order.vehicle_id)!,
          ultimo: msgs.at(-1) ?? null,
          unreadFromCustomer: msgs.filter((m) => m.remitente_tipo === "customer" && !m.leido).length,
        };
      })
      .filter((r) => r.ultimo !== null)
      .sort((a, b) => b.ultimo!.created_at.localeCompare(a.ultimo!.created_at));
  });
}

// ── Portal del cliente (Módulo 5) ──────────────────────────────────────────

function buildPortalData(db: Database, customer: Customer): PortalData | null {
  const workshop = db.workshops.find((w) => w.id === customer.workshop_id);
  if (!workshop) return null;
  const orders = db.service_orders
    .filter((o) => o.customer_id === customer.id)
    .sort((a, b) => {
      const actA = esEstadoActivo(a.estado) ? 0 : 1;
      const actB = esEstadoActivo(b.estado) ? 0 : 1;
      return actA - actB || b.fecha_ingreso.localeCompare(a.fecha_ingreso);
    });

  const ordenes: PortalOrder[] = orders.map((order) => ({
    order,
    vehicle: db.vehicles.find((v) => v.id === order.vehicle_id)!,
    responsableNombre: order.responsable_id
      ? db.users.find((u) => u.id === order.responsable_id)?.nombre ?? null
      : null,
    diagnostics: db.diagnostics
      .filter((d) => d.service_order_id === order.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    estimates: db.estimates
      .filter((e) => e.service_order_id === order.id)
      .sort((a, b) => b.version - a.version)
      .map((estimate) => ({
        estimate,
        items: db.estimate_items.filter((i) => i.estimate_id === estimate.id),
        authorization: db.authorizations.find((a) => a.estimate_id === estimate.id) ?? null,
      })),
    media: db.order_media
      .filter((m) => m.service_order_id === order.id && m.visible_cliente)
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    events: db.order_events
      .filter((e) => e.service_order_id === order.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    messages: db.messages
      .filter((m) => m.service_order_id === order.id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at)),
  }));

  const notificaciones = db.notifications
    .filter((nt) => nt.destinatario_tipo === "customer" && nt.destinatario_id === customer.id && nt.canal === "in_app")
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 12);

  return { customer, workshop, ordenes, notificaciones };
}

export function getPortalData(token: string): PortalData | null {
  return query((db) => {
    const customer = db.customers.find((c) => c.portal_token === token);
    if (!customer || customer.anonimizado || customer.portal_activo === false) return null;
    return buildPortalData(db, customer);
  });
}

/** Distingue enlace válido, desactivado por el cliente o inexistente. */
export function getPortalTokenStatus(token: string): "ok" | "revocado" | "inexistente" {
  return query((db) => {
    const customer = db.customers.find((c) => c.portal_token === token);
    if (!customer || customer.anonimizado) return "inexistente";
    if (customer.portal_activo === false) return "revocado";
    return "ok";
  });
}

// ── Recordatorios automáticos de mantenimiento (retención) ─────────────────

export interface MaintenanceReminderRow {
  vehicle: Vehicle;
  customer: Customer;
  ultimaEntrega: string;
  mesesDesdeServicio: number;
  ultimoRecordatorio: string | null;
  diasDesdeRecordatorio: number | null;
}

/**
 * Vehículos cuyo último servicio entregado tiene 3+ meses (regla del
 * documento): candidatos a recordatorio automático de mantenimiento.
 */
export function getMaintenanceReminders(workshopId: string): MaintenanceReminderRow[] {
  return query((db) => {
    const ahora = Date.now();
    const rows: MaintenanceReminderRow[] = [];
    for (const vehicle of db.vehicles.filter((v) => v.workshop_id === workshopId)) {
      const entregas = db.service_orders
        .filter((o) => o.vehicle_id === vehicle.id && o.estado === "entregado" && o.fecha_entrega)
        .map((o) => o.fecha_entrega as string)
        .sort();
      const ultima = entregas.at(-1);
      if (!ultima) continue;
      const meses = Math.floor((ahora - new Date(ultima).getTime()) / (30.44 * 86_400_000));
      if (meses < 3) continue;
      const customer = db.customers.find((c) => c.id === vehicle.customer_id);
      if (!customer || customer.anonimizado) continue;
      rows.push({
        vehicle,
        customer,
        ultimaEntrega: ultima,
        mesesDesdeServicio: meses,
        ultimoRecordatorio: vehicle.ultimo_recordatorio_mant_at ?? null,
        diasDesdeRecordatorio: vehicle.ultimo_recordatorio_mant_at
          ? Math.floor((ahora - new Date(vehicle.ultimo_recordatorio_mant_at).getTime()) / 86_400_000)
          : null,
      });
    }
    return rows.sort((a, b) => b.mesesDesdeServicio - a.mesesDesdeServicio);
  });
}

// ── Cuentas de cliente ─────────────────────────────────────────────────────

export interface AccountVinculacion {
  portal: PortalData;
  linkOrigen: "email" | "token" | "public";
  estado: "pendiente" | "aceptado" | "rechazado";
  /** Vehículos de la ficha: registrados por el taller y por el propio cliente. */
  vehicles: Vehicle[];
}

export interface AccountView {
  account: CustomerAccount;
  vinculaciones: AccountVinculacion[];
}

export function getCustomerAccountById(id: string): CustomerAccount | null {
  return query((db) => db.customer_accounts.find((a) => a.id === id && a.estado === "activo") ?? null);
}

export function getCustomerAccountByCorreo(correo: string): CustomerAccount | null {
  return query((db) => db.customer_accounts.find((a) => a.correo === correo.trim().toLowerCase()) ?? null);
}

/** Perfil de la cuenta + la MISMA ventana de seguimiento por cada ficha vinculada. */
export function getAccountView(accountId: string): AccountView | null {
  return query((db) => {
    const account = db.customer_accounts.find((a) => a.id === accountId && a.estado === "activo");
    if (!account) return null;
    const links = db.customer_account_links.filter((l) => l.account_id === accountId);
    const vinculaciones: AccountVinculacion[] = [];
    for (const l of links) {
      const customer = db.customers.find((c) => c.id === l.customer_id);
      if (!customer || customer.anonimizado) continue;
      const portal = buildPortalData(db, customer);
      if (!portal) continue;
      const vehicles = db.vehicles
        .filter((v) => v.customer_id === customer.id)
        .sort((a, b) => a.placa.localeCompare(b.placa));
      vinculaciones.push({ portal, linkOrigen: l.origen, estado: l.estado, vehicles });
    }
    return { account: sanitizeAccount(account) as CustomerAccount, vinculaciones };
  });
}

export function isCustomerLinkedToAccount(accountId: string, portalToken: string): boolean {
  return query((db) => {
    const customer = db.customers.find((c) => c.portal_token === portalToken && c.portal_activo !== false);
    if (!customer) return false;
    return db.customer_account_links.some(
      (l) => l.account_id === accountId && l.customer_id === customer.id && l.estado === "aceptado"
    );
  });
}

/** Vinculaciones pendientes de aceptación por el taller. */
export interface VinculacionPendiente {
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

export function listVinculacionesPendientes(workshopId: string): VinculacionPendiente[] {
  return query((db) => {
    const links = db.customer_account_links.filter(
      (l) => l.workshop_id === workshopId && l.estado === "pendiente"
    );
    return links
      .map((l) => {
        const account = db.customer_accounts.find((a) => a.id === l.account_id);
        const customer = db.customers.find((c) => c.id === l.customer_id);
        if (!account || !customer) return null;
        return {
          id: l.id,
          account_id: l.account_id,
          account_nombre: account.nombre,
          account_correo: account.correo,
          customer_id: l.customer_id,
          customer_nombre: customer.nombre,
          customer_telefono: customer.telefono,
          customer_correo: customer.correo,
          workshop_id: l.workshop_id,
          estado: l.estado,
          created_at: l.created_at,
        } as VinculacionPendiente | null;
      })
      .filter((x): x is VinculacionPendiente => x !== null)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  });
}

/** Acepta una vinculación pendiente (solo el taller dueño del workshop). */
export function aceptarVinculacion(linkId: string, workshopId: string, actorId: string, actorNombre: string): { ok: boolean; error?: string } {
  return mutate((db) => {
    const link = db.customer_account_links.find((l) => l.id === linkId && l.workshop_id === workshopId);
    if (!link) return { ok: false, error: "Vinculación no encontrada." };
    if (link.estado !== "pendiente") return { ok: false, error: "La vinculación ya no está pendiente." };
    link.estado = "aceptado";
    const account = db.customer_accounts.find((a) => a.id === link.account_id);
    const customer = db.customers.find((c) => c.id === link.customer_id);
    db.audit_logs.push({
      id: uid("aud"), workshop_id: workshopId, actor_id: actorId, actor_nombre: actorNombre,
      accion: "cuenta_cliente.vincular_aceptar", entidad: "customer_account_links", entidad_id: link.customer_id,
      detalle: { link_id: linkId }, created_at: nowISO(),
    });
    // Notificar al cliente que su solicitud fue aceptada.
    if (account && customer) {
      notify({
        db,
        workshopId,
        destinatarioTipo: "customer",
        destinatarioId: customer.id,
        tipo: "vinculacion_aceptada",
        titulo: `Vinculación aceptada · ${customer.nombre}`,
        cuerpo: `El taller aceptó tu solicitud. Ya puedes seguir el estado de tu vehículo en el portal del cliente.`,
        link: `/seguimiento/${customer.portal_token}`,
      });
    }
    return { ok: true };
  });
}

/** Rechaza una vinculación pendiente (solo el taller dueño del workshop). */
export function rechazarVinculacion(linkId: string, workshopId: string, actorId: string, actorNombre: string): { ok: boolean; error?: string } {
  return mutate((db) => {
    const link = db.customer_account_links.find((l) => l.id === linkId && l.workshop_id === workshopId);
    if (!link) return { ok: false, error: "Vinculación no encontrada." };
    if (link.estado !== "pendiente") return { ok: false, error: "La vinculación ya no está pendiente." };
    link.estado = "rechazado";
    const account = db.customer_accounts.find((a) => a.id === link.account_id);
    const customer = db.customers.find((c) => c.id === link.customer_id);
    db.audit_logs.push({
      id: uid("aud"), workshop_id: workshopId, actor_id: actorId, actor_nombre: actorNombre,
      accion: "cuenta_cliente.vincular_rechazar", entidad: "customer_account_links", entidad_id: link.customer_id,
      detalle: { link_id: linkId }, created_at: nowISO(),
    });
    // Notificar al cliente que su solicitud fue rechazada.
    if (account && customer) {
      notify({
        db,
        workshopId,
        destinatarioTipo: "customer",
        destinatarioId: customer.id,
        tipo: "vinculacion_rechazada",
        titulo: `Vinculación rechazada · ${customer.nombre}`,
        cuerpo: `El taller rechazó tu solicitud de vinculación. Ponte en contacto con ellos para más información.`,
      });
    }
    return { ok: true };
  });
}

// ── Notificaciones ─────────────────────────────────────────────────────────

export function listNotificationsFor(
  destTipo: "user" | "customer",
  destId: string,
  opts: { canal?: Notification["canal"]; soloNoLeidas?: boolean; limit?: number } = {}
): Notification[] {
  return query((db) => {
    let list = db.notifications.filter(
      (nt) => nt.destinatario_tipo === destTipo && nt.destinatario_id === destId
    );
    if (opts.canal) list = list.filter((nt) => nt.canal === opts.canal);
    if (opts.soloNoLeidas) list = list.filter((nt) => nt.estado === "pendiente");
    list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return list.slice(0, opts.limit ?? 30).map((nt) => ({
      ...nt,
      titulo: sanitizeTexto(nt.titulo),
      cuerpo: sanitizeTexto(nt.cuerpo),
    }));
  });
}

/** Bandeja de salida simulada: correos/WhatsApp "enviados" (modo demo). */
export function getOutbox(workshopId: string, limit = 40): Notification[] {
  return query((db) =>
    db.notifications
      .filter((nt) => nt.workshop_id === workshopId && (nt.canal === "email" || nt.canal === "whatsapp"))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit)
  );
}

export function unreadCountFor(destTipo: "user" | "customer", destId: string): number {
  return query(
    (db) =>
      db.notifications.filter(
        (nt) => nt.destinatario_tipo === destTipo && nt.destinatario_id === destId && nt.canal === "in_app" && nt.estado === "pendiente"
      ).length
  );
}

// ── Panel de administración de la plataforma ───────────────────────────────

export interface AdminWorkshopRow {
  workshop: Workshop;
  members: number;
  customers: number;
  orders: number;
  ordersToday: number;
  subscription: Subscription | null;
  owner: User | null;
}

export function listAdminWorkshops(): AdminWorkshopRow[] {
  return query((db) =>
    db.workshops
      .map((workshop) => {
        const members = db.workshop_members.filter((m) => m.workshop_id === workshop.id);
        const orders = db.service_orders.filter((o) => o.workshop_id === workshop.id);
        const subs = db.subscriptions
          .filter((s) => s.workshop_id === workshop.id)
          .sort((a, b) => b.created_at.localeCompare(a.created_at));
        const ownerMember = members.find((m) => m.rol === "owner");
        return {
          workshop,
          members: members.length,
          customers: db.customers.filter((c) => c.workshop_id === workshop.id).length,
          orders: orders.length,
          ordersToday: orders.filter((o) => esMismaFechaLocal(o.fecha_ingreso)).length,
          subscription: subs[0] ?? null,
          owner: ownerMember
            ? (() => {
                const u = db.users.find((x) => x.id === ownerMember.user_id);
                return u ? (sanitizeUser(u) as User) : null;
              })()
            : null,
        };
      })
      .sort((a, b) => b.workshop.created_at.localeCompare(a.workshop.created_at))
  );
}

export function listAdminUsers() {
  return query((db) =>
    db.users
      .map((user) => {
        const memberships = db.workshop_members.filter((m) => m.user_id === user.id);
        return {
          user: sanitizeUser(user) as User,
          memberships: memberships.map((m) => ({
            ...m,
            workshop: db.workshops.find((w) => w.id === m.workshop_id)!,
          })),
        };
      })
      .sort((a, b) => b.user.created_at.localeCompare(a.user.created_at))
  );
}

export function listAdminSubscriptions() {
  return query((db) =>
    db.subscriptions
      .map((sub) => ({
        sub,
        workshop: db.workshops.find((w) => w.id === sub.workshop_id)!,
      }))
      .sort((a, b) => a.sub.fin.localeCompare(b.sub.fin))
  );
}

export function getAdminOverview() {
  return query((db) => {
    const activas = db.subscriptions.filter((s) => s.estado === "activa" || s.estado === "en_prueba");
    const ahora = Date.now();
    return {
      talleres: db.workshops.length,
      talleresActivos: db.workshops.filter((w) => w.estado === "activo").length,
      usuarios: db.users.length,
      clientes: db.customers.length,
      ordenesTotales: db.service_orders.length,
      ordenesHoy: db.service_orders.filter((o) => esMismaFechaLocal(o.fecha_ingreso)).length,
      suscripcionesActivas: activas.length,
      pruebasPorVencer: activas.filter(
        (s) => s.estado === "en_prueba" && new Date(s.fin).getTime() - ahora < 7 * 86_400_000
      ).length,
      ultimosAudit: [...db.audit_logs].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 8),
    };
  });
}

// ── Auditoría ──────────────────────────────────────────────────────────────

export function listAuditLogs(workshopId: string | null, limit = 50) {
  return query((db) =>
    db.audit_logs
      .filter((a) => (workshopId === null ? true : a.workshop_id === workshopId))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit)
  );
}

// ── Facturas electrónicas ─────────────────────────────────────────────────

export function listInvoices(workshopId: string): Invoice[] {
  return query((db) =>
    db.invoices
      .filter((i) => i.workshop_id === workshopId)
      .sort((a, b) => b.fecha_emision.localeCompare(a.fecha_emision))
  );
}

export function getInvoice(id: string, workshopId: string): Invoice | null {
  return query((db) =>
    db.invoices.find((i) => i.id === id && i.workshop_id === workshopId) ?? null
  );
}

export function getInvoiceByEstimate(estimateId: string, workshopId: string): Invoice | null {
  return query((db) =>
    db.invoices.find((i) => i.estimate_id === estimateId && i.workshop_id === workshopId) ?? null
  );
}
