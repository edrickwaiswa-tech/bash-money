import { useGetDashboardSummary, useGetRecentTransactions } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate, formatTransactionType } from "@/lib/format";
import { Users, Wallet, Landmark, Activity, ArrowDownToLine, ArrowUpFromLine, KeyRound, ChevronRight } from "lucide-react";
import { Link } from "wouter";

export function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: recentTxs, isLoading: isLoadingRecent } = useGetRecentTransactions({ limit: 10 });

  return (
    <div className="min-h-screen">
      {/* Page header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-[22px] font-black text-[#0f2557] leading-tight">Dashboard</h1>
        <p className="text-gray-400 text-xs mt-0.5">Bash M. Money And Financial Services Ltd</p>
      </div>

      <div className="px-4 space-y-4 pb-8">
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
              {/* Total Savings */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100"
                style={{ boxShadow: "0 2px 12px rgba(15,37,87,0.06)" }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-7 h-7 rounded-xl bg-[#B03060]/8 flex items-center justify-center">
                    <Wallet className="h-3.5 w-3.5 text-[#B03060]" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Savings</span>
                </div>
                <span className="text-[17px] font-black text-[#0f2557]">{formatCurrency(summary.totalSavings)}</span>
              </div>

              {/* Active Loans */}
              <Link href="/loans">
                <div className="bg-white rounded-2xl p-4 border border-gray-100 hover:border-red-200 transition-colors cursor-pointer"
                  style={{ boxShadow: "0 2px 12px rgba(15,37,87,0.06)" }}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-7 h-7 rounded-xl bg-red-50 flex items-center justify-center">
                      <Landmark className="h-3.5 w-3.5 text-red-500" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Active Loans</span>
                  </div>
                  <span className="text-[17px] font-black text-red-500">{formatCurrency(summary.totalLoansOutstanding)}</span>
                </div>
              </Link>

              {/* Members */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100"
                style={{ boxShadow: "0 2px 12px rgba(15,37,87,0.06)" }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-7 h-7 rounded-xl bg-[#c9a144]/10 flex items-center justify-center">
                    <Users className="h-3.5 w-3.5 text-[#c9a144]" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Members</span>
                </div>
                <span className="text-xl font-black text-[#0f2557]">{summary.totalMembers}</span>
              </div>

              {/* Transactions */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100"
                style={{ boxShadow: "0 2px 12px rgba(15,37,87,0.06)" }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-7 h-7 rounded-xl bg-[#0f2557]/6 flex items-center justify-center">
                    <Activity className="h-3.5 w-3.5 text-[#0f2557]" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Transactions</span>
                </div>
                <span className="text-xl font-black text-[#0f2557]">{summary.totalTransactions}</span>
              </div>
            </div>

            {/* Security Settings shortcut */}
            <Link href="/security">
              <div className="bg-white rounded-2xl px-4 py-3.5 border border-gray-100 flex items-center gap-3 hover:border-[#B03060]/20 transition-colors cursor-pointer"
                style={{ boxShadow: "0 2px 12px rgba(15,37,87,0.06)" }}>
                <div className="w-9 h-9 rounded-xl bg-[#B03060]/6 flex items-center justify-center flex-shrink-0">
                  <KeyRound className="w-4.5 h-4.5 text-[#B03060]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#0f2557] text-sm leading-tight">Security Settings</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Change your admin login PIN</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </div>
            </Link>
          </>
        ) : null}

        {/* Recent Transactions */}
        <div className="space-y-3">
          <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Recent Transactions</h2>

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
            style={{ boxShadow: "0 2px 12px rgba(15,37,87,0.06)" }}>
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
              <div className="p-10 text-center text-gray-400 text-sm">
                No recent transactions
              </div>
            ) : (
              recentTxs?.map(tx => (
                <Link
                  key={tx.id}
                  href={`/members/${tx.memberId}`}
                  className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50/70 transition-colors border-b last:border-0 border-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                      tx.direction === "credit" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
                    }`}>
                      {tx.direction === "credit"
                        ? <ArrowDownToLine className="h-4 w-4" />
                        : <ArrowUpFromLine className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-semibold text-[#0f2557] text-sm leading-tight">{tx.memberName}</p>
                      <p className="text-[11px] text-gray-400">{formatTransactionType(tx.type)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-sm ${tx.direction === "credit" ? "text-emerald-600" : "text-red-500"}`}>
                      {tx.direction === "credit" ? "+" : "-"}{formatCurrency(tx.amount)}
                    </p>
                    <p className="text-[10px] text-gray-400">{formatDate(tx.createdAt)}</p>
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
