import { useState } from "react";
import { useLocation } from "wouter";
import { BmmLogo } from "@/components/bmm-logo";
import { PinInput } from "@/components/pin-input";
import { ShieldCheck, KeyRound, RefreshCw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") || import.meta.env.BASE_URL.replace(/\/$/, "");

export function ForceSetPin() {
  const [, navigate] = useLocation();
  const [newPin, setNewPin]       = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState(false);

  const handleSave = async () => {
    setError("");
    if (newPin.length < 4) { setError("PIN must be exactly 4 digits"); return; }
    if (newPin !== confirmPin) { setError("PINs do not match — please re-enter"); return; }
    setIsLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/member/set-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ pin: newPin }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to save PIN"); return; }
      setSuccess(true);
      toast.success("New PIN saved — welcome!");
      setTimeout(() => navigate("/my-account/portal"), 1500);
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
        <p className="text-white/60 text-xs mt-1 uppercase tracking-widest font-medium">Account Security</p>
      </div>

      <div className="flex-1 px-4 -mt-8 flex flex-col max-w-sm mx-auto w-full">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">

          {success ? (
            <div className="px-6 py-12 flex flex-col items-center text-center gap-3">
              <CheckCircle2 className="w-14 h-14 text-emerald-500" />
              <p className="font-black text-[#1A1A1A] text-lg">PIN saved!</p>
              <p className="text-sm text-gray-400">Redirecting you to your dashboard…</p>
            </div>
          ) : (
            <>
              <div className="px-6 pt-7 pb-5 text-center border-b border-gray-50">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#B03060]/8 mb-3">
                  <KeyRound className="w-6 h-6 text-[#B03060]" />
                </div>
                <p className="font-black text-[#1A1A1A] text-base leading-tight">Create Your New PIN</p>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed max-w-[240px] mx-auto">
                  Your account access has been reset by an administrator. Please create a new 4-digit PIN to secure your account.
                </p>
              </div>

              <div className="px-6 py-6 space-y-5">
                <div className="space-y-2">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider text-center">New PIN</p>
                  <PinInput
                    length={4}
                    value={newPin}
                    onChange={(v) => { setNewPin(v); setError(""); }}
                    disabled={isLoading}
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider text-center">Confirm New PIN</p>
                  <PinInput
                    length={4}
                    value={confirmPin}
                    onChange={(v) => { setConfirmPin(v); setError(""); }}
                    onComplete={() => { if (newPin.length === 4) handleSave(); }}
                    disabled={isLoading}
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive bg-destructive/8 px-3 py-2.5 rounded-xl text-center font-medium">{error}</p>
                )}

                <button
                  onClick={handleSave}
                  disabled={isLoading || newPin.length < 4 || confirmPin.length < 4}
                  className="w-full h-11 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #B03060 0%, #7B1535 100%)" }}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" /> Saving…
                    </span>
                  ) : "Save My New PIN"}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground mt-6 mb-8">
          <ShieldCheck className="w-3.5 h-3.5 text-[#B03060]" />
          <span>Bash M. Money And Financial Services Ltd — Secured &amp; Encrypted</span>
        </div>
      </div>
    </div>
  );
}
