import { NextResponse } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { destroySessionCookie } from "@/lib/auth/session";

export async function POST() {
  await initStore();
  const response = await destroySessionCookie();
  return NextResponse.json({ ok: true }, { headers: response.headers });
}
