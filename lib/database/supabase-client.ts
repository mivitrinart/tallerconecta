/**
 * Capa de datos · Conexión a Supabase (preparada para producción).
 *
 * Cuando tengas un proyecto de Supabase:
 *   1. Ejecuta supabase/migrations/0001_initial_schema.sql en el SQL Editor.
 *   2. Carga supabase/seed.sql si quieres los datos de demostración.
 *   3. Define NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY y
 *      SUPABASE_SERVICE_ROLE_KEY en .env.local
 *   4. Cambia DATA_MODE=supabase
 *
 * El aislamiento por taller se garantiza con Row Level Security (RLS):
 * las políticas de la migración filtran por workshop_id según la sesión.
 */
export function getSupabaseConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? null,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? null,
  };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseConfig();
  return Boolean(url && anonKey);
}

/**
 * Punto único de intercambio de la capa de datos.
 * Hoy todo corre en modo demo; esta función permite cambiar el backend
 * sin tocar las pantallas ni las rutas de API.
 */
export function getDataMode(): "demo" | "supabase" {
  const mode = process.env.DATA_MODE === "supabase" ? "supabase" : "demo";
  if (mode === "supabase" && !isSupabaseConfigured()) {
    console.warn(
      "[Taller Conecta] DATA_MODE=supabase pero faltan credenciales. Se usará el modo demo."
    );
    return "demo";
  }
  return mode;
}
