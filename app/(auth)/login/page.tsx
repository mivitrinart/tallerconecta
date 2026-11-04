import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { homeParaRol } from "@/lib/permissions";
import LoginTabs from "@/components/auth/LoginTabs";

export const dynamic = "force-dynamic";

/**
 * Entrada única de sesión con selector Cliente / Taller.
 * ?tipo=cliente abre directamente la pestaña de clientes (el portal de
 * seguimiento enlaza aquí). Si la sesión sigue viva, redirige al panel.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; next?: string }>;
}) {
  const session = await getSession();
  if (session) redirect(homeParaRol(session.rol));
  const sp = await searchParams;
  return (
    <Suspense>
      <LoginTabs initialTab={sp.tipo === "cliente" ? "cliente" : "taller"} />
    </Suspense>
  );
}
