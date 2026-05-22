"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "syntess_auto_refresh";
const DEFAULT_INTERVAL = Number(process.env.NEXT_PUBLIC_DEFAULT_REFRESH_INTERVAL ?? 30000);

export function useAutoRefresh(interval = DEFAULT_INTERVAL) {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === "true";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  }, [enabled]);

  return {
    enabled,
    toggle: () => setEnabled((e) => !e),
    refetchInterval: enabled ? interval : (false as const),
  };
}
