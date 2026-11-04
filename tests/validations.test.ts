/**
 * Pruebas unitarias · Validaciones (zod) y cálculos de presupuesto.
 * Ejecutar: npm test
 */
import { describe, test, expect } from "vitest";
import {
  loginSchema, orderCreateSchema, estimateCreateSchema,
  decisionSchema, ratingSchema, customerSchema, registroSchema,
} from "@/lib/validations/schemas";
import { calcularTotales } from "@/lib/orders/workflows";

describe("Validaciones de entrada", () => {
  test("login: correo inválido se rechaza", () => {
    expect(loginSchema.safeParse({ correo: "no-es-correo", password: "taller123" }).success).toBe(false);
    expect(loginSchema.safeParse({ correo: "a@b.co", password: "taller123" }).success).toBe(true);
  });

  test("orden: exige cliente y vehículo (existentes o nuevos)", () => {
    const base = { motivo_ingreso: "Revisión de frenos" };
    expect(orderCreateSchema.safeParse(base).success).toBe(false);
    expect(orderCreateSchema.safeParse({ ...base, customer_id: "c1" }).success).toBe(false);
    expect(orderCreateSchema.safeParse({ ...base, customer_id: "c1", vehicle_id: "v1" }).success).toBe(true);
    expect(
      orderCreateSchema.safeParse({
        ...base,
        new_customer: { nombre: "Ana Ruiz", telefono: "3001112233", correo: "ana@x.co" },
        new_vehicle: { placa: "ABC123", tipo: "carro", marca: "Kia", modelo: "Rio", anio: 2020, kilometraje: 10 },
      }).success
    ).toBe(true);
  });

  test("presupuesto: mínimo un ítem, precios no negativos", () => {
    expect(estimateCreateSchema.safeParse({ service_order_id: "o1", items: [] }).success).toBe(false);
    expect(
      estimateCreateSchema.safeParse({
        service_order_id: "o1",
        items: [{ tipo: "repuesto", descripcion: "x", cantidad: 1, precio_unitario: -5 }],
      }).success
    ).toBe(false);
    expect(
      estimateCreateSchema.safeParse({
        service_order_id: "o1",
        items: [{ tipo: "mano_obra", descripcion: "Cambio de aceite", cantidad: 1, precio_unitario: 80000 }],
      }).success
    ).toBe(true);
  });

  test("decisión del cliente: aprobar o rechazar por ítem", () => {
    expect(decisionSchema.safeParse({ decisiones: [] }).success).toBe(false);
    expect(
      decisionSchema.safeParse({ decisiones: [{ item_id: "i1", decision: "talvez" }] }).success
    ).toBe(false);
    expect(
      decisionSchema.safeParse({ decisiones: [{ item_id: "i1", decision: "aprobar" }, { item_id: "i2", decision: "rechazar" }] }).success
    ).toBe(true);
  });

  test("calificación entre 1 y 5", () => {
    expect(ratingSchema.safeParse({ calificacion: 0 }).success).toBe(false);
    expect(ratingSchema.safeParse({ calificacion: 6 }).success).toBe(false);
    expect(ratingSchema.safeParse({ calificacion: 5 }).success).toBe(true);
  });

  test("cliente: correo y teléfono obligatorios", () => {
    expect(customerSchema.safeParse({ nombre: "A", telefono: "1", correo: "x" }).success).toBe(false);
    expect(customerSchema.safeParse({ nombre: "Ana Ruiz", telefono: "+573001112233", correo: "ana@x.co" }).success).toBe(true);
  });

  test("registro de taller: contraseña mínima 8", () => {
    expect(
      registroSchema.safeParse({ taller_nombre: "Taller X", ciudad: "Bogotá", telefono: "6011234567", nombre: "Juan", correo: "j@x.co", password: "123" }).success
    ).toBe(false);
  });
});

describe("Cálculo de presupuestos (IVA Colombia)", () => {
  const items = [
    { cantidad: 4, precio_unitario: 320000 },
    { cantidad: 2, precio_unitario: 85000 },
    { cantidad: 1, precio_unitario: 450000 },
  ];

  test("bruto, subtotal con descuento, IVA 19% y total", () => {
    const t = calcularTotales(items, 50000, 19);
    expect(t.bruto).toBe(4 * 320000 + 2 * 85000 + 450000);
    expect(t.subtotal).toBe(t.bruto - 50000);
    expect(t.impuestos).toBe(Math.round(t.subtotal * 0.19));
    expect(t.total).toBe(t.subtotal + t.impuestos);
  });

  test("el descuento no puede dejar el subtotal negativo", () => {
    const t = calcularTotales([{ cantidad: 1, precio_unitario: 10000 }], 999999, 19);
    expect(t.subtotal).toBe(0);
    expect(t.total).toBe(0);
  });

  test("sin impuesto (0%)", () => {
    const t = calcularTotales(items, 0, 0);
    expect(t.total).toBe(t.bruto);
  });
});
