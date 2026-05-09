import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PinInput } from "@/components/pin-input";
import { BmmLogo } from "@/components/bmm-logo";
import { ShieldCheck, Lock } from "lucide-react";

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
    <div className="min-h-[100dvh] flex flex-col bg-[#f4f6fb]">
      {/* Navy top banner */}
      <div className="bg-[#0f2557] px-4 pt-12 pb-16 flex flex-col items-center text-center">
        <BmmLogo size="lg" variant="badge" />
        <h1 className="text-white font-black text-lg tracking-widest mt-4 leading-snug uppercase">
          Bash M. Money Financial Services Ltd
        </h1>
        <p className="text-white/50 text-xs mt-1 uppercase tracking-widest font-medium">Admin Portal</p>
      </div>

      {/* Card floats over the banner */}
      <div className="flex-1 px-4 -mt-8 flex flex-col max-w-sm mx-auto w-full">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Card header */}
          <div className="px-6 pt-7 pb-5 text-center border-b border-gray-50">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-[#0f2557]/5 mb-3">
              <Lock className="w-5 h-5 text-[#0f2557]" />
            </div>
            <p className="font-bold text-[#0f2557] text-base">Enter your PIN</p>
            <p className="text-xs text-muted-foreground mt-0.5">4-digit admin PIN</p>
          </div>

          <div className="px-6 py-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Username</label>
                <Input
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  className="text-center rounded-xl border-[#0f2557]/15 focus-visible:ring-[#0f2557] h-11"
                />
              </div>

              <PinInput
                length={4}
                value={pin}
                onChange={setPin}
                onComplete={handlePinComplete}
                disabled={isLoading}
                autoFocus
              />

              {error && (
                <p className="text-sm text-destructive bg-destructive/8 px-3 py-2.5 rounded-xl text-center font-medium">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full h-11 rounded-xl bg-[#0f2557] hover:bg-[#1a3570] text-white font-semibold text-sm transition-all"
                disabled={isLoading || pin.length < 4}
              >
                {isLoading ? "Signing in…" : "Sign In"}
              </Button>

              <div className="text-center">
                <Link href="/forgot-pin" className="text-sm text-[#c9a144] hover:text-[#0f2557] font-semibold transition-colors">
                  Forgot PIN?
                </Link>
              </div>
            </form>
          </div>
        </div>

        {/* Trust footer */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground mt-6 mb-8">
          <ShieldCheck className="w-3.5 h-3.5 text-[#c9a144]" />
          <span>Bash M. Money And Financial Services Ltd — Secured &amp; Encrypted</span>
        </div>
      </div>
    </div>
  );
}
