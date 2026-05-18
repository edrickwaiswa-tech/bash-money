import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import {
  useGetMember, getGetMemberQueryKey,
  useGetMemberLedger, getGetMemberLedgerQueryKey,
} from "@workspace/api-client-react";
import { formatCurrency, formatDate, formatTransactionType } from "@/lib/format";
import { exportMemberStatementPDF } from "@/lib/pdf-export";
import { Button } from "@/components/ui/button";
import { PinInput } from "@/components/pin-input";
import { MemberAvatar } from "@/components/member-avatar";
import { BmmLogo } from "@/components/bmm-logo";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Wallet, Landmark, LogOut, FileDown, TrendingUp, TrendingDown,
  User, Phone, CreditCard, Calendar, RefreshCw, Bell, BellOff,
  CheckCheck, ArrowUpCircle, ArrowDownCircle, Hash,
  KeyRound, CheckCircle2, AlertCircle, ShieldCheck,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Notification {
  id: number;
  transactionRef: string;
  type: string;
  amount: number;
  direction: "credit" | "debit";
  message: string;
  read: boolean;
  createdAt: string;
}

export function MemberPortal() {
  const [, navigate] = useLocation();
  const [memberId, setMemberId]       = useState<number | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab]     = useState<"ledger" | "notifications" | "profile">("ledger");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [notifsLoading, setNotifsLoading] = useState(false);
  const [avatarErr, setAvatarErr]         = useState(false);

  // Logout confirmation
  const [showLogout, setShowLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Change PIN state
  const [cpCurrent, setCpCurrent]       = useState("");
  const [cpNew, setCpNew]               = useState("");
  const [cpConfirm, setCpConfirm]       = useState("");
  const [cpLoading, setCpLoading]       = useState(false);
  const [cpError, setCpError]           = useState("");
  const [cpCurrentErr, setCpCurrentErr] = useState(false);
  const [cpSuccess, setCpSuccess]       = useState(false);

  useEffect(() => {
    fetch(`${BASE}/api/auth/member/me`, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.memberId) {
          if (data.requiresPasswordReset) {
            navigate("/my-account/force-set-pin");
          } else {
            setMemberId(data.memberId);
          }
        } else {
          navigate("/login");
        }
      })
      .catch(() => navigate("/login"))
      .finally(() => setAuthLoading(false));
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    const r = await fetch(`${BASE}/api/member/notifications/unread-count`, { credentials: "same-origin" });
    if (r.ok) { const d = await r.json(); setUnreadCount(d.count ?? 0); }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setNotifsLoading(true);
    const r = await fetch(`${BASE}/api/member/notifications`, { credentials: "same-origin" });
    if (r.ok) {
      const data = await r.json();
      setNotifications(data);
      setUnreadCount(data.filter((n: Notification) => !n.read).length);
    }
    setNotifsLoading(false);
  }, []);

  const markAllRead = async () => {
    await fetch(`${BASE}/api/member/notifications/read-all`, { method: "PATCH", credentials: "same-origin" });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  useEffect(() => {
    if (!memberId) return;
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30_000);
    return () => clearInterval(interval);
  }, [memberId, fetchUnreadCount]);

  useEffect(() => {
    if (activeTab === "notifications" && memberId) fetchNotifications();
  }, [activeTab, memberId, fetchNotifications]);

  const { data: profile, isLoading: profileLoading } = useGetMember(memberId ?? 0, {
    query: { enabled: !!memberId, queryKey: getGetMemberQueryKey(memberId ?? 0) },
  });

  const { data: ledger, isLoading: ledgerLoading } = useGetMemberLedger(memberId ?? 0, {
    query: { enabled: !!memberId, queryKey: getGetMemberLedgerQueryKey(memberId ?? 0) },
  });

  const handleLogoutConfirmed = async () => {
    setLoggingOut(true);
    try {
      await fetch(`${BASE}/api/auth/member/logout`, { method: "POST", credentials: "same-origin" });
      navigate("/login");
    } finally {
      setLoggingOut(false);
      setShowLogout(false);
    }
  };

  const handleExportPDF = async () => {
    if (!profile || !ledger) return;
    setIsExporting(true);
    try {
      await exportMemberStatementPDF(profile, ledger);
      toast.success("Statement exported as PDF");
    } catch {
      toast.error("Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const handleChangePin = async () => {
    setCpError(""); setCpCurrentErr(false);
    if (cpNew.length < 4) { setCpError("New PIN must be 4 digits"); return; }
    if (cpNew !== cpConfirm) { setCpError("New PIN and confirmation do not match"); return; }
    setCpLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/member/change-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ currentPin: cpCurrent || undefined, newPin: cpNew, confirmPin: cpConfirm }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error?.toLowerCase().includes("current")) setCpCurrentErr(true);
        setCpError(data.error ?? "Failed to change PIN");
      } else {
        setCpSuccess(true);
        setCpCurrent(""); setCpNew(""); setCpConfirm("");
        setTimeout(() => setCpSuccess(false), 4000);
      }
    } catch {
      setCpError("Network error. Please try again.");
    } finally {
      setCpLoading(false);
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#f4f6fb]">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <RefreshCw className="w-6 h-6 animate-spin text-[#B03060]" />
          <p className="text-sm">Loading your account…</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const photoUrl    = (profile as any).profilePictureUrl ?? null;
  const accountNo   = (profile as any).accountNumber ?? null;
  const initials    = profile.name.trim().split(/\s+/).map((n: string) => n[0]?.toUpperCase() ?? "").slice(0, 2).join("");

  const tabs = [
    { key: "ledger"        as const, label: "Transactions" },
    { key: "notifications" as const, label: "Alerts",  badge: unreadCount },
    { key: "profile"       as const, label: "Profile"  },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col max-w-lg mx-auto bg-[#f4f6fb]">

      {/* ── Header — white, logo + member pill (mirrors admin layout) ── */}
      <header
        className="sticky top-0 z-30 bg-white border-b border-gray-100"
        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
      >
        <div className="flex items-center justify-between px-4 h-[76px]">
          {/* Logo — same nav size as admin */}
          <BmmLogo size="nav" />

          <div className="flex items-center gap-2">
            {/* Notification bell */}
            {unreadCount > 0 && (
              <button
                onClick={() => setActiveTab("notifications")}
                className="relative text-gray-400 hover:text-[#B03060] transition-colors p-1.5"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute -top-0.5 -right-0.5 bg-[#B03060] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              </button>
            )}

            {/* Member identity pill — mirrors admin layout exactly */}
            <button
              onClick={() => setActiveTab("profile")}
              className="flex items-center gap-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full pl-3 pr-1.5 py-1 cursor-pointer transition-colors"
            >
              <div className="leading-none text-right">
                <p className="text-[11px] font-black text-[#1A1A1A] leading-tight truncate max-w-[90px]">
                  {profile.name.split(" ")[0]}
                </p>
                {accountNo && (
                  <p className="text-[9px] text-gray-400 leading-tight mt-0.5 font-mono tracking-wide">
                    {accountNo}
                  </p>
                )}
              </div>
              <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-[#B03060]/10 border-2 border-[#B03060]/30 flex items-center justify-center">
                {photoUrl && !avatarErr ? (
                  <img
                    src={photoUrl}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                    onError={() => setAvatarErr(true)}
                  />
                ) : (
                  <span className="text-[10px] font-black text-[#B03060]">{initials}</span>
                )}
              </div>
            </button>

            {/* Sign out */}
            <button
              onClick={() => setShowLogout(true)}
              className="flex items-center gap-1.5 text-gray-400 hover:text-[#B03060] hover:bg-[#B03060]/5 px-2 py-1.5 rounded-lg transition-colors text-xs font-semibold"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-5 space-y-4 pb-10">

        {/* ── Balance Cards ── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Total Savings */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-1.5 mb-3">
              <div className="w-7 h-7 rounded-xl bg-[#B03060]/8 flex items-center justify-center">
                <Wallet className="h-3.5 w-3.5 text-[#B03060]" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#B03060]">Total Savings</span>
            </div>
            <span className="text-xl font-black text-[#1A1A1A] leading-tight block">
              {formatCurrency(profile.totalSavings)}
            </span>
          </div>

          {/* Loan Balance */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-1.5 mb-3">
              <div className="w-7 h-7 rounded-xl bg-[#B03060]/8 flex items-center justify-center">
                <Landmark className="h-3.5 w-3.5 text-[#B03060]" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#B03060]">Loan Balance</span>
            </div>
            <span className="text-xl font-black text-[#1A1A1A] leading-tight block">
              {formatCurrency(profile.outstandingLoan)}
            </span>
          </div>
        </div>

        {/* ── Net Balance ── */}
        <div className="bg-white rounded-2xl px-5 py-4 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Net Balance</p>
            <p className={`text-2xl font-black leading-tight ${profile.currentBalance >= 0 ? "text-[#B03060]" : "text-destructive"}`}>
              {formatCurrency(profile.currentBalance)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 text-xs">
            {ledger && (
              <>
                <span className="flex items-center gap-1 text-emerald-600 font-bold">
                  <TrendingUp className="w-3 h-3" />
                  +{formatCurrency(ledger.totalCredits)}
                </span>
                <span className="flex items-center gap-1 text-gray-500 font-bold">
                  <TrendingDown className="w-3 h-3" />
                  -{formatCurrency(ledger.totalDebits)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* ── Tabs — burgundy active ── */}
        <div className="flex gap-1 bg-white rounded-xl p-1 border border-gray-100 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                activeTab === tab.key
                  ? "text-white shadow-sm"
                  : "text-gray-500 hover:text-[#1A1A1A]"
              }`}
              style={activeTab === tab.key
                ? { background: "linear-gradient(135deg, #B03060 0%, #7B1535 100%)" }
                : {}}
            >
              {tab.label}
              {tab.badge != null && tab.badge > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#B03060] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {tab.badge > 9 ? "9+" : tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── TRANSACTIONS TAB ── */}
        {activeTab === "ledger" && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="font-black text-sm text-[#1A1A1A]">Transaction History</h2>
              <button
                onClick={handleExportPDF}
                disabled={isExporting || ledgerLoading || !ledger}
                className="flex items-center gap-1.5 h-8 px-3 text-xs font-bold rounded-xl text-white transition-all disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #B03060 0%, #7B1535 100%)" }}
              >
                <FileDown className="h-3.5 w-3.5" />
                {isExporting ? "Exporting…" : "Export PDF"}
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {ledgerLoading ? (
                <div className="p-8 text-center text-sm text-gray-400">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-[#B03060]" />
                  Loading…
                </div>
              ) : !ledger?.entries.length ? (
                <div className="p-8 text-center text-gray-400 text-sm">No transactions yet</div>
              ) : (
                [...(ledger.entries ?? [])].reverse().map((entry, i) => (
                  <div
                    key={entry.id}
                    className={`px-4 py-3.5 border-b last:border-0 border-gray-50 ${i % 2 !== 0 ? "bg-gray-50/40" : ""}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          entry.direction === "credit" ? "bg-emerald-50" : "bg-red-50"
                        }`}>
                          {entry.direction === "credit"
                            ? <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                            : <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
                        </div>
                        <span className="font-bold text-[#1A1A1A] text-sm">{formatTransactionType(entry.type)}</span>
                      </div>
                      <span className={`font-black text-sm ${entry.direction === "credit" ? "text-emerald-600" : "text-red-500"}`}>
                        {entry.direction === "credit" ? "+" : "-"}{formatCurrency(entry.amount)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-400 pl-9">
                      <span>{formatDate(entry.createdAt)}</span>
                      <span>Bal: <span className={`font-black ${entry.runningBalance >= 0 ? "text-[#1A1A1A]" : "text-red-500"}`}>{formatCurrency(entry.runningBalance)}</span></span>
                    </div>
                    {entry.notes && (
                      <div className="mt-2 pl-9 text-xs text-gray-400 bg-gray-50 px-2 py-1.5 rounded-lg">{entry.notes}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── NOTIFICATIONS TAB ── */}
        {activeTab === "notifications" && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="font-black text-sm text-[#1A1A1A]">Account Alerts</h2>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-[#B03060] hover:underline font-bold">
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            {notifsLoading ? (
              <div className="p-8 text-center text-sm text-gray-400">
                <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-[#B03060]" />
                Loading alerts…
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <BellOff className="w-8 h-8 opacity-40" />
                <p className="text-sm font-bold text-[#1A1A1A]">No alerts yet</p>
                <p className="text-xs text-center max-w-[200px] text-gray-400">
                  You'll be notified here whenever a transaction is posted to your account
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`rounded-2xl border p-4 transition-colors ${
                      n.read ? "bg-white border-gray-100" : n.direction === "credit" ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 flex-shrink-0 rounded-xl p-1.5 ${
                        n.direction === "credit" ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-500"
                      }`}>
                        {n.direction === "credit"
                          ? <ArrowUpCircle className="w-4 h-4" />
                          : <ArrowDownCircle className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <span className="text-sm font-bold text-[#1A1A1A]">{formatTransactionType(n.type)}</span>
                          <span className={`text-sm font-black flex-shrink-0 ${n.direction === "credit" ? "text-emerald-600" : "text-red-500"}`}>
                            {n.direction === "credit" ? "+" : "-"}{formatCurrency(n.amount)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">{n.message}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] text-gray-400">{formatDate(n.createdAt)}</span>
                          {!n.read && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-white"
                              style={{ background: "linear-gradient(135deg, #B03060 0%, #7B1535 100%)" }}>
                              New
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PROFILE TAB ── */}
        {activeTab === "profile" && (
          <div className="space-y-3">
            {/* Profile card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Profile header strip */}
              <div
                className="px-5 py-5 flex items-center gap-4"
                style={{ background: "linear-gradient(135deg, #B03060 0%, #7B1535 100%)" }}
              >
                <div className="w-16 h-16 rounded-full overflow-hidden border-[3px] border-white/40 shadow-lg flex-shrink-0 bg-[#f9f0f3] flex items-center justify-center">
                  {photoUrl && !avatarErr ? (
                    <img src={photoUrl} alt={profile.name} className="w-full h-full object-cover" onError={() => setAvatarErr(true)} />
                  ) : (
                    <span className="text-xl font-black text-[#B03060]">{initials}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-black text-base leading-tight truncate">{profile.name}</p>
                  <p className="text-white/60 text-xs mt-0.5">Member Account</p>
                  {accountNo && (
                    <p className="text-white/70 text-[10px] font-mono font-bold mt-0.5 flex items-center gap-0.5">
                      <Hash className="w-2.5 h-2.5" />{accountNo}
                    </p>
                  )}
                </div>
              </div>

              {/* Account details */}
              <div className="px-5 py-4 space-y-4">
                {[
                  { icon: User,       label: "Full Name",    value: profile.name },
                  { icon: Phone,      label: "Phone Number", value: profile.phone },
                  { icon: Hash,       label: "Account No.",  value: accountNo ?? "—", mono: true },
                  { icon: CreditCard, label: "Member ID",    value: profile.idNumber },
                  { icon: Calendar,   label: "Member Since", value: formatDate(profile.joinDate) },
                ].map(({ icon: Icon, label, value, mono }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#B03060]/8 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-3.5 h-3.5 text-[#B03060]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">{label}</p>
                      <p className={`text-sm text-[#1A1A1A] truncate ${mono ? "font-mono font-black" : "font-semibold"}`}>{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Change PIN card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#B03060]/8 flex items-center justify-center flex-shrink-0">
                  <KeyRound className="w-3.5 h-3.5 text-[#B03060]" />
                </div>
                <div>
                  <p className="font-bold text-[#1A1A1A] text-sm">Security — Change PIN</p>
                  <p className="text-[10px] text-gray-400">Update your 4-digit login PIN</p>
                </div>
              </div>

              <div className="px-5 py-5 space-y-4">
                {cpSuccess ? (
                  <div className="flex flex-col items-center gap-2 py-4">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    <p className="text-sm font-bold text-emerald-700">PIN changed successfully!</p>
                    <p className="text-xs text-gray-400 text-center">Use your new PIN next time you sign in.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                        Current PIN <span className="normal-case font-normal">(leave blank if setting for the first time)</span>
                      </p>
                      <PinInput
                        length={4}
                        value={cpCurrent}
                        onChange={(v) => { setCpCurrent(v); setCpError(""); setCpCurrentErr(false); }}
                        disabled={cpLoading}
                        error={cpCurrentErr}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">New PIN</p>
                      <PinInput
                        length={4}
                        value={cpNew}
                        onChange={(v) => { setCpNew(v); setCpError(""); }}
                        disabled={cpLoading}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Confirm New PIN</p>
                      <PinInput
                        length={4}
                        value={cpConfirm}
                        onChange={(v) => { setCpConfirm(v); setCpError(""); }}
                        onComplete={() => { if (cpNew.length === 4) handleChangePin(); }}
                        disabled={cpLoading}
                      />
                    </div>

                    {cpError && (
                      <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl text-center font-medium">{cpError}</p>
                    )}

                    <button
                      className="w-full h-10 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, #B03060 0%, #7B1535 100%)" }}
                      onClick={handleChangePin}
                      disabled={cpLoading || cpNew.length < 4 || cpConfirm.length < 4}
                    >
                      {cpLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving…
                        </span>
                      ) : "Change PIN"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Branding footer */}
      <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-400 py-3 pb-6">
        <ShieldCheck className="w-3 h-3 text-[#B03060] flex-shrink-0" />
        <span>Bash M. Money And Financial Services Ltd — Secured &amp; Encrypted</span>
      </div>

      {/* ── Logout confirmation modal ── */}
      <Dialog open={showLogout} onOpenChange={(open) => !loggingOut && setShowLogout(open)}>
        <DialogContent
          className="rounded-3xl border-0 p-0 overflow-hidden max-w-[320px] mx-auto"
          style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.15)" }}
        >
          <div className="px-6 pt-7 pb-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#B03060]/8 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-7 h-7 text-[#B03060]" />
            </div>
            <DialogTitle className="text-[#1A1A1A] font-black text-lg leading-tight">Sign out?</DialogTitle>
            <p className="text-gray-500 text-sm mt-2 leading-relaxed">
              Are you sure you want to log out of your account?
            </p>
          </div>

          <DialogFooter className="flex-col gap-2.5 px-6 pb-7">
            <Button
              variant="outline"
              className="w-full h-11 rounded-2xl border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50"
              onClick={() => setShowLogout(false)}
              disabled={loggingOut}
            >
              Stay Logged In
            </Button>
            <button
              onClick={handleLogoutConfirmed}
              disabled={loggingOut}
              className="w-full h-11 rounded-2xl text-white font-bold text-sm transition-all disabled:opacity-60 cursor-pointer"
              style={{ background: "linear-gradient(135deg, #B03060 0%, #7B1535 100%)" }}
            >
              {loggingOut ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Signing out…
                </span>
              ) : "Yes, Log Out"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
