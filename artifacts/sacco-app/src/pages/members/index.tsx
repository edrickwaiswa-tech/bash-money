import { useState } from "react";
import { useListMembers, useCreateMember, getListMembersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { formatCurrency } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, UserPlus, Phone, ChevronRight, Hash } from "lucide-react";
import { toast } from "sonner";

export function MembersList() {
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: members, isLoading } = useListMembers(
    { search: search || undefined },
    { query: { queryKey: getListMembersQueryKey({ search: search || undefined }) } }
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

  return (
    <div className="bg-[#f4f6fb] min-h-screen">
      {/* Page hero */}
      <div className="bg-[#0f2557] px-4 pt-6 pb-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white font-black text-xl tracking-tight">Members</h1>
            <p className="text-white/50 text-xs mt-1">Bash M. Money And Financial Services Ltd</p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-[#c9a144] hover:bg-[#b8902f] text-[#0f2557] font-bold rounded-xl gap-1.5 border-0">
                <UserPlus className="h-4 w-4" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-[#0f2557]">Add New Member</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                {[
                  { id: "name", label: "Full Name", key: "name" as const, placeholder: "e.g. John Doe" },
                  { id: "phone", label: "Phone Number", key: "phone" as const, placeholder: "+256 700 000000" },
                  { id: "idNumber", label: "National ID Number", key: "idNumber" as const, placeholder: "e.g. CM90100012BVAW" },
                ].map(({ id, label, key, placeholder }) => (
                  <div key={id} className="space-y-1.5">
                    <Label htmlFor={id} className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</Label>
                    <Input
                      id={id}
                      placeholder={placeholder}
                      value={newMember[key]}
                      onChange={e => setNewMember({ ...newMember, [key]: e.target.value })}
                      required
                      className="rounded-xl border-[#0f2557]/15 focus-visible:ring-[#0f2557] h-11"
                    />
                  </div>
                ))}
                <DialogFooter className="gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="rounded-xl">Cancel</Button>
                  <Button type="submit" disabled={createMember.isPending} className="rounded-xl bg-[#0f2557] hover:bg-[#1a3570]">
                    {createMember.isPending ? "Creating…" : "Create Member"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="px-4 -mt-5 space-y-4 pb-8">
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
            <p className="font-medium text-sm">No members found</p>
            <p className="text-xs mt-1">Try a different search or add a new member</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {members?.map(member => {
              const initials = member.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
              const balance = (member as any).currentBalance ?? 0;
              return (
                <Link key={member.id} href={`/members/${member.id}`} className="block">
                  <div className="bg-white rounded-2xl px-4 py-3.5 shadow-sm border border-gray-100 flex items-center gap-3 hover:border-[#0f2557]/20 hover:shadow transition-all group">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center bg-[#0f2557]/5 border-2 border-[#c9a144]/30 overflow-hidden">
                      {(member as any).profilePictureUrl ? (
                        <img src={(member as any).profilePictureUrl} alt={member.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[#0f2557] font-black text-sm">{initials}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#0f2557] text-sm group-hover:text-[#1a3570] truncate">{member.name}</p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                        {(member as any).accountNumber && (
                          <span className="flex items-center gap-0.5 font-mono text-[#0f2557]/50">
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
    </div>
  );
}
