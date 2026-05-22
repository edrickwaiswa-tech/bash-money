import { useState } from "react";
import { useLocation, Link } from "wouter";
import { BmmLogo } from "@/components/bmm-logo";
import { PinInput } from "@/components/pin-input";
import {
  Mail, KeyRound, Lock, Eye, EyeOff,
  ArrowLeft, CheckCircle, AlertCircle, Info,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Step = "email" | "code" | "new-password" | "success";

const inputBase =
  "w-full h-11 rounded-xl border border-gray-200 bg-gray-50/60 text-sm text-gray-800 " +
  "placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B03060]/40 " +
  "focus:border-[#B03060] transition-all px-4";

export function ForgotPassword() {
  const [, navigate] = useLocation();
  const [step, setStep]               = useState<Step>("email");
  const [email, setEmail]             = useState("");
  const [code, setCode]               = useState("");
  const [resetToken, setResetToken]   = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError]             = useState("");
  const [isLoading, setIsLoading]     = useState(false);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/admin/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Request failed"); return; }
      setStep("code");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (entered?: string) => {
    const codeToCheck = entered ?? code;
    if (codeToCheck.length < 6) return;
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/admin/verify-reset-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: codeToCheck }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Verification failed"); setCode(""); return; }
      setResetToken(data.resetToken);
      setStep("new-password");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPass) { setError("Passwords do not match"); return; }
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/admin/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ resetToken, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Reset failed"); return; }
      setStep("success");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

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
          Admin Password Recovery
        </p>
      </div>

      <div
        className="w-full max-w-sm bg-white rounded-3xl overflow-hidden border border-gray-100/80"
        style={{ boxShadow: "0 20px 60px rgba(15,37,87,0.10), 0 4px 16px rgba(0,0,0,0.06)" }}
      >
        {/* ── Step 1: Email ── */}
        {step === "email" && (
          <div className="px-6 py-7 space-y-5">
            <div className="space-y-1">
              <h2 className="text-[22px] font-black text-[#0f2557]">Forgot Password?</h2>
              <p className="text-sm text-gray-400">Enter your admin email to receive a reset code.</p>
            </div>

            <form onSubmit={handleRequestCode} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Admin Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input
                    type="email"
                    placeholder="admin@bmmfs.com"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    required
                    className={`${inputBase} pl-10`}
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 px-3 py-2.5 rounded-xl">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !email}
                className="w-full h-12 rounded-2xl text-white font-bold text-sm transition-opacity disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #B03060 0%, #7B1535 100%)" }}
              >
                {isLoading ? "Sending…" : "Send Reset Code"}
              </button>

              <div className="text-center">
                <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#B03060] transition-colors font-medium">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
                </Link>
              </div>
            </form>
          </div>
        )}

        {/* ── Step 2: Enter code ── */}
        {step === "code" && (
          <div className="px-6 py-7 space-y-5">
            <button
              onClick={() => { setStep("email"); setCode(""); setError(""); }}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#B03060] transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <div className="space-y-1">
              <h2 className="text-[20px] font-black text-[#0f2557]">Check your email</h2>
              <p className="text-sm text-gray-400">
                A 6-digit reset code was sent to{" "}
                <span className="font-semibold text-[#B03060]">{email}</span>
              </p>
            </div>

            <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-3">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700 leading-relaxed">
                The code was sent to your email inbox. If you do not see it, check your spam folder.
                The code expires in 10 minutes.
              </p>
            </div>

            <div className="space-y-4">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">
                Enter 6-digit code
              </label>
              <PinInput
                length={6}
                value={code}
                onChange={setCode}
                onComplete={handleVerifyCode}
                disabled={isLoading}
                autoFocus
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 px-3 py-2.5 rounded-xl">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={() => handleVerifyCode()}
              disabled={isLoading || code.length < 6}
              className="w-full h-12 rounded-2xl text-white font-bold text-sm transition-opacity disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #B03060 0%, #7B1535 100%)" }}
            >
              {isLoading ? "Verifying…" : "Verify Code"}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => { setStep("email"); setCode(""); setError(""); }}
                className="text-sm text-[#B03060] hover:text-[#7B1535] font-semibold transition-colors"
              >
                Resend code
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: New password ── */}
        {step === "new-password" && (
          <div className="px-6 py-7 space-y-5">
            <div className="space-y-1">
              <h2 className="text-[20px] font-black text-[#0f2557]">Set new password</h2>
              <p className="text-sm text-gray-400">Choose a strong password for your admin account.</p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input
                    type={showPass ? "text" : "password"}
                    placeholder="Min. 6 characters"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
                    required
                    className={`${inputBase} pl-10 pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                    value={confirmPass}
                    onChange={(e) => { setConfirmPass(e.target.value); setError(""); }}
                    required
                    className={`${inputBase} pl-10 pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 px-3 py-2.5 rounded-xl">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || newPassword.length < 6 || confirmPass.length < 6}
                className="w-full h-12 rounded-2xl text-white font-bold text-sm transition-opacity disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #B03060 0%, #7B1535 100%)" }}
              >
                {isLoading ? "Saving…" : "Set New Password"}
              </button>
            </form>
          </div>
        )}

        {/* ── Step 4: Success ── */}
        {step === "success" && (
          <div className="px-6 py-10 flex flex-col items-center gap-5 text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <div>
              <p className="text-[20px] font-black text-[#0f2557]">Password Updated!</p>
              <p className="text-sm text-gray-400 mt-1 leading-relaxed">
                Your admin password has been changed. You can now sign in with your new password.
              </p>
            </div>
            <button
              onClick={() => navigate("/login")}
              className="w-full h-12 rounded-2xl text-white font-bold text-sm"
              style={{ background: "linear-gradient(135deg, #B03060 0%, #7B1535 100%)" }}
            >
              Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
