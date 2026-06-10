import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PinInput } from "@/components/pin-input";
import { BmmLogo } from "@/components/bmm-logo";
import { ArrowLeft, Phone, ShieldCheck, Lock } from "lucide-react";
import { toast } from "sonner";

type Step = "phone" | "otp";

const BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") || import.meta.env.BASE_URL.replace(/\/$/, "");

export function MemberLogin() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const fireNotification = async (code: string) => {
    window.alert(`BMMFS Security\n\nDevelopment Fallback: Your login code is ${code}\n\nEnter this code on the next screen.`);
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      new Notification("BMMFS — Login Code", { body: `Development Fallback: Your login code is ${code}` });
    } else if (Notification.permission !== "denied") {
      const perm = await Notification.requestPermission();
      if (perm === "granted") new Notification("BMMFS — Login Code", { body: `Development Fallback: Your login code is ${code}` });
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/member/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to send code"); return; }
      if (data.devFallback && data.notificationCode) {
        await fireNotification(data.notificationCode as string);
        toast.success("Check your notification — code delivered");
      } else {
        toast.success("Verification code sent via SMS");
      }
      setStep("otp");
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
        credentials: "include",
        body: JSON.stringify({ phone: phone.trim(), code }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Incorrect code"); setOtp(""); return; }
      if (data.requiresPasswordReset) {
        navigate("/my-account/force-set-pin");
      } else {
        navigate("/my-account/portal");
      }
    } catch {
      setError("Network error. Please try again.");
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

          {step === "phone" ? (
            <>
              <div className="px-6 pt-7 pb-5 text-center border-b border-gray-50">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-[#B03060]/8 mb-3">
                  <Phone className="w-5 h-5 text-[#B03060]" />
                </div>
                <p className="font-bold text-[#1A1A1A] text-base">Sign in to your account</p>
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
                      className="text-center rounded-xl border-[#B03060]/15 focus-visible:ring-[#B03060] h-11"
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-destructive bg-destructive/8 px-3 py-2.5 rounded-xl text-center font-medium">{error}</p>
                  )}
                  <Button
                    type="submit"
                    className="w-full h-11 rounded-xl text-white font-semibold"
                    style={{ background: "linear-gradient(135deg, #B03060 0%, #7B1535 100%)" }}
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
                  onClick={() => { setStep("phone"); setOtp(""); setError(""); }}
                  className="absolute left-4 top-5 text-muted-foreground hover:text-[#B03060] transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-[#B03060]/8 mb-3">
                  <Lock className="w-5 h-5 text-[#B03060]" />
                </div>
                <p className="font-bold text-[#1A1A1A] text-base">Enter verification code</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sent to <span className="font-semibold text-[#B03060]">{phone}</span>
                </p>
              </div>
              <div className="px-6 py-6 space-y-4">
                <div className="bg-[#B03060]/5 border border-[#B03060]/10 rounded-2xl p-3 text-center">
                  <p className="text-xs text-[#7B1535] leading-relaxed">
                    A verification code has been sent to your phone via SMS. Enter it below.
                  </p>
                </div>

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
                  className="w-full h-11 rounded-xl text-white font-semibold"
                  style={{ background: "linear-gradient(135deg, #B03060 0%, #7B1535 100%)" }}
                  disabled={isLoading || otp.length < 6}
                  onClick={() => handleVerifyOtp(otp)}
                >
                  {isLoading ? "Verifying…" : "Verify & Sign In"}
                </Button>

                <button
                  type="button"
                  onClick={handleRequestOtp as any}
                  className="w-full text-sm text-[#B03060] hover:text-[#7B1535] font-semibold transition-colors"
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
          <ShieldCheck className="w-3.5 h-3.5 text-[#B03060]" />
          <span>Bash M. Money And Financial Services Ltd — Secured &amp; Encrypted</span>
        </div>
      </div>
    </div>
  );
}
