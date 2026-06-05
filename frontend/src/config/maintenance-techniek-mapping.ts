/**
 * Maintenance: werkbon-TAAK -> techniek-discipline.
 * AT_WERKBON.TAAK_GC_ID -> AT_TAAK.GC_CODE -> techniek-categorie.
 * Geverifieerd tegen takenlijst op 400-werkbonnen (ELMM ATRIUM.FDB).
 * Verdeling na 6-4-2026: W=110, B=89, E=76, Overig/leeg=49, CV=0 (nog geen bons).
 * De sync raakt dit bestand nooit aan.
 */

export type Techniek = 'W' | 'E' | 'CV' | 'B' | 'Overig';

export const TAAK_TECHNIEK: Record<string, Techniek> = {
  // W-installaties
  'POW': 'W',
  'PSW': 'W',
  'PW':  'W',
  // Elektra
  'POE':   'E',
  'PSE':   'E',
  'POE01': 'E',
  'PE':    'E',
  '002':   'E',
  // CV
  '200.06': 'CV',
  // Bouwkundig
  'POB': 'B',
  'PSB': 'B',
  'PB':  'B',
  // Overig
  'PSZ':           'Overig',
  'PORTALVERZOEK': 'Overig',
  'PM':            'Overig',
  'DERDEN':        'Overig',
  'P-93070':       'Overig',
};

export function resolveTechniek(taakCode: string | null | undefined): Techniek {
  if (!taakCode) return 'Overig';
  return TAAK_TECHNIEK[taakCode] ?? 'Overig';
}

export const TECHNIEK_LABEL: Record<Techniek, string> = {
  W:      'Onderhoud W',
  E:      'Onderhoud E',
  CV:     'Onderhoud CV',
  B:      'Bouwkundig',
  Overig: 'Overig',
};

export const TECHNIEK_VOLGORDE: Techniek[] = ['W', 'E', 'CV', 'B', 'Overig'];
