/** Esquemas de validación (zod) para todas las mutaciones de la API. */
import { z } from "zod";

export const loginSchema = z.object({
  correo: z.string().email("Correo inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

export const customerSchema = z.object({
  nombre: z.string().min(3, "Nombre muy corto").max(120),
  telefono: z.string().min(7, "Teléfono inválido").max(20),
  correo: z.string().email("Correo inválido").max(120),
  documento: z.string().max(20).optional().or(z.literal("")),
});

export const vehicleSchema = z.object({
  customer_id: z.string().min(1).optional(),
  placa: z.string().min(4, "Placa inválida").max(10),
  tipo: z.enum(["carro", "moto", "otro"]),
  marca: z.string().min(2).max(60),
  modelo: z.string().min(1).max(60),
  anio: z.number().int().min(1950).max(new Date().getFullYear() + 2),
  kilometraje: z.number().int().min(0).max(2_000_000),
  color: z.string().max(30).optional().or(z.literal("")),
});

export const orderCreateSchema = z.object({
  customer_id: z.string().min(1).optional(),
  new_customer: customerSchema.optional(),
  vehicle_id: z.string().min(1).optional(),
  new_vehicle: vehicleSchema.optional(),
  motivo_ingreso: z.string().min(5, "Describe el motivo de ingreso").max(300),
  sintomas: z.string().max(1000).optional().or(z.literal("")),
  kilometraje: z.number().int().min(0).optional(),
  fecha_estimada_entrega: z.string().optional().or(z.literal("")),
  responsable_id: z.string().optional().or(z.literal("")),
  notas_internas: z.string().max(2000).optional().or(z.literal("")),
}).refine(
  (v) => Boolean(v.customer_id || v.new_customer),
  { message: "Debes seleccionar o crear un cliente", path: ["customer_id"] }
).refine(
  (v) => Boolean(v.vehicle_id || v.new_vehicle),
  { message: "Debes seleccionar o crear un vehículo", path: ["vehicle_id"] }
);

export const ESTADOS_ORDEN = [
  "recibido", "en_diagnostico", "esperando_aprobacion", "autorizado",
  "en_reparacion", "en_espera", "en_pruebas", "listo_entrega", "entregado", "cancelado",
] as const;

export const statusChangeSchema = z.object({
  estado: z.enum(ESTADOS_ORDEN),
  motivo: z.string().max(500).optional().or(z.literal("")),
  nota: z.string().max(500).optional().or(z.literal("")),
});

export const assignSchema = z.object({
  responsable_id: z.string().min(1),
});

export const diagnosticSchema = z.object({
  descripcion: z.string().min(10, "Describe los hallazgos").max(4000),
  recomendaciones: z.string().min(5, "Incluye las recomendaciones").max(4000),
});

export const estimateItemSchema = z.object({
  tipo: z.enum(["repuesto", "mano_obra", "servicio", "otro"]),
  descripcion: z.string().min(3).max(300),
  cantidad: z.number().positive().max(999),
  precio_unitario: z.number().int().min(0).max(100_000_000),
  /** Semáforo de criticidad (verde/amarillo/rojo). */
  criticidad: z.enum(["urgente", "recomendado", "puede_esperar"]).default("recomendado"),
  /** Comparativa original/homologado (opcional). */
  alternativa_descripcion: z.string().max(300).optional().or(z.literal("")),
  alternativa_precio_unitario: z.number().int().min(0).max(100_000_000).optional().nullable(),
  taller_recomienda: z.enum(["principal", "alternativa"]).optional().nullable(),
});

export const estimateCreateSchema = z.object({
  service_order_id: z.string().min(1),
  items: z.array(estimateItemSchema).min(1, "Agrega al menos un ítem").max(60),
  descuento: z.number().int().min(0).default(0),
  impuesto_porcentaje: z.number().min(0).max(100).default(19),
  validez_dias: z.number().int().min(1).max(90).default(15),
});

export const decisionSchema = z.object({
  decisiones: z
    .array(
      z.object({
        item_id: z.string().min(1),
        decision: z.enum(["aprobar", "rechazar", "postergar"]),
        /** Si el ítem tiene comparativa, qué opción aprueba el cliente. */
        opcion: z.enum(["principal", "alternativa"]).optional(),
      })
    )
    .min(1, "Marca al menos un trabajo"),
  comentario: z.string().max(1000).optional().or(z.literal("")),
});

export const reminderSchema = z.object({
  vehicle_id: z.string().min(1),
});

export const firmaSchema = z.object({
  token: z.string().min(1),
  order_id: z.string().min(1),
  /** PNG en data-URI dibujado por el cliente en el portal. */
  firma: z.string().startsWith("data:image/png;base64,", "Formato de firma inválido").max(700_000, "Firma demasiado grande"),
});

export const resumenSchema = z.object({
  token: z.string().min(1),
  order_id: z.string().min(1),
});

export const messageSchema = z.object({
  contenido: z.string().min(1, "Escribe un mensaje").max(2000),
});

export const mediaSchema = z.object({
  categoria: z.enum(["antes", "durante", "despues", "documento", "otro"]),
  nombre: z.string().min(2).max(140),
  /** Data-URI (demo) o ruta de Supabase Storage (producción). Solo tipos seguros. */
  url: z.string().min(10).max(2_000_000, "Archivo demasiado grande (máx. 2 MB)"),
  visible_cliente: z.boolean().default(true),
});

export const deliverSchema = z.object({
  valor_final: z.number().int().min(0, "Valor inválido"),
  nota: z.string().max(500).optional().or(z.literal("")),
});

export const invoiceCreateSchema = z.object({
  estimate_id: z.string().min(1, "Presupuesto requerido"),
  /** Medio de pago: efectivo, transferencia, tarjeta, etc. */
  medio_pago: z.enum(["efectivo", "transferencia", "tarjeta", "otro"]),
  /** Documento del cliente (NIT/CC/CE). Si se omite, usa el del cliente de la orden. */
  documento_cliente: z.string().min(3, "Documento del cliente requerido").max(20).optional(),
  /** Nombre del cliente. Si se omite, usa el del cliente de la orden. */
  nombre_cliente: z.string().min(3, "Nombre del cliente requerido").max(120).optional(),
  /** Dirección del cliente. */
  direccion_cliente: z.string().max(200).optional().or(z.literal("")),
});

export const ratingSchema = z.object({
  calificacion: z.number().int().min(1).max(5),
  comentario: z.string().max(1000).optional().or(z.literal("")),
});

export const registroSchema = z.object({
  taller_nombre: z.string().min(3, "Nombre muy corto").max(120),
  ciudad: z.string().min(2).max(80),
  telefono: z.string().min(1, "Teléfono inválido").max(20).regex(/^\+57[0-9]{7,15}$/, "Teléfono inválido: usa +57 seguido de tu número (solo dígitos)"),
  nit: z.string().max(20).optional().or(z.literal("")),
  nombre: z.string().min(3).max(120),
  correo: z.string().email("Correo inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres").max(72),
  acepta_terminos: z.literal(true, {
    message: "Debes aceptar los términos y la política de tratamiento de datos",
  }),
});

const DOMINIOS_EMAIL_PERMITIDOS = [
  "gmail.com",
  "outlook.com",
  "hotmail.com",
  "yahoo.com",
  "yahoo.es",
  "icloud.com",
  "live.com",
  "msn.com",
  "protonmail.com",
  "gmx.com",
];

function dominioPermitido(correo: string): boolean {
  const dominio = correo.split("@")[1]?.toLowerCase();
  return Boolean(dominio && DOMINIOS_EMAIL_PERMITIDOS.includes(dominio));
}

// ── Cuentas de cliente ─────────────────────────────────────────────────────

export const customerAccountRegisterSchema = z.object({
  nombre: z.string().min(3, "Nombre muy corto").max(120),
  correo: z
    .string()
    .email("Correo inválido")
    .refine(dominioPermitido, {
      message: "Usa un correo de un proveedor válido (Gmail, Outlook, Yahoo, iCloud, etc.).",
    }),
  telefono: z
    .string()
    .min(1, "Teléfono inválido")
    .max(20)
    .regex(/^\+57[0-9]{7,15}$/, "Teléfono inválido: usa +57 seguido de tu número (solo dígitos)"),
  password: z.string().min(8, "Mínimo 8 caracteres").max(72),
  acepta_terminos: z.literal(true, {
    message: "Debes autorizar el tratamiento de datos y aceptar los términos",
  }),
});

export const accountProfileSchema = z.object({
  nombre: z.string().min(3).max(120).optional(),
  telefono: z.string().min(7).max(20).optional(),
});

export const usuarioPerfilSchema = z.object({
  nombre: z.string().min(3, "Nombre muy corto").max(120).optional(),
  /** data-URI en demo o URL en producción. Máx. 500 KB. */
  avatar_url: z.string().max(500_000, "Imagen demasiado grande (máx. 500 KB)").optional().or(z.literal("")),
});

export const linkTokenSchema = z.object({
  token: z.string().min(4, "Enlace inválido"),
});

export const unlinkSchema = z.object({
  customer_id: z.string().min(1),
});

// ── Vehículos registrados por el cliente desde su cuenta ───────────────────

export const cuentaVehicleSchema = z.object({
  /** Ficha (customer) vinculada a la cuenta bajo la cual se registra. */
  customer_id: z.string().min(1, "Selecciona en cuál de tus fichas lo vas a registrar"),
  placa: z.string().min(4, "Placa inválida").max(10),
  tipo: z.enum(["carro", "moto", "otro"]),
  marca: z.string().min(2, "Marca inválida").max(60),
  modelo: z.string().min(1, "Modelo inválido").max(60),
  anio: z.number().int().min(1950).max(new Date().getFullYear() + 2),
  kilometraje: z.number().int().min(0).max(2_000_000),
  color: z.string().max(30).optional().or(z.literal("")),
});

export const cuentaVehicleUpdateSchema = cuentaVehicleSchema.omit({ customer_id: true }).partial();

// ── Semáforo de criticidad (solo editable en borrador) ─────────────────────

export const criticidadSchema = z.object({
  criticidad: z.enum(["urgente", "recomendado", "puede_esperar"], {
    message: "Criticidad inválida",
  }),
});

export const workshopUpdateSchema = z.object({
  nombre: z.string().min(3).max(120).optional(),
  direccion: z.string().max(200).optional(),
  ciudad: z.string().max(80).optional(),
  telefono: z.string().max(20).optional(),
  nit: z.string().max(20).optional().or(z.literal("")),
  /** data-URI en demo o URL en producción. Máx. 500 KB. */
  logo_url: z.string().max(500_000, "Imagen demasiado grande (máx. 500 KB)").optional().or(z.literal("")),
  /** Solo esquemas https. */
  google_maps_url: z.string().url().startsWith("https://", "Solo se permiten URLs https").optional().or(z.literal("")),
});

export const memberInviteSchema = z.object({
  nombre: z.string().min(3).max(120),
  correo: z.string().email(),
  telefono: z.string().min(7).max(20),
  rol: z.enum(["owner", "advisor", "mechanic"]),
  /** Contraseña inicial definida por el taller; si se omite, se genera una temporal. */
  password: z.string().min(8, "Mínimo 8 caracteres").max(72).optional().or(z.literal("")),
});

export const memberPasswordSchema = z.object({
  password: z.string().min(8, "Mínimo 8 caracteres").max(72).optional().or(z.literal("")),
});

export const memberRoleSchema = z.object({
  rol: z.enum(["owner", "advisor", "mechanic"]),
  activo: z.boolean().optional(),
});

export const adminWorkshopSchema = z.object({
  estado: z.enum(["activo", "suspendido", "en_prueba"]).optional(),
  plan: z.enum(["starter", "pro", "premium"]).optional(),
});

export const adminSubscriptionSchema = z.object({
  plan: z.enum(["starter", "pro", "premium"]).optional(),
  estado: z.enum(["activa", "en_prueba", "vencida", "cancelada"]).optional(),
});

export type OrderCreateInput = z.infer<typeof orderCreateSchema>;
export type EstimateCreateInput = z.infer<typeof estimateCreateSchema>;
export type InvoiceCreateInput = z.infer<typeof invoiceCreateSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type VehicleInput = z.infer<typeof vehicleSchema>;
export type RegistroInput = z.infer<typeof registroSchema>;
