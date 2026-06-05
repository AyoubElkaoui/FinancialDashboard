/**
 * Maintenance: werkbon-STATUS -> categorie.
 * Geverifieerd (324 bonnen na 6-4-2026): A=124, I=6, U=187, V=7.
 * A+I = openstaand (130), U+V = uitgevoerd (194).
 * De sync raakt dit bestand nooit aan.
 */

export type StatusCategorie = 'openstaand' | 'uitgevoerd';

export const STATUS_CATEGORIE: Record<string, StatusCategorie> = {
  A: 'openstaand',
  I: 'openstaand',
  U: 'uitgevoerd',
  V: 'uitgevoerd',
};

export function resolveStatus(code: string | null | undefined): StatusCategorie | 'onbekend' {
  if (!code) return 'onbekend';
  return STATUS_CATEGORIE[code] ?? 'onbekend';
}

export const STATUS_LABEL: Record<string, string> = {
  A: 'Aangemaakt',
  I: 'In behandeling',
  U: 'Uitgevoerd',
  V: 'Voltooid',
};

/** Excel-kolommen: aparte telling per status-letter voor de per-klantgroep tabel. */
export const EXCEL_STATUS: { key: string; label: string; codes: string[] }[] = [
  { key: 'aangemaakt',  label: 'Aangemaakt',  codes: ['A'] },
  { key: 'uitgevoerd',  label: 'Uitgevoerd',  codes: ['U', 'V'] },
  { key: 'openstaand',  label: 'Openstaand',  codes: ['I'] },
];
