"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authApi, setToken } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Gebruikersnaam is verplicht"),
  password: z.string().min(1, "Wachtwoord is verplicht"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const res = await authApi.login(data.username, data.password);
      setToken(res.token);
      router.push("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Inloggen mislukt";
      toast.error(message);
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
            <Loader2 className="h-5 w-5 text-white hidden" />
            <span className="text-white font-bold text-sm">SR</span>
          </div>
          <div>
            <p className="text-white font-semibold leading-none">Syntess Rapport</p>
            <p className="text-blue-400/70 text-xs leading-none mt-0.5">Business Intelligence</p>
          </div>
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-white leading-tight">Inzicht in<br />uw bedrijfsdata</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Realtime overzicht van omzet, projecten, facturen en werkbonnen — direct gekoppeld aan Syntess Atrium.
          </p>
        </div>
        <p className="text-slate-600 text-xs">© {new Date().getFullYear()} Syntess Rapport</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="space-y-1 pb-6">
          <div className="flex items-center gap-2 mb-4 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <span className="text-white font-bold text-xs">SR</span>
            </div>
            <span className="font-semibold">Syntess Rapport</span>
          </div>
          <CardTitle className="text-2xl font-bold">Inloggen</CardTitle>
          <CardDescription>Voer uw gegevens in om door te gaan</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">Gebruikersnaam</Label>
              <Input
                id="username"
                placeholder="admin"
                autoComplete="username"
                {...register("username")}
              />
              {errors.username && (
                <p className="text-xs text-destructive">{errors.username.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Wachtwoord</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white h-10" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Inloggen
            </Button>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
