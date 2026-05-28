"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import Image from "next/image";

export default function TotpSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [qr, setQr] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [code, setCode] = useState("");

  useEffect(() => {
    fetch("/api/auth/setup-totp")
      .then((r) => r.json())
      .then((d) => {
        setQr(d.qr);
        setSecret(d.secret);
        setLoading(false);
      })
      .catch(() => toast.error("Kon QR code niet laden"));
  }, []);

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfirming(true);
    try {
      const res = await fetch("/api/auth/setup-totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("2FA ingesteld — log opnieuw in met uw authenticator-code");
      router.push("/login");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bevestiging mislukt");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-5 w-5 text-green-500" />
            <CardTitle className="text-xl font-bold">2FA instellen</CardTitle>
          </div>
          <CardDescription>
            Scan de QR code met uw authenticator-app (bijv. Google Authenticator of Authy), voer daarna de code in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {qr && (
                <div className="flex flex-col items-center gap-3">
                  <Image src={qr} alt="TOTP QR code" width={200} height={200} className="rounded-lg border" />
                  <p className="text-xs text-muted-foreground break-all text-center">
                    Handmatige sleutel: <code className="font-mono">{secret}</code>
                  </p>
                </div>
              )}
              <form onSubmit={confirm} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="code">Verificatiecode</Label>
                  <Input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    placeholder="000000"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    className="tracking-widest text-center text-lg"
                    required
                    autoFocus
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={confirming || code.length !== 6}
                >
                  {confirming && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  2FA activeren
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
