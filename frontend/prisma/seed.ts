import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as argon2 from "argon2";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL env var is required");
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

type DB = "SERVICES" | "MAINTENANCE" | "INTERNATIONAL" | "KEYSER";

const USERS: {
  email: string;
  role: "ADMIN" | "VIEWER";
  databases: DB[];
}[] = [
  {
    email: "admin@elmar.nl",
    role: "ADMIN",
    databases: ["SERVICES", "MAINTENANCE", "INTERNATIONAL", "KEYSER"],
  },
  {
    email: "lilly@elmarmaintenance.com",
    role: "VIEWER",
    databases: ["MAINTENANCE"],
  },
  {
    email: "pamela@elmarmaintenance.com",
    role: "VIEWER",
    databases: ["MAINTENANCE"],
  },
  {
    email: "anissa@elmarservices.com",
    role: "VIEWER",
    databases: ["SERVICES", "INTERNATIONAL", "KEYSER"],
  },
  {
    email: "merve@elmarservices.com",
    role: "VIEWER",
    databases: ["SERVICES", "INTERNATIONAL", "KEYSER"],
  },
  {
    email: "brahim@elmarservices.com",
    role: "VIEWER",
    databases: ["SERVICES", "INTERNATIONAL", "KEYSER"],
  },
  {
    email: "yassin@elmarservices.com",
    role: "VIEWER",
    databases: ["SERVICES", "MAINTENANCE", "INTERNATIONAL", "KEYSER"],
  },
];

const PASSWORD = process.env.SEED_PASSWORD ?? "Elmar2026!";

async function main() {
  const hash = await argon2.hash(PASSWORD, { type: argon2.argon2id });

  for (const u of USERS) {
    // Upsert user
    const user = await db.user.upsert({
      where: { email: u.email },
      update: { passwordHash: hash, role: u.role },
      create: {
        email: u.email,
        passwordHash: hash,
        role: u.role,
      },
    });

    // Sync database access
    await db.userDatabase.deleteMany({ where: { userId: user.id } });
    await db.userDatabase.createMany({
      data: u.databases.map((database) => ({ userId: user.id, database })),
    });

    // Ensure allowlist
    await db.allowedEmail.upsert({
      where: { email: u.email },
      update: {},
      create: { email: u.email },
    });

    const dbs = u.databases.join(", ");
    console.log(`✓ ${u.email} (${u.role}) → ${dbs}`);
  }

  console.log(`\n✓ Wachtwoord voor alle accounts: ${PASSWORD}`);
  console.log("✓ 2FA is zichtbaar maar nog niet vereist.");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
