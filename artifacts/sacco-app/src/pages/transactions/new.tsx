import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListMembers, getListMembersQueryKey,
  useCreateTransaction, CreateTransactionBodyType, TransactionReceipt,
  getGetActiveLoansQueryKey,
  getGetMemberQueryKey,
  getGetMemberLedgerQueryKey,
} from "@workspace/api-client-react";
import { formatCurrency, formatDate, formatTransactionType } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Users, DollarSign, FileText, ArrowRightLeft,
  Share2, CheckCircle2, Landmark, ArrowDownToLine,
  ArrowUpFromLine, ArrowUpCircle, ChevronDown, PiggyBank,
} from "lucide-react";

const BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") || import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Transaction type metadata ─────────────────────────────────────────────────
const TX_TYPES: {
  value: CreateTransactionBodyType;
  label: string;
  sub: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}[] = [
  { value: "SAVINGS_DEPOSIT",   label: "Savings Deposit",   sub: "Credit to savings",  icon: ArrowDownToLine,  color: "text-emerald-600", bg: "bg-emerald-50" },
  { value: "WITHDRAWAL",        label: "Savings Withdrawal", sub: "Debit from savings", icon: ArrowUpFromLine,  color: "text-red-500",     bg: "bg-red-50"     },
  { value: "LOAN_DISBURSEMENT", label: "Loan Disbursement",  sub: "Issue a new loan",   icon: Landmark,         color: "text-orange-500",  bg: "bg-orange-50"  },
  { value: "LOAN_REPAYMENT",    label: "Loan Repayment",     sub: "Repay a loan",       icon: ArrowUpCircle,    color: "text-blue-500",    bg: "bg-blue-50"    },
];

// ── Field label ───────────────────────────────────────────────────────────────
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1.5">
      {children}
    </label>
  );
}

// Shared input wrapper with left icon
function InputRow({
  icon: Icon, iconColor = "text-gray-400", children,
}: {
  icon: React.ElementType;
  iconColor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <Icon className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none z-10 ${iconColor}`} />
      {children}
    </div>
  );
}

const inputCls =
  "w-full h-12 rounded-2xl border border-gray-200 bg-gray-50/60 text-sm text-gray-800 " +
  "placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B03060]/40 " +
  "focus:border-[#B03060] transition-all pl-10 pr-4";

// ── Main component ────────────────────────────────────────────────────────────
export function NewTransaction() {
  const [_, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const searchParams = new URLSearchParams(window.location.search);
  const initialMemberId = searchParams.get("memberId");
  const initialType = (searchParams.get("type") as CreateTransactionBodyType) || "SAVINGS_DEPOSIT";

  const [memberId,       setMemberId]       = useState<string>(initialMemberId || "");
  const [type,           setType]           = useState<CreateTransactionBodyType>(initialType);
  const [amount,         setAmount]         = useState<string>("");
  const [notes,          setNotes]          = useState<string>("");
  const [receipt,        setReceipt]        = useState<(TransactionReceipt & { fromSavings?: boolean; savingsDeducted?: number; newSavingsBalance?: number; newLoanBalance?: number }) | null>(null);
  const [payFromSavings, setPayFromSavings] = useState(false);
  const [isSubmitting,   setIsSubmitting]   = useState(false);

  const { data: members, isLoading: isLoadingMembers } = useListMembers(
    undefined,
    { query: { queryKey: getListMembersQueryKey() } }
  );

  const invalidateAll = (mid: number) => {
    queryClient.invalidateQueries({ queryKey: getGetActiveLoansQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetMemberQueryKey(mid) });
    queryClient.invalidateQueries({ queryKey: getGetMemberLedgerQueryKey(mid) });
  };

  const createTx = useCreateTransaction({
    mutation: {
      onSuccess: (data) => {
        toast.success("Transaction recorded successfully");
        setReceipt(data);
        invalidateAll(data.memberId);
      },
      onError: (err: any) => {
        toast.error(err.error || "Failed to record transaction");
      }
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error("Please fill all required fields correctly");
      return;
    }

    // ── Savings-offset loan repayment path ────────────────────────────────────
    if (type === "LOAN_REPAYMENT" && payFromSavings) {
      setIsSubmitting(true);
      try {
        const resp = await fetch(`${BASE}/api/transactions/repay-from-savings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            memberId: parseInt(memberId, 10),
            amount: Number(amount),
            notes: notes || undefined,
          }),
          credentials: "include",
        });
        const data = await resp.json();
        if (!resp.ok) {
          toast.error(data.error || "Failed to record transaction");
          return;
        }
        toast.success("Loan repayment recorded — savings deducted");
        setReceipt(data);
        invalidateAll(data.memberId);
      } catch {
        toast.error("Network error. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }
    // ─────────────────────────────────────────────────────────────────────────

    createTx.mutate({
      data: {
        memberId: parseInt(memberId, 10),
        type,
        amount: Number(amount),
        notes: notes || undefined,
      }
    });
  };

  const handleShareWhatsApp = () => {
    if (!receipt) return;
    const text = [
      `*Bash M. Money And Financial Services Ltd*`,
      `Transaction Receipt`,
      ``,
      `Ref: ${receipt.transactionRef}`,
      `Member: ${receipt.memberName}`,
      `Type: ${formatTransactionType(receipt.type)}`,
      `Amount: ${formatCurrency(receipt.amount)}`,
      `Date: ${formatDate(receipt.createdAt)}`,
      `Balance: ${formatCurrency(receipt.runningBalance)}`,
      ``,
      `_Secured & Encrypted — Bash M. Money And Financial Services Ltd_`,
    ].join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleDone = () => {
    if (receipt) setLocation(`/members/${receipt.memberId}`);
    else setLocation("/");
  };

  const selectedMember = members?.find(m => m.id.toString() === memberId);
  const selectedTxType = TX_TYPES.find(t => t.value === type) ?? TX_TYPES[0];

  return (
    <div className="min-h-screen">
      {/* ── Page header ── */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #B03060 0%, #7B1535 100%)" }}>
            <ArrowRightLeft className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-[22px] font-black text-[#0f2557] leading-tight">New Transaction</h1>
            <p className="text-gray-400 text-xs mt-0.5">Record a deposit, withdrawal, or loan</p>
          </div>
        </div>
      </div>

      {/* ── Transaction type quick-select pills ── */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-2 gap-2">
          {TX_TYPES.map(({ value, label, icon: Icon, color, bg }) => {
            const active = type === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => { setType(value); setPayFromSavings(false); }}
                className={`flex items-center gap-2.5 px-3.5 py-3 rounded-2xl border transition-all text-left ${
                  active
                    ? "border-[#B03060]/40 shadow-sm"
                    : "bg-white border-gray-100 hover:border-gray-200"
                }`}
                style={active ? { background: "linear-gradient(135deg, #B03060 0%, #7B1535 100%)" } : {}}
              >
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${active ? "bg-white/20" : bg}`}>
                  <Icon className={`h-3.5 w-3.5 ${active ? "text-white" : color}`} />
                </div>
                <span className={`text-xs font-bold leading-tight ${active ? "text-white" : "text-[#0f2557]"}`}>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Form card ── */}
      <div className="px-4 pb-8">
        <div
          className="bg-white rounded-3xl border border-gray-100 overflow-hidden"
          style={{ boxShadow: "0 8px 32px rgba(15,37,87,0.09), 0 2px 8px rgba(0,0,0,0.04)" }}
        >
          {/* Card header strip */}
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${selectedTxType.bg}`}>
              <selectedTxType.icon className={`h-4 w-4 ${selectedTxType.color}`} />
            </div>
            <div>
              <p className="text-sm font-black text-[#0f2557]">{selectedTxType.label}</p>
              <p className="text-[10px] text-gray-400">{selectedTxType.sub}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-5">

            {/* ── Member ── */}
            <div>
              <FieldLabel>Member</FieldLabel>
              <div className="relative">
                <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                <Select value={memberId} onValueChange={setMemberId} disabled={!!initialMemberId}>
                  <SelectTrigger
                    className="h-12 rounded-2xl border border-gray-200 bg-gray-50/60 text-sm text-gray-800 pl-10 pr-10 focus:ring-2 focus:ring-[#B03060]/40 focus:border-[#B03060] transition-all [&>svg]:hidden"
                  >
                    <SelectValue placeholder={isLoadingMembers ? "Loading members…" : "Select a member"} />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border border-gray-100 shadow-xl">
                    {isLoadingMembers ? (
                      <SelectItem value="loading" disabled>Loading…</SelectItem>
                    ) : (
                      members?.map(m => (
                        <SelectItem key={m.id} value={m.id.toString()} className="rounded-xl">
                          <span className="font-semibold">{m.name}</span>
                          <span className="text-gray-400 ml-1.5 text-xs font-mono">{m.accountNumber ?? m.idNumber}</span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              {selectedMember && (
                <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-[#0f2557]/4 rounded-xl border border-[#0f2557]/8">
                  <div className="w-5 h-5 rounded-full bg-[#B03060]/15 flex items-center justify-center flex-shrink-0">
                    <Users className="h-2.5 w-2.5 text-[#B03060]" />
                  </div>
                  <p className="text-xs text-[#0f2557] font-semibold truncate">{selectedMember.name}</p>
                  <span className="text-[10px] text-gray-400 font-mono ml-auto flex-shrink-0">{selectedMember.accountNumber}</span>
                </div>
              )}
            </div>

            {/* ── Amount ── */}
            <div>
              <FieldLabel>Amount (UGX)</FieldLabel>
              <InputRow icon={DollarSign} iconColor={amount ? "text-[#B03060]" : "text-gray-400"}>
                <input
                  type="number"
                  placeholder="e.g. 50,000"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  min="1"
                  step="1"
                  required
                  className={inputCls}
                />
              </InputRow>
              {amount && Number(amount) > 0 && (
                <p className="mt-1.5 text-xs text-gray-400 pl-1">
                  = <span className="font-bold text-[#0f2557]">{formatCurrency(Number(amount))}</span>
                </p>
              )}
            </div>

            {/* ── Pay from Savings toggle (Loan Repayment only) ── */}
            {type === "LOAN_REPAYMENT" && (
              <div>
                <button
                  type="button"
                  onClick={() => setPayFromSavings(v => !v)}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl border transition-all ${
                    payFromSavings
                      ? "border-[#B03060]/30 bg-[#B03060]/6"
                      : "border-gray-200 bg-gray-50/60 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${payFromSavings ? "bg-[#B03060]/15" : "bg-gray-100"}`}>
                      <PiggyBank className={`h-3.5 w-3.5 ${payFromSavings ? "text-[#B03060]" : "text-gray-500"}`} />
                    </div>
                    <div className="text-left">
                      <p className={`text-xs font-bold leading-tight ${payFromSavings ? "text-[#B03060]" : "text-[#0f2557]"}`}>Pay from Member Savings</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Deduct repayment from savings balance</p>
                    </div>
                  </div>
                  {/* Toggle pill */}
                  <div className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${payFromSavings ? "bg-[#B03060]" : "bg-gray-200"}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${payFromSavings ? "left-5" : "left-1"}`} />
                  </div>
                </button>

                {/* Balance info strip when toggle is ON */}
                {payFromSavings && selectedMember && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                      <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide">Savings Balance</p>
                      <p className="text-sm font-black text-emerald-700 mt-0.5">{formatCurrency(selectedMember.totalSavings ?? 0)}</p>
                    </div>
                    <div className="px-3 py-2.5 rounded-xl bg-orange-50 border border-orange-100">
                      <p className="text-[10px] text-orange-600 font-bold uppercase tracking-wide">Loan Balance</p>
                      <p className="text-sm font-black text-orange-700 mt-0.5">{formatCurrency(selectedMember.outstandingLoan ?? 0)}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Notes ── */}
            <div>
              <FieldLabel>Notes <span className="normal-case font-normal text-gray-400">(optional)</span></FieldLabel>
              <div className="relative">
                <FileText className={`absolute left-3.5 top-3.5 h-4 w-4 pointer-events-none ${notes ? "text-[#B03060]" : "text-gray-400"}`} />
                <textarea
                  placeholder="Add any relevant details…"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50/60 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B03060]/40 focus:border-[#B03060] transition-all pl-10 pr-4 py-3"
                />
              </div>
            </div>

            {/* ── Submit ── */}
            <button
              type="submit"
              disabled={createTx.isPending || isSubmitting || !memberId || !amount || Number(amount) <= 0}
              className="w-full h-12 rounded-2xl text-white font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              style={{ background: "linear-gradient(135deg, #B03060 0%, #7B1535 100%)" }}
            >
              {(createTx.isPending || isSubmitting) ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Processing…
                </span>
              ) : payFromSavings && type === "LOAN_REPAYMENT" ? (
                "Repay Loan from Savings"
              ) : (
                "Record Transaction"
              )}
            </button>
          </form>
        </div>
      </div>

      {/* ── Receipt modal ── */}
      <Dialog open={!!receipt} onOpenChange={(open) => !open && handleDone()}>
        <DialogContent className="sm:max-w-md rounded-3xl overflow-hidden p-0 border-0"
          style={{ boxShadow: "0 24px 64px rgba(15,37,87,0.18)" }}>

          {/* Modal header — burgundy */}
          <div className="px-6 py-6 text-center"
            style={{ background: "linear-gradient(135deg, #B03060 0%, #7B1535 100%)" }}>
            <div className="w-14 h-14 rounded-full bg-white/15 border-2 border-white/30 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="h-7 w-7 text-white" />
            </div>
            <DialogTitle className="text-white font-black text-lg">Transaction Successful</DialogTitle>
            <p className="text-white/60 text-[10px] mt-1 uppercase tracking-widest">Bash M. Money And Financial Services Ltd</p>
          </div>

          {receipt && (
            <div className="px-6 py-5">
              <div className="space-y-0">
                {[
                  { label: "Receipt No.", value: receipt.transactionRef, mono: true },
                  { label: "Date",        value: formatDate(receipt.createdAt) },
                  { label: "Member",      value: receipt.memberName, bold: true },
                  { label: "Type",        value: formatTransactionType(receipt.type) },
                ].map(({ label, value, mono, bold }) => (
                  <div key={label} className="flex justify-between items-center py-3 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-400">{label}</span>
                    <span className={`text-sm text-[#0f2557] ${mono ? "font-mono text-xs" : ""} ${bold ? "font-bold" : ""}`}>{value}</span>
                  </div>
                ))}
              </div>

              {/* "From savings" badge */}
              {receipt.fromSavings && (
                <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-[#B03060]/8 border border-[#B03060]/15">
                  <PiggyBank className="h-3.5 w-3.5 text-[#B03060] flex-shrink-0" />
                  <p className="text-xs text-[#B03060] font-semibold">Repaid from member savings</p>
                </div>
              )}

              {/* Amount highlight */}
              <div className="rounded-2xl px-4 py-4 flex justify-between items-center border"
                style={{
                  background: "linear-gradient(135deg,#f0fdf4,#dcfce7)",
                  borderColor: "#bbf7d0",
                }}>
                <span className="font-bold text-gray-700 text-sm">Loan Repaid</span>
                <span className="text-2xl font-black text-emerald-600">
                  {formatCurrency(receipt.amount)}
                </span>
              </div>

              {/* Savings deduction line when from savings */}
              {receipt.fromSavings && (
                <div className="mt-2 rounded-2xl px-4 py-3 flex justify-between items-center border border-red-100"
                  style={{ background: "linear-gradient(135deg,#fff1f2,#ffe4e6)" }}>
                  <span className="font-bold text-gray-700 text-sm">Savings Deducted</span>
                  <span className="text-lg font-black text-red-500">−{formatCurrency(receipt.savingsDeducted ?? receipt.amount)}</span>
                </div>
              )}

              {/* Updated balances when from savings */}
              {receipt.fromSavings ? (
                <div className="grid grid-cols-2 gap-2 pt-3">
                  <div className="px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                    <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide">New Savings</p>
                    <p className="text-sm font-black text-emerald-700 mt-0.5">{formatCurrency(receipt.newSavingsBalance ?? 0)}</p>
                  </div>
                  <div className="px-3 py-2.5 rounded-xl bg-orange-50 border border-orange-100">
                    <p className="text-[10px] text-orange-600 font-bold uppercase tracking-wide">Loan Left</p>
                    <p className="text-sm font-black text-orange-700 mt-0.5">{formatCurrency(receipt.newLoanBalance ?? 0)}</p>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center pt-4">
                  <span className="text-sm text-gray-400">Running Balance</span>
                  <span className={`font-black text-sm ${receipt.runningBalance >= 0 ? "text-[#0f2557]" : "text-red-500"}`}>
                    {formatCurrency(receipt.runningBalance)}
                  </span>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-col gap-2 px-6 pb-6">
            <Button
              className="w-full gap-2 h-11 rounded-2xl bg-[#25D366] hover:bg-[#128C7E] text-white font-semibold transition-colors"
              onClick={handleShareWhatsApp}
            >
              <Share2 className="h-4 w-4" /> Share via WhatsApp
            </Button>
            <Button
              variant="outline"
              className="w-full h-11 rounded-2xl border-gray-200 text-[#0f2557] hover:bg-[#0f2557] hover:text-white hover:border-[#0f2557] transition-all font-semibold"
              onClick={handleDone}
            >
              Done — View Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
