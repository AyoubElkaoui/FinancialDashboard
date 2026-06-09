import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as argon2 from "argon2";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { audit } from "@/lib/audit";
import type { Database } from "@prisma/client";

const patchSchema = z.object({
  role:        z.enum(["ADMIN", "MGM", "VIEWER"]).optional(),
  databases:   z.array(z.enum(["SERVICES", "MAINTENANCE", "INTERNATIONAL", "KEYSER"])).optional(),
  newPassword: z.string().min(8).max(128).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession().catch(() => null);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parse = patchSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
  }

  const { role, databases, newPassword } = parse.data;
  const updateData: Record<string, unknown> = {};
  if (role) updateData.role = role;
  if (newPassword) {
    updateData.passwordHash = await argon2.hash(newPassword);
  }

  if (databases !== undefined) {
    await db.userDatabase.deleteMany({ where: { userId: id } });
    await db.userDatabase.createMany({
      data: databases.map((db) => ({ userId: id, database: db as Database })),
    });
  }

  const user = await db.user.update({
    where: { id },
    data: updateData,
    include: { databases: true },
  });

  await audit(session.id, "USER_UPDATED", { detail: user.email });

  return NextResponse.json({
    id: user.id,
    email: user.email,
    role: user.role,
    databases: user.databases.map((d: { database: Database }) => d.database),
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession().catch(() => null);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  const { id } = await params;
  if (id === session.id) {
    return NextResponse.json({ error: "Kan eigen account niet verwijderen" }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  await db.user.delete({ where: { id } });
  await audit(session.id, "USER_DELETED", { detail: user.email });

  return NextResponse.json({ ok: true });
}
