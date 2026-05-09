import { useState } from "react";
import { useLocation } from "wouter";
import { PinInput } from "@/components/pin-input";
import { Button } from "@/components/ui/button";
import { ShieldCheck, CheckCircle2, Lock, ArrowLeft, KeyRound, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function SecuritySettings() {
  const [, navigate] = useLocation();

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [currentError, setCurrentError] = useState(false);
  const [newError, setNewError] = useState(false);
  const [confirmError, setConfirmError] = useState(false);

  const reset = () => {
    setCurrentPin(""); setNewPin(""); setConfirmPin("");
    setError(""); setCurrentError(false); setNewError(false); setConfirmError(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCurrentError(false); setNewError(false); setConfirmError(false);

    if (currentPin.length < 4) {
      setError("Please enter your current 4-digit PIN.");
      setCurrentError(true);
      return;
    }
    if (newPin.length < 4) {
      setError("Please enter a new 4-digit PIN.");
      setNewError(true);
      return;
    }
    if (confirmPin.length < 4) {
      setError("Please confirm your new PIN.");
      setConfirmError(true);
      return;
    }
    if (newPin !== confirmPin) {
      setError("New PIN and confirmation do not match. Please re-enter.");
      setNewError(true);
      setConfirmError(true);
      return;
    }
    if (newPin === currentPin) {
      setError("New PIN must be different from your current PIN.");
      setNewError(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/change-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ currentPin, newPin, confirmPin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to change PIN.");
        if (data.error?.toLowerCase().includes("current")) setCurrentError(true);
        else { setNewError(true); setConfirmError(true); }
        return;
      }
      setSuccess(true);
      toast.success("PIN changed successfully");
      reset();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#f4f6fb] min-h-screen">
      {/* Page hero */}
      <div className="bg-[#0f2557] px-4 pt-6 pb-10 flex items-start gap-3">
        <button
          onClick={() => navigate("/")}
          className="mt-0.5 text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-white font-black text-xl tracking-tight">Security Settings</h1>
          <p className="text-white/50 text-xs mt-1">Bash M. Money And Financial Services Ltd</p>
        </div>
      </div>

      <div className="px-4 -mt-6 pb-10 max-w-sm mx-auto w-full space-y-4">

        {/* Success card */}
        {success && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 text-center space-y-3">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-50 mx-auto">
              <CheckCircle2 className="w-7 h-7 text-emerald-500" />
            </div>
            <p className="font-black text-[#0f2557] text-lg">PIN Updated</p>
            <p className="text-sm text-muted-foreground">Your admin PIN has been changed successfully. Use your new PIN the next time you log in.</p>
            <Button
              className="w-full h-11 rounded-xl bg-[#0f2557] hover:bg-[#1a3570] text-white font-semibold mt-2"
              onClick={() => { setSuccess(false); reset(); }}
            >
              Change PIN Again
            </Button>
          </div>
        )}

        {/* Change PIN form */}
        {!success && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 text-center border-b border-gray-50">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#0f2557]/5 mb-3">
                <KeyRound className="w-6 h-6 text-[#0f2557]" />
              </div>
              <p className="font-black text-[#0f2557] text-base">Change Admin PIN</p>
              <p className="text-xs text-muted-foreground mt-0.5">Enter your current PIN, then choose a new one</p>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-6 space-y-7">

              {/* Current PIN */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#0f2557] text-white flex items-center justify-center text-[10px] font-black flex-shrink-0">1</div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#0f2557]">Current PIN</label>
                </div>
                <PinInput
                  length={4}
                  value={currentPin}
                  onChange={(v) => { setCurrentPin(v); setCurrentError(false); setError(""); }}
                  disabled={loading}
                  autoFocus
                  error={currentError}
                />
                {currentError && !newError && (
                  <p className="text-xs text-red-500 text-center font-medium">Incorrect current PIN</p>
                )}
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-dashed border-gray-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-2 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Then</span>
                </div>
              </div>

              {/* New PIN */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#c9a144] text-white flex items-center justify-center text-[10px] font-black flex-shrink-0">2</div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#0f2557]">New PIN</label>
                </div>
                <PinInput
                  length={4}
                  value={newPin}
                  onChange={(v) => { setNewPin(v); setNewError(false); setError(""); }}
                  disabled={loading}
                  error={newError}
                />
              </div>

              {/* Confirm PIN */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#c9a144] text-white flex items-center justify-center text-[10px] font-black flex-shrink-0">3</div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#0f2557]">Confirm New PIN</label>
                </div>
                <PinInput
                  length={4}
                  value={confirmPin}
                  onChange={(v) => { setConfirmPin(v); setConfirmError(false); setError(""); }}
                  onComplete={(v) => {
                    setConfirmPin(v);
                    if (newPin && v === newPin && currentPin.length === 4) {
                      setTimeout(() => document.getElementById("change-pin-btn")?.click(), 100);
                    }
                  }}
                  disabled={loading}
                  error={confirmError}
                />
                {confirmError && newPin !== confirmPin && confirmPin.length === 4 && (
                  <p className="text-xs text-red-500 text-center font-medium">PINs do not match</p>
                )}
              </div>

              {/* Error message */}
              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-center">
                  <p className="text-sm text-red-600 font-medium">{error}</p>
                </div>
              )}

              {/* Submit */}
              <Button
                id="change-pin-btn"
                type="submit"
                className="w-full h-12 rounded-xl bg-[#0f2557] hover:bg-[#1a3570] text-white font-bold text-sm"
                disabled={loading || currentPin.length < 4 || newPin.length < 4 || confirmPin.length < 4}
              >
                {loading ? "Updating PIN…" : "Update PIN"}
              </Button>
            </form>
          </div>
        )}

        {/* Security info card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-[#c9a144] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-[#0f2557]">PIN Security Tips</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              Use a unique 4-digit PIN that's not your birth year or an obvious sequence (1234, 0000). Your PIN is stored securely using industry-standard encryption.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
