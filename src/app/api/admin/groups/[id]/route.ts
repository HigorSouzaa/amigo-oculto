import { NextResponse } from "next/server";
import { fail, safeError } from "@/lib/api";
import { collection, isLocalStore, localFind } from "@/lib/db";
import { currentSession } from "@/lib/security";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await currentSession("admin"))) return fail(401, "UNAUTHORIZED", "Entre como organizador.");
  try { const { id } = await params; const group = isLocalStore() ? await localFind(g=>g._id===id) : await (await collection()).findOne({ _id: id }); if (!group) return fail(404, "GROUP_NOT_FOUND", "Grupo não encontrado.");
    return NextResponse.json({ group: { id: group._id, name: group.name, status: group.status, participants: group.participants.map(p => ({ name: p.name, joinedAt: p.joinedAt })), joinUrl: `${process.env.APP_URL || new URL(_request.url).origin}/g/${group.token}` } });
  } catch (e) { return safeError(e); }
}
