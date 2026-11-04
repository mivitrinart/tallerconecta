import type { NextRequest } from "next/server";
import { guardAdmin, okJson } from "@/lib/auth/guards";

const DEMO_ACCOUNT_ID = "acc_maria";

/** Elimina físicamente todas las cuentas de cliente NO demo de D1.
 * Deja intacta la cuenta demo acc_maria (María Gómez).
 * Solo plataforma admin. */
export async function POST(_req: NextRequest) {
  const admin = await guardAdmin();
  if (!admin.ok) return admin.response;

  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const { env } = getCloudflareContext();
  const db = env?.taller_conecta_db;
  if (!db) {
    return okJson({ error: "D1 binding no disponible", eliminadas: 0 });
  }

  // 1) Borrar enlaces de cuentas no-demo
  const linksRes = await db.prepare(
    `DELETE FROM customer_account_links WHERE account_id NOT IN (SELECT id FROM customer_accounts WHERE id = ?)`
  ).bind(DEMO_ACCOUNT_ID).run();
  const linksDeleted = (linksRes as any).meta?.changes ?? 0;

  // 2) Borrar cuentas no-demo
  const accountsRes = await db.prepare(
    `DELETE FROM customer_accounts WHERE id != ?`
  ).bind(DEMO_ACCOUNT_ID).run();
  const accountsDeleted = (accountsRes as any).meta?.changes ?? 0;

  return okJson({
    ok: true,
    mensaje: `Cuentas de cliente no-demo eliminadas de D1`,
    cuentas_eliminadas: accountsDeleted,
    enlaces_eliminados: linksDeleted,
    cuenta_demo_mantenida: DEMO_ACCOUNT_ID,
  });
}
