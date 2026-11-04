/** Utilidades de formato: moneda colombiana, fechas y tiempos relativos. */

export function formatCOP(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor);
}

export function formatNumero(valor: number): string {
  return new Intl.NumberFormat("es-CO").format(valor);
}

export function formatKm(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "—";
  return `${formatNumero(valor)} km`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "ayer";
  if (d < 30) return `hace ${d} días`;
  return formatDate(iso);
}

export function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

export function diasEntre(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export function esMismaFecha(iso: string, fecha: Date = new Date()): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === fecha.getFullYear() &&
    d.getMonth() === fecha.getMonth() &&
    d.getDate() === fecha.getDate()
  );
}

export function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/**
 * Limpia textos de notificaciones: elimina caracteres de control, normaliza
 * espacios y convierte comillas/guiones raros a ASCII para evitar "signos raros"
 * al renderizar en el navegador.
 */
export function sanitizeTexto(texto: string): string {
  if (!texto) return texto;
  return texto
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // elimina caracteres de control
    .replace(/[\u2018\u2019\u201A]/g, "'") // comillas simples curvas → '
    .replace(/[\u201C\u201D\u201E]/g, '"') // comillas dobles curvas → "
    .replace(/[\u2013\u2014]/g, "-") // guiones en/em → -
    .replace(/\u00A0/g, " ") // espacio no rompible → espacio normal
    .replace(/\s+/g, " ") // colapsa múltiples espacios
    .trim();
}
