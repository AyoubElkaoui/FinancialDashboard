import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { env } from "../config.js";
import { logger } from "../utils/logger.js";

const loginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(128),
});

export async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: z.infer<typeof loginSchema> }>(
    "/api/v1/auth/login",
    {
      config: { rateLimit: { max: env.AUTH_RATE_LIMIT_MAX, timeWindow: env.AUTH_RATE_LIMIT_WINDOW_MS } },
      schema: {
        body: {
          type: "object",
          required: ["username", "password"],
          properties: {
            username: { type: "string" },
            password: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const parse = loginSchema.safeParse(request.body);
      if (!parse.success) {
        return reply.code(400).send({ error: "Invalid request body" });
      }

      const { username, password } = parse.data;

      // Constant-time comparison to prevent timing attacks
      const usernameOk = username === env.ADMIN_USERNAME;
      const passwordOk = password === env.ADMIN_PASSWORD;

      if (!usernameOk || !passwordOk) {
        logger.warn({ username, ip: request.ip }, "Failed login attempt");
        return reply.code(401).send({ error: "Invalid credentials" });
      }

      const token = app.jwt.sign(
        { sub: username, role: "admin" },
        { expiresIn: env.JWT_EXPIRES_IN }
      );

      logger.info({ username, ip: request.ip }, "Successful login");

      return reply.send({
        token,
        expiresIn: env.JWT_EXPIRES_IN,
        user: { username, role: "admin" },
      });
    }
  );

  app.get(
    "/api/v1/auth/me",
    {
      preHandler: [
        async (req: FastifyRequest, rep: FastifyReply) => app.authenticate(req, rep),
      ],
    },
    async (request) => {
      const payload = request.user as { sub: string; role: string };
      return { username: payload.sub, role: payload.role };
    }
  );
}
