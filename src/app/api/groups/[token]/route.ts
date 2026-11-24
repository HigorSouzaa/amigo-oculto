import { NextResponse } from "next/server";
import { fail, safeError } from "@/lib/api";
import { collection, isLocalStore, localFind } from "@/lib/db";
import { currentSession } from "@/lib/security";
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try { const { token } = await params; const session = await currentSession("participant"); const group = isLocalStore() ? await localFind(g=>g.token===token) : await (await collection()).findOne({ token }, { projection: { name: 1, status: 1, "participants.id": 1, "participants.redrawNotice": 1 } });
    if (!group) return fail(404, "GROUP_UNAVAILABLE", "Este grupo não está disponível.");
    const participant = typeof session?.sub === "string" && session.groupId === group._id ? group.participants.find(item => item.id === session.sub) : undefined;
    return NextResponse.json({ group: { name: group.name, status: group.status, reorganizationNotice: !!participant?.redrawNotice } });
  } catch (e) { return safeError(e); }
}
