import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { homeParaRol } from "@/lib/permissions";
import CuentaLoginForm from "@/components/auth/CuentaLoginForm";

export const dynamic = "force-dynamic";

export default async function CuentaLoginPage() {
  const session = await getSession();
  if (session) redirect(homeParaRol(session.rol));
  return (
    <Suspense>
      <CuentaLoginForm />
    </Suspense>
  );
}
