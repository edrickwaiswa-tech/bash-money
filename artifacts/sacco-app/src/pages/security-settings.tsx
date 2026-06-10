import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, CheckCircle2, Lock, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") || import.meta.env.BASE_URL.replace(/\/$/, "");

export function SecuritySettings() {
  const [, navigate] = useLocation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const reset = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("New password must be different from your current password.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to change password.");
        return;
      }
      setSuccess(true);
      toast.success("Password changed successfully");
      reset();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const passwordType = showPasswords ? "text" : "password";

  return (
    <div className="bg-[#f4f6fb] min-h-screen">
      <div className="bg-[#0f2557] px-4 pt-6 pb-10 flex items-start gap-3">
        <button onClick={() => navigate("/")} className="mt-0.5 text-white/60 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-white font-black text-xl tracking-tight">Security Settings</h1>
          <p className="text-white/50 text-xs mt-1">Bash M. Money And Financial Services Ltd</p>
        </div>
      </div>

      <div className="px-4 -mt-6 pb-10 max-w-sm mx-auto w-full space-y-4">
        {success && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 text-center space-y-3">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-50 mx-auto">
              <CheckCircle2 className="w-7 h-7 text-emerald-500" />
            </div>
            <p className="font-black text-[#0f2557] text-lg">Password Updated</p>
            <p className="text-sm text-muted-foreground">Your admin password has been changed successfully.</p>
            <Button className="w-full h-11 rounded-xl bg-[#0f2557] hover:bg-[#1a3570] text-white font-semibold mt-2" onClick={() => setSuccess(false)}>
              Change Password Again
            </Button>
          </div>
        )}

        {!success && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 pt-6 pb-4 text-center border-b border-gray-50">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#0f2557]/5 mb-3">
                <Lock className="w-6 h-6 text-[#0f2557]" />
              </div>
              <p className="font-black text-[#0f2557] text-base">Change Admin Password</p>
              <p className="text-xs text-muted-foreground mt-0.5">Use this password when signing in as admin</p>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
              {[
                { label: "Current Password", value: currentPassword, setValue: setCurrentPassword, autoComplete: "current-password" },
                { label: "New Password", value: newPassword, setValue: setNewPassword, autoComplete: "new-password" },
                { label: "Confirm New Password", value: confirmPassword, setValue: setConfirmPassword, autoComplete: "new-password" },
              ].map(({ label, value, setValue, autoComplete }) => (
                <div key={label} className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#0f2557]">{label}</label>
                  <Input
                    type={passwordType}
                    value={value}
                    onChange={(e) => { setValue(e.target.value); setError(""); }}
                    autoComplete={autoComplete}
                    required
                    className="h-11 rounded-xl border-gray-200 focus-visible:ring-[#B03060]/40 focus-visible:border-[#B03060]"
                  />
                </div>
              ))}

              <button
                type="button"
                onClick={() => setShowPasswords((value) => !value)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-[#B03060] transition-colors"
              >
                {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showPasswords ? "Hide passwords" : "Show passwords"}
              </button>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-center">
                  <p className="text-sm text-red-600 font-medium">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 rounded-xl bg-[#0f2557] hover:bg-[#1a3570] text-white font-bold text-sm"
                disabled={loading || !currentPassword || newPassword.length < 6 || confirmPassword.length < 6}
              >
                {loading ? "Updating Password..." : "Update Password"}
              </Button>
            </form>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-[#c9a144] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-[#0f2557]">Password Security Tips</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              Use a strong password that is not shared with other accounts. The two allowed admin emails can still sign in to the same admin account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
