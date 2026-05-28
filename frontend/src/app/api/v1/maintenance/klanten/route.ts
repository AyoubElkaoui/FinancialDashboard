import { NextResponse } from "next/server";
import { MAINTENANCE_KLANTEN, getKlantSummary } from "@/lib/mock/maintenance-data";

export async function GET() {
  const data = MAINTENANCE_KLANTEN.map(k => ({
    ...k,
    summary: getKlantSummary(k.id),
  }));
  return NextResponse.json(data);
}
