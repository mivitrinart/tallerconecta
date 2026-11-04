import { type NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { guardStaff, fail, okJson } from "@/lib/auth/guards";
import { query, uid } from "@/lib/database/index";
import { addMedia } from "@/lib/orders/workflows";
import { z } from "zod";

const mediaUploadSchema = z.object({
  order_id: z.string().min(1),
  categoria: z.enum(["antes", "durante", "despues", "documento", "otro"]),
  nombre: z.string().min(2).max(140),
  visible_cliente: z.string().optional(),
});

const TIPOS_PERMITIDOS: Record<string, string[]> = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  video: ["video/mp4", "video/webm", "video/quicktime"],
};
const LIMITE_BYTES: Record<string, number> = {
  "image/jpeg": 8_000_000,
  "image/png": 8_000_000,
  "image/webp": 8_000_000,
  "image/gif": 8_000_000,
  "video/mp4": 30_000_000,
  "video/webm": 30_000_000,
  "video/quicktime": 30_000_000,
};

function extensionDe(nombre: string): string {
  const partes = nombre.split(".");
  return partes.length > 1 ? partes[partes.length - 1].toLowerCase() : "bin";
}

export async function POST(req: NextRequest) {
  await initStore();
  const auth = await guardStaff("media.upload");
  if (!auth.ok) return auth.response;

  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const { env } = getCloudflareContext();
  const bucket = env?.EVIDENCIAS_BUCKET;
  if (!bucket) {
    return fail("Almacenamiento de evidencias no configurado (EVIDENCIAS_BUCKET).", 501);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("Cuerpo de petición inválido (se espera multipart/form-data).", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return fail("Debes adjuntar un archivo (foto o video).", 400);
  }

  const parsed = mediaUploadSchema.safeParse({
    order_id: form.get("order_id"),
    categoria: form.get("categoria"),
    nombre: form.get("nombre"),
    visible_cliente: form.get("visible_cliente"),
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Datos del archivo inválidos.", 400);
  }

  const mime = file.type.toLowerCase();
  const permitido = Object.values(TIPOS_PERMITIDOS).flat().includes(mime);
  if (!permitido) {
    return fail("Tipo de archivo no permitido. Usa JPG, PNG, WEBP, GIF, MP4, WEBM o MOV.", 415);
  }
  const max = LIMITE_BYTES[mime];
  if (max && file.size > max) {
    return fail(`Archivo demasiado grande (máx. ${Math.round(max / 1_000_000)} MB para ${mime}).`, 413);
  }

  const { order_id, categoria, nombre } = parsed.data;
  const visibleCliente = parsed.data.visible_cliente !== "false";

  // Comprueba la orden y el aislamiento por taller antes de escribir.
  const order = query((db) => db.service_orders.find((o) => o.id === order_id && o.workshop_id === auth.workshopId));
  if (!order) return fail("Orden no encontrada en este taller.", 404);

  const ext = extensionDe(file.name);
  const key = `evidencias/${auth.workshopId}/${order_id}/${uid("med")}.${ext}`;

  const ab = Buffer.from(await file.arrayBuffer());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const put = bucket.put as unknown as ((...args: any[]) => Promise<void>);
  await put(key, ab.buffer, { httpMetadata: { contentType: mime } });

  const url = `r2:${key}`;
  const resultado = addMedia(
    order_id,
    { categoria, nombre, url, visible_cliente: visibleCliente },
    auth.actor,
    auth.workshopId
  );
  if (!resultado.ok) {
    return fail(resultado.error ?? "No se pudo registrar la evidencia.", 400);
  }

  await flushStore();

  const medio = query((db) =>
    db.order_media.find((m) => m.service_order_id === order_id && m.url === url)
  );
  return okJson({
    id: medio?.id ?? "",
    nombre,
    categoria,
    url: `/api/media/${medio?.id ?? ""}`,
    visible_cliente: visibleCliente,
  });
}
