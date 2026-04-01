import React, { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { Shield, CheckCircle2 } from "lucide-react";

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

function ConsentGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [consented, setConsented] = useState<boolean>(true);

  useEffect(() => {
    if (isAuthenticated) {
      if (!localStorage.getItem("sanad_consent_v1")) setConsented(false);
    }
  }, [isAuthenticated]);

  const handleConsent = () => {
    localStorage.setItem("sanad_consent_v1", Date.now().toString());
    setConsented(true);
  };
  const handleDecline = () => { window.location.href = "/login"; };

  if (!isAuthenticated || consented) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-blue-700 p-6 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/60">SANAD National AI Health Platform · v3.0</p>
              <h2 className="text-xl font-bold">Data Access & Privacy Consent</h2>
            </div>
            <div className="ml-auto text-right shrink-0">
              <p className="text-[10px] text-white/60">Ministry of Health · KSA</p>
              <p className="text-sm font-bold">Kingdom of Saudi Arabia</p>
            </div>
          </div>
          <p className="text-xs text-white/80 leading-relaxed">
            Before accessing the SANAD platform, you must review and consent to the data access and usage terms in accordance with the NCA Personal Data Protection Law (PDPL) and MOH Healthcare Data Standard.
          </p>
        </div>
        <div className="p-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Data Categories Accessed</p>
          <div className="space-y-2.5">
            {[
              { title: "Medical Records", desc: "Lab results, diagnoses, prescriptions, and visit history", level: "CONFIDENTIAL" },
              { title: "Personal Health Data", desc: "Vital signs, chronic conditions, allergies, and blood type", level: "RESTRICTED" },
              { title: "AI Clinical Decisions", desc: "AI-generated risk assessments and clinical recommendations", level: "CONFIDENTIAL" },
              { title: "Identity Verification", desc: "National ID linkage via Nafath and CCHI insurance registry", level: "RESTRICTED" },
              { title: "Immutable Audit Trail", desc: "All access events are logged per NCA/MOH Compliance Standard v2.0", level: "PUBLIC" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-secondary rounded-2xl border border-border">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-foreground">{item.title}</p>
                    <span className={`inline-flex items-center gap-1 text-[8px] font-black px-1.5 py-0.5 rounded-full bg-secondary ${
                      item.level === "CONFIDENTIAL" ? "text-violet-700" :
                      item.level === "RESTRICTED" ? "text-amber-700" : "text-emerald-700"
                    }`}>
                      <span className={`w-[4px] h-[4px] rounded-full shrink-0 ${
                        item.level === "CONFIDENTIAL" ? "bg-violet-500" :
                        item.level === "RESTRICTED" ? "bg-amber-500" : "bg-emerald-500"
                      }`} />
                      {item.level}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-secondary rounded-xl text-xs text-amber-800" style={{ borderLeft: "3px solid #f59e0b" }}>
            <p className="font-bold mb-0.5">Legal Basis</p>
            <p>Governed by Royal Decree No. M/19, MOH Circular 3/1/3, and NCA Healthcare Data Standard v2.0. All data remains within sovereign KSA infrastructure.</p>
          </div>
          <div className="flex items-center gap-3 mt-5">
            <button onClick={handleDecline} className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-secondary transition-colors">
              Decline & Exit
            </button>
            <button onClick={handleConsent} className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              I Consent & Enter SANAD
            </button>
          </div>
          <p className="text-center text-[10px] text-muted-foreground mt-3">
            Consent logged with timestamp, role, and session ID · Session: {new Date().toLocaleDateString("en-SA")}
          </p>
        </div>
      </div>
    </div>
  );
}

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
            <ConsentGate>
              <Router />
            </ConsentGate>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
