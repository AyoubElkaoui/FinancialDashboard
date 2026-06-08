import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as argon2 from "argon2";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { audit } from "@/lib/audit";
import type { Database } from "@prisma/client";

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
  role: z.enum(["ADMIN", "MGM", "VIEWER"]).default("VIEWER"),
  databases: z.array(z.enum(["SERVICES", "MAINTENANCE", "INTERNATIONAL", "KEYSER"])),
});

export async function GET() {
  const session = await requireSession().catch(() => null);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  const users = await db.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      totpEnabled: true,
      createdAt: true,
      databases: { select: { database: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parse = createSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: "Ongeldige invoer", details: parse.error.flatten() }, { status: 400 });
  }

  const { email, password, role, databases } = parse.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "E-mailadres al in gebruik" }, { status: 409 });
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  const user = await db.user.create({
    data: {
      email,
      passwordHash,
      role: role as "ADMIN" | "MGM" | "VIEWER",
      databases: {
        create: databases.map((db) => ({ database: db as Database })),
      },
    },
    include: { databases: true },
  });

  await db.allowedEmail.upsert({
    where: { email },
    update: {},
    create: { email },
  });

  await audit(session.id, "USER_CREATED", { detail: email });

  return NextResponse.json({
    id: user.id,
    email: user.email,
    role: user.role,
    databases: user.databases.map((d: { database: Database }) => d.database),
  });
}
