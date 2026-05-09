import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "wouter";
import { MemberAvatar } from "@/components/member-avatar";
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
import { PhotoCropModal } from "@/components/photo-crop-modal";
import { toast } from "sonner";
import {
  ArrowLeft, Wallet, Landmark, Phone, CreditCard,
  Calendar, Edit, Trash2, FileDown, Camera,
  Copy, Check, Hash, ImageIcon, Pen, Upload, X,
  ShieldCheck, Lock
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
  const [heroImgError, setHeroImgError] = useState(false);

  // Crop modal
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [picPreview, setPicPreview] = useState<string | null>(null);
  const [uploadingPic, setUploadingPic] = useState(false);
  const picInputRef = useRef<HTMLInputElement>(null);

  // Signature
  const [sigPreview, setSigPreview] = useState<string | null>(null);
  const [uploadingSig, setUploadingSig] = useState(false);
  const [sigMode, setSigMode] = useState<"draw" | "upload">("draw");
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
    if (profile) setEditData({ name: profile.name, phone: profile.phone, idNumber: profile.idNumber });
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

  // Open file picker → read as data URL → open crop modal
  const handlePicFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result as string);
      setIsCropOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, []);

  // After cropping → upload base64 PNG to API
  const handleCropApply = async (dataUrl: string) => {
    setUploadingPic(true);
    try {
      const res = await fetch(`${BASE}/api/members/${memberId}/upload/profile-picture-data`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPicPreview(data.url);
      queryClient.invalidateQueries({ queryKey: getGetMemberQueryKey(memberId) });
      toast.success("Profile photo updated");
      setIsCropOpen(false);
      setCropSrc(null);
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploadingPic(false);
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

  if (isProfileLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-[#0f2557] border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Loading member profile…</p>
      </div>
    );
  }
  if (!profile) return <div className="p-4">Member not found.</div>;

  const effectivePic = picPreview ?? (profile as any).profilePictureUrl ?? null;
  const effectiveSig = sigPreview ?? (profile as any).signatureUrl ?? null;
  const initials = profile.name.trim().split(/\s+/).map((n) => n[0]?.toUpperCase() ?? "").slice(0, 2).join("");

  return (
    <div className="bg-[#f4f6fb] min-h-screen">
      {/* ── Navy Hero Header ── */}
      <div className="bg-[#0f2557] px-4 pt-4 pb-8">
        <div className="flex items-center gap-3 mb-5">
          <Link href="/members">
            <button className="text-white/70 hover:text-white transition-colors p-1 -ml-1">
              <ArrowLeft className="h-5 w-5" />
            </button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-bold text-lg tracking-tight truncate">{profile.name}</h1>
            <p className="text-white/50 text-[11px] flex items-center gap-1 mt-0.5">
              <Hash className="h-3 w-3" />
              <span className="font-mono">{profile.accountNumber}</span>
            </p>
          </div>
          <button
            onClick={handleExportPDF}
            disabled={isExporting || isLedgerLoading || !ledger}
            className="text-white/60 hover:text-[#c9a144] transition-colors"
            title="Export PDF"
          >
            <FileDown className="h-5 w-5" />
          </button>
        </div>

        {/* Profile Row */}
        <div className="flex items-end gap-4">
          {/* Hero Avatar — gold ring, dark bg, gold initials fallback */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => picInputRef.current?.click()}
              disabled={uploadingPic}
              className="group block"
              title="Change profile photo"
            >
              <div className="w-20 h-20 rounded-full overflow-hidden border-[3px] border-[#c9a144] bg-[#1a3570] flex items-center justify-center shadow-xl">
                {effectivePic && !heroImgError ? (
                  <img
                    src={effectivePic}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                    onError={() => setHeroImgError(true)}
                  />
                ) : (
                  <span className="text-[#c9a144] font-black text-2xl tracking-tight select-none">{initials}</span>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-[#c9a144] text-[#0f2557] rounded-full p-1.5 shadow-lg group-hover:scale-110 transition-transform">
                <Camera className="w-3.5 h-3.5" />
              </div>
            </button>
            <input ref={picInputRef} type="file" accept="image/*" className="hidden" onChange={handlePicFileChange} />
          </div>

          {/* Balances */}
          <div className="flex-1 grid grid-cols-2 gap-2">
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-white/50 text-[9px] uppercase tracking-widest font-semibold mb-1">Savings</p>
              <p className="text-[#c9a144] font-black text-base leading-tight">{formatCurrency(profile.totalSavings)}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-white/50 text-[9px] uppercase tracking-widest font-semibold mb-1">Loan</p>
              <p className="text-red-300 font-black text-base leading-tight">{formatCurrency(profile.outstandingLoan)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Net Balance strip */}
      <div className="mx-4 -mt-4 bg-white rounded-2xl shadow-md px-5 py-3 flex items-center justify-between border border-gray-100">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-[#0f2557]" />
          <span className="text-sm font-semibold text-[#0f2557]">Net Balance</span>
        </div>
        <span className={`text-lg font-black ${profile.currentBalance >= 0 ? "text-[#0f2557]" : "text-destructive"}`}>
          {formatCurrency(profile.currentBalance)}
        </span>
      </div>

      {/* ── Tabs ── */}
      <div className="px-4 pt-4 pb-8">
        <Tabs defaultValue="ledger" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white rounded-xl shadow-sm border border-gray-100 p-1 h-auto mb-4">
            {["ledger", "profile", "signature"].map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="rounded-lg text-xs font-semibold py-2.5 data-[state=active]:bg-[#0f2557] data-[state=active]:text-white data-[state=active]:shadow capitalize"
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── LEDGER ── */}
          <TabsContent value="ledger" className="space-y-3 mt-0">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-[#0f2557] text-sm">Transaction History</h3>
              <Button size="sm" asChild className="bg-[#0f2557] hover:bg-[#1a3570] text-white rounded-lg h-8 text-xs">
                <Link href={`/transactions/new?memberId=${memberId}`}>+ Transact</Link>
              </Button>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {isLedgerLoading ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
              ) : ledger?.entries.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground text-sm">No transactions yet</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {ledger?.entries.map(entry => (
                    <div key={entry.id} className="px-4 py-3.5">
                      <div className="flex justify-between items-start mb-1">
                        <div className="font-semibold text-[#0f2557] text-sm">{formatTransactionType(entry.type)}</div>
                        <div className={`font-bold text-sm ${entry.direction === "credit" ? "text-emerald-600" : "text-destructive"}`}>
                          {entry.direction === "credit" ? "+" : "-"}{formatCurrency(entry.amount)}
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                        <span>{formatDate(entry.createdAt)}</span>
                        <span>Bal: <span className={`font-semibold ${entry.runningBalance >= 0 ? "text-[#0f2557]" : "text-destructive"}`}>{formatCurrency(entry.runningBalance)}</span></span>
                      </div>
                      {entry.notes && (
                        <p className="mt-2 text-[11px] text-muted-foreground bg-[#f4f6fb] px-2.5 py-1.5 rounded-lg">{entry.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── PROFILE ── */}
          <TabsContent value="profile" className="space-y-4 mt-0">

            {/* Profile Photo Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-[#0f2557] text-sm">Profile Photo</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Click photo or camera icon to update</p>
                </div>
                {/* Secure badge */}
                <div className="flex items-center gap-1.5 bg-[#0f2557]/5 border border-[#0f2557]/10 rounded-full px-2.5 py-1">
                  <Lock className="w-2.5 h-2.5 text-[#c9a144]" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#0f2557]/60">Secure & Encrypted</span>
                </div>
              </div>

              <div className="px-5 py-5 flex items-center gap-5">
                {/* Profile tab avatar — uses MemberAvatar for automatic onError fallback */}
                <button
                  onClick={() => picInputRef.current?.click()}
                  disabled={uploadingPic}
                  className="group relative flex-shrink-0 transition-transform hover:scale-105"
                  title="Change profile photo"
                >
                  <MemberAvatar
                    name={profile.name}
                    photoUrl={effectivePic}
                    size="xl"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-[#c9a144] text-[#0f2557] rounded-full p-2 shadow-lg group-hover:scale-110 transition-transform border-2 border-white">
                    <Camera className="w-3.5 h-3.5" />
                  </div>
                </button>

                <div className="flex-1 space-y-3">
                  <button
                    onClick={() => picInputRef.current?.click()}
                    disabled={uploadingPic}
                    className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-[#0f2557]/20 rounded-xl py-3 text-sm font-semibold text-[#0f2557] hover:border-[#c9a144] hover:bg-[#c9a144]/5 transition-all disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4" />
                    {uploadingPic ? "Uploading…" : effectivePic ? "Change Photo" : "Upload Photo"}
                  </button>
                  <div className="flex items-start gap-1.5 bg-emerald-50 rounded-lg px-3 py-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <p className="text-[10px] text-emerald-700 leading-relaxed">
                      Photos are stored securely with end-to-end encryption. Only authorised staff can view.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Details */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <h3 className="font-bold text-[#0f2557] text-sm">Account Details</h3>
              </div>
              <div className="px-5 py-4 space-y-4">
                {[
                  { icon: Hash, label: "Account Number", value: profile.accountNumber, mono: true, copy: true },
                  { icon: CreditCard, label: "National ID", value: profile.idNumber },
                  { icon: Phone, label: "Phone Number", value: profile.phone },
                  { icon: Calendar, label: "Member Since", value: formatDate(profile.joinDate) },
                ].map(({ icon: Icon, label, value, mono, copy }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#0f2557]/5 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-3.5 w-3.5 text-[#0f2557]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
                        <p className={`text-sm font-semibold text-[#0f2557] truncate ${mono ? "font-mono" : ""}`}>{value}</p>
                      </div>
                    </div>
                    {copy && (
                      <button onClick={copyAccountNumber} className="ml-2 text-muted-foreground hover:text-[#c9a144] transition-colors flex-shrink-0">
                        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 gap-2 rounded-xl h-11 border-[#0f2557]/20 text-[#0f2557] hover:bg-[#0f2557] hover:text-white transition-all"
                onClick={() => setIsEditOpen(true)}
              >
                <Edit className="h-4 w-4" /> Edit Profile
              </Button>
              <Button
                variant="destructive"
                className="flex-1 gap-2 rounded-xl h-11"
                onClick={() => setIsDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </div>
          </TabsContent>

          {/* ── SIGNATURE ── */}
          <TabsContent value="signature" className="space-y-4 mt-0">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-[#0f2557] text-sm">Member Signature</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Draw or upload for official records</p>
                </div>
                <div className="flex items-center gap-1.5 bg-[#0f2557]/5 border border-[#0f2557]/10 rounded-full px-2.5 py-1">
                  <Lock className="w-2.5 h-2.5 text-[#c9a144]" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#0f2557]/60">Secure & Encrypted</span>
                </div>
              </div>
              <div className="px-5 py-5 space-y-4">
                {effectiveSig && (
                  <div className="space-y-2">
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Current Signature</Label>
                    <div className="border-2 border-[#0f2557]/10 rounded-xl overflow-hidden bg-white p-4 flex items-center justify-center min-h-[100px]">
                      <img src={effectiveSig} alt="Signature" className="max-h-20 max-w-full object-contain" />
                    </div>
                    <button onClick={() => setSigPreview(null)} className="text-[11px] text-destructive hover:underline flex items-center gap-1">
                      <X className="w-3 h-3" /> Replace signature
                    </button>
                  </div>
                )}

                {/* Mode toggle */}
                <div className="flex gap-1 bg-[#f4f6fb] rounded-xl p-1">
                  {(["draw", "upload"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setSigMode(mode)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-lg transition-all ${
                        sigMode === mode ? "bg-[#0f2557] text-white shadow" : "text-muted-foreground hover:text-[#0f2557]"
                      }`}
                    >
                      {mode === "draw" ? <Pen className="w-3.5 h-3.5" /> : <Upload className="w-3.5 h-3.5" />}
                      {mode === "draw" ? "Draw" : "Upload"}
                    </button>
                  ))}
                </div>

                {sigMode === "draw" ? (
                  <SignaturePad onSave={handleSigDrawSave} disabled={uploadingSig} />
                ) : (
                  <div>
                    <input ref={sigInputRef} type="file" accept="image/*" className="hidden" onChange={handleSigFileChange} />
                    <Button
                      variant="outline"
                      className="w-full gap-2 h-24 border-2 border-dashed border-[#0f2557]/20 rounded-xl flex-col hover:border-[#c9a144] hover:bg-[#c9a144]/5 transition-all"
                      onClick={() => sigInputRef.current?.click()}
                      disabled={uploadingSig}
                    >
                      <ImageIcon className="w-6 h-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground font-medium">
                        {uploadingSig ? "Uploading…" : "Click to upload signature image"}
                      </span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Crop Modal */}
      {cropSrc && (
        <PhotoCropModal
          open={isCropOpen}
          imageSrc={cropSrc}
          onClose={() => { setIsCropOpen(false); setCropSrc(null); }}
          onApply={handleCropApply}
          isUploading={uploadingPic}
        />
      )}

      {/* Edit Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#0f2557]">Edit Member Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            {[
              { id: "name", label: "Full Name", key: "name" as const },
              { id: "phone", label: "Phone Number", key: "phone" as const },
              { id: "idNumber", label: "National ID", key: "idNumber" as const },
            ].map(({ id, label, key }) => (
              <div key={id} className="space-y-1.5">
                <Label htmlFor={id} className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</Label>
                <Input
                  id={id}
                  value={editData[key]}
                  onChange={e => setEditData({ ...editData, [key]: e.target.value })}
                  required
                  className="rounded-xl border-[#0f2557]/20 focus-visible:ring-[#0f2557]"
                />
              </div>
            ))}
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="rounded-xl">Cancel</Button>
              <Button type="submit" disabled={updateMember.isPending} className="rounded-xl bg-[#0f2557] hover:bg-[#1a3570]">
                {updateMember.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle className="text-[#0f2557]">Delete Member?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{profile.name}</strong>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} className="rounded-xl">Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMember.isPending} className="rounded-xl">
              {deleteMember.isPending ? "Deleting…" : "Delete Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
