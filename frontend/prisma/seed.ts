import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as argon2 from "argon2";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL env var is required");
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@elmar.nl";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error("SEED_ADMIN_PASSWORD env var is required");
    process.exit(1);
  }

  const hash = await argon2.hash(adminPassword, { type: argon2.argon2id });

  const admin = await db.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash: hash },
    create: {
      email: adminEmail,
      passwordHash: hash,
      role: "ADMIN",
      databases: {
        create: [
          { database: "SERVICES" },
          { database: "MAINTENANCE" },
          { database: "INTERNATIONAL" },
          { database: "KEYSER" },
        ],
      },
    },
  });

  await db.allowedEmail.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail },
  });

  console.log(`✓ Admin: ${admin.email}`);
  console.log(`✓ Toegang tot: SERVICES, MAINTENANCE, INTERNATIONAL, KEYSER`);
  console.log(`✓ Ga naar /2fa-setup na de eerste login om 2FA te activeren.`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
