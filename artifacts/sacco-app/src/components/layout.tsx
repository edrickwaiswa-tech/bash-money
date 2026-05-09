import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, ArrowRightLeft, LogOut, ShieldCheck } from "lucide-react";

import { ReactNode } from "react";
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
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
    <div className="flex flex-col min-h-[100dvh] bg-gray-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-30 border-b bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
        <div className="flex items-center justify-between px-4 h-16 max-w-lg mx-auto w-full">
          <div className="flex items-center gap-2">
            <div className="bg-primary text-white px-2.5 py-1.5 rounded-lg">
              <span className="font-black text-sm tracking-tight">BM</span>
            </div>
            <span className="font-black text-lg tracking-tight">Bash M. Money</span>
          </div>

          {user && (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-primary/10 text-primary px-2 py-1 rounded-full">
                <ShieldCheck className="w-3 h-3" />
                <span>{user.username}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="gap-1.5 text-muted-foreground hover:text-destructive"
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
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 md:relative md:max-w-lg md:mx-auto md:bg-transparent md:border-none">
          <nav className="flex justify-around items-center h-16 px-2 md:hidden">
            {visibleNavItems.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                    isActive ? "text-primary" : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5px]" : ""}`} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}
