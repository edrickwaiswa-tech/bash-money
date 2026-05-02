import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PinInput } from "@/components/pin-input";
import { ShieldCheck } from "lucide-react";

export function Login() {
  const { login } = useAuth();
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("admin");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handlePinComplete = async (completedPin: string) => {
    if (isLoading) return;
    setError("");
    setIsLoading(true);
    try {
      await login(username, completedPin);
      navigate("/");
    } catch (err: any) {
      setError(err.message ?? "Incorrect PIN");
      setPin("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length === 4) await handlePinComplete(pin);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-gray-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="bg-primary text-white p-3 rounded-2xl shadow-lg">
            <span className="text-white font-black text-xl tracking-tight">NJF</span>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">NJF Ledger</h1>
            <p className="text-sm text-muted-foreground mt-1">Admin portal</p>
          </div>
        </div>

        {/* Card */}
        <Card className="shadow-md border-0">
          <CardHeader className="pb-2 pt-6 px-6 text-center">
            <p className="font-semibold text-base">Enter your PIN</p>
            <p className="text-xs text-muted-foreground">4-digit admin PIN</p>
          </CardHeader>
          <CardContent className="px-6 pt-3 pb-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username (hidden / pre-filled for single-admin use) */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Username</label>
                <Input
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  className="text-center"
                />
              </div>

              {/* PIN boxes */}
              <PinInput
                length={4}
                value={pin}
                onChange={setPin}
                onComplete={handlePinComplete}
                disabled={isLoading}
                autoFocus
              />

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md text-center">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || pin.length < 4}
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>

              <div className="text-center">
                <Link
                  href="/forgot-pin"
                  className="text-sm text-primary hover:underline font-medium"
                >
                  Forgot PIN?
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>NJF Ledger — Secured with encrypted sessions</span>
        </div>
      </div>
    </div>
  );
}
