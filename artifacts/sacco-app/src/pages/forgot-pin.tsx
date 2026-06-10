import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PinInput } from "@/components/pin-input";
import { BmmLogo } from "@/components/bmm-logo";
import { ArrowLeft, Phone, KeyRound, CheckCircle, AlertCircle, Info } from "lucide-react";

const BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") || import.meta.env.BASE_URL.replace(/\/$/, "");

type Step = "phone" | "code" | "new-pin" | "success";

/**
 * Normalises a Ugandan (or any) phone number to strict E.164 before sending.
 * Examples:
 *   "0746724455"    → "+256746724455"
 *   "07 467 24455"  → "+256746724455"
 *   "+256746724455" → "+256746724455"
 *   "256746724455"  → "+256746724455"
 */
function normalisePhone(raw: string): string {
  const stripped = raw.replace(/[\s\-().]/g, "");
  // Local Ugandan format: starts with 0 (e.g. 07xxxxxxxx)
  if (/^0\d{9}$/.test(stripped)) {
    return "+256" + stripped.slice(1);
  }
  // International without +
  if (/^256\d{9}$/.test(stripped)) {
    return "+" + stripped;
  }
  // Already has +
  if (stripped.startsWith("+")) return stripped;
  // Fallback: prepend +
  return "+" + stripped;
}

export function ForgotPin() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const formatted = normalisePhone(phone);
      const res = await fetch(`${BASE}/api/auth/forgot-pin/request-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: formatted }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to send code"); return; }
      if (data.devFallback && data.notificationCode) {
        window.alert(`BMMFS Security\n\nTest recovery code: ${data.notificationCode}\n\nEnter this code on the next screen.`);
      }
      setStep("code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (enteredCode?: string) => {
    const codeToCheck = enteredCode ?? code;
    if (codeToCheck.length < 6) return;
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/forgot-pin/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: normalisePhone(phone), code: codeToCheck }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Verification failed"); setCode(""); return; }
      setResetToken(data.resetToken);
      setStep("new-pin");
    } finally {
      setIsLoading(false);
    }
  };

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
        credentials: "include",
        body: JSON.stringify({ resetToken, pin: newPin }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to reset PIN"); return; }
      setStep("success");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#f4f6fb]">
      {/* Burgundy top banner */}
      <div
        className="px-4 pt-12 pb-16 flex flex-col items-center text-center"
        style={{ background: "linear-gradient(135deg, #B03060 0%, #7B1535 100%)" }}
      >
        <BmmLogo size="lg" />
        <h1 className="text-white font-black text-lg tracking-widest mt-4 leading-snug uppercase">
          Bash M. Money Financial Services Ltd
        </h1>
        <p className="text-white/60 text-xs mt-1 uppercase tracking-widest font-medium">Member Portal</p>
      </div>

      <div className="flex-1 px-4 -mt-8 flex flex-col max-w-sm mx-auto w-full">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">

          {/* ── Step 1: Phone ── */}
          {step === "phone" && (
            <>
              <div className="px-6 pt-7 pb-5 text-center border-b border-gray-50">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-[#B03060]/8 mb-3">
                  <Phone className="w-5 h-5 text-[#B03060]" />
                </div>
                <p className="font-bold text-[#1A1A1A] text-base">Forgot PIN</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Enter your registered phone number to receive a verification code via SMS.
                </p>
              </div>
              <div className="px-6 py-6">
                <form onSubmit={handleRequestCode} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Phone Number</label>
                    <Input
                      type="tel"
                      placeholder="0746 724 455 or +256 746 724 455"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      disabled={isLoading}
                      autoFocus
                      className="text-center rounded-xl border-[#B03060]/15 focus-visible:ring-[#B03060] h-11"
                    />
                    <p className="text-[10px] text-muted-foreground text-center">
                      You can enter a local number (07...) — it will be formatted automatically.
                    </p>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-xl">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-11 rounded-xl text-white font-semibold"
                    style={{ background: "linear-gradient(135deg, #B03060 0%, #7B1535 100%)" }}
                    disabled={isLoading || !phone}
                  >
                    {isLoading ? "Checking..." : "Send verification code"}
                  </Button>

                  <div className="text-center">
                    <Link href="/login" className="text-sm text-muted-foreground hover:text-[#B03060] inline-flex items-center gap-1 transition-colors font-medium">
                      <ArrowLeft className="w-3 h-3" /> Back to sign in
                    </Link>
                  </div>
                </form>
              </div>
            </>
          )}

          {/* ── Step 2: Enter OTP ── */}
          {step === "code" && (
            <>
              <div className="px-6 pt-7 pb-5 text-center border-b border-gray-50 relative">
                <button
                  onClick={() => { setStep("phone"); setCode(""); setError(""); }}
                  className="absolute left-4 top-5 text-muted-foreground hover:text-[#B03060] transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-[#B03060]/8 mb-3">
                  <KeyRound className="w-5 h-5 text-[#B03060]" />
                </div>
                <p className="font-bold text-[#1A1A1A] text-base">Enter verification code</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  A 6-digit code was sent via SMS to <span className="font-semibold text-[#B03060]">{normalisePhone(phone)}</span>
                </p>
              </div>
              <div className="px-6 py-6 space-y-4">
                <div className="flex items-start gap-2 bg-[#B03060]/5 border border-[#B03060]/10 text-[#7B1535] rounded-2xl px-3 py-3 text-sm">
                  <Info className="w-4 h-4 mt-0.5 shrink-0 text-[#B03060]" />
                  <p className="text-xs leading-relaxed">Check your SMS messages for a 6-digit code from BMMFS. Enter it below to continue.</p>
                </div>

                <PinInput
                  length={6}
                  value={code}
                  onChange={setCode}
                  onComplete={handleVerifyCode}
                  disabled={isLoading}
                  autoFocus
                />

                {error && (
                  <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-xl">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  className="w-full h-11 rounded-xl text-white font-semibold"
                  style={{ background: "linear-gradient(135deg, #B03060 0%, #7B1535 100%)" }}
                  onClick={() => handleVerifyCode()}
                  disabled={isLoading || code.length < 6}
                >
                  {isLoading ? "Verifying..." : "Verify code"}
                </Button>

                <div className="flex justify-between text-sm">
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-[#1A1A1A] transition-colors font-medium"
                    onClick={() => { setStep("phone"); setCode(""); setError(""); }}
                  >
                    ← Change number
                  </button>
                  <button
                    type="button"
                    className="text-[#B03060] hover:underline font-semibold"
                    onClick={() => { setStep("phone"); setCode(""); setError(""); }}
                  >
                    Resend code
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── Step 3: New PIN ── */}
          {step === "new-pin" && (
            <>
              <div className="px-6 pt-7 pb-5 text-center border-b border-gray-50">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-[#B03060]/8 mb-3">
                  <KeyRound className="w-5 h-5 text-[#B03060]" />
                </div>
                <p className="font-bold text-[#1A1A1A] text-base">Create new PIN</p>
                <p className="text-xs text-muted-foreground mt-0.5">Choose a 4-digit PIN for Bash M. Money</p>
              </div>
              <div className="px-6 py-6">
                <form onSubmit={handleResetPin} className="space-y-5">
                  <div className="space-y-2">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider text-center">New PIN</p>
                    <PinInput
                      length={4}
                      value={newPin}
                      onChange={setNewPin}
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider text-center">Confirm PIN</p>
                    <PinInput
                      length={4}
                      value={confirmPin}
                      onChange={setConfirmPin}
                      onComplete={() => { if (newPin.length === 4) handleResetPin(new Event("submit") as any); }}
                      disabled={isLoading}
                    />
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-xl">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-11 rounded-xl text-white font-semibold"
                    style={{ background: "linear-gradient(135deg, #B03060 0%, #7B1535 100%)" }}
                    disabled={isLoading || newPin.length < 4 || confirmPin.length < 4}
                  >
                    {isLoading ? "Saving..." : "Set new PIN"}
                  </Button>
                </form>
              </div>
            </>
          )}

          {/* ── Step 4: Success ── */}
          {step === "success" && (
            <div className="px-6 py-10 text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-emerald-500" />
                </div>
              </div>
              <h2 className="text-lg font-black text-[#1A1A1A]">PIN Updated!</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your Bash M. Money PIN has been changed successfully. You can now sign in with your new PIN.
              </p>
              <Button
                className="w-full h-11 rounded-xl text-white font-semibold"
                style={{ background: "linear-gradient(135deg, #B03060 0%, #7B1535 100%)" }}
                onClick={() => navigate("/login")}
              >
                Go to sign in
              </Button>
            </div>
          )}
        </div>

        {/* Trust footer */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground mt-6 mb-8">
          <CheckCircle className="w-3.5 h-3.5 text-[#B03060]" />
          <span>Bash M. Money And Financial Services Ltd — Secured &amp; Encrypted</span>
        </div>
      </div>
    </div>
  );
}
