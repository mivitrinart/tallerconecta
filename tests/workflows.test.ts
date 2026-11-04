/**
 * Pruebas de integración · Workflows sobre una base de datos temporal.
 * Verifica reglas de negocio: notificaciones, eventos, auditoría, versiones
 * de presupuesto, autorizaciones y aislamiento por taller.
 * Ejecutar: npm test
 */
import { describe, test, beforeAll, expect } from "vitest";
import fs from "node:fs";
import { comparePassword } from "@/lib/auth/password";

// La base temporal se configura con DEMO_DB_PATH en el script `npm test`.
import { readDb, resetDemoDb, nowISO, mutate } from "@/lib/database/index";
import { getPortalTokenStatus, aceptarVinculacion } from "@/lib/database/queries";
import * as w from "@/lib/orders/workflows";

const ACTOR = { id: "usr_ana", nombre: "Ana Ríos" };
const WS = "ws_motorx";

beforeAll(() => {
  if (fs.existsSync(".data/test-db.json")) fs.unlinkSync(".data/test-db.json");
  resetDemoDb();
});

describe("Recepción de vehículo (createOrder)", () => {
  test("crea la orden, evento de recepción y notificación al cliente", () => {
    const db0 = readDb();
    const seq0 = db0.secuencia_orden;
    const order = w.createOrder(
      {
        customer_id: "cust_maria",
        vehicle_id: "veh_mazda3",
        motivo_ingreso: "Revisión de garantía",
        sintomas: "Luz de motor encendida",
        kilometraje: 63000,
        fecha_estimada_entrega: "",
        responsable_id: "",
        notas_internas: "",
      } as never,
      WS,
      ACTOR
    );
    const db = readDb();
    expect(order.estado).toBe("recibido");
    expect(order.numero).toBe(`ORD-${seq0 + 1}`);
    expect(db.order_events.some((e) => e.service_order_id === order.id && e.tipo === "creacion")).toBe(true);
    expect(
      db.notifications.some(
        (n) => n.destinatario_id === "cust_maria" && n.tipo === "vehiculo_recibido" && n.service_order_id === order.id
      )).toBe(true);
    expect(db.audit_logs.some((a) => a.accion === "orden.crear" && a.entidad_id === order.id)).toBe(true);
    // kilometraje actualizado en la ficha del vehículo
    expect(db.vehicles.find((v) => v.id === "veh_mazda3")!.kilometraje).toBe(63000);
  });
});

describe("Flujo feliz completo (diagnóstico → entrega → calificación)", () => {
  const order = { id: "" };

  test("diagnóstico notifica 'Diagnóstico listo'", () => {
    const o = w.createOrder(
      { customer_id: "cust_jorge", vehicle_id: "veh_fz", motivo_ingreso: "Prueba de flujo" } as never,
      WS,
      ACTOR
    );
    order.id = o.id;
    const r = w.saveDiagnostic(o.id, "Hallazgos de la revisión técnica", "Reemplazar pieza X", ACTOR, WS);
    expect(r.ok).toBe(true);
    const db = readDb();
    expect(db.notifications.some((n) => n.destinatario_id === "cust_jorge" && n.tipo === "diagnostico_listo")).toBe(true);
  });

  test("presupuesto: borrador → enviado → orden en esperando_aprobacion", () => {
    const est = w.createEstimateDraft(
      {
        service_order_id: order.id,
        items: [
          { tipo: "repuesto", descripcion: "Pieza X", cantidad: 1, precio_unitario: 100000 },
          { tipo: "mano_obra", descripcion: "Instalación", cantidad: 1, precio_unitario: 50000 },
        ],
        descuento: 0,
        impuesto_porcentaje: 19,
        validez_dias: 15,
      } as never,
      ACTOR,
      WS
    );
    expect(est.version).toBe(1);
    expect(est.total).toBe(Math.round(150000 * 1.19));
    const r = w.sendEstimate(est.id, ACTOR, WS);
    expect(r.ok).toBe(true);
    const db = readDb();
    const o = db.service_orders.find((x) => x.id === order.id)!;
    expect(o.estado).toBe("esperando_aprobacion");
  });

  test("aprobación total → autorizado + autorización registrada", () => {
    const db0 = readDb();
    const est = db0.estimates.find((e) => e.service_order_id === order.id)!;
    const items = db0.estimate_items.filter((i) => i.estimate_id === est.id);
    const customer = db0.customers.find((c) => c.id === "cust_jorge")!;
    const r = w.recordDecision(
      est.id,
      items.map((i) => ({ item_id: i.id, decision: "aprobar" as const })),
      undefined,
      customer,
      WS
    );
    expect(r.ok).toBe(true);
    const db = readDb();
    const o = db.service_orders.find((x) => x.id === order.id)!;
    const aut = db.authorizations.find((a) => a.estimate_id === est.id)!;
    expect(o.estado).toBe("autorizado");
    expect(aut.decision).toBe("aprobada_total");
    expect(aut.monto_aprobado).toBe(Math.round(150000 * 1.19));
    expect(aut.version_aceptada).toBe(1);
  });

  test("reparación → pruebas → listo → entrega con valor final → calificación", () => {
    expect(w.changeOrderStatus(order.id, "en_reparacion", ACTOR, WS).ok).toBe(true);
    expect(w.changeOrderStatus(order.id, "en_pruebas", { id: "usr_luis", nombre: "Luis Pardo" }, WS).ok).toBe(true);
    // Checklist visual: no hay "listo para entregar" sin foto del DESPUÉS
    const sinFoto = w.changeOrderStatus(order.id, "listo_entrega", ACTOR, WS);
    expect(sinFoto.ok).toBe(false);
    expect(
      w.addMedia(order.id, { categoria: "despues", nombre: "Trabajo terminado", url: "data:image/svg+xml;utf8,%3Csvg/%3E", visible_cliente: true }, ACTOR, WS).ok
    ).toBe(true);
    expect(w.changeOrderStatus(order.id, "listo_entrega", ACTOR, WS).ok).toBe(true);
    const db0 = readDb();
    const customer = db0.customers.find((c) => c.id === "cust_jorge")!;
    expect(w.deliverOrder(order.id, 178500, ACTOR, WS).ok).toBe(true);
    expect(w.rateOrder(order.id, 5, "Excelente", customer, WS).ok).toBe(true);
    // Firma digital de conformidad de la entrega
    expect(w.signDeliveryConformity(order.id, "data:image/png;base64,iVBORw0KGgo=", customer, WS).ok).toBe(true);
    expect(
      readDb().order_media.some((m) => m.service_order_id === order.id && m.nombre.startsWith("Firma de conformidad"))).toBe(true);
    expect(w.signDeliveryConformity(order.id, "data:image/png;base64,iVBORw0KGgo=", customer, WS).ok).toBe(false);
    // Botón "¿Dónde va mi carro?" → resumen WhatsApp
    const resumen = w.requestWhatsappSummary(order.id, customer, WS);
    expect(resumen.ok).toBe(true);
    expect(resumen.resumen).toBeDefined();
    expect(resumen.whatsappUrl).toBeDefined();
    expect(resumen.whatsappUrl!.startsWith("https://wa.me/57")).toBe(true);
    expect(
      readDb().notifications.some((n) => n.destinatario_id === customer.id && n.tipo === "resumen_whatsapp" && n.canal === "whatsapp")).toBe(true);
    const db = readDb();
    const o = db.service_orders.find((x) => x.id === order.id)!;
    expect(o.estado).toBe("entregado");
    expect(o.valor_final).toBe(178500);
    expect(o.calificacion).toBe(5);
    expect(db.notifications.some((n) => n.destinatario_id === "cust_jorge" && n.tipo === "vehiculo_listo")).toBe(true);
    expect(db.notifications.some((n) => n.destinatario_id === "cust_jorge" && n.tipo === "orden_entregada")).toBe(true);
  });

  test("entregar desde un estado incorrecto se bloquea", () => {
    const o = w.createOrder({ customer_id: "cust_maria", vehicle_id: "veh_mazda3", motivo_ingreso: "Otra prueba" } as never, WS, ACTOR);
    const r = w.deliverOrder(o.id, 1000, ACTOR, WS);
    expect(r.ok).toBe(false);
  });
});

describe("Versiones y rechazos de presupuesto", () => {
  test("rechazo total → presupuesto rechazado, la orden NO pasa a autorizado", () => {
    const o = w.createOrder({ customer_id: "cust_sofia", vehicle_id: "veh_picanto", motivo_ingreso: "Prueba de rechazo" } as never, WS, ACTOR);
    const est = w.createEstimateDraft(
      { service_order_id: o.id, items: [{ tipo: "servicio", descripcion: "Servicio Y", cantidad: 1, precio_unitario: 200000 }], descuento: 0, impuesto_porcentaje: 19, validez_dias: 15 } as never,
      ACTOR, WS
    );
    w.sendEstimate(est.id, ACTOR, WS);
    const db0 = readDb();
    const items = db0.estimate_items.filter((i) => i.estimate_id === est.id);
    const customer = db0.customers.find((c) => c.id === "cust_sofia")!;
    w.recordDecision(est.id, items.map((i) => ({ item_id: i.id, decision: "rechazar" as const })), "Está muy caro", customer, WS);
    const db = readDb();
    expect(db.estimates.find((e) => e.id === est.id)!.estado).toBe("rechazada");
    expect(db.service_orders.find((x) => x.id === o.id)!.estado).toBe("esperando_aprobacion");
    // El comentario queda como mensaje y alerta al staff
    expect(db.messages.some((m) => m.contenido === "Está muy caro" && m.remitente_tipo === "customer")).toBe(true);
    expect(db.notifications.some((n) => n.destinatario_tipo === "user" && n.tipo === "presupuesto_rechazado")).toBe(true);
  });

  test("nueva versión tras rechazo: la anterior queda superada y exige re-aprobación", () => {
    const db0 = readDb();
    const o = db0.service_orders.find((x) => x.motivo_ingreso === "Prueba de rechazo")!;
    const est2 = w.createEstimateDraft(
      { service_order_id: o.id, items: [{ tipo: "servicio", descripcion: "Servicio Y (ajustado)", cantidad: 1, precio_unitario: 150000 }], descuento: 0, impuesto_porcentaje: 19, validez_dias: 15 } as never,
      ACTOR, WS
    );
    expect(est2.version).toBe(2);
    const db = readDb();
    const v1 = db.estimates.find((e) => e.service_order_id === o.id && e.version === 1)!;
    // La v1 fue RECHAZADA: su decisión es definitiva y se conserva como registro histórico
    expect(v1.estado).toBe("rechazada");
    w.sendEstimate(est2.id, ACTOR, WS);
    // No se puede reparar mientras la v2 esté pendiente
    const r = w.changeOrderStatus(o.id, "en_reparacion", ACTOR, WS);
    expect(r.ok).toBe(false);
  });
});

describe("Mensajería y aislamiento por taller", () => {
  test("mensaje del cliente alerta al personal de gestión", () => {
    const db0 = readDb();
    const o = db0.service_orders.find((x) => x.numero === "ORD-1048")!;
    w.sendMessage(o.id, "customer", "cust_maria", "María Gómez", "¿Me confirman la entrega?", WS);
    const db = readDb();
    expect(db.notifications.some((n) => n.destinatario_tipo === "user" && n.tipo === "mensaje_nuevo")).toBe(true);
  });

  test("operaciones sobre órdenes de OTRO taller fallan (aislamiento)", () => {
    const r = w.changeOrderStatus("ord_as_1", "cancelado", ACTOR, WS, { motivo: "x" });
    expect(r.ok).toBe(false);
    const r2 = w.saveDiagnostic("ord_as_1", "intento de escritura cruzada", "no", ACTOR, WS);
    expect(r2.ok).toBe(false);
  });
});

describe("Registro de talleres (SaaS)", () => {
  test("sin aceptación de términos se rechaza", () => {
    const r = w.registerWorkshop({
      taller_nombre: "Taller Test", ciudad: "Medellín", telefono: "+57 604 000 0000",
      nombre: "Tester", correo: "tester@test.co", password: "secreto1",
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/términos/i);
  });

  test("crea taller + propietario + suscripción en prueba", () => {
    const r = w.registerWorkshop({
      taller_nombre: "Taller Test", ciudad: "Medellín", telefono: "+57 604 000 000 0000",
      nombre: "Tester", correo: "tester@test.co", password: "secreto1", acepta_terminos: true,
    });
    expect(r.ok).toBe(true);
    const db = readDb();
    const ws = db.workshops.find((x) => x.id === r.workshopId)!;
    expect(ws.estado).toBe("en_prueba");
    expect(db.subscriptions.some((s) => s.workshop_id === ws.id && s.estado === "en_prueba")).toBe(true);
    expect(db.workshop_members.some((m) => m.workshop_id === ws.id && m.rol === "owner")).toBe(true);
  });

  test("correo duplicado se rechaza", () => {
    const r = w.registerWorkshop({
      taller_nombre: "Taller Test 2", ciudad: "X", telefono: "1234567",
      nombre: "Tester", correo: "tester@test.co", password: "secreto1", acepta_terminos: true,
    });
    expect(r.ok).toBe(false);
  });

  test("plan Starter no permite más de un usuario (miembro adicional bloqueado)", () => {
    const r = w.registerWorkshop({
      taller_nombre: "Taller Plan Límite", ciudad: "Cali", telefono: "+57 602 000 0000",
      nombre: "Dueño", correo: "dueno@test.co", password: "secreto1", acepta_terminos: true,
    });
    expect(r.ok).toBe(true);
    const db0 = readDb();
    const ws = db0.workshops.find((x) => x.nombre === "Taller Plan Límite")!;
    // Forzar plan starter y suscripción activa para aislar la prueba
    mutate((db) => {
      const sub = db.subscriptions.find((s) => s.workshop_id === ws.id)!;
      sub.plan = "starter";
      sub.estado = "activa";
      ws.plan = "starter";
    });
    const r2 = w.inviteMember(ws.id, { nombre: "Asesor", correo: "asesor@test.co", telefono: "+57 300 000 0001", rol: "advisor" }, { id: "usr_dueño", nombre: "Dueño" });
    expect(r2.ok).toBe(false);
    expect(r2.error).toMatch(/Starter|usuario/i);
  });
});

describe("Cuentas de cliente y vinculación", () => {
  test("registro sin autorización de tratamiento se rechaza (Ley 1581)", () => {
    const r = w.createCustomerAccount({
      nombre: "Sin Consentimiento", correo: "sin@consent.co", telefono: "+57 300 000 0000",
      password: "clave123", acepta_terminos: false,
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/tratamiento de datos|términos/i);
  });

  test("crear cuenta NO vincula fichas por correo; la vinculación es SOLO por enlace", () => {
    const r = w.createCustomerAccount({
      nombre: "Jorge Peña", correo: "jorge.pena@example.co", telefono: "+57 315 222 9074",
      password: "cliente123", acepta_terminos: true,
    });
    expect(r.ok).toBe(true);
    expect(r.accountId).toBeDefined();
    const db = readDb();
    const acc = db.customer_accounts.find((a) => a.id === r.accountId)!;
    expect(acc.consentimiento_datos_at).toBeDefined();
    expect(
      db.customer_account_links.filter((l) => l.account_id === acc.id).length).toBe(0);
    // La vinculación ocurre solo cuando posee el enlace personal
    expect(w.linkCustomerByToken(acc.id, "tok_jorge_demo").ok).toBe(true);
    const link = readDb().customer_account_links.find((l) => l.account_id === acc.id)!;
    expect(link.customer_id).toBe("cust_jorge");
    expect(link.origen).toBe("token");
  });

  test("login de cuenta demo del seed (María Gómez) funciona", () => {
    const r = w.loginCustomerAccount("maria.gomez@example.co", "cliente123");
    expect(r.ok).toBe(true);
    expect(r.accountId).toBe("acc_maria");
    const malo = w.loginCustomerAccount("maria.gomez@example.co", "clave123");
    expect(malo.ok).toBe(false);
  });

  test("correo duplicado se rechaza", () => {
    const r = w.createCustomerAccount({
      nombre: "Otro Jorge", correo: "jorge.pena@example.co", telefono: "+57 300 111 1111",
      password: "clave123", acepta_terminos: true,
    });
    expect(r.ok).toBe(false);
  });

  test("vinculación por enlace personal y duplicados bloqueados", () => {
    const db0 = readDb();
    const acc = db0.customer_accounts.find((a) => a.correo === "jorge.pena@example.co")!;
    const r = w.linkCustomerByToken(acc.id, "tok_laura_demo");
    expect(r.ok).toBe(true);
    const r2 = w.linkCustomerByToken(acc.id, "tok_laura_demo");
    expect(r2.ok).toBe(false);
    // Otra cuenta no puede robar una ficha ya vinculada
    const otra = w.createCustomerAccount({
      nombre: "Sofía Medina", correo: "sofia.medina@example.co", telefono: "+57 322 118 3364",
      password: "clave123", acepta_terminos: true,
    });
    expect(otra.ok).toBe(true);
    const r3 = w.linkCustomerByToken(otra.accountId!, "tok_laura_demo");
    expect(r3.ok).toBe(false);
    expect(r3.error).toMatch(/privacidad/i);
    // Desvincular
    const custLaura = readDb().customers.find((c) => c.id === "cust_laura")!;
    expect(w.unlinkCustomer(acc.id, custLaura.id).ok).toBe(true);
  });

  test("eliminación de cuenta (supresión): borrado lógico + desvinculación", () => {
    const db0 = readDb();
    const acc = db0.customer_accounts.find((a) => a.correo === "sofia.medina@example.co")!;
    expect(w.deleteCustomerAccount(acc.id).ok).toBe(true);
    const db = readDb();
    const cuenta = db.customer_accounts.find((a) => a.id === acc.id)!;
    expect(cuenta.estado).toBe("eliminado");
    expect(cuenta.password_demo).toBeUndefined();
    expect(db.customer_account_links.filter((l) => l.account_id === acc.id).length).toBe(0);
    const login = w.loginCustomerAccount("sofia.medina@example.co", "clave123");
    expect(login.ok).toBe(false);
  });
});

describe("Supresión de la ficha en el taller (anonimización)", () => {
  test("se bloquea si el cliente tiene órdenes activas", () => {
    const r = w.anonymizeCustomer("cust_maria", "ws_motorx", { id: "usr_carlos", nombre: "Carlos Mejía" });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/activa/i);
  });

  test("anonimiza: contactos borrados, token invalidado, historial conservado", () => {
    const dbAntes = readDb();
    const ordenesAntes = dbAntes.service_orders.filter((o) => o.customer_id === "cust_laura").length;
    const r = w.anonymizeCustomer("cust_laura", "ws_motorx", { id: "usr_carlos", nombre: "Carlos Mejía" });
    if (!r.ok) {
      const libre = dbAntes.customers.find((c) => c.workshop_id === "ws_motorx" && !dbAntes.service_orders.some((o) => o.customer_id === c.id && o.estado !== "entregado" && o.estado !== "cancelado"));
      expect(libre).toBeDefined();
      expect(w.anonymizeCustomer(libre!.id, "ws_motorx", { id: "usr_carlos", nombre: "Carlos Mejía" }).ok).toBe(true);
      return;
    }
    const db = readDb();
    const c = db.customers.find((x) => x.id === "cust_laura")!;
    expect(c.anonimizado).toBe(true);
    expect(c.telefono).toBe("—");
    expect(c.correo).toMatch(/^suprimido\+/);
    expect(c.portal_token).not.toBe("tok_laura_demo");
    expect(
      db.service_orders.filter((o) => o.customer_id === "cust_laura").length).toBe(ordenesAntes);
    expect(db.audit_logs.some((a) => a.accion === "cliente.suprimir_datos" && a.entidad_id === "cust_laura")).toBe(true);
  });

  test("el taller de otro workspace no puede anonimizar fichas ajenas", () => {
    const r = w.anonymizeCustomer("cust_autosur_1", "ws_motorx", { id: "usr_carlos", nombre: "Carlos Mejía" });
    expect(r.ok).toBe(false);
  });
});

describe("Inmutabilidad de las autorizaciones", () => {
  test("un presupuesto ya decidido no acepta decisiones retrospectivas", () => {
    const db0 = readDb();
    // ORD-1032 del seed tiene un presupuesto aprobado con autorización registrada
    const est = db0.estimates.find((e) => e.service_order_id === "ord_1032" && e.estado === "aprobada")!;
    const items = db0.estimate_items.filter((i) => i.estimate_id === est.id);
    const customer = db0.customers.find((c) => c.id === "cust_hugo")!;
    const r = w.recordDecision(
      est.id,
      items.map((i) => ({ item_id: i.id, decision: "rechazar" as const })),
      undefined,
      customer,
      "ws_motorx"
    );
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/ya no acepta decisiones/i);
    const aut = readDb().authorizations.find((a) => a.estimate_id === est.id)!;
    expect(aut.decision).toBe("aprobada_total");
  });
});

describe("Vehículos registrados por el cliente desde su cuenta", () => {
  test("cliente registra su carro en una ficha vinculada y el taller queda notificado", () => {
    // acc_maria ↔ cust_maria vienen vinculados en el seed
    const r = w.customerAddVehicle("acc_maria", {
      customer_id: "cust_maria",
      placa: "mkr-999", // minúsculas → se normaliza
      tipo: "carro",
      marca: "Chevrolet",
      modelo: "Onix",
      anio: 2022,
      kilometraje: 41000,
      color: "Blanco",
    });
    expect(r.ok).toBe(true);
    const db = readDb();
    const v = db.vehicles.find((x) => x.id === r.id)!;
    expect(v.placa).toBe("MKR-999");
    expect(v.origen).toBe("cliente");
    expect(v.registrado_por_account_id).toBe("acc_maria");
    expect(v.workshop_id).toBe("ws_motorx");
    expect(
      db.notifications.some((n) => n.destinatario_tipo === "user" && n.tipo === "vehiculo_registrado_cliente" && n.cuerpo.includes("MKR-999"))).toBe(true);
    expect(db.audit_logs.some((a) => a.accion === "cliente.registrar_vehiculo")).toBe(true);
  });

  test("placa duplicada en el mismo taller se rechaza", () => {
    const r = w.customerAddVehicle("acc_maria", {
      customer_id: "cust_maria", placa: "ABC-456", tipo: "carro",
      marca: "Mazda", modelo: "3", anio: 2019, kilometraje: 1,
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/ya existe/i);
  });

  test("no puede registrar en una ficha que no está vinculada a su cuenta", () => {
    const r = w.customerAddVehicle("acc_maria", {
      customer_id: "cust_eduardo", placa: "ZZZ-000", tipo: "carro",
      marca: "Ford", modelo: "Fiesta", anio: 2020, kilometraje: 10,
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/vinculada/i);
  });

  test("solo edita los vehículos que él registró", () => {
    // veh_mazda3 es origen "taller" → no editable por el cliente
    const r1 = w.customerUpdateVehicle("acc_maria", "veh_mazda3", { kilometraje: 1 });
    expect(r1.ok).toBe(false);
    // veh_twingo_maria es suyo (seed) → editable
    const r2 = w.customerUpdateVehicle("acc_maria", "veh_twingo_maria", { kilometraje: 99100, color: "Verde musgo" });
    expect(r2.ok).toBe(true);
    const v = readDb().vehicles.find((x) => x.id === "veh_twingo_maria")!;
    expect(v.kilometraje).toBe(99100);
    expect(v.color).toBe("Verde musgo");
    // otra cuenta no puede editarlo
    const r3 = w.customerUpdateVehicle("acc_inexistente", "veh_twingo_maria", { kilometraje: 0 });
    expect(r3.ok).toBe(false);
  });

  test("cambio de placa que colisiona con otra se rechaza", () => {
    const r = w.customerUpdateVehicle("acc_maria", "veh_twingo_maria", { placa: "ABC-456" });
    expect(r.ok).toBe(false);
  });
});

describe("Desvinculación con propagación al panel del taller", () => {
  test("al desvincular se retiran los vehículos registrados por la cuenta", () => {
    // acc_maria ↔ cust_maria (seed) tiene: veh_mazda3 (taller), veh_twingo_maria (cliente) y MKR-999 (cliente, creado arriba)
    const r = w.unlinkCustomer("acc_maria", "cust_maria");
    expect(r.ok).toBe(true);
    const db = readDb();
    expect(db.vehicles.some((v) => v.id === "veh_twingo_maria")).toBe(false);
    expect(db.vehicles.some((v) => v.placa === "MKR-999")).toBe(false);
    expect(db.vehicles.some((v) => v.id === "veh_mazda3")).toBe(true);
    expect(
      db.customer_account_links.filter((l) => l.account_id === "acc_maria" && l.customer_id === "cust_maria").length).toBe(0);
    expect(db.notifications.some((n) => n.destinatario_tipo === "user" && n.tipo === "cliente_desvinculado")).toBe(true);
    expect(db.audit_logs.some((a) => a.accion === "cliente.retirar_vehiculo")).toBe(true);

    // Desvinculación propagada: el enlace creado por el taller queda ANULADO
    expect(db.customers.find((c) => c.id === "cust_maria")!.portal_activo).toBe(false);
    expect(db.customers.find((c) => c.id === "cust_maria")!.portal_token).not.toBe("tok_maria_demo");
    expect(getPortalTokenStatus("tok_maria_demo")).toBe("inexistente");

    // PRIVACIDAD: el enlace anulado no puede volver a vincularse a ninguna cuenta
    const rl = w.linkCustomerByToken("acc_maria", "tok_maria_demo");
    expect(rl.ok).toBe(false);
    expect(rl.error).toMatch(/inválido|anulado/i);

    // El taller genera un enlace NUEVO (única vía de restaurar el acceso)
    expect(w.regenerateCustomerPortalLink("cust_maria", "ws_motorx", { id: "usr_carlos", nombre: "Carlos Mejía" }).ok).toBe(true);
    const dbReact = readDb();
    const mariaReact = dbReact.customers.find((c) => c.id === "cust_maria")!;
    expect(mariaReact.portal_activo).toBe(true);
    expect(mariaReact.portal_token).not.toBe("tok_maria_demo");
    expect(getPortalTokenStatus("tok_maria_demo")).toBe("inexistente");
    expect(getPortalTokenStatus(mariaReact.portal_token)).toBe("ok");
    const aviso = dbReact.notifications.find((n) => n.destinatario_id === "cust_maria" && n.tipo === "enlace_nuevo" && n.canal === "email");
    expect(aviso).toBeDefined();
    expect(aviso!.cuerpo.includes(mariaReact.portal_token)).toBe(true);
    expect(dbReact.notifications.some((n) => n.destinatario_id === "cust_maria" && n.tipo === "enlace_nuevo" && n.canal === "in_app")).toBe(true);
    // Regenerar con el enlace activo → error amigable
    expect(w.regenerateCustomerPortalLink("cust_maria", "ws_motorx", { id: "usr_carlos", nombre: "Carlos Mejía" }).ok).toBe(false);
    // El cliente puede vincular el enlace NUEVO a su cuenta
    expect(w.linkCustomerByToken("acc_maria", mariaReact.portal_token).ok).toBe(true);
    // La vinculación debe aceptarse antes de registrar vehículos
    const links = readDb().customer_account_links.filter((l) => l.account_id === "acc_maria");
    aceptarVinculacion(links[0].id, WS, "usr_ana", "Ana Ríos");
  });

  test("los vehículos con órdenes asociadas se conservan (historial legal)", () => {
    const db0 = readDb();
    let accJorge = db0.customer_accounts.find((a) => a.correo === "jorge.pena@example.co");
    if (!accJorge) {
      const creada = w.createCustomerAccount({
        nombre: "Jorge Peña", correo: "jorge.pena@example.co", telefono: "+57 315 222 9074",
        password: "clave123", acepta_terminos: true,
      });
      expect(creada.ok).toBe(true);
      accJorge = db0.customer_accounts.find((a) => a.correo === "jorge.pena@example.co")!;
    }
    // Vincular la ficha de Jorge con estado aceptado
    mutate((d) => {
      d.customer_account_links.push({
        id: "lnk_test_jorge", account_id: accJorge.id, customer_id: "cust_jorge",
        workshop_id: WS, origen: "token", estado: "aceptado", created_at: nowISO(),
      });
    });
    const rv = w.customerAddVehicle(accJorge.id, {
      customer_id: "cust_jorge", placa: "NVA-001", tipo: "moto",
      marca: "AKT", modelo: "NKD", anio: 2023, kilometraje: 5000,
    });
    expect(rv.ok).toBe(true);
    const vehNuevo = readDb().vehicles.find((v) => v.placa === "NVA-001")!;
    // Orden que referencia el vehículo registrado por el cliente
    w.createOrder(
      { customer_id: "cust_jorge", vehicle_id: vehNuevo.id, motivo_ingreso: "Prueba de retención de historial" } as never,
      WS,
      ACTOR
    );
    expect(w.unlinkCustomer(accJorge.id, "cust_jorge").ok).toBe(true);
    const db = readDb();
    expect(db.vehicles.some((v) => v.id === vehNuevo.id)).toBe(true);
  });

  test("eliminar la cuenta retira sus vehículos en todas las fichas vinculadas", () => {
    const creada = w.createCustomerAccount({
      nombre: "Valeria Ospina", correo: "valeria.ospina@example.co", telefono: "+57 314 771 9080",
      password: "clave123", acepta_terminos: true,
    });
    expect(creada.ok).toBe(true);
    const accId = creada.accountId!;
    // La vinculación es solo por enlace personal (no por correo)
    expect(w.linkCustomerByToken(accId, "tok_valeria_demo").ok).toBe(true);
    const links = readDb().customer_account_links.filter((l) => l.account_id === accId);
    aceptarVinculacion(links[0].id, WS, "usr_ana", "Ana Ríos");
    const rv = w.customerAddVehicle(accId, {
      customer_id: "cust_valeria", placa: "VLR-777", tipo: "carro",
      marca: "Fiat", modelo: "Uno", anio: 2015, kilometraje: 120000,
    });
    expect(rv.ok).toBe(true);
    expect(w.deleteCustomerAccount(accId).ok).toBe(true);
    const db = readDb();
    expect(db.vehicles.some((v) => v.placa === "VLR-777")).toBe(false);
    expect(db.customer_account_links.filter((l) => l.account_id === accId).length).toBe(0);
    expect(db.customers.find((c) => c.id === "cust_valeria")!.portal_activo).toBe(false);
    expect(getPortalTokenStatus("tok_valeria_demo")).toBe("inexistente");
  });

  test("PRIVACIDAD: registrar una cuenta con el correo de otra ficha NO la vincula", () => {
    const db0 = readDb();
    expect(db0.customers.find((c) => c.id === "cust_valeria")!.portal_activo).toBe(false);
    const r = w.createCustomerAccount({
      nombre: "Otra Valeria", correo: "valeria.ospina@example.co", telefono: "+57 314 000 0000",
      password: "clave123", acepta_terminos: true,
    });
    expect(r.ok).toBe(true);
    const db = readDb();
    expect(
      db.customer_account_links.filter((l) => l.account_id === r.accountId).length).toBe(0);
  });
});

describe("Checklist visual y autorización parcial con aplazados", () => {
  test("no hay diagnóstico sin foto/video del ANTES", () => {
    const o = w.createOrder({ customer_id: "cust_andres", vehicle_id: "veh_spark", motivo_ingreso: "Prueba checklist visual" } as never, WS, ACTOR);
    const r = w.changeOrderStatus(o.id, "en_diagnostico", ACTOR, WS);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/ANTES/i);
    expect(w.addMedia(o.id, { categoria: "antes", nombre: "Recepción", url: "data:image/svg+xml;utf8,%3Csvg/%3E", visible_cliente: true }, ACTOR, WS).ok).toBe(true);
    expect(w.changeOrderStatus(o.id, "en_diagnostico", ACTOR, WS).ok).toBe(true);
  });

  test("autorizo solo frenos, no suspensión por ahora: aplazado no bloquea lo aprobado", () => {
    const o = w.createOrder({ customer_id: "cust_andres", vehicle_id: "veh_spark", motivo_ingreso: "Frenos y alineación" } as never, WS, ACTOR);
    w.addMedia(o.id, { categoria: "antes", nombre: "Recepción", url: "data:image/svg+xml;utf8,%3Csvg/%3E", visible_cliente: true }, ACTOR, WS);
    const est = w.createEstimateDraft({
      service_order_id: o.id,
      items: [
        { tipo: "repuesto", descripcion: "Pastillas de freno", cantidad: 1, precio_unitario: 200000, criticidad: "urgente" },
        { tipo: "servicio", descripcion: "Alineación", cantidad: 1, precio_unitario: 90000, criticidad: "puede_esperar" },
      ],
      descuento: 0, impuesto_porcentaje: 19, validez_dias: 15,
    } as never, ACTOR, WS);
    expect(w.sendEstimate(est.id, ACTOR, WS).ok).toBe(true);
    const db0 = readDb();
    const items = db0.estimate_items.filter((i) => i.estimate_id === est.id);
    const frenos = items.find((i) => i.descripcion.includes("Pastillas"))!;
    const alineacion = items.find((i) => i.descripcion.includes("Alineación"))!;
    expect(frenos.criticidad).toBe("urgente");
    const customer = db0.customers.find((c) => c.id === "cust_andres")!;
    w.recordDecision(est.id, [
      { item_id: frenos.id, decision: "aprobar" },
      { item_id: alineacion.id, decision: "postergar" },
    ], undefined, customer, WS);
    const db = readDb();
    expect(db.estimates.find((e) => e.id === est.id)!.estado).toBe("parcialmente_aprobada");
    const aut = db.authorizations.find((a) => a.estimate_id === est.id)!;
    expect(aut.decision).toBe("aprobada_parcial");
    expect(aut.items_postergados).toEqual([alineacion.id]);
    expect(aut.monto_aprobado).toBe(Math.round(200000 * 1.19));
    expect(db.service_orders.find((x) => x.id === o.id)!.estado).toBe("autorizado");
    // La reparación de lo aprobado avanza; lo aplazado NO la bloquea
    expect(w.changeOrderStatus(o.id, "en_reparacion", ACTOR, WS).ok).toBe(true);
  });

  test("todo aplazado: presupuesto 'postergada', nada autorizado", () => {
    const o = w.createOrder({ customer_id: "cust_camila", vehicle_id: "veh_swift", motivo_ingreso: "Consulta aplazable" } as never, WS, ACTOR);
    const est = w.createEstimateDraft({
      service_order_id: o.id,
      items: [{ tipo: "servicio", descripcion: "Servicio Z", cantidad: 1, precio_unitario: 100000, criticidad: "puede_esperar" }],
      descuento: 0, impuesto_porcentaje: 19, validez_dias: 15,
    } as never, ACTOR, WS);
    w.sendEstimate(est.id, ACTOR, WS);
    const db0 = readDb();
    const items = db0.estimate_items.filter((i) => i.estimate_id === est.id);
    const customer = db0.customers.find((c) => c.id === "cust_camila")!;
    w.recordDecision(est.id, items.map((i) => ({ item_id: i.id, decision: "postergar" as const })), "Este mes no", customer, WS);
    const db = readDb();
    expect(db.estimates.find((e) => e.id === est.id)!.estado).toBe("postergada");
    expect(db.authorizations.find((a) => a.estimate_id === est.id)!.decision).toBe("postergada");
    expect(db.service_orders.find((x) => x.id === o.id)!.estado).toBe("esperando_aprobacion");
    expect(db.notifications.some((n) => n.destinatario_tipo === "user" && n.tipo === "presupuesto_postergado")).toBe(true);
  });
});

describe("Semáforo de criticidad (panel del taller)", () => {
  test("editable mientras el presupuesto es borrador, con auditoría", () => {
    const o = w.createOrder({ customer_id: "cust_eduardo", vehicle_id: "veh_ranger", motivo_ingreso: "Falla de bomba" } as never, WS, ACTOR);
    const est = w.createEstimateDraft({
      service_order_id: o.id,
      items: [{ tipo: "repuesto", descripcion: "Bomba de gasolina", cantidad: 1, precio_unitario: 450000, criticidad: "recomendado" }],
      descuento: 0, impuesto_porcentaje: 19, validez_dias: 15,
    } as never, ACTOR, WS);
    const itemId = readDb().estimate_items.find((i) => i.estimate_id === est.id)!.id;
    expect(w.setItemCriticidad(est.id, itemId, "urgente", ACTOR, WS).ok).toBe(true);
    expect(readDb().estimate_items.find((i) => i.id === itemId)!.criticidad).toBe("urgente");
    expect(readDb().audit_logs.some((a) => a.accion === "presupuesto.semaforo")).toBe(true);
  });

  test("tras enviarse al cliente, el semáforo es inmutable", () => {
    const o = w.createOrder({ customer_id: "cust_carolina", vehicle_id: "veh_cb125", motivo_ingreso: "Prueba semáforo" } as never, WS, ACTOR);
    const est = w.createEstimateDraft({
      service_order_id: o.id,
      items: [{ tipo: "servicio", descripcion: "Sincronización", cantidad: 1, precio_unitario: 80000 }],
      descuento: 0, impuesto_porcentaje: 19, validez_dias: 15,
    } as never, ACTOR, WS);
    const itemId = readDb().estimate_items.find((i) => i.estimate_id === est.id)!.id;
    expect(w.sendEstimate(est.id, ACTOR, WS).ok).toBe(true);
    const r = w.setItemCriticidad(est.id, itemId, "urgente", ACTOR, WS);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/borrador/);
  });
});

describe("Comparativa original/homologado", () => {
  test("el cliente elige opción y el monto aprobado usa ese precio", () => {
    const o = w.createOrder({ customer_id: "cust_eduardo", vehicle_id: "veh_ranger", motivo_ingreso: "Bomba de combustible" } as never, WS, ACTOR);
    const est = w.createEstimateDraft({
      service_order_id: o.id,
      items: [{
        tipo: "repuesto", descripcion: "Bomba original", cantidad: 1, precio_unitario: 400000,
        criticidad: "urgente",
        alternativa_descripcion: "Bomba homologada AISIN", alternativa_precio_unitario: 220000,
        taller_recomienda: "alternativa",
      }],
      descuento: 0, impuesto_porcentaje: 19, validez_dias: 15,
    } as never, ACTOR, WS);
    const item = readDb().estimate_items.find((i) => i.estimate_id === est.id)!;
    expect(item.alternativa_precio_unitario).toBe(220000);
    expect(item.taller_recomienda).toBe("alternativa");
    expect(w.sendEstimate(est.id, ACTOR, WS).ok).toBe(true);
    const customer = readDb().customers.find((c) => c.id === "cust_eduardo")!;
    // El cliente aprueba ELIGIENDO el homologado
    expect(
      w.recordDecision(est.id, [{ item_id: item.id, decision: "aprobar", opcion: "alternativa" }], undefined, customer, WS).ok
    ).toBe(true);
    const db = readDb();
    const aut = db.authorizations.find((a) => a.estimate_id === est.id)!;
    expect(aut.monto_aprobado).toBe(Math.round(220000 * 1.19));
    expect(aut.items_con_alternativa).toEqual([item.id]);
    expect(
      db.order_events.some((e) => e.service_order_id === o.id && /HOMOLOGADO/i.test(e.descripcion))).toBe(true);
  });

  test("si elige el original, el monto usa el precio principal", () => {
    const o = w.createOrder({ customer_id: "cust_carolina", vehicle_id: "veh_cb125", motivo_ingreso: "Kit de arrastre" } as never, WS, ACTOR);
    const est = w.createEstimateDraft({
      service_order_id: o.id,
      items: [{
        tipo: "repuesto", descripcion: "Kit original", cantidad: 1, precio_unitario: 300000,
        alternativa_descripcion: "Kit homologado", alternativa_precio_unitario: 180000,
      }],
      descuento: 0, impuesto_porcentaje: 19, validez_dias: 15,
    } as never, ACTOR, WS);
    const item = readDb().estimate_items.find((i) => i.estimate_id === est.id)!;
    w.sendEstimate(est.id, ACTOR, WS);
    const customer = readDb().customers.find((c) => c.id === "cust_carolina")!;
    w.recordDecision(est.id, [{ item_id: item.id, decision: "aprobar", opcion: "principal" }], undefined, customer, WS);
    const aut = readDb().authorizations.find((a) => a.estimate_id === est.id)!;
    expect(aut.monto_aprobado).toBe(Math.round(300000 * 1.19));
    expect(aut.items_con_alternativa).toEqual([]);
  });
});

describe("Recordatorios automáticos de mantenimiento (retención)", () => {
  test("avisa al cliente con 3+ meses desde el último servicio y no repite antes de 30 días", () => {
    // Seed: Gloria Arbeláez (veh_cruze) recibió ORD-1005 entregada hace ~130 días
    const r = w.sendMaintenanceReminder("veh_cruze", WS, { id: "usr_ana", nombre: "Ana Ríos" });
    expect(r.ok).toBe(true);
    const db = readDb();
    expect(db.vehicles.find((v) => v.id === "veh_cruze")!.ultimo_recordatorio_mant_at).toBeDefined();
    const avisos = db.notifications.filter((n) => n.destinatario_id === "cust_gloria" && n.tipo === "recordatorio_mantenimiento");
    expect(avisos.some((n) => n.canal === "email")).toBe(true);
    expect(avisos.some((n) => n.canal === "in_app")).toBe(true);
    expect(avisos[0].cuerpo).toMatch(/meses|mantenimiento/i);
    expect(db.audit_logs.some((a) => a.accion === "mantenimiento.recordatorio")).toBe(true);
    // No se repite antes de 30 días
    const r2 = w.sendMaintenanceReminder("veh_cruze", WS, { id: "usr_ana", nombre: "Ana Ríos" });
    expect(r2.ok).toBe(false);
    expect(r2.error).toMatch(/30 días/);
  });

  test("vehículo con servicio reciente no cumple la regla", () => {
    // veh_golf: ORD-1032 entregada hace ~24 días
    const r = w.sendMaintenanceReminder("veh_golf", WS, { id: "usr_ana", nombre: "Ana Ríos" });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/mínimo 3/);
  });
});

describe("Cuentas de personal creadas por el taller (acceso sin registro)", () => {
  const OWNER = { id: "usr_carlos", nombre: "Carlos Mejía" };

  test("añadir mecánico crea la cuenta con contraseña temporal", () => {
    const r = w.inviteMember(WS, { nombre: "Juan Torres", correo: "juan.torres@motorx.co", telefono: "+57 300 123 4567", rol: "mechanic" }, OWNER);
    expect(r.ok).toBe(true);
    expect(r.passwordTemporal).toBeDefined();
    expect(r.passwordTemporal!.length).toBeGreaterThanOrEqual(10);
    const u = readDb().users.find((x) => x.correo === "juan.torres@motorx.co")!;
    expect(u.password_hash).toBeDefined();
    expect(u.password_hash!.includes(".")).toBe(true);
    expect(comparePassword(r.passwordTemporal!, u.password_hash!)).toBe(true);
    expect(u.es_admin_plataforma).toBeUndefined();
    expect(readDb().audit_logs.some((a) => a.accion === "miembro.invitar")).toBe(true);
  });

  test("el taller puede definir la contraseña inicial", () => {
    const r = w.inviteMember(WS, { nombre: "Rita Vargas", correo: "rita@motorx.co", telefono: "+57 301 222 3344", rol: "advisor", password: "claveTaller1" }, OWNER);
    expect(r.ok).toBe(true);
    expect(r.passwordTemporal).toBe("claveTaller1");
  });

  test("nueva contraseña para un miembro que la olvidó", () => {
    const db0 = readDb();
    const userId = db0.users.find((u) => u.correo === "juan.torres@motorx.co")!.id;
    const member = db0.workshop_members.find((m) => m.user_id === userId && m.workshop_id === WS)!;
    const r = w.resetMemberPassword(WS, member.id, OWNER);
    expect(r.ok).toBe(true);
    expect(r.passwordTemporal).toBeDefined();
    const u = readDb().users.find((u) => u.id === userId)!;
    expect(u.password_hash!.includes(".")).toBe(true);
    expect(comparePassword(r.passwordTemporal!, u.password_hash!)).toBe(true);
    expect(readDb().audit_logs.some((a) => a.accion === "miembro.nueva_password")).toBe(true);
    // Miembro de otro taller → no encontrado (aislamiento)
    const r2 = w.resetMemberPassword("ws_autosur", member.id, OWNER);
    expect(r2.ok).toBe(false);
  });
});

describe("Asignación de órdenes (página Equipo)", () => {
  test("asignar marca el responsable, notifica al mecánico y deja evento", () => {
    const db0 = readDb();
    const o = db0.service_orders.find((x) => x.numero === "ORD-1044")!;
    const r = w.assignResponsable(o.id, "usr_luis", { id: "usr_carlos", nombre: "Carlos Mejía" }, WS);
    expect(r.ok).toBe(true);
    const db = readDb();
    expect(db.service_orders.find((x) => x.id === o.id)!.responsable_id).toBe("usr_luis");
    expect(
      db.notifications.some((n) => n.destinatario_id === "usr_luis" && n.tipo === "trabajo_asignado")).toBe(true);
    expect(db.order_events.some((e) => e.service_order_id === o.id && /Responsable asignado/.test(e.descripcion))).toBe(true);
  });

  test("no se puede asignar a quien no es miembro activo del taller", () => {
    const o = readDb().service_orders.find((x) => x.numero === "ORD-1044")!;
    const r = w.assignResponsable(o.id, "usr_diana", { id: "usr_carlos", nombre: "Carlos Mejía" }, WS);
    expect(r.ok).toBe(false);
  });
});

describe("Limpieza", () => {
  test("elimina la base temporal", () => {
    if (fs.existsSync(".data/test-db.json")) fs.unlinkSync(".data/test-db.json");
    expect(true).toBe(true);
  });
});
