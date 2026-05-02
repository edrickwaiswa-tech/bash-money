import { useState } from "react";
import { useListMembers, useCreateMember, getListMembersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { formatCurrency } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, UserPlus, Phone, CreditCard, ChevronRight } from "lucide-react";
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

  const [newMember, setNewMember] = useState({
    name: "",
    phone: "",
    idNumber: ""
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMember.mutate({ data: newMember });
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Members</h1>
          <p className="text-sm text-muted-foreground">Manage SACCO members.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <UserPlus className="h-4 w-4" />
              <span>Add</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Member</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name" 
                  value={newMember.name} 
                  onChange={e => setNewMember({...newMember, name: e.target.value})} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input 
                  id="phone" 
                  value={newMember.phone} 
                  onChange={e => setNewMember({...newMember, phone: e.target.value})} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="idNumber">ID Number</Label>
                <Input 
                  id="idNumber" 
                  value={newMember.idNumber} 
                  onChange={e => setNewMember({...newMember, idNumber: e.target.value})} 
                  required 
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMember.isPending}>
                  {createMember.isPending ? "Creating..." : "Create Member"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search members..." 
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Card key={i} className="h-20 animate-pulse bg-muted" />)}
          </div>
        ) : members?.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground border rounded-lg border-dashed">
            No members found.
          </div>
        ) : (
          members?.map(member => (
            <Link key={member.id} href={`/members/${member.id}`} className="block">
              <Card className="p-4 hover:border-primary/50 transition-colors flex items-center justify-between group">
                <div className="space-y-1">
                  <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">{member.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {member.phone}
                    </span>
                    <span className="flex items-center gap-1">
                      <CreditCard className="h-3 w-3" />
                      {member.idNumber}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
