"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Loader2, ShieldCheck, TrendingUp, Euro, BarChart2,
  ArrowUpRight, Lock, Eye, EyeOff,
} from "lucide-react";

type Step = "credentials" | "totp";

const FLOAT_CARDS = [
  {
    icon: Euro,
    label: "Totale omzet",
    value: "€ 4.2M",
    sub: "+12% dit kwartaal",
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.12)",
    delay: "0s",
    top: "14%",
    left: "8%",
  },
  {
    icon: TrendingUp,
    label: "Gemiddelde marge",
    value: "21.4%",
    sub: "↑ 3.1% vs vorig jaar",
    color: "#10b981",
    bg: "rgba(16,185,129,0.12)",
    delay: "1.2s",
    top: "42%",
    left: "55%",
  },
  {
    icon: BarChart2,
    label: "Actieve projecten",
    value: "47",
    sub: "In 4 divisies",
    color: "#a78bfa",
    bg: "rgba(167,139,250,0.12)",
    delay: "0.6s",
    top: "66%",
    left: "12%",
  },
  {
    icon: ArrowUpRight,
    label: "Betaald",
    value: "93.7%",
    sub: "Van openstaande termijnen",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
    delay: "1.8s",
    top: "28%",
    left: "52%",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("credentials");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

      if (data.requiresTotp) {
        setStep("totp");
        return;
      }

      // Direct login (no 2FA configured)
      router.push("/");
      router.refresh();
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
    <div className="min-h-screen flex bg-[#070d1a]">
      {/* ── Left panel ── */}
      <div className="hidden lg:flex relative flex-1 flex-col justify-between p-12 overflow-hidden"
        style={{ background: "linear-gradient(135deg, #070d1a 0%, #0d1e3a 60%, #0a1628 100%)" }}
      >
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(#60a5fa 1px, transparent 1px), linear-gradient(90deg, #60a5fa 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Glow blobs */}
        <div className="absolute top-1/4 left-1/3 w-80 h-80 rounded-full blur-[120px] opacity-20"
          style={{ background: "radial-gradient(circle, #3b82f6, transparent)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full blur-[100px] opacity-15"
          style={{ background: "radial-gradient(circle, #a78bfa, transparent)" }} />

        {/* Floating metric cards */}
        {FLOAT_CARDS.map((card) => (
          <FloatCard key={card.label} {...card} />
        ))}

        {/* Logo top-left */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl shadow-lg"
            style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)", boxShadow: "0 0 24px rgba(59,130,246,0.4)" }}
          >
            <span className="text-white font-black text-lg">E</span>
          </div>
          <div>
            <p className="text-white font-bold text-base leading-none">Elmar Dashboard</p>
            <p className="text-blue-400/60 text-xs leading-none mt-0.5">Syntess Atrium BI</p>
          </div>
        </div>

        {/* Bottom copy */}
        <div className="relative z-10 space-y-3 max-w-xs">
          <h2 className="text-4xl font-black text-white leading-tight tracking-tight">
            Financieel<br />
            <span style={{ background: "linear-gradient(90deg, #60a5fa, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              overzicht
            </span><br />
            op één plek
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Aanneemsom, facturatie, kosten en marges — per project, per divisie, realtime.
          </p>
          <div className="flex items-center gap-2 text-slate-500 text-xs pt-1">
            <ShieldCheck className="h-3.5 w-3.5 text-green-500 shrink-0" />
            <span>Beveiligd met 2-staps verificatie · e-mail allowlist</span>
          </div>
        </div>

        <p className="relative z-10 text-slate-700 text-xs">© {new Date().getFullYear()} Elmar</p>
      </div>

      {/* ── Right panel ── */}
      <div className="flex w-full lg:w-[480px] shrink-0 items-center justify-center p-8 bg-white dark:bg-[#0b1120]">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600">
              <span className="text-white font-black">E</span>
            </div>
            <span className="font-bold text-lg text-foreground">Elmar Dashboard</span>
          </div>

          {step === "credentials" ? (
            <>
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-foreground tracking-tight">Welkom terug</h1>
                <p className="text-muted-foreground text-sm">Log in op uw financieel dashboard</p>
              </div>

              <form onSubmit={handleCredentials} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium">E-mailadres</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="naam@elmar.nl"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 focus:border-blue-500 focus:ring-blue-500/20 transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm font-medium">Wachtwoord</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-11 pr-10 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 focus:border-blue-500 focus:ring-blue-500/20 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-lg font-semibold text-sm text-white transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ background: loading ? "#2563eb99" : "linear-gradient(135deg, #2563eb, #1d4ed8)", boxShadow: "0 4px 20px rgba(37,99,235,0.35)" }}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  Inloggen
                </button>
              </form>

              {/* 2FA notice */}
              <div className="flex items-start gap-2.5 rounded-lg border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/3 p-3.5">
                <ShieldCheck className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Dit systeem ondersteunt 2-staps verificatie via een authenticator-app. U kunt dit activeren via uw profiel.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-9 w-9 rounded-full flex items-center justify-center" style={{ background: "rgba(16,185,129,0.1)" }}>
                    <ShieldCheck className="h-5 w-5 text-green-500" />
                  </div>
                </div>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">2-staps verificatie</h1>
                <p className="text-muted-foreground text-sm">
                  Voer de 6-cijferige code in van uw authenticator-app
                </p>
              </div>

              <form onSubmit={handleTotp} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="totp" className="text-sm font-medium">Verificatiecode</Label>
                  <Input
                    id="totp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000 000"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                    className="h-14 tracking-[0.4em] text-center text-xl font-mono bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10"
                    required
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || totpCode.length !== 6}
                  className="w-full h-11 rounded-lg font-semibold text-sm text-white transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #059669, #047857)", boxShadow: "0 4px 20px rgba(5,150,105,0.3)" }}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Bevestigen
                </button>
                <button
                  type="button"
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                  onClick={() => { setStep("credentials"); setTotpCode(""); }}
                >
                  ← Terug naar inloggen
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}

function FloatCard({
  icon: Icon, label, value, sub, color, bg, delay, top, left,
}: {
  icon: React.ElementType; label: string; value: string; sub: string;
  color: string; bg: string; delay: string; top: string; left: string;
}) {
  return (
    <div
      className="absolute z-10 rounded-2xl p-4 min-w-[180px] select-none"
      style={{
        top, left,
        background: "rgba(10,22,45,0.7)",
        backdropFilter: "blur(16px)",
        border: `1px solid ${color}30`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 ${color}20`,
        animation: `float 4s ease-in-out ${delay} infinite`,
      }}
    >
      <div className="flex items-center gap-2 mb-2.5">
        <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: bg }}>
          <Icon className="h-3.5 w-3.5" style={{ color }} />
        </div>
        <span className="text-slate-400 text-xs font-medium">{label}</span>
      </div>
      <p className="text-white text-xl font-bold leading-none mb-1">{value}</p>
      <p className="text-xs" style={{ color: `${color}99` }}>{sub}</p>
    </div>
  );
}
