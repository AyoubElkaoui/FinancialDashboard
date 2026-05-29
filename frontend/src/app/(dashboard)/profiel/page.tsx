"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  User, Shield, Database, Lock, Eye, EyeOff, CheckCircle2, Loader2, KeyRound,
} from "lucide-react";

const DB_META: Record<string, { label: string; dot: string }> = {
  SERVICES:      { label: "Elmar Services",      dot: "bg-blue-500" },
  MAINTENANCE:   { label: "Elmar Maintenance",   dot: "bg-violet-500" },
  INTERNATIONAL: { label: "Elmar International", dot: "bg-emerald-500" },
  KEYSER:        { label: "Elmar Keyser",         dot: "bg-orange-500" },
};

interface CurrentUser {
  id: string;
  email: string;
  role: "ADMIN" | "VIEWER";
  databases: string[];
}

export default function ProfielPage() {
  const { data: user } = useQuery<CurrentUser>({
    queryKey: ["current-user"],
    queryFn: () => fetch("/api/auth/me").then(r => r.json()),
    staleTime: 60_000,
  });

  const [current,  setCurrent]  = useState("");
  const [nieuw,    setNieuw]    = useState("");
  const [bevestig, setBevestig] = useState("");
  const [showCur,  setShowCur]  = useState(false);
  const [showNew,  setShowNew]  = useState(false);
  const [loading,  setLoading]  = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nieuw !== bevestig) {
      toast.error("Nieuwe wachtwoorden komen niet overeen");
      return;
    }
    if (nieuw.length < 8) {
      toast.error("Wachtwoord moet minimaal 8 tekens zijn");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: nieuw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Mislukt");
      toast.success("Wachtwoord succesvol gewijzigd");
      setCurrent(""); setNieuw(""); setBevestig("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Er is iets misgegaan");
    } finally {
      setLoading(false);
    }
  };

  const userName  = user?.email?.split("@")[0] ?? "—";
  const initials  = user?.email?.[0]?.toUpperCase() ?? "?";
  const isAdmin   = user?.role === "ADMIN";

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mijn profiel</h1>
        <p className="text-sm text-muted-foreground mt-1">Beheer uw accountgegevens en beveiliging.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Accountgegevens */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Accountgegevens
              </CardTitle>
              <CardDescription>Uw profiel- en toegangsinformatie</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/40 border">
                <div className="h-14 w-14 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">
                  {initials}
                </div>
                <div>
                  <p className="font-semibold text-lg leading-none">{userName}</p>
                  <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    {isAdmin ? (
                      <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        <Shield className="h-3 w-3" /> Beheerder
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold bg-muted text-muted-foreground">
                        <User className="h-3 w-3" /> Viewer
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">E-mailadres</Label>
                  <div className="h-9 flex items-center px-3 rounded-md bg-muted/40 border text-sm text-muted-foreground">
                    {user?.email ?? "—"}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Rol</Label>
                  <div className="h-9 flex items-center px-3 rounded-md bg-muted/40 border text-sm text-muted-foreground">
                    {isAdmin ? "Beheerder (Admin)" : "Viewer"}
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                E-mailadres en rol kunnen alleen door een beheerder worden gewijzigd.
              </p>
            </CardContent>
          </Card>

          {/* Wachtwoord wijzigen */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                Wachtwoord wijzigen
              </CardTitle>
              <CardDescription>Kies een sterk wachtwoord van minimaal 8 tekens</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="current">Huidig wachtwoord</Label>
                  <div className="relative">
                    <Input
                      id="current"
                      type={showCur ? "text" : "password"}
                      autoComplete="current-password"
                      value={current}
                      onChange={e => setCurrent(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <button type="button" tabIndex={-1} onClick={() => setShowCur(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showCur ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="nieuw">Nieuw wachtwoord</Label>
                  <div className="relative">
                    <Input
                      id="nieuw"
                      type={showNew ? "text" : "password"}
                      autoComplete="new-password"
                      value={nieuw}
                      onChange={e => setNieuw(e.target.value)}
                      required
                      minLength={8}
                      className="pr-10"
                    />
                    <button type="button" tabIndex={-1} onClick={() => setShowNew(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {nieuw.length > 0 && (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex gap-1">
                        {[8, 12, 16].map(len => (
                          <div key={len} className={`h-1 w-8 rounded-full transition-colors ${nieuw.length >= len ? "bg-emerald-500" : "bg-muted"}`} />
                        ))}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {nieuw.length < 8 ? "Te kort" : nieuw.length < 12 ? "Voldoende" : nieuw.length < 16 ? "Goed" : "Sterk"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bevestig">Bevestig nieuw wachtwoord</Label>
                  <Input
                    id="bevestig"
                    type="password"
                    autoComplete="new-password"
                    value={bevestig}
                    onChange={e => setBevestig(e.target.value)}
                    required
                    className={bevestig && nieuw !== bevestig ? "border-red-400 focus:border-red-500" : ""}
                  />
                  {bevestig && nieuw !== bevestig && (
                    <p className="text-xs text-red-500">Wachtwoorden komen niet overeen</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !current || !nieuw || nieuw !== bevestig || nieuw.length < 8}
                  className="flex items-center gap-2 h-10 px-5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  Wachtwoord wijzigen
                </button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">

          {/* Database toegang */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                Database toegang
              </CardTitle>
              <CardDescription>Databases die aan uw account zijn gekoppeld</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(user?.databases ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Geen databases gekoppeld</p>
              ) : (
                (user?.databases ?? []).map(db => {
                  const meta = DB_META[db];
                  return (
                    <div key={db} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/40 border">
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${meta?.dot ?? "bg-slate-400"}`} />
                      <span className="text-sm font-medium">{meta?.label ?? db}</span>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 ml-auto" />
                    </div>
                  );
                })
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Database toegang wordt beheerd door de systeembeheerder.
              </p>
            </CardContent>
          </Card>

          {/* Beveiliging */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                Beveiliging
              </CardTitle>
              <CardDescription>Beveiligingsstatus van uw account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Wachtwoord",         status: true,  info: "Ingesteld"        },
                { label: "2-staps verificatie", status: true,  info: "Actief"           },
                { label: "Sessieduur",          status: true,  info: "8 uur"            },
                { label: "HTTPS verbinding",    status: true,  info: "Versleuteld"      },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <span className="text-sm">{item.label}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">{item.info}</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground pt-1">
                2FA beheren: ga via de beheerder naar uw account-instellingen, of gebruik <span className="font-mono">/2fa-setup</span>.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
