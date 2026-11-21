import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
const scrypt = promisify(scryptCallback);
const secret = () => { const value = process.env.SESSION_SECRET; if (!value || value.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters"); return new TextEncoder().encode(value); };
export async function hashSecret(value: string) { const salt = randomBytes(16).toString("hex"); const derived = await scrypt(value, salt, 64) as Buffer; return `${salt}:${derived.toString("hex")}`; }
export async function verifySecret(value: string, stored: string) {
  const [salt, hex] = stored.split(":"); if (!salt || !hex) return false;
  const derived = await scrypt(value, salt, 64) as Buffer; const expected = Buffer.from(hex, "hex");
  return expected.length === derived.length && timingSafeEqual(derived, expected);
}
export function fingerprint(value: string) { return createHash("sha256").update(value.trim().normalize("NFKC").toLocaleLowerCase("pt-BR")).digest("hex"); }
export async function makeToken(sub: string, role: "admin" | "participant", groupId?: string) {
  const jwt = new SignJWT({ role, ...(groupId ? { groupId } : {}) }).setProtectedHeader({ alg: "HS256" }).setSubject(sub).setIssuedAt().setExpirationTime(role === "admin" ? "8h" : "30m");
  return jwt.sign(secret());
}
export async function readToken(cookie: string | undefined) {
  if (!cookie) return null;
  try { const { payload } = await jwtVerify(cookie, secret()); return payload; } catch { return null; }
}
export async function currentSession(role: "admin" | "participant") {
  const jar = await cookies(); const payload = await readToken(jar.get(role === "admin" ? "admin_session" : "participant_session")?.value);
  return payload?.role === role ? payload : null;
}
export async function originAllowed() {
  const h = await headers(); const origin = h.get("origin");
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(process.env.APP_URL || "http://localhost:3000").origin; } catch { return false; }
}
type Attempt = { count: number; reset: number };
const attempts = new Map<string, Attempt>();
export async function rateLimited(scope: string) {
  const h = await headers(); const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const key = `${scope}:${forwarded}`; const now = Date.now(); const item = attempts.get(key);
  if (!item || item.reset <= now) { attempts.set(key, { count: 1, reset: now + 15 * 60_000 }); return false; }
  item.count += 1; return item.count > 8;
}
