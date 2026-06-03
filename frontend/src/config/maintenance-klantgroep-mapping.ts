/**
 * Maintenance: contract -> klantgroep -> familie
 * ------------------------------------------------------------------
 * Afgeleid uit de VOLLEDIGE Atrium-export (ELMM ATRIUM.FDB), 36 contracten
 * met GC_CODE STARTING WITH '400'. Totaal 27.072 werkbonnen, sluit exact.
 *
 * BESLISSINGEN (door Ayoub bevestigd):
 *  - Bestseller-merken: elk merk een EIGEN klantgroep, met optionele
 *    rollup-laag "familie" erboven (Bestseller / AS Watson / CeX).
 *  - AS Watson + ICI Paris XL: SAMEN in één klantgroep.
 *  - "Periodiek / Overig": aparte groep, blijft zichtbaar, niet verdeeld.
 *  - Niet-400 werkbonnen (284 stuks, 1%): NIET in klantenpagina — dit zijn
 *    eenmalige projecten, geen structurele onderhoudscontracten.
 *
 * LAND is GEEN groeperingsdimensie. Het contract bepaalt de klantgroep.
 * Land hoort op LOCATIE-niveau (AT_ADRES.LAND_GC_ID) als detail/filter,
 * want ONLY heeft al aparte contracten per land (Holland/België/LU/DE).
 *
 * Dit is BEDRIJFSLOGICA, geen DB-veld. Pas hier aan als een contract
 * van klant/groep wisselt. De sync raakt dit bestand nooit aan.
 */

export type Familie = 'Bestseller' | 'AS Watson' | 'CeX' | null;

export interface KlantgroepDef {
  klantgroep: string;
  familie:    Familie;
}

/** contractcode (AT_WERK.GC_CODE) -> klantgroep + optionele familie */
export const CONTRACT_KLANTGROEP: Record<string, KlantgroepDef> = {
  // --- Bestseller-familie ---
  '400-20-001':   { klantgroep: 'ONLY Holland',                familie: 'Bestseller' },
  '400-0003':     { klantgroep: 'ONLY België',                 familie: 'Bestseller' },
  '400-0004':     { klantgroep: 'ONLY Luxembourg',             familie: 'Bestseller' },
  '400-0002':     { klantgroep: 'ONLY Germany',                familie: 'Bestseller' },
  '400-0000':     { klantgroep: 'ONLY Germany',                familie: 'Bestseller' },
  '400-20-003':   { klantgroep: 'Vero Moda',                   familie: 'Bestseller' },
  '400-20-002':   { klantgroep: 'Vero Moda / Jack & Jones',    familie: 'Bestseller' },
  '400-20-008':   { klantgroep: 'Jack & Jones',                familie: 'Bestseller' },
  '400-20-007':   { klantgroep: 'Vero Moda (Avoird & Kubber)', familie: 'Bestseller' },
  '400-20-004':   { klantgroep: 'VILA',                        familie: 'Bestseller' },
  '400-20-006':   { klantgroep: 'Pieces',                      familie: 'Bestseller' },
  '400-20-017':   { klantgroep: 'ZiZi',                        familie: 'Bestseller' },
  '400-20-016':   { klantgroep: 'IEF Berlage',                 familie: 'Bestseller' },
  '400-003':      { klantgroep: 'Bestseller NL',               familie: 'Bestseller' },
  '400-0005':     { klantgroep: 'Bestseller België',           familie: 'Bestseller' },
  '400-005':      { klantgroep: 'Bestseller / overig',         familie: 'Bestseller' },

  // --- AS Watson-familie (incl. ICI Paris XL) ---
  '400-00':       { klantgroep: 'AS Watson - ICI',             familie: 'AS Watson' },
  '400-01':       { klantgroep: 'AS Watson - ICI',             familie: 'AS Watson' },
  '400-000':      { klantgroep: 'AS Watson - ICI',             familie: 'AS Watson' },
  '400-001':      { klantgroep: 'AS Watson - ICI',             familie: 'AS Watson' },

  // --- CeX-familie ---
  '400-20-005':   { klantgroep: 'CeX',                         familie: 'CeX' },
  '400-16-001':   { klantgroep: 'CeX',                         familie: 'CeX' },

  // --- Losse klantgroepen (geen familie) ---
  '400-23-000':   { klantgroep: 'Normal',                      familie: null },
  '400-20-009':   { klantgroep: 'G-Star',                      familie: null },
  '400-20-010':   { klantgroep: 'Mulberry',                    familie: null },
  '400-20-011':   { klantgroep: 'Donna Li',                    familie: null },
  '400-25-001':   { klantgroep: 'KVIK',                        familie: null },
  '400-22-012':   { klantgroep: 'Shizen',                      familie: null },
  '400.22.122':   { klantgroep: 'Assuradeuren Gilde',          familie: null },
  '400-007':      { klantgroep: 'CD-One Amsterdam',            familie: null },
  '400-22-014':   { klantgroep: 'Meubi Plus',                  familie: null },
  '400.24.137-1': { klantgroep: 'E. van Wijk',                 familie: null },
  '400-004':      { klantgroep: 'Cannondale',                  familie: null },

  // --- Periodiek / Overig (apart, blijft zichtbaar) ---
  '400-20-000A':  { klantgroep: 'Periodiek / Overig',          familie: null },
  '400-0001':     { klantgroep: 'Periodiek / Overig',          familie: null },
  '400-22-000':   { klantgroep: 'Periodiek / Overig',          familie: null },
};

/** Fallback voor onbekende/nieuwe contracten: val terug op de losse contractcode. */
export function resolveKlantgroep(contractCode: string | null): KlantgroepDef {
  if (!contractCode) return { klantgroep: 'Onbekend', familie: null };
  return CONTRACT_KLANTGROEP[contractCode]
    ?? { klantgroep: contractCode, familie: null };
}

/** Vaste volgorde voor familievermelding in de UI. */
export const FAMILIE_VOLGORDE: (Familie | '_overig')[] = [
  'Bestseller', 'AS Watson', 'CeX', null, '_overig',
];
