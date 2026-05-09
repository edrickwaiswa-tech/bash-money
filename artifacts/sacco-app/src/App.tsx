import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/auth";
import { Layout } from "@/components/layout";
import { ProtectedRoute } from "@/components/protected-route";
import NotFound from "@/pages/not-found";
import { Login } from "@/pages/login";
import { ForgotPin } from "@/pages/forgot-pin";
import { Dashboard } from "@/pages/dashboard";
import { MembersList } from "@/pages/members/index";
import { MemberDetail } from "@/pages/members/[id]";
import { NewTransaction } from "@/pages/transactions/new";
import { MemberLogin } from "@/pages/member-login";
import { MemberPortal } from "@/pages/member-portal";
import { SecuritySettings } from "@/pages/security-settings";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      {/* Public auth routes — no layout */}
      <Route path="/login" component={Login} />
      <Route path="/forgot-pin" component={ForgotPin} />

      {/* Legacy member login redirect → unified login */}
      <Route path="/my-account" component={MemberLogin} />
      <Route path="/my-account/portal" component={MemberPortal} />

      {/* All other routes get the layout */}
      <Route>
        <Layout>
          <Switch>
            <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
            <Route path="/members" component={() => <ProtectedRoute component={MembersList} />} />
            <Route path="/transactions/new" component={() => <ProtectedRoute component={NewTransaction} />} />
            <Route path="/security" component={() => <ProtectedRoute component={SecuritySettings} />} />

            {/* Public member self-service — no auth required */}
            <Route path="/members/:id" component={MemberDetail} />

            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster richColors position="top-center" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
