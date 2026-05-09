import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, ArrowRightLeft, LogOut, ShieldCheck } from "lucide-react";
import { ReactNode } from "react";
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

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard, adminOnly: true },
    { href: "/members", label: "Members", icon: Users, adminOnly: true },
    { href: "/transactions/new", label: "Transact", icon: ArrowRightLeft, adminOnly: true },
  ];

  const visibleNavItems = navItems.filter((item) => !item.adminOnly || user);

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out successfully");
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#f4f6fb]">
      <header className="sticky top-0 z-30 shadow-sm" style={{ background: "#0f2557" }}>
        <div className="flex items-center justify-between px-4 h-16 max-w-lg mx-auto w-full">
          <BmmLogo variant="full" size="sm" />

          {user && (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-medium text-white/70 bg-white/10 px-2.5 py-1 rounded-full border border-white/10">
                <ShieldCheck className="w-3 h-3 text-[#c9a144]" />
                <span>{user.username}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="gap-1.5 text-white/60 hover:text-white hover:bg-white/10"
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

      {visibleNavItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white border-gray-200 md:relative md:max-w-lg md:mx-auto md:bg-transparent md:border-none shadow-lg md:shadow-none">
          <nav className="flex justify-around items-center h-16 px-2 md:hidden">
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
