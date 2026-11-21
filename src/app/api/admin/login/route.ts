import { cookies } from "next/headers";
import { body, fail, safeError } from "@/lib/api";
import { hashSecret, makeToken, originAllowed, rateLimited, verifySecret } from "@/lib/security";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!(await originAllowed())) return fail(403, "ORIGIN_FORBIDDEN", "Origem não permitida.");
  if (await rateLimited("admin-login")) return fail(429, "RATE_LIMITED", "Muitas tentativas. Aguarde 15 minutos.");
  try {
    const data = await body(request); const username = data?.username; const password = data?.password;
    if (typeof username !== "string" || typeof password !== "string" || username.length > 120 || password.length > 256) return fail(400, "INVALID_INPUT", "Informe usuário e senha.");
    const localDemo = process.env.STORAGE_DRIVER === "local" && process.env.NODE_ENV !== "production";
    const expectedUser = process.env.ADMIN_USERNAME || (localDemo ? "admin" : "");
    let stored = process.env.ADMIN_PASSWORD_HASH;
    if (!stored && localDemo) { stored = await hashSecret("AmigoOculto2026!"); process.env.ADMIN_PASSWORD_HASH = stored; }
    const valid = !!stored && username.trim().toLocaleLowerCase("pt-BR") === expectedUser.trim().toLocaleLowerCase("pt-BR") && await verifySecret(password, stored);
    if (!valid) return fail(401, "INVALID_CREDENTIALS", "Usuário ou senha inválidos.");
    const token = await makeToken("admin", "admin"); const jar = await cookies();
    jar.set("admin_session", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 8 * 60 * 60 });
    return NextResponse.json({ ok: true });
  } catch (error) { return safeError(error); }
}
