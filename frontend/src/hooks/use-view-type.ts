"use client";

import { useActiveDb } from "./use-active-db";
import { getViewType, type ViewType } from "@/lib/view-config";

export function useViewType(): ViewType {
  const db = useActiveDb();
  return getViewType(db);
}
