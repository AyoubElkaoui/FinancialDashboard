import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { Database } from "@prisma/client";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const database = request.nextUrl.searchParams.get("database") ?? "SERVICES";

  const meta = await db.rmSyncMeta.findUnique({
    where: { database: database as Database },
  }).catch(() => null);

  if (!meta) {
    return Response.json({ status: "pending", gesynctOp: null, projectenCount: null });
  }

  return Response.json({
    status:         meta.status,
    gesynctOp:      meta.gesynctOp,
    duurMs:         meta.duurMs,
    projectenCount: meta.projectenCount,
    fout:           meta.fout,
  });
}
