/**
 * Elmar Maintenance B.V. — centrale bedrijfsparameters.
 * Pas hier aan, NERGENS anders hardcoden.
 * Datum geverifieerd: data vóór 6-4-2026 is leeg/0 (oud bedrijf).
 */

/** Startdatum van het bedrijf — elke query filtert hierop. */
export const MAINTENANCE_START = "2026-04-06";

/** Als JavaScript Date voor Prisma-queries. */
export const MAINTENANCE_START_DATE = new Date(MAINTENANCE_START);

/** Omzetrubrieken (8020 Periodiek + 8300 Service). Geen 8000. */
export const OMZET_RUBRIEKEN = ["8020", "8300"] as const;
