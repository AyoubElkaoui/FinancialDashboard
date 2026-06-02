/**
 * PATCH /api/v1/maintenance/werkbonnen/[bonnummer]
 * Update handmatige marge-velden op een werkbon.
 * Sync overschrijft deze velden NOOIT — dit is het enige schrijfpad.
 */
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { Database } from "@prisma/client";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ bonnummer: string }> }
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const { bonnummer } = await params;
  const database = (req.nextUrl.searchParams.get("database") ?? "MAINTENANCE") as Database;

  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Ongeldig verzoek" }, { status: 400 });

  const update: Record<string, unknown> = {};
  // Enige handmatige velden — sync raakt deze NOOIT aan
  if ("streefmargePct"  in body) update.streefmargePct  = body.streefmargePct ?? null;
  if ("volledigBetaald" in body) update.volledigBetaald = body.volledigBetaald ?? null;
  if ("notities"        in body) update.notities        = body.notities ?? null;

  if (Object.keys(update).length === 0) {
    return Response.json({ error: "Geen velden om bij te werken" }, { status: 400 });
  }

  const wb = await db.rmWerkbon.updateMany({
    where:  { database, bonnummer },
    data:   update,
  }).catch(() => null);

  if (!wb || wb.count === 0) {
    return Response.json({ error: "Werkbon niet gevonden" }, { status: 404 });
  }

  return Response.json({ ok: true });
}
