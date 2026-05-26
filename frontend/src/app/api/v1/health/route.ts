export async function GET() {
  return Response.json({ status: "ok", mode: "mock", db: { connected: false, latencyMs: 0 } });
}
