import { Link } from "wouter";
import { BmmLogo } from "@/components/bmm-logo";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldCheck, Phone, KeyRound } from "lucide-react";

export function ForgotPin() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#f4f6fb]">
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
          <div className="px-6 pt-8 pb-6 text-center border-b border-gray-50">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#B03060]/8 mb-4">
              <KeyRound className="w-7 h-7 text-[#B03060]" />
            </div>
            <p className="font-black text-[#1A1A1A] text-lg">Forgot Your PIN?</p>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Please contact the administrator to reset your member PIN. SMS reset is not enabled for this app yet.
            </p>
          </div>

          <div className="px-6 py-6 space-y-4">
            <div className="bg-[#B03060]/5 border border-[#B03060]/10 rounded-2xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#B03060] mt-0.5 flex-shrink-0" />
                <p className="text-sm text-[#7B1535] leading-relaxed">
                  The admin can open your member profile and set a new 4-digit PIN for you. You can change it later after logging in.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Phone className="w-3.5 h-3.5" />
                <span>Use your registered phone number or account number when asking for help.</span>
              </div>
            </div>

            <Button asChild className="w-full h-11 rounded-xl text-white font-semibold" style={{ background: "linear-gradient(135deg, #B03060 0%, #7B1535 100%)" }}>
              <Link href="/login">Back to Sign In</Link>
            </Button>

            <div className="text-center">
              <Link href="/login" className="text-sm text-muted-foreground hover:text-[#B03060] inline-flex items-center gap-1 transition-colors font-medium">
                <ArrowLeft className="w-3 h-3" /> Return to member login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
