import { useGetDashboardSummary, useGetRecentTransactions } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate, formatTransactionType } from "@/lib/format";
import { Users, Wallet, Landmark, Activity, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { Link } from "wouter";

export function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: recentTxs, isLoading: isLoadingRecent } = useGetRecentTransactions({ limit: 10 });

  return (
    <div className="p-4 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of SACCO performance.</p>
      </div>

      {isLoadingSummary ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-6 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : summary ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Wallet className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">Total Savings</span>
                </div>
                <span className="text-lg font-bold text-primary">{formatCurrency(summary.totalSavings)}</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Landmark className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">Active Loans</span>
                </div>
                <span className="text-lg font-bold text-destructive">{formatCurrency(summary.totalLoansOutstanding)}</span>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">Members</span>
                </div>
                <span className="text-xl font-bold">{summary.totalMembers}</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">Transactions</span>
                </div>
                <span className="text-xl font-bold">{summary.totalTransactions}</span>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Transactions</h2>
        </div>
        
        <Card>
          <div className="divide-y divide-border">
            {isLoadingRecent ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-4 w-24" />
                </div>
              ))
            ) : recentTxs?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No recent transactions
              </div>
            ) : (
              recentTxs?.map(tx => (
                <Link key={tx.id} href={`/members/${tx.memberId}`} className="block p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${tx.direction === 'credit' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                        {tx.direction === 'credit' ? <ArrowDownToLine className="h-4 w-4" /> : <ArrowUpFromLine className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{tx.memberName}</p>
                        <p className="text-xs text-muted-foreground">{formatTransactionType(tx.type)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold text-sm ${tx.direction === 'credit' ? 'text-primary' : 'text-destructive'}`}>
                        {tx.direction === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{formatDate(tx.createdAt)}</p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
