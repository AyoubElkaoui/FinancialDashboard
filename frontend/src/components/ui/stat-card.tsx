import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

const COLORS = {
  blue:   { wrap: "bg-blue-500/10   ring-1 ring-blue-500/15",   icon: "text-blue-500"   },
  green:  { wrap: "bg-emerald-500/10 ring-1 ring-emerald-500/15", icon: "text-emerald-500" },
  orange: { wrap: "bg-orange-500/10 ring-1 ring-orange-500/15", icon: "text-orange-500" },
  red:    { wrap: "bg-red-500/10    ring-1 ring-red-500/15",    icon: "text-red-500"    },
  purple: { wrap: "bg-violet-500/10 ring-1 ring-violet-500/15", icon: "text-violet-500" },
  slate:  { wrap: "bg-slate-500/10  ring-1 ring-slate-500/15",  icon: "text-slate-500"  },
} as const;

export function StatCard({ label, value, sub, icon: Icon, color = "blue", className }: {
  label: string; value: string; sub?: string;
  icon?: LucideIcon; color?: keyof typeof COLORS; className?: string;
}) {
  const c = COLORS[color];
  return (
    <div className={cn("rounded-xl border bg-card p-4 flex items-start gap-3.5 shadow-sm", className)}>
      {Icon && (
        <div className={cn("mt-0.5 rounded-lg p-2 shrink-0", c.wrap)}>
          <Icon className={cn("h-4 w-4", c.icon)} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider leading-none">{label}</p>
        <p className="text-2xl font-bold tabular-nums mt-1.5 leading-none tracking-tight">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-1.5 leading-tight">{sub}</p>}
      </div>
    </div>
  );
}
