import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";

const MOCK_USERS = [
  { id: "1", email: "admin@elmar.nl",   role: "ADMIN",  totpEnabled: false, createdAt: "2025-01-01T00:00:00Z", databases: [{ database: "SERVICES" }, { database: "MAINTENANCE" }, { database: "INTERNATIONAL" }, { database: "KEYSER" }] },
  { id: "2", email: "viewer@elmar.nl",  role: "VIEWER", totpEnabled: false, createdAt: "2025-03-15T00:00:00Z", databases: [{ database: "SERVICES" }] },
  { id: "3", email: "elkaoui.a@gmail.com", role: "ADMIN", totpEnabled: false, createdAt: "2026-01-01T00:00:00Z", databases: [{ database: "SERVICES" }, { database: "MAINTENANCE" }, { database: "INTERNATIONAL" }, { database: "KEYSER" }] },
];

export async function GET() {
  const session = await requireSession().catch(() => null);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }
  return NextResponse.json(MOCK_USERS);
}

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({})) as { email?: string; role?: string };
  return NextResponse.json({ id: String(Date.now()), email: body.email ?? "", role: body.role ?? "VIEWER", databases: [] });
}
