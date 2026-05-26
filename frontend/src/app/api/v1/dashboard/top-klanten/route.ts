import { mockTopKlanten } from "@/lib/mock/handlers";
export async function GET() { return Response.json(mockTopKlanten()); }
