import { z } from "zod";

const envSchema = z.object({
  // Mock mode — set to "true" to skip DB and use in-memory data
  MOCK_MODE: z.string().optional().transform(v => v === "true"),

  // Firebird — only required when MOCK_MODE is false
  FB_HOST: z.string().default("localhost"),
  FB_PORT: z.coerce.number().default(3050),
  FB_DATABASE: z.string().default(""),
  FB_USER: z.string().default(""),
  FB_PASSWORD: z.string().default(""),
  FB_CHARSET: z.string().default("WIN1252"),
  FB_POOL_MIN: z.coerce.number().default(2),
  FB_POOL_MAX: z.coerce.number().default(10),
  FB_POOL_IDLE_TIMEOUT: z.coerce.number().default(30000),

  // Server
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error"]).default("info"),

  // Auth
  JWT_SECRET: z.string().min(32).default("mock_dev_secret_at_least_32_characters_long"),
  JWT_EXPIRES_IN: z.string().default("8h"),
  ADMIN_USERNAME: z.string().default("admin"),
  ADMIN_PASSWORD: z.string().default("admin"),

  // CORS
  CORS_ORIGINS: z.string().default("http://localhost:3000"),

  // Rate limiting
  RATE_LIMIT_MAX: z.coerce.number().default(200),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(5),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
});

// .env is loaded via "import dotenv/config" in src/index.ts before this module runs

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌  Invalid environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const firebirdConfig = {
  host: env.FB_HOST,
  port: env.FB_PORT,
  database: env.FB_DATABASE,
  user: env.FB_USER,
  password: env.FB_PASSWORD,
  lowercase_keys: false,
  role: undefined as string | undefined,
  pageSize: 4096,
  charset: env.FB_CHARSET,
  retryConnectionInterval: 1000,
  watchDogInterval: 60000,
};

export const corsOrigins = env.CORS_ORIGINS.split(",").map((s) => s.trim());
