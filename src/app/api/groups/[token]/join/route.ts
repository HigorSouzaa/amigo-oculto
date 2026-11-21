import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { body, fail, safeError } from "@/lib/api";
import { collection, isLocalStore, localFind, localUpdate } from "@/lib/db";
import { fingerprint, hashSecret, makeToken, originAllowed, rateLimited, verifySecret } from "@/lib/security";
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!(await originAllowed())) return fail(403, "ORIGIN_FORBIDDEN", "Origem não permitida.");
  if (await rateLimited("participant-join")) return fail(429, "RATE_LIMITED", "Muitas tentativas. Aguarde 15 minutos.");
  try { const { token } = await params; const data = await body(request); const name = typeof data?.name === "string" ? data.name.trim().normalize("NFC") : ""; const pin = data?.pin;
    if (name.length < 2 || name.length > 60 || typeof pin !== "string" || !/^\d{4}$/.test(pin)) return fail(400, "INVALID_INPUT", "Informe seu nome (2 a 60 caracteres) e um PIN de 4 dígitos.");
    const groups = isLocalStore() ? null : await collection(); const group = isLocalStore() ? await localFind(g=>g.token===token) : await groups!.findOne({ token }); if (!group) return fail(401, "INVALID_CREDENTIALS", "Nome, PIN ou grupo inválidos.");
    const nameKey = fingerprint(name); const existing = group.participants.find(p => p.nameKey === nameKey);
    if (existing) { if (!(await verifySecret(pin, existing.pinHash))) return fail(401, "INVALID_CREDENTIALS", "Nome, PIN ou grupo inválidos.");
      const cookie = await makeToken(existing.id, "participant", group._id); (await cookies()).set("participant_session", cookie, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 30 * 60 });
      return NextResponse.json({ status: group.status });
    }
    if (group.status !== "open") return fail(409, "GROUP_CLOSED", "As inscrições foram encerradas porque o sorteio já aconteceu.");
    const participant = { id: randomUUID(), name, nameKey, pinHash: await hashSecret(pin), joinedAt: new Date() };
    let inserted = false;
    if (isLocalStore()) inserted = await localUpdate(group._id, g=>{ if(g.status==="open"&&!g.participants.some(p=>p.nameKey===nameKey))g.participants.push(participant); });
    else { const result = await groups!.updateOne({ _id: group._id, status: "open", "participants.nameKey": { $ne: nameKey } }, { $push: { participants: participant } }); inserted = !!result.modifiedCount; }
    if (!inserted) return fail(409, "DUPLICATE_NAME", "Este nome já está no grupo. Use o mesmo nome e PIN para entrar.");
    const cookie = await makeToken(participant.id, "participant", group._id); (await cookies()).set("participant_session", cookie, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 30 * 60 });
    return NextResponse.json({ status: "open" }, { status: 201 });
  } catch (e) { return safeError(e); }
}
