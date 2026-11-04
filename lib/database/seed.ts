/**
 * Datos de demostración (modo demo, sin servidor).
 * Todos los datos, cifras y vehículos son ficticios.
 * Las fechas se generan relativas a "hoy" para que la demo siempre se vea viva.
 */
import type {
  AuditLog,
  Authorization,
  Criticidad,
  Customer,
  Database,
  Diagnostic,
  Estimate,
  EstimateItem,
  Message,
  Notification,
  OrderEvent,
  OrderMedia,
  ServiceOrder,
  Subscription,
  TipoItem,
  User,
  Vehicle,
  Workshop,
  WorkshopMember,
  EstadoOrden,
  CategoriaMedia,
  Invoice,
} from "./types";
import { hashPassword } from "../auth/password";

// ── Utilidades de fecha ────────────────────────────────────────────────────

const DAY = 86_400_000;

function diasAgo(dias: number, hora = 9, minuto = 0): string {
  const d = new Date(Date.now() - dias * DAY);
  d.setHours(hora, minuto, 0, 0);
  return d.toISOString();
}

function diasDesdeAhora(dias: number, hora = 17): string {
  const d = new Date(Date.now() + dias * DAY);
  d.setHours(hora, 0, 0, 0);
  return d.toISOString();
}

/** Fotografía ficticia (SVG embebido) para las evidencias del modo demo. */
function fotoSvg(titulo: string, c1: string, c2: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>` +
    `</linearGradient></defs>` +
    `<rect width="640" height="420" fill="url(#g)"/>` +
    `<g stroke="rgba(255,255,255,0.55)" stroke-width="4" fill="none" stroke-linecap="round">` +
    `<path d="M170 290h300M200 290l30-60q8-14 24-14h132q16 0 24 14l30 60"/>` +
    `<circle cx="235" cy="292" r="26"/><circle cx="405" cy="292" r="26"/>` +
    `<path d="M252 216h136"/>` +
    `</g>` +
    `<rect x="0" y="360" width="640" height="60" fill="rgba(0,0,0,0.28)"/>` +
    `<text x="320" y="398" font-family="Arial, sans-serif" font-size="24" fill="#fff" text-anchor="middle">${titulo}</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const FOTOS = {
  antes: fotoSvg("Evidencia · ANTES", "#475569", "#1e293b"),
  antes2: fotoSvg("Recepción · daño visible", "#57534e", "#292524"),
  durante: fotoSvg("Evidencia · DURANTE", "#1d4ed8", "#172554"),
  durante2: fotoSvg("Repuesto desmontado", "#0369a1", "#082f49"),
  despues: fotoSvg("Evidencia · DESPUÉS", "#059669", "#064e3b"),
  documento: fotoSvg("Documento · Orden firmada", "#7c3aed", "#2e1065"),
};

// ── Helpers de construcción ────────────────────────────────────────────────

let n = 0;
const nid = (prefijo: string) => `${prefijo}_${(++n).toString(36)}_seed`;

function dinero(items: { cantidad: number; precio_unitario: number }[], descuento = 0, pct = 19) {
  const subtotalBruto = items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0);
  const subtotal = Math.max(0, subtotalBruto - descuento);
  const impuestos = Math.round(subtotal * (pct / 100));
  return { subtotal, impuestos, total: subtotal + impuestos };
}

// ── Seed ───────────────────────────────────────────────────────────────────

export function buildSeed(): Database {
  n = 0;

  const workshops: Workshop[] = [
    {
      id: "ws_motorx",
      nombre: "Taller MotorX",
      nit: "901.234.567-8",
      direccion: "Carrera 68 # 25-40",
      ciudad: "Bogotá",
      telefono: "+57 601 742 8890",
      logo_url: "/logos/motorx.png",
      google_maps_url: "https://www.google.com/maps/search/?api=1&query=Carrera+68+%23+25-40+Bogot%C3%A1",
      plan: "pro",
      estado: "activo",
      enlace_publico: "pub_motorx_2026",
      acepta_vehiculos: true,
      cupos_disponibles: 3,
      created_at: diasAgo(220),
    },
    {
      id: "ws_autosur",
      nombre: "AutoSur Mecánica",
      nit: "900.987.654-1",
      direccion: "Av. 3N # 44-12",
      ciudad: "Cali",
      telefono: "+57 602 486 1122",
      logo_url: "/logos/autosur.png",
      google_maps_url: "https://www.google.com/maps/search/?api=1&query=Av.+3N+%23+44-12+Cali",
      plan: "starter",
      estado: "en_prueba",
      enlace_publico: "pub_autosur_2026",
      acepta_vehiculos: true,
      cupos_disponibles: 0,
      created_at: diasAgo(6),
    },
  ];

  const users: User[] = [
    { id: "usr_admin", nombre: "Alejandra Botero", correo: "admin@tallerconecta.co", telefono: "+57 300 111 2233", estado: "activo", es_admin_plataforma: true, password_hash: hashPassword("taller123"), session_version: 0, created_at: diasAgo(400) },
    { id: "usr_carlos", nombre: "Carlos Mejía", correo: "carlos@motorx.co", telefono: "+57 310 456 7890", estado: "activo", password_hash: hashPassword("taller123"), session_version: 0, created_at: diasAgo(220) },
    { id: "usr_ana", nombre: "Ana Ríos", correo: "ana@motorx.co", telefono: "+57 312 998 7766", estado: "activo", password_hash: hashPassword("taller123"), session_version: 0, created_at: diasAgo(200) },
    { id: "usr_luis", nombre: "Luis Pardo", correo: "luis@motorx.co", telefono: "+57 318 334 5521", estado: "activo", password_hash: hashPassword("taller123"), session_version: 0, created_at: diasAgo(180) },
    { id: "usr_pedro", nombre: "Pedro Salas", correo: "pedro@motorx.co", telefono: "+57 320 774 1188", estado: "activo", password_hash: hashPassword("taller123"), session_version: 0, created_at: diasAgo(90) },
    { id: "usr_diana", nombre: "Diana Cruz", correo: "diana@autosur.co", telefono: "+57 315 662 9090", estado: "activo", password_hash: hashPassword("taller123"), session_version: 0, created_at: diasAgo(6) },
  ];

  const workshop_members: WorkshopMember[] = [
    { id: nid("wmem"), workshop_id: "ws_motorx", user_id: "usr_carlos", rol: "owner", permisos: ["*"], activo: true, created_at: diasAgo(220) },
    { id: nid("wmem"), workshop_id: "ws_motorx", user_id: "usr_ana", rol: "advisor", permisos: ["*"], activo: true, created_at: diasAgo(200) },
    { id: nid("wmem"), workshop_id: "ws_motorx", user_id: "usr_luis", rol: "mechanic", permisos: ["orders.view_assigned", "orders.update_progress", "media.upload", "messages.reply"], activo: true, created_at: diasAgo(180) },
    { id: nid("wmem"), workshop_id: "ws_motorx", user_id: "usr_pedro", rol: "mechanic", permisos: ["orders.view_assigned", "orders.update_progress", "media.upload", "messages.reply"], activo: true, created_at: diasAgo(90) },
    { id: nid("wmem"), workshop_id: "ws_autosur", user_id: "usr_diana", rol: "owner", permisos: ["*"], activo: true, created_at: diasAgo(6) },
  ];

  const customers: Customer[] = [
    { id: "cust_maria", workshop_id: "ws_motorx", nombre: "María Gómez", telefono: "+57 310 555 4821", correo: "maria.gomez@example.co", documento: "52.444.812", portal_token: "tok_maria_demo", consentimiento_datos_at: diasAgo(300), consentimiento_origen: "taller", anonimizado: false, created_at: diasAgo(300) },
    { id: "cust_jorge", workshop_id: "ws_motorx", nombre: "Jorge Peña", telefono: "+57 315 222 9074", correo: "jorge.pena@example.co", documento: "79.887.201", portal_token: "tok_jorge_demo", consentimiento_datos_at: diasAgo(210), consentimiento_origen: "taller", anonimizado: false, created_at: diasAgo(210) },
    { id: "cust_laura", workshop_id: "ws_motorx", nombre: "Laura Torres", telefono: "+57 311 765 3322", correo: "laura.torres@example.co", documento: "1.020.334.987", portal_token: "tok_laura_demo", created_at: diasAgo(260) },
    { id: "cust_andres", workshop_id: "ws_motorx", nombre: "Andrés Castaño", telefono: "+57 318 442 6675", correo: "andres.castano@example.co", documento: "80.112.445", portal_token: "tok_andres_demo", created_at: diasAgo(150) },
    { id: "cust_diana_r", workshop_id: "ws_motorx", nombre: "Diana Rivas", telefono: "+57 313 208 9911", correo: "diana.rivas@example.co", documento: "52.998.120", portal_token: "tok_dianarivas_demo", created_at: diasAgo(120) },
    { id: "cust_felipe", workshop_id: "ws_motorx", nombre: "Felipe Rojas", telefono: "+57 316 908 4477", correo: "felipe.rojas@example.co", documento: "79.445.230", portal_token: "tok_felipe_demo", created_at: diasAgo(400) },
    { id: "cust_sofia", workshop_id: "ws_motorx", nombre: "Sofía Medina", telefono: "+57 322 118 3364", correo: "sofia.medina@example.co", documento: "1.030.662.118", portal_token: "tok_sofia_demo", created_at: diasAgo(80) },
    { id: "cust_hugo", workshop_id: "ws_motorx", nombre: "Hugo Ramírez", telefono: "+57 317 665 2020", correo: "hugo.ramirez@example.co", documento: "19.222.875", portal_token: "tok_hugo_demo", created_at: diasAgo(500) },
    { id: "cust_carolina", workshop_id: "ws_motorx", nombre: "Carolina Muñoz", telefono: "+57 301 234 8890", correo: "carolina.munoz@example.co", documento: "1.018.774.229", portal_token: "tok_carolina_demo", created_at: diasAgo(60) },
    { id: "cust_eduardo", workshop_id: "ws_motorx", nombre: "Eduardo Silva", telefono: "+57 320 993 1182", correo: "eduardo.silva@example.co", documento: "80.774.129", portal_token: "tok_eduardo_demo", created_at: diasAgo(0, 8, 10) },
    { id: "cust_valeria", workshop_id: "ws_motorx", nombre: "Valeria Ospina", telefono: "+57 314 771 9080", correo: "valeria.ospina@example.co", documento: "43.992.016", portal_token: "tok_valeria_demo", created_at: diasAgo(190) },
    { id: "cust_ricardo", workshop_id: "ws_motorx", nombre: "Ricardo Loaiza", telefono: "+57 319 220 4455", correo: "ricardo.loaiza@example.co", documento: "71.338.902", portal_token: "tok_ricardo_demo", created_at: diasAgo(340) },
    { id: "cust_camila", workshop_id: "ws_motorx", nombre: "Camila Duarte", telefono: "+57 312 665 3390", correo: "camila.duarte@example.co", documento: "1.014.228.553", portal_token: "tok_camila_demo", created_at: diasAgo(100) },
    { id: "cust_santiago", workshop_id: "ws_motorx", nombre: "Santiago Parra", telefono: "+57 321 447 8823", correo: "santiago.parra@example.co", documento: "80.226.714", portal_token: "tok_santiago_demo", created_at: diasAgo(45) },
    { id: "cust_mauricio", workshop_id: "ws_motorx", nombre: "Mauricio Vélez", telefono: "+57 310 887 2214", correo: "mauricio.velez@example.co", documento: "98.112.003", portal_token: "tok_mauricio_demo", created_at: diasAgo(280) },
    { id: "cust_juanita", workshop_id: "ws_motorx", nombre: "Juanita Roldán", telefono: "+57 314 990 5512", correo: "juanita.roldan@example.co", documento: "52.771.440", portal_token: "tok_juanita_demo", created_at: diasAgo(31) },
    { id: "cust_gloria", workshop_id: "ws_motorx", nombre: "Gloria Arbeláez", telefono: "+57 311 445 9020", correo: "gloria.arbelaez@example.co", documento: "41.882.330", portal_token: "tok_gloria_demo", consentimiento_datos_at: diasAgo(420), consentimiento_origen: "taller", anonimizado: false, created_at: diasAgo(420) },
    { id: "cust_ignacio", workshop_id: "ws_motorx", nombre: "Ignacio Lozano", telefono: "+57 318 220 4477", correo: "ignacio.lozano@example.co", documento: "17.338.902", portal_token: "tok_ignacio_demo", consentimiento_datos_at: diasAgo(380), consentimiento_origen: "taller", anonimizado: false, created_at: diasAgo(380) },
    { id: "cust_autosur_1", workshop_id: "ws_autosur", nombre: "Óscar Henao", telefono: "+57 315 220 1134", correo: "oscar.henao@example.co", documento: "94.221.876", portal_token: "tok_oscar_demo", created_at: diasAgo(4) },
  ];

  for (const c of customers) c.portal_activo = true;

  const vehicles: Vehicle[] = [
    { id: "veh_mazda3", workshop_id: "ws_motorx", customer_id: "cust_maria", placa: "ABC-456", tipo: "carro", marca: "Mazda", modelo: "3", anio: 2019, kilometraje: 62300, color: "Rojo", origen: "taller", registrado_por_account_id: null, created_at: diasAgo(300) },
    // Vehículo registrado por la propia cliente desde su cuenta (visible en el panel del taller)
    { id: "veh_twingo_maria", workshop_id: "ws_motorx", customer_id: "cust_maria", placa: "HQR-210", tipo: "carro", marca: "Renault", modelo: "Twingo", anio: 2017, kilometraje: 98400, color: "Verde", origen: "cliente", registrado_por_account_id: "acc_maria", created_at: diasAgo(18) },
    { id: "veh_fz", workshop_id: "ws_motorx", customer_id: "cust_jorge", placa: "BFD-87E", tipo: "moto", marca: "Yamaha", modelo: "FZ 2.0", anio: 2021, kilometraje: 18450, color: "Negro", origen: "taller", registrado_por_account_id: null, created_at: diasAgo(210) },
    { id: "veh_versa", workshop_id: "ws_motorx", customer_id: "cust_laura", placa: "DEF-123", tipo: "carro", marca: "Nissan", modelo: "Versa", anio: 2020, kilometraje: 51880, color: "Blanco", origen: "taller", registrado_por_account_id: null, created_at: diasAgo(260) },
    { id: "veh_spark", workshop_id: "ws_motorx", customer_id: "cust_andres", placa: "GHI-789", tipo: "carro", marca: "Chevrolet", modelo: "Spark GT", anio: 2018, kilometraje: 74220, color: "Gris", origen: "taller", registrado_por_account_id: null, created_at: diasAgo(150) },
    { id: "veh_duster", workshop_id: "ws_motorx", customer_id: "cust_diana_r", placa: "JKL-321", tipo: "carro", marca: "Renault", modelo: "Duster", anio: 2021, kilometraje: 45100, color: "Plateado", origen: "taller", registrado_por_account_id: null, created_at: diasAgo(120) },
    { id: "veh_hilux", workshop_id: "ws_motorx", customer_id: "cust_felipe", placa: "MNO-654", tipo: "carro", marca: "Toyota", modelo: "Hilux", anio: 2020, kilometraje: 96350, color: "Blanco", origen: "taller", registrado_por_account_id: null, created_at: diasAgo(400) },
    { id: "veh_picanto", workshop_id: "ws_motorx", customer_id: "cust_sofia", placa: "PQR-987", tipo: "carro", marca: "Kia", modelo: "Picanto", anio: 2022, kilometraje: 23700, color: "Amarillo", origen: "taller", registrado_por_account_id: null, created_at: diasAgo(80) },
    { id: "veh_golf", workshop_id: "ws_motorx", customer_id: "cust_hugo", placa: "STU-147", tipo: "carro", marca: "Volkswagen", modelo: "Golf", anio: 2017, kilometraje: 88240, color: "Azul", origen: "taller", registrado_por_account_id: null, created_at: diasAgo(500) },
    { id: "veh_cb125", workshop_id: "ws_motorx", customer_id: "cust_carolina", placa: "VKD-22C", tipo: "moto", marca: "Honda", modelo: "CB125F", anio: 2022, kilometraje: 12900, color: "Rojo", origen: "taller", registrado_por_account_id: null, created_at: diasAgo(60) },
    { id: "veh_ranger", workshop_id: "ws_motorx", customer_id: "cust_eduardo", placa: "WXD-88F", tipo: "carro", marca: "Ford", modelo: "Ranger", anio: 2023, kilometraje: 31450, color: "Negro", origen: "taller", registrado_por_account_id: null, created_at: diasAgo(0, 8, 10) },
    { id: "veh_sandero", workshop_id: "ws_motorx", customer_id: "cust_valeria", placa: "YBC-556", tipo: "carro", marca: "Renault", modelo: "Sandero", anio: 2019, kilometraje: 58700, color: "Gris", origen: "taller", registrado_por_account_id: null, created_at: diasAgo(190) },
    { id: "veh_sail", workshop_id: "ws_motorx", customer_id: "cust_ricardo", placa: "ZDE-778", tipo: "carro", marca: "Chevrolet", modelo: "Sail", anio: 2018, kilometraje: 79990, color: "Plata", origen: "taller", registrado_por_account_id: null, created_at: diasAgo(340) },
    { id: "veh_swift", workshop_id: "ws_motorx", customer_id: "cust_camila", placa: "EFG-234", tipo: "carro", marca: "Suzuki", modelo: "Swift", anio: 2021, kilometraje: 38120, color: "Blanco", origen: "taller", registrado_por_account_id: null, created_at: diasAgo(100) },
    { id: "veh_logan", workshop_id: "ws_motorx", customer_id: "cust_santiago", placa: "HIJ-567", tipo: "carro", marca: "Renault", modelo: "Logan", anio: 2020, kilometraje: 61230, color: "Café", origen: "taller", registrado_por_account_id: null, created_at: diasAgo(45) },
    { id: "veh_frontier", workshop_id: "ws_motorx", customer_id: "cust_mauricio", placa: "KLM-890", tipo: "carro", marca: "Nissan", modelo: "Frontier", anio: 2019, kilometraje: 104500, color: "Verde", origen: "taller", registrado_por_account_id: null, created_at: diasAgo(280) },
    { id: "veh_aveo", workshop_id: "ws_motorx", customer_id: "cust_juanita", placa: "NOP-112", tipo: "carro", marca: "Chevrolet", modelo: "Aveo", anio: 2016, kilometraje: 92300, color: "Rojo", origen: "taller", registrado_por_account_id: null, created_at: diasAgo(31) },
    { id: "veh_cruze", workshop_id: "ws_motorx", customer_id: "cust_gloria", placa: "GHI-021", tipo: "carro", marca: "Chevrolet", modelo: "Cruze", anio: 2018, kilometraje: 72300, color: "Plateado", origen: "taller", registrado_por_account_id: null, created_at: diasAgo(420) },
    { id: "veh_mazda2", workshop_id: "ws_motorx", customer_id: "cust_ignacio", placa: "JKL-554", tipo: "carro", marca: "Mazda", modelo: "2", anio: 2019, kilometraje: 54100, color: "Azul", origen: "taller", registrado_por_account_id: null, created_at: diasAgo(380) },
    { id: "veh_autosur_1", workshop_id: "ws_autosur", customer_id: "cust_autosur_1", placa: "QRS-334", tipo: "carro", marca: "Renault", modelo: "Kwid", anio: 2022, kilometraje: 40120, color: "Naranja", origen: "taller", registrado_por_account_id: null, created_at: diasAgo(4) },
  ];

  const service_orders: ServiceOrder[] = [];
  const diagnostics: Diagnostic[] = [];
  const estimates: Estimate[] = [];
  const estimate_items: EstimateItem[] = [];
  const authorizations: Authorization[] = [];
  const order_media: OrderMedia[] = [];
  const order_events: OrderEvent[] = [];
  const messages: Message[] = [];
  const notifications: Notification[] = [];

  function pushOrder(o: {
    numero: string;
    customer_id: string;
    vehicle_id: string;
    estado: EstadoOrden;
    motivo: string;
    sintomas?: string;
    ingreso: number;
    estimada?: string | null;
    responsable?: string | null;
    creado_por?: string;
    notas?: string;
    entregada?: number | null;
    valor_final?: number | null;
    calificacion?: number | null;
    calificacion_comentario?: string | null;
  }): ServiceOrder {
    const order: ServiceOrder = {
      id: `ord_${o.numero.replace("ORD-", "")}`,
      workshop_id: "ws_motorx",
      customer_id: o.customer_id,
      vehicle_id: o.vehicle_id,
      numero: o.numero,
      estado: o.estado,
      motivo_ingreso: o.motivo,
      sintomas: o.sintomas ?? null,
      fecha_ingreso: diasAgo(o.ingreso, 8, 15),
      fecha_estimada_entrega: o.estimada === undefined ? diasDesdeAhora(Math.max(1, Math.round(o.ingreso * -1) + 3) > 0 ? 2 : 1) : o.estimada,
      fecha_entrega: o.entregada !== undefined && o.entregada !== null ? diasAgo(o.entregada, 16, 30) : null,
      responsable_id: o.responsable ?? null,
      creado_por: o.creado_por ?? "usr_ana",
      notas_internas: o.notas ?? null,
      valor_final: o.valor_final ?? null,
      calificacion: o.calificacion ?? null,
      calificacion_comentario: o.calificacion_comentario ?? null,
      created_at: diasAgo(o.ingreso, 8, 15),
      updated_at: diasAgo(Math.max(0, o.ingreso - 1), 10, 0),
    };
    service_orders.push(order);
    // Evento de creación
    order_events.push({
      id: nid("evt"),
      service_order_id: order.id,
      workshop_id: "ws_motorx",
      tipo: "creacion",
      estado_anterior: null,
      estado_nuevo: "recibido",
      descripcion: `Orden ${o.numero} creada · Recepción del vehículo`,
      actor_id: order.creado_por,
      actor_nombre: users.find((u) => u.id === order.creado_por)?.nombre ?? "Asesor",
      created_at: order.created_at,
    });
    return order;
  }

  function pushEstado(order: ServiceOrder, estado: EstadoOrden, dias: number, actor: string, nota?: string) {
    order_events.push({
      id: nid("evt"),
      service_order_id: order.id,
      workshop_id: "ws_motorx",
      tipo: "cambio_estado",
      estado_anterior: null,
      estado_nuevo: estado,
      descripcion: nota ?? `Estado actualizado a "${estado.replace(/_/g, " ")}"`,
      actor_id: actor,
      actor_nombre: users.find((u) => u.id === actor)?.nombre ?? actor,
      created_at: diasAgo(dias, 10, 30),
    });
  }

  function pushEstimate(order: ServiceOrder, version: number, estado: Estimate["estado"], items: { tipo: TipoItem; descripcion: string; cantidad: number; precio_unitario: number; criticidad?: Criticidad; alternativa_descripcion?: string; alternativa_precio_unitario?: number; taller_recomienda?: "principal" | "alternativa" }[], opts: { descuento?: number; enviada?: number; decidida?: number; actor?: string; aprobada?: boolean; aprobador?: string; id?: string } = {}): Estimate {
    const est: Estimate = {
      id: opts.id ?? nid("est"),
      service_order_id: order.id,
      workshop_id: "ws_motorx",
      version,
      subtotal: 0,
      descuento: opts.descuento ?? 0,
      impuesto_porcentaje: 19,
      impuestos: 0,
      total: 0,
      estado,
      validez_dias: 15,
      creado_por: opts.actor ?? "usr_ana",
      created_at: diasAgo(opts.enviada ?? 2, 11, 0),
      enviada_at: opts.enviada !== undefined ? diasAgo(opts.enviada, 11, 30) : estado === "borrador" ? null : diasAgo(opts.enviada ?? 2, 11, 30),
      decidida_at: opts.decidida !== undefined ? diasAgo(opts.decidida, 15, 0) : null,
    };
    const built: EstimateItem[] = items.map((i) => ({
      id: nid("eit"),
      estimate_id: est.id,
      tipo: i.tipo,
      descripcion: i.descripcion,
      cantidad: i.cantidad,
      precio_unitario: i.precio_unitario,
      subtotal: i.cantidad * i.precio_unitario,
      criticidad: i.criticidad ?? "recomendado",
      alternativa_descripcion: i.alternativa_descripcion ?? null,
      alternativa_precio_unitario: i.alternativa_precio_unitario ?? null,
      taller_recomienda: i.taller_recomienda ?? null,
      estado:
        estado === "aprobada" ? "aprobada"
        : estado === "rechazada" ? "rechazada"
        : estado === "parcialmente_aprobada" ? "aprobada"
        : estado === "superada" ? "rechazada"
        : "pendiente",
      requiere_autorizacion: true,
    }));
    const tot = dinero(items, est.descuento);
    est.subtotal = tot.subtotal;
    est.impuestos = tot.impuestos;
    est.total = tot.total;
    estimates.push(est);
    estimate_items.push(...built);

    if (opts.aprobada) {
      authorizations.push({
        id: nid("aut"),
        estimate_id: est.id,
        service_order_id: order.id,
        workshop_id: "ws_motorx",
        version_aceptada: version,
        decision: estado === "parcialmente_aprobada" ? "aprobada_parcial" : "aprobada_total",
        decided_by: opts.aprobador ?? order.customer_id,
        decided_by_nombre: customers.find((c) => c.id === order.customer_id)?.nombre ?? "Cliente",
        monto_aprobado: estado === "parcialmente_aprobada" ? Math.round(est.total * 0.8) : est.total,
        items_aprobados: built.filter((b) => b.estado === "aprobada").map((b) => b.id),
        items_rechazados: built.filter((b) => b.estado === "rechazada").map((b) => b.id),
        created_at: est.decidida_at ?? diasAgo(2, 14, 0),
      });
    }
    return est;
  }

  function pushMedia(order: ServiceOrder, categoria: CategoriaMedia, url: string, autor: string, dias: number, nombre?: string) {
    order_media.push({
      id: nid("med"),
      service_order_id: order.id,
      workshop_id: "ws_motorx",
      categoria,
      nombre: nombre ?? `Evidencia ${categoria} · ${order.numero}`,
      url,
      autor_id: autor,
      autor_nombre: users.find((u) => u.id === autor)?.nombre ?? autor,
      visible_cliente: true,
      created_at: diasAgo(dias, 12, 0),
    });
  }

  function pushMsg(order: ServiceOrder, tipo: "staff" | "customer", autorId: string, contenido: string, dias: number, hora = 12, leido = true) {
    messages.push({
      id: nid("msg"),
      service_order_id: order.id,
      workshop_id: "ws_motorx",
      remitente_tipo: tipo,
      remitente_id: autorId,
      remitente_nombre:
        tipo === "staff"
          ? users.find((u) => u.id === autorId)?.nombre ?? "Taller"
          : customers.find((c) => c.id === autorId)?.nombre ?? "Cliente",
      contenido,
      leido,
      created_at: diasAgo(dias, hora, 15),
    });
  }

  function pushNotif(dest: "user" | "customer", destId: string, tipo: string, titulo: string, cuerpo: string, dias: number, canal: Notification["canal"] = "in_app", orderId?: string, leida = false) {
    notifications.push({
      id: nid("ntf"),
      workshop_id: "ws_motorx",
      destinatario_tipo: dest,
      destinatario_id: destId,
      tipo,
      titulo,
      cuerpo,
      canal,
      estado: leida ? "leida" : canal === "in_app" ? "pendiente" : "enviada",
      link: orderId ? `/seguimiento/${customers.find((c) => c.id === destId)?.portal_token ?? ""}` : null,
      service_order_id: orderId ?? null,
      created_at: diasAgo(dias, 11, 45),
      leida_at: leida ? diasAgo(dias, 13, 0) : null,
    });
  }

  // ── Órdenes históricas (entregadas / canceladas) ─────────────────────────

  const o1030 = pushOrder({ numero: "ORD-1030", customer_id: "cust_juanita", vehicle_id: "veh_aveo", estado: "cancelado", motivo: "Ruido en caja de cambios", ingreso: 30, estimada: null, notas: "Cancelada: la clienta decidió no proceder con la reparación." });
  pushEstado(o1030, "cancelado", 29, "usr_carlos", "Orden cancelada · Motivo: la clienta retiró el vehículo sin autorizar la reparación.");
  pushEstimate(o1030, 1, "borrador", [{ tipo: "mano_obra", descripcion: "Revisión y reparación de caja de cambios", cantidad: 1, precio_unitario: 1200000 }], { enviada: 29 });
  notifications.length = notifications.length; // noop

  const o1032 = pushOrder({ numero: "ORD-1032", customer_id: "cust_hugo", vehicle_id: "veh_golf", estado: "entregado", motivo: "Mantenimiento 80.000 km", sintomas: "Vibración leve al frenar", ingreso: 26, estimada: null, entregada: 24, valor_final: 1785000, calificacion: 5, calificacion_comentario: "Excelente atención, me mantuvieron informado todo el tiempo con fotos.", responsable: "usr_luis" });
  pushEstado(o1032, "entregado", 24, "usr_ana");
  pushEstimate(o1032, 1, "aprobada", [
    { tipo: "mano_obra", descripcion: "Mantenimiento general 80.000 km", cantidad: 1, precio_unitario: 650000 },
    { tipo: "repuesto", descripcion: "Juego de pastillas de freno delanteras", cantidad: 1, precio_unitario: 280000 },
    { tipo: "servicio", descripcion: "Cambio de aceite y filtros", cantidad: 1, precio_unitario: 220000 },
  ], { enviada: 26, decidida: 25, aprobada: true });
  pushMedia(o1032, "despues", FOTOS.despues, "usr_luis", 24, "Frenos nuevos instalados");

  const o1034 = pushOrder({ numero: "ORD-1034", customer_id: "cust_felipe", vehicle_id: "veh_hilux", estado: "entregado", motivo: "Cambio de embrague", sintomas: "Embrague patinando en subida", ingreso: 20, estimada: null, entregada: 17, valor_final: 2261000, calificacion: 4, calificacion_comentario: "Buen trabajo, aunque se demoraron un día más de lo estimado.", responsable: "usr_pedro" });
  pushEstado(o1034, "entregado", 17, "usr_ana");
  pushEstimate(o1034, 1, "aprobada", [
    { tipo: "repuesto", descripcion: "Kit de embrague (disco, plato y collarín)", cantidad: 1, precio_unitario: 1350000 },
    { tipo: "mano_obra", descripcion: "Mano de obra cambio de embrague", cantidad: 1, precio_unitario: 550000 },
  ], { enviada: 20, decidida: 19, aprobada: true });

  const o1036 = pushOrder({ numero: "ORD-1036", customer_id: "cust_laura", vehicle_id: "veh_versa", estado: "entregado", motivo: "Cambio de aceite y revisión general", ingreso: 12, estimada: null, entregada: 12, valor_final: 297500, calificacion: 5, calificacion_comentario: "Rápido y transparente. Me encantó recibir las fotos.", responsable: "usr_luis" });
  pushEstado(o1036, "entregado", 12, "usr_ana");
  pushEstimate(o1036, 1, "aprobada", [
    { tipo: "servicio", descripcion: "Cambio de aceite sintético 5W-30", cantidad: 1, precio_unitario: 185000 },
    { tipo: "repuesto", descripcion: "Filtro de aceite", cantidad: 1, precio_unitario: 32000 },
    { tipo: "servicio", descripcion: "Revisión de 25 puntos", cantidad: 1, precio_unitario: 30000 },
  ], { enviada: 12, decidida: 12, aprobada: true });

  // Servicios antiguos entregados → candidatos a recordatorio de mantenimiento
  const o1005 = pushOrder({ numero: "ORD-1005", customer_id: "cust_gloria", vehicle_id: "veh_cruze", estado: "entregado", motivo: "Cambio de aceite y filtros", ingreso: 132, estimada: null, entregada: 130, valor_final: 285000, calificacion: 5, calificacion_comentario: "Muy amables.", responsable: "usr_luis" });
  pushEstado(o1005, "entregado", 130, "usr_ana");
  const o1002 = pushOrder({ numero: "ORD-1002", customer_id: "cust_ignacio", vehicle_id: "veh_mazda2", estado: "entregado", motivo: "Sincronización y bujías", ingreso: 98, estimada: null, entregada: 95, valor_final: 420000, calificacion: 4, responsable: "usr_pedro" });
  pushEstado(o1002, "entregado", 95, "usr_ana");
  // Propuesta para el próximo servicio de Ignacio (ORD-1002, entregado hace ~3 meses):
  // borrador con comparativa original/homologado — editable en el panel del taller.
  pushEstimate(o1002, 1, "borrador", [
    { tipo: "repuesto", descripcion: "Juego de bujías de iridio (original)", cantidad: 1, precio_unitario: 320000, criticidad: "recomendado", alternativa_descripcion: "Bujías homologadas NGK LZKR", alternativa_precio_unitario: 185000, taller_recomienda: "alternativa" },
    { tipo: "mano_obra", descripcion: "Mano de obra sincronización", cantidad: 1, precio_unitario: 150000, criticidad: "recomendado" },
  ], { enviada: 95 });

  // ── Órdenes activas ──────────────────────────────────────────────────────

  const o1038 = pushOrder({ numero: "ORD-1038", customer_id: "cust_valeria", vehicle_id: "veh_sandero", estado: "listo_entrega", motivo: "Cambio de amortiguadores traseros", ingreso: 6, estimada: diasDesdeAhora(0), responsable: "usr_luis" });
  pushEstado(o1038, "listo_entrega", 1, "usr_luis", "Trabajo terminado y probado · Listo para entregar");
  pushEstimate(o1038, 1, "aprobada", [
    { tipo: "repuesto", descripcion: "Par de amortiguadores traseros", cantidad: 1, precio_unitario: 520000 },
    { tipo: "mano_obra", descripcion: "Mano de obra cambio de amortiguadores", cantidad: 1, precio_unitario: 260000 },
  ], { enviada: 6, decidida: 5, aprobada: true });
  pushMedia(o1038, "despues", FOTOS.despues, "usr_luis", 1, "Amortiguadores instalados");
  pushNotif("customer", "cust_valeria", "vehiculo_listo", "Tu vehículo está listo", "El Renault Sandero (YBC-556) terminó su servicio y está listo para recoger en Taller MotorX.", 1, "email", o1038.id);
  pushNotif("customer", "cust_valeria", "vehiculo_listo", "Tu vehículo está listo", "El Renault Sandero (YBC-556) terminó su servicio y está listo para recoger en Taller MotorX.", 1, "in_app", o1038.id);

  const o1039 = pushOrder({ numero: "ORD-1039", customer_id: "cust_ricardo", vehicle_id: "veh_sail", estado: "listo_entrega", motivo: "Reparación de caja de cambios", sintomas: "Dificultad para meter primera y reversa", ingreso: 5, estimada: diasDesdeAhora(0), responsable: "usr_pedro" });
  pushEstado(o1039, "listo_entrega", 0, "usr_pedro", "Prueba de ruta realizada sin novedades · Listo para entregar");
  pushEstimate(o1039, 1, "aprobada", [
    { tipo: "repuesto", descripcion: "Kit de sincronizadores", cantidad: 1, precio_unitario: 410000 },
    { tipo: "mano_obra", descripcion: "Reparación de caja de cambios", cantidad: 1, precio_unitario: 780000 },
    { tipo: "repuesto", descripcion: "Aceite de transmisión 75W-90 (3L)", cantidad: 3, precio_unitario: 45000 },
  ], { enviada: 5, decidida: 5, aprobada: true });
  pushNotif("customer", "cust_ricardo", "vehiculo_listo", "Tu vehículo está listo", "El Chevrolet Sail (ZDE-778) terminó su servicio y está listo para recoger.", 0, "email", o1039.id);
  pushNotif("customer", "cust_ricardo", "vehiculo_listo", "Tu vehículo está listo", "El Chevrolet Sail (ZDE-778) terminó su servicio y está listo para recoger.", 0, "in_app", o1039.id);

  const o1040 = pushOrder({ numero: "ORD-1040", customer_id: "cust_camila", vehicle_id: "veh_swift", estado: "en_pruebas", motivo: "Revisión de frenos", sintomas: "Chirrido al frenar", ingreso: 4, estimada: diasDesdeAhora(1), responsable: "usr_luis" });
  pushEstado(o1040, "en_pruebas", 0, "usr_luis", "Cambio de pastillas realizado · En prueba de ruta");
  pushEstimate(o1040, 1, "aprobada", [
    { tipo: "repuesto", descripcion: "Pastillas de freno delanteras", cantidad: 1, precio_unitario: 195000 },
    { tipo: "mano_obra", descripcion: "Mano de obra sistema de frenos", cantidad: 1, precio_unitario: 140000 },
  ], { enviada: 4, decidida: 3, aprobada: true });
  pushMedia(o1040, "durante", FOTOS.durante, "usr_luis", 1, "Pastillas desgastadas desmontadas");

  const o1041 = pushOrder({ numero: "ORD-1041", customer_id: "cust_santiago", vehicle_id: "veh_logan", estado: "autorizado", motivo: "Falla eléctrica y batería", sintomas: "No enciende en las mañanas", ingreso: 3, estimada: diasDesdeAhora(2), responsable: "usr_pedro" });
  pushEstado(o1041, "autorizado", 1, "usr_ana", "Cliente aprobó el presupuesto v1 · Autorizado para iniciar");
  pushEstimate(o1041, 1, "aprobada", [
    { tipo: "repuesto", descripcion: "Batería 65Ah", cantidad: 1, precio_unitario: 430000 },
    { tipo: "mano_obra", descripcion: "Revisión de sistema de carga", cantidad: 1, precio_unitario: 120000 },
  ], { enviada: 3, decidida: 1, aprobada: true });
  pushNotif("user", "usr_luis", "orden_autorizada", "Trabajo autorizado", "La orden ORD-1041 (Renault Logan) fue autorizada por el cliente. Puede iniciar la reparación.", 1, "in_app", o1041.id);

  const o1042 = pushOrder({ numero: "ORD-1042", customer_id: "cust_felipe", vehicle_id: "veh_hilux", estado: "en_reparacion", motivo: "Ruido en suspensión delantera", sintomas: "Golpe seco al pasar baches", ingreso: 3, estimada: diasAgo(1, 17), responsable: "usr_luis", notas: "Cliente solicita aviso previo por WhatsApp antes de entregar." });
  pushEstado(o1042, "en_reparacion", 2, "usr_luis");
  pushEstimate(o1042, 1, "aprobada", [
    { tipo: "repuesto", descripcion: "Bieletas delanteras (par)", cantidad: 1, precio_unitario: 180000 },
    { tipo: "repuesto", descripcion: "Bujes de tijera delanteros", cantidad: 2, precio_unitario: 75000 },
    { tipo: "mano_obra", descripcion: "Mano de obra suspensión delantera", cantidad: 1, precio_unitario: 350000 },
  ], { enviada: 3, decidida: 2, aprobada: true });
  pushMedia(o1042, "antes", FOTOS.antes, "usr_luis", 3, "Bujes desgastados al ingreso");
  pushMedia(o1042, "durante", FOTOS.durante2, "usr_luis", 1, "Desmontaje de suspensión");

  const o1043 = pushOrder({ numero: "ORD-1043", customer_id: "cust_hugo", vehicle_id: "veh_golf", estado: "en_reparacion", motivo: "Fuga de refrigerante", sintomas: "Temperatura subiendo en tráfico", ingreso: 3, estimada: diasDesdeAhora(1), responsable: "usr_pedro" });
  pushEstado(o1043, "en_reparacion", 2, "usr_pedro");
  pushEstimate(o1043, 1, "parcialmente_aprobada", [
    { tipo: "repuesto", descripcion: "Radiador nuevo", cantidad: 1, precio_unitario: 560000 },
    { tipo: "repuesto", descripcion: "Mangueras superior e inferior", cantidad: 1, precio_unitario: 130000 },
    { tipo: "mano_obra", descripcion: "Mano de obra sistema de refrigeración", cantidad: 1, precio_unitario: 280000 },
    { tipo: "servicio", descripcion: "Limpieza interna del motor (adicional)", cantidad: 1, precio_unitario: 150000, criticidad: "puede_esperar" },
  ], { enviada: 3, decidida: 2, aprobada: true });
  // El cliente rechazó la limpieza interna (ítem adicional) → ajustar estado del ítem
  {
    const itemsV = estimate_items.filter((i) => i.estimate_id === estimates.find((e) => e.service_order_id === o1043.id)!.id);
    const rechazado = itemsV.find((i) => i.descripcion.includes("Limpieza interna"));
    if (rechazado) rechazado.estado = "rechazada";
    const aut = authorizations.find((a) => a.service_order_id === o1043.id);
    if (aut) {
      aut.items_rechazados = [rechazado!.id];
      aut.items_aprobados = itemsV.filter((i) => i.estado === "aprobada").map((i) => i.id);
      const subtotalAprobado = itemsV.filter((i) => i.estado === "aprobada").reduce((s, i) => s + i.subtotal, 0);
      aut.monto_aprobado = Math.round(subtotalAprobado * 1.19);
    }
  }
  pushMedia(o1043, "durante", FOTOS.durante2, "usr_pedro", 1, "Radiador con fuga localizado");

  const o1044 = pushOrder({ numero: "ORD-1044", customer_id: "cust_diana_r", vehicle_id: "veh_duster", estado: "esperando_aprobacion", motivo: "Cambio de correa de repartición", sintomas: "Kilometraje llegó a 45.000 km", ingreso: 4, estimada: diasDesdeAhora(2), responsable: null, notas: "Presupuesto enviado hace 3 días, cliente sin responder. Llamar si no responde mañana." });
  pushEstado(o1044, "esperando_aprobacion", 3, "usr_ana", "Presupuesto v1 enviado al cliente");
  pushEstimate(o1044, 1, "enviada", [
    { tipo: "repuesto", descripcion: "Kit de repartición (correa, tensores y polea)", cantidad: 1, precio_unitario: 480000, criticidad: "urgente" },
    { tipo: "repuesto", descripcion: "Bomba de agua", cantidad: 1, precio_unitario: 260000, criticidad: "recomendado" },
    { tipo: "mano_obra", descripcion: "Mano de obra cambio de repartición", cantidad: 1, precio_unitario: 380000, criticidad: "urgente" },
    { tipo: "repuesto", descripcion: "Refrigerante orgánico (galón)", cantidad: 1, precio_unitario: 65000, criticidad: "recomendado" },
  ], { enviada: 3 });
  pushNotif("customer", "cust_diana_r", "presupuesto_pendiente", "Presupuesto pendiente de aprobación", "El presupuesto de la Renault Duster (JKL-321) por $1.410.150 está esperando tu decisión en el portal de seguimiento.", 3, "email", o1044.id);
  pushNotif("customer", "cust_diana_r", "presupuesto_pendiente", "Presupuesto pendiente de aprobación", "El presupuesto de la Renault Duster (JKL-321) está esperando tu decisión en el portal de seguimiento.", 3, "in_app", o1044.id);
  pushMsg(o1044, "customer", "cust_diana_r", "Hola, ¿es necesario cambiar también la bomba de agua o puede esperar?", 2, 19, false);
  pushNotif("user", "usr_ana", "mensaje_nuevo", "Mensaje sin responder · ORD-1044", "Diana Rivas preguntó por la bomba de agua en el portal de seguimiento.", 2, "in_app", o1044.id);

  const o1045 = pushOrder({ numero: "ORD-1045", customer_id: "cust_mauricio", vehicle_id: "veh_frontier", estado: "en_espera", motivo: "Falla de inyección diésel", sintomas: "Humo negro y pérdida de potencia", ingreso: 4, estimada: diasDesdeAhora(3), responsable: "usr_pedro", notas: "En espera de la bomba de inyección (proveedor: Repuestos Andinos). Llega el jueves." });
  pushEstado(o1045, "en_espera", 1, "usr_pedro", "En espera de repuesto · Bomba de inyección pedida al proveedor");
  pushEstimate(o1045, 1, "parcialmente_aprobada", [
    { tipo: "repuesto", descripcion: "Bomba de inyección remanufacturada", cantidad: 1, precio_unitario: 1450000 },
    { tipo: "mano_obra", descripcion: "Mano de obra sistema de inyección", cantidad: 1, precio_unitario: 520000 },
    { tipo: "servicio", descripcion: "Escaneo y calibración con equipo especializado", cantidad: 1, precio_unitario: 180000 },
  ], { enviada: 4, decidida: 3, aprobada: true });
  pushNotif("customer", "cust_mauricio", "orden_en_espera", "Tu vehículo está en espera", "La Nissan Frontier está en espera del repuesto (bomba de inyección). Te avisaremos apenas continúe la reparación. Fecha estimada de entrega: actualización pendiente.", 1, "email", o1045.id);

  const o1046 = pushOrder({ numero: "ORD-1046", customer_id: "cust_laura", vehicle_id: "veh_versa", estado: "en_reparacion", motivo: "Cambio de frenos delanteros", sintomas: "Pedal esponjoso y ruido metálico", ingreso: 2, estimada: diasDesdeAhora(1), responsable: "usr_luis" });
  pushEstado(o1046, "en_reparacion", 2, "usr_luis");
  pushEstimate(o1046, 1, "aprobada", [
    { tipo: "repuesto", descripcion: "Pastillas de freno delanteras", cantidad: 1, precio_unitario: 210000 },
    { tipo: "repuesto", descripcion: "Discos de freno delanteros (par)", cantidad: 1, precio_unitario: 380000 },
    { tipo: "servicio", descripcion: "Cambio de líquido de frenos DOT4", cantidad: 1, precio_unitario: 95000 },
    { tipo: "mano_obra", descripcion: "Mano de obra sistema de frenos", cantidad: 1, precio_unitario: 220000 },
  ], { enviada: 2, decidida: 2, aprobada: true });
  pushMedia(o1046, "antes", FOTOS.antes, "usr_luis", 2, "Discos con desgaste severo");
  pushMedia(o1046, "durante", FOTOS.durante, "usr_luis", 1, "Montaje de discos nuevos");
  pushMsg(o1046, "customer", "cust_laura", "Buenos días, ¿cómo va el carro?", 1, 8, true);
  pushMsg(o1046, "staff", "usr_ana", "¡Hola Laura! Ya instalamos los discos y pastillas nuevos. Hoy en la tarde hacemos pruebas de ruta. Te aviso apenas esté listo.", 1, 9, true);
  pushMsg(o1046, "customer", "cust_laura", "Perfecto, muchas gracias por las fotos 👌", 1, 10, true);

  const o1047 = pushOrder({ numero: "ORD-1047", customer_id: "cust_sofia", vehicle_id: "veh_picanto", estado: "en_reparacion", motivo: "Aire acondicionado no enfría", ingreso: 2, estimada: diasDesdeAhora(2), responsable: "usr_pedro" });
  pushEstado(o1047, "en_reparacion", 1, "usr_pedro");
  pushEstimate(o1047, 1, "aprobada", [
    { tipo: "repuesto", descripcion: "Compresor de A/C", cantidad: 1, precio_unitario: 890000 },
    { tipo: "repuesto", descripcion: "Filtro deshidratador", cantidad: 1, precio_unitario: 85000 },
    { tipo: "mano_obra", descripcion: "Mano de obra y recarga de gas", cantidad: 1, precio_unitario: 300000 },
  ], { enviada: 2, decidida: 1, aprobada: true });

  const o1048 = pushOrder({ numero: "ORD-1048", customer_id: "cust_maria", vehicle_id: "veh_mazda3", estado: "esperando_aprobacion", motivo: "Ruidos en suspensión delantera", sintomas: "Golpe al pasar policías acostados", ingreso: 1, estimada: diasDesdeAhora(3), responsable: null, notas: "Cliente muy pendiente del proceso. Prefiere WhatsApp." });
  pushEstado(o1048, "en_diagnostico", 1, "usr_ana");
  diagnostics.push({
    id: nid("dia"),
    service_order_id: o1048.id,
    descripcion: "Se realizó prueba de ruta y revisión en elevador. Se evidencia desgaste en los 4 amortiguadores (fuga de aceite en el delantero derecho), bujes de tijera delanteros con juego y bieletas con desgaste. La cremallera de dirección está en buen estado (se descartó la fuga que se sospechó inicialmente).",
    recomendaciones: "Reemplazar el juego de amortiguadores delanteros y traseros, cambiar bujes de tijera y bieletas. Realizar alineación y balanceo computerizada al terminar. No se requiere intervención de la cremallera.",
    creado_por: "usr_ana",
    created_at: diasAgo(1, 14, 0),
  });
  order_events.push({
    id: nid("evt"), service_order_id: o1048.id, workshop_id: "ws_motorx", tipo: "diagnostico",
    descripcion: "Diagnóstico registrado por Ana Ríos", actor_id: "usr_ana", actor_nombre: "Ana Ríos", created_at: diasAgo(1, 14, 0),
  });
  pushEstimate(o1048, 1, "superada", [
    { tipo: "repuesto", descripcion: "Juego de amortiguadores (4)", cantidad: 4, precio_unitario: 320000 },
    { tipo: "repuesto", descripcion: "Cremallera de dirección", cantidad: 1, precio_unitario: 1800000 },
    { tipo: "mano_obra", descripcion: "Mano de obra suspensión", cantidad: 1, precio_unitario: 450000 },
  ], { enviada: 1, id: "est_1048_v1" });
  pushMsg(o1048, "customer", "cust_maria", "Hola, vi el presupuesto. ¿La cremallera es necesaria? En otra revisión me dijeron que estaba bien. ¿Me pueden confirmar?", 1, 16, true);
  pushMsg(o1048, "staff", "usr_ana", "¡Hola María! Revisamos de nuevo la cremallera con el mecánico jefe y confirmamos que está en buen estado. Vamos a actualizar el presupuesto quitando ese ítem y te enviamos la versión 2 hoy mismo.", 1, 17, true);
  const est1048v2 = pushEstimate(o1048, 2, "enviada", [
    { tipo: "repuesto", descripcion: "Juego de amortiguadores delanteros y traseros (4)", cantidad: 4, precio_unitario: 320000, criticidad: "urgente" },
    { tipo: "repuesto", descripcion: "Bujes de tijera delanteros", cantidad: 2, precio_unitario: 85000, criticidad: "recomendado" },
    { tipo: "repuesto", descripcion: "Bieletas delanteras (par)", cantidad: 1, precio_unitario: 120000, criticidad: "recomendado" },
    { tipo: "mano_obra", descripcion: "Mano de obra suspensión completa", cantidad: 1, precio_unitario: 450000, criticidad: "urgente" },
    { tipo: "servicio", descripcion: "Alineación y balanceo computerizada", cantidad: 1, precio_unitario: 90000, criticidad: "puede_esperar" },
  ], { enviada: 0, descuento: 50000, id: "est_1048_v2" });
  pushEstado(o1048, "esperando_aprobacion", 0, "usr_ana", "Presupuesto v2 enviado al cliente (ajustado tras su consulta)");
  pushNotif("customer", "cust_maria", "presupuesto_pendiente", "Presupuesto pendiente de aprobación", "El presupuesto v2 del Mazda 3 (ABC-456) está listo para tu revisión: $2.522.900. Puedes aprobar o rechazar cada trabajo en tu portal.", 0, "email", o1048.id);
  pushNotif("customer", "cust_maria", "presupuesto_pendiente", "Presupuesto pendiente de aprobación", "El presupuesto v2 del Mazda 3 (ABC-456) está listo para tu revisión. Puedes aprobar o rechazar cada trabajo en tu portal.", 0, "in_app", o1048.id);
  pushMsg(o1048, "customer", "cust_maria", "Gracias por la transparencia. ¿Me confirman si el arreglo queda listo este viernes? Necesito el carro para viajar el sábado.", 0, 12, false);
  pushNotif("user", "usr_ana", "respuesta_pendiente", "Respuesta pendiente · ORD-1048", "María Gómez preguntó si su Mazda 3 estará listo el viernes (viaja el sábado).", 0, "in_app", o1048.id);
  pushMedia(o1048, "antes", FOTOS.antes, "usr_ana", 1, "Amortiguador delantero derecho con fuga");
  pushMedia(o1048, "antes", FOTOS.antes2, "usr_ana", 1, "Buje de tijera con desgaste");
  pushMedia(o1048, "documento", FOTOS.documento, "usr_ana", 1, "Orden de servicio firmada en recepción");

  const o1049 = pushOrder({ numero: "ORD-1049", customer_id: "cust_jorge", vehicle_id: "veh_fz", estado: "en_diagnostico", motivo: "Falla eléctrica y no enciende", sintomas: "Se apagó en marcha y no volvió a encender", ingreso: 1, estimada: diasDesdeAhora(2), responsable: "usr_luis" });
  pushEstado(o1049, "en_diagnostico", 1, "usr_ana");
  pushNotif("user", "usr_luis", "diagnostico_pendiente", "Diagnóstico pendiente · ORD-1049", "La Yamaha FZ (BFD-87E) lleva más de 24 horas sin diagnóstico registrado.", 1, "in_app", o1049.id);
  pushMedia(o1049, "antes", FOTOS.antes2, "usr_ana", 1, "Estado al ingreso");

  const o1050 = pushOrder({ numero: "ORD-1050", customer_id: "cust_carolina", vehicle_id: "veh_cb125", estado: "en_reparacion", motivo: "Mantenimiento 12.000 km", ingreso: 1, estimada: diasDesdeAhora(1), responsable: "usr_luis" });
  pushEstado(o1050, "en_reparacion", 0, "usr_luis");
  pushEstimate(o1050, 1, "aprobada", [
    { tipo: "servicio", descripcion: "Mantenimiento 12.000 km (aceite, filtros, bujía)", cantidad: 1, precio_unitario: 180000 },
    { tipo: "repuesto", descripcion: "Kit de arrastre", cantidad: 1, precio_unitario: 165000 },
    { tipo: "mano_obra", descripcion: "Mano de obra mantenimiento", cantidad: 1, precio_unitario: 120000 },
  ], { enviada: 1, decidida: 0, aprobada: true });
  pushNotif("customer", "cust_carolina", "reparacion_iniciada", "Reparación iniciada", "Comenzamos el mantenimiento de tu Honda CB125F (VKD-22C). Te compartiremos fotos del avance.", 0, "email", o1050.id);

  const o1051 = pushOrder({ numero: "ORD-1051", customer_id: "cust_andres", vehicle_id: "veh_spark", estado: "esperando_aprobacion", motivo: "Vibración en el volante a alta velocidad", ingreso: 0, estimada: diasDesdeAhora(2), responsable: null });
  pushEstado(o1051, "en_diagnostico", 0, "usr_ana");
  diagnostics.push({
    id: nid("dia"),
    service_order_id: o1051.id,
    descripcion: "Prueba de ruta confirma vibración entre 80 y 100 km/h. Llantas con desgaste irregular y una con protuberancia (chichón). Balanceo descompensado.",
    recomendaciones: "Reemplazar la llanta delantera derecha, realizar balanceo dinámico de las 4 ruedas y alineación computerizada. Verificar presión y estado de las demás llantas.",
    creado_por: "usr_ana",
    created_at: diasAgo(0, 10, 30),
  });
  pushEstado(o1051, "esperando_aprobacion", 0, "usr_ana", "Presupuesto v1 enviado al cliente");
  pushEstimate(o1051, 1, "enviada", [
    { tipo: "repuesto", descripcion: "Llanta 175/65 R14", cantidad: 1, precio_unitario: 320000, criticidad: "urgente" },
    { tipo: "servicio", descripcion: "Balanceo dinámico 4 ruedas", cantidad: 1, precio_unitario: 60000, criticidad: "recomendado" },
    { tipo: "servicio", descripcion: "Alineación computerizada", cantidad: 1, precio_unitario: 90000, criticidad: "recomendado" },
    { tipo: "mano_obra", descripcion: "Mano de obra montaje", cantidad: 1, precio_unitario: 50000, criticidad: "recomendado" },
  ], { enviada: 0 });
  pushNotif("customer", "cust_andres", "presupuesto_pendiente", "Presupuesto pendiente de aprobación", "El presupuesto del Chevrolet Spark GT (GHI-789) por $619.200 está esperando tu decisión.", 0, "email", o1051.id);

  const o1052 = pushOrder({ numero: "ORD-1052", customer_id: "cust_eduardo", vehicle_id: "veh_ranger", estado: "recibido", motivo: "Revisión de garantía: luz de motor encendida", sintomas: "Testigo check engine encendido desde ayer", ingreso: 0, estimada: diasDesdeAhora(1), responsable: null, notas: "Recibida hoy 8:15 a. m. Rayón en puerta trasera izquierda registrado en acta." });
  pushMedia(o1052, "antes", FOTOS.antes2, "usr_ana", 0, "Rayón puerta trasera izquierda (acta de recepción)");
  pushMedia(o1052, "documento", FOTOS.documento, "usr_ana", 0, "Acta de recepción firmada");
  pushNotif("customer", "cust_eduardo", "vehiculo_recibido", "Recibimos tu vehículo", "La Ford Ranger (WXD-88F) fue recibida en Taller MotorX. Motivo: revisión de garantía por luz de motor. Puedes seguir el proceso en tu portal.", 0, "email", o1052.id);
  pushNotif("customer", "cust_eduardo", "vehiculo_recibido", "Recibimos tu vehículo", "La Ford Ranger (WXD-88F) fue recibida en Taller MotorX. Puedes seguir el proceso en tu portal.", 0, "in_app", o1052.id);
  pushMsg(o1052, "staff", "usr_ana", "Buenos días Eduardo, recibimos su camioneta y registramos el rayón de la puerta trasera en el acta. Iniciamos diagnóstico hoy y le compartimos el presupuesto por el portal.", 0, 9, true);

  // ── Taller AutoSur (datos mínimos para el panel de administración) ───────

  const oAutosur: ServiceOrder = {
    id: "ord_as_1", workshop_id: "ws_autosur", customer_id: "cust_autosur_1", vehicle_id: "veh_autosur_1",
    numero: "AS-0001", estado: "en_diagnostico", motivo_ingreso: "Revisión general de compra", sintomas: null,
    fecha_ingreso: diasAgo(3, 9, 0), fecha_estimada_entrega: diasDesdeAhora(2), fecha_entrega: null,
    responsable_id: "usr_diana", creado_por: "usr_diana", notas_internas: null, valor_final: null,
    calificacion: null, calificacion_comentario: null, created_at: diasAgo(3, 9, 0), updated_at: diasAgo(2, 10, 0),
  };
  service_orders.push(oAutosur);
  order_events.push({
    id: nid("evt"), service_order_id: oAutosur.id, workshop_id: "ws_autosur", tipo: "creacion",
    estado_nuevo: "recibido", descripcion: "Orden AS-0001 creada · Recepción del vehículo",
    actor_id: "usr_diana", actor_nombre: "Diana Cruz", created_at: diasAgo(3, 9, 0),
  });

  // ── Suscripciones ────────────────────────────────────────────────────────

  const subscriptions: Subscription[] = [
    { id: nid("sub"), workshop_id: "ws_motorx", plan: "pro", estado: "activa", inicio: diasAgo(76), fin: diasDesdeAhora(289), created_at: diasAgo(76) },
    { id: nid("sub"), workshop_id: "ws_autosur", plan: "starter", estado: "en_prueba", inicio: diasAgo(6), fin: diasDesdeAhora(8), created_at: diasAgo(6) },
  ];

  // ── Auditoría ────────────────────────────────────────────────────────────

  const audit_logs: AuditLog[] = [
    { id: nid("aud"), workshop_id: "ws_motorx", actor_id: "usr_ana", actor_nombre: "Ana Ríos", accion: "presupuesto.enviar", entidad: "estimates", entidad_id: "est_1048_v2", detalle: { version: 2, total: 2522900 }, created_at: diasAgo(0, 11, 45) },
    { id: nid("aud"), workshop_id: "ws_motorx", actor_id: "usr_carlos", actor_nombre: "Carlos Mejía", accion: "orden.cancelar", entidad: "service_orders", entidad_id: "ord_1030", detalle: { motivo: "Cliente retiró el vehículo" }, created_at: diasAgo(29, 15, 0) },
    { id: nid("aud"), workshop_id: "ws_motorx", actor_id: "usr_luis", actor_nombre: "Luis Pardo", accion: "orden.cambiar_estado", entidad: "service_orders", entidad_id: "ord_1038", detalle: { nuevo_estado: "listo_entrega" }, created_at: diasAgo(1, 16, 20) },
    { id: nid("aud"), workshop_id: null, actor_id: "usr_admin", actor_nombre: "Alejandra Botero", accion: "taller.registrar", entidad: "workshops", entidad_id: "ws_autosur",       detalle: { plan: "starter", estado: "en_prueba" }, created_at: diasAgo(6, 10, 5) },
    { id: nid("aud"), workshop_id: "ws_motorx", actor_id: "usr_carlos", actor_nombre: "Carlos Mejía", accion: "miembro.invitar", entidad: "workshop_members", entidad_id: "usr_pedro", detalle: { rol: "mechanic" }, created_at: diasAgo(90, 11, 0) },
  ];

  // Notificaciones extra para la campana del staff
  notifications.push(
    { id: nid("ntf"), workshop_id: "ws_motorx", destinatario_tipo: "user", destinatario_id: "usr_ana", tipo: "presupuesto_pendiente", titulo: "Presupuesto enviado · ORD-1051", cuerpo: "Enviaste el presupuesto del Chevrolet Spark GT. El cliente fue notificado.", canal: "in_app", estado: "pendiente", link: null, service_order_id: "ord_1051", created_at: diasAgo(0, 11, 30), leida_at: null },
    { id: nid("ntf"), workshop_id: "ws_motorx", destinatario_tipo: "user", destinatario_id: "usr_carlos", tipo: "alerta_retraso", titulo: "Trabajo retrasado · ORD-1042", cuerpo: "La orden ORD-1042 (Toyota Hilux) superó la fecha estimada de entrega.", canal: "in_app", estado: "pendiente", link: null, service_order_id: "ord_1042", created_at: diasAgo(1, 8, 0), leida_at: null },
    { id: nid("ntf"), workshop_id: "ws_motorx", destinatario_tipo: "user", destinatario_id: "usr_carlos", tipo: "alerta_sin_respuesta", titulo: "Cliente sin respuesta · ORD-1044", cuerpo: "Diana Rivas no ha respondido al presupuesto enviado hace 3 días.", canal: "in_app", estado: "pendiente", link: null, service_order_id: "ord_1044", created_at: diasAgo(0, 8, 0), leida_at: null },
    // Notificación de vinculación solicitada por Jorge Peña
    { id: nid("ntf"), workshop_id: "ws_motorx", destinatario_tipo: "user", destinatario_id: "usr_carlos", tipo: "vinculacion_solicitada", titulo: "Nueva solicitud de vinculación · Jorge Peña", cuerpo: "Jorge Peña (jorge.pena@example.co) solicitó vincular su ficha \"Jorge Peña\" a tu taller.", canal: "in_app", estado: "pendiente", link: "/taller/vinculaciones", service_order_id: null, created_at: diasAgo(1, 10, 0), leida_at: null },
    { id: nid("ntf"), workshop_id: "ws_motorx", destinatario_tipo: "user", destinatario_id: "usr_ana", tipo: "vinculacion_solicitada", titulo: "Nueva solicitud de vinculación · Jorge Peña", cuerpo: "Jorge Peña (jorge.pena@example.co) solicitó vincular su ficha \"Jorge Peña\" a tu taller.", canal: "in_app", estado: "pendiente", link: "/taller/vinculaciones", service_order_id: null, created_at: diasAgo(1, 10, 0), leida_at: null },
  );

  return {
    meta: { version: 9, seeded_at: new Date().toISOString() },
    workshops,
    users,
    workshop_members,
    customers,
    // Cuenta demo: María Gómez creó su cuenta personal y vinculó su ficha con
    // el enlace que le envió el taller. Acceso: maria.gomez@example.co / cliente123
    customer_accounts: [
      {
        id: "acc_maria",
        nombre: "María Gómez",
        correo: "maria.gomez@example.co",
        telefono: "+57 310 555 4821",
        estado: "activo",
        password_hash: hashPassword("cliente123"),
        consentimiento_datos_at: diasAgo(20),
        created_at: diasAgo(20),
      },
      // Cuenta demo pendiente: Jorge Peña solicitó vincular su ficha
      {
        id: "acc_jorge",
        nombre: "Jorge Peña",
        correo: "jorge.pena@example.co",
        telefono: "+57 315 222 9074",
        estado: "activo",
        password_hash: hashPassword("cliente123"),
        consentimiento_datos_at: diasAgo(5),
        created_at: diasAgo(5),
      },
    ],
    customer_account_links: [
      // María vinculó su ficha pegando el enlace personal que le envió el taller
      { id: "lnk_maria", account_id: "acc_maria", customer_id: "cust_maria", workshop_id: "ws_motorx", origen: "token", estado: "aceptado", created_at: diasAgo(20) },
      // Jorge Peña solicitó vincular su ficha (PENDIENTE de aceptación por el taller)
      { id: "lnk_jorge", account_id: "acc_jorge", customer_id: "cust_jorge", workshop_id: "ws_motorx", origen: "token", estado: "pendiente", created_at: diasAgo(1) },
    ],
    vehicles,
    service_orders,
    diagnostics,
    estimates,
    estimate_items,
    authorizations,
    order_media,
    order_events,
    messages,
    notifications,
    subscriptions,
    audit_logs,
    email_verification_codes: [],
    secuencia_orden: 1052,
    secuencia_factura: 0,
    invoices: [],
  };
}
