/**
 * Pruebas unitarias · Máquina de estados de la orden (sección 4 del documento).
 * Ejecutar: npm test
 */
import { describe, test, expect } from "vitest";
import {
  validarTransicion,
  hayAutorizacionPendiente,
  TRANSICIONES,
  ESTADOS_ORDEN,
  FLUJO_PRINCIPAL,
} from "@/lib/orders/state-machine";
import type { Estimate, EstimateItem } from "@/lib/database/types";

const estimateEnviada = { estado: "enviada" } as Estimate;
const itemsPendientes = [
  { requiere_autorizacion: true, estado: "pendiente" },
] as unknown as EstimateItem[];
const itemsAprobados = [
  { requiere_autorizacion: true, estado: "aprobada" },
] as unknown as EstimateItem[];

describe("Máquina de estados", () => {
  test("los 10 estados del documento están definidos", () => {
    expect(ESTADOS_ORDEN).toHaveLength(10);
    for (const e of [
      "recibido", "en_diagnostico", "esperando_aprobacion", "autorizado",
      "en_reparacion", "en_espera", "en_pruebas", "listo_entrega", "entregado", "cancelado",
    ]) {
      expect(ESTADOS_ORDEN.includes(e as never)).toBe(true);
    }
  });

  test("transiciones básicas permitidas", () => {
    expect(validarTransicion("recibido", "en_diagnostico").ok).toBe(true);
    expect(validarTransicion("en_diagnostico", "esperando_aprobacion").ok).toBe(true);
    expect(validarTransicion("esperando_aprobacion", "autorizado").ok).toBe(true);
    expect(validarTransicion("autorizado", "en_reparacion").ok).toBe(true);
    expect(validarTransicion("en_reparacion", "en_pruebas").ok).toBe(true);
    expect(validarTransicion("en_pruebas", "listo_entrega").ok).toBe(true);
    expect(validarTransicion("listo_entrega", "entregado").ok).toBe(true);
  });

  test("estados finales no permiten transiciones", () => {
    expect(TRANSICIONES["entregado"]).toHaveLength(0);
    expect(TRANSICIONES["cancelado"]).toHaveLength(0);
    expect(validarTransicion("entregado", "en_reparacion").ok).toBe(false);
  });

  test("no se puede saltar directamente de recibido a reparación", () => {
    expect(validarTransicion("recibido", "en_reparacion").ok).toBe(false);
  });

  test("REGLA FUNDAMENTAL: no pasar a reparación con autorización pendiente", () => {
    const r = validarTransicion("en_diagnostico", "en_reparacion", {
      estimateActual: estimateEnviada,
      itemsEstimateActual: itemsPendientes,
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/pendientes de autorización/i);
  });

  test("sí permite reparación cuando los ítems fueron aprobados", () => {
    const r = validarTransicion("autorizado", "en_reparacion", {
      estimateActual: { ...estimateEnviada, estado: "aprobada" } as Estimate,
      itemsEstimateActual: itemsAprobados,
    });
    expect(r.ok).toBe(true);
  });

  test("presupuesto rechazado bloquea la reparación", () => {
    const r = validarTransicion("en_espera", "en_reparacion", {
      estimateActual: { ...estimateEnviada, estado: "rechazada" } as Estimate,
      itemsEstimateActual: [{ requiere_autorizacion: true, estado: "rechazada" }] as unknown as EstimateItem[],
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/rechazado/i);
  });

  test("cancelar exige motivo registrado", () => {
    expect(validarTransicion("recibido", "cancelado").ok).toBe(false);
    expect(validarTransicion("recibido", "cancelado", { motivo: "Cliente retiró el vehículo" }).ok).toBe(true);
  });

  test("hayAutorizacionPendiente ignora borradores y versiones decididas", () => {
    expect(hayAutorizacionPendiente({ estado: "borrador" } as Estimate, itemsPendientes)).toBe(false);
    expect(hayAutorizacionPendiente({ estado: "aprobada" } as Estimate, itemsPendientes)).toBe(false);
    expect(hayAutorizacionPendiente(estimateEnviada, itemsPendientes)).toBe(true);
    expect(hayAutorizacionPendiente(estimateEnviada, [])).toBe(false);
  });

  test("el flujo principal cubre la ruta feliz del documento", () => {
    expect(FLUJO_PRINCIPAL).toEqual([
      "recibido", "en_diagnostico", "esperando_aprobacion", "autorizado",
      "en_reparacion", "en_pruebas", "listo_entrega", "entregado",
    ]);
  });
});
