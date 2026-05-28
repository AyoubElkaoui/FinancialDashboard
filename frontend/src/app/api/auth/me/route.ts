import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }
  return NextResponse.json({
    id: session.id,
    email: session.email,
    role: session.role,
    databases: session.databases,
    activeDatabase: session.activeDatabase,
  });
}
