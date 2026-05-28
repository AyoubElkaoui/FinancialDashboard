import type { Database } from "@/lib/prisma-types";

export async function audit(
  _userId: string,
  _action: string,
  _opts?: { database?: Database; detail?: string; ip?: string }
) {
  // No-op in demo deployment — no database to write to.
}
