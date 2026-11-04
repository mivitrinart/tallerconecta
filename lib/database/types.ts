/**
 * Taller Conecta · Tipos del dominio
 * Reflejan la estructura de base de datos del documento (sección 6).
 * En TypeScript usamos los mismos nombres de columna (snake_case) que en SQL
 * para que la migración a Supabase/PostgreSQL sea directa.
 */

// ── Enums / uniones ────────────────────────────────────────────────────────

export type Rol = "platform_admin" | "owner" | "advisor" | "mechanic" | "customer";

/** Los 10 estados que debe manejar una orden (sección 4). */
export type EstadoOrden =
  | "recibido"
  | "en_diagnostico"
  | "esperando_aprobacion"
  | "autorizado"
  | "en_reparacion"
  | "en_espera"
  | "en_pruebas"
  | "listo_entrega"
  | "entregado"
  | "cancelado";

export type EstadoPresupuesto =
  | "borrador"
  | "enviada"
  | "aprobada"
  | "parcialmente_aprobada"
  | "rechazada"
  | "postergada"
  | "superada";

export type EstadoFactura = "borrador" | "emitida" | "anulada" | "pagada";

/**
 * Estado de aprobación por ítem: el sistema distingue qué trabajos están
 * aprobados, cuáles no y cuáles quedaron aplazados ("autorizo solo frenos,
 * no suspensión por ahora").
 */
export type EstadoItem = "pendiente" | "aprobada" | "rechazada" | "postergada";

export type Decision = "aprobar" | "rechazar" | "postergar";

/**
 * Semáforo de criticidad del presupuesto:
 * verde = urgente/seguridad · amarillo = recomendado pronto · rojo = puede esperar.
 */
export type Criticidad = "urgente" | "recomendado" | "puede_esperar";

export type TipoItem = "repuesto" | "mano_obra" | "servicio" | "otro";

export type CategoriaMedia = "antes" | "durante" | "despues" | "documento" | "otro";

export type TipoVehiculo = "carro" | "moto" | "otro";

export type CanalNotificacion = "in_app" | "email" | "whatsapp";

export type EstadoNotificacion = "pendiente" | "enviada" | "leida" | "fallida";

export type PlanSaaS = "starter" | "pro" | "premium";

export type EstadoTaller = "activo" | "suspendido" | "en_prueba";

export type EstadoSuscripcion = "activa" | "en_prueba" | "vencida" | "cancelada";

export type EstadoUsuario = "activo" | "inactivo" | "invitado";

export type TipoEventoOrden =
  | "cambio_estado"
  | "diagnostico"
  | "presupuesto"
  | "autorizacion"
  | "evidencia"
  | "mensaje"
  | "nota"
  | "creacion"
  | "entrega";

// ── Entidades ──────────────────────────────────────────────────────────────

/** workshops: id, nombre, NIT opcional, dirección, teléfono, plan, estado */
export interface Workshop {
  id: string;
  nombre: string;
  nit?: string | null;
  direccion: string;
  telefono: string;
  ciudad: string;
  logo_url?: string | null;
  google_maps_url?: string | null;
  plan: PlanSaaS;
  estado: EstadoTaller;
  /** Token público de inscripción de clientes (enlace de vinculación del taller). */
  enlace_publico?: string | null;
  /** Si el taller acepta ingreso de vehículos nuevos. */
  acepta_vehiculos?: boolean;
  /** Cupos disponibles para recibir vehículos. */
  cupos_disponibles?: number;
  /** Secuencia de números de orden de este taller (ORD-...). */
  secuencia_orden?: number;
  created_at: string;
}

/** users: id, nombre, correo, teléfono, estado */
export interface User {
  id: string;
  nombre: string;
  correo: string;
  telefono: string;
  estado: EstadoUsuario;
  /** URL de foto de perfil (data-URI en demo). */
  avatar_url?: string | null;
  /** Marca el administrador del SaaS (panel /admin). */
  es_admin_plataforma?: boolean;
  /** Versión de sesión: se incrementa al cambiar contraseña o desactivar el usuario para invalidar cookies inmediatamente. */
  session_version?: number;
  /** Hash de contraseña (salt.hash) generado con scrypt. Solo modo demo. */
  password_hash?: string;
  /** SOLO modo demo. En producción la autenticación la maneja Supabase Auth. */
  password_demo?: string;
  /** Indica si el correo ha sido verificado. */
  email_verified?: boolean;
  /** Fecha de verificación del correo. */
  email_verified_at?: string | null;
  created_at: string;
}

/** workshop_members: workshop_id, user_id, rol, permisos */
export interface WorkshopMember {
  id: string;
  workshop_id: string;
  user_id: string;
  rol: Exclude<Rol, "platform_admin" | "customer">;
  permisos: string[];
  activo: boolean;
  created_at: string;
}

/** customers: id, workshop_id, nombre, teléfono, correo */
export interface Customer {
  id: string;
  workshop_id: string;
  nombre: string;
  telefono: string;
  correo: string;
  documento?: string | null;
  /** Token del enlace personal del portal del cliente (acceso seguro). */
  portal_token: string;
  /**
   * Ley 1581 de 2012: momento y origen de la autorización para el tratamiento
   * de datos personales. "taller" = el taller declara tener la autorización;
   * "registro_cliente"/"vinculacion_cuenta" = otorgada directamente en la plataforma.
   */
  consentimiento_datos_at?: string | null;
  consentimiento_origen?: "taller" | "registro_cliente" | "enlace_personal" | "vinculacion_cuenta" | "supresion" | null;
  /** True tras una solicitud de supresión: datos de contacto anonimizados. */
  anonimizado?: boolean;
  /**
   * False cuando el cliente desvinculó la ficha desde su cuenta: su enlace
   * personal queda DESACTIVADO (el panel del taller lo muestra y puede
   * reactivarlo; el cliente lo restaura volviendo a vincular el enlace).
   * Indefinido/true = activo.
   */
  portal_activo?: boolean;
  created_at: string;
}

/** customer_accounts: cuenta personal del cliente (opcional al enlace personal). */
export interface CustomerAccount {
  id: string;
  nombre: string;
  correo: string;
  telefono: string;
  estado: "activo" | "eliminado";
  /** Hash de contraseña (salt.hash) generado con scrypt. Solo modo demo. */
  password_hash?: string;
  /** SOLO modo demo. En producción: Supabase Auth. */
  password_demo?: string;
  /** Ley 1581 de 2012: autorización de tratamiento de datos al registrarse. */
  consentimiento_datos_at: string;
  created_at: string;
  /** Indica si el correo ha sido verificado. */
  email_verified?: boolean;
  /** Fecha de verificación del correo. */
  email_verified_at?: string | null;
}

/** customer_account_links: vincula una cuenta de cliente con sus fichas por taller. */
export interface CustomerAccountLink {
  id: string;
  account_id: string;
  customer_id: string;
  workshop_id: string;
  origen: "email" | "token" | "public";
  estado: "pendiente" | "aceptado" | "rechazado";
  created_at: string;
}

/** email_verification_codes: códigos de verificación temporal por correo */
export interface EmailVerificationCode {
  id: string;
  correo: string;
  nombre: string;
  code: string;
  purpose: "register" | "reset_password";
  estado: "pendiente" | "usado" | "bloqueado" | "fallido";
  created_at: string;
  expires_at: string;
  used_at?: string | null;
  attempts: number;
}

/** vehicles: id, workshop_id, customer_id, placa, tipo, marca, modelo, año, kilometraje */
export interface Vehicle {
  id: string;
  workshop_id: string;
  customer_id: string;
  placa: string;
  tipo: TipoVehiculo;
  marca: string;
  modelo: string;
  anio: number;
  kilometraje: number;
  color?: string | null;
  /**
   *Quién registró el vehículo:
   *  - "taller": el personal del taller (recepción o ficha del cliente).
   *  - "cliente": el propio cliente desde su cuenta → visible en el panel del
   *    taller como información aportada por el cliente.
   */
  origen?: "taller" | "cliente";
  /** Cuenta de cliente que lo registró (solo origen "cliente"). */
  registrado_por_account_id?: string | null;
  /** Retención: último recordatorio automático de mantenimiento enviado. */
  ultimo_recordatorio_mant_at?: string | null;
  created_at: string;
}

/** service_orders: id, workshop_id, customer_id, vehicle_id, número, estado, fechas, responsable */
export interface ServiceOrder {
  id: string;
  workshop_id: string;
  customer_id: string;
  vehicle_id: string;
  numero: string;
  estado: EstadoOrden;
  motivo_ingreso: string;
  sintomas?: string | null;
  fecha_ingreso: string;
  /** Estimación, nunca una promesa. Se muestra como "fecha estimada". */
  fecha_estimada_entrega?: string | null;
  fecha_entrega?: string | null;
  responsable_id?: string | null;
  creado_por: string;
  notas_internas?: string | null;
  valor_final?: number | null;
  calificacion?: number | null;
  calificacion_comentario?: string | null;
  created_at: string;
  updated_at: string;
}

/** diagnostics: id, service_order_id, descripción, recomendaciones, creado_por */
export interface Diagnostic {
  id: string;
  service_order_id: string;
  descripcion: string;
  recomendaciones: string;
  creado_por: string;
  created_at: string;
}

/** estimates: id, service_order_id, versión, subtotal, impuestos, total, estado */
export interface Estimate {
  id: string;
  service_order_id: string;
  workshop_id: string;
  version: number;
  subtotal: number;
  descuento: number;
  impuesto_porcentaje: number;
  impuestos: number;
  total: number;
  estado: EstadoPresupuesto;
  validez_dias: number;
  creado_por: string;
  created_at: string;
  enviada_at?: string | null;
  decidida_at?: string | null;
}

/** estimate_items: id, estimate_id, tipo, descripción, cantidad, precio_unitario */
export interface EstimateItem {
  id: string;
  estimate_id: string;
  tipo: TipoItem;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  /** Aprobación por ítem: distingue trabajos aprobados de pendientes. */
  estado: EstadoItem;
  requiere_autorizacion: boolean;
  /** Semáforo: por qué pagar este trabajo (urgente / recomendado / puede esperar). */
  criticidad?: Criticidad;
  /**
   * Comparativa original/homologado: alternativa más económica para el mismo
   * trabajo. El cliente decide con poder real de elección.
   */
  alternativa_descripcion?: string | null;
  alternativa_precio_unitario?: number | null;
  /** Cuál opción recomienda el taller. */
  taller_recomienda?: "principal" | "alternativa" | null;
}

/** authorizations: id, estimate_id, decisión, usuario, fecha, versión aceptada */
export interface Authorization {
  id: string;
  estimate_id: string;
  service_order_id: string;
  workshop_id: string;
  version_aceptada: number;
  decision: "aprobada_parcial" | "aprobada_total" | "rechazada" | "postergada";
  /** Estado de la autorización (pendiente/emitida/anulada). */
  estado?: "pendiente" | "emitida" | "anulada";
  decided_by: string;
  decided_by_nombre: string;
  monto_aprobado: number;
  items_aprobados: string[];
  items_rechazados: string[];
  /** Trabajos que el cliente aplazó ("por ahora no"): no bloquean la reparación de lo aprobado. */
  items_postergados?: string[];
  /** Ítems aprobados eligiendo la alternativa (homologado) en vez del principal (original). */
  items_con_alternativa?: string[];
  created_at: string;
}

/** facturas: factura electrónica DIAN (Colombia) generada desde un presupuesto autorizado. */
export interface Invoice {
  id: string;
  service_order_id: string;
  estimate_id: string;
  workshop_id: string;
  /** Prefijo + número consecutivo (ej: FAC-000123). */
  numero: string;
  /** Fecha y hora de emisión. */
  fecha_emision: string;
  /** NIT del emisor (taller). */
  nit_emisor: string;
  /** Nombre del emisor. */
  nombre_emisor: string;
  /** Documento del cliente (NIT/CC/CE). */
  documento_cliente: string;
  /** Nombre del cliente. */
  nombre_cliente: string;
  /** Dirección del cliente. */
  direccion_cliente?: string | null;
  /** Medio de pago: efectivo, transferencia, tarjeta, etc. */
  medio_pago: string;
  /** Subtotal antes de impuestos. */
  subtotal: number;
  /** Descuento aplicado. */
  descuento: number;
  /** Porcentaje de IVA (19% por defecto en Colombia). */
  impuesto_porcentaje: number;
  /** Valor del IVA. */
  impuestos: number;
  /** Total a pagar. */
  total: number;
  /** CUFE: hash criptográfico SHA384 que identifica la factura ante la DIAN. */
  cufe: string;
  /** XML de la factura electrónica (DIAN). */
  xml: string;
  /** URL del PDF (demo: data-URI; producción: Supabase Storage). */
  pdf_url: string;
  estado: EstadoFactura;
  creado_por: string;
  created_at: string;
  anulada_at?: string | null;
  pagada_at?: string | null;
}

/** order_media: id, service_order_id, archivo, categoría, autor, fecha */
export interface OrderMedia {
  id: string;
  service_order_id: string;
  workshop_id: string;
  categoria: CategoriaMedia;
  nombre: string;
  /** En demo: data-URI SVG. En producción: ruta privada de Supabase Storage. */
  url: string;
  autor_id?: string | null;
  autor_nombre: string;
  visible_cliente: boolean;
  created_at: string;
}

/** order_events: id, service_order_id, estado_anterior, estado_nuevo, usuario, fecha */
export interface OrderEvent {
  id: string;
  service_order_id: string;
  workshop_id: string;
  tipo: TipoEventoOrden;
  estado_anterior?: EstadoOrden | null;
  estado_nuevo?: EstadoOrden | null;
  descripcion: string;
  actor_id?: string | null;
  actor_nombre: string;
  created_at: string;
}

/** messages: id, service_order_id, remitente, contenido, fecha, leído */
export interface Message {
  id: string;
  service_order_id: string;
  workshop_id: string;
  remitente_tipo: "staff" | "customer";
  remitente_id?: string | null;
  remitente_nombre: string;
  contenido: string;
  leido: boolean;
  created_at: string;
}

/** notifications: id, user_id, tipo, estado, fecha, canal */
export interface Notification {
  id: string;
  workshop_id?: string | null;
  destinatario_tipo: "user" | "customer";
  destinatario_id: string;
  tipo: string;
  titulo: string;
  cuerpo: string;
  canal: CanalNotificacion;
  estado: EstadoNotificacion;
  link?: string | null;
  service_order_id?: string | null;
  created_at: string;
  leida_at?: string | null;
}

/** subscriptions: id, workshop_id, plan, estado, vigencia */
export interface Subscription {
  id: string;
  workshop_id: string;
  plan: PlanSaaS;
  estado: EstadoSuscripcion;
  inicio: string;
  fin: string;
  created_at: string;
}

/** audit_logs: id, workshop_id, actor, acción, entidad, fecha */
export interface AuditLog {
  id: string;
  workshop_id?: string | null;
  actor_id?: string | null;
  actor_nombre: string;
  accion: string;
  entidad: string;
  entidad_id?: string | null;
  detalle?: Record<string, unknown> | null;
  created_at: string;
}

// ── Base de datos completa (modo demo) ─────────────────────────────────────

export interface Database {
  meta: { version: number; seeded_at: string };
  workshops: Workshop[];
  users: User[];
  workshop_members: WorkshopMember[];
  customers: Customer[];
  customer_accounts: CustomerAccount[];
  customer_account_links: CustomerAccountLink[];
  vehicles: Vehicle[];
  service_orders: ServiceOrder[];
  diagnostics: Diagnostic[];
  estimates: Estimate[];
  estimate_items: EstimateItem[];
  authorizations: Authorization[];
  order_media: OrderMedia[];
  order_events: OrderEvent[];
  messages: Message[];
  notifications: Notification[];
  subscriptions: Subscription[];
  audit_logs: AuditLog[];
  /** Contador para números de orden legibles (ORD-1048…). */
  secuencia_orden: number;
  /** Contador para números de factura legibles (FAC-000123…). */
  secuencia_factura: number;
  invoices: Invoice[];
  /** Códigos de verificación de correo electrónico */
  email_verification_codes: EmailVerificationCode[];
}

// ── Vistas enriquecidas (joins que arma la capa de datos) ──────────────────

export interface OrderWithRelations extends ServiceOrder {
  customer: Customer;
  vehicle: Vehicle;
  responsable?: User | null;
  latest_estimate?: Estimate | null;
  estimates: Estimate[];
  unread_messages: number;
}

export interface SessionUser {
  user_id: string;
  nombre: string;
  correo: string;
  rol: Rol;
  workshop_id?: string | null;
  workshop_nombre?: string | null;
  session_version?: number;
}
