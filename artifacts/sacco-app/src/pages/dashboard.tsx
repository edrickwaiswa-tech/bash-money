import { useGetDashboardSummary, useGetRecentTransactions } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate, formatTransactionType } from "@/lib/format";
import { Users, Wallet, Landmark, Activity, ArrowDownToLine, ArrowUpFromLine, ShieldCheck } from "lucide-react";
import { Link } from "wouter";

export function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: recentTxs, isLoading: isLoadingRecent } = useGetRecentTransactions({ limit: 10 });

  return (
    <div className="bg-[#f4f6fb] min-h-screen">
      {/* Page hero */}
      <div className="bg-[#0f2557] px-4 pt-6 pb-10">
        <h1 className="text-white font-black text-xl tracking-tight">Dashboard</h1>
        <p className="text-white/50 text-xs mt-1">Bash M. Money And Financial Services Ltd</p>
      </div>

      <div className="px-4 -mt-6 space-y-4 pb-8">
        {/* Summary Cards */}
        {isLoadingSummary ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <Skeleton className="h-3 w-20 mb-2" />
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </div>
        ) : summary ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-[#0f2557]/8 flex items-center justify-center">
                    <Wallet className="h-3.5 w-3.5 text-[#0f2557]" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Savings</span>
                </div>
                <span className="text-lg font-black text-[#0f2557]">{formatCurrency(summary.totalSavings)}</span>
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-red-50 flex items-center justify-center">
                    <Landmark className="h-3.5 w-3.5 text-destructive" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Active Loans</span>
                </div>
                <span className="text-lg font-black text-destructive">{formatCurrency(summary.totalLoansOutstanding)}</span>
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-[#c9a144]/10 flex items-center justify-center">
                    <Users className="h-3.5 w-3.5 text-[#c9a144]" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Members</span>
                </div>
                <span className="text-xl font-black text-[#0f2557]">{summary.totalMembers}</span>
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-[#0f2557]/8 flex items-center justify-center">
                    <Activity className="h-3.5 w-3.5 text-[#0f2557]" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Transactions</span>
                </div>
                <span className="text-xl font-black text-[#0f2557]">{summary.totalTransactions}</span>
              </div>
            </div>

            {/* Trust badge */}
            <div className="flex items-center justify-center gap-2 py-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#c9a144]" />
              <span className="text-[10px] text-muted-foreground font-medium">All transactions secured &amp; encrypted</span>
            </div>
          </>
        ) : null}

        {/* Recent Transactions */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-[#0f2557] uppercase tracking-wider">Recent Transactions</h2>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {isLoadingRecent ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-4 py-3.5 flex items-center justify-between border-b last:border-0 border-gray-50">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-xl" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-20" />
                </div>
              ))
            ) : recentTxs?.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground text-sm">
                No recent transactions
              </div>
            ) : (
              recentTxs?.map(tx => (
                <Link key={tx.id} href={`/members/${tx.memberId}`} className="flex items-center justify-between px-4 py-3.5 hover:bg-[#f4f6fb] transition-colors border-b last:border-0 border-gray-50">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      tx.direction === "credit" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-destructive"
                    }`}>
                      {tx.direction === "credit"
                        ? <ArrowDownToLine className="h-4 w-4" />
                        : <ArrowUpFromLine className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-semibold text-[#0f2557] text-sm leading-tight">{tx.memberName}</p>
                      <p className="text-[11px] text-muted-foreground">{formatTransactionType(tx.type)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-sm ${tx.direction === "credit" ? "text-emerald-600" : "text-destructive"}`}>
                      {tx.direction === "credit" ? "+" : "-"}{formatCurrency(tx.amount)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{formatDate(tx.createdAt)}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
