import { NextResponse } from "next/server";
import { body, fail, safeError } from "@/lib/api";
import { collection, isLocalStore, localFind, localUpdate } from "@/lib/db";
import { currentSession, fingerprint, hashSecret, originAllowed } from "@/lib/security";

type Params = { params: Promise<{ id: string; participantId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  if (!(await originAllowed())) return fail(403, "ORIGIN_FORBIDDEN", "Origem não permitida.");
  if (!(await currentSession("admin"))) return fail(401, "UNAUTHORIZED", "Entre como organizador.");
  try {
    const { id, participantId } = await params;
    const data = await body(request);
    if (!data || (data.name === undefined && data.pin === undefined)) return fail(400, "INVALID_INPUT", "Informe um nome ou um novo PIN.");
    if (data.name !== undefined && (typeof data.name !== "string" || data.name.trim().normalize("NFC").length < 2 || data.name.trim().normalize("NFC").length > 60)) return fail(400, "INVALID_INPUT", "O nome deve ter de 2 a 60 caracteres.");
    if (data.pin !== undefined && (typeof data.pin !== "string" || !/^\d{4}$/.test(data.pin))) return fail(400, "INVALID_INPUT", "O novo PIN deve ter exatamente 4 dígitos.");

    const name = typeof data.name === "string" ? data.name.trim().normalize("NFC") : undefined;
    const nameKey = name === undefined ? undefined : fingerprint(name);
    const pinHash = typeof data.pin === "string" ? await hashSecret(data.pin) : undefined;

    if (isLocalStore()) {
      const group = await localFind(item => item._id === id);
      if (!group) return fail(404, "GROUP_NOT_FOUND", "Grupo não encontrado.");
      const participant = group.participants.find(item => item.id === participantId);
      if (!participant) return fail(404, "PARTICIPANT_NOT_FOUND", "Participante não encontrado.");
      if (nameKey && group.participants.some(item => item.id !== participantId && item.nameKey === nameKey)) return fail(409, "DUPLICATE_NAME", "Outra pessoa já está usando esse nome no grupo.");
      await localUpdate(id, item => { const target = item.participants.find(person => person.id === participantId); if (target) { if (name !== undefined) { target.name = name; target.nameKey = nameKey!; } if (pinHash) target.pinHash = pinHash; } });
      return NextResponse.json({ participant: { id: participantId, name: name ?? participant.name } });
    }

    const groups = await collection();
    const group = await groups.findOne({ _id: id }, { projection: { participants: 1 } });
    if (!group) return fail(404, "GROUP_NOT_FOUND", "Grupo não encontrado.");
    const participant = group.participants.find(item => item.id === participantId);
    if (!participant) return fail(404, "PARTICIPANT_NOT_FOUND", "Participante não encontrado.");
    const update: Record<string, string> = {};
    if (name !== undefined) { update["participants.$[target].name"] = name; update["participants.$[target].nameKey"] = nameKey!; }
    if (pinHash) update["participants.$[target].pinHash"] = pinHash;
    const filter: Record<string, unknown> = { _id: id, "participants.id": participantId };
    if (nameKey && nameKey !== participant.nameKey) filter.participants = { $not: { $elemMatch: { id: { $ne: participantId }, nameKey } } };
    const result = await groups.updateOne(filter, { $set: update }, { arrayFilters: [{ "target.id": participantId }] });
    if (!result.matchedCount) {
      const stillExists = await groups.findOne({ _id: id, "participants.id": participantId }, { projection: { _id: 1 } });
      if (!stillExists) return fail(404, "PARTICIPANT_NOT_FOUND", "Participante não encontrado.");
      return fail(409, "DUPLICATE_NAME", "Outra pessoa já está usando esse nome no grupo.");
    }
    return NextResponse.json({ participant: { id: participantId, name: name ?? participant.name } });
  } catch (error) { return safeError(error); }
}

export async function DELETE(request: Request, { params }: Params) {
  if (!(await originAllowed())) return fail(403, "ORIGIN_FORBIDDEN", "Origem não permitida.");
  if (!(await currentSession("admin"))) return fail(401, "UNAUTHORIZED", "Entre como organizador.");
  try {
    const { id, participantId } = await params;
    if (isLocalStore()) {
      const group = await localFind(item => item._id === id);
      if (!group) return fail(404, "GROUP_NOT_FOUND", "Grupo não encontrado.");
      if (group.status !== "open") return fail(409, "GROUP_DRAWN_REORGANIZE_REQUIRED", "Reorganize o sorteio antes de excluir um participante.");
      if (!group.participants.some(item => item.id === participantId)) return fail(404, "PARTICIPANT_NOT_FOUND", "Participante não encontrado.");
      await localUpdate(id, item => { item.participants = item.participants.filter(person => person.id !== participantId); });
      return NextResponse.json({ ok: true });
    }
    const groups = await collection();
    const result = await groups.updateOne({ _id: id, status: "open", "participants.id": participantId }, { $pull: { participants: { id: participantId } } });
    if (result.modifiedCount) return NextResponse.json({ ok: true });
    const group = await groups.findOne({ _id: id }, { projection: { status: 1, "participants.id": 1 } });
    if (!group) return fail(404, "GROUP_NOT_FOUND", "Grupo não encontrado.");
    if (group.status !== "open") return fail(409, "GROUP_DRAWN_REORGANIZE_REQUIRED", "Reorganize o sorteio antes de excluir um participante.");
    return fail(404, "PARTICIPANT_NOT_FOUND", "Participante não encontrado.");
  } catch (error) { return safeError(error); }
}
