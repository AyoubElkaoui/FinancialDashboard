"use client";

import { useQuery } from "@tanstack/react-query";

interface Me { role: "ADMIN" | "MGM" | "VIEWER" }

export function useRole() {
  const { data } = useQuery<Me>({
    queryKey: ["me"],
    queryFn:  () => fetch("/api/auth/me").then(r => r.json()),
    staleTime: 60_000,
  });
  return data?.role ?? null;
}

export function useIsMgm() {
  const role = useRole();
  return role === "MGM" || role === "ADMIN";
}
