import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://tallerconecta.jpixx27.workers.dev";

  return [
    { url: base, lastModified: new Date().toISOString(), changeFrequency: "weekly", priority: 1 },
    { url: `${base}/precios`, lastModified: new Date().toISOString(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/legal/privacidad`, lastModified: new Date().toISOString(), changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/legal/terminos`, lastModified: new Date().toISOString(), changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/legal/seguridad`, lastModified: new Date().toISOString(), changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/registro`, lastModified: new Date().toISOString(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/login`, lastModified: new Date().toISOString(), changeFrequency: "monthly", priority: 0.7 },
  ];
}
