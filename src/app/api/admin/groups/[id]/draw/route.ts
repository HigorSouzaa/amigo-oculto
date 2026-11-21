import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { fail, safeError } from "@/lib/api";
import { collection, isLocalStore, localFind, localUpdate } from "@/lib/db";
import { currentSession, originAllowed } from "@/lib/security";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await originAllowed())) return fail(403, "ORIGIN_FORBIDDEN", "Origem não permitida.");
  if (!(await currentSession("admin"))) return fail(401, "UNAUTHORIZED", "Entre como organizador.");
  try { const { id } = await params; const groups = isLocalStore() ? null : await collection(); const group = isLocalStore() ? await localFind(g=>g._id===id) : await groups!.findOne({ _id: id });
    if (!group) return fail(404, "GROUP_NOT_FOUND", "Grupo não encontrado.");
    if (group.status === "drawn") return fail(409, "ALREADY_DRAWN", "O sorteio deste grupo já foi realizado.");
    const n = group.participants.length; if (n < 2) return fail(409, "NOT_ENOUGH_PARTICIPANTS", "São necessárias pelo menos duas pessoas.");
    // Random cyclic permutation: each participant receives one distinct participant other than self.
    const order = [...group.participants]; for (let i = n - 1; i > 0; i--) { const j = randomInt(i + 1); [order[i], order[j]] = [order[j], order[i]]; }
    const recipientByParticipant = new Map(order.map((participant, index) => [participant.id, order[(index + 1) % n].id]));
    const participants = group.participants.map(participant => ({ ...participant, recipientId: recipientByParticipant.get(participant.id)! }));
    const closed = isLocalStore() ? await localUpdate(id,g=>{if(g.status==="open"&&g.participants.length===participants.length){g.participants=participants;g.status="drawn";g.drawnAt=new Date();}}) : !!(await groups!.updateOne({ _id: id, status: "open", participants: group.participants }, { $set: { participants, status: "drawn", drawnAt: new Date() } })).modifiedCount;
    if (!closed) return fail(409, "GROUP_CHANGED", "O grupo mudou durante o sorteio. Atualize o painel e tente novamente.");
    return NextResponse.json({ ok: true });
  } catch (e) { return safeError(e); }
}
