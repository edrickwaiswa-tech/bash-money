import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/auth";
import { BmmLogo } from "@/components/bmm-logo";
import {
  ShieldCheck, Lock, Eye, EyeOff, Mail,
  Phone, KeyRound, Shield, User,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Tab = "admin" | "member";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
      {children}
    </label>
  );
}

const inputBase =
  "w-full h-12 rounded-2xl border border-gray-200 bg-gray-50/60 text-sm text-gray-800 " +
  "placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B03060]/40 " +
  "focus:border-[#B03060] transition-all";

export function Login() {
  const { login } = useAuth();
  const [, navigate] = useLocation();

  const [tab, setTab] = useState<Tab>("admin");

  // ── Admin state ───────────────────────────────────────────────────────────
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");

  // ── Member state ──────────────────────────────────────────────────────────
  const [memberPhone, setMemberPhone] = useState("");
  const [memberPin, setMemberPin] = useState("");
  const [showMemberPin, setShowMemberPin] = useState(false);
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberError, setMemberError] = useState("");

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError("");
    setAdminLoading(true);
    try {
      await login(adminEmail.trim(), adminPassword);
      navigate("/");
    } catch (err: any) {
      setAdminError(err.message ?? "Login failed");
    } finally {
      setAdminLoading(false);
    }
  };

  const handleMemberLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (memberPin.length !== 4) {
      setMemberError("PIN must be exactly 4 digits");
      return;
    }
    setMemberError("");
    setMemberLoading(true);
    try {
      const phone = memberPhone.trim().startsWith("+")
        ? memberPhone.trim()
        : `+256${memberPhone.trim()}`;
      const res = await fetch(`${BASE}/api/auth/member/login-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ identifier: phone, pin: memberPin }),
      });
      const data = await res.json();
      if (!res.ok) { setMemberError(data.error ?? "Login failed"); return; }
      navigate("/my-account/portal");
    } catch {
      setMemberError("Network error. Please try again.");
    } finally {
      setMemberLoading(false);
    }
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    setAdminError("");
    setMemberError("");
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center justify-center px-4 py-10"
      style={{ background: "linear-gradient(160deg, #f7f5f2 0%, #eef1f8 50%, #f0edf6 100%)" }}
    >
      {/* ── Logo ── */}
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

      {/* ── Card ── */}
      <div
        className="w-full max-w-sm bg-white rounded-3xl overflow-hidden border border-gray-100/80"
        style={{ boxShadow: "0 20px 60px rgba(15,37,87,0.10), 0 4px 16px rgba(0,0,0,0.06)" }}
      >
        {/* Tabs */}
        <div className="flex border-b border-gray-100 bg-gray-50/40">
          {(["admin", "member"] as Tab[]).map((t) => {
            const active = tab === t;
            const label = t === "admin" ? "Admin Portal" : "Member Portal";
            const Icon = t === "admin" ? Shield : User;
            return (
              <button
                key={t}
                onClick={() => switchTab(t)}
                className={`flex-1 flex flex-col items-center gap-1.5 py-4 relative transition-all ${
                  active ? "bg-white" : "hover:bg-gray-50/80"
                }`}
              >
                <Icon
                  className={`h-[18px] w-[18px] transition-colors ${
                    active ? "text-[#B03060]" : "text-gray-400"
                  }`}
                />
                <span
                  className={`text-[10px] font-black tracking-widest uppercase transition-colors ${
                    active ? "text-[#0f2557]" : "text-gray-400"
                  }`}
                >
                  {label}
                </span>
                {active && (
                  <span className="absolute bottom-0 left-6 right-6 h-[2.5px] rounded-t-full bg-[#B03060]" />
                )}
              </button>
            );
          })}
        </div>

        {/* ── Admin Portal Form ── */}
        {tab === "admin" && (
          <form onSubmit={handleAdminLogin} className="px-6 py-6 space-y-4">
            <div className="mb-1">
              <h2 className="text-[22px] font-black text-[#0f2557] leading-tight">Admin Sign In</h2>
              <p className="text-gray-400 text-sm mt-0.5">Authorized personnel only</p>
            </div>

            {/* Email Address */}
            <div>
              <FieldLabel>Email Address</FieldLabel>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="admin@bmmfs.com"
                  autoComplete="username"
                  value={adminEmail}
                  onChange={(e) => { setAdminEmail(e.target.value); setAdminError(""); }}
                  required
                  className={`${inputBase} pl-10 pr-4`}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <FieldLabel>Password</FieldLabel>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  type={showAdminPass ? "text" : "password"}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={adminPassword}
                  onChange={(e) => { setAdminPassword(e.target.value); setAdminError(""); }}
                  required
                  className={`${inputBase} pl-10 pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPass((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showAdminPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {adminError && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2.5 rounded-xl text-center font-medium">
                {adminError}
              </p>
            )}

            <button
              type="submit"
              disabled={adminLoading || !adminEmail || !adminPassword}
              className="w-full h-12 rounded-2xl text-white font-bold text-sm mt-1 transition-opacity disabled:opacity-50 cursor-pointer"
              style={{ background: "linear-gradient(135deg, #B03060 0%, #7B1535 100%)" }}
            >
              {adminLoading ? "Signing in…" : "Sign In"}
            </button>

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

        {/* ── Member Portal Form ── */}
        {tab === "member" && (
          <form onSubmit={handleMemberLogin} className="px-6 py-6 space-y-4">
            <div className="mb-1">
              <h2 className="text-[22px] font-black text-[#0f2557] leading-tight">Member Sign In</h2>
              <p className="text-gray-400 text-sm mt-0.5">Enter your phone number and PIN</p>
            </div>

            {/* Phone with permanent +256 prefix */}
            <div>
              <FieldLabel>Phone Number</FieldLabel>
              <div
                className="flex h-12 rounded-2xl border border-gray-200 bg-gray-50/60 overflow-hidden
                  focus-within:ring-2 focus-within:ring-[#B03060]/40 focus-within:border-[#B03060] transition-all"
              >
                {/* Fixed prefix */}
                <div className="flex items-center pl-3.5 pr-3 border-r border-gray-200 bg-gray-100/70 flex-shrink-0 gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-gray-500" />
                  <span className="text-sm font-extrabold text-[#0f2557] tracking-tight">+256</span>
                </div>
                {/* Number input */}
                <input
                  type="tel"
                  placeholder="700 000 000"
                  autoComplete="tel"
                  inputMode="numeric"
                  value={memberPhone}
                  onChange={(e) => {
                    setMemberPhone(e.target.value.replace(/\D/g, ""));
                    setMemberError("");
                  }}
                  required
                  className="flex-1 px-3 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none"
                />
              </div>
            </div>

            {/* 4-digit PIN — single input with show/hide eye */}
            <div>
              <FieldLabel>4-Digit PIN</FieldLabel>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  type={showMemberPin ? "text" : "password"}
                  placeholder="••••"
                  inputMode="numeric"
                  maxLength={4}
                  value={memberPin}
                  onChange={(e) => {
                    setMemberPin(e.target.value.replace(/\D/g, "").slice(0, 4));
                    setMemberError("");
                  }}
                  required
                  className={`${inputBase} pl-10 pr-10 text-center tracking-[0.6em] font-bold`}
                />
                <button
                  type="button"
                  onClick={() => setShowMemberPin((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showMemberPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1 pl-1">Digits only — no spaces or letters</p>
            </div>

            {memberError && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2.5 rounded-xl text-center font-medium">
                {memberError}
              </p>
            )}

            <button
              type="submit"
              disabled={memberLoading || !memberPhone || memberPin.length !== 4}
              className="w-full h-12 rounded-2xl text-white font-bold text-sm mt-1 transition-opacity disabled:opacity-50 cursor-pointer"
              style={{ background: "linear-gradient(135deg, #B03060 0%, #7B1535 100%)" }}
            >
              {memberLoading ? "Signing in…" : "Sign In"}
            </button>

            <div className="text-center">
              <Link
                href="/forgot-pin"
                className="text-sm text-[#B03060] hover:text-[#8B1A40] font-semibold transition-colors"
              >
                Forgot your PIN?
              </Link>
            </div>
          </form>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 flex items-center gap-1.5 text-[11px] text-gray-400">
        <ShieldCheck className="h-3.5 w-3.5 text-[#c9a144]" />
        <span>Bash M. Money And Financial Services Ltd — Secured &amp; Encrypted</span>
      </div>
    </div>
  );
}
