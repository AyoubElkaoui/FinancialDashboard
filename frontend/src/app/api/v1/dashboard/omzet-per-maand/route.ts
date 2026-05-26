import { mockOmzetPerMaand } from "@/lib/mock/handlers";
export async function GET() { return Response.json(mockOmzetPerMaand()); }
