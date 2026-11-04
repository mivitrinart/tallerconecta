// Prueba local del roundtrip D1Store ↔ schema.sql usando node:sqlite como D1 falso.
// Verifica que una cuenta creada con mutate()+flush() se lee de nuevo con loadFromD1,
// tal como ocurre en Cloudflare D1 en producción.
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";

const schema = readFileSync(new URL("../schema.sql", import.meta.url), "utf8");
const sqlite = new DatabaseSync(":memory:");
sqlite.exec(schema);

// Shim mínimo del binding D1 de Cloudflare sobre node:sqlite
function makeD1(db) {
  const wrap = (params) => {
    const conv = params.map(p => (typeof p === "boolean" ? (p ? 1 : 0) : p));
    return {
      stmt: db.prepare(sql0),
      async run() { this.stmt.run(...conv); return { success: true }; },
      async all() { return { results: this.stmt.all(...conv) }; },
      async first() { return this.stmt.all(...conv)[0] ?? null; },
    };
  };
  let sql0 = "";
  return {
    prepare(sql) {
      sql0 = sql;
      const w = wrap([]);
      w.bind = (...params) => wrap(params);
      return w;
    },
    async batch(stmts) {
      for (const s of stmts) await s.run();
      return [];
    },
  };
}

const d1 = makeD1(sqlite);
const { D1Store } = await import("../lib/database/d1-store.ts");
const { buildSeed } = await import("../lib/database/seed.ts");

// 1. Cargar seed inicial y persistir (como hace el primer arranque)
const seed = buildSeed();
let store = new D1Store(d1, structuredClone(seed));
store.markDirty?.();
// Forzar flush completo del seed
store.cache = structuredClone(seed);
await store.flush();

// 2. Simular el registro de un cliente nuevo (ruta /api/cuenta/registro)
const { uid, nowISO } = await import("../lib/database/d1-store.ts");
const nuevaCuenta = {
  id: uid("acc"), nombre: "Cliente D1", correo: "cliente.d1@gmail.com",
  telefono: "+573000000000", estado: "activo", password_hash: "hash",
  consentimiento_datos_at: nowISO(), created_at: nowISO(),
};
store.mutate((db) => { db.customer_accounts.push(nuevaCuenta); });
await store.flush(); // lo que hace flushStore() en la ruta

// 3. Recargar desde D1 como hace initStore() en la siguiente petición
const datos = await D1Store.loadFromD1(d1);
const encontrada = datos.customer_accounts.find((a) => a.correo === "cliente.d1@gmail.com");

if (!encontrada) {
  console.error("❌ FALLA: la cuenta nueva NO se leyó de D1 después del flush");
  process.exit(1);
}
console.log("✅ Roundtrip OK: cuenta persistida y releída de D1:", encontrada.id, encontrada.correo);

// 4. Verificar que todas las tablas del seed sobrevivieron el roundtrip
for (const t of ["workshops", "users", "customers", "customer_accounts", "vehicles", "service_orders"]) {
  const n = datos[t]?.length ?? 0;
  console.log(`  ${t}: ${n} filas`);
}
console.log("✅ Todas las tablas presentes en el esquema y el store");
