"use client";
/** Registra el service worker (solo en producción, para no interferir con el hot-reload de dev). */
import { useEffect } from "react";

export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* PWA opcional: si el navegador lo bloquea, la app sigue funcionando */
      });
    }
  }, []);
  return null;
}
