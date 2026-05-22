import { format, formatDistanceToNow, parseISO } from "date-fns";
import { nl } from "date-fns/locale";

const currencyFmt = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

const numberFmt = new Intl.NumberFormat("nl-NL", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return currencyFmt.format(value);
}

export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("nl-NL", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** Short date: 12-05-2026 */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  try {
    const d = typeof value === "string" ? parseISO(value) : value;
    return format(d, "dd-MM-yyyy");
  } catch {
    return String(value);
  }
}

/** Long date: 12 mei 2026 */
export function formatDateLong(value: string | Date | null | undefined): string {
  if (!value) return "—";
  try {
    const d = typeof value === "string" ? parseISO(value) : value;
    return format(d, "d MMMM yyyy", { locale: nl });
  } catch {
    return String(value);
  }
}

export function formatRelative(value: string | Date | null | undefined): string {
  if (!value) return "—";
  try {
    const d = typeof value === "string" ? parseISO(value) : value;
    return formatDistanceToNow(d, { locale: nl, addSuffix: true });
  } catch {
    return String(value);
  }
}

export function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${numberFmt.format(value)}%`;
}

export function formatDaysOverdue(days: number | null | undefined): string {
  if (days === null || days === undefined) return "—";
  if (days <= 0) return "Op tijd";
  return `${days} dag${days === 1 ? "" : "en"} te laat`;
}
