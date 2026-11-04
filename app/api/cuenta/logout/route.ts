import type { NextRequest } from "next/server";
import { destroySessionCookie } from "@/lib/auth/session";

export async function POST(_req: NextRequest) {
  const response = await destroySessionCookie();
  return response;
}
