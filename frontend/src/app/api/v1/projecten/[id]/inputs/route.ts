import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getProjectInput, setProjectInput, deleteProjectInput } from "@/lib/mock/project-inputs-store";
import { z } from "zod";

const schema = z.object({
  urenAantal:   z.number().min(0).max(100_000).optional(),
  urenTarief:   z.number().min(0).max(1_000).optional(),
  algKostenPct: z.number().min(0).max(100).optional(),
  opmerkingen:  z.string().max(2000).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const database    = req.nextUrl.searchParams.get("database") ?? "SERVICES";
  const projectCode = req.nextUrl.searchParams.get("projectCode") ?? id;
  return NextResponse.json(getProjectInput(database, projectCode));
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { id } = await params;
  const database    = req.nextUrl.searchParams.get("database") ?? "SERVICES";
  const projectCode = req.nextUrl.searchParams.get("projectCode") ?? id;

  const body = await req.json().catch(() => null);
  const parse = schema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
  }

  const existing = getProjectInput(database, projectCode);
  const record = setProjectInput({
    ...(existing ?? {}),
    ...parse.data,
    database,
    projectCode,
    updatedBy: session.email,
    updatedAt: new Date().toISOString(),
  });
  return NextResponse.json(record);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { id } = await params;
  const database    = req.nextUrl.searchParams.get("database") ?? "SERVICES";
  const projectCode = req.nextUrl.searchParams.get("projectCode") ?? id;
  deleteProjectInput(database, projectCode);
  return NextResponse.json({ ok: true });
}
