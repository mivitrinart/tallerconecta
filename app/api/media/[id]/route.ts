import { NextResponse, type NextRequest } from "next/server";
import { initStore } from "@/lib/api/init-store";
import { getSession } from "@/lib/auth/session";
import { query } from "@/lib/database/index";

/**
 * Acceso restringido a fotografías, documentos y comprobantes.
 *
 * Regla del documento: los archivos NO son públicos. Esta ruta valida sesión o
 * enlace personal en el SERVIDOR (nunca se confía solo en el frontend) y sirve
 * el contenido con cabeceras de enlace temporal:
 *   Cache-Control: private, no-store  (equivalente funcional a una URL firmada
 *   con expiración).
 *
 * Los archivos se sirven desde:
 *   1. data-URI (modo demo / pruebas)
 *   2. R2 bucket privado EVIDENCIAS_BUCKET (producción en Cloudflare)
 */
export async function GET(req: NextRequest, { params: paramsP }: { params: Promise<{ id: string }> }) {
  await initStore();
  const params = await paramsP;
  const token = req.nextUrl.searchParams.get("token") ?? undefined;
  const session = await getSession();

  const media = query((db) => {
    const m = db.order_media.find((x) => x.id === params.id);
    if (!m) return null;
    const order = db.service_orders.find((o) => o.id === m.service_order_id);
    return order ? { media: m, workshopId: order.workshop_id, customerId: order.customer_id } : null;
  });
  if (!media) {
    return NextResponse.json({ error: "Medio no encontrado." }, { status: 404 });
  }

  let permitido = false;

  if (session) {
    if (session.rol !== "customer" && session.workshop_id === media.workshopId) {
      permitido = true; // personal del taller dueño de la orden
    } else if (session.rol === "customer") {
      permitido =
        media.media.visible_cliente &&
        query((db) =>
          db.customer_account_links.some(
            (l) =>
              l.account_id === session.user_id &&
              l.customer_id === media.customerId &&
              l.estado === "aceptado"
          ) &&
          db.customers.some((c) => c.id === media.customerId && c.portal_activo !== false)
        );
    }
  }

  if (!permitido && token && media.media.visible_cliente) {
    permitido = query(
      (db) =>
        db.customers.some(
          (c) =>
            c.portal_token === token &&
            c.id === media.customerId &&
            !c.anonimizado &&
            c.portal_activo !== false
        ) ?? false
    );
  }

  if (!permitido) {
    return NextResponse.json({ error: "Acceso denegado." }, { status: 404 });
  }

  const url = media.media.url;

  // 1. data-URI (modo demo / pruebas)
  if (url.startsWith("data:")) {
    const m = /^data:([^;]+);base64,(.*)$/.exec(url) ?? /^data:([^,]+),(.*)$/.exec(url);
    if (!m) return NextResponse.json({ error: "Formato no soportado." }, { status: 415 });
    const [, rawMime, contenido] = m;
    const mime = rawMime.split(";")[0].trim().toLowerCase();
    const permitidos = ["image/jpeg", "image/png", "image/webp", "image/svg+xml", "video/mp4", "application/pdf"];
    if (!permitidos.includes(mime)) {
      return NextResponse.json({ error: "Tipo de archivo no permitido." }, { status: 415 });
    }
    const body = url.includes(";base64,")
      ? Buffer.from(contenido, "base64")
      : Buffer.from(decodeURIComponent(contenido), "utf8");
    if (mime === "image/svg+xml") {
      const svgText = body.toString("utf8");
      if (/<\s*(script|foreignObject|iframe|object|embed)\b|\bon[a-z]+\s*=|javascript:/i.test(svgText)) {
        return NextResponse.json({ error: "SVG con contenido activo no permitido." }, { status: 415 });
      }
    }
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      },
    });
  }

  // 2. R2 bucket privado (producción en Cloudflare)
  if (url.startsWith("r2:")) {
    const key = url.slice(3);
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = getCloudflareContext();
    const bucket = env?.EVIDENCIAS_BUCKET;
    if (!bucket) {
      return NextResponse.json({ error: "Almacenamiento de evidencias no configurado." }, { status: 501 });
    }
    const objeto = await bucket.get(key);
    if (!objeto || !objeto.body) {
      return NextResponse.json({ error: "Archivo no encontrado en almacenamiento." }, { status: 404 });
    }
    return new NextResponse(objeto.body, {
      headers: {
        "Content-Type": objeto.httpMetadata?.contentType ?? "application/octet-stream",
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      },
    });
  }

  // 3. Modo Supabase (producción alternativa): URL firmada con expiración corta.
  // const { data } = await supabaseAdmin.storage
  //   .from("order-media").createSignedUrl(url, 60 * 5);
  // return NextResponse.redirect(data.signedUrl);
  return NextResponse.json(
    { error: "Formato de archivo no soportado." },
    { status: 415 }
  );
}
