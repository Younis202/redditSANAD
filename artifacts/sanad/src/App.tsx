import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/auth-context";

import LoginPage from "./pages/login";
import Home from "./pages/home";
import EmergencyPage from "./pages/emergency";
import DoctorDashboard from "./pages/doctor";
import CitizenPortal from "./pages/citizen";
import AdminDashboard from "./pages/admin";
import LabPortal from "./pages/lab";
import PharmacyPortal from "./pages/pharmacy";
import HospitalPortal from "./pages/hospital";
import InsurancePortal from "./pages/insurance";
import AiControlCenter from "./pages/ai-control";
import ResearchPortal from "./pages/research";
import FamilyPortal from "./pages/family";
import SupplyChainPortal from "./pages/supply-chain";

const queryClient = new QueryClient();

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-display font-bold text-foreground mb-2">404</h1>
        <p className="text-muted-foreground mb-6">Page not found.</p>
        <a href="/" className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium">Return Home</a>
      </div>
    </div>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Redirect to="/login" />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={LoginPage} />
      <Route path="/emergency"><ProtectedRoute component={EmergencyPage} /></Route>
      <Route path="/doctor"><ProtectedRoute component={DoctorDashboard} /></Route>
      <Route path="/citizen"><ProtectedRoute component={CitizenPortal} /></Route>
      <Route path="/admin"><ProtectedRoute component={AdminDashboard} /></Route>
      <Route path="/lab"><ProtectedRoute component={LabPortal} /></Route>
      <Route path="/pharmacy"><ProtectedRoute component={PharmacyPortal} /></Route>
      <Route path="/hospital"><ProtectedRoute component={HospitalPortal} /></Route>
      <Route path="/insurance"><ProtectedRoute component={InsurancePortal} /></Route>
      <Route path="/ai-control"><ProtectedRoute component={AiControlCenter} /></Route>
      <Route path="/research"><ProtectedRoute component={ResearchPortal} /></Route>
      <Route path="/family"><ProtectedRoute component={FamilyPortal} /></Route>
      <Route path="/supply-chain"><ProtectedRoute component={SupplyChainPortal} /></Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
