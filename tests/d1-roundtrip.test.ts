// Test de regresión: el roundtrip D1Store ↔ schema.sql debe funcionar.
// Simula el binding D1 de Cloudflare con node:sqlite y verifica que una
// cuenta de cliente creada con mutate()+flush() se lee con loadFromD1,
// y que ninguna fila del seed rompe el flush por claves foráneas.
import { test } from "vitest";
import assert from "node:assert/strict";
// @ts-ignore: node:sqlite existe en Node 22 pero @types/node@20 no lo declara
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import path from "node:path";

function makeD1(sqlite: DatabaseSync) {
  let sqlActual = "";
  const wrap = (params: unknown[]) => {
    const conv = params.map((p) => (typeof p === "boolean" ? (p ? 1 : 0) : p));
    const sql = sqlActual;
    return {
      async run() {
        sqlite.prepare(sql).run(...(conv as any[]));
        return { success: true };
      },
      async all() {
        return { results: sqlite.prepare(sql).all(...(conv as any[])) };
      },
      async first() {
        return sqlite.prepare(sql).all(...(conv as any[]))[0] ?? null;
      },
    };
  };
  return {
    prepare(sql: string) {
      sqlActual = sql;
      const w = wrap([]);
      (w as any).bind = (...p: unknown[]) => wrap(p);
      return w;
    },
    async batch(stmts: { run(): Promise<unknown> }[]) {
      for (const s of stmts) await s.run();
      return [];
    },
  };
}

test("D1 roundtrip: la cuenta creada persiste y se relee; el seed no rompe FKs", async () => {
  const schema = readFileSync(path.join(__dirname, "..", "schema.sql"), "utf8");
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(schema);
  const d1 = makeD1(sqlite);

  const { D1Store, uid, nowISO } = await import("../lib/database/d1-store");
  const { buildSeed } = await import("../lib/database/seed");

  const store = new D1Store(d1 as any, structuredClone(buildSeed()));
  store.mutate(() => {}); // marcar dirty
  await store.flush();

  const cuenta = {
    id: uid("acc"),
    nombre: "Cliente D1",
    correo: "cliente.d1@gmail.com",
    telefono: "+573000000000",
    estado: "activo" as const,
    password_hash: "hash",
    consentimiento_datos_at: nowISO(),
    created_at: nowISO(),
  };
  store.mutate((db) => {
    db.customer_accounts.push(cuenta);
    db.audit_logs.push({
      id: uid("aud"), workshop_id: null, actor_id: cuenta.id, actor_nombre: cuenta.nombre,
      accion: "cuenta_cliente.crear", entidad: "customer_accounts", entidad_id: cuenta.id,
      detalle: {}, created_at: nowISO(),
    });
  });
  await store.flush();

  const releida = await D1Store.loadFromD1(d1 as any);
  const encontrada = releida.customer_accounts.find((a) => a.correo === "cliente.d1@gmail.com");
  assert.ok(encontrada, "la cuenta nueva debe leerse de D1 tras el flush");
  assert.equal(encontrada!.id, cuenta.id);

  // El seed completo debe persistir sin violaciones de FK
  for (const tabla of ["workshops", "users", "customers", "service_orders", "estimates", "authorizations", "audit_logs"] as const) {
    const n = sqlite.prepare(`SELECT COUNT(*) AS c FROM ${tabla}`).all()[0] as { c: number };
    assert.ok(n.c > 0, `la tabla ${tabla} debe tener filas del seed tras el flush`);
  }
});
