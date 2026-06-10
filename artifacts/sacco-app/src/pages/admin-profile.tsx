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
import { mediaUrl } from "@/lib/media-url";

const BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") || import.meta.env.BASE_URL.replace(/\/$/, "");

export function AdminProfile() {
  const { user, refreshProfile } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [editName,  setEditName]  = useState(user?.fullName ?? "");
  const [editPhone, setEditPhone] = useState(user?.phone ?? "");
  const [editEmail, setEditEmail] = useState(user?.email ?? "");
  const [saving,    setSaving]    = useState(false);

  const [cropSrc,      setCropSrc]      = useState<string | null>(null);
  const [isCropOpen,   setIsCropOpen]   = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [imgErr,       setImgErr]       = useState(false);
  const picInputRef = useRef<HTMLInputElement>(null);

  const displayName = user?.fullName ?? user?.username ?? "Admin";
  const profilePhotoUrl = mediaUrl(user?.profilePictureUrl);
  const initials    = displayName.trim().split(/\s+/).map((n) => n[0]?.toUpperCase() ?? "").slice(0, 2).join("");

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
        credentials: "include",
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
        credentials: "include",
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
    <div className="min-h-screen">
      {/* Page header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-[22px] font-black text-[#0f2557] leading-tight">My Profile</h1>
        <p className="text-gray-400 text-xs mt-0.5">Bash M. Money And Financial Services Ltd</p>
      </div>

      <div className="px-4 space-y-4 pb-10">
        {/* Profile hero card */}
        <Card className="rounded-2xl border-0 overflow-hidden"
          style={{ boxShadow: "0 4px 24px rgba(15,37,87,0.10)" }}>

          {/* Avatar section — light gradient instead of dark navy */}
          <div
            className="px-6 pt-7 pb-8 text-center relative"
            style={{ background: "linear-gradient(160deg, #f7f5f2 0%, #eef1f8 60%, #f5eef2 100%)", borderBottom: "1px solid #f0eff4" }}
          >
            {/* Avatar */}
            <div className="relative inline-block mb-3">
              <button
                onClick={() => picInputRef.current?.click()}
                disabled={uploadingPic}
                className="group relative block"
                title="Change profile photo"
              >
                <div className="w-24 h-24 rounded-full overflow-hidden border-[3px] border-[#B03060]/30 bg-white flex items-center justify-center shadow-lg mx-auto">
                  {profilePhotoUrl && !imgErr ? (
                    <img
                      src={profilePhotoUrl}
                      alt={displayName}
                      className="w-full h-full object-cover"
                      onError={() => setImgErr(true)}
                    />
                  ) : (
                    <span className="text-[#B03060] font-black text-3xl select-none">{initials}</span>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-[#B03060] text-white rounded-full p-2 shadow-lg border-2 border-white group-hover:scale-110 transition-transform">
                  <Camera className="w-3.5 h-3.5" />
                </div>
              </button>
              <input ref={picInputRef} type="file" accept="image/*" className="hidden" onChange={handlePicFileChange} />
            </div>

            <h2 className="font-black text-lg text-[#0f2557] leading-tight">{displayName}</h2>
            <p className="text-gray-400 text-xs mt-1 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3 text-[#c9a144]" />
              {user.employeeId ?? user.username} · Administrator
            </p>
            <button
              onClick={() => picInputRef.current?.click()}
              disabled={uploadingPic}
              className="mt-2 text-[11px] text-gray-400 hover:text-[#B03060] transition-colors font-medium"
            >
              {uploadingPic ? "Uploading…" : "Tap photo to update"}
            </button>
          </div>

          {/* Info rows */}
          {!isEditing ? (
            <CardContent className="p-5 space-y-4 bg-white">
              {[
                { icon: User,  label: "Full Name",   value: user.fullName ?? "Not set" },
                { icon: Hash,  label: "Employee ID", value: user.employeeId ?? user.username, mono: true },
                { icon: Phone, label: "Phone",        value: user.phone ?? "Not set" },
                { icon: Mail,  label: "Email",        value: user.email ?? "Not set" },
              ].map(({ icon: Icon, label, value, mono }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#B03060]/6 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-[#B03060]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">{label}</p>
                    <p className={`text-sm text-[#0f2557] truncate ${mono ? "font-mono font-black" : "font-semibold"} ${value === "Not set" ? "text-gray-300 italic" : ""}`}>
                      {value}
                    </p>
                  </div>
                </div>
              ))}

              <Button
                className="w-full mt-2 h-10 rounded-xl text-white text-sm font-semibold gap-2 shadow-sm"
                onClick={() => {
                  setEditName(user.fullName ?? "");
                  setEditPhone(user.phone ?? "");
                  setEditEmail(user.email ?? "");
                  setIsEditing(true);
                }}
                style={{ background: "linear-gradient(135deg, #B03060 0%, #7B1535 100%)" }}
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit Profile
              </Button>
            </CardContent>
          ) : (
            <CardContent className="p-5 bg-white">
              <form onSubmit={handleSaveProfile} className="space-y-4">
                {[
                  { label: "Full Name",     value: editName,  onChange: setEditName,  placeholder: "e.g. John Mwangi",    type: "text"  },
                  { label: "Phone Number",  value: editPhone, onChange: setEditPhone, placeholder: "+256 700 000000",      type: "tel"   },
                  { label: "Email Address", value: editEmail, onChange: setEditEmail, placeholder: "admin@example.com",   type: "email" },
                ].map(({ label, value, onChange, placeholder, type }) => (
                  <div key={label} className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</Label>
                    <Input
                      type={type}
                      value={value}
                      onChange={(e) => onChange(e.target.value)}
                      placeholder={placeholder}
                      className="rounded-xl h-11 border-gray-200 focus-visible:ring-[#B03060]/40 focus-visible:border-[#B03060]"
                    />
                  </div>
                ))}
                <div className="flex gap-3 pt-1">
                  <Button type="button" variant="outline" className="flex-1 h-10 rounded-xl" onClick={() => setIsEditing(false)} disabled={saving}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 h-10 rounded-xl text-white font-semibold shadow-sm"
                    style={{ background: "linear-gradient(135deg, #B03060 0%, #7B1535 100%)" }}
                    disabled={saving}
                  >
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Save</>}
                  </Button>
                </div>
              </form>
            </CardContent>
          )}
        </Card>

        {/* Quick links */}
        <div className="space-y-2">
          <Link href="/security">
            <div className="bg-white rounded-2xl px-4 py-3.5 border border-gray-100 flex items-center gap-3 hover:border-[#B03060]/20 transition-colors cursor-pointer"
              style={{ boxShadow: "0 2px 8px rgba(15,37,87,0.05)" }}>
              <div className="w-9 h-9 rounded-xl bg-[#B03060]/6 flex items-center justify-center flex-shrink-0">
                <KeyRound className="w-4 h-4 text-[#B03060]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[#0f2557] text-sm">Security Settings</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Change your admin login PIN</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
            </div>
          </Link>

          <div className="bg-gray-50 rounded-2xl px-4 py-3 flex items-start gap-2.5 border border-gray-100">
            <Lock className="w-3.5 h-3.5 text-[#c9a144] mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-gray-400 leading-relaxed">
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
