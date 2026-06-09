"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Shield, Pencil, X, Check } from "lucide-react";

const DB_OPTIONS = ["SERVICES", "MAINTENANCE", "INTERNATIONAL", "KEYSER"] as const;
type DbOption = (typeof DB_OPTIONS)[number];

const DB_LABEL: Record<DbOption, string> = {
  SERVICES: "Services", MAINTENANCE: "Maintenance", INTERNATIONAL: "International", KEYSER: "Keyser",
};

interface User {
  id: string;
  email: string;
  role: "ADMIN" | "MGM" | "VIEWER";
  totpEnabled: boolean;
  databases: { database: DbOption }[];
  createdAt: string;
}

async function fetchUsers(): Promise<User[]> {
  const res = await fetch("/api/admin/users");
  if (!res.ok) throw new Error("Kon gebruikers niet laden");
  return res.json();
}

// ── Inline-edit card per gebruiker ───────────────────────────────────────────

function UserCard({ user, onDelete }: { user: User; onDelete: (id: string) => void }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [role, setRole]       = useState<User["role"]>(user.role);
  const [dbs, setDbs]         = useState<DbOption[]>(user.databases.map(d => d.database));
  const [newPw, setNewPw]     = useState("");

  const pwOk = newPw.length === 0 || newPw.length >= 8;

  function resetEdit() {
    setRole(user.role);
    setDbs(user.databases.map(d => d.database));
    setNewPw("");
    setEditing(false);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { role, databases: dbs };
      if (newPw.length >= 8) body.newPassword = newPw;
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Opslaan mislukt");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(`${user.email} bijgewerkt`);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setEditing(false);
      setNewPw("");
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleDb = (db: DbOption) =>
    setDbs(prev => prev.includes(db) ? prev.filter(d => d !== db) : [...prev, db]);

  const roleChanged = role !== user.role;
  const dbsChanged  = JSON.stringify([...dbs].sort()) !== JSON.stringify([...user.databases.map(d => d.database)].sort());
  const canSave     = pwOk && (roleChanged || dbsChanged || newPw.length >= 8);

  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        {/* ── Header rij ── */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
              <span className="text-blue-600 text-xs font-bold">{user.email[0].toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate">{user.email}</p>
              {!editing && (
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <Badge
                    variant={user.role === "ADMIN" ? "default" : user.role === "MGM" ? "outline" : "secondary"}
                    className={`text-xs ${user.role === "MGM" ? "border-emerald-500 text-emerald-700 dark:text-emerald-400" : ""}`}
                  >
                    {user.role === "ADMIN" ? <><Shield className="h-2.5 w-2.5 mr-1" />Beheerder</> : user.role === "MGM" ? "Management" : "Gebruiker"}
                  </Badge>
                  {user.databases.map(d => (
                    <Badge key={d.database} variant="outline" className="text-xs">{DB_LABEL[d.database]}</Badge>
                  ))}
                  {!user.totpEnabled && (
                    <Badge variant="destructive" className="text-xs">2FA niet ingesteld</Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {editing ? (
              <>
                <Button
                  variant="ghost" size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={resetEdit}
                  title="Annuleren"
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={!canSave || saveMutation.isPending}
                  onClick={() => saveMutation.mutate()}
                  title="Opslaan"
                >
                  {saveMutation.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Check className="h-4 w-4" />}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost" size="icon"
                  className="text-muted-foreground hover:text-blue-600"
                  onClick={() => setEditing(true)}
                  title="Wijzigen"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost" size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    if (confirm(`Gebruiker ${user.email} verwijderen?`)) onDelete(user.id);
                  }}
                  title="Verwijderen"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ── Edit-sectie ── */}
        {editing && (
          <div className="border-t pt-3 space-y-3">
            {/* Rol */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Rol</Label>
              <div className="flex gap-2">
                {(["VIEWER", "MGM", "ADMIN"] as const).map(r => (
                  <button
                    key={r} type="button"
                    onClick={() => setRole(r)}
                    className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${role === r ? "bg-blue-600 text-white border-blue-600" : "border-border hover:border-blue-400"}`}
                  >
                    {r === "ADMIN" ? "Beheerder" : r === "MGM" ? "Management" : "Gebruiker"}
                  </button>
                ))}
              </div>
            </div>

            {/* Database-toegang */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Database-toegang</Label>
              <div className="flex gap-2 flex-wrap">
                {DB_OPTIONS.map(db => (
                  <button
                    key={db} type="button"
                    onClick={() => toggleDb(db)}
                    className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${dbs.includes(db) ? "bg-blue-600 text-white border-blue-600" : "border-border hover:border-blue-400"}`}
                  >
                    {DB_LABEL[db]}
                  </button>
                ))}
              </div>
            </div>

            {/* Nieuw wachtwoord */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Nieuw wachtwoord (optioneel)</Label>
              <Input
                type="password"
                placeholder="Laat leeg om ongewijzigd te laten"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                className={!pwOk ? "border-red-400 focus-visible:ring-red-400" : ""}
              />
              {!pwOk && <p className="text-xs text-red-500">Minimaal 8 tekens ({newPw.length}/8)</p>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Hoofdpagina ───────────────────────────────────────────────────────────────

export default function GebruikersPage() {
  const qc = useQueryClient();
  const { data: users = [], isLoading } = useQuery({ queryKey: ["admin-users"], queryFn: fetchUsers });

  const [showForm, setShowForm] = useState(false);
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole]         = useState<"ADMIN" | "MGM" | "VIEWER">("VIEWER");
  const [databases, setDatabases] = useState<DbOption[]>([]);

  const pwOk     = password.length === 0 || password.length >= 12;
  const canSubmit = !!email && password.length >= 12 && databases.length > 0 && !!role;

  const toggleDb = (db: DbOption) =>
    setDatabases(prev => prev.includes(db) ? prev.filter(d => d !== db) : [...prev, db]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role, databases }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Aanmaken mislukt");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Gebruiker aangemaakt");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setShowForm(false);
      setEmail(""); setPassword(""); setDatabases([]);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Verwijderen mislukt");
    },
    onSuccess: () => {
      toast.success("Gebruiker verwijderd");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gebruikersbeheer</h1>
          <p className="text-muted-foreground text-sm">Beheer toegang en databaserechten</p>
        </div>
        <Button onClick={() => setShowForm(v => !v)} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="h-4 w-4 mr-1" />
          Gebruiker toevoegen
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nieuwe gebruiker</CardTitle>
            <CardDescription>Wachtwoord minimaal 12 tekens. Gebruiker moet daarna 2FA instellen.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>E-mailadres</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Wachtwoord (tijdelijk)</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={!pwOk ? "border-red-400 focus-visible:ring-red-400" : ""}
                />
                {!pwOk && <p className="text-xs text-red-500">Minimaal 12 tekens ({password.length}/12)</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Rol</Label>
              <div className="flex gap-2">
                {(["VIEWER", "MGM", "ADMIN"] as const).map(r => (
                  <button
                    key={r} type="button"
                    onClick={() => setRole(r)}
                    className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${role === r ? "bg-blue-600 text-white border-blue-600" : "border-border hover:border-blue-400"}`}
                  >
                    {r === "ADMIN" ? "Beheerder" : r === "MGM" ? "Management" : "Gebruiker"}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Database-toegang</Label>
              <div className="flex gap-2 flex-wrap">
                {DB_OPTIONS.map(db => (
                  <button
                    key={db} type="button"
                    onClick={() => toggleDb(db)}
                    className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${databases.includes(db) ? "bg-blue-600 text-white border-blue-600" : "border-border hover:border-blue-400"}`}
                  >
                    {DB_LABEL[db]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !canSubmit}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Aanmaken
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>Annuleren</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : users.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">Nog geen gebruikers</CardContent>
          </Card>
        ) : (
          users.map(user => (
            <UserCard key={user.id} user={user} onDelete={id => deleteMutation.mutate(id)} />
          ))
        )}
      </div>
    </div>
  );
}
