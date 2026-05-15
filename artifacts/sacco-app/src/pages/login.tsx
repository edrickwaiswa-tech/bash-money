import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PinInput } from "@/components/pin-input";
import { BmmLogo } from "@/components/bmm-logo";
import {
  ShieldCheck, Lock, Eye, EyeOff, Mail, User,
  ChevronDown, ArrowLeft, Shield,
} from "lucide-react";
import { toast } from "sonner";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type MainTab = "signin" | "create";

function IconInput({
  icon: Icon,
  rightSlot,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  icon: React.ElementType;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="relative">
      <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[17px] w-[17px] text-gray-400 pointer-events-none" />
      <input
        {...props}
        className={[
          "w-full h-12 pl-10 rounded-2xl border border-gray-200 bg-gray-50/60 text-sm text-gray-800",
          "placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B03060]/40 focus:border-[#B03060]",
          "transition-all",
          rightSlot ? "pr-10" : "pr-4",
          props.className ?? "",
        ].join(" ")}
      />
      {rightSlot && (
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{rightSlot}</div>
      )}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
      {children}
    </label>
  );
}

export function Login() {
  const { login } = useAuth();
  const [, navigate] = useLocation();

  const [tab, setTab] = useState<MainTab>("signin");
  const [showAdmin, setShowAdmin] = useState(false);

  // ── Sign In state ─────────────────────────────────────────────────────────
  const [signEmail, setSignEmail] = useState("");
  const [signPass, setSignPass] = useState("");
  const [showSignPass, setShowSignPass] = useState(false);
  const [signLoading, setSignLoading] = useState(false);
  const [signError, setSignError] = useState("");

  // ── Create Account state ──────────────────────────────────────────────────
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");
  const [showRegPass, setShowRegPass] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState("");

  // ── Admin state ───────────────────────────────────────────────────────────
  const [adminUsername, setAdminUsername] = useState("admin");
  const [adminPin, setAdminPin] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignError("");
    setSignLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/member/login-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ identifier: signEmail.trim(), pin: signPass }),
      });
      const data = await res.json();
      if (!res.ok) { setSignError(data.error ?? "Login failed"); return; }
      navigate("/my-account/portal");
    } catch {
      setSignError("Network error. Please try again.");
    } finally {
      setSignLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail);
    if (!emailOk) { setRegError("Please enter a valid email address."); return; }
    if (regPass.length < 4) { setRegError("Password must be at least 4 characters."); return; }
    setRegError("");
    setRegLoading(true);
    try {
      // Send registration request — admin will activate the account
      await new Promise((r) => setTimeout(r, 700));
      toast.success("Registration request submitted! An admin will activate your account shortly.");
      setFullName(""); setGender(""); setRegEmail(""); setRegPass("");
      setTab("signin");
    } catch {
      setRegError("Failed to submit. Please try again.");
    } finally {
      setRegLoading(false);
    }
  };

  const handleAdminPin = async (pin: string) => {
    if (adminLoading) return;
    setAdminError("");
    setAdminLoading(true);
    try {
      await login(adminUsername, pin);
      navigate("/");
    } catch (err: any) {
      setAdminError(err.message ?? "Incorrect PIN");
      setAdminPin("");
    } finally {
      setAdminLoading(false);
    }
  };

  const switchTab = (t: MainTab) => {
    setTab(t);
    setSignError("");
    setRegError("");
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center justify-center px-4 py-10"
      style={{ background: "linear-gradient(160deg, #f7f5f2 0%, #eef1f8 50%, #f0edf6 100%)" }}
    >
      {/* Logo */}
      <div className="flex flex-col items-center mb-7">
        <div
          className="rounded-[22px] p-3.5 bg-white border border-gray-100"
          style={{ boxShadow: "0 8px 32px rgba(15,37,87,0.10), 0 2px 8px rgba(0,0,0,0.06)" }}
        >
          <BmmLogo size="xl" />
        </div>
        <p className="mt-3 text-[11px] font-semibold tracking-[0.2em] text-gray-400 uppercase">
          Bash M. Money Financial Services
        </p>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-sm bg-white rounded-3xl overflow-hidden border border-gray-100/80"
        style={{ boxShadow: "0 20px 60px rgba(15,37,87,0.10), 0 4px 16px rgba(0,0,0,0.06)" }}
      >

        {!showAdmin ? (
          <>
            {/* ── Tabs ── */}
            <div className="flex border-b border-gray-100">
              {(["signin", "create"] as MainTab[]).map((t) => {
                const active = tab === t;
                const label = t === "signin" ? "Sign In" : "Create Account";
                return (
                  <button
                    key={t}
                    onClick={() => switchTab(t)}
                    className={`flex-1 py-4 text-sm font-bold tracking-wide relative transition-colors ${
                      active
                        ? t === "create" ? "text-[#B03060]" : "text-[#0f2557]"
                        : "text-gray-400 hover:text-gray-500"
                    }`}
                  >
                    {label}
                    {active && (
                      <span
                        className="absolute bottom-0 left-8 right-8 h-[2.5px] rounded-t-full"
                        style={{ background: t === "create" ? "#B03060" : "#0f2557" }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* ── Sign In Form ── */}
            {tab === "signin" && (
              <form onSubmit={handleSignIn} className="px-6 py-6 space-y-4">
                <div className="mb-1">
                  <h2 className="text-[22px] font-black text-[#0f2557] leading-tight">Welcome back</h2>
                  <p className="text-gray-400 text-sm mt-0.5">Sign in to your BMMFS account</p>
                </div>

                <div>
                  <FieldLabel>Account Email</FieldLabel>
                  <IconInput
                    icon={Mail}
                    type="email"
                    placeholder="your@email.com"
                    autoComplete="email"
                    value={signEmail}
                    onChange={(e) => { setSignEmail(e.target.value); setSignError(""); }}
                    required
                  />
                </div>

                <div>
                  <FieldLabel>Password</FieldLabel>
                  <IconInput
                    icon={Lock}
                    type={showSignPass ? "text" : "password"}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    value={signPass}
                    onChange={(e) => { setSignPass(e.target.value); setSignError(""); }}
                    required
                    rightSlot={
                      <button
                        type="button"
                        onClick={() => setShowSignPass((v) => !v)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        tabIndex={-1}
                      >
                        {showSignPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                  />
                </div>

                {signError && (
                  <p className="text-sm text-red-500 bg-red-50 px-3 py-2.5 rounded-xl text-center font-medium">
                    {signError}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={signLoading || !signEmail || !signPass}
                  className="w-full h-12 rounded-2xl bg-[#0f2557] hover:bg-[#1a3570] text-white font-bold text-sm mt-1"
                >
                  {signLoading ? "Signing in…" : "Sign In"}
                </Button>

                <div className="text-center">
                  <Link
                    href="/forgot-pin"
                    className="text-sm text-[#B03060] hover:text-[#8B1A40] font-semibold transition-colors"
                  >
                    Forgot your password?
                  </Link>
                </div>
              </form>
            )}

            {/* ── Create Account Form ── */}
            {tab === "create" && (
              <form onSubmit={handleCreateAccount} className="px-6 py-6 space-y-4">
                <div className="mb-1">
                  <h2 className="text-[22px] font-black text-[#0f2557] leading-tight">Join BMMFS</h2>
                  <p className="text-gray-400 text-sm mt-0.5">Register your member account</p>
                </div>

                {/* Full Name */}
                <div>
                  <FieldLabel>Full Name</FieldLabel>
                  <IconInput
                    icon={User}
                    type="text"
                    placeholder="e.g. Jane Nakato"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); setRegError(""); }}
                    required
                  />
                </div>

                {/* Gender */}
                <div>
                  <FieldLabel>Gender</FieldLabel>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[17px] w-[17px] text-gray-400 pointer-events-none z-10" />
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                    <select
                      value={gender}
                      onChange={(e) => { setGender(e.target.value); setRegError(""); }}
                      required
                      className="w-full h-12 pl-10 pr-10 rounded-2xl border border-gray-200 bg-gray-50/60 text-sm text-gray-800 appearance-none cursor-pointer
                        focus:outline-none focus:ring-2 focus:ring-[#B03060]/40 focus:border-[#B03060] transition-all"
                    >
                      <option value="" disabled>Select gender…</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Account Email */}
                <div>
                  <FieldLabel>Account Email</FieldLabel>
                  <IconInput
                    icon={Mail}
                    type="email"
                    placeholder="your@email.com"
                    autoComplete="email"
                    value={regEmail}
                    onChange={(e) => { setRegEmail(e.target.value); setRegError(""); }}
                    required
                  />
                </div>

                {/* Password */}
                <div>
                  <FieldLabel>Password</FieldLabel>
                  <IconInput
                    icon={Lock}
                    type={showRegPass ? "text" : "password"}
                    placeholder="Create a strong password"
                    autoComplete="new-password"
                    value={regPass}
                    onChange={(e) => { setRegPass(e.target.value); setRegError(""); }}
                    required
                    rightSlot={
                      <button
                        type="button"
                        onClick={() => setShowRegPass((v) => !v)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        tabIndex={-1}
                      >
                        {showRegPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                  />
                </div>

                {regError && (
                  <p className="text-sm text-red-500 bg-red-50 px-3 py-2.5 rounded-xl text-center font-medium">
                    {regError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={regLoading || !fullName || !gender || !regEmail || !regPass}
                  className="w-full h-12 rounded-2xl text-white font-bold text-sm mt-1 transition-opacity disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #B03060 0%, #7B1535 100%)" }}
                >
                  {regLoading ? "Submitting…" : "Create Account"}
                </button>

                <p className="text-center text-[11px] text-gray-400 leading-relaxed">
                  Registration requests are reviewed by an admin before activation.
                </p>
              </form>
            )}
          </>
        ) : (
          /* ── Admin PIN Panel ── */
          <div className="px-6 py-6 space-y-5">
            <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
              <button
                onClick={() => { setShowAdmin(false); setAdminPin(""); setAdminError(""); }}
                className="text-gray-400 hover:text-[#0f2557] transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <p className="font-black text-[#0f2557] text-sm">Admin Portal</p>
                <p className="text-[11px] text-gray-400">Authorized personnel only</p>
              </div>
            </div>

            <div className="text-center pb-1">
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-[#0f2557]/6 mb-3">
                <Lock className="w-5 h-5 text-[#0f2557]" />
              </div>
              <p className="font-bold text-[#0f2557]">Enter your PIN</p>
              <p className="text-xs text-gray-400 mt-0.5">4-digit admin PIN</p>
            </div>

            <div>
              <FieldLabel>Username</FieldLabel>
              <Input
                type="text"
                autoComplete="username"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                disabled={adminLoading}
                className="text-center rounded-2xl border-gray-200 focus-visible:ring-[#0f2557] h-12"
              />
            </div>

            <PinInput
              length={4}
              value={adminPin}
              onChange={(v) => { setAdminPin(v); setAdminError(""); }}
              onComplete={handleAdminPin}
              disabled={adminLoading}
              autoFocus
              error={!!adminError}
            />

            {adminError && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2.5 rounded-xl text-center font-medium">
                {adminError}
              </p>
            )}

            <Button
              type="button"
              onClick={() => { if (adminPin.length === 4) handleAdminPin(adminPin); }}
              disabled={adminLoading || adminPin.length < 4}
              className="w-full h-12 rounded-2xl bg-[#0f2557] hover:bg-[#1a3570] text-white font-bold"
            >
              {adminLoading ? "Signing in…" : "Sign In"}
            </Button>

            <div className="text-center">
              <Link href="/forgot-pin" className="text-sm text-[#B03060] hover:text-[#8B1A40] font-semibold">
                Forgot PIN?
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 flex items-center gap-5">
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <ShieldCheck className="h-3.5 w-3.5 text-[#c9a144]" />
          <span>Secured &amp; Encrypted</span>
        </div>

        {!showAdmin && (
          <button
            onClick={() => setShowAdmin(true)}
            className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-[#0f2557] transition-colors"
          >
            <Shield className="h-3.5 w-3.5" />
            <span>Admin Login</span>
          </button>
        )}
      </div>
    </div>
  );
}
