import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, ArrowRightLeft, LogOut, UserCircle, ShieldCheck } from "lucide-react";
import { ReactNode, useState } from "react";
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
import { BmmLogo } from "@/components/bmm-logo";
import { toast } from "sonner";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [imgErr, setImgErr] = useState(false);

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard, adminOnly: true },
    { href: "/members", label: "Members", icon: Users, adminOnly: true },
    { href: "/transactions/new", label: "Transact", icon: ArrowRightLeft, adminOnly: true },
    { href: "/profile", label: "Profile", icon: UserCircle, adminOnly: true },
  ];

  const visibleNavItems = navItems.filter((item) => !item.adminOnly || user);

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out successfully");
  };

  const displayName = user?.fullName ?? user?.username ?? "Admin";
  const initials = displayName.trim().split(/\s+/).map((n) => n[0]?.toUpperCase() ?? "").slice(0, 2).join("");

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#f4f6fb]">
      <header className="sticky top-0 z-30 shadow-sm" style={{ background: "#0f2557" }}>
        <div className="flex items-center justify-between px-4 h-16 max-w-lg mx-auto w-full">
          <BmmLogo variant="full" size="sm" />

          {user && (
            <div className="flex items-center gap-2.5">
              {/* Admin avatar + name — links to /profile */}
              <Link href="/profile">
                <div className="flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/10 rounded-full pl-1 pr-3 py-1 cursor-pointer transition-colors">
                  {/* Avatar */}
                  <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-[#c9a144]/20 border border-[#c9a144]/40 flex items-center justify-center">
                    {user.profilePictureUrl && !imgErr ? (
                      <img
                        src={user.profilePictureUrl}
                        alt={displayName}
                        className="w-full h-full object-cover"
                        onError={() => setImgErr(true)}
                      />
                    ) : (
                      <span className="text-[10px] font-black text-[#c9a144]">{initials}</span>
                    )}
                  </div>
                  <div className="hidden sm:block leading-none">
                    <p className="text-[10px] font-black text-white leading-tight truncate max-w-[100px]">{displayName}</p>
                    <p className="text-[9px] text-white/40 leading-tight flex items-center gap-0.5">
                      <ShieldCheck className="w-2.5 h-2.5 text-[#c9a144]" />
                      Admin
                    </p>
                  </div>
                </div>
              </Link>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="gap-1.5 text-white/60 hover:text-white hover:bg-white/10 px-2"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline text-xs">Sign out</span>
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 w-full max-w-lg mx-auto pb-24 md:pb-8">
        {children}
      </main>

      {/* Consistent branding footer */}
      <div className="pb-20 md:pb-2 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground py-2">
        <ShieldCheck className="w-3 h-3 text-[#c9a144] flex-shrink-0" />
        <span>Bash M. Money And Financial Services Ltd - Secured &amp; Encrypted</span>
      </div>

      {visibleNavItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white border-gray-200 shadow-lg">
          <nav className="flex justify-around items-center h-16 px-2 max-w-lg mx-auto">
            {visibleNavItems.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                    isActive ? "text-[#0f2557]" : "text-gray-400 hover:text-gray-700"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5px]" : ""}`} />
                  <span className={`text-[10px] font-semibold ${isActive ? "text-[#c9a144]" : ""}`}>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}
