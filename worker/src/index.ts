import { ADMIN_CONFIG } from "./config";
import { syncAdmin } from "./sync";
import { endPool } from "./postgres";
import { testFirebird } from "./firebird";

const targetDb = process.argv[2]?.toUpperCase(); // bijv. "SERVICES"

async function main() {
  console.log(`[${new Date().toISOString()}] Syntess sync-worker gestart`);

  // Verbinding testen (synchroon)
  testFirebird();
  console.log(`[${new Date().toISOString()}] Firebird verbinding OK`);

  const admins = targetDb
    ? ADMIN_CONFIG.filter(a => a.database === targetDb)
    : ADMIN_CONFIG;

  if (admins.length === 0) {
    console.error(`Geen admin-configuratie gevonden voor database "${targetDb}"`);
    process.exit(1);
  }

  let fouten = 0;
  for (const admin of admins) {
    try {
      await syncAdmin(admin);
    } catch {
      fouten++;
    }
  }

  await endPool();
  console.log(`[${new Date().toISOString()}] Sync klaar — ${fouten} fout(en)`);
  process.exit(fouten > 0 ? 1 : 0);
}

main().catch(err => {
  console.error("Fatale fout:", err);
  process.exit(1);
});
