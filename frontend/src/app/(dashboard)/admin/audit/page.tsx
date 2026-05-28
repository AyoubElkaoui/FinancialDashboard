"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

interface AuditEntry {
  id: string;
  action: string;
  database?: string;
  detail?: string;
  ip?: string;
  createdAt: string;
  user: { email: string };
}

async function fetchAudit(): Promise<{ total: number; logs: AuditEntry[] }> {
  const res = await fetch("/api/admin/audit?limit=100");
  if (!res.ok) throw new Error("Kon auditlog niet laden");
  return res.json();
}

const ACTION_COLORS: Record<string, string> = {
  LOGIN: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  LOGOUT: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  USER_CREATED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  USER_UPDATED: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  USER_DELETED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  EXPORT_PDF: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  EXPORT_EXCEL: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

export default function AuditPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ["audit-log"], queryFn: fetchAudit });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Auditlog</h1>
        <p className="text-muted-foreground text-sm">
          Alle acties worden hier geregistreerd
          {data ? ` — ${data.total} totaal` : ""}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-6 text-center text-destructive">
            Kon auditlog niet laden
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recente activiteit</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {data?.logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 px-6 py-3">
                  <span
                    className={`shrink-0 mt-0.5 rounded-md px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[log.action] ?? "bg-slate-100 text-slate-600"}`}
                  >
                    {log.action}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{log.user.email}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      {log.database && <Badge variant="outline" className="text-xs py-0">{log.database}</Badge>}
                      {log.detail && <span className="truncate">{log.detail}</span>}
                      {log.ip && <span className="font-mono">{log.ip}</span>}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: nl })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
