import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Register from "@/pages/Register";
import SimpleLogin from "@/pages/SimpleLogin";
import Dashboard from "@/pages/Dashboard";
import Transfer from "@/pages/Transfer";
import Recharge from "@/pages/Recharge";
import Payment from "@/pages/Payment";
import Withdrawal from "@/pages/Withdrawal";
import TeamPage from "@/pages/TeamPage";
import Work from "@/pages/Work";
import Profile from "@/pages/Profile";
import Transactions from "@/pages/Transactions";
import Assistance from "@/pages/Assistance";
import ApiAgregateur from "@/pages/ApiAgregateur";
import IdentityVerification from "@/pages/IdentityVerification";
import BankCard from "@/pages/BankCard";
import AdminDashboard from "@/pages/AdminDashboard";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary to-blue-600">
        <div className="text-center">
          <div className="bg-gradient-to-r from-primary to-accent w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse">
            <i className="fas fa-business-time text-white text-2xl"></i>
          </div>
          <div className="text-white text-lg font-semibold">Chargement...</div>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/register" component={Register} />
          <Route path="/simple-login" component={SimpleLogin} />
        </>
      ) : (
        <>
          <Route path="/" component={(user as any)?.role === 'admin' ? AdminDashboard : Dashboard} />
          <Route path="/transfer" component={Transfer} />
          <Route path="/recharge" component={Recharge} />
          <Route path="/payment" component={Payment} />
          <Route path="/withdrawal" component={Withdrawal} />
          <Route path="/team" component={TeamPage} />
          <Route path="/work" component={Work} />
          <Route path="/profile" component={Profile} />
          <Route path="/transactions" component={Transactions} />
          <Route path="/assistance" component={Assistance} />
          <Route path="/api-agregateur" component={ApiAgregateur} />
          <Route path="/identity-verification" component={IdentityVerification} />
          <Route path="/bank-card" component={BankCard} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/dashboard" component={Dashboard} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
