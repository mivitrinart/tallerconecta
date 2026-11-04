/**
 * Workflows · Lógica de negocio del MVP: valida → muta → registra evento → audita → notifica.
 */

import crypto from "node:crypto";
import { mutate, nextOrderNumber, nowISO, query, uid } from "@/lib/database/index";
import { hashPassword, comparePassword } from "@/lib/auth/password";
import type {
  Authorization, CategoriaMedia, Customer, CustomerAccount,
  Database, Estimate, EstimateItem, EstadoOrden, Invoice, Message,
  OrderEvent, ServiceOrder, Vehicle,
} from "@/lib/database/types";
import { ESTADO_LABEL, validarTransicion } from "@/lib/orders/state-machine";
import { validarCupoOrdenesMes, validarCupoMiembros } from "@/lib/orders/plan-limits";
import { notify, notifyStaffGestion, notifyCustomerLinkSent } from "@/lib/notify";
import { formatCOP, formatDate, formatDateTime, formatKm, formatTimeAgo } from "@/lib/format";
import type { CustomerInput, EstimateCreateInput, InvoiceCreateInput, OrderCreateInput, VehicleInput } from "@/lib/validations/schemas";

export interface Actor { id: string; nombre: string; }
export interface ResultadoOp { ok: boolean; error?: string; id?: string; pendiente?: boolean; }

function vehLabel(v: Vehicle): string {
  return `${v.marca} ${v.modelo} (${v.placa})`;
}

function pushEvent(
  db: Database, order: ServiceOrder, tipo: OrderEvent["tipo"],
  descripcion: string, actor: Actor | { id: string; nombre: string },
  extra?: { estado_anterior?: EstadoOrden | null; estado_nuevo?: EstadoOrden | null }
) {
  db.order_events.push({
    id: uid("evt"), service_order_id: order.id, workshop_id: order.workshop_id,
    tipo, estado_anterior: extra?.estado_anterior ?? null, estado_nuevo: extra?.estado_nuevo ?? null,
    descripcion, actor_id: actor.id, actor_nombre: actor.nombre, created_at: nowISO(),
  });
}

function pushAudit(
  db: Database, workshopId: string | null, actor: Actor, accion: string,
  entidad: string, entidadId: string | null, detalle?: Record<string, unknown>
) {
  db.audit_logs.push({
    id: uid("aud"), workshop_id: workshopId, actor_id: actor.id, actor_nombre: actor.nombre,
    accion, entidad, entidad_id: entidadId, detalle: detalle ?? null, created_at: nowISO(),
  });
}

export function findOrder(db: Database, orderId: string, workshopId?: string): ServiceOrder | undefined {
  return db.service_orders.find((o) => o.id === orderId && (workshopId === undefined || o.workshop_id === workshopId));
}

export function latestEstimateOf(db: Database, orderId: string): Estimate | null {
  const ests = db.estimates.filter((e) => e.service_order_id === orderId).sort((a, b) => b.version - a.version);
  return ests[0] ?? null;
}

export function itemsOfEstimate(db: Database, estimateId: string): EstimateItem[] {
  return db.estimate_items.filter((i) => i.estimate_id === estimateId);
}

export function calcularTotales(
  items: { cantidad: number; precio_unitario: number }[],
  descuento: number, impuestoPorcentaje: number
) {
  const bruto = items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0);
  const subtotal = Math.max(0, bruto - descuento);
  const impuestos = Math.round(subtotal * (impuestoPorcentaje / 100));
  return { bruto, subtotal, impuestos, total: subtotal + impuestos };
}

function applyStatus(
  db: Database, order: ServiceOrder, nuevo: EstadoOrden, actor: Actor,
  opts: { motivo?: string; nota?: string; notificarCliente?: boolean } = {}
): void {
  const anterior = order.estado;
  const vehicle = db.vehicles.find((v) => v.id === order.vehicle_id)!;
  order.estado = nuevo;
  order.updated_at = nowISO();
  if (nuevo === "entregado" && !order.fecha_entrega) order.fecha_entrega = nowISO();

  const descripcion =
    opts.motivo && nuevo === "cancelado"
      ? `Orden cancelada · Motivo: ${opts.motivo}`
      : opts.nota
        ? `Estado: ${ESTADO_LABEL[anterior]} → ${ESTADO_LABEL[nuevo]} · ${opts.nota}`
        : `Estado: ${ESTADO_LABEL[anterior]} → ${ESTADO_LABEL[nuevo]}`;

  pushEvent(db, order, "cambio_estado", descripcion, actor, { estado_anterior: anterior, estado_nuevo: nuevo });

  if (opts.notificarCliente !== false) {
    const base = `${vehLabel(vehicle)} · Orden ${order.numero}`;
    switch (nuevo) {
      case "en_reparacion":
        notify({ db, workshopId: order.workshop_id, destinatarioTipo: "customer", destinatarioId: order.customer_id, tipo: "reparacion_iniciada", titulo: "Reparación iniciada", cuerpo: `Comenzamos a trabajar en tu ${base}. Te compartiremos fotos del avance.`, serviceOrderId: order.id });
        break;
      case "en_espera":
        notify({ db, workshopId: order.workshop_id, destinatarioTipo: "customer", destinatarioId: order.customer_id, tipo: "orden_en_espera", titulo: "Tu vehículo está en espera", cuerpo: `${base} quedó en espera${opts.motivo ? `: ${opts.motivo}` : " (falta un repuesto, una respuesta u otro recurso)"}. Te avisaremos apenas se reanude.`, serviceOrderId: order.id });
        break;
      case "en_pruebas":
        notify({ db, workshopId: order.workshop_id, destinatarioTipo: "customer", destinatarioId: order.customer_id, tipo: "reparacion_finalizada", titulo: "Reparación finalizada", cuerpo: `Terminamos el trabajo en tu ${base}. Estamos verificando todo en pruebas de calidad.`, serviceOrderId: order.id });
        break;
      case "listo_entrega":
        notify({ db, workshopId: order.workshop_id, destinatarioTipo: "customer", destinatarioId: order.customer_id, tipo: "vehiculo_listo", titulo: "¡Tu vehículo está listo!", cuerpo: `${base} está listo para recoger. Puedes pasar por él en el horario de atención del taller.`, serviceOrderId: order.id });
        break;
      case "entregado":
        notify({ db, workshopId: order.workshop_id, destinatarioTipo: "customer", destinatarioId: order.customer_id, tipo: "orden_entregada", titulo: "Servicio entregado", cuerpo: `Entregamos tu ${base}${order.valor_final ? ` · Valor final: ${formatCOP(order.valor_final)}` : ""}. ¿Cómo calificarías el servicio? Tu opinión nos ayuda a mejorar.`, serviceOrderId: order.id });
        break;
      case "cancelado":
        notify({ db, workshopId: order.workshop_id, destinatarioTipo: "customer", destinatarioId: order.customer_id, tipo: "orden_cancelada", titulo: "Orden cancelada", cuerpo: `La orden ${order.numero} de tu ${base} fue cancelada${opts.motivo ? `: ${opts.motivo}` : ""}. Si tienes dudas, escríbenos por el portal.`, serviceOrderId: order.id });
        break;
      case "en_diagnostico":
        notify({ db, workshopId: order.workshop_id, destinatarioTipo: "customer", destinatarioId: order.customer_id, tipo: "diagnostico_iniciado", titulo: "Diagnóstico en proceso", cuerpo: `Estamos identificando los problemas de tu ${base}. Te compartiremos el diagnóstico y el presupuesto por el portal.`, serviceOrderId: order.id });
        break;
      default: break;
    }
  }
}

export function createCustomer(input: CustomerInput, workshopId: string, actor: Actor): Customer {
  return mutate((db) => {
    const customer: Customer = {
      id: uid("cust"), workshop_id: workshopId, nombre: input.nombre.trim(),
      telefono: input.telefono.trim(), correo: input.correo.trim().toLowerCase(),
      documento: input.documento?.trim() || null, portal_token: uid("tok"),
      consentimiento_datos_at: nowISO(), consentimiento_origen: "taller",
      anonimizado: false, created_at: nowISO(),
    };
    db.customers.push(customer);
    pushAudit(db, workshopId, actor, "cliente.crear", "customers", customer.id, { nombre: customer.nombre, consentimiento: "taller" });
    return customer;
  });
}

export function createVehicle(input: VehicleInput, workshopId: string, actor: Actor): Vehicle {
  return mutate((db) => {
    const vehicle: Vehicle = {
      id: uid("veh"), workshop_id: workshopId, customer_id: input.customer_id!,
      placa: input.placa.trim().toUpperCase(), tipo: input.tipo,
      marca: input.marca.trim(), modelo: input.modelo.trim(), anio: input.anio,
      kilometraje: input.kilometraje, color: input.color?.trim() || null, created_at: nowISO(),
    };
    db.vehicles.push(vehicle);
    pushAudit(db, workshopId, actor, "vehiculo.crear", "vehicles", vehicle.id, { placa: vehicle.placa });
    return vehicle;
  });
}

export function createOrder(input: OrderCreateInput, workshopId: string, actor: Actor): ServiceOrder {
  return mutate((db) => {
    let customerId = input.customer_id;
    let vehicleId = input.vehicle_id;

    if (!customerId && input.new_customer) {
      const c: Customer = {
        id: uid("cust"), workshop_id: workshopId, nombre: input.new_customer.nombre.trim(),
        telefono: input.new_customer.telefono.trim(), correo: input.new_customer.correo.trim().toLowerCase(),
        documento: input.new_customer.documento?.trim() || null, portal_token: uid("tok"),
        consentimiento_datos_at: nowISO(), consentimiento_origen: "taller",
        anonimizado: false, created_at: nowISO(),
      };
      db.customers.push(c);
      customerId = c.id;
    }
    if (!vehicleId && input.new_vehicle) {
      const v: Vehicle = {
        id: uid("veh"), workshop_id: workshopId, customer_id: customerId!,
        placa: input.new_vehicle.placa.trim().toUpperCase(), tipo: input.new_vehicle.tipo,
        marca: input.new_vehicle.marca.trim(), modelo: input.new_vehicle.modelo.trim(),
        anio: input.new_vehicle.anio, kilometraje: input.kilometraje ?? input.new_vehicle.kilometraje,
        color: input.new_vehicle.color?.trim() || null, created_at: nowISO(),
      };
      db.vehicles.push(v);
      vehicleId = v.id;
    }

    const customer = db.customers.find((c) => c.id === customerId && c.workshop_id === workshopId);
    const vehicle = db.vehicles.find((v) => v.id === vehicleId && v.workshop_id === workshopId);
    if (!customer || !vehicle) throw new Error("Cliente o vehículo inválido para este taller");

    const cupoOrden = validarCupoOrdenesMes(db, workshopId);
    if (!cupoOrden.ok) throw new Error(cupoOrden.error);

    if (input.kilometraje) vehicle.kilometraje = input.kilometraje;

    const order: ServiceOrder = {
      id: uid("ord"), workshop_id: workshopId, customer_id: customer.id, vehicle_id: vehicle.id,
      numero: nextOrderNumber(workshopId), estado: "recibido", motivo_ingreso: input.motivo_ingreso.trim(),
      sintomas: input.sintomas?.trim() || null, fecha_ingreso: nowISO(),
      fecha_estimada_entrega: input.fecha_estimada_entrega || null, fecha_entrega: null,
      responsable_id: input.responsable_id || null, creado_por: actor.id,
      notas_internas: input.notas_internas?.trim() || null, valor_final: null, calificacion: null,
      calificacion_comentario: null, created_at: nowISO(), updated_at: nowISO(),
    };
    db.service_orders.push(order);

    pushEvent(db, order, "creacion", `Recepción del vehículo · ${vehLabel(vehicle)} · Motivo: ${order.motivo_ingreso}`, actor, { estado_nuevo: "recibido" });
    notify({ db, workshopId, destinatarioTipo: "customer", destinatarioId: customer.id, tipo: "vehiculo_recibido", titulo: "Recibimos tu vehículo", cuerpo: `${vehLabel(vehicle)} fue recibido en el taller (Orden ${order.numero}). Motivo: ${order.motivo_ingreso}. Puedes seguir todo el proceso en tu portal de seguimiento.`, serviceOrderId: order.id });
    pushAudit(db, workshopId, actor, "orden.crear", "service_orders", order.id, { numero: order.numero });
    return order;
  });
}

export function changeOrderStatus(
  orderId: string, nuevoEstado: EstadoOrden, actor: Actor,
  workshopId: string, opts: { motivo?: string; nota?: string } = {}
): ResultadoOp {
  return mutate((db) => {
    const order = findOrder(db, orderId, workshopId);
    if (!order) return { ok: false, error: "Orden no encontrada en este taller." };

    const est = latestEstimateOf(db, order.id);
    const items = est ? itemsOfEstimate(db, est.id) : [];
    const validacion = validarTransicion(order.estado, nuevoEstado, { estimateActual: est, itemsEstimateActual: items, motivo: opts.motivo });
    if (!validacion.ok) return { ok: false, error: validacion.error };

    if (order.estado === "recibido" && nuevoEstado === "en_diagnostico") {
      const tieneAntes = db.order_media.some((m) => m.service_order_id === order.id && m.categoria === "antes");
      if (!tieneAntes) return { ok: false, error: "Checklist de recepción: carga al menos una foto (o video de 15 s) del ANTES de continuar al diagnóstico." };
    }
    if (order.estado === "en_pruebas" && nuevoEstado === "listo_entrega") {
      const tieneDespues = db.order_media.some((m) => m.service_order_id === order.id && m.categoria === "despues");
      if (!tieneDespues) return { ok: false, error: "Carga al menos una foto del DESPUÉS como evidencia de salida antes de marcar 'Listo para entregar'." };
    }

    applyStatus(db, order, nuevoEstado, actor, opts);
    pushAudit(db, workshopId, actor, "orden.cambiar_estado", "service_orders", order.id, { de: validacion, hasta: nuevoEstado, motivo: opts.motivo });
    return { ok: true, id: order.id };
  });
}

export function assignResponsable(orderId: string, responsableId: string, actor: Actor, workshopId: string): ResultadoOp {
  return mutate((db) => {
    const order = findOrder(db, orderId, workshopId);
    if (!order) return { ok: false, error: "Orden no encontrada." };
    const miembro = db.workshop_members.find((m) => m.workshop_id === workshopId && m.user_id === responsableId && m.activo);
    if (!miembro) return { ok: false, error: "El responsable no es miembro activo del taller." };
    order.responsable_id = responsableId;
    order.updated_at = nowISO();
    const user = db.users.find((u) => u.id === responsableId);
    pushEvent(db, order, "nota", `Responsable asignado: ${user?.nombre ?? responsableId}`, actor);
    notify({ db, workshopId, destinatarioTipo: "user", destinatarioId: responsableId, tipo: "trabajo_asignado", titulo: `Trabajo asignado · ${order.numero}`, cuerpo: `Se te asignó la orden ${order.numero}. Revísala en el panel de trabajos.`, canales: ["in_app"], serviceOrderId: order.id });
    pushAudit(db, workshopId, actor, "orden.asignar", "service_orders", order.id, { responsableId });
    return { ok: true, id: order.id };
  });
}

export function updateOrderNotes(orderId: string, notas: string, actor: Actor, workshopId: string): ResultadoOp {
  return mutate((db) => {
    const order = findOrder(db, orderId, workshopId);
    if (!order) return { ok: false, error: "Orden no encontrada." };
    order.notas_internas = notas.trim() || null;
    order.updated_at = nowISO();
    pushEvent(db, order, "nota", "Notas internas actualizadas", actor);
    return { ok: true, id: order.id };
  });
}

export function updateEstimatedDate(orderId: string, fecha: string | null, actor: Actor, workshopId: string): ResultadoOp {
  return mutate((db) => {
    const order = findOrder(db, orderId, workshopId);
    if (!order) return { ok: false, error: "Orden no encontrada." };
    order.fecha_estimada_entrega = fecha;
    order.updated_at = nowISO();
    pushEvent(db, order, "nota", fecha ? `Fecha estimada de entrega actualizada: ${formatDate(fecha)} (estimación, no promesa)` : "Fecha estimada de entrega eliminada", actor);
    return { ok: true, id: order.id };
  });
}

export function saveDiagnostic(orderId: string, descripcion: string, recomendaciones: string, actor: Actor, workshopId: string): ResultadoOp {
  return mutate((db) => {
    const order = findOrder(db, orderId, workshopId);
    if (!order) return { ok: false, error: "Orden no encontrada." };
    const vehicle = db.vehicles.find((v) => v.id === order.vehicle_id)!;
    db.diagnostics.push({ id: uid("dia"), service_order_id: order.id, descripcion: descripcion.trim(), recomendaciones: recomendaciones.trim(), creado_por: actor.id, created_at: nowISO() });
    pushEvent(db, order, "diagnostico", "Diagnóstico registrado", actor);
    notify({ db, workshopId, destinatarioTipo: "customer", destinatarioId: order.customer_id, tipo: "diagnostico_listo", titulo: "Diagnóstico listo", cuerpo: `Ya tenemos el diagnóstico de tu ${vehLabel(vehicle)} (Orden ${order.numero}). Revísalo en tu portal; pronto recibirás el presupuesto para tu aprobación.`, serviceOrderId: order.id });
    pushAudit(db, workshopId, actor, "diagnostico.registrar", "diagnostics", order.id);
    return { ok: true, id: order.id };
  });
}

export function createEstimateDraft(input: EstimateCreateInput, actor: Actor, workshopId: string): Estimate {
  return mutate((db) => {
    const order = findOrder(db, input.service_order_id, workshopId);
    if (!order) throw new Error("Orden no encontrada en este taller");

    const existentes = db.estimates.filter((e) => e.service_order_id === order.id);
    const version = existentes.reduce((m, e) => Math.max(m, e.version), 0) + 1;
    for (const e of existentes) if (e.estado === "borrador" || e.estado === "enviada") e.estado = "superada";

    const items: EstimateItem[] = input.items.map((i) => ({
      id: uid("eit"), estimate_id: "", tipo: i.tipo, descripcion: i.descripcion.trim(),
      cantidad: i.cantidad, precio_unitario: i.precio_unitario,
      subtotal: Math.round(i.cantidad * i.precio_unitario), estado: "pendiente", requiere_autorizacion: true,
      criticidad: i.criticidad ?? "recomendado", alternativa_descripcion: i.alternativa_descripcion?.trim() || null,
      alternativa_precio_unitario: i.alternativa_precio_unitario ?? null,
      taller_recomienda: i.alternativa_precio_unitario != null ? i.taller_recomienda ?? "principal" : null,
    }));

    const tot = calcularTotales(items, input.descuento, input.impuesto_porcentaje);
    const estimate: Estimate = {
      id: uid("est"), service_order_id: order.id, workshop_id: workshopId, version,
      subtotal: tot.subtotal, descuento: input.descuento, impuesto_porcentaje: input.impuesto_porcentaje,
      impuestos: tot.impuestos, total: tot.total, estado: "borrador", validez_dias: input.validez_dias,
      creado_por: actor.id, created_at: nowISO(), enviada_at: null, decidida_at: null,
    };
    for (const i of items) i.estimate_id = estimate.id;

    db.estimates.push(estimate);
    db.estimate_items.push(...items);
    order.updated_at = nowISO();

    pushEvent(db, order, "presupuesto", `Presupuesto v${version} creado (borrador) · Total ${formatCOP(estimate.total)}`, actor);
    pushAudit(db, workshopId, actor, "presupuesto.crear", "estimates", estimate.id, { version, total: estimate.total });
    return estimate;
  });
}

const CRITICIDAD_LABEL: Record<string, string> = {
  urgente: "🟢 Urgente · seguridad", recomendado: "🟡 Recomendado pronto", puede_esperar: "🔴 Puede esperar",
};

export function setItemCriticidad(
  estimateId: string, itemId: string,
  criticidad: "urgente" | "recomendado" | "puede_esperar",
  actor: Actor, workshopId: string
): ResultadoOp {
  return mutate((db) => {
    const est = db.estimates.find((e) => e.id === estimateId && e.workshop_id === workshopId);
    if (!est) return { ok: false, error: "Presupuesto no encontrado en este taller." };
    if (est.estado !== "borrador") {
      return { ok: false, error: `El semáforo solo se edita mientras el presupuesto es borrador (estado actual: "${est.estado}"). Lo que el cliente vio o aprobó no se modifica: crea una versión nueva.` };
    }
    const item = db.estimate_items.find((i) => i.id === itemId && i.estimate_id === est.id);
    if (!item) return { ok: false, error: "Ítem no encontrado en este presupuesto." };
    const anterior = item.criticidad ?? "recomendado";
    if (anterior === criticidad) return { ok: true, id: item.id };
    item.criticidad = criticidad;

    const order = db.service_orders.find((o) => o.id === est.service_order_id);
    if (order) {
      pushEvent(db, order, "presupuesto", `Semáforo de "${item.descripcion}" → ${CRITICIDAD_LABEL[criticidad]} (presupuesto v${est.version}, borrador)`, actor);
    }
    pushAudit(db, workshopId, actor, "presupuesto.semaforo", "estimate_items", item.id, { estimate_id: est.id, de: anterior, a: criticidad });
    return { ok: true, id: item.id };
  });
}

export function sendEstimate(estimateId: string, actor: Actor, workshopId: string): ResultadoOp {
  return mutate((db) => {
    const est = db.estimates.find((e) => e.id === estimateId && e.workshop_id === workshopId);
    if (!est) return { ok: false, error: "Presupuesto no encontrado." };
    if (est.estado !== "borrador") return { ok: false, error: `El presupuesto ya está en estado "${est.estado}".` };
    const order = findOrder(db, est.service_order_id, workshopId);
    if (!order) return { ok: false, error: "Orden no encontrada." };
    const vehicle = db.vehicles.find((v) => v.id === order.vehicle_id)!;
    const customer = db.customers.find((c) => c.id === order.customer_id)!;

    est.estado = "enviada";
    est.enviada_at = nowISO();
    order.updated_at = nowISO();

    if (order.estado !== "esperando_aprobacion") {
      const validacion = validarTransicion(order.estado, "esperando_aprobacion", { estimateActual: est, itemsEstimateActual: itemsOfEstimate(db, est.id) });
      if (!validacion.ok) return { ok: false, error: validacion.error };
      applyStatus(db, order, "esperando_aprobacion", actor, { nota: `Presupuesto v${est.version} enviado al cliente`, notificarCliente: false });
    } else {
      pushEvent(db, order, "presupuesto", `Presupuesto v${est.version} enviado al cliente · Total ${formatCOP(est.total)}`, actor);
    }

    notify({ db, workshopId, destinatarioTipo: "customer", destinatarioId: customer.id, tipo: "presupuesto_pendiente", titulo: "Presupuesto pendiente de aprobación", cuerpo: `El presupuesto v${est.version} de tu ${vehLabel(vehicle)} está listo: ${formatCOP(est.total)}. Entra a tu portal para ver el detalle y aprobar o rechazar cada trabajo. Validez: ${est.validez_dias} días.`, link: `/seguimiento/${customer.portal_token}`, serviceOrderId: order.id });
    pushAudit(db, workshopId, actor, "presupuesto.enviar", "estimates", est.id, { version: est.version, total: est.total });
    return { ok: true, id: est.id };
  });
}

export function recordDecision(
  estimateId: string,
  decisiones: { item_id: string; decision: "aprobar" | "rechazar" | "postergar"; opcion?: "principal" | "alternativa" }[],
  comentario: string | undefined, customer: Customer,
  workshopId: string
): ResultadoOp {
  return mutate((db) => {
    const est = db.estimates.find((e) => e.id === estimateId && e.workshop_id === workshopId);
    if (!est) return { ok: false, error: "Presupuesto no encontrado." };
    if (est.estado !== "enviada") return { ok: false, error: "Este presupuesto ya no acepta decisiones (fue decidido o superado por una versión nueva)." };
    const order = findOrder(db, est.service_order_id, workshopId);
    if (!order) return { ok: false, error: "Orden no encontrada." };
    if (order.customer_id !== customer.id) return { ok: false, error: "No puedes decidir sobre presupuestos de otro cliente." };
    const vehicle = db.vehicles.find((v) => v.id === order.vehicle_id)!;

    const items = itemsOfEstimate(db, est.id);
    const actor: Actor = { id: customer.id, nombre: customer.nombre };

    for (const d of decisiones) {
      const item = items.find((i) => i.id === d.item_id);
      if (item && item.estado === "pendiente") {
        item.estado = d.decision === "aprobar" ? "aprobada" : d.decision === "postergar" ? "postergada" : "rechazada";
      }
    }

    const pendientes = items.filter((i) => i.requiere_autorizacion && i.estado === "pendiente");
    if (pendientes.length > 0) {
      pushEvent(db, order, "autorizacion", `Decisión parcial del cliente (${decisiones.length} ítems). Quedan ${pendientes.length} pendientes.`, actor);
      return { ok: true, id: est.id };
    }

    const aprobados = items.filter((i) => i.estado === "aprobada");
    const rechazados = items.filter((i) => i.estado === "rechazada");
    const postergados = items.filter((i) => i.estado === "postergada");
    est.decidida_at = nowISO();

    const opcionDe = (itemId: string) => decisiones.find((d) => d.item_id === itemId)?.opcion;
    const precioElegido = (i: EstimateItem): number =>
      opcionDe(i.id) === "alternativa" && i.alternativa_precio_unitario != null ? i.alternativa_precio_unitario : i.precio_unitario;
    const conAlternativa = aprobados.filter((i) => opcionDe(i.id) === "alternativa" && i.alternativa_precio_unitario != null);
    const brutoTotal = items.reduce((s, i) => s + i.subtotal, 0);
    const brutoAprobado = aprobados.reduce((s, i) => s + precioElegido(i) * i.cantidad, 0);
    const descProporcional = brutoTotal > 0 ? est.descuento * (brutoAprobado / brutoTotal) : 0;
    const baseAprobada = Math.max(0, brutoAprobado - descProporcional);
    const montoAprobado = Math.round(baseAprobada * (1 + est.impuesto_porcentaje / 100));

    const authorization: Authorization = {
      id: uid("aut"), estimate_id: est.id, service_order_id: order.id, workshop_id: workshopId,
      version_aceptada: est.version,
      decision: aprobados.length === 0
        ? rechazados.length > 0 && postergados.length === 0 ? "rechazada" : "postergada"
        : rechazados.length === 0 && postergados.length === 0 ? "aprobada_total" : "aprobada_parcial",
      decided_by: customer.id, decided_by_nombre: customer.nombre, monto_aprobado: montoAprobado,
      items_aprobados: aprobados.map((i) => i.id), items_rechazados: rechazados.map((i) => i.id),
      items_postergados: postergados.map((i) => i.id), items_con_alternativa: conAlternativa.map((i) => i.id),
      created_at: nowISO(),
    };
    db.authorizations.push(authorization);

    if (aprobados.length > 0) {
      est.estado = rechazados.length === 0 && postergados.length === 0 ? "aprobada" : "parcialmente_aprobada";
      pushEvent(db, order, "autorizacion", `Cliente ${authorization.decision === "aprobada_total" ? "aprobó" : "aprobó parcialmente"} el presupuesto v${est.version} · Monto aprobado ${formatCOP(montoAprobado)}${rechazados.length ? ` · ${rechazados.length} trabajo(s) rechazado(s)` : ""}${postergados.length ? ` · ${postergados.length} trabajo(s) aplazado(s) para después` : ""}${conAlternativa.length ? ` · Eligió HOMOLOGADO en: ${conAlternativa.map((i) => i.descripcion).join(", ")}` : ""}`, actor);
      if (order.estado === "esperando_aprobacion") {
        applyStatus(db, order, "autorizado", actor, { nota: `Presupuesto v${est.version} ${authorization.decision === "aprobada_total" ? "aprobado" : "parcialmente aprobado"} por el cliente`, notificarCliente: false });
      }
      notify({ db, workshopId, destinatarioTipo: "customer", destinatarioId: customer.id, tipo: "presupuesto_aprobado", titulo: "Decisión registrada", cuerpo: `Aprobaste ${aprobados.length} trabajo(s) del presupuesto v${est.version} de tu ${vehLabel(vehicle)} por ${formatCOP(montoAprobado)}${rechazados.length ? ` y rechazaste ${rechazados.length}` : ""}${postergados.length ? `. Aplazaste ${postergados.length} trabajo(s): el taller avanzará con lo autorizado y podrá proponerte los aplazados más adelante` : ""}. El taller iniciará los trabajos autorizados.`, canales: ["in_app"], serviceOrderId: order.id });
      notifyStaffGestion(db, workshopId, "presupuesto_aprobado", `Presupuesto aprobado · ${order.numero}`, `${customer.nombre} ${authorization.decision === "aprobada_total" ? "aprobó" : "aprobó parcialmente"} el presupuesto v${est.version} de ${vehLabel(vehicle)} · Monto aprobado: ${formatCOP(montoAprobado)}${rechazados.length ? ` · Rechazó: ${rechazados.map((r) => r.descripcion).join(", ")}` : ""}${postergados.length ? ` · APLAZÓ para después: ${postergados.map((r) => r.descripcion).join(", ")}` : ""}${conAlternativa.length ? ` · ELIGIÓ HOMOLOGADO en: ${conAlternativa.map((i) => `${i.descripcion} (${i.alternativa_descripcion ?? "alternativa"})`).join(", ")}` : ""}`, order.id);
    } else if (aprobados.length === 0 && postergados.length > 0 && rechazados.length === 0) {
      est.estado = "postergada";
      pushEvent(db, order, "autorizacion", `Cliente aplazó todos los trabajos del presupuesto v${est.version}${comentario ? ` · Comentario: "${comentario}"` : ""}`, actor);
      notify({ db, workshopId, destinatarioTipo: "customer", destinatarioId: customer.id, tipo: "presupuesto_postergado", titulo: "Trabajos aplazados", cuerpo: `Aplazaste los trabajos del presupuesto v${est.version}. Cuando estés listo, escribe al taller por el portal o pide una versión actualizada.`, canales: ["in_app"], serviceOrderId: order.id });
      notifyStaffGestion(db, workshopId, "presupuesto_postergado", `Cliente APLAZÓ todo · ${order.numero}`, `${customer.nombre} aplazó todos los trabajos del presupuesto v${est.version} de ${vehLabel(vehicle)}: ${postergados.map((r) => r.descripcion).join(", ")}.${comentario ? ` Comentario: "${comentario}"` : ""} Hacer seguimiento.`, order.id);
    } else {
      est.estado = "rechazada";
      pushEvent(db, order, "autorizacion", `Cliente rechazó el presupuesto v${est.version} completo.${comentario ? ` Comentario: "${comentario}"` : ""}`, actor);
      notify({ db, workshopId, destinatarioTipo: "customer", destinatarioId: customer.id, tipo: "presupuesto_rechazado", titulo: "Rechazo registrado", cuerpo: `Registramos tu rechazo del presupuesto v${est.version}. El taller te contactará para revisar alternativas o ajustar el presupuesto.`, canales: ["in_app"], serviceOrderId: order.id });
      notifyStaffGestion(db, workshopId, "presupuesto_rechazado", `Presupuesto RECHAZADO · ${order.numero}`, `${customer.nombre} rechazó el presupuesto v${est.version} de ${vehLabel(vehicle)}.${comentario ? ` Comentario: "${comentario}"` : ""} Se requiere una versión nueva o cancelar la orden.`, order.id);
    }

    if (comentario?.trim()) {
      db.messages.push({ id: uid("msg"), service_order_id: order.id, workshop_id: workshopId, remitente_tipo: "customer", remitente_id: customer.id, remitente_nombre: customer.nombre, contenido: comentario.trim(), leido: false, created_at: nowISO() });
      notifyStaffGestion(db, workshopId, "mensaje_nuevo", `Mensaje del cliente · ${order.numero}`, `${customer.nombre}: "${comentario.trim().slice(0, 140)}"`, order.id);
    }

    pushAudit(db, workshopId, actor, "autorizacion.registrar", "authorizations", authorization.id, { version: est.version, decision: authorization.decision, monto: montoAprobado });
    order.updated_at = nowISO();
    return { ok: true, id: est.id };
  });
}

export function deliverOrder(orderId: string, valorFinal: number, actor: Actor, workshopId: string, nota?: string): ResultadoOp {
  return mutate((db) => {
    const order = findOrder(db, orderId, workshopId);
    if (!order) return { ok: false, error: "Orden no encontrada." };
    if (order.estado !== "listo_entrega") return { ok: false, error: `Solo se puede entregar una orden en estado "Listo para entregar" (actual: "${ESTADO_LABEL[order.estado]}").` };
    order.valor_final = valorFinal;
    applyStatus(db, order, "entregado", actor, { nota: nota || `Entrega del vehículo · Valor final ${formatCOP(valorFinal)}` });
    pushEvent(db, order, "entrega", `Vehículo entregado al cliente · Valor final ${formatCOP(valorFinal)}`, actor);
    pushAudit(db, workshopId, actor, "orden.entregar", "service_orders", order.id, { valor_final: valorFinal });
    return { ok: true, id: order.id };
  });
}

export function rateOrder(orderId: string, calificacion: number, comentario: string | undefined, customer: Customer, workshopId: string): ResultadoOp {
  return mutate((db) => {
    const order = findOrder(db, orderId, workshopId);
    if (!order || order.customer_id !== customer.id) return { ok: false, error: "Orden no encontrada." };
    if (order.estado !== "entregado") return { ok: false, error: "Solo puedes calificar un servicio ya entregado." };
    if (order.calificacion) return { ok: false, error: "Esta orden ya fue calificada. ¡Gracias!" };
    order.calificacion = calificacion;
    order.calificacion_comentario = comentario?.trim() || null;
    pushEvent(db, order, "nota", `Cliente calificó el servicio: ${calificacion}/5${comentario ? ` · "${comentario.trim()}"` : ""}`, { id: customer.id, nombre: customer.nombre });
    notifyStaffGestion(db, workshopId, "calificacion", `Nueva calificación · ${order.numero}`, `${customer.nombre} calificó el servicio con ${calificacion}/5 estrellas.${comentario ? ` Comentario: "${comentario.trim().slice(0, 120)}"` : ""}`, order.id);
    return { ok: true, id: order.id };
  });
}

export function sendMessage(
  orderId: string, remitenteTipo: "staff" | "customer", remitenteId: string,
  remitenteNombre: string, contenido: string, workshopId: string
): Message | null {
  return mutate((db) => {
    const order = findOrder(db, orderId, workshopId);
    if (!order) return null;

    const msg: Message = {
      id: uid("msg"), service_order_id: order.id, workshop_id: workshopId,
      remitente_tipo: remitenteTipo, remitente_id: remitenteId, remitente_nombre: remitenteNombre,
      contenido: contenido.trim(), leido: false, created_at: nowISO(),
    };
    db.messages.push(msg);
    order.updated_at = nowISO();

    if (remitenteTipo === "staff") {
      notify({ db, workshopId, destinatarioTipo: "customer", destinatarioId: order.customer_id, tipo: "mensaje_nuevo", titulo: `Mensaje del taller · ${order.numero}`, cuerpo: `${remitenteNombre}: "${contenido.trim().slice(0, 160)}"`, serviceOrderId: order.id });
      for (const m of db.messages) if (m.service_order_id === order.id && m.remitente_tipo === "customer") m.leido = true;
    } else {
      notifyStaffGestion(db, workshopId, "mensaje_nuevo", `Mensaje del cliente · ${order.numero}`, `${remitenteNombre}: "${contenido.trim().slice(0, 160)}"`, order.id);
      for (const m of db.messages) if (m.service_order_id === order.id && m.remitente_tipo === "staff") m.leido = false;
    }
    return msg;
  });
}

export function markThreadRead(orderId: string, viewerTipo: "staff" | "customer", workshopId: string): void {
  mutate((db) => {
    for (const m of db.messages) if (m.service_order_id === orderId && m.workshop_id === workshopId && m.remitente_tipo !== viewerTipo) m.leido = true;
  });
}

export function addMedia(
  orderId: string, data: { categoria: CategoriaMedia; nombre: string; url: string; visible_cliente: boolean },
  actor: Actor, workshopId: string
): ResultadoOp {
  return mutate((db) => {
    const order = findOrder(db, orderId, workshopId);
    if (!order) return { ok: false, error: "Orden no encontrada." };
    db.order_media.push({ id: uid("med"), service_order_id: order.id, workshop_id: workshopId, categoria: data.categoria, nombre: data.nombre, url: data.url, autor_id: actor.id, autor_nombre: actor.nombre, visible_cliente: data.visible_cliente, created_at: nowISO() });
    pushEvent(db, order, "evidencia", `Evidencia cargada (${data.categoria}): ${data.nombre}`, actor);
    pushAudit(db, workshopId, actor, "media.cargar", "order_media", order.id, { categoria: data.categoria });
    return { ok: true, id: order.id };
  });
}

export function markNotificationsRead(destTipo: "user" | "customer", destId: string, ids?: string[]): number {
  return mutate((db) => {
    let count = 0;
    for (const nt of db.notifications) {
      if (nt.destinatario_tipo !== destTipo || nt.destinatario_id !== destId || nt.canal !== "in_app") continue;
      if (ids && !ids.includes(nt.id)) continue;
      if (nt.estado !== "leida") { nt.estado = "leida"; nt.leida_at = nowISO(); count++; }
    }
    return count;
  });
}

export function registerWorkshop(input: { taller_nombre: string; ciudad: string; telefono: string; nit?: string; nombre: string; correo: string; password: string; acepta_terminos?: boolean }): { ok: boolean; error?: string; workshopId?: string; userId?: string } {
  if (!input.acepta_terminos) return { ok: false, error: "Debes aceptar los términos de uso y la política de tratamiento de datos." };
  return mutate((db) => {
    const correo = input.correo.trim().toLowerCase();
    if (db.users.some((u) => u.correo === correo) || db.customer_accounts.some((a) => a.correo === correo)) return { ok: false, error: "correo registrado como cliente o taller" };
    const workshopId = uid("ws");
    const publicLinkToken = uid("tpub");
    db.workshops.push({ id: workshopId, nombre: input.taller_nombre.trim(), nit: input.nit?.trim() || null, direccion: "", ciudad: input.ciudad.trim(), telefono: input.telefono.trim(), plan: "pro", estado: "en_prueba", enlace_publico: publicLinkToken, acepta_vehiculos: true, cupos_disponibles: 5, created_at: nowISO() });
    const userId = uid("usr");
    db.users.push({ id: userId, nombre: input.nombre.trim(), correo, telefono: input.telefono.trim(), estado: "activo", password_hash: hashPassword(input.password), session_version: 0, created_at: nowISO() });
    db.workshop_members.push({ id: uid("wmem"), workshop_id: workshopId, user_id: userId, rol: "owner", permisos: ["*"], activo: true, created_at: nowISO() });
    const fin = new Date(Date.now() + 7 * 86_400_000).toISOString();
    db.subscriptions.push({ id: uid("sub"), workshop_id: workshopId, plan: "pro", estado: "en_prueba", inicio: nowISO(), fin, created_at: nowISO() });
    db.audit_logs.push({ id: uid("aud"), workshop_id: workshopId, actor_id: userId, actor_nombre: input.nombre.trim(), accion: "taller.registrar", entidad: "workshops", entidad_id: workshopId, detalle: { plan: "pro", estado: "en_prueba", origen: "registro_publico", acepta_terminos: true, consentimiento_datos_at: nowISO() }, created_at: nowISO() });
    return { ok: true, workshopId, userId };
  });
}

export function caducarSuscripcionesVencidas(): { suscripcionesVencidas: number; talleresSuspendidos: number } {
  return mutate((db) => {
    const ahora = nowISO();
    let suscripcionesVencidas = 0;
    let talleresSuspendidos = 0;
    const vencidas = db.subscriptions.filter((s) => s.estado === "en_prueba" && new Date(s.fin) < new Date(ahora));

    for (const sub of vencidas) {
      sub.estado = "activa";
      sub.plan = "starter";
      suscripcionesVencidas++;
      const ws = db.workshops.find((w) => w.id === sub.workshop_id);
      if (ws && ws.estado === "en_prueba") { ws.estado = "activo"; ws.plan = "starter"; talleresSuspendidos++; }
      db.audit_logs.push({ id: uid("aud"), workshop_id: sub.workshop_id, actor_id: null, actor_nombre: "Sistema", accion: "suscripcion.caducar", entidad: "subscriptions", entidad_id: sub.id, detalle: { plan: "starter", motivo: "prueba_vencida", fin: sub.fin }, created_at: ahora });
    }
    return { suscripcionesVencidas, talleresSuspendidos };
  });
}

export function updateWorkshopProfile(
  workshopId: string,
  datos: { nombre?: string; direccion?: string; ciudad?: string; telefono?: string; nit?: string; logo_url?: string | null; google_maps_url?: string | null },
  actor: Actor
): ResultadoOp {
  return mutate((db) => {
    const ws = db.workshops.find((w) => w.id === workshopId);
    if (!ws) return { ok: false, error: "Taller no encontrado." };
    if (datos.nombre !== undefined) ws.nombre = datos.nombre.trim();
    if (datos.direccion !== undefined) ws.direccion = datos.direccion.trim();
    if (datos.ciudad !== undefined) ws.ciudad = datos.ciudad.trim();
    if (datos.telefono !== undefined) ws.telefono = datos.telefono.trim();
    if (datos.nit !== undefined) ws.nit = datos.nit.trim() || null;
    if (datos.logo_url !== undefined) ws.logo_url = datos.logo_url?.trim() || null;
    if (datos.google_maps_url !== undefined) ws.google_maps_url = datos.google_maps_url?.trim() || null;
    pushAudit(db, workshopId, actor, "taller.actualizar", "workshops", workshopId, { nombre: datos.nombre, direccion: datos.direccion, ciudad: datos.ciudad, telefono: datos.telefono, nit: datos.nit });
    return { ok: true, id: workshopId };
  });
}

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

export function generarPasswordTemporal(): string {
  return crypto.randomBytes(8).toString("base64url").replace(/[-_]/g, "x").slice(0, 10);
}

export interface ResultadoInvitacion extends ResultadoOp {
  passwordTemporal?: string | null;
  yaExiste?: boolean;
  memberId?: string;
}

export function inviteMember(
  workshopId: string,
  datos: { nombre: string; correo: string; telefono: string; rol: "owner" | "advisor" | "mechanic"; password?: string },
  actor: Actor
): ResultadoInvitacion {
  return mutate((db) => {
    const correo = datos.correo.trim().toLowerCase();
    let user = db.users.find((u) => u.correo === correo);
    let passwordTemporal: string | null = null;
    const yaExiste = Boolean(user);

    if (!user) {
      passwordTemporal = datos.password?.trim() ? datos.password.trim() : generarPasswordTemporal();
      user = { id: uid("usr"), nombre: datos.nombre.trim(), correo, telefono: datos.telefono.trim(), estado: "activo", password_hash: hashPassword(passwordTemporal), session_version: 0, created_at: nowISO() };
      db.users.push(user);
    }
    const existente = db.workshop_members.find((m) => m.workshop_id === workshopId && m.user_id === user!.id);
    if (existente) return { ok: false, error: "Esa persona ya es miembro del taller." };

    const cupoMiembros = validarCupoMiembros(db, workshopId);
    if (!cupoMiembros.ok) return { ok: false, error: cupoMiembros.error };
    const memberId = uid("wmem");
    db.workshop_members.push({ id: memberId, workshop_id: workshopId, user_id: user.id, rol: datos.rol, permisos: datos.rol === "owner" ? ["*"] : [], activo: true, created_at: nowISO() });
    pushAudit(db, workshopId, actor, "miembro.invitar", "workshop_members", user.id, { rol: datos.rol, cuenta_creada_por_el_taller: !yaExiste, password_temporal_generada: passwordTemporal !== null && !datos.password?.trim() });
    return { ok: true, id: user.id, memberId, passwordTemporal, yaExiste };
  });
}

export function resetMemberPassword(
  workshopId: string, memberId: string, actor: Actor, newPassword?: string
): ResultadoInvitacion {
  return mutate((db) => {
    const member = db.workshop_members.find((m) => m.id === memberId && m.workshop_id === workshopId);
    if (!member) return { ok: false, error: "Miembro no encontrado en este taller." };
    const user = db.users.find((u) => u.id === member.user_id);
    if (!user) return { ok: false, error: "Usuario no encontrado." };
    const passwordTemporal = newPassword?.trim() ? newPassword.trim() : generarPasswordTemporal();
    user.password_hash = hashPassword(passwordTemporal);
    user.estado = "activo";
    user.session_version = (user.session_version ?? 0) + 1;
    pushAudit(db, workshopId, actor, "miembro.nueva_password", "users", user.id, { definida_por: newPassword?.trim() ? "taller" : "generada" });
    return { ok: true, id: user.id, passwordTemporal };
  });
}

export function updateMemberRole(
  workshopId: string, memberId: string,
  datos: { rol?: "owner" | "advisor" | "mechanic"; activo?: boolean },
  actor: Actor
): ResultadoOp {
  return mutate((db) => {
    const m = db.workshop_members.find((x) => x.id === memberId && x.workshop_id === workshopId);
    if (!m) return { ok: false, error: "Miembro no encontrado." };
    if (datos.rol) m.rol = datos.rol;
    if (datos.activo !== undefined) m.activo = datos.activo;
    pushAudit(db, workshopId, actor, "miembro.actualizar", "workshop_members", m.id, datos);
    return { ok: true, id: m.id };
  });
}

export function createCustomerAccount(input: { nombre: string; correo: string; telefono: string; password: string; acepta_terminos: boolean }): { ok: boolean; error?: string; accountId?: string } {
  if (!input.acepta_terminos) return { ok: false, error: "Debes autorizar el tratamiento de datos y aceptar los términos para crear la cuenta." };
  return mutate((db) => {
    const correo = input.correo.trim().toLowerCase();
    if (db.customer_accounts.some((a) => a.correo === correo && a.estado === "activo")) return { ok: false, error: "Ya existe una cuenta de cliente con ese correo. Inicia sesión." };
    const account: CustomerAccount = {
      id: uid("acc"), nombre: input.nombre.trim(), correo, telefono: input.telefono.trim(),
      estado: "activo", password_hash: hashPassword(input.password), consentimiento_datos_at: nowISO(), created_at: nowISO(),
    };
    db.customer_accounts.push(account);
    db.audit_logs.push({ id: uid("aud"), workshop_id: null, actor_id: account.id, actor_nombre: account.nombre, accion: "cuenta_cliente.crear", entidad: "customer_accounts", entidad_id: account.id, detalle: { consentimiento_datos_at: account.consentimiento_datos_at, vinculacion: "solo_por_enlace_personal" }, created_at: nowISO() });
    return { ok: true, accountId: account.id };
  });
}

export function loginCustomerAccount(correo: string, password: string): { ok: boolean; error?: string; accountId?: string } {
  const encontrado = query((db) => db.customer_accounts.find((a) => a.correo === correo.trim().toLowerCase()) ?? null);
  if (!encontrado || !comparePassword(password, encontrado.password_hash ?? encontrado.password_demo ?? "")) return { ok: false, error: "Correo o contraseña incorrectos." };
  if (encontrado.estado !== "activo") return { ok: false, error: "Esta cuenta fue eliminada. Puedes crear una nueva con el mismo correo." };
  return { ok: true, accountId: encontrado.id };
}

export function linkCustomerByToken(accountId: string, token: string): ResultadoOp {
  return mutate((db) => {
    const account = db.customer_accounts.find((a) => a.id === accountId && a.estado === "activo");
    if (!account) return { ok: false, error: "Cuenta no encontrada." };
    const cliente = db.customers.find((c) => c.portal_token === token);
    if (!cliente || cliente.anonimizado) return { ok: false, error: "Enlace inválido o expirado. Pide uno nuevo a tu taller." };
    if (cliente.portal_activo === false) return { ok: false, error: "Ese enlace fue anulado cuando desvinculaste la ficha. Pide a tu taller que genere un enlace nuevo y vincúlalo." };
    const wsId = cliente.workshop_id;
    if (!wsId) return { ok: false, error: "La ficha no está asociada a ningún taller. Pide al taller que configure la ficha." };
    const existente = db.customer_account_links.find((l) => l.customer_id === cliente.id);
    if (existente) {
      if (existente.account_id === accountId) return { ok: false, error: "Esa ficha ya está vinculada a tu cuenta." };
      return { ok: false, error: "Este enlace está en uso: la ficha ya se encuentra vinculada a la cuenta de otra persona. Por privacidad no es posible añadirla a tu cuenta. Si es tuya, desvincúlala primero desde la otra cuenta." };
    }
    db.customer_account_links.push({ id: uid("lnk"), account_id: accountId, customer_id: cliente.id, workshop_id: wsId, origen: "token", estado: "pendiente", created_at: nowISO() });
    db.audit_logs.push({ id: uid("aud"), workshop_id: wsId, actor_id: accountId, actor_nombre: account.nombre, accion: "cuenta_cliente.vincular_solicitar", entidad: "customer_account_links", entidad_id: cliente.id, detalle: { origen: "token", estado: "pendiente" }, created_at: nowISO() });
    notifyStaffGestion(db, wsId, "vinculacion_solicitada", `Nueva solicitud de vinculación · ${cliente.nombre}`, `${account.nombre} (${account.correo}) solicitó vincular su ficha "${cliente.nombre}" a tu taller.`);

    const ws = db.workshops.find((w) => w.id === wsId);
    notifyCustomerLinkSent(
      db,
      wsId,
      cliente.id,
      ws?.nombre ?? "tu taller",
      account.nombre,
      `/seguimiento/${cliente.portal_token}`,
    );

    return { ok: true, id: cliente.id, pendiente: true };
  });
}

export function unlinkCustomer(accountId: string, customerId: string): ResultadoOp {
  return mutate((db) => {
    const idx = db.customer_account_links.findIndex((l) => l.account_id === accountId && l.customer_id === customerId);
    if (idx < 0) return { ok: false, error: "Vinculación no encontrada." };
    const account = db.customer_accounts.find((a) => a.id === accountId);
    desvincularFicha(db, accountId, account?.nombre ?? "Cuenta de cliente", customerId, "desvinculacion");
    return { ok: true, id: customerId };
  });
}

function desvincularFicha(db: Database, accountId: string, accountNombre: string, customerId: string, motivo: string): void {
  db.customer_account_links = db.customer_account_links.filter((l) => !(l.account_id === accountId && l.customer_id === customerId));
  const retirados = retirarVehiculosDeCuenta(db, accountId, customerId, motivo);
  const customer = db.customers.find((c) => c.id === customerId);
  if (!customer) return;
  customer.portal_activo = false;
  customer.portal_token = uid("tok_anulado");

  db.audit_logs.push({ id: uid("aud"), workshop_id: customer.workshop_id, actor_id: accountId, actor_nombre: accountNombre, accion: "cuenta_cliente.desvincular", entidad: "customer_account_links", entidad_id: customerId, detalle: { vehiculos_retirados: retirados, enlace_anulado: true, motivo }, created_at: nowISO() });
  notifyStaffGestion(db, customer.workshop_id, "cliente_desvinculado", `Cliente desvinculó su ficha · ${customer.nombre}`, `${accountNombre} desvinculó su ficha de tu taller: el enlace de seguimiento que le compartiste quedó ANULADO (ya no funciona) y ${retirados > 0 ? `retiró ${retirados} vehículo(s) que había registrado` : "no tenía vehículos registrados por él/ella"}. La ficha y su historial se conservan. Si vuelves a atenderle, genera un enlace NUEVO en Configuración → Portales de clientes.`, null, `/taller/clientes/${customer.id}`);
}

export function regenerateCustomerPortalLink(customerId: string, workshopId: string, actor: Actor): ResultadoOp {
  return mutate((db) => {
    const customer = db.customers.find((c) => c.id === customerId && c.workshop_id === workshopId);
    if (!customer) return { ok: false, error: "Cliente no encontrado en este taller." };
    if (customer.anonimizado) return { ok: false, error: "Ficha anonimizada: no se puede generar un enlace (solicitud de supresión)." };
    if (customer.portal_activo !== false) return { ok: false, error: "El enlace actual sigue activo. Solo se genera uno nuevo para fichas desvinculadas." };

    customer.portal_token = uid("tok");
    customer.portal_activo = true;

    const workshop = db.workshops.find((w) => w.id === workshopId);
    notify({ db, workshopId, destinatarioTipo: "customer", destinatarioId: customer.id, tipo: "enlace_nuevo", titulo: "Tienes un enlace de seguimiento nuevo", cuerpo: `${workshop?.nombre ?? "El taller"} generó un enlace personal nuevo para ti (el anterior quedó anulado). Úsalo para ver tus servicios, aprobar presupuestos y escribirles: /seguimiento/${customer.portal_token}`, link: `/seguimiento/${customer.portal_token}` });

    pushAudit(db, workshopId, actor, "cliente.regenerar_enlace", "customers", customer.id, { nota: "El taller generó un enlace nuevo; el anterior permanece anulado", cliente_notificado: true });
    return { ok: true, id: customer.id };
  });
}

function retirarVehiculosDeCuenta(db: Database, accountId: string, customerId: string, motivo: string): number {
  const propios = db.vehicles.filter((v) => v.customer_id === customerId && v.origen === "cliente" && v.registrado_por_account_id === accountId);
  let retirados = 0;
  for (const v of propios) {
    const enUso = db.service_orders.some((o) => o.vehicle_id === v.id);
    if (enUso) continue;
    db.vehicles = db.vehicles.filter((x) => x.id !== v.id);
    retirados++;
    db.audit_logs.push({ id: uid("aud"), workshop_id: v.workshop_id, actor_id: accountId, actor_nombre: "Cuenta de cliente", accion: "cliente.retirar_vehiculo", entidad: "vehicles", entidad_id: v.id, detalle: { placa: v.placa, motivo }, created_at: nowISO() });
  }
  return retirados;
}

export function updateCustomerAccountProfile(accountId: string, datos: { nombre?: string; telefono?: string }): ResultadoOp {
  return mutate((db) => {
    const acc = db.customer_accounts.find((a) => a.id === accountId && a.estado === "activo");
    if (!acc) return { ok: false, error: "Cuenta no encontrada." };
    if (datos.nombre?.trim()) acc.nombre = datos.nombre.trim();
    if (datos.telefono?.trim()) acc.telefono = datos.telefono.trim();
    return { ok: true, id: acc.id };
  });
}

export function updateCustomerAccountPassword(accountId: string, passwordNueva: string): ResultadoOp {
  return mutate((db) => {
    const acc = db.customer_accounts.find((a) => a.id === accountId && a.estado === "activo");
    if (!acc) return { ok: false, error: "Cuenta no encontrada." };
    const { hashPassword } = require("@/lib/auth/password");
    acc.password_hash = hashPassword(passwordNueva);
    return { ok: true, id: acc.id };
  });
}

export function verifyCustomerPassword(accountId: string, password: string): boolean {
  return query((db) => {
    const acc = db.customer_accounts.find((a) => a.id === accountId && a.estado === "activo");
    if (!acc || !acc.password_hash) return false;
    return comparePassword(password, acc.password_hash);
  });
}

export function updateUserProfile(userId: string, datos: { nombre?: string; avatar_url?: string | null }): ResultadoOp {
  return mutate((db) => {
    const usr = db.users.find((u) => u.id === userId);
    if (!usr) return { ok: false, error: "Usuario no encontrado." };
    if (datos.nombre !== undefined) usr.nombre = datos.nombre.trim();
    if (datos.avatar_url !== undefined) usr.avatar_url = datos.avatar_url?.trim() || null;
    return { ok: true, id: usr.id };
  });
}

export function customerAddVehicle(
  accountId: string,
  input: { customer_id: string; placa: string; tipo: Vehicle["tipo"]; marca: string; modelo: string; anio: number; kilometraje: number; color?: string }
): ResultadoOp {
  return mutate((db) => {
    const account = db.customer_accounts.find((a) => a.id === accountId && a.estado === "activo");
    if (!account) return { ok: false, error: "Cuenta no encontrada." };

    const link = db.customer_account_links.find((l) => l.account_id === accountId && l.customer_id === input.customer_id && l.estado === "aceptado");
    if (!link) return { ok: false, error: "Esa ficha no está vinculada a tu cuenta." };

    const customer = db.customers.find((c) => c.id === input.customer_id && !c.anonimizado && c.portal_activo !== false);
    if (!customer) return { ok: false, error: "Ficha no disponible o desactivada." };
    const workshop = db.workshops.find((w) => w.id === customer.workshop_id);

    const placa = input.placa.trim().toUpperCase();
    if (db.vehicles.some((v) => v.workshop_id === customer.workshop_id && v.placa === placa)) {
      return { ok: false, error: `Ya existe un vehículo con la placa ${placa} en ${workshop?.nombre ?? "el taller"}. Si el dato está mal, avísales por el portal de tu orden.` };
    }

    const vehicle: Vehicle = {
      id: uid("veh"), workshop_id: customer.workshop_id, customer_id: customer.id, placa,
      tipo: input.tipo, marca: input.marca.trim(), modelo: input.modelo.trim(), anio: input.anio,
      kilometraje: input.kilometraje, color: input.color?.trim() || null, origen: "cliente", registrado_por_account_id: accountId, created_at: nowISO(),
    };
    db.vehicles.push(vehicle);

    pushAudit(db, customer.workshop_id, { id: accountId, nombre: account.nombre }, "cliente.registrar_vehiculo", "vehicles", vehicle.id, { placa: vehicle.placa, customer_id: customer.id });
    notifyStaffGestion(db, customer.workshop_id, "vehiculo_registrado_cliente", `Vehículo registrado por el cliente · ${vehicle.placa}`, `${account.nombre} registró desde su cuenta un ${vehicle.marca} ${vehicle.modelo} (${vehicle.placa}, ${vehicle.anio}). Ya aparece en tu panel de vehículos y al recibir sus órdenes.`);
    return { ok: true, id: vehicle.id };
  });
}

export function customerUpdateVehicle(
  accountId: string, vehicleId: string,
  datos: { placa?: string; tipo?: Vehicle["tipo"]; marca?: string; modelo?: string; anio?: number; kilometraje?: number; color?: string }
): ResultadoOp {
  return mutate((db) => {
    const account = db.customer_accounts.find((a) => a.id === accountId && a.estado === "activo");
    if (!account) return { ok: false, error: "Cuenta no encontrada." };
    const vehicle = db.vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) return { ok: false, error: "Vehículo no encontrado." };
    if (vehicle.origen !== "cliente" || vehicle.registrado_por_account_id !== accountId) return { ok: false, error: "Solo puedes editar los vehículos que tú registraste." };
    const sigueVinculado = db.customer_account_links.some((l) => l.account_id === accountId && l.customer_id === vehicle.customer_id && l.estado === "aceptado");
    if (!sigueVinculado) return { ok: false, error: "Tu ficha ya no está vinculada a esa cuenta." };

    if (datos.placa !== undefined) {
      const placa = datos.placa.trim().toUpperCase();
      if (db.vehicles.some((v) => v.workshop_id === vehicle.workshop_id && v.placa === placa && v.id !== vehicle.id)) return { ok: false, error: `Ya existe otro vehículo con la placa ${placa} en este taller.` };
      vehicle.placa = placa;
    }
    if (datos.tipo !== undefined) vehicle.tipo = datos.tipo;
    if (datos.marca !== undefined) vehicle.marca = datos.marca.trim();
    if (datos.modelo !== undefined) vehicle.modelo = datos.modelo.trim();
    if (datos.anio !== undefined) vehicle.anio = datos.anio;
    if (datos.kilometraje !== undefined) vehicle.kilometraje = datos.kilometraje;
    if (datos.color !== undefined) vehicle.color = datos.color.trim() || null;

    pushAudit(db, vehicle.workshop_id, { id: accountId, nombre: account.nombre }, "cliente.actualizar_vehiculo", "vehicles", vehicle.id, { ...datos });
    return { ok: true, id: vehicle.id };
  });
}

export function deleteCustomerAccount(accountId: string): ResultadoOp {
  return mutate((db) => {
    const acc = db.customer_accounts.find((a) => a.id === accountId);
    if (!acc) return { ok: false, error: "Cuenta no encontrada." };

    const links = db.customer_account_links.filter((l) => l.account_id === accountId);
    for (const l of links) desvincularFicha(db, accountId, acc.nombre, l.customer_id, "eliminacion_cuenta");

    acc.estado = "eliminado";
    acc.correo = `suprimido+${accountId}@invalido.local`;
    delete acc.password_demo;
    db.customer_account_links = db.customer_account_links.filter((l) => l.account_id !== accountId);
    db.audit_logs.push({ id: uid("aud"), workshop_id: null, actor_id: accountId, actor_nombre: acc.nombre, accion: "cuenta_cliente.eliminar", entidad: "customer_accounts", entidad_id: accountId, detalle: { motivo: "solicitud_de_supresion", fichas_desvinculadas: links.length }, created_at: nowISO() });
    return { ok: true, id: accountId };
  });
}

export function anonymizeCustomer(customerId: string, workshopId: string, actor: Actor): ResultadoOp {
  return mutate((db) => {
    const customer = db.customers.find((c) => c.id === customerId && c.workshop_id === workshopId);
    if (!customer) return { ok: false, error: "Cliente no encontrado en este taller." };
    if (customer.anonimizado) return { ok: false, error: "Este cliente ya fue anonimizado." };
    const activas = db.service_orders.filter((o) => o.customer_id === customer.id && o.estado !== "entregado" && o.estado !== "cancelado");
    if (activas.length > 0) return { ok: false, error: `El cliente tiene ${activas.length} orden(es) activa(s). Cierra o cancela las órdenes antes de anonimizar.` };

    customer.nombre = "Cliente anonimizado (solicitud de supresión)";
    customer.telefono = "—";
    customer.correo = `suprimido+${customer.id}@invalido.local`;
    customer.documento = null;
    customer.portal_token = uid("tok_invalidado");
    customer.anonimizado = true;
    customer.consentimiento_datos_at = nowISO();
    customer.consentimiento_origen = "supresion";
    db.customer_account_links = db.customer_account_links.filter((l) => l.customer_id !== customer.id);
    pushAudit(db, workshopId, actor, "cliente.suprimir_datos", "customers", customer.id, { base_legal: "Ley 1581 de 2012 · derecho de supresión", conservado: "historial de órdenes y autorizaciones (obligación legal)" });
    return { ok: true, id: customer.id };
  });
}

export function signDeliveryConformity(orderId: string, firmaDataUrl: string, customer: Customer, workshopId: string): ResultadoOp {
  return mutate((db) => {
    const order = findOrder(db, orderId, workshopId);
    if (!order || order.customer_id !== customer.id) return { ok: false, error: "Orden no encontrada." };
    if (order.estado !== "entregado") return { ok: false, error: "La firma de conformidad se realiza cuando el servicio ya fue entregado." };
    if (db.order_media.some((m) => m.service_order_id === order.id && m.nombre.startsWith("Firma de conformidad"))) return { ok: false, error: "Esta entrega ya fue firmada. ¡Gracias!" };

    db.order_media.push({ id: uid("med"), service_order_id: order.id, workshop_id: workshopId, categoria: "documento", nombre: `Firma de conformidad — ${customer.nombre}`, url: firmaDataUrl, autor_id: null, autor_nombre: `${customer.nombre} (cliente)`, visible_cliente: true, created_at: nowISO() });
    pushEvent(db, order, "entrega", "El cliente firmó digitalmente la conformidad de la entrega", { id: customer.id, nombre: customer.nombre });
    notifyStaffGestion(db, workshopId, "firma_conformidad", `Entrega firmada · ${order.numero}`, `${customer.nombre} firmó la conformidad digital de la entrega de ${order.numero}. La firma quedó guardada en las evidencias de la orden.`, order.id);
    pushAudit(db, workshopId, { id: customer.id, nombre: customer.nombre }, "cliente.firmar_entrega", "order_media", order.id);
    return { ok: true, id: order.id };
  });
}

export function requestWhatsappSummary(orderId: string, customer: Customer, workshopId: string): { ok: boolean; error?: string; resumen?: string; whatsappUrl?: string } {
  return mutate((db) => {
    const order = findOrder(db, orderId, workshopId);
    if (!order || order.customer_id !== customer.id) return { ok: false, error: "Orden no encontrada." };
    const vehicle = db.vehicles.find((v) => v.id === order.vehicle_id)!;
    const workshop = db.workshops.find((w) => w.id === workshopId)!;
    const responsable = order.responsable_id ? db.users.find((u) => u.id === order.responsable_id) : null;
    const ultimoEvento = db.order_events.filter((e) => e.service_order_id === order.id).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    const est = latestEstimateOf(db, order.id);

    const lineas = [
      `🔧 ${workshop.nombre} · Orden ${order.numero}`,
      `🚗 ${vehicle.marca} ${vehicle.modelo} (${vehicle.placa})`,
      `📍 Estado: ${ESTADO_LABEL[order.estado]}`,
      `👷 Responsable: ${responsable?.nombre ?? "Asesor de servicio"}`,
      `🕒 Ingreso: ${formatDateTime(order.fecha_ingreso)}`,
      order.fecha_entrega ? `✅ Entregado: ${formatDateTime(order.fecha_entrega)}` : `📅 Entrega estimada: ${order.fecha_estimada_entrega ? formatDate(order.fecha_estimada_entrega) : "por confirmar"} (estimación, no promesa)`,
      est ? `📄 Presupuesto v${est.version}: ${formatCOP(est.total)} (${est.estado.replace(/_/g, " ")})` : null,
      ultimoEvento ? `🕘 Último: ${ultimoEvento.descripcion} (${formatTimeAgo(ultimoEvento.created_at)})` : null,
      `🔗 Seguimiento en vivo: /seguimiento/${customer.portal_token}`,
    ].filter(Boolean) as string[];
    const resumen = lineas.join("\n");

    const telefono = customer.telefono.replace(/[^\d]/g, "");
    notify({ db, workshopId, destinatarioTipo: "customer", destinatarioId: customer.id, tipo: "resumen_whatsapp", titulo: "Resumen enviado por WhatsApp", cuerpo: resumen, canales: ["whatsapp"], serviceOrderId: order.id });
    pushEvent(db, order, "nota", "El cliente pidió el resumen “¿Dónde va mi carro?” por WhatsApp", { id: customer.id, nombre: customer.nombre });

    return { ok: true, resumen, whatsappUrl: `https://wa.me/${telefono}?text=${encodeURIComponent(resumen)}` };
  });
}

export function sendMaintenanceReminder(vehicleId: string, workshopId: string, actor: Actor): ResultadoOp {
  return mutate((db) => {
    const vehicle = db.vehicles.find((v) => v.id === vehicleId && v.workshop_id === workshopId);
    if (!vehicle) return { ok: false, error: "Vehículo no encontrado en este taller." };
    const customer = db.customers.find((c) => c.id === vehicle.customer_id && c.workshop_id === workshopId);
    if (!customer || customer.anonimizado) return { ok: false, error: "Cliente no disponible." };

    const entregas = db.service_orders.filter((o) => o.vehicle_id === vehicle.id && o.estado === "entregado" && o.fecha_entrega).map((o) => o.fecha_entrega as string).sort();
    const ultima = entregas.at(-1);
    if (!ultima) return { ok: false, error: "El vehículo aún no tiene servicios entregados que justifiquen el recordatorio." };

    const meses = Math.floor((Date.now() - new Date(ultima).getTime()) / (30.44 * 86_400_000));
    if (meses < 3) return { ok: false, error: `Aún no cumple la regla: el último servicio fue hace ${meses} mes(es) (mínimo 3).` };
    if (vehicle.ultimo_recordatorio_mant_at) {
      const dias = Math.floor((Date.now() - new Date(vehicle.ultimo_recordatorio_mant_at).getTime()) / 86_400_000);
      if (dias < 30) return { ok: false, error: `Ya se le recordó hace ${dias} día(s). Espera al menos 30 días entre recordatorios.` };
    }

    vehicle.ultimo_recordatorio_mant_at = nowISO();
    notify({ db, workshopId, destinatarioTipo: "customer", destinatarioId: customer.id, tipo: "recordatorio_mantenimiento", titulo: `Tu ${vehicle.marca} ${vehicle.modelo} necesita mantenimiento`, cuerpo: `Han pasado ${meses} meses desde tu último servicio (${formatDate(ultima)}) y tu vehículo marca ${formatKm(vehicle.kilometraje)}. Te recomendamos agendar su próximo mantenimiento para evitar desgastes mayores. Responde este mensaje o entra a tu enlace de seguimiento para coordinar.`, link: `/seguimiento/${customer.portal_token}`, serviceOrderId: null });
    pushAudit(db, workshopId, actor, "mantenimiento.recordatorio", "vehicles", vehicle.id, { meses_desde_ultimo: meses, kilometraje: vehicle.kilometraje });
    return { ok: true, id: vehicle.id };
  });
}

export function createInvoice(
  input: InvoiceCreateInput, actor: Actor, workshopId: string
): { ok: boolean; error?: string; invoice?: Invoice } {
  return mutate((db) => {
    const estimate = db.estimates.find((e) => e.id === input.estimate_id && e.workshop_id === workshopId);
    if (!estimate) return { ok: false, error: "Presupuesto no encontrado en este taller." };
    if (estimate.estado !== "aprobada" && estimate.estado !== "parcialmente_aprobada") return { ok: false, error: `Solo se puede facturar un presupuesto autorizado (estado actual: ${estimate.estado.replace(/_/g, " ")}).` };
    const yaFacturada = db.invoices.some((i) => i.estimate_id === estimate.id && i.estado !== "anulada");
    if (yaFacturada) return { ok: false, error: "Este presupuesto ya tiene una factura emitida." };

    const order = findOrder(db, estimate.service_order_id, workshopId);
    if (!order) return { ok: false, error: "Orden de servicio no encontrada." };
    const customer = db.customers.find((c) => c.id === order.customer_id);
    if (!customer) return { ok: false, error: "Cliente de la orden no encontrado." };
    const workshop = db.workshops.find((w) => w.id === workshopId);
    if (!workshop) return { ok: false, error: "Taller no encontrado." };

    const secuencial = (db.secuencia_factura ?? 0) + 1;
    db.secuencia_factura = secuencial;
    const numero = `FAC-${secuencial.toString().padStart(6, "0")}`;
    const fechaEmision = nowISO();
    const impuestoPorcentaje = estimate.impuesto_porcentaje;

    const authorization = db.authorizations.find((a) => a.estimate_id === estimate.id);
    let subtotal = estimate.subtotal;
    let descuento = estimate.descuento;
    let impuestos = estimate.impuestos;
    let total = estimate.total;
    if (authorization) {
      const items = db.estimate_items.filter((i) => i.estimate_id === estimate.id);
      const aprobados = items.filter((i) => authorization.items_aprobados.includes(i.id));
      const conAlt = new Set(authorization.items_con_alternativa ?? []);
      const brutoTotal = items.reduce((s, i) => s + i.subtotal, 0);
      const brutoAprobado = aprobados.reduce((s, i) => s + (conAlt.has(i.id) && i.alternativa_precio_unitario != null ? i.alternativa_precio_unitario : i.precio_unitario) * i.cantidad, 0);
      descuento = Math.round(brutoTotal > 0 ? estimate.descuento * (brutoAprobado / brutoTotal) : 0);
      subtotal = brutoAprobado;
      total = authorization.monto_aprobado;
      impuestos = Math.max(0, total - Math.max(0, subtotal - descuento));
    }

    const cufeInput = `${numero}|${fechaEmision}|${workshop.nit ?? "SIN-NIT"}|${total}`;
    const cufeBuf = crypto.createHash("sha384").update(cufeInput).digest("hex");
    const cufe = cufeBuf.match(/.{1,48}/g)!.join("-");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<FacturaElectronica DIAN="true">
  <Numero>${escapeXml(numero)}</Numero>
  <FechaEmision>${escapeXml(fechaEmision)}</FechaEmision>
  <NitEmisor>${escapeXml(workshop.nit ?? "SIN-NIT")}</NitEmisor>
  <NombreEmisor>${escapeXml(workshop.nombre)}</NombreEmisor>
  <DocumentoCliente>${escapeXml(input.documento_cliente ?? customer.documento ?? "SIN-DOCUMENTO")}</DocumentoCliente>
  <NombreCliente>${escapeXml(input.nombre_cliente ?? customer.nombre)}</NombreCliente>
  <DireccionCliente>${escapeXml(input.direccion_cliente ?? "")}</DireccionCliente>
  <OrdenServicio>${escapeXml(order.numero)}</OrdenServicio>
  <Presupuesto version="${escapeXml(String(estimate.version))}">${escapeXml(estimate.id)}</Presupuesto>
  <MedioPago>${escapeXml(input.medio_pago)}</MedioPago>
  <Subtotal>${subtotal}</Subtotal>
  <Descuento>${descuento}</Descuento>
  <Impuesto porcentaje="${impuestoPorcentaje}">${impuestos}</Impuesto>
  <Total>${total}</Total>
  <CUFE>${escapeXml(cufe)}</CUFE>
  <Estado>emitida</Estado>
</FacturaElectronica>`;

    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="612" height="792" viewBox="0 0 612 792">
  <rect width="612" height="792" fill="#ffffff"/>
  <text x="40" y="60" font-family="Arial" font-size="20" font-weight="bold" fill="#111827">FACTURA ELECTRÓNICA - DIAN</text>
  <text x="40" y="90" font-family="Arial" font-size="12" fill="#374151">Número: ${escapeXml(numero)}</text>
  <text x="40" y="108" font-family="Arial" font-size="12" fill="#374151">Fecha: ${escapeXml(formatDateTime(fechaEmision))}</text>
  <text x="40" y="126" font-family="Arial" font-size="12" fill="#374151">NIT Emisor: ${escapeXml(workshop.nit ?? "SIN-NIT")} - ${escapeXml(workshop.nombre)}</text>
  <text x="40" y="144" font-family="Arial" font-size="12" fill="#374151">Cliente: ${escapeXml(input.nombre_cliente ?? customer.nombre)}</text>
  <text x="40" y="162" font-family="Arial" font-size="12" fill="#374151">Documento: ${escapeXml(input.documento_cliente ?? customer.documento ?? "SIN-DOCUMENTO")}</text>
  <text x="40" y="180" font-family="Arial" font-size="12" fill="#374151">Orden: ${escapeXml(order.numero)} · Presupuesto v${escapeXml(String(estimate.version))}</text>
  <text x="40" y="198" font-family="Arial" font-size="12" fill="#374151">Medio de pago: ${escapeXml(input.medio_pago)}</text>
  <line x1="40" y1="210" x2="572" y2="210" stroke="#111827" stroke-width="1"/>
  <text x="40" y="230" font-family="Arial" font-size="12" font-weight="bold" fill="#111827">Subtotal: ${formatCOP(subtotal)}</text>
  <text x="40" y="248" font-family="Arial" font-size="12" fill="#374151">Descuento: ${formatCOP(descuento)}</text>
  <text x="40" y="266" font-family="Arial" font-size="12" fill="#374151">IVA (${impuestoPorcentaje}%): ${formatCOP(impuestos)}</text>
  <text x="40" y="290" font-family="Arial" font-size="14" font-weight="bold" fill="#111827">TOTAL: ${formatCOP(total)}</text>
  <text x="40" y="330" font-family="Arial" font-size="10" fill="#6b7280">CUFE: ${escapeXml(cufe)}</text>
  <text x="40" y="350" font-family="Arial" font-size="10" fill="#6b7280">Factura generada por Taller Conecta (modo demo). No es un título valor.</text>
</svg>`;
    const pdfUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

    const invoice: Invoice = {
      id: uid("inv"), service_order_id: order.id, estimate_id: estimate.id, workshop_id: workshopId,
      numero, fecha_emision: fechaEmision, nit_emisor: workshop.nit ?? "SIN-NIT", nombre_emisor: workshop.nombre,
      documento_cliente: input.documento_cliente ?? customer.documento ?? "SIN-DOCUMENTO",
      nombre_cliente: input.nombre_cliente ?? customer.nombre,
      direccion_cliente: input.direccion_cliente ?? null, medio_pago: input.medio_pago,
      subtotal, descuento, impuesto_porcentaje: impuestoPorcentaje, impuestos, total, cufe, xml, pdf_url: pdfUrl,
      estado: "emitida", creado_por: actor.id, created_at: nowISO(),
    };
    db.invoices.push(invoice);

    pushEvent(db, order, "presupuesto", `Factura electrónica ${numero} emitida · Total ${formatCOP(total)} · CUFE ${cufe.substring(0, 12)}…`, actor);
    pushAudit(db, workshopId, actor, "factura.emitir", "invoices", invoice.id, { numero, estimate_id: estimate.id, total, cufe, medio_pago: input.medio_pago });

    notify({ db, workshopId, destinatarioTipo: "customer", destinatarioId: customer.id, tipo: "factura_emitida", titulo: `Factura ${numero} emitida`, cuerpo: `Se ha emitido la factura electrónica ${numero} por ${formatCOP(total)} para la orden ${order.numero}. Puedes descargar el PDF desde tu enlace de seguimiento.`, link: `/seguimiento/${customer.portal_token}`, serviceOrderId: order.id });

    return { ok: true, invoice };
  });
}

export function getDemoStats() {
  return query((db) => ({ talleres: db.workshops.length, usuarios: db.users.length, ordenes: db.service_orders.length, seeded_at: db.meta.seeded_at }));
}

export function adminUpdateWorkshop(
  workshopId: string,
  datos: { estado?: "activo" | "suspendido" | "en_prueba"; plan?: "starter" | "pro" | "premium" },
  actor: Actor
): ResultadoOp {
  return mutate((db) => {
    const ws = db.workshops.find((w) => w.id === workshopId);
    if (!ws) return { ok: false, error: "Taller no encontrado." };
    if (datos.estado) ws.estado = datos.estado;
    if (datos.plan) ws.plan = datos.plan;
    db.audit_logs.push({ id: uid("aud"), workshop_id: workshopId, actor_id: actor.id, actor_nombre: actor.nombre, accion: "admin.taller.actualizar", entidad: "workshops", entidad_id: workshopId, detalle: datos, created_at: nowISO() });
    return { ok: true, id: workshopId };
  });
}

export function adminUpdateSubscription(
  subscriptionId: string,
  datos: { plan?: "starter" | "pro" | "premium"; estado?: "activa" | "en_prueba" | "vencida" | "cancelada" },
  actor: Actor
): ResultadoOp {
  return mutate((db) => {
    const sub = db.subscriptions.find((s) => s.id === subscriptionId);
    if (!sub) return { ok: false, error: "Suscripción no encontrada." };
    if (datos.plan) sub.plan = datos.plan;
    if (datos.estado) sub.estado = datos.estado;
    const ws = db.workshops.find((w) => w.id === sub.workshop_id);
    if (ws && datos.plan) ws.plan = datos.plan;
    db.audit_logs.push({ id: uid("aud"), workshop_id: sub.workshop_id, actor_id: actor.id, actor_nombre: actor.nombre, accion: "admin.suscripcion.actualizar", entidad: "subscriptions", entidad_id: subscriptionId, detalle: datos, created_at: nowISO() });
    return { ok: true, id: subscriptionId };
  });
}

export function adminUpdateUserEstado(userId: string, estado: "activo" | "inactivo", actor: Actor): ResultadoOp {
  return mutate((db) => {
    const user = db.users.find((u) => u.id === userId);
    if (!user) return { ok: false, error: "Usuario no encontrado." };
    user.estado = estado;
    db.audit_logs.push({ id: uid("aud"), workshop_id: null, actor_id: actor.id, actor_nombre: actor.nombre, accion: "admin.usuario.actualizar", entidad: "users", entidad_id: userId, detalle: { estado }, created_at: nowISO() });
    return { ok: true, id: userId };
  });
}
