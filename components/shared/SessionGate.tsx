"use client";
/**
 * SessionGate: verifica la sesión del cliente y redirige según el rol.
 * Expone la sesión vía contexto para que la página raíz estática pueda
 * mostrar CTAs condicionales sin ejecutar getSession() en el servidor.
 */
import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface SessionUser {
  rol?: string;
  user_id?: string;
  nombre?: string;
  correo?: string;
}

interface SessionGateProps {
  children: React.ReactNode;
  /** Ruta a la que redirigir si el usuario es cliente */
  customerRedirect?: string;
}

const SessionContext = createContext<{ session: SessionUser | null; loaded: boolean }>({
  session: null,
  loaded: false,
});

export function useSession() {
  return useContext(SessionContext);
}

export function SessionGate({ children, customerRedirect }: SessionGateProps) {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/session", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setSession(data.session ?? null);
        setLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (session?.rol === "customer" && customerRedirect) {
      router.replace(customerRedirect);
    }
  }, [session, loaded, customerRedirect, router]);

  if (!loaded) return null;

  return (
    <SessionContext.Provider value={{ session, loaded: true }}>
      {children}
    </SessionContext.Provider>
  );
}
