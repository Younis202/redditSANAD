import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Home from "./pages/home";
import EmergencyPage from "./pages/emergency";
import DoctorDashboard from "./pages/doctor";
import CitizenPortal from "./pages/citizen";
import AdminDashboard from "./pages/admin";
import LabPortal from "./pages/lab";
import PharmacyPortal from "./pages/pharmacy";
import HospitalPortal from "./pages/hospital";

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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/emergency" component={EmergencyPage} />
      <Route path="/doctor" component={DoctorDashboard} />
      <Route path="/citizen" component={CitizenPortal} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/lab" component={LabPortal} />
      <Route path="/pharmacy" component={PharmacyPortal} />
      <Route path="/hospital" component={HospitalPortal} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
