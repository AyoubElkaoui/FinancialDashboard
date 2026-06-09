import dotenv from "dotenv";
dotenv.config();

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
}

// Gedeelde Firebird-verbindingsparameters (host, port, user, password)
export const FB_BASE = {
  host:     process.env.FB_HOST ?? "localhost",
  port:     Number(process.env.FB_PORT ?? 3050),
  user:     process.env.FB_USER     ?? "SYSDBA",
  password: requireEnv("FB_PASSWORD"),
  charset:  process.env.FB_CHARSET  ?? "WIN1252",
} as const;

// Achterwaarts compatibel: FB_CONFIG.database = Services DB (standaard)
export const FB_CONFIG = {
  ...FB_BASE,
  database: process.env.FB_DATABASE ?? "",
} as const;

// Pad naar de isql binary (native Firebird client)
export const FB_ISQL_PATH = process.env.FB_ISQL_PATH ?? "/opt/firebird/bin/isql";
// Library-pad voor dynamische linker
export const FB_LD_LIBRARY = process.env.FB_LD_LIBRARY ?? "/opt/firebird/lib:/usr/lib64";

export const DATABASE_URL = requireEnv("DATABASE_URL");

// Per-administratie configuratie: adminIds (meerdere voor één database), dashboard-enum, FDB-pad, type
export const ADMIN_CONFIG: Array<{
  adminIds:     number[];     // een of meer ADMINIS_GC_ID's voor dezelfde database
  database:     string;       // Prisma Database enum waarde
  omschrijving: string;
  fbDatabase:   string;       // volledig Windows-pad naar de .FDB op de server
  type:         "project" | "werkbon";
}> = [
  {
    // Services DB bevat TWO administrations: 1 (Elmar Services) + 100001 (Elmar International BV)
    adminIds:     [1, 100001],
    database:     "SERVICES",
    omschrijving: "Elmar Services",
    fbDatabase:   process.env.FB_DATABASE      ?? "",
    type:         "project",
  },
  {
    adminIds:     [1],
    database:     "MAINTENANCE",
    omschrijving: "Elmar Maintenance",
    fbDatabase:   process.env.FB_DATABASE_MAINT ?? "",
    type:         "project",
  },
  {
    // ELMI.FDB is een aparte Firebird database; adminId is de ADMINIS_GC_ID daarin (standaard 1)
    adminIds:     [Number(process.env.INTERNATIONAL_ADMIN_ID ?? 1)],
    database:     "INTERNATIONAL",
    omschrijving: "Elmar International",
    fbDatabase:   process.env.FB_DATABASE_INT  ?? "",
    type:         "project",
  },
  {
    adminIds:     [Number(process.env.KEYSER_ADMIN_ID ?? 0)],
    database:     "KEYSER",
    omschrijving: "Keyser",
    fbDatabase:   process.env.FB_DATABASE_KEY  ?? "",
    type:         "project",
  },
];

export const DEFAULT_UREN_TARIEF = 7.5;
