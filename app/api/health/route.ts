import { NextResponse } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { query } from "@/lib/database/index";

export async function GET() {
  try {
    await initStore();
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, status: "error", error: `initStore: ${err?.message ?? String(err)}` },
      { status: 500 }
    );
  }
  try {
    const stats = query((db) => ({
      talleres: db.workshops.length,
      usuarios: db.users.length,
      ordenes: db.service_orders.length,
      seeded_at: db.meta.seeded_at,
    }));
    await flushStore();
    return NextResponse.json({
      ok: true,
      status: "healthy",
      mode: "d1",
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, status: "error", error: `query: ${err?.message ?? String(err)}` },
      { status: 500 }
    );
  }
}
