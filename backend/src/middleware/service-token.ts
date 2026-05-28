import type { FastifyRequest, FastifyReply } from "fastify";
import { env } from "../config.js";
import { logger } from "../utils/logger.js";

export async function serviceTokenMiddleware(request: FastifyRequest, reply: FastifyReply) {
  if (env.MOCK_MODE) return; // Skip in mock/dev mode

  const token = request.headers["x-service-token"];
  if (!token || token !== env.SERVICE_TOKEN) {
    logger.warn({ path: request.url, ip: request.ip }, "Invalid service token");
    reply.code(401).send({ error: "Unauthorized" });
  }
}
