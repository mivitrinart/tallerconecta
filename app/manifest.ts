import type { MetadataRoute } from "next";

/**
 * Manifiesto PWA: permite instalar la app en Android/iOS y es la base para
 * generar el APK con Bubblewrap (TWA). Ver docs/COMO-GENERAR-APK.md.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Taller Conecta — Talleres mecánicos y clientes",
    short_name: "TallerConecta",
    description:
      "Seguimiento de reparaciones, presupuestos con aprobación del cliente, evidencias fotográficas y notificaciones. Para talleres mecánicos y sus clientes.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f172a",
    theme_color: "#1d4ed8",
    lang: "es-CO",
    categories: ["business", "productivity", "utilities"],
    icons: [
      { src: "/icons/icon-48.png", sizes: "48x48", type: "image/png", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
