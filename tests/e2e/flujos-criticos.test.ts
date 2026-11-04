/**
 * Pruebas E2E · Flujos críticos de Taller Conecta (módulo Playwright).
 * Ejecutar: `npm run dev -- --webpack` en otra terminal, luego `npm run e2e`.
 *
 * Las pruebas navegan contra el servidor vivo y, donde el formulario de la UI
 * requiere interactividad de cliente (montaje de React en dev), disparan las
 * mismas APIs HTTP que usa la UI. Así cubren los flujos críticos sin depender
 * de comportamientos del navegador que el dev server no garantiza.
 */
import { test, expect, type APIResponse, type Page } from "@playwright/test";
import { buildSeed } from "../../lib/database/seed";

const CORREO = () => `qa.e2e.${Date.now()}@taller.test`;

function tokenDeSetCookie(response: APIResponse): string | null {
  const raw = response.headers()["set-cookie"];
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const m = list.find((s: string) => s.startsWith("__Host-tc_session="))?.match(/^__Host-tc_session=([^;]+)/);
  return m ? m[1] : null;
}

async function inyectarSesion(page: Page, token: string) {
  await page.context().addCookies([
    { name: "__Host-tc_session", value: token, url: "https://localhost:3443", secure: true },
  ]);
}

test("registro de taller y acceso al panel del taller", async ({ page, request }) => {
  // El chooser de roles se renderiza desde el servidor.
  await page.goto("/registro", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Regístrate" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Registrar taller" })).toBeVisible();

  const registro = await request.post("/api/registro", {
    data: {
      taller_nombre: `Taller E2E ${Date.now()}`,
      ciudad: "Bogotá",
      telefono: "+573012223344",
      nit: "900.111.222-3",
      nombre: "QA Propietario",
      correo: CORREO(),
      password: "TallerE2e123!",
      acepta_terminos: true,
      sitio_web: "",
      automation_detected: false,
    },
  });
  expect(registro.ok(), await registro.text()).toBe(true);

  const token = tokenDeSetCookie(registro);
  expect(token).toBeTruthy();
  await inyectarSesion(page, token!);

  await page.goto("/taller/dashboard");
  await expect(page).toHaveURL(/\/taller\/dashboard/);
  await expect(page.getByRole("heading", { name: /Panel de control/ })).toBeVisible();
});

test("crear orden de servicio (recepción de vehículo)", async ({ page, request }) => {
  const registro = await request.post("/api/registro", {
    data: {
      taller_nombre: "Taller Orden E2E",
      ciudad: "Medellín",
      telefono: "+573042223333",
      nit: "",
      nombre: "QA Asesor",
      correo: CORREO(),
      password: "TallerE2e123!",
      acepta_terminos: true,
      sitio_web: "",
      automation_detected: false,
    },
  });
  expect(registro.ok()).toBe(true);
  await inyectarSesion(page, tokenDeSetCookie(registro)!);

  const orden = await request.post("/api/ordenes", {
    data: {
      new_customer: {
        nombre: "Cliente Prueba E2E",
        telefono: "3001112233",
        correo: CORREO(),
      },
      new_vehicle: {
        placa: "QAS-111",
        tipo: "carro",
        marca: "Mazda",
        modelo: "3",
        anio: 2020,
        kilometraje: 45000,
      },
      motivo_ingreso: "Revisión de frenos E2E",
    },
  });
  expect(orden.ok(), await orden.text()).toBe(true);
  const body = await orden.json();
  expect(body.numero).toMatch(/^ORD-/);
  expect(body.redirect).toMatch(/\/taller\/ordenes\/ord_/);

  await page.goto(body.redirect);
  await expect(page.getByText(body.numero)).toBeVisible();
  await expect(page.locator("text=Recibido").first()).toBeVisible();
});

test("cliente aprueba presupuesto desde el portal personal (/o/[token])", async ({ page, request }) => {
  // El portal y su presupuesto se renderizan desde el servidor con datos de la demo.
  await page.goto("/o/tok_maria_demo");
  await expect(page.getByRole("heading", { name: /ORD-1048/ })).toBeVisible();

  const aprobadoYa = !(await page.getByTitle("Aprobar").first()).isVisible();
  if (!aprobadoYa) {
    // Ids de ítem del presupuesto v2 (deterministas: buildSeed reinicia su contador).
    const db = buildSeed();
    const orden = db.service_orders.find((o) => o.numero === "ORD-1048");
    expect(orden).toBeDefined();
    const estimate = db.estimates.find((e) => e.service_order_id === orden!.id && e.version === 2);
    expect(estimate?.estado).toBe("enviada");
    const items = db.estimate_items.filter((i) => i.estimate_id === estimate!.id);
    expect(items.length).toBeGreaterThan(0);

    const decision = await request.post(`/api/presupuestos/${estimate!.id}/decision`, {
      data: {
        token: "tok_maria_demo",
        decisiones: items.map((i) => ({ item_id: i.id, decision: "aprobar" })),
        comentario: "Apruebo todos los trabajos del presupuesto v2.",
      },
    });
    if (!decision.ok()) {
      const text = await decision.text();
      // Puede estar ya decidido si la prueba se repite sin reiniciar el servidor.
      expect(text).toContain("ya no acepta decisiones");
    } else {
      expect(decision.ok()).toBe(true);
    }

    await page.goto("/o/tok_maria_demo");
  }

  // La decisión del cliente queda registrada en el presupuesto.
  await expect(page.getByText(/decisión registrada/)).toBeVisible();
});
