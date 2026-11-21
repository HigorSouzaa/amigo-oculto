import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { originAllowed } from "@/lib/security";
export async function POST(){if(!(await originAllowed()))return NextResponse.json({error:{code:"ORIGIN_FORBIDDEN",message:"Origem não permitida."}},{status:403});(await cookies()).delete("participant_session");return NextResponse.json({ok:true})}
