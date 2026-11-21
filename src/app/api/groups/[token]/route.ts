import { NextResponse } from "next/server";
import { fail, safeError } from "@/lib/api";
import { collection, isLocalStore, localFind } from "@/lib/db";
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try { const { token } = await params; const group = isLocalStore() ? await localFind(g=>g.token===token) : await (await collection()).findOne({ token }, { projection: { name: 1, status: 1 } });
    if (!group) return fail(404, "GROUP_UNAVAILABLE", "Este grupo não está disponível."); return NextResponse.json({ group: { name: group.name, status: group.status } });
  } catch (e) { return safeError(e); }
}
