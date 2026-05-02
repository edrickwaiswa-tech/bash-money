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
import { toast } from "sonner";
import {
  Wallet, Landmark, LogOut, FileDown, TrendingUp, TrendingDown,
  User, Phone, CreditCard, Calendar, RefreshCw, Bell, BellOff,
  CheckCheck, ArrowUpCircle, ArrowDownCircle,
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

  useEffect(() => {
    fetch(`${BASE}/api/auth/member/me`, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.memberId) {
          setMemberId(data.memberId);
        } else {
          navigate("/my-account");
        }
      })
      .catch(() => navigate("/my-account"))
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
    if (memberId) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30_000);
      return () => clearInterval(interval);
    }
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
    navigate("/my-account");
  };

  const handleExportPDF = () => {
    if (!profile || !ledger) return;
    setIsExporting(true);
    try {
      exportMemberStatementPDF(profile, ledger);
      toast.success("Statement exported as PDF");
    } catch {
      toast.error("Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          <p className="text-sm">Loading your account…</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const tabs = [
    { key: "ledger" as const, label: "Transactions" },
    { key: "notifications" as const, label: "Alerts", badge: unreadCount },
    { key: "profile" as const, label: "Profile" },
  ];

  return (
    <div className="min-h-[100dvh] bg-gray-50 dark:bg-zinc-950 flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-white px-2 py-1 rounded-lg">
            <span className="font-black text-xs tracking-tight">NJF</span>
          </div>
          <span className="font-black text-sm tracking-tight">NJF Ledger</span>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={() => setActiveTab("notifications")}
              className="relative text-muted-foreground hover:text-primary transition-colors"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1.5 -right-1.5 bg-destructive text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            </button>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-5 space-y-5 pb-24">
        {/* Welcome */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
            {initials}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Welcome back</p>
            <h1 className="text-lg font-bold leading-tight">{profile.name}</h1>
          </div>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-primary">
                <Wallet className="h-3.5 w-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">Total Savings</span>
              </div>
              <span className="text-lg font-bold text-primary">
                {formatCurrency(profile.totalSavings)}
              </span>
            </CardContent>
          </Card>
          <Card className="bg-destructive/5 border-destructive/20">
            <CardContent className="p-4 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-destructive">
                <Landmark className="h-3.5 w-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">Loan Balance</span>
              </div>
              <span className="text-lg font-bold text-destructive">
                {formatCurrency(profile.outstandingLoan)}
              </span>
            </CardContent>
          </Card>
        </div>

        {/* Net Balance bar */}
        <div className="flex justify-between items-center bg-white dark:bg-zinc-900 border rounded-xl px-4 py-3 shadow-sm">
          <div>
            <p className="text-xs text-muted-foreground">Net Balance</p>
            <p className={`text-xl font-bold ${profile.currentBalance >= 0 ? "text-primary" : "text-destructive"}`}>
              {formatCurrency(profile.currentBalance)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
            {ledger && (
              <>
                <span className="flex items-center gap-1 text-primary">
                  <TrendingUp className="w-3 h-3" />
                  +{formatCurrency(ledger.totalCredits)}
                </span>
                <span className="flex items-center gap-1 text-destructive">
                  <TrendingDown className="w-3 h-3" />
                  -{formatCurrency(ledger.totalDebits)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                activeTab === tab.key
                  ? "bg-white dark:bg-zinc-900 shadow-sm text-foreground"
                  : "text-muted-foreground"
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
              <h2 className="font-semibold text-sm">Transaction History</h2>
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportPDF}
                disabled={isExporting || ledgerLoading || !ledger}
                className="gap-1.5 h-8 text-xs"
              >
                <FileDown className="h-3.5 w-3.5" />
                {isExporting ? "Exporting..." : "Export PDF"}
              </Button>
            </div>
            <Card>
              <div className="divide-y divide-border">
                {ledgerLoading ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
                ) : !ledger?.entries.length ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">No transactions yet</div>
                ) : (
                  [...(ledger.entries ?? [])].reverse().map((entry) => (
                    <div key={entry.id} className="p-4 text-sm">
                      <div className="flex justify-between items-start mb-1">
                        <div className="font-medium">{formatTransactionType(entry.type)}</div>
                        <div className={`font-semibold ${entry.direction === "credit" ? "text-primary" : "text-destructive"}`}>
                          {entry.direction === "credit" ? "+" : "-"}{formatCurrency(entry.amount)}
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>{formatDate(entry.createdAt)}</span>
                        <span>
                          Bal:{" "}
                          <span className={`font-medium ${entry.runningBalance >= 0 ? "text-primary" : "text-destructive"}`}>
                            {formatCurrency(entry.runningBalance)}
                          </span>
                        </span>
                      </div>
                      {entry.notes && (
                        <div className="mt-1.5 text-xs text-muted-foreground bg-muted px-2 py-1.5 rounded">
                          {entry.notes}
                        </div>
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
              <h2 className="font-semibold text-sm">Account Alerts</h2>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
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
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                <BellOff className="w-8 h-8 opacity-40" />
                <p className="text-sm">No alerts yet</p>
                <p className="text-xs text-center max-w-[200px]">
                  You'll be notified here whenever a transaction is posted to your account
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`rounded-xl border p-4 transition-colors ${
                      n.read
                        ? "bg-white dark:bg-zinc-900 border-border"
                        : n.direction === "credit"
                        ? "bg-primary/5 border-primary/30"
                        : "bg-destructive/5 border-destructive/20"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex-shrink-0 rounded-full p-1.5 ${
                          n.direction === "credit"
                            ? "bg-primary/10 text-primary"
                            : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {n.direction === "credit" ? (
                          <ArrowUpCircle className="w-4 h-4" />
                        ) : (
                          <ArrowDownCircle className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <span className="text-sm font-semibold">
                            {formatTransactionType(n.type)}
                          </span>
                          <span
                            className={`text-sm font-bold flex-shrink-0 ${
                              n.direction === "credit" ? "text-primary" : "text-destructive"
                            }`}
                          >
                            {n.direction === "credit" ? "+" : "-"}{formatCurrency(n.amount)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {n.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] text-muted-foreground">{formatDate(n.createdAt)}</span>
                          {!n.read && (
                            <span className="text-[9px] bg-primary text-white px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider">
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
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-base flex-shrink-0">
                  {initials}
                </div>
                <div>
                  <p className="font-semibold">{profile.name}</p>
                  <p className="text-xs text-muted-foreground">Member</p>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { icon: User, label: "Full Name", value: profile.name },
                  { icon: Phone, label: "Phone Number", value: profile.phone },
                  { icon: CreditCard, label: "Member ID", value: profile.idNumber },
                  { icon: Calendar, label: "Member Since", value: formatDate(profile.joinDate) },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
                      <p className="text-sm font-medium">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
