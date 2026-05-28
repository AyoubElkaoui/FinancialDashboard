"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";

type Step = "credentials" | "totp";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("credentials");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Inloggen mislukt");
      if (data.requiresTotpSetup) {
        router.push("/2fa-setup");
        return;
      }
      setStep("totp");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Inloggen mislukt");
    } finally {
      setLoading(false);
    }
  };

  const handleTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: totpCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Verificatie mislukt");
      router.push("/");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verificatie mislukt");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-[420px] shrink-0 flex-col justify-between p-10" style={{ background: "#0f1929" }}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-900/40">
            <span className="text-white font-bold text-sm">E</span>
          </div>
          <div>
            <p className="text-white font-semibold leading-none">Elmar Dashboard</p>
            <p className="text-blue-400/70 text-xs leading-none mt-0.5">Financieel Projectbeheer</p>
          </div>
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-white leading-tight">Inzicht in uw<br />projectfinanciën</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Per project: aanneemsom, facturatie, betalingen, kosten en marges — rechtstreeks uit Syntess Atrium.
          </p>
          <div className="flex items-center gap-2 text-slate-500 text-xs">
            <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
            <span>Beveiligd met 2-staps verificatie</span>
          </div>
        </div>
        <p className="text-slate-600 text-xs">© {new Date().getFullYear()} Elmar</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-sm shadow-xl">
          {step === "credentials" ? (
            <>
              <CardHeader className="space-y-1 pb-6">
                <div className="flex items-center gap-2 mb-4 lg:hidden">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                    <span className="text-white font-bold text-xs">E</span>
                  </div>
                  <span className="font-semibold">Elmar Dashboard</span>
                </div>
                <CardTitle className="text-2xl font-bold">Inloggen</CardTitle>
                <CardDescription>Voer uw e-mailadres en wachtwoord in</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCredentials} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">E-mailadres</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="naam@elmar.nl"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Wachtwoord</Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white h-10"
                    disabled={loading}
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Volgende
                  </Button>
                </form>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="space-y-1 pb-6">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="h-5 w-5 text-green-500" />
                  <CardTitle className="text-2xl font-bold">2-staps verificatie</CardTitle>
                </div>
                <CardDescription>
                  Voer de 6-cijferige code in van uw authenticator-app
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTotp} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="totp">Verificatiecode</Label>
                    <Input
                      id="totp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="000000"
                      maxLength={6}
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                      className="tracking-widest text-center text-lg"
                      required
                      autoFocus
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white h-10"
                    disabled={loading || totpCode.length !== 6}
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Bevestigen
                  </Button>
                  <button
                    type="button"
                    className="w-full text-sm text-muted-foreground hover:text-foreground"
                    onClick={() => { setStep("credentials"); setTotpCode(""); }}
                  >
                    Terug
                  </button>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
