import { NextResponse } from "next/server";
export function fail(status: number, code: string, message: string) { return NextResponse.json({ error: { code, message } }, { status }); }
export async function body(request: Request): Promise<Record<string, unknown> | null> { try { const v = await request.json(); return v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : null; } catch { return null; } }
export function safeError(error: unknown) { console.error("API error:", error instanceof Error ? error.name : "unknown"); return fail(500, "INTERNAL_ERROR", "Não foi possível concluir agora. Tente novamente."); }
