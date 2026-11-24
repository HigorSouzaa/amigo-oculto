import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { fail, safeError } from "@/lib/api";
import { collection, isLocalStore, localFind } from "@/lib/db";
import { currentSession, rateLimited } from "@/lib/security";
export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  if (await rateLimited("participant-result")) return fail(429, "RATE_LIMITED", "Muitas consultas. Aguarde 15 minutos.");
  try { const { token } = await params; const session = await currentSession("participant"); if (!session?.sub || typeof session.groupId !== "string") return fail(401, "INVALID_CREDENTIALS", "Entre com seu nome e PIN para consultar."); const group = isLocalStore() ? await localFind(g=>g.token===token&&g._id===session.groupId) : await (await collection()).findOne({ token, _id: session.groupId });
    if (!group) { (await cookies()).delete("participant_session"); return fail(401, "INVALID_CREDENTIALS", "Entre com seu nome e PIN para consultar."); }
    if (group.status !== "drawn") return fail(409, "DRAW_PENDING", "O sorteio ainda não foi realizado.");
    const participant = group.participants.find(p => p.id === session.sub); const recipient = group.participants.find(p => p.id === participant?.recipientId);
    if (!participant || !recipient || participant.id === recipient.id) return fail(409, "RESULT_UNAVAILABLE", "Não foi possível localizar seu resultado.");
    return NextResponse.json({ result: { participantName: participant.name, recipientName: recipient.name }, reorganizationNotice: !!participant.redrawNotice });
  } catch (e) { return safeError(e); }
}
