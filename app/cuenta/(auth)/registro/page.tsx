import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { homeParaRol } from "@/lib/permissions";
import CuentaRegistroForm from "@/components/auth/CuentaRegistroForm";

export const dynamic = "force-dynamic";

export default async function CuentaRegistroPage() {
  const session = await getSession();
  if (session) redirect(homeParaRol(session.rol));
  return (
    <Suspense>
      <CuentaRegistroForm />
    </Suspense>
  );
}
