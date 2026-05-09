import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PinInput } from "@/components/pin-input";
import { BmmLogo } from "@/components/bmm-logo";
import { ShieldCheck, Lock, Phone, Hash, ArrowLeft, KeyRound } from "lucide-react";
import { toast } from "sonner";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Tab = "admin" | "member";
type MemberMethod = "otp" | "pin";
type OtpStep = "phone" | "code";

export function Login() {
  const { login } = useAuth();
  const [, navigate] = useLocation();

  // ── Tab state ────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>("admin");

  // ── Admin state ──────────────────────────────────────────────────────────
  const [username, setUsername] = useState("admin");
  const [adminPin, setAdminPin] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);

  // ── Member OTP state ─────────────────────────────────────────────────────
  const [memberMethod, setMemberMethod] = useState<MemberMethod>("pin");
  const [otpStep, setOtpStep] = useState<OtpStep>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [devCode, setDevCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");

  // ── Member PIN state ─────────────────────────────────────────────────────
  const [identifier, setIdentifier] = useState("");
  const [memberPin, setMemberPin] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState("");

  // ── Admin handlers ────────────────────────────────────────────────────────
  const handleAdminPinComplete = async (completedPin: string) => {
    if (adminLoading) return;
    setAdminError("");
    setAdminLoading(true);
    try {
      await login(username, completedPin);
      navigate("/");
    } catch (err: any) {
      setAdminError(err.message ?? "Incorrect PIN");
      setAdminPin("");
    } finally {
      setAdminLoading(false);
    }
  };

  // ── Member OTP handlers ───────────────────────────────────────────────────
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setOtpError("");
    setOtpLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/member/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setOtpError(data.error ?? "Failed to send code"); return; }
      setDevCode(data.devCode ?? "");
      setOtpStep("code");
      toast.success("Verification code sent");
    } catch {
      setOtpError("Network error. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async (code: string) => {
    setOtpError("");
    setOtpLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/member/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ phone: phone.trim(), code }),
      });
      const data = await res.json();
      if (!res.ok) { setOtpError(data.error ?? "Incorrect code"); setOtp(""); return; }
      navigate("/my-account/portal");
    } catch {
      setOtpError("Network error. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  // ── Member PIN login handler ──────────────────────────────────────────────
  const handlePinLogin = async (completedPin: string) => {
    if (!identifier.trim()) { setPinError("Enter your account number or phone number"); return; }
    setPinError("");
    setPinLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/member/login-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ identifier: identifier.trim(), pin: completedPin }),
      });
      const data = await res.json();
      if (!res.ok) { setPinError(data.error ?? "Login failed"); setMemberPin(""); return; }
      navigate("/my-account/portal");
    } catch {
      setPinError("Network error. Please try again.");
    } finally {
      setPinLoading(false);
    }
  };

  const resetMemberState = () => {
    setOtpStep("phone"); setPhone(""); setOtp(""); setDevCode(""); setOtpError("");
    setIdentifier(""); setMemberPin(""); setPinError("");
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#f4f6fb]">
      {/* Navy top banner */}
      <div className="bg-[#0f2557] px-4 pt-12 pb-16 flex flex-col items-center text-center">
        <BmmLogo size="lg" variant="badge" />
        <h1 className="text-white font-black text-lg tracking-widest mt-4 leading-snug uppercase">
          Bash M. Money Financial Services Ltd
        </h1>
        <p className="text-white/50 text-xs mt-1 uppercase tracking-widest font-medium">Secure Portal</p>
      </div>

      <div className="flex-1 px-4 -mt-8 flex flex-col max-w-sm mx-auto w-full">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">

          {/* Admin / Member tab toggle */}
          <div className="flex border-b border-gray-100">
            {(["admin", "member"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); resetMemberState(); setAdminPin(""); setAdminError(""); }}
                className={`flex-1 py-3.5 text-sm font-bold tracking-wide transition-all ${
                  tab === t
                    ? "text-[#0f2557] border-b-2 border-[#c9a144] bg-[#0f2557]/3"
                    : "text-muted-foreground hover:text-[#0f2557]"
                }`}
              >
                {t === "admin" ? "Admin Login" : "Member Login"}
              </button>
            ))}
          </div>

          {/* ── ADMIN TAB ── */}
          {tab === "admin" && (
            <div>
              <div className="px-6 pt-6 pb-4 text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-[#0f2557]/5 mb-3">
                  <Lock className="w-5 h-5 text-[#0f2557]" />
                </div>
                <p className="font-bold text-[#0f2557] text-base">Enter your PIN</p>
                <p className="text-xs text-muted-foreground mt-0.5">4-digit admin PIN</p>
              </div>

              <div className="px-6 pb-6">
                <form
                  onSubmit={(e) => { e.preventDefault(); if (adminPin.length === 4) handleAdminPinComplete(adminPin); }}
                  className="space-y-5"
                >
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Username</label>
                    <Input
                      type="text"
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={adminLoading}
                      className="text-center rounded-xl border-[#0f2557]/15 focus-visible:ring-[#0f2557] h-11"
                    />
                  </div>

                  <PinInput
                    length={4}
                    value={adminPin}
                    onChange={(v) => { setAdminPin(v); setAdminError(""); }}
                    onComplete={handleAdminPinComplete}
                    disabled={adminLoading}
                    autoFocus
                    error={!!adminError}
                  />

                  {adminError && (
                    <p className="text-sm text-destructive bg-destructive/8 px-3 py-2.5 rounded-xl text-center font-medium">{adminError}</p>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-11 rounded-xl bg-[#0f2557] hover:bg-[#1a3570] text-white font-semibold"
                    disabled={adminLoading || adminPin.length < 4}
                  >
                    {adminLoading ? "Signing in…" : "Sign In"}
                  </Button>

                  <div className="text-center">
                    <Link href="/forgot-pin" className="text-sm text-[#c9a144] hover:text-[#0f2557] font-semibold transition-colors">
                      Forgot PIN?
                    </Link>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ── MEMBER TAB ── */}
          {tab === "member" && (
            <div>
              {/* ── PRIMARY: Phone + PIN ── */}
              {memberMethod === "pin" && (
                <div>
                  <div className="px-6 pt-6 pb-3 text-center">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-[#0f2557]/5 mb-3">
                      <KeyRound className="w-5 h-5 text-[#0f2557]" />
                    </div>
                    <p className="font-bold text-[#0f2557] text-base">Member Sign In</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Enter your phone number and 4-digit PIN</p>
                  </div>
                  <div className="px-6 pb-6 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Phone Number</label>
                      <Input
                        type="tel"
                        placeholder="+256 700 000000"
                        value={identifier}
                        onChange={(e) => { setIdentifier(e.target.value); setPinError(""); }}
                        disabled={pinLoading}
                        autoFocus
                        className="text-center rounded-xl border-[#0f2557]/15 focus-visible:ring-[#0f2557] h-11"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">4-Digit PIN</label>
                      <PinInput
                        length={4}
                        value={memberPin}
                        onChange={(v) => { setMemberPin(v); setPinError(""); }}
                        onComplete={handlePinLogin}
                        disabled={pinLoading || !identifier.trim()}
                        error={!!pinError}
                      />
                    </div>

                    {pinError && (
                      <p className="text-sm text-destructive bg-destructive/8 px-3 py-2.5 rounded-xl text-center font-medium">{pinError}</p>
                    )}

                    <Button
                      className="w-full h-11 rounded-xl bg-[#0f2557] hover:bg-[#1a3570] text-white font-semibold"
                      disabled={pinLoading || memberPin.length < 4 || !identifier.trim()}
                      onClick={() => handlePinLogin(memberPin)}
                    >
                      {pinLoading ? "Signing in…" : "Sign In"}
                    </Button>

                    <div className="text-center pt-1 border-t border-gray-50">
                      <p className="text-xs text-muted-foreground mb-1">No PIN set yet?</p>
                      <button
                        className="text-sm text-[#c9a144] hover:text-[#0f2557] font-semibold transition-colors"
                        onClick={() => { setMemberMethod("otp"); resetMemberState(); }}
                      >
                        Sign in with OTP instead →
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── SECONDARY: OTP flow ── */}
              {memberMethod === "otp" && otpStep === "phone" && (
                <div>
                  <div className="px-6 pt-5 pb-3 text-center relative">
                    <button
                      onClick={() => { setMemberMethod("pin"); resetMemberState(); }}
                      className="absolute left-4 top-5 text-muted-foreground hover:text-[#0f2557] transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="inline-flex items-center justify-center w-9 h-9 rounded-2xl bg-[#0f2557]/5 mb-2">
                      <Phone className="w-4 h-4 text-[#0f2557]" />
                    </div>
                    <p className="font-bold text-[#0f2557] text-sm">Sign in with OTP</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Enter your registered phone number</p>
                  </div>
                  <div className="px-6 pb-6">
                    <form onSubmit={handleRequestOtp} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Phone Number</label>
                        <Input
                          type="tel"
                          placeholder="+256 700 000000"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          disabled={otpLoading}
                          autoFocus
                          className="text-center rounded-xl border-[#0f2557]/15 focus-visible:ring-[#0f2557] h-11"
                        />
                      </div>
                      {otpError && <p className="text-sm text-destructive bg-destructive/8 px-3 py-2.5 rounded-xl text-center font-medium">{otpError}</p>}
                      <Button
                        type="submit"
                        className="w-full h-11 rounded-xl bg-[#0f2557] hover:bg-[#1a3570] text-white font-semibold"
                        disabled={otpLoading || !phone.trim()}
                      >
                        {otpLoading ? "Sending…" : "Send Code"}
                      </Button>
                    </form>
                  </div>
                </div>
              )}

              {memberMethod === "otp" && otpStep === "code" && (
                <div>
                  <div className="px-6 pt-5 pb-3 text-center relative">
                    <button
                      onClick={() => { setOtpStep("phone"); setOtp(""); setDevCode(""); setOtpError(""); }}
                      className="absolute left-4 top-5 text-muted-foreground hover:text-[#0f2557] transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="inline-flex items-center justify-center w-9 h-9 rounded-2xl bg-[#0f2557]/5 mb-2">
                      <Lock className="w-4 h-4 text-[#0f2557]" />
                    </div>
                    <p className="font-bold text-[#0f2557] text-sm">Enter verification code</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Sent to <span className="font-semibold text-[#0f2557]">{phone}</span>
                    </p>
                  </div>
                  <div className="px-6 pb-6 space-y-4">
                    {devCode && (
                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-center">
                        <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider mb-1">Test mode — your code</p>
                        <p className="text-2xl font-black tracking-[0.3em] text-amber-700">{devCode}</p>
                      </div>
                    )}
                    <PinInput
                      length={6}
                      value={otp}
                      onChange={setOtp}
                      onComplete={handleVerifyOtp}
                      disabled={otpLoading}
                      autoFocus
                    />
                    {otpError && <p className="text-sm text-destructive bg-destructive/8 px-3 py-2.5 rounded-xl text-center font-medium">{otpError}</p>}
                    <Button
                      className="w-full h-11 rounded-xl bg-[#0f2557] hover:bg-[#1a3570] text-white font-semibold"
                      disabled={otpLoading || otp.length < 6}
                      onClick={() => handleVerifyOtp(otp)}
                    >
                      {otpLoading ? "Verifying…" : "Sign In"}
                    </Button>
                    <button
                      type="button"
                      onClick={handleRequestOtp as any}
                      className="w-full text-sm text-[#c9a144] hover:text-[#0f2557] font-semibold transition-colors"
                      disabled={otpLoading}
                    >
                      Resend code
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Trust footer */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground mt-6 mb-8">
          <ShieldCheck className="w-3.5 h-3.5 text-[#c9a144]" />
          <span>Bash M. Money And Financial Services Ltd - Secured &amp; Encrypted</span>
        </div>
      </div>
    </div>
  );
}
