"use client";

import { useEffect, useState } from "react";

export const DB_CHANGE_EVENT = "elmar-db-change";

export function useActiveDb(): string {
  const [db, setDb] = useState<string>("SERVICES");

  useEffect(() => {
    // Read the stored value after hydration (localStorage is unavailable on server)
    try {
      const stored = localStorage.getItem("elmar_active_db");
      if (stored) setDb(stored);
    } catch { /* ignore */ }

    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail) setDb(detail);
    };
    window.addEventListener(DB_CHANGE_EVENT, handler);
    return () => window.removeEventListener(DB_CHANGE_EVENT, handler);
  }, []);

  return db;
}
