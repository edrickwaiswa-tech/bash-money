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
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Share2, CheckCircle2 } from "lucide-react";

export function NewTransaction() {
  const [_, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const searchParams = new URLSearchParams(window.location.search);
  const initialMemberId = searchParams.get("memberId");

  const initialType = (searchParams.get("type") as CreateTransactionBodyType) || "SAVINGS_DEPOSIT";
  const [memberId, setMemberId] = useState<string>(initialMemberId || "");
  const [type, setType] = useState<CreateTransactionBodyType>(initialType);
  const [amount, setAmount] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [receipt, setReceipt] = useState<TransactionReceipt | null>(null);

  const { data: members, isLoading: isLoadingMembers } = useListMembers(
    undefined,
    { query: { queryKey: getListMembersQueryKey() } }
  );

  const createTx = useCreateTransaction({
    mutation: {
      onSuccess: (data) => {
        toast.success("Transaction recorded successfully");
        setReceipt(data);
        // Invalidate active loans so the Loans page reflects the new transaction immediately
        queryClient.invalidateQueries({ queryKey: getGetActiveLoansQueryKey() });
        // Refresh members list so balances update immediately
        queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
        // Also refresh the member's profile and ledger
        const mid = data.memberId;
        queryClient.invalidateQueries({ queryKey: getGetMemberQueryKey(mid) });
        queryClient.invalidateQueries({ queryKey: getGetMemberLedgerQueryKey(mid) });
      },
      onError: (err: any) => {
        toast.error(err.error || "Failed to record transaction");
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error("Please fill all required fields correctly");
      return;
    }
    createTx.mutate({
      data: {
        memberId: parseInt(memberId, 10),
        type,
        amount: Number(amount),
        notes: notes || undefined
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

  return (
    <div className="bg-[#f4f6fb] min-h-screen">
      {/* Page hero */}
      <div className="bg-[#0f2557] px-4 pt-6 pb-10">
        <h1 className="text-white font-black text-xl tracking-tight">New Transaction</h1>
        <p className="text-white/50 text-xs mt-1">Record a deposit, withdrawal, or loan</p>
      </div>

      <div className="px-4 -mt-6 pb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            {/* Member */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Member</Label>
              <Select value={memberId} onValueChange={setMemberId} disabled={!!initialMemberId}>
                <SelectTrigger className="rounded-xl border-[#0f2557]/15 h-11 focus:ring-[#0f2557]">
                  <SelectValue placeholder="Select a member" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {isLoadingMembers ? (
                    <SelectItem value="loading" disabled>Loading…</SelectItem>
                  ) : (
                    members?.map(m => (
                      <SelectItem key={m.id} value={m.id.toString()}>
                        {m.name} — {m.idNumber}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Transaction Type */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Transaction Type</Label>
              <Select value={type} onValueChange={(val: CreateTransactionBodyType) => setType(val)}>
                <SelectTrigger className="rounded-xl border-[#0f2557]/15 h-11 focus:ring-[#0f2557]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="SAVINGS_DEPOSIT">Savings Deposit</SelectItem>
                  <SelectItem value="WITHDRAWAL">Savings Withdrawal</SelectItem>
                  <SelectItem value="LOAN_DISBURSEMENT">Loan Disbursement</SelectItem>
                  <SelectItem value="LOAN_REPAYMENT">Loan Repayment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Amount (USh)</Label>
              <Input
                type="number"
                placeholder="e.g. 50,000"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                min="1"
                step="1"
                required
                className="rounded-xl border-[#0f2557]/15 focus-visible:ring-[#0f2557] h-11"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Notes (Optional)</Label>
              <Textarea
                placeholder="Add any relevant details…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="resize-none h-20 rounded-xl border-[#0f2557]/15 focus-visible:ring-[#0f2557]"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl bg-[#0f2557] hover:bg-[#1a3570] text-white font-bold text-sm"
              disabled={createTx.isPending}
            >
              {createTx.isPending ? "Processing…" : "Record Transaction"}
            </Button>
          </form>
        </div>
      </div>

      {/* Receipt Modal */}
      <Dialog open={!!receipt} onOpenChange={(open) => !open && handleDone()}>
        <DialogContent className="sm:max-w-md rounded-2xl overflow-hidden p-0">
          {/* Navy header */}
          <div className="bg-[#0f2557] px-6 py-6 text-center">
            <div className="w-14 h-14 rounded-full bg-white/10 border-2 border-[#c9a144]/60 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="h-7 w-7 text-[#c9a144]" />
            </div>
            <DialogTitle className="text-white font-black text-lg">Transaction Successful</DialogTitle>
            <p className="text-white/50 text-[10px] mt-1 uppercase tracking-widest">Bash M. Money And Financial Services Ltd</p>
          </div>

          {receipt && (
            <div className="px-6 py-5 space-y-0">
              {[
                { label: "Receipt No.", value: receipt.transactionRef, mono: true },
                { label: "Date", value: formatDate(receipt.createdAt) },
                { label: "Member", value: receipt.memberName, bold: true },
                { label: "Type", value: formatTransactionType(receipt.type) },
              ].map(({ label, value, mono, bold }) => (
                <div key={label} className="flex justify-between items-center py-3 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className={`text-sm ${mono ? "font-mono" : ""} ${bold ? "font-semibold text-[#0f2557]" : "text-[#0f2557]"}`}>{value}</span>
                </div>
              ))}

              {/* Amount highlight */}
              <div className="bg-[#0f2557]/5 rounded-xl px-4 py-4 mt-3 flex justify-between items-center">
                <span className="font-bold text-[#0f2557]">Amount</span>
                <span className={`text-2xl font-black ${receipt.direction === "credit" ? "text-emerald-600" : "text-destructive"}`}>
                  {formatCurrency(receipt.amount)}
                </span>
              </div>

              <div className="flex justify-between items-center pt-3">
                <span className="text-sm text-muted-foreground">Running Balance</span>
                <span className={`font-bold text-sm ${receipt.runningBalance >= 0 ? "text-[#0f2557]" : "text-destructive"}`}>
                  {formatCurrency(receipt.runningBalance)}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 px-6 pb-6 mt-1">
            <Button
              className="w-full gap-2 h-11 rounded-xl bg-[#25D366] hover:bg-[#128C7E] text-white font-semibold"
              onClick={handleShareWhatsApp}
            >
              <Share2 className="h-4 w-4" /> Share via WhatsApp
            </Button>
            <Button
              variant="outline"
              className="w-full h-11 rounded-xl border-[#0f2557]/20 text-[#0f2557] hover:bg-[#0f2557] hover:text-white transition-all"
              onClick={handleDone}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
