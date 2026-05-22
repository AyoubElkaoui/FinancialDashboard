import type { FastifyInstance } from "fastify";
import { testConnection } from "../db/pool.js";
import { env } from "../config.js";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/api/v1/health", async (_request, reply) => {
    if (env.MOCK_MODE) {
      return reply.send({
        status: "ok",
        mode: "mock",
        db: { connected: false, latencyMs: 0, note: "mock mode — no real DB" },
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
      });
    }

    const db = await testConnection();
    return reply.code(db.ok ? 200 : 503).send({
      status: db.ok ? "ok" : "degraded",
      mode: "live",
      db: { connected: db.ok, latencyMs: db.latencyMs },
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });
}
