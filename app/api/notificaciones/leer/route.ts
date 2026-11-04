import type { NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { markNotificationsRead } from "@/lib/orders/workflows";
import { fail, okJson } from "@/lib/auth/guards";

const schema = z.object({ ids: z.array(z.string().min(1)).optional() });

export async function POST(req: NextRequest) {
  await initStore();
  const session = await getSession();
  if (!session) return fail("Sesión requerida.", 401);
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  const ids = parsed.success ? parsed.data.ids : undefined;
  const count = markNotificationsRead("user", session.user_id, ids);
  await flushStore();
  return okJson({ count });
}
