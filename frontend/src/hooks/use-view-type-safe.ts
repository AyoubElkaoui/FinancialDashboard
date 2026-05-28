"use client";

import { useState, useEffect } from "react";
import { useViewType } from "./use-view-type";
import type { ViewType } from "@/lib/view-config";

/**
 * Same as useViewType but always returns "PROJECT" on the first render
 * so SSR/hydration HTML matches. Switches to the real value after mount.
 */
export function useViewTypeSafe(): ViewType {
  const viewType = useViewType();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return mounted ? viewType : "PROJECT";
}
