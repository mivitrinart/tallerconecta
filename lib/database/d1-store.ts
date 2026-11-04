/**
 * Capa de datos · Modo D1 (Cloudflare).
 *
 * Implementa la misma interfaz que demo-store.ts pero respaldada por D1.
 * Carga todas las tablas en memoria al instanciar y persiste cambios
 * mediante consultas SQL contra D1.
 */

import type {
  Database, Workshop, User, Customer, Vehicle, ServiceOrder, Subscription,
  OrderMedia, OrderEvent, Message, Notification, AuditLog, Estimate,
  EstimateItem, Authorization, Diagnostic, Invoice, CustomerAccount,
  CustomerAccountLink, WorkshopMember
} from "./types";

type D1Database = any;

function sqlValue(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "object") return JSON.stringify(v);
  return v;
}

function parseJson<T>(v: any, fallback: T): T {
  if (v === null || v === undefined) return fallback;
  if (typeof v === "string") {
    try { return JSON.parse(v) as T; } catch { return fallback; }
  }
  return v as T;
}

export class D1Store {
  private db: D1Database;
  private cache: Database;
  private dirty = false;
  private flushPromise: Promise<void> | null = null;
  private secuenciaPorTaller = new Map<string, number>();

  constructor(db: D1Database, initialData: Database) {
    this.db = db;
    this.cache = initialData;
    for (const w of initialData.workshops) {
      this.secuenciaPorTaller.set(w.id, Number(w.secuencia_orden) ?? 1000);
    }
  }

  uid(prefijo: string): string {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
    return `${prefijo}_${hex}`;
  }

  nowISO(): string {
    return new Date().toISOString();
  }

  query<T>(fn: (db: Database) => T): T {
    return fn(this.cache);
  }

  mutate<T>(fn: (db: Database) => T): T {
    const result = fn(this.cache);
    this.dirty = true;
    this.scheduleFlush();
    return result;
  }

  nextOrderNumber(workshopId: string): string {
    const actual = this.secuenciaPorTaller.get(workshopId) ?? this.cache.secuencia_orden ?? 1000;
    const next = actual + 1;
    this.secuenciaPorTaller.set(workshopId, next);
    this.cache.secuencia_orden = next;
    this.dirty = true;
    this.scheduleFlush();
    return `ORD-${next}`;
  }

  resetDemoDb(): void {
    this.cache = this.buildEmptyDb();
    this.dirty = true;
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.flushPromise) return;
    this.flushPromise = this.flush().finally(() => { this.flushPromise = null; });
}

  async flush(): Promise<void> {
    if (!this.dirty) return;
    const c = this.cache;

    const statements: { sql: string; params: any[] }[] = [];

    for (const w of c.workshops) {
      statements.push({
        sql: `INSERT OR REPLACE INTO workshops (id, nombre, nit, direccion, telefono, ciudad, logo_url, google_maps_url, plan, estado, enlace_publico, acepta_vehiculos, cupos_disponibles, created_at, secuencia_orden) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        params: [w.id, w.nombre, w.nit ?? null, w.direccion, w.telefono, w.ciudad, w.logo_url ?? null, w.google_maps_url ?? null, w.plan, w.estado, w.enlace_publico ?? null, w.acepta_vehiculos ? 1 : 0, w.cupos_disponibles ?? 0, w.created_at, this.secuenciaPorTaller.get(w.id) ?? c.secuencia_orden]
      });
    }

    for (const u of c.users) {
      statements.push({
        sql: `INSERT OR REPLACE INTO users (id, nombre, correo, telefono, estado, avatar_url, es_admin_plataforma, session_version, password_hash, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        params: [u.id, u.nombre, u.correo, u.telefono, u.estado, u.avatar_url ?? null, u.es_admin_plataforma ? 1 : 0, u.session_version ?? 0, u.password_hash ?? null, u.created_at]
      });
    }

    for (const m of c.workshop_members) {
      statements.push({
        sql: `INSERT OR REPLACE INTO workshop_members (id, workshop_id, user_id, rol, permisos, activo, created_at) VALUES (?,?,?,?,?,?,?)`,
        params: [m.id, m.workshop_id, m.user_id, m.rol, sqlValue(m.permisos), m.activo ? 1 : 0, m.created_at]
      });
    }

    for (const cu of c.customers) {
      statements.push({
        sql: `INSERT OR REPLACE INTO customers (id, workshop_id, nombre, telefono, correo, documento, portal_token, consentimiento_datos_at, consentimiento_origen, anonimizado, portal_activo, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        params: [cu.id, cu.workshop_id, cu.nombre, cu.telefono, cu.correo, cu.documento ?? null, cu.portal_token, cu.consentimiento_datos_at ?? null, cu.consentimiento_origen ?? null, cu.anonimizado ? 1 : 0, cu.portal_activo ? 1 : 0, cu.created_at]
      });
    }

    for (const ca of c.customer_accounts) {
      statements.push({
        sql: `INSERT OR REPLACE INTO customer_accounts (id, nombre, correo, telefono, estado, password_hash, consentimiento_datos_at, created_at) VALUES (?,?,?,?,?,?,?,?)`,
        params: [ca.id, ca.nombre, ca.correo, ca.telefono, ca.estado, ca.password_hash ?? null, ca.consentimiento_datos_at, ca.created_at]
      });
    }

    for (const cal of c.customer_account_links) {
      statements.push({
        sql: `INSERT OR REPLACE INTO customer_account_links (id, account_id, customer_id, workshop_id, origen, estado, created_at) VALUES (?,?,?,?,?,?,?)`,
        params: [cal.id, cal.account_id, cal.customer_id, cal.workshop_id, cal.origen, cal.estado, cal.created_at]
      });
    }

    for (const v of c.vehicles) {
      statements.push({
        sql: `INSERT OR REPLACE INTO vehicles (id, workshop_id, customer_id, placa, tipo, marca, modelo, anio, kilometraje, color, origen, registrado_por_account_id, ultimo_recordatorio_mant_at, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        params: [v.id, v.workshop_id, v.customer_id, v.placa, v.tipo, v.marca, v.modelo, v.anio, v.kilometraje, v.color ?? null, v.origen, v.registrado_por_account_id ?? null, v.ultimo_recordatorio_mant_at ?? null, v.created_at]
      });
    }

    for (const o of c.service_orders) {
      statements.push({
        sql: `INSERT OR REPLACE INTO service_orders (id, workshop_id, customer_id, vehicle_id, numero, estado, motivo_ingreso, sintomas, fecha_ingreso, fecha_estimada_entrega, fecha_entrega, responsable_id, creado_por, notas_internas, valor_final, calificacion, calificacion_comentario, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        params: [o.id, o.workshop_id, o.customer_id, o.vehicle_id, o.numero, o.estado, o.motivo_ingreso, o.sintomas ?? null, o.fecha_ingreso, o.fecha_estimada_entrega ?? null, o.fecha_entrega ?? null, o.responsable_id ?? null, o.creado_por, o.notas_internas ?? null, o.valor_final ?? null, o.calificacion ?? null, o.calificacion_comentario ?? null, o.created_at, o.updated_at]
      });
    }

    for (const d of c.diagnostics) {
      statements.push({
        sql: `INSERT OR REPLACE INTO diagnostics (id, service_order_id, descripcion, recomendaciones, creado_por, created_at) VALUES (?,?,?,?,?,?)`,
        params: [d.id, d.service_order_id, d.descripcion, d.recomendaciones, d.creado_por, d.created_at]
      });
    }

    for (const e of c.estimates) {
      statements.push({
        sql: `INSERT OR REPLACE INTO estimates (id, service_order_id, workshop_id, version, subtotal, descuento, impuesto_porcentaje, impuestos, total, estado, validez_dias, creado_por, created_at, enviada_at, decidida_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        params: [e.id, e.service_order_id, e.workshop_id, e.version, e.subtotal, e.descuento, e.impuesto_porcentaje, e.impuestos, e.total, e.estado, e.validez_dias, e.creado_por, e.created_at, e.enviada_at ?? null, e.decidida_at ?? null]
      });
    }

    for (const ei of c.estimate_items) {
      statements.push({
        sql: `INSERT OR REPLACE INTO estimate_items (id, estimate_id, tipo, descripcion, cantidad, precio_unitario, subtotal, estado, requiere_autorizacion, criticidad, alternativa_descripcion, alternativa_precio_unitario, taller_recomienda) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        params: [ei.id, ei.estimate_id, ei.tipo, ei.descripcion, ei.cantidad, ei.precio_unitario, ei.subtotal, ei.estado, ei.requiere_autorizacion ? 1 : 0, ei.criticidad ?? null, ei.alternativa_descripcion ?? null, ei.alternativa_precio_unitario ?? null, ei.taller_recomienda ?? null]
      });
    }

    for (const a of c.authorizations) {
      statements.push({
        sql: `INSERT OR REPLACE INTO authorizations (id, estimate_id, service_order_id, workshop_id, version_aceptada, decision, estado, decided_by, decided_by_nombre, monto_aprobado, items_aprobados, items_rechazados, items_postergados, items_con_alternativa, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        params: [a.id, a.estimate_id, a.service_order_id, a.workshop_id, a.version_aceptada, a.decision, a.estado ?? "emitida", a.decided_by, a.decided_by_nombre, a.monto_aprobado, sqlValue(a.items_aprobados), sqlValue(a.items_rechazados), sqlValue(a.items_postergados), sqlValue(a.items_con_alternativa), a.created_at]
      });
    }

    for (const m of c.order_media) {
      statements.push({
        sql: `INSERT OR REPLACE INTO order_media (id, service_order_id, workshop_id, categoria, nombre, url, autor_id, autor_nombre, visible_cliente, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        params: [m.id, m.service_order_id, m.workshop_id, m.categoria, m.nombre, m.url, m.autor_id ?? null, m.autor_nombre, m.visible_cliente ? 1 : 0, m.created_at]
      });
    }

    for (const e of c.order_events) {
      statements.push({
        sql: `INSERT OR REPLACE INTO order_events (id, service_order_id, workshop_id, tipo, estado_anterior, estado_nuevo, descripcion, actor_id, actor_nombre, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        params: [e.id, e.service_order_id, e.workshop_id, e.tipo, e.estado_anterior ?? null, e.estado_nuevo ?? null, e.descripcion, e.actor_id ?? null, e.actor_nombre, e.created_at]
      });
    }

    for (const m of c.messages) {
      statements.push({
        sql: `INSERT OR REPLACE INTO messages (id, service_order_id, workshop_id, remitente_tipo, remitente_id, remitente_nombre, contenido, leido, created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
        params: [m.id, m.service_order_id, m.workshop_id, m.remitente_tipo, m.remitente_id ?? null, m.remitente_nombre, m.contenido, m.leido ? 1 : 0, m.created_at]
      });
    }

    for (const n of c.notifications) {
      statements.push({
        sql: `INSERT OR REPLACE INTO notifications (id, workshop_id, destinatario_tipo, destinatario_id, tipo, titulo, cuerpo, canal, estado, link, service_order_id, created_at, leida_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        params: [n.id, n.workshop_id ?? null, n.destinatario_tipo, n.destinatario_id, n.tipo, n.titulo, n.cuerpo, n.canal, n.estado, n.link ?? null, n.service_order_id ?? null, n.created_at, n.leida_at ?? null]
      });
    }

    for (const s of c.subscriptions) {
      statements.push({
        sql: `INSERT OR REPLACE INTO subscriptions (id, workshop_id, plan, estado, inicio, fin, created_at) VALUES (?,?,?,?,?,?,?)`,
        params: [s.id, s.workshop_id, s.plan, s.estado, s.inicio, s.fin, s.created_at]
      });
    }

    for (const al of c.audit_logs) {
      statements.push({
        sql: `INSERT OR REPLACE INTO audit_logs (id, workshop_id, actor_id, actor_nombre, accion, entidad, entidad_id, detalle, created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
        params: [al.id, al.workshop_id ?? null, al.actor_id ?? null, al.actor_nombre, al.accion, al.entidad, al.entidad_id ?? null, sqlValue(al.detalle), al.created_at]
      });
    }

    for (const inv of c.invoices) {
      statements.push({
        sql: `INSERT OR REPLACE INTO invoices (id, service_order_id, estimate_id, workshop_id, numero, fecha_emision, nit_emisor, nombre_emisor, documento_cliente, nombre_cliente, direccion_cliente, medio_pago, subtotal, descuento, impuesto_porcentaje, impuestos, total, cufe, xml, pdf_url, estado, creado_por, created_at, anulada_at, pagada_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        params: [inv.id, inv.service_order_id, inv.estimate_id, inv.workshop_id, inv.numero, inv.fecha_emision, inv.nit_emisor, inv.nombre_emisor, inv.documento_cliente, inv.nombre_cliente, inv.direccion_cliente ?? null, inv.medio_pago, inv.subtotal, inv.descuento, inv.impuesto_porcentaje, inv.impuestos, inv.total, inv.cufe, inv.xml, inv.pdf_url, inv.estado, inv.creado_por, inv.created_at, inv.anulada_at ?? null, inv.pagada_at ?? null]
      });
    }

    for (let i = 0; i < statements.length; i += 50) {
      const batch = statements.slice(i, i + 50);
      const preparados = batch.map(s => this.db.prepare(s.sql).bind(...s.params));
      try {
        // D1 batch es atómico por llamada: si falla, reintentar uno por uno
        // para que una fila problemática no impida persistir el resto.
        await this.db.batch(preparados);
      } catch (errBatch) {
        let fallo = false;
        for (const st of preparados) {
          try {
            await st.run();
          } catch (errFila) {
            console.error("[D1 flush] fila no persistida:", (errFila as Error)?.message ?? errFila);
            fallo = true;
          }
        }
        if (fallo) {
          this.dirty = true;
          throw new Error("D1 flush: falló al persistir una o más filas");
        }
      }
    }

    this.dirty = false;
  }

  static async loadFromD1(db: D1Database): Promise<Database> {
    const loadTable = async <T>(sql: string): Promise<T[]> => {
      const { results } = await db.prepare(sql).all();
      return (results ?? []) as T[];
    };

    const workshops = await loadTable<Workshop>("SELECT * FROM workshops");
    const users = await loadTable<User>("SELECT * FROM users");
    const workshop_members = await loadTable<WorkshopMember>("SELECT * FROM workshop_members");
    const customers = await loadTable<Customer>("SELECT * FROM customers");
    const customer_accounts = await loadTable<CustomerAccount>("SELECT * FROM customer_accounts");
    const customer_account_links = await loadTable<CustomerAccountLink>("SELECT * FROM customer_account_links");
    const vehicles = await loadTable<Vehicle>("SELECT * FROM vehicles");
    const service_orders = await loadTable<ServiceOrder>("SELECT * FROM service_orders");
    const diagnostics = await loadTable<Diagnostic>("SELECT * FROM diagnostics");
    const estimates = await loadTable<Estimate>("SELECT * FROM estimates");
    const estimate_items = await loadTable<EstimateItem>("SELECT * FROM estimate_items");
    const authorizations = await loadTable<Authorization>("SELECT * FROM authorizations");
    const order_media = await loadTable<OrderMedia>("SELECT * FROM order_media");
    const order_events = await loadTable<OrderEvent>("SELECT * FROM order_events");
    const messages = await loadTable<Message>("SELECT * FROM messages");
    const notifications = await loadTable<Notification>("SELECT * FROM notifications");
    const subscriptions = await loadTable<Subscription>("SELECT * FROM subscriptions");
    const audit_logs = await loadTable<AuditLog>("SELECT * FROM audit_logs");
    const invoices = await loadTable<Invoice>("SELECT * FROM invoices");

    const parsedWorkshopMembers = workshop_members.map(m => ({ ...m, permisos: parseJson(m.permisos, []) }));
    const parsedAuthorizations = authorizations.map(a => ({
      ...a,
      items_aprobados: parseJson(a.items_aprobados, []),
      items_rechazados: parseJson(a.items_rechazados, []),
      items_postergados: parseJson(a.items_postergados, []),
      items_con_alternativa: parseJson(a.items_con_alternativa, []),
    }));
    const parsedAuditLogs = audit_logs.map(al => ({ ...al, detalle: parseJson(al.detalle, null) }));

    const secuencia_orden = (workshops.length > 0)
      ? ((workshops[0] as any).secuencia_orden ?? 1000)
      : 1000;

    return {
      meta: { version: 9, seeded_at: new Date().toISOString() },
      workshops,
      users,
      workshop_members: parsedWorkshopMembers,
      customers,
      customer_accounts,
      customer_account_links,
      vehicles,
      service_orders,
      diagnostics,
      estimates,
      estimate_items,
      authorizations: parsedAuthorizations,
      order_media,
      order_events,
      messages,
      notifications,
      subscriptions,
      audit_logs: parsedAuditLogs,
      invoices,
      email_verification_codes: [],
      secuencia_orden,
      secuencia_factura: 0,
    };
  }

  private buildEmptyDb(): Database {
    return {
      meta: { version: 9, seeded_at: new Date().toISOString() },
      workshops: [], users: [], workshop_members: [], customers: [],
      customer_accounts: [], customer_account_links: [], vehicles: [],
      service_orders: [], diagnostics: [], estimates: [],
      estimate_items: [], authorizations: [], order_media: [],
      order_events: [], messages: [], notifications: [],
      subscriptions: [], audit_logs: [], invoices: [],
      email_verification_codes: [],
      secuencia_orden: 1000,
      secuencia_factura: 0,
    };
  }
}

export function getD1Store(env: any, initialData: Database): D1Store {
  return new D1Store(env.taller_conecta_db, initialData);
}

export function uid(prefijo: string): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
  return `${prefijo}_${hex}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}
