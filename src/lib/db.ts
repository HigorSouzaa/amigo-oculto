import { MongoClient, type Collection, type Db } from "mongodb";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type Participant = { id: string; name: string; nameKey: string; pinHash: string; joinedAt: Date; recipientId?: string; redrawNotice?: boolean };
export type Group = { _id: string; token: string; name: string; status: "open" | "drawn"; participants: Participant[]; createdAt: Date; drawnAt?: Date };
let clientPromise: Promise<MongoClient> | undefined;
const localPath = path.join(process.cwd(), ".local-data", "groups.json");
type LocalStore = { groups: Group[] };
async function readLocal(): Promise<LocalStore> {
  try { return JSON.parse(await readFile(localPath, "utf8")) as LocalStore; }
  catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; return { groups: [] }; }
}
async function writeLocal(data: LocalStore) { await mkdir(path.dirname(localPath), { recursive: true }); await writeFile(localPath, JSON.stringify(data), "utf8"); }
export const isLocalStore = () => process.env.STORAGE_DRIVER === "local" && process.env.NODE_ENV !== "production";
export async function localGroups() { if (!isLocalStore()) throw new Error("Local storage is available only in non-production environments"); return (await readLocal()).groups; }
export async function localInsert(group: Group) { const data = await readLocal(); data.groups.push(group); await writeLocal(data); }
export async function localFind(query: (group: Group) => boolean) { return (await localGroups()).find(query) ?? null; }
export async function localUpdate(id: string, update: (group: Group) => void) { const data = await readLocal(); const group = data.groups.find(g => g._id === id); if (!group) return false; update(group); await writeLocal(data); return true; }
export async function localDelete(id: string) { const data = await readLocal(); const remaining = data.groups.filter(group => group._id !== id); if (remaining.length === data.groups.length) return false; data.groups = remaining; await writeLocal(data); return true; }
export async function collection(): Promise<Collection<Group>> {
  if (isLocalStore()) throw new Error("Use local store functions when STORAGE_DRIVER=local");
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not configured");
  clientPromise ??= new MongoClient(uri, { serverSelectionTimeoutMS: 8000 }).connect();
  const client = await clientPromise;
  const db: Db = client.db(process.env.MONGODB_DB || "amigo_oculto");
  return db.collection<Group>("groups");
}
