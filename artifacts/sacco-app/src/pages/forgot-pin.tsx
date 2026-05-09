import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PinInput } from "@/components/pin-input";
import { BmmLogo } from "@/components/bmm-logo";
import { ArrowLeft, Phone, KeyRound, CheckCircle, AlertCircle, Info } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Step = "phone" | "code" | "new-pin" | "success";

export function ForgotPin() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // ── Step 1: Request OTP ─────────────────────────────────────────────────
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/forgot-pin/request-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to send code");
        return;
      }
      setDevCode(data.devCode ?? null);
      setStep("code");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2: Verify OTP ──────────────────────────────────────────────────
  const handleVerifyCode = async (enteredCode?: string) => {
    const codeToCheck = enteredCode ?? code;
    if (codeToCheck.length < 6) return;
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/forgot-pin/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ phone, code: codeToCheck }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Verification failed");
        setCode("");
        return;
      }
      setResetToken(data.resetToken);
      setStep("new-pin");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 3: Set new PIN ──────────────────────────────────────────────────
  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length < 4) { setError("Enter a 4-digit PIN"); return; }
    if (newPin !== confirmPin) { setError("PINs do not match"); return; }
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/forgot-pin/reset-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ resetToken, pin: newPin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to reset PIN");
        return;
      }
      setStep("success");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-gray-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 text-center">
          <BmmLogo size="lg" variant="badge" />
          <h1 className="text-xl font-black tracking-widest uppercase text-[#0f2557] leading-snug">
            Bash M. Money Financial Services Ltd
          </h1>
        </div>

        <Card className="shadow-md border-0">
          {/* ── Step 1: Phone ── */}
          {step === "phone" && (
            <>
              <CardHeader className="pb-2 pt-6 px-6">
                <div className="flex items-center gap-2 mb-1">
                  <Phone className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-base">Forgot PIN</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter your registered phone number. Bash M. Money will send a verification code.
                </p>
              </CardHeader>
              <CardContent className="px-6 pt-2 pb-6">
                <form onSubmit={handleRequestCode} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Phone number</label>
                    <Input
                      type="tel"
                      placeholder="+256 700 000000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={isLoading || !phone}>
                    {isLoading ? "Checking..." : "Send verification code"}
                  </Button>

                  <div className="text-center">
                    <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                      <ArrowLeft className="w-3 h-3" /> Back to sign in
                    </Link>
                  </div>
                </form>
              </CardContent>
            </>
          )}

          {/* ── Step 2: Enter OTP ── */}
          {step === "code" && (
            <>
              <CardHeader className="pb-2 pt-6 px-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <KeyRound className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-base">Enter verification code</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  A 6-digit code was sent to <strong>{phone}</strong>
                </p>
              </CardHeader>
              <CardContent className="px-6 pt-3 pb-6 space-y-4">
                {/* Dev mode banner */}
                {devCode && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2.5 text-sm">
                    <Info className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-xs uppercase tracking-wide mb-0.5">Test mode — SMS simulated</p>
                      <p className="font-mono text-lg font-bold tracking-widest text-amber-900">{devCode}</p>
                      <p className="text-xs mt-0.5">This code is also printed in the server console.</p>
                    </div>
                  </div>
                )}

                <PinInput
                  length={6}
                  value={code}
                  onChange={setCode}
                  onComplete={handleVerifyCode}
                  disabled={isLoading}
                  autoFocus
                />

                {error && (
                  <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={() => handleVerifyCode()}
                  disabled={isLoading || code.length < 6}
                >
                  {isLoading ? "Verifying..." : "Verify code"}
                </Button>

                <div className="flex justify-between text-sm">
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => { setStep("phone"); setCode(""); setError(""); setDevCode(null); }}
                  >
                    ← Change number
                  </button>
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => { setStep("phone"); setCode(""); setError(""); setDevCode(null); }}
                  >
                    Resend code
                  </button>
                </div>
              </CardContent>
            </>
          )}

          {/* ── Step 3: New PIN ── */}
          {step === "new-pin" && (
            <>
              <CardHeader className="pb-2 pt-6 px-6 text-center">
                <span className="font-semibold text-base">Create new PIN</span>
                <p className="text-xs text-muted-foreground mt-1">Choose a 4-digit PIN for Bash M. Money</p>
              </CardHeader>
              <CardContent className="px-6 pt-3 pb-6">
                <form onSubmit={handleResetPin} className="space-y-5">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-center">New PIN</p>
                    <PinInput
                      length={4}
                      value={newPin}
                      onChange={setNewPin}
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-center">Confirm PIN</p>
                    <PinInput
                      length={4}
                      value={confirmPin}
                      onChange={setConfirmPin}
                      onComplete={() => { if (newPin.length === 4) handleResetPin(new Event("submit") as any); }}
                      disabled={isLoading}
                    />
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading || newPin.length < 4 || confirmPin.length < 4}
                  >
                    {isLoading ? "Saving..." : "Set new PIN"}
                  </Button>
                </form>
              </CardContent>
            </>
          )}

          {/* ── Step 4: Success ── */}
          {step === "success" && (
            <CardContent className="px-6 py-10 text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="w-14 h-14 text-primary" />
              </div>
              <h2 className="text-lg font-bold">PIN updated!</h2>
              <p className="text-sm text-muted-foreground">
                Your Bash M. Money PIN has been changed successfully. You can now sign in with your new PIN.
              </p>
              <Button className="w-full" onClick={() => navigate("/login")}>
                Go to sign in
              </Button>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
