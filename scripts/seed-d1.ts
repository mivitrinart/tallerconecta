/**
 * Seed D1 database with full seed data
 * Run with: npx tsx scripts/seed-d1.ts
 */
import { buildSeed } from "@/lib/database/seed";
import { getCloudflareContext } from "@opennextjs/cloudflare";

async function seedD1() {
  try {
    const { env } = await getCloudflareContext();
    if (!env?.taller_conecta_db) {
      console.error("D1 binding not available");
      process.exit(1);
    }

    const seed = buildSeed();
    const db = env.taller_conecta_db;

    console.log("Seeding workshops...");
    for (const w of seed.workshops) {
      await db.prepare(`
        INSERT OR REPLACE INTO workshops (id, nombre, nit, direccion, telefono, ciudad, logo_url, google_maps_url, plan, estado, enlace_publico, acepta_vehiculos, cupos_disponibles, created_at, secuencia_orden)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(w.id, w.nombre, w.nit, w.direccion, w.telefono, w.ciudad, w.logo_url, w.google_maps_url, w.plan, w.estado, w.enlace_publico, w.acepta_vehiculos ? 1 : 0, w.cupos_disponibles ?? null, w.created_at, w.secuencia_orden ?? 1000).run();
    }

    console.log("Seeding users...");
    for (const u of seed.users) {
      await db.prepare(`
        INSERT OR REPLACE INTO users (id, nombre, correo, password_hash, rol, workshop_id, activo, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(u.id, u.nombre, u.correo, u.password_hash, u.rol, u.workshop_id, u.activo ? 1 : 0, u.created_at).run();
    }

    console.log("Seeding workshop_members...");
    for (const m of seed.workshop_members) {
      await db.prepare(`
        INSERT OR REPLACE INTO workshop_members (id, workshop_id, user_id, rol, permisos, activo, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(m.id, m.workshop_id, m.user_id, m.rol, JSON.stringify(m.permisos), m.activo ? 1 : 0, m.created_at).run();
    }

    console.log("Seeding customers...");
    for (const c of seed.customers) {
      await db.prepare(`
        INSERT OR REPLACE INTO customers (id, workshop_id, nombre, telefono, correo, documento, portal_token, consentimiento_datos_at, consentimiento_origen, anonimizado, portal_activo, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(c.id, c.workshop_id, c.nombre, c.telefono, c.correo, c.documento, c.portal_token, c.consentimiento_datos_at, c.consentimiento_origen, c.anonimizado ? 1 : 0, c.portal_activo ? 1 : 0, c.created_at).run();
    }

    console.log("Seeding customer_accounts...");
    for (const a of seed.customer_accounts) {
      await db.prepare(`
        INSERT OR REPLACE INTO customer_accounts (id, nombre, correo, telefono, estado, password_hash, consentimiento_datos_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(a.id, a.nombre, a.correo, a.telefono, a.estado, a.password_hash, a.consentimiento_datos_at, a.created_at).run();
    }

    console.log("Seeding customer_account_links...");
    for (const l of seed.customer_account_links) {
      await db.prepare(`
        INSERT OR REPLACE INTO customer_account_links (id, account_id, customer_id, workshop_id, origen, estado, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(l.id, l.account_id, l.customer_id, l.workshop_id, l.origen, l.estado, l.created_at).run();
    }

    console.log("Seeding vehicles...");
    for (const v of seed.vehicles) {
      await db.prepare(`
        INSERT OR REPLACE INTO vehicles (id, workshop_id, customer_id, placa, tipo, marca, modelo, anio, kilometraje, color, origen, registrado_por_account_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(v.id, v.workshop_id, v.customer_id, v.placa, v.tipo, v.marca, v.modelo, v.anio, v.kilometraje, v.color, v.origen, v.registrado_por_account_id, v.created_at).run();
    }

    console.log("Seeding service_orders...");
    for (const o of seed.service_orders) {
      await db.prepare(`
        INSERT OR REPLACE INTO service_orders (id, workshop_id, customer_id, vehicle_id, numero, estado, fecha_ingreso, fecha_entrega, valor_final, observaciones, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(o.id, o.workshop_id, o.customer_id, o.vehicle_id, o.numero, o.estado, o.fecha_ingreso, o.fecha_entrega, o.valor_final, o.observaciones, o.created_at, o.updated_at).run();
    }

    console.log("Seeding diagnostics...");
    for (const d of seed.diagnostics) {
      await db.prepare(`
        INSERT OR REPLACE INTO diagnostics (id, service_order_id, descripcion, tecnico_id, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(d.id, d.service_order_id, d.descripcion, d.tecnico_id, d.created_at).run();
    }

    console.log("Seeding estimates...");
    for (const e of seed.estimates) {
      await db.prepare(`
        INSERT OR REPLACE INTO estimates (id, service_order_id, version, estado, items_json, total_bruto, total_descuento, total_iva, total, created_at, enviado_at, decidido_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(e.id, e.service_order_id, e.version, e.estado, JSON.stringify(e.items_json), e.total_bruto, e.total_descuento, e.total_iva, e.total, e.created_at, e.enviado_at, e.decidido_at).run();
    }

    console.log("Seeding estimate_items...");
    for (const i of seed.estimate_items) {
      await db.prepare(`
        INSERT OR REPLACE INTO estimate_items (id, estimate_id, descripcion, cantidad, precio_unitario, descuento, iva, total_linea, criticidad, referencia_original, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(i.id, i.estimate_id, i.descripcion, i.cantidad, i.precio_unitario, i.descuento, i.iva, i.total_linea, i.criticidad, i.referencia_original, i.created_at).run();
    }

    console.log("Seeding authorizations...");
    for (const a of seed.authorizations) {
      await db.prepare(`
        INSERT OR REPLACE INTO authorizations (id, estimate_id, cliente_id, items_aprobados, items_rechazados, items_postergados, items_con_alternativa, observaciones, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(a.id, a.estimate_id, a.cliente_id, JSON.stringify(a.items_aprobados), JSON.stringify(a.items_rechazados), JSON.stringify(a.items_postergados), JSON.stringify(a.items_con_alternativa), a.observaciones, a.created_at).run();
    }

    console.log("Seeding order_media...");
    for (const m of seed.order_media) {
      await db.prepare(`
        INSERT OR REPLACE INTO order_media (id, service_order_id, url, tipo, categoria, descripcion, visible_cliente, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(m.id, m.service_order_id, m.url, m.tipo, m.categoria, m.descripcion, m.visible_cliente ? 1 : 0, m.created_at).run();
    }

    console.log("Seeding order_events...");
    for (const e of seed.order_events) {
      await db.prepare(`
        INSERT OR REPLACE INTO order_events (id, service_order_id, tipo, descripcion, actor_tipo, actor_id, metadata, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(e.id, e.service_order_id, e.tipo, e.descripcion, e.actor_tipo, e.actor_id, JSON.stringify(e.metadata), e.created_at).run();
    }

    console.log("Seeding messages...");
    for (const m of seed.messages) {
      await db.prepare(`
        INSERT OR REPLACE INTO messages (id, service_order_id, remitente_tipo, remitente_id, contenido, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(m.id, m.service_order_id, m.remitente_tipo, m.remitente_id, m.contenido, m.created_at).run();
    }

    console.log("Seeding notifications...");
    for (const n of seed.notifications) {
      await db.prepare(`
        INSERT OR REPLACE INTO notifications (id, workshop_id, destinatario_tipo, destinatario_id, tipo, titulo, cuerpo, estado, canal, related_order_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(n.id, n.workshop_id, n.destinatario_tipo, n.destinatario_id, n.tipo, n.titulo, n.cuerpo, n.estado, n.canal, n.related_order_id, n.created_at).run();
    }

    console.log("Seeding subscriptions...");
    for (const s of seed.subscriptions) {
      await db.prepare(`
        INSERT OR REPLACE INTO subscriptions (id, workshop_id, plan, estado, inicio, fin, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(s.id, s.workshop_id, s.plan, s.estado, s.inicio, s.fin, s.created_at).run();
    }

    console.log("Seeding audit_logs...");
    for (const a of seed.audit_logs) {
      await db.prepare(`
        INSERT OR REPLACE INTO audit_logs (id, workshop_id, actor_id, actor_nombre, accion, entidad, entidad_id, detalle, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(a.id, a.workshop_id, a.actor_id, a.actor_nombre, a.accion, a.entidad, a.entidad_id, JSON.stringify(a.detalle), a.created_at).run();
    }

    console.log("Seeding invoices...");
    for (const i of seed.invoices) {
      await db.prepare(`
        INSERT OR REPLACE INTO invoices (id, workshop_id, service_order_id, numero, pdf_url, estado, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(i.id, i.workshop_id, i.service_order_id, i.numero, i.pdf_url, i.estado, i.created_at).run();
    }

    console.log("Updating secuencia_orden...");
    await db.prepare(`
      UPDATE workshops SET secuencia_orden = ? WHERE id = (SELECT id FROM workshops LIMIT 1)
    `).bind(seed.secuencia_orden).run();

    console.log("✅ D1 seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding D1:", error);
    process.exit(1);
  }
}

seedD1();