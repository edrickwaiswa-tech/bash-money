import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, ArrowRightLeft } from "lucide-react";
import { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/members", label: "Members", icon: Users },
    { href: "/transactions/new", label: "Transact", icon: ArrowRightLeft },
  ];

  return (
    <div className="flex flex-col min-h-[100dvh] bg-gray-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-30 border-b bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
        <div className="flex items-center justify-between px-4 h-16 max-w-lg mx-auto w-full">
          <div className="flex items-center gap-2">
            <div className="bg-primary text-white p-2 rounded-lg">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <span className="font-semibold text-lg tracking-tight">SACCO Ledger</span>
          </div>
        </div>
      </header>
      
      <main className="flex-1 w-full max-w-lg mx-auto pb-24 md:pb-8">
        {children}
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 md:relative md:max-w-lg md:mx-auto md:bg-transparent md:border-none">
        <nav className="flex justify-around items-center h-16 px-2 md:hidden">
          {navItems.map((item) => {
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
    </div>
  );
}
