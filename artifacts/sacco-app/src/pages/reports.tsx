import { useState, useEffect, useCallback } from "react";
import { formatCurrency, formatTransactionType } from "@/lib/format";
import { useAuth } from "@/contexts/auth";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, Activity, FileDown, RefreshCw, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportReportPDF } from "@/lib/pdf-export";

const BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") || import.meta.env.BASE_URL.replace(/\/$/, "");

type Period = "daily" | "weekly" | "monthly" | "custom";

interface ReportTx {
  id: number;
  transactionRef: string;
  memberId: number;
  memberName: string;
  accountNumber: string;
  type: string;
  direction: "credit" | "debit";
  amount: number;
  notes?: string | null;
  createdAt: string;
}

interface ReportSummary {
  totalDeposits: number;
  totalWithdrawals: number;
  netCashFlow: number;
}

interface ReportData {
  from: string;
  to: string;
  transactions: ReportTx[];
  summary: ReportSummary;
}

function todayMidnight(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function getRangeForPeriod(period: Period, customFrom: string, customTo: string): { from: Date; to: Date } {
  const now = new Date();
  if (period === "daily") {
    const from = todayMidnight();
    const to = new Date(from);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }
  if (period === "weekly") {
    const from = new Date(now);
    from.setDate(now.getDate() - 6);
    from.setHours(0, 0, 0, 0);
    return { from, to: now };
  }
  if (period === "monthly") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return { from, to: now };
  }
  const from = customFrom ? new Date(customFrom + "T00:00:00") : todayMidnight();
  const to   = customTo   ? new Date(customTo   + "T23:59:59") : now;
  return { from, to };
}

function periodLabel(period: Period, customFrom: string, customTo: string): string {
  if (period === "daily")   return `Today, ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`;
  if (period === "weekly")  return "Last 7 Days";
  if (period === "monthly") return new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  if (customFrom && customTo) {
    const f = new Date(customFrom).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    const t = new Date(customTo).toLocaleDateString("en-GB",   { day: "numeric", month: "short", year: "numeric" });
    return `${f} – ${t}`;
  }
  return "Custom Range";
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function Reports() {
  const { user } = useAuth();

  const [period, setPeriod]         = useState<Period>("daily");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo]     = useState("");

  const [data, setData]         = useState<ReportData | null>(null);
  const [loading, setLoading]   = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchReport = useCallback(async () => {
    const { from, to } = getRangeForPeriod(period, customFrom, customTo);
    setLoading(true);
    try {
      const url = `${BASE}/api/reports/transactions?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
      const res = await fetch(url, { credentials: "same-origin" });
      if (!res.ok) throw new Error("Failed to fetch report");
      setData(await res.json());
    } catch {
      toast.error("Could not load report data");
    } finally {
      setLoading(false);
    }
  }, [period, customFrom, customTo]);

  useEffect(() => {
    if (period !== "custom") fetchReport();
  }, [period]);

  const handleExportPDF = async () => {
    if (!data) return;
    setExporting(true);
    try {
      const label = periodLabel(period, customFrom, customTo);
      await exportReportPDF(data, label, user?.fullName ?? user?.username ?? "Administrator", user?.profilePictureUrl ?? null, user?.employeeId);
      toast.success("Report PDF exported");
    } catch {
      toast.error("PDF export failed");
    } finally {
      setExporting(false);
    }
  };

  const PERIODS: { key: Period; label: string }[] = [
    { key: "daily",   label: "Daily"   },
    { key: "weekly",  label: "Weekly"  },
    { key: "monthly", label: "Monthly" },
    { key: "custom",  label: "Custom"  },
  ];

  const label = periodLabel(period, customFrom, customTo);

  return (
    <div className="min-h-screen">
      {/* Page header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-black text-[#0f2557] leading-tight">Financial Reports</h1>
            <p className="text-gray-400 text-xs mt-0.5">Bash M. Money And Financial Services Ltd</p>
          </div>
          <Button
            size="sm"
            onClick={handleExportPDF}
            disabled={exporting || !data || loading}
            className="gap-1.5 h-9 text-white font-bold rounded-xl text-xs shadow-md disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #B03060 0%, #7B1535 100%)" }}
          >
            <FileDown className="w-3.5 h-3.5" />
            {exporting ? "Exporting…" : "Print Report"}
          </Button>
        </div>
      </div>

      <div className="px-4 space-y-4 pb-10">

        {/* Period filter bar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-1.5 flex gap-1"
          style={{ boxShadow: "0 2px 8px rgba(15,37,87,0.06)" }}>
          {PERIODS.map(({ key, label: lbl }) => (
            <button
              key={key}
              onClick={() => {
                setPeriod(key);
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                period === key
                  ? "text-white shadow-sm"
                  : "text-gray-400 hover:text-[#0f2557]"
              }`}
              style={period === key ? { background: "linear-gradient(135deg, #B03060 0%, #7B1535 100%)" } : {}}
            >
              {lbl}
            </button>
          ))}
        </div>

        {/* Custom date range */}
        {period === "custom" && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3"
            style={{ boxShadow: "0 2px 8px rgba(15,37,87,0.06)" }}>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#c9a144]" />
              <span className="text-sm font-bold text-[#0f2557]">Custom Date Range</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">From</label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-[#0f2557] focus:outline-none focus:ring-2 focus:ring-[#B03060]/30 focus:border-[#B03060]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">To</label>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-[#0f2557] focus:outline-none focus:ring-2 focus:ring-[#B03060]/30 focus:border-[#B03060]"
                />
              </div>
            </div>
            <Button
              className="w-full h-10 rounded-xl text-white font-semibold text-sm shadow-sm"
              onClick={fetchReport}
              disabled={!customFrom || !customTo || loading}
              style={{ background: "linear-gradient(135deg, #B03060 0%, #7B1535 100%)" }}
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Apply Filter"}
            </Button>
          </div>
        )}

        {/* Summary cards */}
        {loading ? (
          <div className="grid grid-cols-1 gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl h-20 animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : data ? (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</p>
              <p className="text-xs text-gray-400">{data.transactions.length} transaction{data.transactions.length !== 1 ? "s" : ""}</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {/* Total Deposits */}
              <div className="bg-white border border-emerald-100 rounded-2xl px-4 py-4 flex items-center justify-between"
                style={{ boxShadow: "0 2px 8px rgba(16,185,129,0.08)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Total Deposits</p>
                    <p className="text-xs text-emerald-500 mt-0.5">Credits &amp; Repayments</p>
                  </div>
                </div>
                <span className="text-xl font-black text-emerald-700">{formatCurrency(data.summary.totalDeposits)}</span>
              </div>

              {/* Total Withdrawals */}
              <div className="bg-white border border-red-100 rounded-2xl px-4 py-4 flex items-center justify-between"
                style={{ boxShadow: "0 2px 8px rgba(220,38,38,0.06)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center flex-shrink-0">
                    <TrendingDown className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-red-600">Total Withdrawals</p>
                    <p className="text-xs text-red-400 mt-0.5">Loans &amp; Withdrawals</p>
                  </div>
                </div>
                <span className="text-xl font-black text-red-600">{formatCurrency(data.summary.totalWithdrawals)}</span>
              </div>

              {/* Net Cash Flow */}
              <div
                className="rounded-2xl px-4 py-4 flex items-center justify-between border"
                style={{
                  background: data.summary.netCashFlow >= 0
                    ? "linear-gradient(135deg, #B03060 0%, #7B1535 100%)"
                    : "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
                  borderColor: "transparent",
                  boxShadow: "0 4px 16px rgba(176,48,96,0.18)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-white/80">Net Cash Flow</p>
                    <p className="text-xs text-white/50 mt-0.5">Deposits minus Withdrawals</p>
                  </div>
                </div>
                <span className="text-xl font-black text-white">
                  {data.summary.netCashFlow >= 0 ? "+" : ""}{formatCurrency(data.summary.netCashFlow)}
                </span>
              </div>
            </div>

            {/* Transaction table */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
              style={{ boxShadow: "0 2px 12px rgba(15,37,87,0.06)" }}>
              <div className="px-4 py-3.5 border-b border-gray-50 flex items-center justify-between">
                <h3 className="font-bold text-[#0f2557] text-sm">Transaction Details</h3>
                <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-1 rounded-full font-medium border border-gray-100">{label}</span>
              </div>

              {data.transactions.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <Activity className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400 font-medium">No transactions in this period</p>
                  <p className="text-xs text-gray-300 mt-1">Try selecting a different date range</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-gray-400">Date &amp; Time</th>
                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-gray-400">Member</th>
                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-gray-400 hidden sm:table-cell">Account No.</th>
                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-gray-400">Type</th>
                        <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-wider text-gray-400">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {data.transactions.map((tx, i) => (
                        <tr key={tx.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <p className="text-xs font-semibold text-[#0f2557]">{fmtDate(tx.createdAt)}</p>
                            <p className="text-[10px] text-gray-400">{fmtTime(tx.createdAt)}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs font-semibold text-[#0f2557] truncate max-w-[120px]">{tx.memberName}</p>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <span className="text-[10px] font-mono font-bold text-[#c9a144] bg-[#c9a144]/10 px-1.5 py-0.5 rounded-md">
                              {tx.accountNumber}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${
                              tx.direction === "credit"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-red-50 text-red-600"
                            }`}>
                              {tx.direction === "credit" ? "▲" : "▼"} {formatTransactionType(tx.type)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <span className={`text-sm font-black ${tx.direction === "credit" ? "text-emerald-600" : "text-red-500"}`}>
                              {tx.direction === "credit" ? "+" : "-"}{formatCurrency(tx.amount)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white rounded-2xl border border-gray-100"
            style={{ boxShadow: "0 2px 12px rgba(15,37,87,0.06)" }}>
            <Activity className="w-8 h-8 text-gray-200" />
            <p className="text-sm text-gray-400">Select a period to load the report</p>
          </div>
        )}
      </div>
    </div>
  );
}
