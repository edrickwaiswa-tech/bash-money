import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PinInput } from "@/components/pin-input";
import { ArrowLeft, Phone, ShieldCheck } from "lucide-react";
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
      if (!res.ok) {
        setError(data.error ?? "Failed to send code");
        return;
      }
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
      if (!res.ok) {
        setError(data.error ?? "Incorrect code");
        setOtp("");
        return;
      }
      navigate("/my-account/portal");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-gray-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm space-y-6">

        <div className="flex flex-col items-center gap-3 text-center">
          <div className="bg-primary text-white p-3 rounded-2xl shadow-lg">
            <span className="text-white font-black text-xl tracking-tight">BM</span>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Bash M. Money And Financial Services Ltd</h1>
            <p className="text-sm text-muted-foreground mt-1">Member portal</p>
          </div>
        </div>

        <Card className="shadow-md border-0">
          {step === "phone" ? (
            <>
              <CardHeader className="pb-2 pt-6 px-6 text-center">
                <div className="flex justify-center mb-2">
                  <div className="bg-primary/10 text-primary p-2.5 rounded-xl">
                    <Phone className="w-5 h-5" />
                  </div>
                </div>
                <p className="font-semibold text-base">Sign in to your account</p>
                <p className="text-xs text-muted-foreground">Enter your registered phone number</p>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground font-medium">Phone number</label>
                    <Input
                      type="tel"
                      placeholder="+256 700 000000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={isLoading}
                      autoFocus
                      className="text-center"
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md text-center">
                      {error}
                    </p>
                  )}
                  <Button type="submit" className="w-full" disabled={isLoading || !phone.trim()}>
                    {isLoading ? "Sending..." : "Send verification code"}
                  </Button>
                </form>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="pb-2 pt-6 px-6 text-center">
                <button
                  onClick={() => { setStep("phone"); setOtp(""); setError(""); setDevCode(""); }}
                  className="absolute left-4 top-4 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <p className="font-semibold text-base">Enter verification code</p>
                <p className="text-xs text-muted-foreground">
                  Sent to <span className="font-medium text-foreground">{phone}</span>
                </p>
              </CardHeader>
              <CardContent className="px-6 pb-6 space-y-4">
                {devCode && (
                  <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium uppercase tracking-wider mb-1">
                      Test mode — your code
                    </p>
                    <p className="text-2xl font-black tracking-[0.25em] text-amber-800 dark:text-amber-300">
                      {devCode}
                    </p>
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
                  <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md text-center">
                    {error}
                  </p>
                )}

                <Button
                  className="w-full"
                  disabled={isLoading || otp.length < 6}
                  onClick={() => handleVerifyOtp(otp)}
                >
                  {isLoading ? "Verifying..." : "Verify & Sign in"}
                </Button>

                <button
                  type="button"
                  onClick={handleRequestOtp as any}
                  className="w-full text-sm text-primary hover:underline"
                  disabled={isLoading}
                >
                  Resend code
                </button>
              </CardContent>
            </>
          )}
        </Card>

        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Bash M. Money And Financial Services Ltd — Secured with encrypted sessions</span>
        </div>
      </div>
    </div>
  );
}
