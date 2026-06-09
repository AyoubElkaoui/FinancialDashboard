import { pgQuery } from "./postgres";
import {
  fetchProjecten, fetchRelaties, fetchOrderAgg,
  fetchJournaalAgg, fetchJournaalDetail,
  fetchUrenAgg, fetchUrenDetail, fetchRubrieken,
  fetchDebiteuren, fetchWerkbonnen, fetchJournaalMaintenance,
  fetchProjectleiders, fetchPakbonKosten, fetchKostenDetail,
  fetchOmzetAgg,
} from "./queries";
import { buildRubriekMaps, aggregeerJournaal, round2 } from "./transform";
import { ADMIN_CONFIG } from "./config";

const log = (msg: string, ...args: unknown[]) =>
  console.log(`[${new Date().toISOString()}] ${msg}`, ...args);

// ─── Postgres upserts ─────────────────────────────────────────────────────────

async function upsertSyncMeta(database: string, status: string, extra: {
  duurMs?: number; projectenCount?: number; fout?: string | null;
  totaalDebiteuren?: number | null;
}): Promise<void> {
  await pgQuery(`
    INSERT INTO rm_sync_meta
      (id, database, status, gesynct_op, duur_ms, projecten_count, totaal_debiteuren, fout)
    VALUES (gen_random_uuid(), $1, $2, NOW(), $3, $4, $5, $6)
    ON CONFLICT (database)
    DO UPDATE SET
      status             = EXCLUDED.status,
      gesynct_op         = EXCLUDED.gesynct_op,
      duur_ms            = EXCLUDED.duur_ms,
      projecten_count    = EXCLUDED.projecten_count,
      totaal_debiteuren  = EXCLUDED.totaal_debiteuren,
      fout               = EXCLUDED.fout
  `, [database, status, extra.duurMs ?? null, extra.projectenCount ?? null,
      extra.totaalDebiteuren ?? null, extra.fout ?? null]);
}

async function upsertProjectSummary(row: {
  database: string; projectNr: string; naam: string; klant: string;
  status: string;
  projectleider?: string | null;
  aanneemsom: number; gefactureerd: number; nogTeFactureren: number;
  kostenMateriaal: number; kostenArbeid: number; kostenOverig: number;
  kostenPakbon: number;
  urenTotaal: number;
  kostenACateg: number; kostenMCateg: number; kostenOCateg: number;
}): Promise<void> {
  await pgQuery(`
    INSERT INTO rm_project_summary
      (id, database, project_nr, naam, klant, projectleider, status, aanneemsom, gefactureerd,
       onbetaald, kosten_materiaal, kosten_arbeid, kosten_overig, kosten_pakbon, uren_totaal,
       kosten_a_categ, kosten_m_categ, kosten_o_categ, synct_op)
    VALUES
      (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
    ON CONFLICT (database, project_nr)
    DO UPDATE SET
      naam             = EXCLUDED.naam,
      klant            = EXCLUDED.klant,
      projectleider    = EXCLUDED.projectleider,
      status           = EXCLUDED.status,
      aanneemsom       = EXCLUDED.aanneemsom,
      gefactureerd     = EXCLUDED.gefactureerd,
      onbetaald        = EXCLUDED.onbetaald,
      kosten_materiaal = EXCLUDED.kosten_materiaal,
      kosten_arbeid    = EXCLUDED.kosten_arbeid,
      kosten_overig    = EXCLUDED.kosten_overig,
      kosten_pakbon    = EXCLUDED.kosten_pakbon,
      uren_totaal      = EXCLUDED.uren_totaal,
      kosten_a_categ   = EXCLUDED.kosten_a_categ,
      kosten_m_categ   = EXCLUDED.kosten_m_categ,
      kosten_o_categ   = EXCLUDED.kosten_o_categ,
      synct_op         = NOW()
  `, [
    row.database, row.projectNr, row.naam, row.klant,
    row.projectleider ?? null,
    row.status,
    row.aanneemsom, row.gefactureerd, row.nogTeFactureren,
    row.kostenMateriaal, row.kostenArbeid, row.kostenOverig,
    row.kostenPakbon,
    row.urenTotaal,
    row.kostenACateg, row.kostenMCateg, row.kostenOCateg,
  ]);
}


async function replaceJournaalDetail(
  database: string,
  projectNrs: string[],
  rows: {
    projectNr: string; datum: string; rubriekCode: string; rubriekOmschr: string;
    typeRubriek: string; debetCredit: string; bedrag: number; omschrijving: string | null;
  }[]
): Promise<void> {
  if (projectNrs.length === 0) return;
  const ph = projectNrs.map((_, i) => `$${i + 2}`).join(",");
  await pgQuery(
    `DELETE FROM rm_journaal WHERE database = $1 AND project_nr IN (${ph})`,
    [database, ...projectNrs]
  );
  const BATCH = 200;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const allParams: unknown[] = [];
    const valueClauses = batch.map(r => {
      const o = allParams.length + 1;
      allParams.push(
        database, r.projectNr, r.datum,
        r.rubriekCode, r.rubriekOmschr, r.typeRubriek,
        r.debetCredit, r.bedrag, r.omschrijving,
      );
      return `(gen_random_uuid(),$${o},$${o+1},$${o+2}::date,$${o+3},$${o+4},$${o+5},$${o+6},$${o+7},$${o+8})`;
    });
    await pgQuery(
      `INSERT INTO rm_journaal(id,database,project_nr,datum,rubriek_code,rubriek_omschr,type_rubriek,debet_credit,bedrag,omschrijving) VALUES ${valueClauses.join(",")}`,
      allParams
    );
  }
}

async function replaceUrenDetail(
  database: string,
  projectNrs: string[],
  rows: {
    projectNr: string; medewerker: string; datum: string;
    aantal: number; omschrijving: string | null;
  }[]
): Promise<void> {
  if (projectNrs.length === 0) return;
  const ph = projectNrs.map((_, i) => `$${i + 2}`).join(",");
  await pgQuery(
    `DELETE FROM rm_uren WHERE database = $1 AND project_nr IN (${ph})`,
    [database, ...projectNrs]
  );
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const allParams: unknown[] = [];
    const valueClauses = batch.map(r => {
      const o = allParams.length + 1;
      allParams.push(database, r.projectNr, r.medewerker, r.datum, r.aantal, r.omschrijving);
      return `(gen_random_uuid(),$${o},$${o+1},$${o+2},$${o+3}::date,$${o+4},$${o+5})`;
    });
    await pgQuery(
      `INSERT INTO rm_uren(id,database,project_nr,medewerker,datum,aantal,omschrijving) VALUES ${valueClauses.join(",")}`,
      allParams
    );
  }
}

// ─── Kosten-regels (AV_KOSTREG_2) ────────────────────────────────────────────

async function replaceKostenDetail(
  database: string,
  projectNrs: string[],
  rows: {
    projectNr: string; typeBreg: string; categorie: string;
    datum: string | null; omschrijving: string | null;
    bedrag: number | null; dekkingen: number | null;
    factuurStatus: string | null; docCode: string | null; creNaam: string | null;
  }[]
): Promise<void> {
  if (projectNrs.length === 0) return;
  const ph = projectNrs.map((_, i) => `$${i + 2}`).join(",");
  await pgQuery(
    `DELETE FROM rm_kosten_regel WHERE database = $1 AND project_nr IN (${ph})`,
    [database, ...projectNrs]
  );
  const BATCH = 300;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const allParams: unknown[] = [];
    const valueClauses = batch.map(r => {
      const o = allParams.length + 1;
      allParams.push(
        database, r.projectNr, r.typeBreg, r.categorie,
        r.datum ?? null, r.omschrijving ?? null,
        r.bedrag ?? null, r.dekkingen ?? null,
        r.factuurStatus ?? null, r.docCode ?? null, r.creNaam ?? null,
      );
      return `(gen_random_uuid(),$${o},$${o+1},$${o+2},$${o+3},$${o+4}::date,$${o+5},$${o+6},$${o+7},$${o+8},$${o+9},$${o+10})`;
    });
    await pgQuery(
      `INSERT INTO rm_kosten_regel(id,database,project_nr,type_breg,categorie,datum,omschrijving,bedrag,dekkingen,factuur_status,doc_code,cre_naam) VALUES ${valueClauses.join(",")}`,
      allParams
    );
  }
}

// ─── Werkbon upsert (Maintenance) ─────────────────────────────────────────────

async function upsertWerkbon(database: string, wb: {
  bonnummer: string; datum: string; omschrijving: string | null;
  status: string; methInUitvoering: string | null; fase: string | null;
  klant: string | null; eigenaar: string | null; werkCode: string | null;
  isGefactureerd: boolean; opbrengsten: number;
  taakCode: string | null; urenWerkbon: number | null; urenContract: number | null;
}): Promise<void> {
  await pgQuery(`
    INSERT INTO rm_werkbon
      (id, database, bonnummer, datum, omschrijving, status,
       meth_in_uitvoering, fase, klant, eigenaar, werk_code,
       is_gefactureerd, taak_code, opbrengsten, uren_werkbon, uren_contract, synct_op)
    VALUES
      (gen_random_uuid(), $1, $2, $3::date, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
    ON CONFLICT (database, bonnummer)
    DO UPDATE SET
      datum              = EXCLUDED.datum,
      omschrijving       = EXCLUDED.omschrijving,
      status             = EXCLUDED.status,
      meth_in_uitvoering = EXCLUDED.meth_in_uitvoering,
      fase               = EXCLUDED.fase,
      klant              = EXCLUDED.klant,
      eigenaar           = EXCLUDED.eigenaar,
      werk_code          = EXCLUDED.werk_code,
      is_gefactureerd    = EXCLUDED.is_gefactureerd,
      taak_code          = EXCLUDED.taak_code,
      opbrengsten        = EXCLUDED.opbrengsten,
      uren_werkbon       = EXCLUDED.uren_werkbon,
      uren_contract      = EXCLUDED.uren_contract,
      synct_op           = NOW()
  `, [
    database, wb.bonnummer, wb.datum, wb.omschrijving ?? null,
    wb.status, wb.methInUitvoering, wb.fase, wb.klant,
    wb.eigenaar, wb.werkCode, wb.isGefactureerd,
    wb.taakCode, wb.opbrengsten, wb.urenWerkbon, wb.urenContract,
  ]);
}

// ─── Sync werkbonnen (Maintenance-type) ────────────────────────────────────────

async function syncWerkbonnen(config: typeof ADMIN_CONFIG[0]): Promise<void> {
  const { database, omschrijving, fbDatabase } = config;
  if (!fbDatabase) {
    log(`⊘ Overgeslagen: ${omschrijving} (FB_DATABASE niet geconfigureerd)`);
    return;
  }
  const start = Date.now();
  log(`▶ Start werkbon-sync: ${omschrijving} (database=${database})`);

  try {
    await upsertSyncMeta(database, "running", {});

    log("  Werkbonnen laden uit Firebird...");
    const werkbonnen = fetchWerkbonnen(fbDatabase);
    log(`  ${werkbonnen.length} werkbonnen gevonden`);

    log("  Werkbonnen schrijven naar Postgres...");
    let geschreven = 0;
    for (const wb of werkbonnen) {
      if (!wb.BONNUMMER) continue;
      await upsertWerkbon(database, {
        bonnummer:        wb.BONNUMMER,
        datum:            wb.DATUM,
        omschrijving:     wb.OMSCHRIJVING,
        status:           wb.STATUS,
        methInUitvoering: wb.METH_IN_UITVOERING,
        fase:             wb.FASE,
        klant:            wb.KLANT,
        eigenaar:         wb.EIGENAAR,
        werkCode:         wb.WERK_CODE,
        isGefactureerd:   wb.IS_GEFACTUREERD === "1",
        taakCode:         wb.TAAK_CODE,
        opbrengsten:      wb.OPBRENGSTEN,
        urenWerkbon:      wb.UREN_WERKBON,
        urenContract:     wb.UREN_CONTRACT,
      });
      geschreven++;
    }

    // Omzet uit AT_JOURNAAL + AT_VERKFACT (8020 Periodiek + 8300 Service)
    log("  Maintenance omzet laden (journaal + verkfact)...");
    const journaalOmzet = fetchJournaalMaintenance(fbDatabase);
    log(`  ${journaalOmzet.length} omzetregels gevonden`);

    // Schrijf naar rm_journaal (verwijder eerst bestaande MAINTENANCE-regels)
    await pgQuery(
      `DELETE FROM rm_journaal WHERE database = $1 AND debet_credit = 'C' AND rubriek_code IN ('8020','8300')`,
      [database]
    );
    for (const r of journaalOmzet) {
      await pgQuery(`
        INSERT INTO rm_journaal
          (id, database, project_nr, datum, rubriek_code, rubriek_omschr,
           type_rubriek, debet_credit, bedrag, omschrijving)
        VALUES (gen_random_uuid(), $1, $2, $3::date, $4, $5, 'W', 'C', $6, NULL)
      `, [database, r.CONTRACT_CODE, r.DATUM, r.RUBRIEK_CODE, r.RUBRIEK_OMSCHR, r.BEDRAG]);
    }
    log(`  ${journaalOmzet.length} omzetregels geschreven`);

    // Debiteuren voor Maintenance
    log("  Debiteuren laden...");
    const totaalDebiteuren = fetchDebiteuren(fbDatabase);
    log(`  Debiteuren: €${totaalDebiteuren.toFixed(2)}`);

    const duurMs = Date.now() - start;
    await upsertSyncMeta(database, "ok", {
      duurMs,
      projectenCount: geschreven,
      totaalDebiteuren,
    });
    log(`✓ Werkbon-sync voltooid: ${omschrijving} in ${(duurMs / 1000).toFixed(1)}s — ${geschreven} werkbonnen`);
  } catch (err) {
    const fout = err instanceof Error ? err.message : String(err);
    await upsertSyncMeta(database, "error", { duurMs: Date.now() - start, fout });
    log(`✗ Werkbon-sync mislukt: ${omschrijving} — ${fout}`);
    throw err;
  }
}

// ─── Hoofd-sync per administratie ────────────────────────────────────────────

export async function syncAdmin(config: typeof ADMIN_CONFIG[0]): Promise<void> {
  // Werkbon-type krijgt eigen sync-functie
  if (config.type === "werkbon") return syncWerkbonnen(config);

  const { adminIds, database, omschrijving, fbDatabase } = config;
  if (!fbDatabase) {
    log(`⊘ Overgeslagen: ${omschrijving} (FB_DATABASE niet geconfigureerd)`);
    return;
  }
  const start = Date.now();
  log(`▶ Start sync: ${omschrijving} (adminIds=${adminIds.join(",")}, database=${database})`);

  try {
    await upsertSyncMeta(database, "running", {});

    // 1. Rubrieken — eenmalig per FDB (niet per adminId)
    log("  Rubrieken laden...");
    const rubrieken = fetchRubrieken(fbDatabase);
    const maps = buildRubriekMaps(rubrieken);
    log(`  ${rubrieken.length} rubrieken geladen`);

    // Debiteuren — eenmalig per FDB
    log("  Debiteuren laden...");
    const totaalDebiteuren = fetchDebiteuren(fbDatabase);
    log(`  Debiteuren netto-saldo: €${totaalDebiteuren.toFixed(2)}`);

    let totalProjectCount = 0;
    const allProjectNrs: string[] = [];

    // Loop over alle adminIds (voor Services: [1, 100001])
    for (const adminId of adminIds) {
      log(`  ── adminId=${adminId} ──`);

      // 2. Projecten
      log("  Projecten laden...");
      const projecten = fetchProjecten(adminId, fbDatabase);
      log(`  ${projecten.length} projecten gevonden`);

      if (projecten.length === 0) {
        log("  Geen projecten voor dit adminId — overgeslagen");
        continue;
      }

      totalProjectCount += projecten.length;

      // 3. Klanten
      log("  Klanten laden...");
      const relaties = fetchRelaties(adminId, fbDatabase);
      const klantMap = new Map(relaties.map(r => [r.GC_ID, r.GC_OMSCHRIJVING]));

      // 4. Aanneemsom
      log("  Aanneemsom laden...");
      const orderRows = fetchOrderAgg(adminId, fbDatabase);
      const aanneesomMap = new Map(orderRows.map(o => [o.WERK_GC_ID, round2(o.AANNEEMSOM)]));

      // 5. Journaal aggregaten (voor kosten-rubrieken legacy; gefactureerd komt nu uit AT_KLNTBREG)
      log("  Journaal aggregaten laden...");
      const journaalAgg = fetchJournaalAgg(adminId, fbDatabase);
      const journaalMap = aggregeerJournaal(journaalAgg, maps);
      log(`  ${journaalAgg.length} journaalrijen geaggregeerd`);

      // 5b. Omzet via AT_KLNTBREG (gefactureerd + nog te factureren)
      log("  Omzet (AT_KLNTBREG) laden...");
      let omzetMap = new Map<number, { gefactureerd: number; nogTeFactureren: number }>();
      try {
        const omzetAgg = fetchOmzetAgg(adminId, fbDatabase);
        omzetMap = new Map(omzetAgg.map(o => [o.WERK_GC_ID, { gefactureerd: o.GEFACTUREERD, nogTeFactureren: o.NOG_TE_FACT }]));
        log(`  ${omzetAgg.length} projecten met AT_KLNTBREG omzet`);
      } catch (err) {
        log(`  AT_KLNTBREG omzet overgeslagen: ${err}`);
      }

      // 6. Uren aggregaten
      log("  Uren laden...");
      const urenAgg = fetchUrenAgg(adminId, fbDatabase);
      const urenMap = new Map(urenAgg.map(u => [u.WERK_GC_ID, round2(u.UREN_TOTAAL)]));

      // 6b. Projectleiders via AT_ORDER.MEDEW_GC_ID → AT_MEDEW
      log("  Projectleiders laden...");
      let projectleiderMap = new Map<number, string>();
      try {
        const plRows = fetchProjectleiders(adminId, fbDatabase);
        projectleiderMap = new Map(plRows.map(p => {
          const naam = p.PROJECTLEIDER;
          // Toon "Naam +n" als er meerdere medewerkers zijn
          const label = p.MEDEW_COUNT > 1 ? `${naam} +${p.MEDEW_COUNT - 1}` : naam;
          return [p.WERK_GC_ID, label];
        }));
        log(`  ${plRows.length} projectleiders gevonden`);
      } catch (err) {
        log(`  Projectleiders overgeslagen (veld niet beschikbaar): ${err}`);
      }

      // 6c. Pakbon-kosten (AT_INKBREG + AT_PAKBON, dagboeken PB01/02/03)
      log("  Pakbon-kosten laden...");
      let pakbonMap = new Map<number, number>();
      try {
        const pbRows = fetchPakbonKosten(adminId, fbDatabase);
        pakbonMap = new Map(pbRows.map(p => [p.WERK_GC_ID, p.BEDRAG_PAKBON]));
        log(`  ${pbRows.length} projecten met pakbon-kosten`);
      } catch (err) {
        log(`  Pakbon-kosten overgeslagen (tabel niet beschikbaar): ${err}`);
      }

      // 7. Details voor rm_journaal, rm_uren en rm_kosten_regel
      log("  Journaal details laden...");
      const journaalDetail = fetchJournaalDetail(adminId, fbDatabase);

      log("  Uren details laden...");
      const urenDetail = fetchUrenDetail(adminId, fbDatabase);

      log("  Kosten-regels laden (AV_KOSTREG_2)...");
      let kostenDetail: ReturnType<typeof fetchKostenDetail> = [];
      try {
        kostenDetail = fetchKostenDetail(adminId, fbDatabase);
        log(`  ${kostenDetail.length} kosten-regels gevonden`);
      } catch (err) {
        log(`  Kosten-regels overgeslagen (view niet beschikbaar): ${err}`);
      }

      // WerkId → projectnummer mapping
      const werkNrMap = new Map(projecten.map(p => [p.GC_ID, p.GC_CODE]));
      const projectNrs = projecten.map(p => p.GC_CODE);
      allProjectNrs.push(...projectNrs);

      // Kosten-categorietotalen (AV_KOSTREG_2) in memory aggregeren
      const kostenCategMap = new Map<number, { A: number; M: number; O: number }>();
      for (const k of kostenDetail) {
        const cat = k.CATEGORIE === "A" ? "A" : k.CATEGORIE === "M" ? "M" : "O";
        const entry = kostenCategMap.get(k.WERK_GC_ID) ?? { A: 0, M: 0, O: 0 };
        entry[cat] += k.GC_BEDRAG ?? 0;
        kostenCategMap.set(k.WERK_GC_ID, entry);
      }

      // Project summaries schrijven
      log("  Project summaries schrijven...");
      for (const project of projecten) {
        const agg   = journaalMap.get(project.GC_ID) ?? { gefactureerd: 0, onbetaald: 0, kostenMat: 0, kostenArb: 0, kostenOvg: 0 };
        const omzet = omzetMap.get(project.GC_ID);
        const categ = kostenCategMap.get(project.GC_ID) ?? { A: 0, M: 0, O: 0 };
        await upsertProjectSummary({
          database,
          projectNr:       project.GC_CODE,
          naam:            project.GC_OMSCHRIJVING,
          klant:           project.OPD_RELATIE_GC_ID
            ? (klantMap.get(project.OPD_RELATIE_GC_ID) ?? "")
            : "",
          status:          project.GC_HISTORISCH_JN === "J" ? "HISTORISCH" : "ACTIEF",
          projectleider:   projectleiderMap.get(project.GC_ID) ?? null,
          aanneemsom:      aanneesomMap.get(project.GC_ID) ?? 0,
          // Omzet: AT_KLNTBREG als beschikbaar, anders journaalAgg als fallback
          gefactureerd:    omzet != null ? round2(omzet.gefactureerd) : round2(agg.gefactureerd),
          nogTeFactureren: omzet != null ? round2(omzet.nogTeFactureren) : round2(agg.onbetaald),
          kostenMateriaal: round2(agg.kostenMat),
          kostenArbeid:    round2(agg.kostenArb),
          kostenOverig:    round2(agg.kostenOvg),
          kostenPakbon:    round2(pakbonMap.get(project.GC_ID) ?? 0),
          urenTotaal:      urenMap.get(project.GC_ID) ?? 0,
          kostenACateg:    round2(categ.A),
          kostenMCateg:    round2(categ.M),
          kostenOCateg:    round2(categ.O),
        });
      }
      log(`  ${projecten.length} project summaries geschreven`);

      // Journaal details
      log("  Journaal details schrijven...");
      const jRows = journaalDetail
        .map(r => ({
          projectNr:    werkNrMap.get(r.WERK_GC_ID) ?? "",
          datum:        r.DATUM,
          rubriekCode:  r.RUBRIEK_CODE,
          rubriekOmschr: r.RUBRIEK_OMSCHR,
          typeRubriek:  r.TYPE_RUBRIEK,
          debetCredit:  r.DEBET_CREDIT,
          bedrag:       round2(r.BEDRAG),
          omschrijving: r.OMSCHRIJVING,
        }))
        .filter(r => r.projectNr !== "");
      await replaceJournaalDetail(database, projectNrs, jRows);
      log(`  ${jRows.length} journaalregels geschreven`);

      // Uren details
      log("  Uren details schrijven...");
      const uRows = urenDetail
        .map(r => ({
          projectNr:   werkNrMap.get(r.WERK_GC_ID) ?? "",
          medewerker:  r.MEDEWERKER,
          datum:       r.DATUM,
          aantal:      round2(r.AANTAL),
          omschrijving: r.OMSCHRIJVING,
        }))
        .filter(r => r.projectNr !== "");
      await replaceUrenDetail(database, projectNrs, uRows);
      log(`  ${uRows.length} uren-regels geschreven`);

      // Kosten-regels (AV_KOSTREG_2)
      log("  Kosten-regels schrijven...");
      const kRows = kostenDetail
        .map(r => ({
          projectNr:    werkNrMap.get(r.WERK_GC_ID) ?? "",
          typeBreg:     r.TYPE_BREG,
          categorie:    r.CATEGORIE,
          datum:        r.DATUM,
          omschrijving: r.OMSCHRIJVING,
          bedrag:       r.GC_BEDRAG,
          dekkingen:    r.DEKKINGEN,
          factuurStatus: r.FACTUUR_STATUS,
          docCode:      r.DOC_CODE,
          creNaam:      r.CRE_NAAM,
        }))
        .filter(r => r.projectNr !== "");
      await replaceKostenDetail(database, projectNrs, kRows);
      log(`  ${kRows.length} kosten-regels geschreven`);
    }

    const duurMs = Date.now() - start;
    await upsertSyncMeta(database, "ok", { duurMs, projectenCount: totalProjectCount, totaalDebiteuren });
    log(`✓ Sync voltooid: ${omschrijving} in ${(duurMs / 1000).toFixed(1)}s — ${totalProjectCount} projecten`);

  } catch (err) {
    const fout = err instanceof Error ? err.message : String(err);
    const duurMs = Date.now() - start;
    await upsertSyncMeta(database, "error", { duurMs, fout });
    log(`✗ Sync mislukt: ${omschrijving} — ${fout}`);
    throw err;
  }
}
