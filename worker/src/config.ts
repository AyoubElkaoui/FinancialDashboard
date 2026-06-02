import dotenv from "dotenv";
dotenv.config();

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
}

export const FB_CONFIG = {
  host:     process.env.FB_HOST ?? "localhost",
  port:     Number(process.env.FB_PORT ?? 3050),
  database: requireEnv("FB_DATABASE"),
  user:     process.env.FB_USER     ?? "SYSDBA",
  password: requireEnv("FB_PASSWORD"),
  charset:  process.env.FB_CHARSET  ?? "WIN1252",
} as const;

// Pad naar de isql binary (native Firebird client — werkt met FB3 wire-encryptie)
export const FB_ISQL_PATH = process.env.FB_ISQL_PATH ?? "/opt/firebird/bin/isql";
// Library-pad voor dynamische linker (libfbclient + libtommath symlink)
export const FB_LD_LIBRARY = process.env.FB_LD_LIBRARY ?? "/opt/firebird/lib:/usr/lib64";

export const DATABASE_URL = requireEnv("DATABASE_URL");

// Mapping: Atrium ADMINIS_GC_ID → Dashboard Database enum
// Pas aan naar de werkelijke waarden in jouw Atrium-installatie
export const ADMIN_CONFIG: Array<{
  adminId: number;
  database: string;       // moet overeenkomen met Prisma Database enum
  omschrijving: string;
}> = [
  { adminId: 1,      database: "SERVICES",      omschrijving: "Elmar Services" },
  { adminId: 100001, database: "INTERNATIONAL",  omschrijving: "Elmar International" },
];

export const DEFAULT_UREN_TARIEF = 7.5;
