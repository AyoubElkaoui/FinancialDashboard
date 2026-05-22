"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, FolderKanban, ClipboardList,
  FileText, ShoppingCart, BookOpen, Users, BarChart3,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { useState } from "react";

const NAV = [
  { href: "/",           label: "Dashboard",   icon: LayoutDashboard, exact: true },
  { href: "/projecten",  label: "Projecten",   icon: FolderKanban },
  { href: "/werkbonnen", label: "Werkbonnen",  icon: ClipboardList },
  { href: "/facturen",   label: "Facturen",    icon: FileText },
  { href: "/inkoop",     label: "Inkoop",      icon: ShoppingCart },
  { href: "/grootboek",  label: "Grootboek",   icon: BookOpen },
  { href: "/klanten",    label: "Klanten",     icon: Users },
  { href: "/rapportages","label": "Rapportages", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    /* Hardcoded dark navy — not relying on CSS variable utilities */
    <aside
      style={{ background: "#0f1929", borderRight: "1px solid #1e2d45" }}
      className={cn(
        "flex flex-col h-screen shrink-0 transition-all duration-200",
        collapsed ? "w-[60px]" : "w-[220px]"
      )}
    >
      {/* Logo */}
      <div
        style={{ borderBottom: "1px solid #1e2d45" }}
        className={cn(
          "flex items-center h-14 shrink-0",
          collapsed ? "justify-center" : "px-4"
        )}
      >
        {collapsed ? (
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white font-bold text-base select-none"
            style={{ background: "#1e2d45" }}
          >
            E
          </div>
        ) : (
          <Image
            src="/logo.png"
            width={120}
            height={35}
            alt="Elmar"
            style={{ filter: "brightness(0) invert(1)" }}
          />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {!collapsed && (
          <p className="text-[10px] font-semibold uppercase tracking-widest px-2 pb-2 pt-1" style={{ color: "#374e6a" }}>
            Navigatie
          </p>
        )}
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              style={active
                ? { background: "#1e2d45", color: "#f1f5f9" }
                : { color: "#7e95b0" }
              }
              className={cn(
                "relative flex items-center rounded-md transition-all duration-100 group hover:bg-white/5",
                collapsed ? "h-10 w-10 mx-auto justify-center" : "gap-2.5 px-2.5 py-2"
              )}
            >
              {/* Active indicator */}
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-blue-500 rounded-r-full" />
              )}
              <Icon
                className="shrink-0"
                style={{ width: 16, height: 16, color: active ? "#60a5fa" : undefined }}
              />
              {!collapsed && (
                <span className={cn("text-sm font-medium", active && "text-white")}>{label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div style={{ borderTop: "1px solid #1e2d45" }} className="shrink-0 p-2">
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{ color: "#4a6080" }}
          className={cn(
            "flex items-center rounded-md hover:bg-white/5 transition-colors",
            collapsed ? "h-10 w-10 mx-auto justify-center" : "w-full gap-2 px-2.5 py-2"
          )}
        >
          {collapsed
            ? <ChevronRight className="h-4 w-4" />
            : <><ChevronLeft className="h-4 w-4" /><span className="text-xs">Inklappen</span></>
          }
        </button>
      </div>
    </aside>
  );
}
