import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  useListMembers, getListMembersQueryKey,
  useCreateTransaction, CreateTransactionBodyType, TransactionReceipt
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
  const searchParams = new URLSearchParams(window.location.search);
  const initialMemberId = searchParams.get("memberId");

  const [memberId, setMemberId] = useState<string>(initialMemberId || "");
  const [type, setType] = useState<CreateTransactionBodyType>("SAVINGS_DEPOSIT");
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
    const text = `SACCO Receipt\nRef: ${receipt.transactionRef}\nMember: ${receipt.memberName}\nType: ${formatTransactionType(receipt.type)}\nAmount: ${formatCurrency(receipt.amount)}\nDate: ${formatDate(receipt.createdAt)}\nBalance: ${formatCurrency(receipt.runningBalance)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleDone = () => {
    if (receipt) {
      setLocation(`/members/${receipt.memberId}`);
    } else {
      setLocation("/");
    }
  };

  return (
    <div className="p-4 space-y-6 max-w-md mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Transaction</h1>
        <p className="text-sm text-muted-foreground">Record a deposit, withdrawal, or loan.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Member</Label>
              <Select value={memberId} onValueChange={setMemberId} disabled={!!initialMemberId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a member" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingMembers ? (
                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                  ) : (
                    members?.map(m => (
                      <SelectItem key={m.id} value={m.id.toString()}>{m.name} ({m.idNumber})</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Transaction Type</Label>
              <Select value={type} onValueChange={(val: CreateTransactionBodyType) => setType(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAVINGS_DEPOSIT">Savings Deposit</SelectItem>
                  <SelectItem value="WITHDRAWAL">Savings Withdrawal</SelectItem>
                  <SelectItem value="LOAN_DISBURSEMENT">Loan Disbursement</SelectItem>
                  <SelectItem value="LOAN_REPAYMENT">Loan Repayment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Amount (USh)</Label>
              <Input 
                type="number" 
                placeholder="e.g. 50000" 
                value={amount} 
                onChange={e => setAmount(e.target.value)}
                min="1"
                step="1"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea 
                placeholder="Add any relevant details..." 
                value={notes} 
                onChange={e => setNotes(e.target.value)}
                className="resize-none h-20"
              />
            </div>

            <Button type="submit" className="w-full" disabled={createTx.isPending}>
              {createTx.isPending ? "Processing..." : "Record Transaction"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Receipt Modal */}
      <Dialog open={!!receipt} onOpenChange={(open) => !open && handleDone()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="flex flex-col items-center sm:items-center space-y-2 pb-4 border-b">
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-2">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <DialogTitle className="text-xl">Transaction Successful</DialogTitle>
          </DialogHeader>
          
          {receipt && (
            <div className="space-y-4 py-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Receipt No.</span>
                <span className="font-mono font-medium">{receipt.transactionRef}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Date</span>
                <span>{formatDate(receipt.createdAt)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Member</span>
                <span className="font-medium">{receipt.memberName}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Type</span>
                <span>{formatTransactionType(receipt.type)}</span>
              </div>
              
              <div className="my-4 pt-4 border-t flex justify-between items-center">
                <span className="font-medium">Amount</span>
                <span className={`text-xl font-bold ${receipt.direction === 'credit' ? 'text-primary' : 'text-destructive'}`}>
                  {formatCurrency(receipt.amount)}
                </span>
              </div>
              
              <div className="flex justify-between items-center text-sm pt-4 border-t">
                <span className="text-muted-foreground">Running Balance</span>
                <span className={`font-semibold ${receipt.runningBalance >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  {formatCurrency(receipt.runningBalance)}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-col gap-2 mt-4">
            <Button className="w-full gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white" onClick={handleShareWhatsApp}>
              <Share2 className="h-4 w-4" /> Share via WhatsApp
            </Button>
            <Button variant="outline" className="w-full" onClick={handleDone}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
