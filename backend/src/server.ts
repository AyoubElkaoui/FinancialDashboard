import Fastify, { type FastifyRequest, type FastifyReply } from "fastify";
import fastifyJwt from "@fastify/jwt";
import fastifyHelmet from "@fastify/helmet";
import fastifyCors from "@fastify/cors";
import fastifyRateLimit from "@fastify/rate-limit";

import { env, corsOrigins } from "./config.js";
import { logger } from "./utils/logger.js";
import { destroyPool } from "./db/pool.js";

import { authRoutes } from "./routes/auth.js";
import { healthRoutes } from "./routes/health.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { projectRoutes } from "./routes/projects.js";
import { invoiceRoutes } from "./routes/invoices.js";
import { werkbonRoutes } from "./routes/werkbonnen.js";
import { customerRoutes } from "./routes/customers.js";
import { purchaseRoutes } from "./routes/purchases.js";
import { ledgerRoutes } from "./routes/ledger.js";
import { reportRoutes } from "./routes/reports.js";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; role: string };
    user: { sub: string; role: string };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  }
}

export async function buildServer() {
  const app = Fastify({
    logger: false, // We use our own pino logger
    trustProxy: true,
    disableRequestLogging: true,
  });

  // ─── Plugins ────────────────────────────────────────────────────────────────
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        scriptSrc: ["'self'"],
      },
    },
  });

  await app.register(fastifyCors, {
    origin: corsOrigins[0] === "*" ? true : corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
  });

  await app.register(fastifyRateLimit, {
    global: true,
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
    errorResponseBuilder: () => ({ error: "Too many requests, slow down." }),
  });

  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
  });

  // Expose authenticate decorator used by routes
  app.decorate("authenticate", async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ error: "Unauthorized" });
    }
  });

  // ─── Request logging ────────────────────────────────────────────────────────
  app.addHook("onResponse", (request, reply, done) => {
    logger.info(
      {
        method: request.method,
        url: request.url,
        status: reply.statusCode,
        ms: Math.round(reply.elapsedTime),
        ip: request.ip,
      },
      "request"
    );
    done();
  });

  // ─── Error handler ──────────────────────────────────────────────────────────
  app.setErrorHandler((error: { statusCode?: number; message: string }, request, reply) => {
    logger.error({ err: error, url: request.url }, "Unhandled error");
    reply.code(error.statusCode ?? 500).send({
      error: env.NODE_ENV === "production" ? "Internal server error" : error.message,
    });
  });

  // ─── Routes ─────────────────────────────────────────────────────────────────
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(dashboardRoutes);
  await app.register(projectRoutes);
  await app.register(invoiceRoutes);
  await app.register(werkbonRoutes);
  await app.register(customerRoutes);
  await app.register(purchaseRoutes);
  await app.register(ledgerRoutes);
  await app.register(reportRoutes);

  return app;
}

export async function startServer() {
  const app = await buildServer();

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down...");
    await app.close();
    await destroyPool();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    logger.info({ port: env.PORT, host: env.HOST, env: env.NODE_ENV }, "Server started");
  } catch (err) {
    logger.fatal({ err }, "Failed to start server");
    process.exit(1);
  }
}
