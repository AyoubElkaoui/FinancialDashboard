import type { FastifyRequest, FastifyReply } from "fastify";
import { logger } from "../utils/logger.js";

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    logger.warn({ path: request.url, ip: request.ip }, "Unauthorized request");
    reply.code(401).send({ error: "Unauthorized" });
  }
}
