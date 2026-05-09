import { useState } from "react";
import { useListMembers, useCreateMember, getListMembersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { formatCurrency } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, UserPlus, Phone, ChevronRight, Hash, Plus } from "lucide-react";
import { MemberAvatar } from "@/components/member-avatar";
import { toast } from "sonner";

export function MembersList() {
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: members, isLoading } = useListMembers(
    { search: search || undefined },
    { query: { queryKey: getListMembersQueryKey({ search: search || undefined }) } }
  );

  const { data: allMembers } = useListMembers(
    {},
    { query: { queryKey: getListMembersQueryKey({}) } }
  );

  const createMember = useCreateMember({
    mutation: {
      onSuccess: () => {
        toast.success("Member created successfully");
        queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
        setIsAddOpen(false);
        setNewMember({ name: "", phone: "", idNumber: "" });
      },
      onError: (err: any) => {
        toast.error(err.error || "Failed to create member");
      }
    }
  });

  const [newMember, setNewMember] = useState({ name: "", phone: "", idNumber: "" });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMember.mutate({ data: newMember });
  };

  const nextSeq = String((allMembers?.length ?? 0) + 1).padStart(5, "0");
  const previewAccountNo = `BMMFS-${new Date().getFullYear()}-${nextSeq}`;

  return (
    <div className="bg-[#f4f6fb] min-h-screen">
      {/* Page hero */}
      <div className="bg-[#0f2557] px-4 pt-6 pb-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white font-black text-xl tracking-tight">Members</h1>
            <p className="text-white/50 text-xs mt-1">Bash M. Money Financial Services Ltd</p>
          </div>
          <Button
            size="sm"
            onClick={() => setIsAddOpen(true)}
            className="bg-[#c9a144] hover:bg-[#b8902f] text-[#0f2557] font-bold rounded-xl gap-1.5 border-0"
          >
            <UserPlus className="h-4 w-4" />
            New Member
          </Button>
        </div>
      </div>

      <div className="px-4 -mt-5 space-y-4 pb-28">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search members by name or phone…"
            className="pl-10 h-11 rounded-xl bg-white border-gray-100 shadow-sm focus-visible:ring-[#0f2557]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Member List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl h-20 animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : members?.length === 0 ? (
          <div className="text-center py-14 text-muted-foreground border-2 border-dashed border-gray-200 rounded-2xl bg-white">
            <UserPlus className="h-8 w-8 mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-sm">No members found</p>
            <p className="text-xs mt-1">Try a different search or register a new member</p>
            <Button
              size="sm"
              onClick={() => setIsAddOpen(true)}
              className="mt-4 bg-[#0f2557] hover:bg-[#1a3570] text-white rounded-xl gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Register First Member
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {members?.map(member => {
              const balance = (member as any).currentBalance ?? 0;
              return (
                <Link key={member.id} href={`/members/${member.id}`} className="block">
                  <div className="bg-white rounded-2xl px-4 py-3.5 shadow-sm border border-gray-100 flex items-center gap-3 hover:border-[#0f2557]/20 hover:shadow transition-all group">
                    <MemberAvatar
                      name={member.name}
                      photoUrl={(member as any).profilePictureUrl}
                      size="md"
                    />

                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#0f2557] text-sm group-hover:text-[#1a3570] truncate">{member.name}</p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                        {(member as any).accountNumber && (
                          <span className="flex items-center gap-0.5 font-mono font-semibold text-[#0f2557]/60">
                            <Hash className="h-2.5 w-2.5" />{(member as any).accountNumber}
                          </span>
                        )}
                        <span className="flex items-center gap-0.5">
                          <Phone className="h-2.5 w-2.5" />{member.phone}
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className={`font-black text-sm ${balance >= 0 ? "text-[#0f2557]" : "text-destructive"}`}>
                        {formatCurrency(balance)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">balance</p>
                    </div>

                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setIsAddOpen(true)}
        className="fixed bottom-24 right-5 z-50 w-14 h-14 rounded-full bg-[#c9a144] hover:bg-[#b8902f] text-[#0f2557] shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 border-4 border-white"
        title="Register new member"
        aria-label="Register new member"
      >
        <Plus className="h-7 w-7 stroke-[2.5px]" />
      </button>

      {/* Add Member Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="rounded-2xl max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-[#0f2557] font-black">Register New Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">

            {/* Account number preview */}
            <div className="flex items-center gap-3 bg-[#0f2557]/5 border border-[#0f2557]/10 rounded-xl px-4 py-3">
              <div className="w-8 h-8 rounded-lg bg-[#0f2557] flex items-center justify-center flex-shrink-0">
                <Hash className="h-3.5 w-3.5 text-[#c9a144]" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Account Number (Auto-assigned)</p>
                <p className="font-mono font-black text-sm text-[#0f2557] tracking-wide">{previewAccountNo}</p>
              </div>
            </div>

            {[
              { id: "name",     label: "Full Name",         key: "name"     as const, placeholder: "e.g. John Doe", type: "text" },
              { id: "phone",    label: "Phone Number",      key: "phone"    as const, placeholder: "+256 700 000000", type: "tel" },
              { id: "idNumber", label: "National ID Number",key: "idNumber" as const, placeholder: "e.g. CM90100012BVAW", type: "text" },
            ].map(({ id, label, key, placeholder, type }) => (
              <div key={id} className="space-y-1.5">
                <Label htmlFor={id} className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</Label>
                <Input
                  id={id}
                  type={type}
                  placeholder={placeholder}
                  value={newMember[key]}
                  onChange={e => setNewMember({ ...newMember, [key]: e.target.value })}
                  required
                  className="rounded-xl border-[#0f2557]/15 focus-visible:ring-[#0f2557] h-11"
                />
              </div>
            ))}

            <DialogFooter className="gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="rounded-xl flex-1">Cancel</Button>
              <Button type="submit" disabled={createMember.isPending} className="rounded-xl flex-1 bg-[#0f2557] hover:bg-[#1a3570] font-bold">
                {createMember.isPending ? "Creating…" : "Register Member"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
