"use client";

import { useEffect, useState } from "react";

export const DB_CHANGE_EVENT = "elmar-db-change";

export function useActiveDb(): string {
  const [db, setDb] = useState<string>(() => {
    if (typeof window === "undefined") return "SERVICES";
    try { return localStorage.getItem("elmar_active_db") ?? "SERVICES"; } catch { return "SERVICES"; }
  });

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail) setDb(detail);
    };
    window.addEventListener(DB_CHANGE_EVENT, handler);
    return () => window.removeEventListener(DB_CHANGE_EVENT, handler);
  }, []);

  return db;
}
