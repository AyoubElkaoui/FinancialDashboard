import { db } from "./db";
import type { Database } from "@prisma/client";

export async function audit(
  userId: string,
  action: string,
  opts?: { database?: Database; detail?: string; ip?: string }
) {
  await db.auditLog.create({
    data: {
      userId,
      action,
      database: opts?.database,
      detail: opts?.detail,
      ip: opts?.ip,
    },
  });
}
