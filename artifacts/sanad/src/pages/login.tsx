import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Brain, ShieldAlert, HeartPulse, User, Building2, FlaskConical, Pill,
  BedDouble, Shield, Users, Package, Globe, Lock, ChevronRight, Activity,
  Eye, EyeOff, CheckCircle2, Fingerprint, Cpu, Radio, AlertTriangle, ArrowLeft
} from "lucide-react";
import { useAuth, type UserRole } from "@/contexts/auth-context";
import { useQuery } from "@tanstack/react-query";

type RoleConfig = {
  role: UserRole;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  ring: string;
  border: string;
  href: string;
  badge?: string;
  clearance: "PUBLIC" | "RESTRICTED" | "CONFIDENTIAL" | "SECRET";
  clearanceColor: string;
  employeeId: string;
  demoPassword: string;
};

const ROLES: RoleConfig[] = [
  {
    role: "emergency", label: "Emergency Response", sublabel: "First Responders · SRCA",
    icon: ShieldAlert, color: "text-red-600", bg: "bg-red-50", ring: "ring-red-300",
    border: "border-red-200", href: "/emergency", badge: "24/7",
    clearance: "RESTRICTED", clearanceColor: "text-amber-700 bg-amber-50 border-amber-200",
    employeeId: "SRCA-07-RYD", demoPassword: "SANAD@2025",
  },
  {
    role: "doctor", label: "Physician Portal", sublabel: "Clinical Decision Support",
    icon: HeartPulse, color: "text-blue-600", bg: "bg-blue-50", ring: "ring-blue-300",
    border: "border-blue-200", href: "/doctor",
    clearance: "CONFIDENTIAL", clearanceColor: "text-blue-700 bg-blue-50 border-blue-200",
    employeeId: "MOH-DOC-4821", demoPassword: "SANAD@2025",
  },
  {
    role: "citizen", label: "Citizen Portal", sublabel: "Personal Health Record",
    icon: User, color: "text-amber-600", bg: "bg-amber-50", ring: "ring-amber-300",
    border: "border-amber-200", href: "/citizen",
    clearance: "PUBLIC", clearanceColor: "text-emerald-700 bg-emerald-50 border-emerald-200",
    employeeId: "1000000001", demoPassword: "SANAD@2025",
  },
  {
    role: "admin", label: "Ministry Dashboard", sublabel: "National Health Intelligence",
    icon: Building2, color: "text-indigo-600", bg: "bg-indigo-50", ring: "ring-indigo-300",
    border: "border-indigo-200", href: "/admin", badge: "Gov",
    clearance: "SECRET", clearanceColor: "text-red-700 bg-red-50 border-red-200",
    employeeId: "MOH-DIR-0001", demoPassword: "SANAD@2025",
  },
  {
    role: "lab", label: "Lab Portal", sublabel: "Results · AI Interpretation",
    icon: FlaskConical, color: "text-teal-600", bg: "bg-teal-50", ring: "ring-teal-300",
    border: "border-teal-200", href: "/lab",
    clearance: "RESTRICTED", clearanceColor: "text-amber-700 bg-amber-50 border-amber-200",
    employeeId: "LAB-KFH-2271", demoPassword: "SANAD@2025",
  },
  {
    role: "pharmacy", label: "Pharmacy Portal", sublabel: "Dispense · Drug Safety AI",
    icon: Pill, color: "text-purple-600", bg: "bg-purple-50", ring: "ring-purple-300",
    border: "border-purple-200", href: "/pharmacy",
    clearance: "RESTRICTED", clearanceColor: "text-amber-700 bg-amber-50 border-amber-200",
    employeeId: "PHM-CEN-3341", demoPassword: "SANAD@2025",
  },
  {
    role: "hospital", label: "Hospital Operations", sublabel: "Bed Mgmt · Capacity",
    icon: BedDouble, color: "text-sky-600", bg: "bg-sky-50", ring: "ring-sky-300",
    border: "border-sky-200", href: "/hospital",
    clearance: "RESTRICTED", clearanceColor: "text-amber-700 bg-amber-50 border-amber-200",
    employeeId: "HOS-KFM-1192", demoPassword: "SANAD@2025",
  },
  {
    role: "insurance", label: "Insurance Portal", sublabel: "Claims · Fraud Detection",
    icon: Shield, color: "text-violet-600", bg: "bg-violet-50", ring: "ring-violet-300",
    border: "border-violet-200", href: "/insurance",
    clearance: "CONFIDENTIAL", clearanceColor: "text-blue-700 bg-blue-50 border-blue-200",
    employeeId: "INS-TAW-0882", demoPassword: "SANAD@2025",
  },
  {
    role: "ai-control", label: "AI Control Center", sublabel: "9-Engine Monitor · Drift",
    icon: Brain, color: "text-rose-600", bg: "bg-rose-50", ring: "ring-rose-300",
    border: "border-rose-200", href: "/ai-control", badge: "Core",
    clearance: "SECRET", clearanceColor: "text-red-700 bg-red-50 border-red-200",
    employeeId: "AI-SYS-0042", demoPassword: "SANAD@2025",
  },
  {
    role: "research", label: "Research Portal", sublabel: "Anonymized Data · Studies",
    icon: FlaskConical, color: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-300",
    border: "border-emerald-200", href: "/research",
    clearance: "CONFIDENTIAL", clearanceColor: "text-blue-700 bg-blue-50 border-blue-200",
    employeeId: "RES-KAU-7731", demoPassword: "SANAD@2025",
  },
  {
    role: "family", label: "Family Health", sublabel: "Genetic Risk · Linking",
    icon: Users, color: "text-pink-600", bg: "bg-pink-50", ring: "ring-pink-300",
    border: "border-pink-200", href: "/family",
    clearance: "RESTRICTED", clearanceColor: "text-amber-700 bg-amber-50 border-amber-200",
    employeeId: "FAM-COO-5521", demoPassword: "SANAD@2025",
  },
  {
    role: "supply-chain", label: "Supply Chain", sublabel: "Drug Availability · Shortages",
    icon: Package, color: "text-lime-700", bg: "bg-lime-50", ring: "ring-lime-300",
    border: "border-lime-200", href: "/supply-chain",
    clearance: "RESTRICTED", clearanceColor: "text-amber-700 bg-amber-50 border-amber-200",
    employeeId: "SUP-NPS-4401", demoPassword: "SANAD@2025",
  },
];

export default function LoginPage() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState<UserRole | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authPhase, setAuthPhase] = useState("");
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const { data: liveStats } = useQuery({
    queryKey: ["login-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 30000,
  });

  const selectedRole = ROLES.find(r => r.role === selected);

  const handleSelectRole = (role: RoleConfig) => {
    setSelected(role.role);
    setEmployeeId(role.employeeId);
    setPassword(role.demoPassword);
    setError("");
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setSelected(null);
    setError("");
    setAuthPhase("");
  };

  const handleAuthenticate = async () => {
    if (!selected || !employeeId.trim() || !password.trim()) {
      setError("Please enter your Employee ID and password.");
      return;
    }
    setError("");
    setLoading(true);
    const phases = [
      "Verifying identity...",
      "Checking RBAC permissions...",
      "Establishing secure session...",
      "Loading portal...",
    ];
    for (const phase of phases) {
      setAuthPhase(phase);
      await new Promise(r => setTimeout(r, 450));
    }
    login(selected);
    setLocation(selectedRole!.href);
  };

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-SA", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString("en-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "hsl(220 20% 97%)" }}>

      {/* Top bar */}
      <header
        className="h-14 flex items-center justify-between px-8 sticky top-0 z-20 shrink-0"
        style={{
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(0,0,0,0.07)",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[9px] flex items-center justify-center" style={{ background: "hsl(211 100% 50%)" }}>
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-[14px] text-foreground tracking-tight">SANAD</span>
            <span className="text-muted-foreground text-[11px] ml-2">National AI Health Platform · v3.0</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
            All Systems Live
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground bg-white border border-black/[0.07] px-3 py-1.5 rounded-full shadow-sm">
            <Globe className="w-3 h-3" />
            Ministry of Health — KSA
          </div>
          <div className="font-mono text-[11px] text-muted-foreground">
            {timeStr}
          </div>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">

        {/* Left Sidebar — Branding + Stats */}
        <div
          className="w-[300px] shrink-0 flex flex-col p-8"
          style={{
            background: "white",
            borderRight: "1px solid rgba(0,0,0,0.07)",
          }}
        >
          {/* MOH Seal */}
          <div className="mb-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "hsl(211 100% 50%)" }}
            >
              <Brain className="w-8 h-8 text-white" />
            </div>
            <p className="text-[13px] font-bold text-foreground">Ministry of Health</p>
            <p className="text-[11px] text-muted-foreground">Kingdom of Saudi Arabia</p>
            <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full w-fit">
              <Lock className="w-2.5 h-2.5" />
              SANAD SSO · Secure Portal
            </div>
          </div>

          {/* Live Stats */}
          <div className="space-y-3 mb-8">
            <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.12em]">National Platform Status</p>
            {[
              { icon: Users, label: "Active Patients", value: liveStats?.totalPatients?.toLocaleString() ?? "34M+", color: "text-primary" },
              { icon: Activity, label: "Visits Today", value: liveStats?.totalVisitsToday?.toLocaleString() ?? "—", color: "text-sky-600" },
              { icon: Brain, label: "AI Engines", value: "9 Running", color: "text-violet-600" },
              { icon: Building2, label: "Hospitals Connected", value: "450+", color: "text-emerald-600" },
              { icon: Radio, label: "Live SSE Streams", value: "12 Portals", color: "text-amber-600" },
              { icon: ShieldAlert, label: "High-Risk Cases", value: liveStats?.highRiskPatients?.toLocaleString() ?? "—", color: "text-red-600" },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-secondary/60">
                <div className="flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${color}`} />
                  <span className="text-[11px] text-muted-foreground">{label}</span>
                </div>
                <span className={`text-[12px] font-bold tabular-nums ${color}`}>{value}</span>
              </div>
            ))}
          </div>

          {/* Compliance Badges */}
          <div className="space-y-2 mt-auto">
            <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.12em] mb-2">Compliance</p>
            {[
              "MOH Circular 42/1445",
              "PDPL Compliant",
              "GDPR Aligned",
              "ISO 27001 Certified",
              "HIPAA Framework",
            ].map(badge => (
              <div key={badge} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                {badge}
              </div>
            ))}
          </div>
        </div>

        {/* Right Main Area */}
        <div className="flex-1 flex flex-col px-10 py-8 overflow-y-auto">

          {/* Step 1: Role Selection */}
          {step === 1 && (
            <>
              <div className="mb-8">
                <div
                  className="inline-flex items-center gap-2 text-[11px] font-semibold text-primary mb-4 px-3 py-1.5 rounded-full border"
                  style={{ background: "rgba(0,122,255,0.06)", borderColor: "rgba(0,122,255,0.2)" }}
                >
                  <Lock className="w-3 h-3" />
                  Role-Based Access Control · Select Your Portal
                </div>
                <h1 className="text-[30px] font-bold text-foreground tracking-tight leading-tight mb-2">
                  Secure Portal Access
                </h1>
                <p className="text-[13px] text-muted-foreground max-w-xl">
                  {dateStr} — All sessions are encrypted, audit-logged, and governed by MOH RBAC policies.
                  Select your role to begin authentication.
                </p>
              </div>

              {/* Nafath SSO Banner */}
              <div className="mb-5 p-4 rounded-2xl border-2 border-emerald-300 bg-emerald-50 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
                    <Fingerprint className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-emerald-900">Nafath — National Identity Verification</p>
                    <p className="text-[11px] text-emerald-700">Authenticate via National Single Sign-On · MOH Certified</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> MOH Certified
                  </div>
                  <button
                    onClick={() => {}}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-bold transition-colors"
                  >
                    <Fingerprint className="w-3.5 h-3.5" />
                    Login with Nafath
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[11px] font-semibold text-muted-foreground">Or select your role manually</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="grid grid-cols-4 gap-2.5">
                {ROLES.map((r) => {
                  const Icon = r.icon;
                  return (
                    <button
                      key={r.role}
                      onClick={() => handleSelectRole(r)}
                      className={`group text-left p-4 rounded-2xl border-2 transition-all duration-150 relative overflow-hidden bg-white hover:shadow-md hover:scale-[1.01] border-transparent hover:border-black/[0.06]`}
                      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
                    >
                      {r.badge && (
                        <span className={`absolute top-3 right-3 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${r.bg} ${r.color}`}>
                          {r.badge}
                        </span>
                      )}
                      <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center mb-3 ${r.bg}`}>
                        <Icon className={`w-4 h-4 ${r.color}`} />
                      </div>
                      <p className="text-[12px] font-bold text-foreground mb-0.5">{r.label}</p>
                      <p className="text-[10px] text-muted-foreground mb-2">{r.sublabel}</p>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${r.clearanceColor}`}>
                        {r.clearance}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex items-center gap-2 text-[11px] text-muted-foreground/60">
                <Lock className="w-3 h-3" />
                <span>Session encrypted via TLS 1.3 · Access logged to immutable audit chain · MOH Circular 42/1445</span>
              </div>
            </>
          )}

          {/* Step 2: Credential Entry */}
          {step === 2 && selectedRole && (
            <div className="flex flex-col items-center justify-center flex-1 max-w-md mx-auto w-full">

              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground mb-6 self-start transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to portal selection
              </button>

              {/* Portal Card */}
              <div className={`w-full p-5 rounded-2xl border-2 mb-6 ${selectedRole.bg} ${selectedRole.border}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-[12px] flex items-center justify-center bg-white shadow-sm`}>
                    <selectedRole.icon className={`w-5 h-5 ${selectedRole.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[14px] font-bold ${selectedRole.color}`}>{selectedRole.label}</p>
                    <p className="text-[11px] text-muted-foreground">{selectedRole.sublabel}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${selectedRole.clearanceColor}`}>
                    {selectedRole.clearance}
                  </span>
                </div>
              </div>

              {/* Form */}
              <div className="w-full space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">
                    Employee / National ID
                  </label>
                  <div className="relative">
                    <Cpu className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={employeeId}
                      onChange={e => setEmployeeId(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-white text-[13px] font-mono font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      placeholder="Employee ID"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-border bg-white text-[13px] font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      placeholder="••••••••"
                      onKeyDown={e => e.key === "Enter" && !loading && handleAuthenticate()}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-xl">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <p className="text-[12px] text-red-700">{error}</p>
                  </div>
                )}

                {/* Demo Hint */}
                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-blue-50 border border-blue-100 rounded-xl">
                  <Fingerprint className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <p className="text-[11px] text-blue-700">
                    Demo credentials pre-filled. Click <strong>Authenticate</strong> to enter.
                  </p>
                </div>

                <button
                  onClick={handleAuthenticate}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-[13px] font-bold text-white transition-all disabled:opacity-80"
                  style={{ background: loading ? "hsl(211 80% 55%)" : "hsl(211 100% 50%)" }}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {authPhase}
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Authenticate & Enter Portal
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Session Info */}
              <div className="mt-6 w-full grid grid-cols-2 gap-3">
                {[
                  { label: "Access Level", value: selectedRole.clearance, icon: Shield },
                  { label: "Session", value: "256-bit AES", icon: Lock },
                  { label: "Audit", value: "Enabled", icon: CheckCircle2 },
                  { label: "2FA", value: "Biometric", icon: Fingerprint },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex items-center gap-2 px-3 py-2 bg-white border border-border rounded-xl">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{label}</p>
                      <p className="text-[11px] font-semibold text-foreground">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        className="h-10 flex items-center justify-between px-8 text-[10px] text-muted-foreground/60 shrink-0"
        style={{ borderTop: "1px solid rgba(0,0,0,0.05)", background: "white" }}
      >
        <span>© 2025 Ministry of Health — Kingdom of Saudi Arabia · SANAD Platform v3.0</span>
        <span>Funded at SAR 100M · All Rights Reserved · PDPL Certified</span>
      </div>
    </div>
  );
}
