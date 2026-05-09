import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PinInput } from "@/components/pin-input";
import { BmmLogo } from "@/components/bmm-logo";
import { ArrowLeft, Phone, ShieldCheck, Lock } from "lucide-react";
import { toast } from "sonner";

type Step = "phone" | "otp";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function MemberLogin() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [devCode, setDevCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/member/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to send code"); return; }
      setDevCode(data.devCode ?? "");
      setStep("otp");
      toast.success("Verification code sent");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (code: string) => {
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/member/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ phone: phone.trim(), code }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Incorrect code"); setOtp(""); return; }
      navigate("/my-account/portal");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#f4f6fb]">
      {/* Navy top banner */}
      <div className="bg-[#0f2557] px-4 pt-12 pb-16 flex flex-col items-center text-center">
        <BmmLogo size="lg" variant="badge" />
        <h1 className="text-white font-black text-xl tracking-tight mt-4 leading-tight">
          Bash M. Money And Financial<br />Services Ltd
        </h1>
        <p className="text-white/50 text-xs mt-1 uppercase tracking-widest font-medium">Member Portal</p>
      </div>

      <div className="flex-1 px-4 -mt-8 flex flex-col max-w-sm mx-auto w-full">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">

          {step === "phone" ? (
            <>
              <div className="px-6 pt-7 pb-5 text-center border-b border-gray-50">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-[#0f2557]/5 mb-3">
                  <Phone className="w-5 h-5 text-[#0f2557]" />
                </div>
                <p className="font-bold text-[#0f2557] text-base">Sign in to your account</p>
                <p className="text-xs text-muted-foreground mt-0.5">Enter your registered phone number</p>
              </div>
              <div className="px-6 py-6">
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Phone Number</label>
                    <Input
                      type="tel"
                      placeholder="+256 700 000000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={isLoading}
                      autoFocus
                      className="text-center rounded-xl border-[#0f2557]/15 focus-visible:ring-[#0f2557] h-11"
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-destructive bg-destructive/8 px-3 py-2.5 rounded-xl text-center font-medium">{error}</p>
                  )}
                  <Button
                    type="submit"
                    className="w-full h-11 rounded-xl bg-[#0f2557] hover:bg-[#1a3570] text-white font-semibold"
                    disabled={isLoading || !phone.trim()}
                  >
                    {isLoading ? "Sending…" : "Send Verification Code"}
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <>
              <div className="px-6 pt-7 pb-5 text-center border-b border-gray-50 relative">
                <button
                  onClick={() => { setStep("phone"); setOtp(""); setError(""); setDevCode(""); }}
                  className="absolute left-4 top-5 text-muted-foreground hover:text-[#0f2557] transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-[#0f2557]/5 mb-3">
                  <Lock className="w-5 h-5 text-[#0f2557]" />
                </div>
                <p className="font-bold text-[#0f2557] text-base">Enter verification code</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sent to <span className="font-semibold text-[#0f2557]">{phone}</span>
                </p>
              </div>
              <div className="px-6 py-6 space-y-4">
                {devCode && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                    <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider mb-1.5">
                      Test mode — your code
                    </p>
                    <p className="text-3xl font-black tracking-[0.3em] text-amber-700">{devCode}</p>
                  </div>
                )}

                <PinInput
                  length={6}
                  value={otp}
                  onChange={setOtp}
                  onComplete={handleVerifyOtp}
                  disabled={isLoading}
                  autoFocus
                />

                {error && (
                  <p className="text-sm text-destructive bg-destructive/8 px-3 py-2.5 rounded-xl text-center font-medium">{error}</p>
                )}

                <Button
                  className="w-full h-11 rounded-xl bg-[#0f2557] hover:bg-[#1a3570] text-white font-semibold"
                  disabled={isLoading || otp.length < 6}
                  onClick={() => handleVerifyOtp(otp)}
                >
                  {isLoading ? "Verifying…" : "Verify & Sign In"}
                </Button>

                <button
                  type="button"
                  onClick={handleRequestOtp as any}
                  className="w-full text-sm text-[#c9a144] hover:text-[#0f2557] font-semibold transition-colors"
                  disabled={isLoading}
                >
                  Resend code
                </button>
              </div>
            </>
          )}
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
