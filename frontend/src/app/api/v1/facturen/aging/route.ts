import { mockFacturenAging } from "@/lib/mock/handlers";
export async function GET() { return Response.json(mockFacturenAging()); }
