export type ViewType = "PROJECT" | "CUSTOMER";

export const DB_VIEW_CONFIG: Record<string, ViewType> = {
  SERVICES:      "PROJECT",
  KEYSER:        "PROJECT",
  INTERNATIONAL: "PROJECT",
  MAINTENANCE:   "CUSTOMER",
};

export function getViewType(database: string | null | undefined): ViewType {
  return DB_VIEW_CONFIG[database ?? ""] ?? "PROJECT";
}
