/**
 * Gedeelde types voor de Maintenance klantgroepen.
 * Aparte file zodat client-components zonder server-route-import kunnen.
 */
import type { Familie } from "@/config/maintenance-klantgroep-mapping";

/** Standen: tellen altijd op tot totaal. */
export interface StandBuckets {
  totaal:   number;
  te_doen:  number;   // STATUS A
  loopt:    number;   // STATUS I
  gedaan:   number;   // STATUS U + V
}

export interface TechBucket { all: StandBuckets; jaar: StandBuckets; week: StandBuckets; }
export interface TechniekMap {
  W: TechBucket; E: TechBucket; CV: TechBucket; B: TechBucket; Overig: TechBucket;
}

export interface LocatieRij { klant: string; werkCode: string; all: StandBuckets; }

export interface KlantgroepBlok {
  klantgroep: string;
  familie:    Familie;
  all:        StandBuckets;
  jaar:       StandBuckets;
  week:       StandBuckets;
  techniek:   TechniekMap;
  omzet:      { periodiek: number; service: number; week: number; };
  locaties:   LocatieRij[];
}

export interface KlantenApiResponse {
  klantgroepen: KlantgroepBlok[];
  periodes: { start: string; weekStart: string; weekEind: string; };
}
