/**
 * Fuente de medios con control de acceso.
 * En demo las evidencias son data-URIs (viajan incrustadas). En producción,
 * cuando el archivo vive en Supabase Storage, la fuente pasa por la ruta
 * /api/media/[id], que valida permisos en el servidor y sirve el contenido
 * como enlace temporal (equivalente a una URL firmada con expiración).
 */
export function mediaSrc(m: { id: string; url: string }, opts: { token?: string } = {}): string {
  if (m.url.startsWith("data:")) return m.url;
  const qs = opts.token ? `?token=${encodeURIComponent(opts.token)}` : "";
  return `/api/media/${m.id}${qs}`;
}
