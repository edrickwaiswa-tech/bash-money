import { useState, useEffect, useRef } from "react";
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
import { SignaturePad } from "@/components/signature-pad";
import { toast } from "sonner";
import {
  ArrowLeft, Wallet, Landmark, Phone, CreditCard,
  Calendar, Edit, Trash2, FileDown, Camera, Upload,
  Copy, Check, Hash, ImageIcon, Pen, X
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

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
        window.history.back();
      },
      onError: (err: any) => toast.error(err.error || "Delete failed")
    }
  });

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editData, setEditData] = useState({ name: "", phone: "", idNumber: "" });
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Upload state
  const [picPreview, setPicPreview] = useState<string | null>(null);
  const [sigPreview, setSigPreview] = useState<string | null>(null);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [uploadingSig, setUploadingSig] = useState(false);
  const [sigMode, setSigMode] = useState<"draw" | "upload">("draw");
  const picInputRef = useRef<HTMLInputElement>(null);
  const sigInputRef = useRef<HTMLInputElement>(null);

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

  const handleDelete = () => deleteMember.mutate({ memberId });

  const copyAccountNumber = async () => {
    if (!profile?.accountNumber) return;
    await navigator.clipboard.writeText(profile.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Profile picture upload
  const handlePicFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPic(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${BASE}/api/members/${memberId}/upload/profile-picture`, {
        method: "POST",
        credentials: "same-origin",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPicPreview(data.url);
      queryClient.invalidateQueries({ queryKey: getGetMemberQueryKey(memberId) });
      toast.success("Profile picture updated");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploadingPic(false);
      e.target.value = "";
    }
  };

  // Signature file upload
  const handleSigFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSig(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${BASE}/api/members/${memberId}/upload/signature`, {
        method: "POST",
        credentials: "same-origin",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSigPreview(data.url);
      queryClient.invalidateQueries({ queryKey: getGetMemberQueryKey(memberId) });
      toast.success("Signature uploaded");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploadingSig(false);
      e.target.value = "";
    }
  };

  // Signature from canvas
  const handleSigDrawSave = async (dataUrl: string) => {
    setUploadingSig(true);
    try {
      const res = await fetch(`${BASE}/api/members/${memberId}/upload/signature-data`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSigPreview(data.url);
      queryClient.invalidateQueries({ queryKey: getGetMemberQueryKey(memberId) });
      toast.success("Signature saved");
    } catch (err: any) {
      toast.error(err.message ?? "Save failed");
    } finally {
      setUploadingSig(false);
    }
  };

  if (isProfileLoading) return <div className="p-4 text-center text-muted-foreground text-sm py-16">Loading…</div>;
  if (!profile) return <div className="p-4">Member not found.</div>;

  const effectivePic = picPreview ?? (profile as any).profilePictureUrl ?? null;
  const effectiveSig = sigPreview ?? (profile as any).signatureUrl ?? null;
  const initials = profile.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8 rounded-full">
          <Link href="/members"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold tracking-tight truncate">{profile.name}</h1>
          <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1"><Hash className="h-3 w-3" />{(profile as any).accountNumber}</span>
            <span>•</span>
            <span>{profile.phone}</span>
          </p>
        </div>
      </div>

      {/* Profile Picture + Account Number */}
      <div className="flex items-center gap-4 bg-white dark:bg-zinc-900 border rounded-xl p-4 shadow-sm">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary/20 bg-primary/10 flex items-center justify-center">
            {effectivePic ? (
              <img src={effectivePic} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-primary font-bold text-xl">{initials}</span>
            )}
          </div>
          <button
            onClick={() => picInputRef.current?.click()}
            disabled={uploadingPic}
            className="absolute -bottom-1 -right-1 bg-primary text-white rounded-full p-1.5 shadow-md hover:bg-primary/90 transition-colors"
            title="Change profile picture"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
          <input ref={picInputRef} type="file" accept="image/*" className="hidden" onChange={handlePicFileChange} />
        </div>

        {/* Account info */}
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Account Number</p>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm">{(profile as any).accountNumber}</span>
              <button onClick={copyAccountNumber} className="text-muted-foreground hover:text-primary transition-colors" title="Copy">
                {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CreditCard className="h-3 w-3" />
            <span>{profile.idNumber}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Phone className="h-3 w-3" />
            <span>{profile.phone}</span>
          </div>
        </div>
      </div>

      {/* Balance Cards */}
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

      {/* Main Tabs */}
      <Tabs defaultValue="ledger" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
          <TabsTrigger value="signature">Signature</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>

        {/* ── LEDGER ── */}
        <TabsContent value="ledger" className="space-y-4 pt-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Transaction History</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleExportPDF}
                disabled={isExporting || isLedgerLoading || !ledger} className="gap-1.5">
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
                      <div className="mt-2 text-xs text-muted-foreground bg-muted p-2 rounded">{entry.notes}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>

        {/* ── SIGNATURE ── */}
        <TabsContent value="signature" className="space-y-4 pt-4">
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold">Member Signature</h3>
              <p className="text-xs text-muted-foreground">Draw or upload a signature for official records</p>
            </div>

            {/* Current signature display */}
            {effectiveSig ? (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Current Signature</Label>
                <div className="border rounded-xl overflow-hidden bg-white p-4 flex items-center justify-center min-h-[120px]">
                  <img src={effectiveSig} alt="Signature" className="max-h-24 max-w-full object-contain" />
                </div>
                <button
                  onClick={() => { setSigPreview(null); }}
                  className="text-xs text-destructive hover:underline flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Replace signature
                </button>
              </div>
            ) : null}

            {/* Mode toggle */}
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              <button
                onClick={() => setSigMode("draw")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-sm font-medium rounded-md transition-all ${
                  sigMode === "draw" ? "bg-white dark:bg-zinc-900 shadow-sm text-foreground" : "text-muted-foreground"
                }`}
              >
                <Pen className="w-3.5 h-3.5" /> Draw
              </button>
              <button
                onClick={() => setSigMode("upload")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-sm font-medium rounded-md transition-all ${
                  sigMode === "upload" ? "bg-white dark:bg-zinc-900 shadow-sm text-foreground" : "text-muted-foreground"
                }`}
              >
                <Upload className="w-3.5 h-3.5" /> Upload
              </button>
            </div>

            {sigMode === "draw" ? (
              <SignaturePad onSave={handleSigDrawSave} disabled={uploadingSig} />
            ) : (
              <div>
                <input ref={sigInputRef} type="file" accept="image/*" className="hidden" onChange={handleSigFileChange} />
                <Button
                  variant="outline"
                  className="w-full gap-2 h-24 border-dashed flex-col"
                  onClick={() => sigInputRef.current?.click()}
                  disabled={uploadingSig}
                >
                  <ImageIcon className="w-6 h-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {uploadingSig ? "Uploading…" : "Click to upload signature image"}
                  </span>
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── PROFILE ── */}
        <TabsContent value="profile" className="space-y-4 pt-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              {[
                { icon: Hash, label: "Account Number", value: (profile as any).accountNumber, mono: true },
                { icon: CreditCard, label: "ID Number", value: profile.idNumber },
                { icon: Phone, label: "Phone Number", value: profile.phone },
                { icon: Calendar, label: "Member Since", value: formatDate(profile.joinDate) },
              ].map(({ icon: Icon, label, value, mono }) => (
                <div key={label} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{label}</Label>
                  <div className={`font-medium flex items-center gap-2 ${mono ? "font-mono" : ""}`}>
                    <Icon className="h-3 w-3 text-muted-foreground" /> {value}
                  </div>
                </div>
              ))}
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
          <DialogHeader><DialogTitle>Edit Member Profile</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" value={editData.phone} onChange={e => setEditData({ ...editData, phone: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="idNumber">ID Number</Label>
              <Input id="idNumber" value={editData.idNumber} onChange={e => setEditData({ ...editData, idNumber: e.target.value })} required />
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
          <DialogHeader><DialogTitle>Delete Member?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete {profile.name}? This cannot be undone.
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
