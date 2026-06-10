import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/auth";
import { setStoredAuthToken } from "@/lib/api-base";
import { BmmLogo } from "@/components/bmm-logo";
import {
  ShieldCheck, Lock, Eye, EyeOff, Mail,
  Phone, KeyRound, Shield, User,
  Clock, CheckCircle2, XCircle, Loader2,
} from "lucide-react";

const BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") || import.meta.env.BASE_URL.replace(/\/$/, "");
const POLL_INTERVAL = 4000;    // 4 seconds
const REQUEST_TTL   = 10 * 60; // 10 minutes in seconds

type Tab     = "admin" | "member";
type PendingStatus = "pending" | "approved" | "denied" | "expired";

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

// ── Countdown timer component ─────────────────────────────────────────────────
function Countdown({ seconds }: { seconds: number }) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  const pct = (seconds / REQUEST_TTL) * 100;
  const color = seconds > 120 ? "#16a34a" : seconds > 60 ? "#f59e0b" : "#dc2626";
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
          <circle cx="40" cy="40" r="34" fill="none" stroke="#f3f4f6" strokeWidth="6" />
          <circle
            cx="40" cy="40" r="34" fill="none"
            stroke={color} strokeWidth="6"
            strokeDasharray={`${2 * Math.PI * 34}`}
            strokeDashoffset={`${2 * Math.PI * 34 * (1 - pct / 100)}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[13px] font-black tabular-nums" style={{ color }}>{m}:{s}</span>
        </div>
      </div>
      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Expires in</p>
    </div>
  );
}

// ── Pending state panel ───────────────────────────────────────────────────────
function PendingPanel({
  pendingStatus, countdown, onCancel,
}: {
  pendingStatus: PendingStatus;
  countdown: number;
  onCancel: () => void;
}) {
  if (pendingStatus === "approved") {
    return (
      <div className="px-6 py-8 flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
          <CheckCircle2 className="w-9 h-9 text-green-600" />
        </div>
        <div>
          <p className="text-lg font-black text-[#0f2557]">Access Approved!</p>
          <p className="text-sm text-gray-400 mt-1">Redirecting to dashboard…</p>
        </div>
        <Loader2 className="w-5 h-5 text-[#0f2557] animate-spin" />
      </div>
    );
  }

  if (pendingStatus === "denied") {
    return (
      <div className="px-6 py-8 flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
          <XCircle className="w-9 h-9 text-red-500" />
        </div>
        <div>
          <p className="text-lg font-black text-red-600">Access Denied</p>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            Your login request was denied by an administrator.
          </p>
        </div>
        <button
          onClick={onCancel}
          className="w-full h-11 rounded-2xl text-white font-bold text-sm"
          style={{ background: "linear-gradient(135deg, #B03060 0%, #7B1535 100%)" }}
        >
          Back to Sign In
        </button>
      </div>
    );
  }

  if (pendingStatus === "expired") {
    return (
      <div className="px-6 py-8 flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center">
          <Clock className="w-9 h-9 text-amber-500" />
        </div>
        <div>
          <p className="text-lg font-black text-amber-600">Request Expired</p>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            The 10-minute window has passed. Please sign in again.
          </p>
        </div>
        <button
          onClick={onCancel}
          className="w-full h-11 rounded-2xl text-white font-bold text-sm"
          style={{ background: "linear-gradient(135deg, #B03060 0%, #7B1535 100%)" }}
        >
          Try Again
        </button>
      </div>
    );
  }

  // ── "pending" state ──
  return (
    <div className="px-6 py-6 flex flex-col items-center gap-5 text-center">
      {/* Shield spinner */}
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-[#0f2557]/6 flex items-center justify-center">
          <Shield className="w-8 h-8 text-[#0f2557]" />
        </div>
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center">
          <Loader2 className="w-3 h-3 text-white animate-spin" />
        </div>
      </div>

      <div>
        <p className="text-[18px] font-black text-[#0f2557] leading-tight">Access request sent</p>
        <p className="text-sm text-gray-400 mt-1 leading-relaxed">
          Please check your notification to approve.
        </p>
      </div>

      {/* Info box */}
      <div className="w-full bg-[#B03060]/5 border border-[#B03060]/10 rounded-2xl px-4 py-3 text-left">
        <p className="text-[11px] font-bold text-[#7B1535] uppercase tracking-wider mb-1">What happens next?</p>
        <ul className="text-[12px] text-[#7B1535] space-y-1 leading-relaxed">
          <li>✉️ An approval email has been sent to the system administrators</li>
          <li>🔐 Either admin must click <strong>Approve</strong> in the email</li>
          <li>⚡ This page will redirect you automatically once approved</li>
        </ul>
      </div>

      {/* Countdown */}
      <Countdown seconds={countdown} />

      {/* Pulse dot indicator */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
        </span>
        Waiting for approval…
      </div>

      <button
        onClick={onCancel}
        className="text-sm text-gray-400 hover:text-[#B03060] transition-colors font-semibold underline underline-offset-2"
      >
        Cancel &amp; start over
      </button>
    </div>
  );
}

// ── Main Login component ──────────────────────────────────────────────────────
export function Login() {
  const { refreshProfile } = useAuth();
  const [, navigate] = useLocation();

  const [tab, setTab] = useState<Tab>("admin");

  // ── Admin state ────────────────────────────────────────────────────────────
  const [adminEmail,    setAdminEmail]    = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [adminLoading,  setAdminLoading]  = useState(false);
  const [adminError,    setAdminError]    = useState("");

  // ── Member state ───────────────────────────────────────────────────────────
  const [memberPhone,   setMemberPhone]   = useState("");
  const [memberPin,     setMemberPin]     = useState("");
  const [showMemberPin, setShowMemberPin] = useState(false);
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberError,   setMemberError]   = useState("");

  // ── Pending approval state ─────────────────────────────────────────────────
  const [requestToken,  setRequestToken]  = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<PendingStatus>("pending");
  const [countdown,     setCountdown]     = useState(REQUEST_TTL);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isPending = requestToken !== null;

  // ── Start polling when requestToken is set ─────────────────────────────────
  useEffect(() => {
    if (!requestToken) return;

    // Countdown ticker
    tickRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(tickRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);

    // Status poller
    const poll = async () => {
      try {
        const res = await fetch(`${BASE}/api/auth/login-request/status?token=${requestToken}`, {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = await res.json();
        const status = data.status as PendingStatus;

        if (status !== "pending") {
          setPendingStatus(status);
          clearInterval(pollRef.current!);
          clearInterval(tickRef.current!);

          if (status === "approved") {
            // Session is now set on the server; refresh profile then navigate
            await refreshProfile();
            setTimeout(() => navigate("/"), 1200);
          }
        }
      } catch {
        // Network error — keep polling
      }
    };

    poll(); // immediate first check
    pollRef.current = setInterval(poll, POLL_INTERVAL);

    return () => {
      clearInterval(pollRef.current!);
      clearInterval(tickRef.current!);
    };
  }, [requestToken, navigate, refreshProfile]);

  // ── Cancel / reset approval ────────────────────────────────────────────────
  const cancelPending = () => {
    clearInterval(pollRef.current!);
    clearInterval(tickRef.current!);
    setRequestToken(null);
    setPendingStatus("pending");
    setCountdown(REQUEST_TTL);
    setAdminEmail("");
    setAdminPassword("");
    setAdminError("");
  };

  // ── Admin login handler ────────────────────────────────────────────────────
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError("");
    setAdminLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: adminEmail.trim(), password: adminPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAdminError(data.error ?? "Login failed");
        return;
      }
      if (data.status === "approved") {
        // Owner bypass — session already set, go straight to dashboard
        if (data.authToken) setStoredAuthToken(data.authToken);
        await refreshProfile();
        navigate("/");
        return;
      }
      if (data.status === "pending" && data.requestToken) {
        setRequestToken(data.requestToken);
        setCountdown(REQUEST_TTL);
        setPendingStatus("pending");
      }
    } catch {
      setAdminError("Network error. Please try again.");
    } finally {
      setAdminLoading(false);
    }
  };

  // ── Member login handler ───────────────────────────────────────────────────
  const handleMemberLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (memberPin.length !== 4) { setMemberError("PIN must be exactly 4 digits"); return; }
    setMemberError("");
    setMemberLoading(true);
    try {
      const rawPhone = memberPhone.trim();
      const subscriberPhone = rawPhone.startsWith("256")
        ? rawPhone.slice(3)
        : rawPhone.startsWith("0")
          ? rawPhone.slice(1)
          : rawPhone;
      const phone = `+256${subscriberPhone}`;
      const res = await fetch(`${BASE}/api/auth/member/login-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ identifier: phone, pin: memberPin }),
      });
      const data = await res.json();
      if (!res.ok) { setMemberError(data.error ?? "Login failed"); return; }
      if (data.authToken) setStoredAuthToken(data.authToken);
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

  // ── Render ─────────────────────────────────────────────────────────────────
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
        {/* ── Pending approval overlay ── */}
        {isPending ? (
          <PendingPanel
            pendingStatus={pendingStatus}
            countdown={countdown}
            onCancel={cancelPending}
          />
        ) : (
          <>
            {/* Tabs */}
            <div className="flex border-b border-gray-100 bg-gray-50/40">
              {(["admin", "member"] as Tab[]).map((t) => {
                const active = tab === t;
                const label = t === "admin" ? "Admin Portal" : "Member Portal";
                const Icon  = t === "admin" ? Shield : User;
                return (
                  <button
                    key={t}
                    onClick={() => switchTab(t)}
                    className={`flex-1 flex flex-col items-center gap-1.5 py-4 relative transition-all ${
                      active ? "bg-white" : "hover:bg-gray-50/80"
                    }`}
                  >
                    <Icon className={`h-[18px] w-[18px] transition-colors ${active ? "text-[#B03060]" : "text-gray-400"}`} />
                    <span className={`text-[10px] font-black tracking-widest uppercase transition-colors ${active ? "text-[#0f2557]" : "text-gray-400"}`}>
                      {label}
                    </span>
                    {active && <span className="absolute bottom-0 left-6 right-6 h-[2.5px] rounded-t-full bg-[#B03060]" />}
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
                  {adminLoading ? "Verifying…" : "Sign In"}
                </button>

                <div className="text-center">
                  <Link href="/forgot-password" className="text-sm text-[#B03060] hover:text-[#8B1A40] font-semibold transition-colors">
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
                  <div className="flex h-12 rounded-2xl border border-gray-200 bg-gray-50/60 overflow-hidden focus-within:ring-2 focus-within:ring-[#B03060]/40 focus-within:border-[#B03060] transition-all">
                    <div className="flex items-center pl-3.5 pr-3 border-r border-gray-200 bg-gray-100/70 flex-shrink-0 gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-gray-500" />
                      <span className="text-sm font-extrabold text-[#0f2557] tracking-tight">+256</span>
                    </div>
                    <input
                      type="tel"
                      placeholder="700 000 000"
                      autoComplete="tel"
                      inputMode="numeric"
                      value={memberPhone}
                      onChange={(e) => { setMemberPhone(e.target.value.replace(/\D/g, "")); setMemberError(""); }}
                      required
                      className="flex-1 px-3 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none"
                    />
                  </div>
                </div>

                {/* 4-digit PIN with show/hide */}
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
                      onChange={(e) => { setMemberPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setMemberError(""); }}
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
                  <Link href="/forgot-pin" className="text-sm text-[#B03060] hover:text-[#8B1A40] font-semibold transition-colors">
                    Forgot your PIN? Contact admin
                  </Link>
                </div>
              </form>
            )}
          </>
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
