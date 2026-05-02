import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { 
  useGetMember, getGetMemberQueryKey,
  useGetMemberLedger, getGetMemberLedgerQueryKey,
  useUpdateMember, useDeleteMember
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency, formatDate, formatTransactionType } from "@/lib/format";
import { exportMemberStatementPDF } from "@/lib/pdf-export";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  ArrowLeft, Wallet, Landmark, Phone, CreditCard, 
  Calendar, Edit, Trash2, FileDown
} from "lucide-react";

export function MemberDetail() {
  const { id } = useParams();
  const memberId = parseInt(id || "0", 10);
  const queryClient = useQueryClient();

  const { data: profile, isLoading: isProfileLoading } = useGetMember(memberId, {
    query: { enabled: !!memberId, queryKey: getGetMemberQueryKey(memberId) }
  });

  const { data: ledger, isLoading: isLedgerLoading } = useGetMemberLedger(memberId, {
    query: { enabled: !!memberId, queryKey: getGetMemberLedgerQueryKey(memberId) }
  });

  const updateMember = useUpdateMember({
    mutation: {
      onSuccess: () => {
        toast.success("Member updated");
        queryClient.invalidateQueries({ queryKey: getGetMemberQueryKey(memberId) });
        setIsEditOpen(false);
      },
      onError: (err: any) => toast.error(err.error || "Update failed")
    }
  });

  const deleteMember = useDeleteMember({
    mutation: {
      onSuccess: () => {
        toast.success("Member deleted");
        window.history.back(); // Or navigate to /members
      },
      onError: (err: any) => toast.error(err.error || "Delete failed")
    }
  });

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editData, setEditData] = useState({ name: "", phone: "", idNumber: "" });
  const [isExporting, setIsExporting] = useState(false);

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

  useEffect(() => {
    if (profile) {
      setEditData({ name: profile.name, phone: profile.phone, idNumber: profile.idNumber });
    }
  }, [profile]);

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateMember.mutate({ memberId, data: editData });
  };

  const handleDelete = () => {
    deleteMember.mutate({ memberId });
  };

  if (isProfileLoading) return <div className="p-4">Loading...</div>;
  if (!profile) return <div className="p-4">Member not found.</div>;

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8 rounded-full">
          <Link href="/members"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight">{profile.name}</h1>
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <span>ID: {profile.idNumber}</span>
            <span>•</span>
            <span>{profile.phone}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-primary">
              <Wallet className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Total Savings</span>
            </div>
            <span className="text-xl font-bold text-primary">{formatCurrency(profile.totalSavings)}</span>
          </CardContent>
        </Card>
        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-destructive">
              <Landmark className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Loan Balance</span>
            </div>
            <span className="text-xl font-bold text-destructive">{formatCurrency(profile.outstandingLoan)}</span>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center bg-muted/50 p-3 rounded-lg border">
        <span className="text-sm font-medium text-muted-foreground">Net Balance</span>
        <span className={`text-lg font-bold ${profile.currentBalance >= 0 ? 'text-primary' : 'text-destructive'}`}>
          {formatCurrency(profile.currentBalance)}
        </span>
      </div>

      <Tabs defaultValue="ledger" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>
        <TabsContent value="ledger" className="space-y-4 pt-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Transaction History</h3>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportPDF}
                disabled={isExporting || isLedgerLoading || !ledger}
                data-testid="button-export-pdf"
                className="gap-1.5"
              >
                <FileDown className="h-3.5 w-3.5" />
                {isExporting ? "Exporting..." : "Export PDF"}
              </Button>
              <Button size="sm" asChild>
                <Link href={`/transactions/new?memberId=${memberId}`}>Transact</Link>
              </Button>
            </div>
          </div>
          
          <Card>
            <div className="divide-y divide-border">
              {isLedgerLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">Loading ledger...</div>
              ) : ledger?.entries.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">No transactions yet</div>
              ) : (
                ledger?.entries.map(entry => (
                  <div key={entry.id} className="p-4 text-sm">
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-medium">{formatTransactionType(entry.type)}</div>
                      <div className={`font-semibold ${entry.direction === 'credit' ? 'text-primary' : 'text-destructive'}`}>
                        {entry.direction === 'credit' ? '+' : '-'}{formatCurrency(entry.amount)}
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <div>{formatDate(entry.createdAt)}</div>
                      <div className="flex items-center gap-1">
                        Bal: <span className={`font-medium ${entry.runningBalance >= 0 ? 'text-primary' : 'text-destructive'}`}>
                          {formatCurrency(entry.runningBalance)}
                        </span>
                      </div>
                    </div>
                    {entry.notes && (
                      <div className="mt-2 text-xs text-muted-foreground bg-muted p-2 rounded">
                        {entry.notes}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>
        <TabsContent value="profile" className="space-y-4 pt-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Full Name</Label>
                <div className="font-medium">{profile.name}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Phone Number</Label>
                <div className="font-medium flex items-center gap-2">
                  <Phone className="h-3 w-3" /> {profile.phone}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">ID Number</Label>
                <div className="font-medium flex items-center gap-2">
                  <CreditCard className="h-3 w-3" /> {profile.idNumber}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Member Since</Label>
                <div className="font-medium flex items-center gap-2">
                  <Calendar className="h-3 w-3" /> {formatDate(profile.joinDate)}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 gap-2" onClick={() => setIsEditOpen(true)}>
              <Edit className="h-4 w-4" /> Edit Profile
            </Button>
            <Button variant="destructive" className="flex-1 gap-2" onClick={() => setIsDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Member Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="idNumber">ID Number</Label>
              <Input id="idNumber" value={editData.idNumber} onChange={e => setEditData({...editData, idNumber: e.target.value})} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={updateMember.isPending}>Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Member?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete {profile.name}? This action cannot be undone and will remove all their ledger history.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMember.isPending}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
