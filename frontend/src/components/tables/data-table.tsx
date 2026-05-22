"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  SortingState,
  getSortedRowModel,
  VisibilityState,
} from "@tanstack/react-table";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, ChevronUp, ChevronsUpDown, Columns3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;
  onRowClick?: (row: TData) => void;
  pageSize?: number;
  page?: number;
  total?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onSortChange?: (sortBy: string, sortDir: "ASC" | "DESC") => void;
  emptyMessage?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  loading,
  onRowClick,
  pageSize = 50,
  page = 1,
  total = 0,
  totalPages = 1,
  onPageChange,
  emptyMessage = "Geen resultaten gevonden",
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    manualPagination: true,
    manualSorting: true,
    state: { sorting, columnVisibility },
    pageCount: totalPages,
  });

  return (
    <div className="space-y-2">
      {/* Column visibility toggle */}
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
                <Columns3 className="h-3.5 w-3.5" />
                Kolommen
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-44">
            {table
              .getAllColumns()
              .filter((col) => col.getCanHide())
              .map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  checked={col.getIsVisible()}
                  onCheckedChange={(v) => col.toggleVisibility(!!v)}
                  className="text-sm"
                >
                  {typeof col.columnDef.header === "string" ? col.columnDef.header : col.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap">
                    {header.isPlaceholder ? null : (
                      <div
                        className={header.column.getCanSort() ? "flex items-center gap-1 cursor-pointer select-none" : ""}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          header.column.getIsSorted() === "asc" ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : header.column.getIsSorted() === "desc" ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronsUpDown className="h-3 w-3 text-muted-foreground" />
                          )
                        )}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className={onRowClick ? "cursor-pointer" : ""}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground text-sm">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total > 0 ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} van ${total}` : "0 resultaten"}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2"
            onClick={() => onPageChange?.(page - 1)}
            disabled={page <= 1}
          >
            Vorige
          </Button>
          <span className="px-2 text-xs">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2"
            onClick={() => onPageChange?.(page + 1)}
            disabled={page >= totalPages}
          >
            Volgende
          </Button>
        </div>
      </div>
    </div>
  );
}
