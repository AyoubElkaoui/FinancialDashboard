"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Shield, KeyRound } from "lucide-react";

const DB_OPTIONS = ["SERVICES", "MAINTENANCE", "INTERNATIONAL", "KEYSER"] as const;
type DbOption = (typeof DB_OPTIONS)[number];

interface User {
  id: string;
  email: string;
  role: "ADMIN" | "VIEWER";
  totpEnabled: boolean;
  databases: { database: DbOption }[];
  createdAt: string;
}

async function fetchUsers(): Promise<User[]> {
  const res = await fetch("/api/admin/users");
  if (!res.ok) throw new Error("Kon gebruikers niet laden");
  return res.json();
}

export default function GebruikersPage() {
  const qc = useQueryClient();
  const { data: users = [], isLoading } = useQuery({ queryKey: ["admin-users"], queryFn: fetchUsers });

  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "VIEWER">("VIEWER");
  const [databases, setDatabases] = useState<DbOption[]>([]);

  const toggleDb = (db: DbOption) =>
    setDatabases((prev) => (prev.includes(db) ? prev.filter((d) => d !== db) : [...prev, db]));

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

  const dbLabel: Record<DbOption, string> = {
    SERVICES: "Services",
    MAINTENANCE: "Maintenance",
    INTERNATIONAL: "International",
    KEYSER: "Keyser",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gebruikersbeheer</h1>
          <p className="text-muted-foreground text-sm">Beheer toegang en databaserechten</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} className="bg-blue-600 hover:bg-blue-700 text-white">
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
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Wachtwoord (tijdelijk)</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Rol</Label>
              <div className="flex gap-2">
                {(["VIEWER", "ADMIN"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${role === r ? "bg-blue-600 text-white border-blue-600" : "border-border hover:border-blue-400"}`}
                  >
                    {r === "ADMIN" ? "Beheerder" : "Gebruiker"}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Database-toegang</Label>
              <div className="flex gap-2 flex-wrap">
                {DB_OPTIONS.map((db) => (
                  <button
                    key={db}
                    type="button"
                    onClick={() => toggleDb(db)}
                    className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${databases.includes(db) ? "bg-blue-600 text-white border-blue-600" : "border-border hover:border-blue-400"}`}
                  >
                    {dbLabel[db]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !email || !password || databases.length === 0}
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
            <CardContent className="py-8 text-center text-muted-foreground">
              Nog geen gebruikers
            </CardContent>
          </Card>
        ) : (
          users.map((user) => (
            <Card key={user.id}>
              <CardContent className="py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <span className="text-blue-600 text-xs font-bold">
                      {user.email[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{user.email}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <Badge variant={user.role === "ADMIN" ? "default" : "secondary"} className="text-xs">
                        {user.role === "ADMIN" ? (
                          <><Shield className="h-2.5 w-2.5 mr-1" />Beheerder</>
                        ) : "Gebruiker"}
                      </Badge>
                      {user.databases.map((d) => (
                        <Badge key={d.database} variant="outline" className="text-xs">
                          {dbLabel[d.database]}
                        </Badge>
                      ))}
                      {!user.totpEnabled && (
                        <Badge variant="destructive" className="text-xs">2FA niet ingesteld</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-blue-600"
                    title="Wachtwoord resetten"
                    onClick={() => {
                      const pw = prompt(`Nieuw wachtwoord voor ${user.email} (min. 8 tekens):`);
                      if (!pw || pw.length < 8) return;
                      fetch(`/api/admin/users/${user.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ newPassword: pw }),
                      }).then(r => r.ok
                        ? toast.success(`Wachtwoord van ${user.email} gewijzigd`)
                        : toast.error("Wachtwoord wijzigen mislukt")
                      );
                    }}
                  >
                    <KeyRound className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    title="Gebruiker verwijderen"
                    onClick={() => {
                      if (confirm(`Gebruiker ${user.email} verwijderen?`)) {
                        deleteMutation.mutate(user.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
