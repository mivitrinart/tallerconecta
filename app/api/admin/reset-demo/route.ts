import { NextResponse } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { resetDemoDb } from "@/lib/database/index";
import { getDataMode } from "@/lib/database/supabase-client";
import { guardAdmin } from "@/lib/auth/guards";

/** Solo modo demo: restablece la base de datos local al seed inicial. Requiere rol platform_admin. */
export async function POST() {
  await initStore();
  const admin = await guardAdmin();
  if (!admin.ok) return admin.response;
  if (getDataMode() !== "demo") {
    return NextResponse.json({ error: "Disponible solo en modo demo." }, { status: 403 });
  }
  resetDemoDb();
  return NextResponse.json({ ok: true });
}
