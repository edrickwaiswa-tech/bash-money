import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import {
  useGetMember, getGetMemberQueryKey,
  useGetMemberLedger, getGetMemberLedgerQueryKey,
} from "@workspace/api-client-react";
import { formatCurrency, formatDate, formatTransactionType } from "@/lib/format";
import { exportMemberStatementPDF } from "@/lib/pdf-export";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PinInput } from "@/components/pin-input";
import { MemberAvatar } from "@/components/member-avatar";
import { toast } from "sonner";
import {
  Wallet, Landmark, LogOut, FileDown, TrendingUp, TrendingDown,
  User, Phone, CreditCard, Calendar, RefreshCw, Bell, BellOff,
  CheckCheck, ArrowUpCircle, ArrowDownCircle, ShieldCheck, Hash,
  KeyRound, CheckCircle2,
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
  const [memberId, setMemberId] = useState<number | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<"ledger" | "notifications" | "profile">("ledger");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifsLoading, setNotifsLoading] = useState(false);

  // Change PIN state
  const [cpCurrent, setCpCurrent] = useState("");
  const [cpNew, setCpNew] = useState("");
  const [cpConfirm, setCpConfirm] = useState("");
  const [cpLoading, setCpLoading] = useState(false);
  const [cpError, setCpError] = useState("");
  const [cpCurrentErr, setCpCurrentErr] = useState(false);
  const [cpSuccess, setCpSuccess] = useState(false);

  useEffect(() => {
    fetch(`${BASE}/api/auth/member/me`, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.memberId) {
          setMemberId(data.memberId);
        } else {
          navigate("/login");
        }
      })
      .catch(() => navigate("/login"))
      .finally(() => setAuthLoading(false));
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    const r = await fetch(`${BASE}/api/member/notifications/unread-count`, {
      credentials: "same-origin",
    });
    if (r.ok) {
      const d = await r.json();
      setUnreadCount(d.count ?? 0);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setNotifsLoading(true);
    const r = await fetch(`${BASE}/api/member/notifications`, {
      credentials: "same-origin",
    });
    if (r.ok) {
      const data = await r.json();
      setNotifications(data);
      setUnreadCount(data.filter((n: Notification) => !n.read).length);
    }
    setNotifsLoading(false);
  }, []);

  const markAllRead = async () => {
    await fetch(`${BASE}/api/member/notifications/read-all`, {
      method: "PATCH",
      credentials: "same-origin",
    });
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
    if (activeTab === "notifications" && memberId) {
      fetchNotifications();
    }
  }, [activeTab, memberId, fetchNotifications]);

  const { data: profile, isLoading: profileLoading } = useGetMember(memberId ?? 0, {
    query: { enabled: !!memberId, queryKey: getGetMemberQueryKey(memberId ?? 0) },
  });

  const { data: ledger, isLoading: ledgerLoading } = useGetMemberLedger(memberId ?? 0, {
    query: { enabled: !!memberId, queryKey: getGetMemberLedgerQueryKey(memberId ?? 0) },
  });

  const handleLogout = async () => {
    await fetch(`${BASE}/api/auth/member/logout`, {
      method: "POST",
      credentials: "same-origin",
    });
    navigate("/login");
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
    setCpError("");
    setCpCurrentErr(false);
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
        if (data.error?.toLowerCase().includes("current")) {
          setCpCurrentErr(true);
        }
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
          <RefreshCw className="w-6 h-6 animate-spin text-[#0f2557]" />
          <p className="text-sm">Loading your account…</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const tabs = [
    { key: "ledger" as const, label: "Transactions" },
    { key: "notifications" as const, label: "Alerts", badge: unreadCount },
    { key: "profile" as const, label: "Profile" },
  ];

  return (
    <div className="min-h-[100dvh] bg-[#f4f6fb] flex flex-col max-w-lg mx-auto">

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-[#0f2557] px-4 h-14 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="bg-[#c9a144] text-[#0f2557] px-2 py-1 rounded-lg">
            <span className="font-black text-xs tracking-tight">BMM</span>
          </div>
          <span className="font-black text-sm tracking-tight text-white">My Account</span>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={() => setActiveTab("notifications")}
              className="relative text-white/70 hover:text-white transition-colors"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1.5 -right-1.5 bg-destructive text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            </button>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-5 space-y-4 pb-24">

        {/* ── Welcome banner ── */}
        <div className="bg-white rounded-2xl px-4 py-4 flex items-center gap-3 shadow-sm border border-gray-100">
          <MemberAvatar
            name={profile.name}
            photoUrl={(profile as any).profilePictureUrl}
            size="lg"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Welcome back</p>
            <h1 className="text-base font-black text-[#0f2557] leading-tight truncate">{profile.name}</h1>
            {(profile as any).accountNumber && (
              <p className="text-[10px] font-mono text-[#c9a144] font-bold mt-0.5 flex items-center gap-0.5">
                <Hash className="w-2.5 h-2.5" />{(profile as any).accountNumber}
              </p>
            )}
          </div>
        </div>

        {/* ── Balance Cards ── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-[#0f2557]/10 shadow-sm">
            <div className="flex items-center gap-1.5 text-[#0f2557] mb-1.5">
              <Wallet className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Total Savings</span>
            </div>
            <span className="text-lg font-black text-[#0f2557]">
              {formatCurrency(profile.totalSavings)}
            </span>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-destructive/10 shadow-sm">
            <div className="flex items-center gap-1.5 text-destructive mb-1.5">
              <Landmark className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Loan Balance</span>
            </div>
            <span className="text-lg font-black text-destructive">
              {formatCurrency(profile.outstandingLoan)}
            </span>
          </div>
        </div>

        {/* ── Net Balance ── */}
        <div className="bg-white rounded-2xl px-4 py-3.5 flex items-center justify-between border border-[#c9a144]/20 shadow-sm"
          style={{ boxShadow: "0 2px 12px rgba(15,37,87,0.08)" }}
        >
          <div>
            <p className="text-xs text-muted-foreground font-medium">Net Balance</p>
            <p className={`text-xl font-black ${profile.currentBalance >= 0 ? "text-[#0f2557]" : "text-destructive"}`}>
              {formatCurrency(profile.currentBalance)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
            {ledger && (
              <>
                <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                  <TrendingUp className="w-3 h-3" />
                  +{formatCurrency(ledger.totalCredits)}
                </span>
                <span className="flex items-center gap-1 text-destructive font-semibold">
                  <TrendingDown className="w-3 h-3" />
                  -{formatCurrency(ledger.totalDebits)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-white rounded-xl p-1 border border-gray-100 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                activeTab === tab.key
                  ? "bg-[#0f2557] text-white shadow-sm"
                  : "text-muted-foreground hover:text-[#0f2557]"
              }`}
            >
              {tab.label}
              {tab.badge != null && tab.badge > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
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
              <h2 className="font-bold text-sm text-[#0f2557]">Transaction History</h2>
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportPDF}
                disabled={isExporting || ledgerLoading || !ledger}
                className="gap-1.5 h-8 text-xs rounded-xl border-[#0f2557]/20 text-[#0f2557]"
              >
                <FileDown className="h-3.5 w-3.5" />
                {isExporting ? "Exporting..." : "Export PDF"}
              </Button>
            </div>
            <Card className="rounded-2xl border-gray-100 shadow-sm">
              <div className="divide-y divide-gray-50">
                {ledgerLoading ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-[#0f2557]" />
                    Loading…
                  </div>
                ) : !ledger?.entries.length ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">No transactions yet</div>
                ) : (
                  [...(ledger.entries ?? [])].reverse().map((entry) => (
                    <div key={entry.id} className="p-4 text-sm">
                      <div className="flex justify-between items-start mb-1">
                        <div className="font-semibold text-[#0f2557]">{formatTransactionType(entry.type)}</div>
                        <div className={`font-black ${entry.direction === "credit" ? "text-emerald-600" : "text-destructive"}`}>
                          {entry.direction === "credit" ? "+" : "-"}{formatCurrency(entry.amount)}
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>{formatDate(entry.createdAt)}</span>
                        <span>Bal: <span className={`font-semibold ${entry.runningBalance >= 0 ? "text-[#0f2557]" : "text-destructive"}`}>{formatCurrency(entry.runningBalance)}</span></span>
                      </div>
                      {entry.notes && (
                        <div className="mt-1.5 text-xs text-muted-foreground bg-muted px-2 py-1.5 rounded-lg">{entry.notes}</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}

        {/* ── NOTIFICATIONS TAB ── */}
        {activeTab === "notifications" && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-sm text-[#0f2557]">Account Alerts</h2>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-[#0f2557] hover:underline font-semibold">
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            {notifsLoading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2" />
                Loading alerts…
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground bg-white rounded-2xl border border-gray-100">
                <BellOff className="w-8 h-8 opacity-40" />
                <p className="text-sm font-medium">No alerts yet</p>
                <p className="text-xs text-center max-w-[200px]">You'll be notified here whenever a transaction is posted to your account</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`rounded-xl border p-4 transition-colors ${
                      n.read ? "bg-white border-gray-100" : n.direction === "credit" ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 flex-shrink-0 rounded-full p-1.5 ${n.direction === "credit" ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-500"}`}>
                        {n.direction === "credit" ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <span className="text-sm font-semibold text-[#0f2557]">{formatTransactionType(n.type)}</span>
                          <span className={`text-sm font-black flex-shrink-0 ${n.direction === "credit" ? "text-emerald-600" : "text-destructive"}`}>
                            {n.direction === "credit" ? "+" : "-"}{formatCurrency(n.amount)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{n.message}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] text-muted-foreground">{formatDate(n.createdAt)}</span>
                          {!n.read && (
                            <span className="text-[9px] bg-[#0f2557] text-white px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider">New</span>
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
            <Card className="rounded-2xl border-gray-100 shadow-sm">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-50">
                  <MemberAvatar
                    name={profile.name}
                    photoUrl={(profile as any).profilePictureUrl}
                    size="lg"
                  />
                  <div>
                    <p className="font-black text-[#0f2557]">{profile.name}</p>
                    <p className="text-xs text-muted-foreground">Member</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { icon: User,       label: "Full Name",     value: profile.name },
                    { icon: Phone,      label: "Phone Number",  value: profile.phone },
                    { icon: Hash,       label: "Account No.",   value: (profile as any).accountNumber ?? "—", mono: true },
                    { icon: CreditCard, label: "Member ID",     value: profile.idNumber },
                    { icon: Calendar,   label: "Member Since",  value: formatDate(profile.joinDate) },
                  ].map(({ icon: Icon, label, value, mono }) => (
                    <div key={label} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#0f2557]/5 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-3.5 h-3.5 text-[#0f2557]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
                        <p className={`text-sm text-[#0f2557] truncate ${mono ? "font-mono font-black" : "font-semibold"}`}>{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Change PIN card */}
            <Card className="rounded-2xl border-[#c9a144]/20 shadow-sm">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
                  <div className="w-7 h-7 rounded-lg bg-[#c9a144]/10 flex items-center justify-center flex-shrink-0">
                    <KeyRound className="w-3.5 h-3.5 text-[#c9a144]" />
                  </div>
                  <div>
                    <p className="font-bold text-[#0f2557] text-sm">Security — Change PIN</p>
                    <p className="text-[10px] text-muted-foreground">Update your 4-digit login PIN</p>
                  </div>
                </div>

                {cpSuccess ? (
                  <div className="flex flex-col items-center gap-2 py-4">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    <p className="text-sm font-bold text-emerald-700">PIN changed successfully!</p>
                    <p className="text-xs text-muted-foreground text-center">Use your new PIN next time you sign in.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
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
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">New PIN</p>
                      <PinInput
                        length={4}
                        value={cpNew}
                        onChange={(v) => { setCpNew(v); setCpError(""); }}
                        disabled={cpLoading}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Confirm New PIN</p>
                      <PinInput
                        length={4}
                        value={cpConfirm}
                        onChange={(v) => { setCpConfirm(v); setCpError(""); }}
                        onComplete={() => { if (cpNew.length === 4) handleChangePin(); }}
                        disabled={cpLoading}
                      />
                    </div>

                    {cpError && (
                      <p className="text-xs text-destructive bg-destructive/8 px-3 py-2 rounded-xl text-center font-medium">{cpError}</p>
                    )}

                    <Button
                      className="w-full h-10 rounded-xl bg-[#0f2557] hover:bg-[#1a3570] text-white font-semibold text-sm"
                      onClick={handleChangePin}
                      disabled={cpLoading || cpNew.length < 4 || cpConfirm.length < 4}
                    >
                      {cpLoading ? (
                        <span className="flex items-center gap-2">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving…
                        </span>
                      ) : "Change PIN"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
