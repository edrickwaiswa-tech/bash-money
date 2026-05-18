import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetActiveLoans, getGetActiveLoansQueryKey } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Landmark, Plus, ArrowDownCircle, ArrowUpCircle,
  User, TrendingDown, ChevronRight,
} from "lucide-react";

export function Loans() {
  const [, setLocation] = useLocation();
  const { data: loans, isLoading } = useGetActiveLoans({
    query: { refetchOnWindowFocus: true, staleTime: 0, queryKey: getGetActiveLoansQueryKey() }
  });

  const totalOutstanding = loans?.reduce((sum, l) => sum + l.outstandingLoan, 0) ?? 0;
  const totalDisbursed   = loans?.reduce((sum, l) => sum + l.totalDisbursed, 0) ?? 0;
  const totalRepaid      = loans?.reduce((sum, l) => sum + l.totalRepaid, 0) ?? 0;
  const repaymentRate    = totalDisbursed > 0 ? (totalRepaid / totalDisbursed) * 100 : 0;

  return (
    <div className="min-h-screen">
      {/* Page header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-black text-[#1A1A1A] leading-tight">Loans</h1>
            <p className="text-gray-400 text-xs mt-0.5">Active loan portfolio</p>
          </div>
          <Button
            onClick={() => setLocation("/transactions/new")}
            className="gap-1.5 h-9 rounded-xl text-white font-bold text-xs shadow-md"
            style={{ background: "linear-gradient(135deg, #B03060 0%, #7B1535 100%)" }}
          >
            <Plus className="w-3.5 h-3.5" />
            Disburse Loan
          </Button>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-gray-100"
            style={{ boxShadow: "0 2px 12px rgba(15,37,87,0.06)" }}>
            <p className="text-gray-400 text-[9px] uppercase tracking-widest font-semibold mb-1 flex items-center gap-1">
              <TrendingDown className="w-3 h-3" /> Outstanding
            </p>
            <p className="text-red-500 font-black text-lg leading-tight">{formatCurrency(totalOutstanding)}</p>
            <p className="text-gray-400 text-[10px] mt-1">{loans?.length ?? 0} active borrowers</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100"
            style={{ boxShadow: "0 2px 12px rgba(15,37,87,0.06)" }}>
            <p className="text-gray-400 text-[9px] uppercase tracking-widest font-semibold mb-1">Repayment Rate</p>
            <p className="text-[#B03060] font-black text-lg leading-tight">{repaymentRate.toFixed(1)}%</p>
            <p className="text-gray-400 text-[10px] mt-1">{formatCurrency(totalRepaid)} repaid</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-10 space-y-3">

        {isLoading ? (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
            style={{ boxShadow: "0 2px 12px rgba(15,37,87,0.06)" }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-4 py-4 border-b last:border-0 border-gray-50">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : loans?.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 px-6 py-14 flex flex-col items-center text-center"
            style={{ boxShadow: "0 2px 12px rgba(15,37,87,0.06)" }}>
            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
              <Landmark className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="font-bold text-[#1A1A1A] text-base mb-1">No Active Loans</h3>
            <p className="text-gray-400 text-sm mb-5 leading-relaxed">
              No members currently have an outstanding loan balance.
            </p>
            <Button
              onClick={() => setLocation("/transactions/new")}
              className="gap-2 rounded-xl text-white h-10 px-6 text-sm font-semibold shadow-md"
              style={{ background: "linear-gradient(135deg, #B03060 0%, #7B1535 100%)" }}
            >
              <Plus className="w-4 h-4" /> Disburse First Loan
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest">
                Active Borrowers ({loans!.length})
              </h2>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50"
              style={{ boxShadow: "0 2px 12px rgba(15,37,87,0.06)" }}>
              {loans!.map((loan) => {
                const pct = loan.totalDisbursed > 0
                  ? Math.min(100, (loan.totalRepaid / loan.totalDisbursed) * 100)
                  : 0;

                return (
                  <div key={loan.memberId} className="px-4 py-4">
                    {/* Top row */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#B03060]/8 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-[#B03060]/60" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[#1A1A1A] text-sm leading-tight truncate">{loan.memberName}</p>
                        <p className="text-[11px] text-gray-400 font-mono mt-0.5">{loan.accountNumber}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-black text-red-500 text-sm">{formatCurrency(loan.outstandingLoan)}</p>
                        <p className="text-[10px] text-gray-400">outstanding</p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3 mb-3">
                      <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                        <span>Repaid: {formatCurrency(loan.totalRepaid)}</span>
                        <span>{pct.toFixed(0)}% of {formatCurrency(loan.totalDisbursed)}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <Link href={`/transactions/new?memberId=${loan.memberId}&type=LOAN_REPAYMENT`} className="flex-1">
                        <button className="w-full flex items-center justify-center gap-1.5 h-8 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition-colors border border-emerald-100">
                          <ArrowUpCircle className="w-3.5 h-3.5" />
                          Record Repayment
                        </button>
                      </Link>
                      <Link href={`/transactions/new?memberId=${loan.memberId}&type=LOAN_DISBURSEMENT`} className="flex-1">
                        <button className="w-full flex items-center justify-center gap-1.5 h-8 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold transition-colors border border-red-100">
                          <ArrowDownCircle className="w-3.5 h-3.5" />
                          Top Up Loan
                        </button>
                      </Link>
                      <Link href={`/members/${loan.memberId}`}>
                        <button className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-500 transition-colors border border-gray-100">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </Link>
                    </div>

                    {loan.lastDisbursementDate && (
                      <p className="text-[10px] text-gray-400 mt-2">
                        Last disbursed: {formatDate(loan.lastDisbursementDate)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
