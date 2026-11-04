import type { NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { getSession } from "@/lib/auth/session";
import { listNotificationsFor } from "@/lib/database/queries";
import { fail, okJson } from "@/lib/auth/guards";
import type { CanalNotificacion } from "@/lib/database/types";

export async function GET(req: NextRequest) {
  await initStore();
  const session = await getSession();
  if (!session) return fail("Sesión requerida.", 401);
  const rawCanal = req.nextUrl.searchParams.get("canal");
  const canal: CanalNotificacion | undefined =
    rawCanal === "in_app" || rawCanal === "email" || rawCanal === "whatsapp" ? rawCanal : undefined;
  const notifications = listNotificationsFor("user", session.user_id, { canal, limit: 20 });
  return okJson({ notifications });
}
