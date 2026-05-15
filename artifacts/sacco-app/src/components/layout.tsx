import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, ArrowRightLeft, LogOut, ShieldCheck, BarChart3, Landmark } from "lucide-react";
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
    { href: "/",                  label: "Dashboard", icon: LayoutDashboard, adminOnly: true },
    { href: "/members",           label: "Members",   icon: Users,           adminOnly: true },
    { href: "/loans",             label: "Loans",     icon: Landmark,        adminOnly: true },
    { href: "/transactions/new",  label: "Transact",  icon: ArrowRightLeft,  adminOnly: true },
    { href: "/reports",           label: "Reports",   icon: BarChart3,       adminOnly: true },
  ];

  const visibleNavItems = navItems.filter((item) => !item.adminOnly || user);

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out successfully");
  };

  const displayName = user?.fullName ?? user?.username ?? "Admin";
  const initials = displayName.trim().split(/\s+/).map((n) => n[0]?.toUpperCase() ?? "").slice(0, 2).join("");

  return (
    <div className="flex flex-col min-h-[100dvh]" style={{ background: "linear-gradient(160deg, #f7f5f2 0%, #eef1f8 50%, #f0edf6 100%)" }}>
      {/* ── Top header bar ── */}
      <header
        className="sticky top-0 z-30 bg-white border-b border-gray-100"
        style={{ boxShadow: "0 2px 12px rgba(15,37,87,0.07)" }}
      >
        <div className="flex items-center justify-between px-4 h-[64px] max-w-lg mx-auto w-full">
          <BmmLogo size="md" />

          {user && (
            <div className="flex items-center gap-2">
              {/* Admin name + avatar pill → /profile */}
              <Link href="/profile">
                <div className="flex items-center gap-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full pl-3 pr-1.5 py-1 cursor-pointer transition-colors">
                  <div className="leading-none text-right">
                    <p className="text-[11px] font-black text-[#0f2557] leading-tight truncate max-w-[100px]">{displayName}</p>
                    <p className="text-[9px] text-gray-400 leading-tight mt-0.5 font-mono tracking-wide">
                      {user.employeeId ?? "Admin"}
                    </p>
                  </div>
                  <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-[#B03060]/10 border-2 border-[#B03060]/30 flex items-center justify-center">
                    {user.profilePictureUrl && !imgErr ? (
                      <img
                        src={user.profilePictureUrl}
                        alt={displayName}
                        className="w-full h-full object-cover"
                        onError={() => setImgErr(true)}
                      />
                    ) : (
                      <span className="text-[10px] font-black text-[#B03060]">{initials}</span>
                    )}
                  </div>
                </div>
              </Link>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="gap-1.5 text-gray-400 hover:text-[#B03060] hover:bg-[#B03060]/5 px-2 transition-colors"
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

      {/* Branding footer */}
      <div className="pb-20 md:pb-2 flex items-center justify-center gap-1.5 text-[10px] text-gray-400 py-2">
        <ShieldCheck className="w-3 h-3 text-[#c9a144] flex-shrink-0" />
        <span>Bash M. Money And Financial Services Ltd — Secured &amp; Encrypted</span>
      </div>

      {/* ── Bottom navigation bar ── */}
      {visibleNavItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100"
          style={{ boxShadow: "0 -4px 16px rgba(15,37,87,0.07)" }}>
          <nav className="flex justify-around items-center h-16 px-2 max-w-lg mx-auto">
            {visibleNavItems.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors relative ${
                    isActive ? "text-[#B03060]" : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {isActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-full bg-[#B03060]" />
                  )}
                  <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5px]" : ""}`} />
                  <span className={`text-[10px] font-bold ${isActive ? "text-[#B03060]" : "text-gray-400"}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}
