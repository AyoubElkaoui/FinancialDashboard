import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { audit } from "@/lib/audit";
import { z } from "zod";
import type { Database } from "@prisma/client";

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
  const database = req.nextUrl.searchParams.get("database") ?? "SERVICES";
  const projectCode = req.nextUrl.searchParams.get("projectCode") ?? id;

  try {
    const record = await db.projectInput.findUnique({
      where: { database_projectCode: { database: database as "SERVICES" | "MAINTENANCE" | "INTERNATIONAL" | "KEYSER", projectCode } },
    });
    return NextResponse.json(record ?? null);
  } catch {
    return NextResponse.json(null);
  }
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

  try {
    const record = await db.projectInput.upsert({
      where: { database_projectCode: { database: database as "SERVICES" | "MAINTENANCE" | "INTERNATIONAL" | "KEYSER", projectCode } },
      update: { ...parse.data, updatedBy: session.email },
      create: { database: database as "SERVICES" | "MAINTENANCE" | "INTERNATIONAL" | "KEYSER", projectCode, ...parse.data, updatedBy: session.email },
    });

    await audit(session.id, "PROJECT_INPUT_UPDATE", {
      database: database as Database,
      detail: JSON.stringify({ projectCode, ...parse.data }),
    });

    return NextResponse.json(record);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Opslaan mislukt" }, { status: 500 });
  }
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

  try {
    await db.projectInput.delete({
      where: { database_projectCode: { database: database as "SERVICES" | "MAINTENANCE" | "INTERNATIONAL" | "KEYSER", projectCode } },
    });
    await audit(session.id, "PROJECT_INPUT_RESET", { database: database as Database, detail: projectCode });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // already deleted
  }
}
