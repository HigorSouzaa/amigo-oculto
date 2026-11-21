import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { body, fail, safeError } from "@/lib/api";
import { collection, isLocalStore, localGroups, localInsert, type Group } from "@/lib/db";
import { currentSession, originAllowed } from "@/lib/security";
export async function GET() {
  if (!(await currentSession("admin"))) return fail(401, "UNAUTHORIZED", "Entre como organizador.");
  try { const groups = isLocalStore() ? (await localGroups()).sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()) : await (await collection()).find({}, { projection: { name: 1, token: 1, status: 1, createdAt: 1, "participants.name": 1 } }).sort({ createdAt: -1 }).toArray();
    return NextResponse.json({ groups: groups.map(g => ({ id: g._id, name: g.name, status: g.status, participantCount: g.participants.length, createdAt: g.createdAt })) });
  } catch (e) { return safeError(e); }
}
export async function POST(request: Request) {
  if (!(await originAllowed())) return fail(403, "ORIGIN_FORBIDDEN", "Origem não permitida.");
  if (!(await currentSession("admin"))) return fail(401, "UNAUTHORIZED", "Entre como organizador.");
  try { const data = await body(request); const name = typeof data?.name === "string" ? data.name.trim() : "";
    if (name.length < 2 || name.length > 80) return fail(400, "INVALID_INPUT", "O nome do grupo deve ter de 2 a 80 caracteres.");
    const group: Group = { _id: randomBytes(12).toString("hex"), token: randomBytes(24).toString("base64url"), name, status: "open", participants: [], createdAt: new Date() };
    if (isLocalStore()) await localInsert(group); else await (await collection()).insertOne(group);
    const base = process.env.APP_URL || new URL(request.url).origin;
    return NextResponse.json({ group: { id: group._id, name: group.name, token: group.token, status: group.status, participantCount: 0, joinUrl: `${base}/g/${group.token}` } }, { status: 201 });
  } catch (e) { return safeError(e); }
}
