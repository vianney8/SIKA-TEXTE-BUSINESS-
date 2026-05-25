import { type ReactNode } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import MaintenancePage from "@/pages/MaintenancePage";
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
import AdminSettings from "@/pages/AdminSettings";
import AdminMessages from "@/pages/AdminMessages";
import AdminCiUpdate from "@/pages/AdminCiUpdate";
import AdminWithdrawals from "@/pages/AdminWithdrawals";
import AdminPcsSend from "@/pages/AdminPcsSend";
import Summary from "@/pages/Summary";
import Activation from "@/pages/Activation";
import ActivationSuccess from "@/pages/ActivationSuccess";
import CiUpdatePage from "@/pages/CiUpdatePage";
import ForgotPassword from "@/pages/ForgotPassword";
import PaymentLinkPage from "@/pages/PaymentLinkPage";
import SpayNetwork from "@/pages/SpayNetwork";
import AiChatBot from "@/components/AiChatBot";

// Wrapper component to handle authenticated user redirects for register page
function RegisterWithRedirect() {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      const urlParams = new URLSearchParams(window.location.search);
      const referralCodeParam = urlParams.get('ref');
      
      if (referralCodeParam) {
        toast({
          title: "Déjà connecté",
          description: `Vous êtes déjà connecté ! Code de parrainage: ${referralCodeParam}`,
        });
      }
      
      if ((user as any)?.role === 'admin') {
        setLocation('/admin');
      } else {
        setLocation('/dashboard');
      }
      return;
    }
  }, [isAuthenticated, user, setLocation, toast]);

  if (isAuthenticated) {
    return null; // Don't render anything while redirecting
  }

  return <Register />;
}

// Wrapper component to handle authenticated user redirects for login page
function SimpleLoginWithRedirect() {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      if ((user as any)?.role === 'admin') {
        setLocation('/admin');
      } else {
        setLocation('/dashboard');
      }
      return;
    }
  }, [isAuthenticated, user, setLocation]);

  if (isAuthenticated) {
    return null; // Don't render anything while redirecting
  }

  return <SimpleLogin />;
}

function MaintenanceGuard({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isAdmin = (user as any)?.role === 'admin';

  const { data: maintenance } = useQuery<{ enabled: boolean; endTime: string; message: string }>({
    queryKey: ['/api/maintenance-status'],
    refetchInterval: 30000,
    retry: false,
  });

  if (maintenance?.enabled && !isAdmin) {
    return <MaintenancePage endTime={maintenance.endTime} message={maintenance.message} />;
  }

  return <>{children}</>;
}

function CiUpdateGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const isAdmin = (user as any)?.role === 'admin';

  const { data: ciStatus } = useQuery<{ ciUpdateRequired: boolean }>({
    queryKey: ['/api/user/ci-update-status'],
    enabled: isAuthenticated && !isAdmin,
    refetchInterval: 10000,
  });

  if (isAuthenticated && !isAdmin && ciStatus?.ciUpdateRequired) {
    return <CiUpdatePage />;
  }

  return <>{children}</>;
}

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
    <MaintenanceGuard>
    <CiUpdateGuard>
    <Switch>
      {/* Public payment page — accessible without authentication */}
      <Route path="/pay/:linkId" component={PaymentLinkPage} />

      {!isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/register" component={RegisterWithRedirect} />
          <Route path="/simple-login" component={SimpleLoginWithRedirect} />
          <Route path="/forgot-password" component={ForgotPassword} />
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
          <Route path="/activation" component={Activation} />
          <Route path="/activation-success" component={ActivationSuccess} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/settings" component={AdminSettings} />
          <Route path="/admin/messages" component={AdminMessages} />
          <Route path="/admin/ci-update" component={AdminCiUpdate} />
          <Route path="/admin/withdrawals" component={AdminWithdrawals} />
          <Route path="/admin/pcs-send" component={AdminPcsSend} />
          <Route path="/identity-verification" component={IdentityVerification} />
          <Route path="/bank-card" component={BankCard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/summary" component={Summary} />
          <Route path="/spay-network" component={SpayNetwork} />
          {/* Allow authenticated users to access login page (redirects to dashboard) */}
          <Route path="/simple-login" component={SimpleLoginWithRedirect} />
          {/* Allow authenticated users to access register page for referral links */}
          <Route path="/register" component={RegisterWithRedirect} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
    </CiUpdateGuard>
    </MaintenanceGuard>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        <AiChatBot />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
