import { NextResponse } from "next/server";

// TOTP is not available in the demo deployment.
export async function POST() {
  return NextResponse.json({ error: "2FA niet beschikbaar in demo" }, { status: 501 });
}
