"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, FolderKanban, FileText,
  Users, BarChart3, ChevronLeft, ChevronRight,
  Shield, ClipboardList, HelpCircle, Settings2,
  Building2, ShoppingCart, BookOpen, Wrench,
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

const NAV = [
  { href: "/",           label: "Dashboard",   icon: LayoutDashboard, exact: true },
  { href: "/projecten",  label: "Projecten",   icon: FolderKanban },
  { href: "/facturen",   label: "Facturen",    icon: FileText },
  { href: "/werkbonnen", label: "Werkbonnen",  icon: Wrench },
  { href: "/klanten",    label: "Klanten",     icon: Building2 },
  { href: "/inkoop",     label: "Inkoop",      icon: ShoppingCart },
  { href: "/grootboek",  label: "Grootboek",   icon: BookOpen },
  { href: "/rapportages", label: "Rapportages", icon: BarChart3 },
  { href: "/faq",         label: "FAQ",         icon: HelpCircle },
  { href: "/instellingen", label: "Instellingen", icon: Settings2 },
];

const ADMIN_NAV = [
  { href: "/admin/gebruikers", label: "Gebruikers",  icon: Users },
  { href: "/admin/audit",      label: "Auditlog",    icon: ClipboardList },
];

interface CurrentUser {
  role: "ADMIN" | "VIEWER";
}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const { data: user } = useQuery<CurrentUser>({
    queryKey: ["current-user"],
    queryFn: () => fetch("/api/auth/me").then((r) => r.json()),
    staleTime: 60_000,
  });

  const isAdmin = user?.role === "ADMIN";

  return (
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
        className={cn("flex items-center h-14 shrink-0", collapsed ? "justify-center" : "px-4")}
      >
        {collapsed ? (
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white font-black text-base select-none shadow-lg"
            style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)", boxShadow: "0 0 16px rgba(59,130,246,0.35)" }}
          >
            E
          </div>
        ) : (
          <Image
            src="/logo.png"
            width={160}
            height={47}
            alt="Elmar Services"
            priority
            style={{ filter: "brightness(0) invert(1)", maxWidth: "160px", height: "auto" }}
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
            <NavLink key={href} href={href} label={label} icon={Icon} active={active} collapsed={collapsed} />
          );
        })}

        {isAdmin && (
          <>
            {!collapsed && (
              <p className="text-[10px] font-semibold uppercase tracking-widest px-2 pb-2 pt-4" style={{ color: "#374e6a" }}>
                Beheer
              </p>
            )}
            {collapsed && <div style={{ borderTop: "1px solid #1e2d45" }} className="my-2" />}
            {ADMIN_NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <NavLink key={href} href={href} label={label} icon={Icon} active={active} collapsed={collapsed} admin />
              );
            })}
          </>
        )}
      </nav>

      {/* Collapse toggle */}
      <div style={{ borderTop: "1px solid #1e2d45" }} className="shrink-0 p-2">
        <button
          onClick={() => setCollapsed((c) => !c)}
          style={{ color: "#4a6080" }}
          className={cn(
            "flex items-center rounded-md hover:bg-white/5 transition-colors",
            collapsed ? "h-10 w-10 mx-auto justify-center" : "w-full gap-2 px-2.5 py-2"
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <><ChevronLeft className="h-4 w-4" /><span className="text-xs">Inklappen</span></>
          )}
        </button>
      </div>
    </aside>
  );
}

function NavLink({
  href, label, icon: Icon, active, collapsed, admin,
}: {
  href: string; label: string; icon: React.ElementType; active: boolean; collapsed: boolean; admin?: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      style={
        active
          ? { background: "#1e2d45", color: "#f1f5f9" }
          : admin
          ? { color: "#5a7a99" }
          : { color: "#7e95b0" }
      }
      className={cn(
        "relative flex items-center rounded-md transition-all duration-100 group hover:bg-white/5",
        collapsed ? "h-10 w-10 mx-auto justify-center" : "gap-2.5 px-2.5 py-2"
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-blue-500 rounded-r-full" />
      )}
      {admin && !active && !collapsed && (
        <Shield className="absolute right-2 top-1/2 -translate-y-1/2 h-2.5 w-2.5 opacity-30" />
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
}
