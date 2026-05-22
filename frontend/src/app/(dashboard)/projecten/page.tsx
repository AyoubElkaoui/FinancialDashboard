"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { projectenApi } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { DataTable } from "@/components/tables/data-table";
import { FilterBar } from "@/components/filters/filter-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryParams } from "@/hooks/use-query-params";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";

type Project = Record<string, unknown>;

const STATUS_OPTIONS = [
  { value: "ACTIEF",      label: "Actief" },
  { value: "AFGEROND",    label: "Afgerond" },
  { value: "GEANNULEERD", label: "Geannuleerd" },
  { value: "ON_HOLD",     label: "On Hold" },
];

const columns: ColumnDef<Project>[] = [
  { accessorKey: "PROJECTNUMMER", header: "Nummer", size: 120 },
  { accessorKey: "NAAM", header: "Naam" },
  { accessorKey: "KLANT", header: "Klant" },
  { accessorKey: "PROJECTLEIDER", header: "Projectleider" },
  {
    accessorKey: "STATUS",
    header: "Status",
    cell: ({ getValue }) => {
      const v = String(getValue() ?? "");
      return <StatusBadge status={v} />;
    },
  },
  {
    accessorKey: "STARTDATUM",
    header: "Startdatum",
    cell: ({ getValue }) => formatDate(String(getValue() ?? "")),
  },
  {
    accessorKey: "EINDDATUM",
    header: "Einddatum",
    cell: ({ getValue }) => formatDate(String(getValue() ?? "")),
  },
  {
    id: "werkbonnen_count",
    header: "Werkbonnen",
    cell: ({ row }) => {
      const wb = row.original.werkbonnen_count ?? row.original.WERKBONNEN_COUNT;
      if (wb === undefined || wb === null) return <span className="text-muted-foreground">—</span>;
      return <span className="tabular-nums">{String(wb)}</span>;
    },
  },
];

function ProjectenInner() {
  const router = useRouter();
  const { get, setParams, resetParams } = useQueryParams();
  const { refetchInterval } = useAutoRefresh();

  const params = {
    page: Number(get("page") ?? 1),
    pageSize: Number(get("pageSize") ?? 50),
    search: get("search") ?? undefined,
    status: get("status") ?? undefined,
    dateFrom: get("dateFrom") ?? undefined,
    dateTo: get("dateTo") ?? undefined,
    sortBy: get("sortBy") ?? "PROJECTNUMMER",
    sortDir: get("sortDir") ?? "DESC",
  };

  const { data, isLoading } = useQuery({
    queryKey: ["projecten", params],
    queryFn: () => projectenApi.list(params),
    refetchInterval,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Projecten</h1>

      <FilterBar
        search={params.search}
        onSearchChange={(v) => setParams({ search: v, page: "1" })}
        dateFrom={params.dateFrom}
        dateTo={params.dateTo}
        onDateChange={(from, to) => setParams({ dateFrom: from, dateTo: to, page: "1" })}
        onReset={resetParams}
      >
        {/* Status filter */}
        <Select
          value={params.status ?? "all"}
          onValueChange={(v) => setParams({ status: v === "all" ? "" : v, page: "1" })}
        >
          <SelectTrigger className="h-8 w-36 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-sm">Alle statussen</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value} className="text-sm">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      <DataTable
        columns={columns}
        data={(data?.data ?? []) as Project[]}
        loading={isLoading}
        total={data?.total}
        page={params.page}
        pageSize={params.pageSize}
        totalPages={data?.totalPages}
        onPageChange={(p) => setParams({ page: String(p) })}
        onRowClick={(row) => router.push(`/projecten/${String(row.ID ?? "")}`)}
        emptyMessage="Geen projecten gevonden"
      />
    </div>
  );
}

export default function ProjectenPage() {
  return (
    <Suspense>
      <ProjectenInner />
    </Suspense>
  );
}
