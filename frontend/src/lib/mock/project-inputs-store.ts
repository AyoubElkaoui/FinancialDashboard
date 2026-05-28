// Shared in-memory store for project input overrides.
// Resets on server restart — acceptable for a demo.

export interface ProjectInputRecord {
  database: string;
  projectCode: string;
  urenAantal?: number;
  urenTarief?: number;
  algKostenPct?: number;
  opmerkingen?: string;
  updatedBy: string;
  updatedAt: string;
}

const store = new Map<string, ProjectInputRecord>();

export function inputKey(database: string, projectCode: string) {
  return `${database}::${projectCode}`;
}

export function getProjectInput(database: string, projectCode: string): ProjectInputRecord | null {
  return store.get(inputKey(database, projectCode)) ?? null;
}

export function setProjectInput(record: ProjectInputRecord): ProjectInputRecord {
  store.set(inputKey(record.database, record.projectCode), record);
  return record;
}

export function deleteProjectInput(database: string, projectCode: string): void {
  store.delete(inputKey(database, projectCode));
}
