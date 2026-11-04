import { guardCustomerAccount, fail, okJson } from "@/lib/auth/guards";
import { initStore, flushStore } from "@/lib/api/init-store";
import { deleteCustomerAccount } from "@/lib/orders/workflows";
import { destroySessionCookie } from "@/lib/auth/session";
import { NextResponse } from "next/server";

export async function POST() {
  await initStore();
  const auth = await guardCustomerAccount();
  if (!auth.ok) return auth.response;
  const res = deleteCustomerAccount(auth.account.id);
  if (!res.ok) return fail(res.error ?? "No se pudo eliminar la cuenta.", 400);
  await flushStore();
  const cookieRes = await destroySessionCookie();
  const response = NextResponse.json({ id: res.id });
  // Copiar cookie de destrucción
  const setCookie = cookieRes.headers.get("Set-Cookie");
  if (setCookie) response.headers.set("Set-Cookie", setCookie);
  return response;
}
