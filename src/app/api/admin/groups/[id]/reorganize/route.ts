import { NextResponse } from "next/server";
import { fail, safeError } from "@/lib/api";
import { collection, isLocalStore, localFind, localUpdate } from "@/lib/db";
import { currentSession, originAllowed } from "@/lib/security";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await originAllowed())) return fail(403, "ORIGIN_FORBIDDEN", "Origem não permitida.");
  if (!(await currentSession("admin"))) return fail(401, "UNAUTHORIZED", "Entre como organizador.");
  try {
    const { id } = await params;
    if (isLocalStore()) {
      const group = await localFind(item => item._id === id);
      if (!group) return fail(404, "GROUP_NOT_FOUND", "Grupo não encontrado.");
      if (group.status !== "drawn") return fail(409, "GROUP_NOT_DRAWN", "Este grupo ainda não foi sorteado.");
      let reorganized = false;
      await localUpdate(id, item => {
        if (item.status !== "drawn") return;
        item.status = "open";
        item.participants = item.participants.map(({ recipientId, ...participant }) => { void recipientId; return { ...participant, redrawNotice: true }; });
        delete item.drawnAt;
        reorganized = true;
      });
      if (!reorganized) return fail(409, "GROUP_NOT_DRAWN", "Este grupo já foi reaberto.");
      return NextResponse.json({ ok: true, status: "open" });
    }
    const groups = await collection();
    const group = await groups.findOne({ _id: id, status: "drawn" });
    if (!group) {
      const exists = await groups.findOne({ _id: id }, { projection: { _id: 1 } });
      return exists ? fail(409, "GROUP_NOT_DRAWN", "Este grupo ainda não foi sorteado.") : fail(404, "GROUP_NOT_FOUND", "Grupo não encontrado.");
    }
    const participants = group.participants.map(({ recipientId, ...participant }) => { void recipientId; return { ...participant, redrawNotice: true }; });
    const result = await groups.updateOne({ _id: id, status: "drawn", participants: group.participants }, { $set: { status: "open", participants }, $unset: { drawnAt: "" } });
    if (!result.modifiedCount) return fail(409, "GROUP_CHANGED", "O grupo mudou. Atualize o painel e tente novamente.");
    return NextResponse.json({ ok: true, status: "open" });
  } catch (error) { return safeError(error); }
}
