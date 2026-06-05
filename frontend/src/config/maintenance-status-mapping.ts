/**
 * Maintenance: werkbon-STATUS -> stand + duidelijke labels.
 * Geverifieerd: elke bon valt in PRECIES ÉÉN status.
 * Som te_doen + loopt + gedaan == totaal (check die vertrouwen geeft).
 * ONLY Holland 2026: A=20 + I=1 + U+V=222 = 243 totaal — sluit exact.
 *
 * Statuscodes (afgeleid via GC_GEREEDMELDDATUM):
 *   A = nog niet opgepakt  -> "Nog te doen"
 *   I = in behandeling     -> "Loopt"
 *   U = werk gedaan        -> "Gedaan"
 *   V = volledig afgerond  -> "Gedaan"
 */

export type Stand = 'te_doen' | 'loopt' | 'gedaan';

export const STATUS_STAND: Record<string, Stand> = {
  A: 'te_doen',
  I: 'loopt',
  U: 'gedaan',
  V: 'gedaan',
};

export function resolveStand(code: string | null | undefined): Stand | 'onbekend' {
  if (!code) return 'onbekend';
  return STATUS_STAND[code] ?? 'onbekend';
}

export const STAND_LABEL: Record<Stand, string> = {
  te_doen: 'Nog te doen',
  loopt:   'Loopt',
  gedaan:  'Gedaan',
};
