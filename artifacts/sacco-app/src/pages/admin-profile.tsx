import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhotoCropModal } from "@/components/photo-crop-modal";
import { toast } from "sonner";
import {
  User, Phone, Mail, Hash, Camera, Edit2, ShieldCheck,
  CheckCircle2, RefreshCw, KeyRound, ChevronRight, Lock,
} from "lucide-react";
import { Link } from "wouter";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function AdminProfile() {
  const { user, refreshProfile } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.fullName ?? "");
  const [editPhone, setEditPhone] = useState(user?.phone ?? "");
  const [editEmail, setEditEmail] = useState(user?.email ?? "");
  const [saving, setSaving] = useState(false);

  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [imgErr, setImgErr] = useState(false);
  const picInputRef = useRef<HTMLInputElement>(null);

  const displayName = user?.fullName ?? user?.username ?? "Admin";
  const initials = displayName.trim().split(/\s+/).map((n) => n[0]?.toUpperCase() ?? "").slice(0, 2).join("");

  const handlePicFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setCropSrc(reader.result as string); setIsCropOpen(true); };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, []);

  const handleCropApply = async (dataUrl: string) => {
    setUploadingPic(true);
    try {
      const res = await fetch(`${BASE}/api/auth/admin/upload/profile-picture-data`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setImgErr(false);
      await refreshProfile();
      toast.success("Profile photo updated");
      setIsCropOpen(false);
      setCropSrc(null);
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploadingPic(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/api/auth/admin/profile`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: editName, phone: editPhone, email: editEmail }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      await refreshProfile();
      toast.success("Profile updated successfully");
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err.message ?? "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="bg-[#f4f6fb] min-h-screen">
      {/* Hero header */}
      <div className="bg-[#0f2557] px-4 pt-6 pb-14">
        <h1 className="text-white font-black text-xl tracking-tight">My Profile</h1>
        <p className="text-white/50 text-xs mt-1">Bash M. Money And Financial Services Ltd</p>
      </div>

      <div className="px-4 -mt-10 space-y-4 pb-10">
        {/* Profile hero card */}
        <Card className="rounded-2xl shadow-lg border-0 overflow-hidden"
          style={{ boxShadow: "0 4px 24px rgba(15,37,87,0.12)" }}>
          <div className="bg-gradient-to-br from-[#0f2557] to-[#1a3570] px-6 pt-6 pb-8 text-center relative">
            {/* Avatar */}
            <div className="relative inline-block mb-3">
              <button
                onClick={() => picInputRef.current?.click()}
                disabled={uploadingPic}
                className="group relative block"
                title="Change profile photo"
              >
                <div className="w-24 h-24 rounded-full overflow-hidden border-[3px] border-[#c9a144] bg-[#1a3570] flex items-center justify-center shadow-xl mx-auto">
                  {user.profilePictureUrl && !imgErr ? (
                    <img
                      src={user.profilePictureUrl}
                      alt={displayName}
                      className="w-full h-full object-cover"
                      onError={() => setImgErr(true)}
                    />
                  ) : (
                    <span className="text-[#c9a144] font-black text-3xl select-none">{initials}</span>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-[#c9a144] text-[#0f2557] rounded-full p-2 shadow-lg border-2 border-white group-hover:scale-110 transition-transform">
                  <Camera className="w-3.5 h-3.5" />
                </div>
              </button>
              <input ref={picInputRef} type="file" accept="image/*" className="hidden" onChange={handlePicFileChange} />
            </div>

            <h2 className="text-white font-black text-lg leading-tight">{displayName}</h2>
            <p className="text-white/50 text-xs mt-1 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3 text-[#c9a144]" />
              {user.employeeId ?? user.username} · Administrator
            </p>

            {/* Upload hint */}
            <button
              onClick={() => picInputRef.current?.click()}
              disabled={uploadingPic}
              className="mt-3 text-[11px] text-[#c9a144]/70 hover:text-[#c9a144] transition-colors font-medium"
            >
              {uploadingPic ? "Uploading…" : "Tap photo to update"}
            </button>
          </div>

          {/* Info rows */}
          {!isEditing ? (
            <CardContent className="p-5 space-y-4">
              {[
                { icon: User,  label: "Full Name",    value: user.fullName ?? "Not set" },
                { icon: Hash,  label: "Employee ID",  value: user.employeeId ?? user.username, mono: true },
                { icon: Phone, label: "Phone",         value: user.phone ?? "Not set" },
                { icon: Mail,  label: "Email",         value: user.email ?? "Not set" },
              ].map(({ icon: Icon, label, value, mono }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#0f2557]/5 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-[#0f2557]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
                    <p className={`text-sm text-[#0f2557] truncate ${mono ? "font-mono font-black" : "font-semibold"} ${value === "Not set" ? "text-muted-foreground italic" : ""}`}>{value}</p>
                  </div>
                </div>
              ))}

              <Button
                className="w-full mt-2 h-10 rounded-xl bg-[#0f2557] hover:bg-[#1a3570] text-white text-sm font-semibold gap-2"
                onClick={() => {
                  setEditName(user.fullName ?? "");
                  setEditPhone(user.phone ?? "");
                  setEditEmail(user.email ?? "");
                  setIsEditing(true);
                }}
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit Profile
              </Button>
            </CardContent>
          ) : (
            <CardContent className="p-5">
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Full Name</Label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="e.g. John Mwangi"
                    className="rounded-xl h-11 border-[#0f2557]/15 focus-visible:ring-[#0f2557]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Phone Number</Label>
                  <Input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+256 700 000000"
                    className="rounded-xl h-11 border-[#0f2557]/15 focus-visible:ring-[#0f2557]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email Address</Label>
                  <Input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="rounded-xl h-11 border-[#0f2557]/15 focus-visible:ring-[#0f2557]"
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <Button type="button" variant="outline" className="flex-1 h-10 rounded-xl" onClick={() => setIsEditing(false)} disabled={saving}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 h-10 rounded-xl bg-[#0f2557] hover:bg-[#1a3570] text-white font-semibold" disabled={saving}>
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-3.5 h-3.5" /> Save</>}
                  </Button>
                </div>
              </form>
            </CardContent>
          )}
        </Card>

        {/* Quick links */}
        <div className="space-y-2">
          <Link href="/security">
            <div className="bg-white rounded-2xl px-4 py-3.5 shadow-sm border border-gray-100 flex items-center gap-3 hover:border-[#0f2557]/20 transition-colors cursor-pointer">
              <div className="w-9 h-9 rounded-xl bg-[#0f2557]/5 flex items-center justify-center flex-shrink-0">
                <KeyRound className="w-4 h-4 text-[#0f2557]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[#0f2557] text-sm">Security Settings</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Change your admin login PIN</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </div>
          </Link>

          <div className="bg-[#0f2557]/3 rounded-2xl px-4 py-3 flex items-start gap-2.5">
            <Lock className="w-3.5 h-3.5 text-[#c9a144] mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Your profile is secured with end-to-end encryption. Profile photos are stored on encrypted servers.
            </p>
          </div>
        </div>
      </div>

      {cropSrc && (
        <PhotoCropModal
          open={isCropOpen}
          imageSrc={cropSrc}
          onClose={() => { setIsCropOpen(false); setCropSrc(null); }}
          onApply={handleCropApply}
          isUploading={uploadingPic}
        />
      )}
    </div>
  );
}
