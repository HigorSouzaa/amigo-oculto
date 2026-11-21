import { cookies } from "next/headers";
import { fail } from "@/lib/api";
import { currentSession, originAllowed } from "@/lib/security";
import { NextResponse } from "next/server";
export async function POST() {
  if (!(await originAllowed())) return fail(403, "ORIGIN_FORBIDDEN", "Origem não permitida.");
  if (!(await currentSession("admin"))) return fail(401, "UNAUTHORIZED", "Entre como organizador.");
  (await cookies()).delete("admin_session"); return NextResponse.json({ ok: true });
}
