/**
 * Esquema de base de datos con Drizzle ORM (Dialect: SQLite / D1).
 *
 * Es el reflejo tipado de schema.sql y de las migraciones versionadas en
 * ./migrations. Cada taller es un aislamiento de datos: todas las tablas
 * de negocio llevan workshop_id y las consultas lo filtran siempre.
 *
 * Nota de despliegue en Cloudflare D1:
 *   npx drizzle-kit generate   # compara schema.ts contra la BD meta local
 *   npx wrangler d1 migrations apply taller-conecta-db
 *   (o aplicar ./migrations/*.sql contra la instancia de D1)
 */
import {
  integer,
  sqliteTable,
  text,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const workshops = sqliteTable(
  "workshops",
  {
    id: text("id").primaryKey(),
    nombre: text("nombre").notNull(),
    nit: text("nit"),
    direccion: text("direccion").notNull(),
    telefono: text("telefono").notNull(),
    ciudad: text("ciudad").notNull(),
    logo_url: text("logo_url"),
    google_maps_url: text("google_maps_url"),
    plan: text("plan").notNull().default("starter"),
    estado: text("estado").notNull().default("activo"),
    enlace_publico: text("enlace_publico").unique(),
    acepta_vehiculos: integer("acepta_vehiculos", { mode: "boolean" }).default(true),
    cupos_disponibles: integer("cupos_disponibles").default(0),
    created_at: text("created_at").notNull(),
    secuencia_orden: integer("secuencia_orden").default(1000),
  },
  (t) => ({
    enlacePublicoIdx: uniqueIndex("idx_workshops_enlace_publico").on(t.enlace_publico),
  }),
);

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    nombre: text("nombre").notNull(),
    correo: text("correo").notNull(),
    telefono: text("telefono").notNull(),
    estado: text("estado").notNull().default("activo"),
    avatar_url: text("avatar_url"),
    es_admin_plataforma: integer("es_admin_plataforma", { mode: "boolean" }).default(false),
    session_version: integer("session_version").default(0),
    password_hash: text("password_hash"),
    email_verified: integer("email_verified", { mode: "boolean" }).default(false),
    email_verified_at: text("email_verified_at"),
    created_at: text("created_at").notNull(),
  },
  (t) => ({
    correoIdx: index("idx_users_correo").on(t.correo),
  }),
);

export const workshopMembers = sqliteTable(
  "workshop_members",
  {
    id: text("id").primaryKey(),
    workshop_id: text("workshop_id").notNull(),
    user_id: text("user_id").notNull(),
    rol: text("rol").notNull(),
    permisos: text("permisos").notNull().default("[]"),
    activo: integer("activo", { mode: "boolean" }).default(true),
    created_at: text("created_at").notNull(),
  },
  (t) => ({
    workshopIdx: index("idx_workshop_members_workshop").on(t.workshop_id),
    userIdx: index("idx_workshop_members_user").on(t.user_id),
  }),
);

export const customers = sqliteTable(
  "customers",
  {
    id: text("id").primaryKey(),
    workshop_id: text("workshop_id").notNull(),
    nombre: text("nombre").notNull(),
    telefono: text("telefono").notNull(),
    correo: text("correo").notNull(),
    documento: text("documento"),
    portal_token: text("portal_token").notNull().unique(),
    consentimiento_datos_at: text("consentimiento_datos_at"),
    consentimiento_origen: text("consentimiento_origen"),
    anonimizado: integer("anonimizado", { mode: "boolean" }).default(false),
    portal_activo: integer("portal_activo", { mode: "boolean" }).default(true),
    created_at: text("created_at").notNull(),
  },
  (t) => ({
    workshopIdx: index("idx_customers_workshop").on(t.workshop_id),
    portalTokenIdx: uniqueIndex("idx_customers_portal_token").on(t.portal_token),
  }),
);

export const customerAccounts = sqliteTable(
  "customer_accounts",
  {
    id: text("id").primaryKey(),
    nombre: text("nombre").notNull(),
    correo: text("correo").notNull(),
    telefono: text("telefono").notNull(),
    estado: text("estado").notNull().default("activo"),
    password_hash: text("password_hash"),
    consentimiento_datos_at: text("consentimiento_datos_at").notNull(),
    email_verified: integer("email_verified", { mode: "boolean" }).default(false),
    email_verified_at: text("email_verified_at"),
    created_at: text("created_at").notNull(),
  },
);

export const customerAccountLinks = sqliteTable(
  "customer_account_links",
  {
    id: text("id").primaryKey(),
    account_id: text("account_id").notNull(),
    customer_id: text("customer_id").notNull(),
    workshop_id: text("workshop_id").notNull(),
    origen: text("origen").notNull().default("public"),
    estado: text("estado").notNull().default("pendiente"),
    created_at: text("created_at").notNull(),
  },
  (t) => ({
    workshopIdx: index("idx_customer_account_links_workshop").on(t.workshop_id),
  }),
);

export const vehicles = sqliteTable(
  "vehicles",
  {
    id: text("id").primaryKey(),
    workshop_id: text("workshop_id").notNull(),
    customer_id: text("customer_id").notNull(),
    placa: text("placa").notNull(),
    tipo: text("tipo").notNull(),
    marca: text("marca").notNull(),
    modelo: text("modelo").notNull(),
    anio: integer("anio").notNull(),
    kilometraje: integer("kilometraje").notNull().default(0),
    color: text("color"),
    origen: text("origen").notNull().default("taller"),
    registrado_por_account_id: text("registrado_por_account_id"),
    ultimo_recordatorio_mant_at: text("ultimo_recordatorio_mant_at"),
    created_at: text("created_at").notNull(),
  },
  (t) => ({
    workshopIdx: index("idx_vehicles_workshop").on(t.workshop_id),
    customerIdx: index("idx_vehicles_customer").on(t.customer_id),
  }),
);

export const serviceOrders = sqliteTable(
  "service_orders",
  {
    id: text("id").primaryKey(),
    workshop_id: text("workshop_id").notNull(),
    customer_id: text("customer_id").notNull(),
    vehicle_id: text("vehicle_id").notNull(),
    numero: text("numero").notNull(),
    estado: text("estado").notNull().default("recibido"),
    motivo_ingreso: text("motivo_ingreso").notNull(),
    sintomas: text("sintomas"),
    fecha_ingreso: text("fecha_ingreso").notNull(),
    fecha_estimada_entrega: text("fecha_estimada_entrega"),
    fecha_entrega: text("fecha_entrega"),
    responsable_id: text("responsable_id"),
    creado_por: text("creado_por").notNull(),
    notas_internas: text("notas_internas"),
    valor_final: integer("valor_final"),
    calificacion: integer("calificacion"),
    calificacion_comentario: text("calificacion_comentario"),
    created_at: text("created_at").notNull(),
    updated_at: text("updated_at").notNull(),
  },
  (t) => ({
    workshopIdx: index("idx_service_orders_workshop").on(t.workshop_id),
    customerIdx: index("idx_service_orders_customer").on(t.customer_id),
    estadoIdx: index("idx_service_orders_estado").on(t.estado),
  }),
);

export const diagnostics = sqliteTable(
  "diagnostics",
  {
    id: text("id").primaryKey(),
    service_order_id: text("service_order_id").notNull(),
    descripcion: text("descripcion").notNull(),
    recomendaciones: text("recomendaciones").notNull(),
    creado_por: text("creado_por").notNull(),
    created_at: text("created_at").notNull(),
  },
  (t) => ({
    orderIdx: index("idx_diagnostics_service_order").on(t.service_order_id),
  }),
);

export const estimates = sqliteTable(
  "estimates",
  {
    id: text("id").primaryKey(),
    service_order_id: text("service_order_id").notNull(),
    workshop_id: text("workshop_id").notNull(),
    version: integer("version").notNull().default(1),
    subtotal: integer("subtotal").notNull().default(0),
    descuento: integer("descuento").notNull().default(0),
    impuesto_porcentaje: integer("impuesto_porcentaje").notNull().default(19),
    impuestos: integer("impuestos").notNull().default(0),
    total: integer("total").notNull().default(0),
    estado: text("estado").notNull().default("borrador"),
    validez_dias: integer("validez_dias").notNull().default(15),
    creado_por: text("creado_por").notNull(),
    created_at: text("created_at").notNull(),
    enviada_at: text("enviada_at"),
    decidida_at: text("decidida_at"),
  },
  (t) => ({
    orderIdx: index("idx_estimates_service_order").on(t.service_order_id),
  }),
);

export const estimateItems = sqliteTable(
  "estimate_items",
  {
    id: text("id").primaryKey(),
    estimate_id: text("estimate_id").notNull(),
    tipo: text("tipo").notNull(),
    descripcion: text("descripcion").notNull(),
    cantidad: integer("cantidad").notNull().default(1),
    precio_unitario: integer("precio_unitario").notNull().default(0),
    subtotal: integer("subtotal").notNull().default(0),
    estado: text("estado").notNull().default("pendiente"),
    requiere_autorizacion: integer("requiere_autorizacion", { mode: "boolean" }).default(true),
    criticidad: text("criticidad"),
    alternativa_descripcion: text("alternativa_descripcion"),
    alternativa_precio_unitario: integer("alternativa_precio_unitario"),
    taller_recomienda: text("taller_recomienda"),
  },
  (t) => ({
    estimateIdx: index("idx_estimate_items_estimate").on(t.estimate_id),
  }),
);

export const authorizations = sqliteTable(
  "authorizations",
  {
    id: text("id").primaryKey(),
    estimate_id: text("estimate_id").notNull(),
    service_order_id: text("service_order_id").notNull(),
    workshop_id: text("workshop_id").notNull(),
    version_aceptada: integer("version_aceptada").notNull(),
    decision: text("decision").notNull(),
    estado: text("estado").default("emitida"),
    decided_by: text("decided_by").notNull(),
    decided_by_nombre: text("decided_by_nombre").notNull(),
    monto_aprobado: integer("monto_aprobado").notNull().default(0),
    items_aprobados: text("items_aprobados").notNull().default("[]"),
    items_rechazados: text("items_rechazados").notNull().default("[]"),
    items_postergados: text("items_postergados").default("[]"),
    items_con_alternativa: text("items_con_alternativa").default("[]"),
    created_at: text("created_at").notNull(),
  },
  (t) => ({
    orderIdx: index("idx_authorizations_service_order").on(t.service_order_id),
  }),
);

export const orderMedia = sqliteTable(
  "order_media",
  {
    id: text("id").primaryKey(),
    service_order_id: text("service_order_id").notNull(),
    workshop_id: text("workshop_id").notNull(),
    categoria: text("categoria").notNull(),
    nombre: text("nombre").notNull(),
    url: text("url").notNull(),
    autor_id: text("autor_id"),
    autor_nombre: text("autor_nombre").notNull(),
    visible_cliente: integer("visible_cliente", { mode: "boolean" }).default(true),
    created_at: text("created_at").notNull(),
  },
  (t) => ({
    orderIdx: index("idx_order_media_service_order").on(t.service_order_id),
  }),
);

export const orderEvents = sqliteTable(
  "order_events",
  {
    id: text("id").primaryKey(),
    service_order_id: text("service_order_id").notNull(),
    workshop_id: text("workshop_id").notNull(),
    tipo: text("tipo").notNull(),
    estado_anterior: text("estado_anterior"),
    estado_nuevo: text("estado_nuevo"),
    descripcion: text("descripcion").notNull(),
    actor_id: text("actor_id"),
    actor_nombre: text("actor_nombre").notNull(),
    created_at: text("created_at").notNull(),
  },
  (t) => ({
    orderIdx: index("idx_order_events_service_order").on(t.service_order_id),
  }),
);

export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    service_order_id: text("service_order_id").notNull(),
    workshop_id: text("workshop_id").notNull(),
    remitente_tipo: text("remitente_tipo").notNull(),
    remitente_id: text("remitente_id"),
    remitente_nombre: text("remitente_nombre").notNull(),
    contenido: text("contenido").notNull(),
    leido: integer("leido", { mode: "boolean" }).default(false),
    created_at: text("created_at").notNull(),
  },
  (t) => ({
    orderIdx: index("idx_messages_service_order").on(t.service_order_id),
  }),
);

export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    workshop_id: text("workshop_id"),
    destinatario_tipo: text("destinatario_tipo").notNull(),
    destinatario_id: text("destinatario_id").notNull(),
    tipo: text("tipo").notNull(),
    titulo: text("titulo").notNull(),
    cuerpo: text("cuerpo").notNull(),
    canal: text("canal").notNull().default("in_app"),
    estado: text("estado").notNull().default("pendiente"),
    link: text("link"),
    service_order_id: text("service_order_id"),
    created_at: text("created_at").notNull(),
    leida_at: text("leida_at"),
  },
  (t) => ({
    destinatarioIdx: index("idx_notifications_destinatario").on(t.destinatario_tipo, t.destinatario_id),
  }),
);

export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    workshop_id: text("workshop_id").notNull(),
    plan: text("plan").notNull().default("starter"),
    estado: text("estado").notNull().default("en_prueba"),
    inicio: text("inicio").notNull(),
    fin: text("fin").notNull(),
    created_at: text("created_at").notNull(),
  },
  (t) => ({
    workshopIdx: index("idx_subscriptions_workshop").on(t.workshop_id),
  }),
);

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    workshop_id: text("workshop_id"),
    actor_id: text("actor_id"),
    actor_nombre: text("actor_nombre").notNull(),
    accion: text("accion").notNull(),
    entidad: text("entidad").notNull(),
    entidad_id: text("entidad_id"),
    detalle: text("detalle"),
    created_at: text("created_at").notNull(),
  },
  (t) => ({
    workshopIdx: index("idx_audit_logs_workshop").on(t.workshop_id),
  }),
);

export const invoices = sqliteTable(
  "invoices",
  {
    id: text("id").primaryKey(),
    service_order_id: text("service_order_id").notNull(),
    estimate_id: text("estimate_id").notNull(),
    workshop_id: text("workshop_id").notNull(),
    numero: text("numero").notNull().unique(),
    fecha_emision: text("fecha_emision").notNull(),
    nit_emisor: text("nit_emisor").notNull(),
    nombre_emisor: text("nombre_emisor").notNull(),
    documento_cliente: text("documento_cliente").notNull(),
    nombre_cliente: text("nombre_cliente").notNull(),
    direccion_cliente: text("direccion_cliente"),
    medio_pago: text("medio_pago").notNull(),
    subtotal: integer("subtotal").notNull().default(0),
    descuento: integer("descuento").notNull().default(0),
    impuesto_porcentaje: integer("impuesto_porcentaje").notNull().default(19),
    impuestos: integer("impuestos").notNull().default(0),
    total: integer("total").notNull().default(0),
    cufe: text("cufe").notNull(),
    xml: text("xml").notNull(),
    pdf_url: text("pdf_url").notNull(),
    estado: text("estado").notNull().default("borrador"),
    creado_por: text("creado_por").notNull(),
    created_at: text("created_at").notNull(),
    anulada_at: text("anulada_at"),
    pagada_at: text("pagada_at"),
  },
  (t) => ({
    orderIdx: index("idx_invoices_service_order").on(t.service_order_id),
  }),
);

export const emailVerificationCodes = sqliteTable(
  "email_verification_codes",
  {
    id: text("id").primaryKey(),
    correo: text("correo").notNull(),
    nombre: text("nombre").notNull(),
    code: text("code").notNull(),
    purpose: text("purpose").notNull().default("register"),
    estado: text("estado").notNull().default("pendiente"),
    created_at: text("created_at").notNull(),
    expires_at: text("expires_at").notNull(),
    used_at: text("used_at"),
    attempts: integer("attempts").default(0),
  },
  (t) => ({
    correoIdx: index("idx_email_verification_codes_correo").on(t.correo),
    codeIdx: uniqueIndex("idx_email_verification_codes_code").on(t.code),
    estadoIdx: index("idx_email_verification_codes_estado").on(t.estado),
  }),
);

export const rateLimitEvents = sqliteTable(
  "rate_limit_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    clave: text("clave").notNull(),
    created_at: integer("created_at").notNull(),
  },
  (t) => ({
    claveTiempoIdx: index("idx_rle_clave_tiempo").on(t.clave, t.created_at),
  }),
);
