"use client";

import { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Search } from "lucide-react";

export interface DatePreset {
  label: string;
  value: string;
  from: string;
  to: string;
}

function getDatePresets(): DatePreset[] {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const startOf = (unit: "week" | "month" | "quarter" | "year") => {
    const d = new Date(today);
    if (unit === "week") { d.setDate(d.getDate() - d.getDay() + 1); }
    if (unit === "month") { d.setDate(1); }
    if (unit === "quarter") { d.setMonth(Math.floor(d.getMonth() / 3) * 3, 1); }
    if (unit === "year") { d.setMonth(0, 1); }
    return d;
  };

  return [
    { label: "Vandaag", value: "today", from: fmt(today), to: fmt(today) },
    { label: "Deze week", value: "week", from: fmt(startOf("week")), to: fmt(today) },
    { label: "Deze maand", value: "month", from: fmt(startOf("month")), to: fmt(today) },
    { label: "Dit kwartaal", value: "quarter", from: fmt(startOf("quarter")), to: fmt(today) },
    { label: "Dit jaar", value: "year", from: fmt(startOf("year")), to: fmt(today) },
  ];
}

interface FilterBarProps {
  search?: string;
  onSearchChange?: (v: string) => void;
  dateFrom?: string;
  dateTo?: string;
  onDateChange?: (from: string, to: string) => void;
  onReset?: () => void;
  children?: React.ReactNode;
}

export function FilterBar({
  search = "",
  onSearchChange,
  dateFrom,
  dateTo,
  onDateChange,
  onReset,
  children,
}: FilterBarProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleSearch = (v: string) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearchChange?.(v), 300);
  };

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const presets = getDatePresets();
  const activePreset = presets.find((p) => p.from === dateFrom && p.to === dateTo);

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {onSearchChange && (
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            defaultValue={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Zoeken..."
            className="pl-8 h-8 w-52 text-sm"
          />
        </div>
      )}

      {onDateChange && (
        <>
          <Select
            value={activePreset?.value ?? "custom"}
            onValueChange={(v) => {
              const preset = presets.find((p) => p.value === v);
              if (preset) onDateChange(preset.from, preset.to);
            }}
          >
            <SelectTrigger className="h-8 w-36 text-sm">
              <SelectValue placeholder="Periode" />
            </SelectTrigger>
            <SelectContent>
              {presets.map((p) => (
                <SelectItem key={p.value} value={p.value} className="text-sm">
                  {p.label}
                </SelectItem>
              ))}
              <SelectItem value="custom" className="text-sm">Aangepast</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="date"
            lang="nl"
            value={dateFrom ?? ""}
            onChange={(e) => onDateChange(e.target.value, dateTo ?? "")}
            className="h-8 w-36 text-sm"
          />
          <span className="text-muted-foreground text-sm">t/m</span>
          <Input
            type="date"
            lang="nl"
            value={dateTo ?? ""}
            onChange={(e) => onDateChange(dateFrom ?? "", e.target.value)}
            className="h-8 w-36 text-sm"
          />
        </>
      )}

      {/* Extra filters (slot) */}
      {children}

      {onReset && (
        <Button variant="ghost" size="sm" onClick={onReset} className="h-8 text-xs gap-1.5 text-muted-foreground">
          <X className="h-3.5 w-3.5" />
          Reset
        </Button>
      )}
    </div>
  );
}
