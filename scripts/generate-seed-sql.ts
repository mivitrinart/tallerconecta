import { buildSeed } from "@/lib/database/seed";

const seed = buildSeed();

const esc = (v: unknown): string => {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "string") return `'${v.replace(/'/g, "''")}'`;
  if (typeof v === "boolean") return v ? "1" : "0";
  if (typeof v === "number") return String(v);
  if (Array.isArray(v) || (typeof v === "object" && v !== null)) {
    return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
  }
  return "NULL";
};

const sql: string[] = [];

// Workshops
for (const w of seed.workshops) {
  sql.push(`INSERT OR REPLACE INTO workshops (id, nombre, nit, direccion, telefono, ciudad, logo_url, google_maps_url, plan, estado, enlace_publico, acepta_vehiculos, cupos_disponibles, created_at, secuencia_orden) VALUES (${esc(w.id)}, ${esc(w.nombre)}, ${esc(w.nit)}, ${esc(w.direccion)}, ${esc(w.telefono)}, ${esc(w.ciudad)}, ${esc(w.logo_url)}, ${esc(w.google_maps_url)}, ${esc(w.plan)}, ${esc(w.estado)}, ${esc(w.enlace_publico)}, ${esc(w.acepta_vehiculos)}, ${esc(w.cupos_disponibles)}, ${esc(w.created_at)}, ${esc(w.secuencia_orden)});`);
}

// Users
for (const u of seed.users) {
  sql.push(`INSERT OR REPLACE INTO users (id, nombre, correo, password_hash, rol, workshop_id, activo, created_at) VALUES (${esc(u.id)}, ${esc(u.nombre)}, ${esc(u.correo)}, ${esc(u.password_hash)}, ${esc(u.rol)}, ${esc(u.workshop_id)}, ${esc(u.activo)}, ${esc(u.created_at)});`);
}

// Workshop members
for (const m of seed.workshop_members) {
  sql.push(`INSERT OR REPLACE INTO workshop_members (id, workshop_id, user_id, rol, permisos, activo, created_at) VALUES (${esc(m.id)}, ${esc(m.workshop_id)}, ${esc(m.user_id)}, ${esc(m.rol)}, ${esc(m.permisos)}, ${esc(m.activo)}, ${esc(m.created_at)});`);
}

// Customers
for (const c of seed.customers) {
  sql.push(`INSERT OR REPLACE INTO customers (id, workshop_id, nombre, telefono, correo, documento, portal_token, consentimiento_datos_at, consentimiento_origen, anonimizado, portal_activo, created_at) VALUES (${esc(c.id)}, ${esc(c.workshop_id)}, ${esc(c.nombre)}, ${esc(c.telefono)}, ${esc(c.correo)}, ${esc(c.documento)}, ${esc(c.portal_token)}, ${esc(c.consentimiento_datos_at)}, ${esc(c.consentimiento_origen)}, ${esc(c.anonimizado)}, ${esc(c.portal_activo)}, ${esc(c.created_at)});`);
}

// Customer accounts
for (const a of seed.customer_accounts) {
  sql.push(`INSERT OR REPLACE INTO customer_accounts (id, nombre, correo, telefono, estado, password_hash, consentimiento_datos_at, created_at) VALUES (${esc(a.id)}, ${esc(a.nombre)}, ${esc(a.correo)}, ${esc(a.telefono)}, ${esc(a.estado)}, ${esc(a.password_hash)}, ${esc(a.consentimiento_datos_at)}, ${esc(a.created_at)});`);
}

// Customer account links
for (const l of seed.customer_account_links) {
  sql.push(`INSERT OR REPLACE INTO customer_account_links (id, account_id, customer_id, workshop_id, origen, estado, created_at) VALUES (${esc(l.id)}, ${esc(l.account_id)}, ${esc(l.customer_id)}, ${esc(l.workshop_id)}, ${esc(l.origen)}, ${esc(l.estado)}, ${esc(l.created_at)});`);
}

// Vehicles
for (const v of seed.vehicles) {
  sql.push(`INSERT OR REPLACE INTO vehicles (id, workshop_id, customer_id, placa, tipo, marca, modelo, anio, kilometraje, color, origen, registrado_por_account_id, created_at) VALUES (${esc(v.id)}, ${esc(v.workshop_id)}, ${esc(v.customer_id)}, ${esc(v.placa)}, ${esc(v.tipo)}, ${esc(v.marca)}, ${esc(v.modelo)}, ${esc(v.anio)}, ${esc(v.kilometraje)}, ${esc(v.color)}, ${esc(v.origen)}, ${esc(v.registrado_por_account_id)}, ${esc(v.created_at)});`);
}

// Service orders
for (const o of seed.service_orders) {
  sql.push(`INSERT OR REPLACE INTO service_orders (id, workshop_id, customer_id, vehicle_id, numero, estado, fecha_ingreso, fecha_entrega, valor_final, observaciones, created_at, updated_at) VALUES (${esc(o.id)}, ${esc(o.workshop_id)}, ${esc(o.customer_id)}, ${esc(o.vehicle_id)}, ${esc(o.numero)}, ${esc(o.estado)}, ${esc(o.fecha_ingreso)}, ${esc(o.fecha_entrega)}, ${esc(o.valor_final)}, ${esc(o.observaciones)}, ${esc(o.created_at)}, ${esc(o.updated_at)});`);
}

// Diagnostics
for (const d of seed.diagnostics) {
  sql.push(`INSERT OR REPLACE INTO diagnostics (id, service_order_id, descripcion, tecnico_id, created_at) VALUES (${esc(d.id)}, ${esc(d.service_order_id)}, ${esc(d.descripcion)}, ${esc(d.tecnico_id)}, ${esc(d.created_at)});`);
}

// Estimates
for (const e of seed.estimates) {
  sql.push(`INSERT OR REPLACE INTO estimates (id, service_order_id, version, estado, items_json, total_bruto, total_descuento, total_iva, total, created_at, enviado_at, decidido_at) VALUES (${esc(e.id)}, ${esc(e.service_order_id)}, ${esc(e.version)}, ${esc(e.estado)}, ${esc(e.items_json)}, ${esc(e.total_bruto)}, ${esc(e.total_descuento)}, ${esc(e.total_iva)}, ${esc(e.total)}, ${esc(e.created_at)}, ${esc(e.enviado_at)}, ${esc(e.decidido_at)});`);
}

// Estimate items
for (const i of seed.estimate_items) {
  sql.push(`INSERT OR REPLACE INTO estimate_items (id, estimate_id, descripcion, cantidad, precio_unitario, descuento, iva, total_linea, criticidad, referencia_original, created_at) VALUES (${esc(i.id)}, ${esc(i.estimate_id)}, ${esc(i.descripcion)}, ${esc(i.cantidad)}, ${esc(i.precio_unitario)}, ${esc(i.descuento)}, ${esc(i.iva)}, ${esc(i.total_linea)}, ${esc(i.criticidad)}, ${esc(i.referencia_original)}, ${esc(i.created_at)});`);
}

// Authorizations
for (const a of seed.authorizations) {
  sql.push(`INSERT OR REPLACE INTO authorizations (id, estimate_id, cliente_id, items_aprobados, items_rechazados, items_postergados, items_con_alternativa, observaciones, created_at) VALUES (${esc(a.id)}, ${esc(a.estimate_id)}, ${esc(a.cliente_id)}, ${esc(a.items_aprobados)}, ${esc(a.items_rechazados)}, ${esc(a.items_postergados)}, ${esc(a.items_con_alternativa)}, ${esc(a.observaciones)}, ${esc(a.created_at)});`);
}

// Order media
for (const m of seed.order_media) {
  sql.push(`INSERT OR REPLACE INTO order_media (id, service_order_id, url, tipo, categoria, descripcion, visible_cliente, created_at) VALUES (${esc(m.id)}, ${esc(m.service_order_id)}, ${esc(m.url)}, ${esc(m.tipo)}, ${esc(m.categoria)}, ${esc(m.descripcion)}, ${esc(m.visible_cliente)}, ${esc(m.created_at)});`);
}

// Order events
for (const e of seed.order_events) {
  sql.push(`INSERT OR REPLACE INTO order_events (id, service_order_id, tipo, descripcion, actor_tipo, actor_id, metadata, created_at) VALUES (${esc(e.id)}, ${esc(e.service_order_id)}, ${esc(e.tipo)}, ${esc(e.descripcion)}, ${esc(e.actor_tipo)}, ${esc(e.actor_id)}, ${esc(e.metadata)}, ${esc(e.created_at)});`);
}

// Messages
for (const m of seed.messages) {
  sql.push(`INSERT OR REPLACE INTO messages (id, service_order_id, remitente_tipo, remitente_id, contenido, created_at) VALUES (${esc(m.id)}, ${esc(m.service_order_id)}, ${esc(m.remitente_tipo)}, ${esc(m.remitente_id)}, ${esc(m.contenido)}, ${esc(m.created_at)});`);
}

// Notifications
for (const n of seed.notifications) {
  sql.push(`INSERT OR REPLACE INTO notifications (id, workshop_id, destinatario_tipo, destinatario_id, tipo, titulo, cuerpo, estado, canal, related_order_id, created_at) VALUES (${esc(n.id)}, ${esc(n.workshop_id)}, ${esc(n.destinatario_tipo)}, ${esc(n.destinatario_id)}, ${esc(n.tipo)}, ${esc(n.titulo)}, ${esc(n.cuerpo)}, ${esc(n.estado)}, ${esc(n.canal)}, ${esc(n.related_order_id)}, ${esc(n.created_at)});`);
}

// Subscriptions
for (const s of seed.subscriptions) {
  sql.push(`INSERT OR REPLACE INTO subscriptions (id, workshop_id, plan, estado, inicio, fin, created_at) VALUES (${esc(s.id)}, ${esc(s.workshop_id)}, ${esc(s.plan)}, ${esc(s.estado)}, ${esc(s.inicio)}, ${esc(s.fin)}, ${esc(s.created_at)});`);
}

// Audit logs
for (const a of seed.audit_logs) {
  sql.push(`INSERT OR REPLACE INTO audit_logs (id, workshop_id, actor_id, actor_nombre, accion, entidad, entidad_id, detalle, created_at) VALUES (${esc(a.id)}, ${esc(a.workshop_id)}, ${esc(a.actor_id)}, ${esc(a.actor_nombre)}, ${esc(a.accion)}, ${esc(a.entidad)}, ${esc(a.entidad_id)}, ${esc(a.detalle)}, ${esc(a.created_at)});`);
}

// Invoices
for (const i of seed.invoices) {
  sql.push(`INSERT OR REPLACE INTO invoices (id, workshop_id, service_order_id, numero, pdf_url, estado, created_at) VALUES (${esc(i.id)}, ${esc(i.workshop_id)}, ${esc(i.service_order_id)}, ${esc(i.numero)}, ${esc(i.pdf_url)}, ${esc(i.estado)}, ${esc(i.created_at)});`);
}

// Update secuencia_orden
sql.push(`UPDATE workshops SET secuencia_orden = ${esc(seed.secuencia_orden)} WHERE id = (SELECT id FROM workshops LIMIT 1);`);

// Output SQL
console.log(sql.join("\n"));