import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Brain, ShieldAlert, HeartPulse, User, Building2, FlaskConical, Pill,
  BedDouble, Shield, Users, Package, Globe, Lock, ChevronRight, Activity,
  Eye, EyeOff, CheckCircle2, Fingerprint, Cpu, Radio, AlertTriangle, ArrowLeft,
  Layers, Zap,
} from "lucide-react";
import { useAuth, type UserRole } from "@/contexts/auth-context";
import { useQuery } from "@tanstack/react-query";

type RoleConfig = {
  role: UserRole;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  color: string;
  iconBg: string;
  href: string;
  badge?: string;
  clearance: "PUBLIC" | "RESTRICTED" | "CONFIDENTIAL" | "SECRET";
  employeeId: string;
  demoPassword: string;
};

const CLEARANCE_DOT: Record<string, string> = {
  PUBLIC:       "bg-emerald-500",
  RESTRICTED:   "bg-amber-500",
  CONFIDENTIAL: "bg-sky-500",
  SECRET:       "bg-red-500",
};
const CLEARANCE_TEXT: Record<string, string> = {
  PUBLIC:       "text-emerald-700",
  RESTRICTED:   "text-amber-700",
  CONFIDENTIAL: "text-sky-700",
  SECRET:       "text-red-700",
};

const ROLES: RoleConfig[] = [
  {
    role: "emergency", label: "Emergency Response", sublabel: "First Responders · SRCA",
    icon: ShieldAlert, color: "text-red-600", iconBg: "bg-red-600",
    href: "/emergency", badge: "24/7",
    clearance: "RESTRICTED", employeeId: "SRCA-07-RYD", demoPassword: "SANAD@2025",
  },
  {
    role: "doctor", label: "Physician Portal", sublabel: "Clinical Decision Support",
    icon: HeartPulse, color: "text-blue-600", iconBg: "bg-blue-600",
    href: "/doctor",
    clearance: "CONFIDENTIAL", employeeId: "MOH-DOC-4821", demoPassword: "SANAD@2025",
  },
  {
    role: "citizen", label: "Citizen Portal", sublabel: "Personal Health Record",
    icon: User, color: "text-amber-600", iconBg: "bg-amber-500",
    href: "/citizen",
    clearance: "PUBLIC", employeeId: "1000000001", demoPassword: "SANAD@2025",
  },
  {
    role: "admin", label: "Ministry Dashboard", sublabel: "National Health Intelligence",
    icon: Building2, color: "text-indigo-600", iconBg: "bg-indigo-600",
    href: "/admin", badge: "Gov",
    clearance: "SECRET", employeeId: "MOH-DIR-0001", demoPassword: "SANAD@2025",
  },
  {
    role: "lab", label: "Lab Portal", sublabel: "Results · AI Interpretation",
    icon: FlaskConical, color: "text-emerald-600", iconBg: "bg-emerald-600",
    href: "/lab",
    clearance: "RESTRICTED", employeeId: "LAB-DIR-0101", demoPassword: "SANAD@2025",
  },
  {
    role: "pharmacy", label: "Pharmacy Portal", sublabel: "Dispense · Drug Safety AI",
    icon: Pill, color: "text-cyan-600", iconBg: "bg-cyan-600",
    href: "/pharmacy",
    clearance: "RESTRICTED", employeeId: "PHARM-01-RYD", demoPassword: "SANAD@2025",
  },
  {
    role: "hospital", label: "Hospital Operations", sublabel: "Bed Mgmt · Capacity",
    icon: BedDouble, color: "text-sky-600", iconBg: "bg-sky-600",
    href: "/hospital",
    clearance: "RESTRICTED", employeeId: "HOSP-ADM-0001", demoPassword: "SANAD@2025",
  },
  {
    role: "insurance", label: "Insurance Portal", sublabel: "Claims · Fraud Detection",
    icon: Shield, color: "text-purple-600", iconBg: "bg-purple-600",
    href: "/insurance",
    clearance: "CONFIDENTIAL", employeeId: "INS-MGR-3310", demoPassword: "SANAD@2025",
  },
  {
    role: "ai-control", label: "AI Control Center", sublabel: "Model Governance · Ops",
    icon: Cpu, color: "text-violet-600", iconBg: "bg-violet-600",
    href: "/ai-control",
    clearance: "SECRET", employeeId: "AI-ENG-0001", demoPassword: "SANAD@2025",
  },
  {
    role: "research", label: "Research Portal", sublabel: "Population Analytics · AI",
    icon: FlaskConical, color: "text-emerald-600", iconBg: "bg-emerald-600",
    href: "/research",
    clearance: "CONFIDENTIAL", employeeId: "RES-DIR-0091", demoPassword: "SANAD@2025",
  },
  {
    role: "family", label: "Family Health", sublabel: "Genetic Risk · Linking",
    icon: Users, color: "text-pink-600", iconBg: "bg-pink-600",
    href: "/family",
    clearance: "RESTRICTED", employeeId: "FAM-COO-5521", demoPassword: "SANAD@2025",
  },
  {
    role: "supply-chain", label: "Supply Chain", sublabel: "Drug Availability · Shortages",
    icon: Package, color: "text-orange-600", iconBg: "bg-orange-600",
    href: "/supply-chain",
    clearance: "RESTRICTED", employeeId: "SUP-NPS-4401", demoPassword: "SANAD@2025",
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
  const [nafathOpen, setNafathOpen] = useState(false);

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
    const phases = ["Verifying identity...", "Checking RBAC permissions...", "Establishing secure session...", "Loading portal..."];
    for (const phase of phases) {
      setAuthPhase(phase);
      await new Promise(r => setTimeout(r, 450));
    }
    login(selected);
    setLocation(selectedRole!.href);
  };

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-SA", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const LIVE_STATS = [
    { label: "Active Patients", value: liveStats?.totalPatients?.toLocaleString() ?? "34M+", icon: Users, color: "text-primary" },
    { label: "Hospitals Connected", value: "450+", icon: Building2, color: "text-emerald-600" },
    { label: "AI Decisions / Day", value: "847K", icon: Zap, color: "text-violet-600" },
    { label: "Live SSE Portals", value: "12", icon: Radio, color: "text-amber-600" },
    { label: "AI Savings", value: "SAR 4.7B", icon: Activity, color: "text-sky-600" },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F5F5F7" }}>

      {/* ── Top nav ────────────────────────────────────────────── */}
      <header
        className="h-[68px] flex items-center justify-between px-8 sticky top-0 z-20 shrink-0"
        style={{
          background: "rgba(255,255,255,0.80)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderBottom: "1px solid rgba(0,0,0,0.05)",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-[32px] h-[32px] rounded-[9px] flex items-center justify-center shrink-0" style={{ background: "hsl(211 100% 50%)" }}>
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-[15px] text-foreground tracking-tight">SANAD</span>
            <span className="text-[11px] text-muted-foreground font-medium hidden sm:block">National AI Health Platform · v3.0</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-secondary px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
            All Systems Live
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground bg-white/80 px-3 py-1.5 rounded-full">
            <Globe className="w-3 h-3 shrink-0" />
            <span className="hidden sm:block">Ministry of Health — KSA</span>
          </div>
          <span className="font-mono text-[11px] text-muted-foreground hidden md:block">{timeStr}</span>
        </div>
      </header>

      {/* ── Main Content ───────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center px-6 pt-12 pb-20">

        {/* ── Step 1: Portal Selection ── */}
        {step === 1 && (
          <div className="w-full max-w-[1100px] flex flex-col gap-10">

            {/* Hero */}
            <div className="text-center">
              <div className="inline-flex items-center gap-2 text-[11px] font-bold text-primary bg-primary/8 px-4 py-1.5 rounded-full mb-5" style={{ background: "rgba(0,122,255,0.07)" }}>
                <Lock className="w-3 h-3" />
                Role-Based Access Control · PDPL Compliant · ISO 27001
              </div>
              <h1
                className="text-[42px] font-extrabold text-foreground tracking-tight leading-none mb-3"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                Secure Portal Access
              </h1>
              <p className="text-[15px] text-muted-foreground max-w-xl mx-auto leading-relaxed">
                Saudi Arabia's National AI Health Intelligence Platform. Select your role to begin encrypted authentication.
              </p>
            </div>

            {/* Live KPI strip */}
            <div
              className="flex items-center justify-center gap-2 flex-wrap"
            >
              {LIVE_STATS.map(s => (
                <div
                  key={s.label}
                  className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.70)", backdropFilter: "blur(20px)", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
                >
                  <s.icon className={`w-3.5 h-3.5 shrink-0 ${s.color}`} />
                  <span className="text-[11px] text-muted-foreground font-medium">{s.label}</span>
                  <span className={`text-[12px] font-bold tabular-nums ${s.color}`}>{s.value}</span>
                </div>
              ))}
            </div>

            {/* Nafath SSO */}
            <div
              className="flex items-center justify-between gap-4 px-6 py-4 rounded-[2rem]"
              style={{ background: "rgba(255,255,255,0.70)", backdropFilter: "blur(20px)", boxShadow: "0 8px 32px rgba(0,0,0,0.04)" }}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-[14px] bg-emerald-600 flex items-center justify-center shrink-0">
                  <Fingerprint className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-foreground">Nafath — National Identity Verification</p>
                  <p className="text-[12px] text-muted-foreground">Authenticate via National Single Sign-On · MOH Certified</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-secondary px-3 py-1.5 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" /> MOH Certified
                </div>
                <button
                  onClick={() => setNafathOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-[13px] bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-bold transition-colors"
                >
                  <Fingerprint className="w-4 h-4" />
                  Login with Nafath
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-black/[0.06]" />
              <span className="text-[11px] font-semibold text-muted-foreground px-1">Or select your role manually</span>
              <div className="flex-1 h-px bg-black/[0.06]" />
            </div>

            {/* Role Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {ROLES.map((r) => {
                const Icon = r.icon;
                return (
                  <button
                    key={r.role}
                    onClick={() => handleSelectRole(r)}
                    className="group text-left p-5 rounded-[2rem] transition-all duration-200 relative overflow-hidden hover:scale-[1.02] hover:shadow-lg active:scale-[0.99]"
                    style={{
                      background: "rgba(255,255,255,0.70)",
                      backdropFilter: "blur(20px)",
                      WebkitBackdropFilter: "blur(20px)",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
                    }}
                  >
                    {r.badge && (
                      <span className={`absolute top-4 right-4 text-[9px] font-bold px-2 py-0.5 rounded-full bg-secondary ${r.color}`}>
                        {r.badge}
                      </span>
                    )}
                    <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center mb-4 ${r.iconBg}`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-[13px] font-bold text-foreground mb-0.5 leading-tight">{r.label}</p>
                    <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">{r.sublabel}</p>
                    <span className={`inline-flex items-center gap-1 text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-secondary ${CLEARANCE_TEXT[r.clearance] ?? "text-muted-foreground"}`}>
                      <span className={`w-[5px] h-[5px] rounded-full shrink-0 ${CLEARANCE_DOT[r.clearance] ?? "bg-muted-foreground"}`} />
                      {r.clearance}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Footer note */}
            <p className="text-center text-[11px] text-muted-foreground/60 flex items-center justify-center gap-1.5">
              <Lock className="w-3 h-3" />
              Session encrypted via TLS 1.3 · Access logged to immutable audit chain · MOH Circular 42/1445
            </p>
          </div>
        )}

        {/* ── Step 2: Credential Entry ── */}
        {step === 2 && selectedRole && (
          <div className="w-full max-w-md flex flex-col">

            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground hover:text-foreground mb-8 transition-colors self-start"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to portal selection
            </button>

            {/* Selected portal card */}
            <div
              className="rounded-[2rem] p-6 mb-6"
              style={{ background: "rgba(255,255,255,0.70)", backdropFilter: "blur(20px)", boxShadow: "0 8px 32px rgba(0,0,0,0.04)" }}
            >
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-[16px] flex items-center justify-center ${selectedRole.iconBg}`}>
                  <selectedRole.icon className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[16px] font-bold text-foreground leading-tight">{selectedRole.label}</p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">{selectedRole.sublabel}</p>
                </div>
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-secondary ${CLEARANCE_TEXT[selectedRole.clearance] ?? "text-muted-foreground"}`}>
                  <span className={`w-[5px] h-[5px] rounded-full shrink-0 ${CLEARANCE_DOT[selectedRole.clearance] ?? "bg-muted-foreground"}`} />
                  {selectedRole.clearance}
                </span>
              </div>
            </div>

            {/* Auth Form */}
            <div
              className="rounded-[2rem] p-6"
              style={{ background: "rgba(255,255,255,0.70)", backdropFilter: "blur(20px)", boxShadow: "0 8px 32px rgba(0,0,0,0.04)" }}
            >
              <h2 className="text-[18px] font-bold text-foreground mb-5" style={{ fontFamily: "'Manrope', sans-serif" }}>
                Authenticate
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
                    Employee / National ID
                  </label>
                  <div className="relative">
                    <Cpu className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      value={employeeId}
                      onChange={e => setEmployeeId(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-black/[0.1] bg-white text-[13px] font-mono font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      placeholder="Employee ID"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-10 pr-11 py-3 rounded-xl border border-black/[0.1] bg-white text-[13px] font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      placeholder="••••••••"
                      onKeyDown={e => e.key === "Enter" && !loading && handleAuthenticate()}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2.5 px-4 py-3 bg-secondary rounded-xl text-red-700" style={{ borderLeft: "3px solid #ef4444" }}>
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    <p className="text-[12px]">{error}</p>
                  </div>
                )}

                <div className="flex items-center gap-2.5 px-4 py-3 bg-secondary rounded-xl text-sky-700" style={{ borderLeft: "3px solid #0ea5e9" }}>
                  <Fingerprint className="w-4 h-4 text-sky-500 shrink-0" />
                  <p className="text-[11.5px]">
                    Demo credentials pre-filled. Click <strong>Authenticate</strong> to enter.
                  </p>
                </div>

                <button
                  onClick={handleAuthenticate}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-[13px] text-[13px] font-bold text-white transition-all disabled:opacity-70 mt-2"
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
            </div>

            {/* Session Info */}
            <div className="grid grid-cols-2 gap-2.5 mt-4">
              {[
                { label: "Access Level", value: selectedRole.clearance, icon: Shield },
                { label: "Encryption", value: "256-bit AES", icon: Lock },
                { label: "Audit Trail", value: "Immutable", icon: CheckCircle2 },
                { label: "2FA Method", value: "Biometric", icon: Fingerprint },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-[14px]"
                  style={{ background: "rgba(255,255,255,0.70)", backdropFilter: "blur(20px)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
                >
                  <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-0.5">{label}</p>
                    <p className="text-[11px] font-bold text-foreground leading-none">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <div
        className="h-10 flex items-center justify-between px-8 text-[10px] text-muted-foreground/50 shrink-0"
        style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}
      >
        <span>© 2025 Ministry of Health — Kingdom of Saudi Arabia · SANAD v3.0</span>
        <span>Funded at SAR 100M · All Rights Reserved · PDPL Certified</span>
      </div>

      {/* Nafath SSO Modal */}
      {nafathOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={() => setNafathOpen(false)}>
          <div
            className="w-full max-w-md rounded-[2rem] overflow-hidden"
            style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(24px)", boxShadow: "0 24px 64px rgba(0,0,0,0.14)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="px-7 pt-7 pb-5">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-[16px] bg-emerald-600 flex items-center justify-center shrink-0">
                  <Fingerprint className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-[17px] font-bold text-foreground">Nafath National SSO</h3>
                  <p className="text-[12px] text-muted-foreground mt-0.5">National Identity Verification · Ministry of Interior</p>
                </div>
              </div>
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-4 mb-5">
                <p className="text-sm font-bold text-emerald-800 mb-1">Integration in Test Phase</p>
                <p className="text-xs text-emerald-700 leading-relaxed">
                  The Nafath SSO integration has been implemented and is awaiting production certification from the National Centre for Digital Transformation (NCDT). During this phase, the SANAD demo environment uses direct role-based login.
                </p>
              </div>
              <div className="space-y-2.5 mb-5">
                {[
                  { label: "Integration Type", value: "OAuth 2.0 + PKCE · OpenID Connect" },
                  { label: "Authority", value: "MOI Nafath · NCDT Saudi Arabia" },
                  { label: "Certification Status", value: "MOH Certified · Awaiting NCDT production approval" },
                  { label: "Expected Live Date", value: "Q3 2026 production rollout" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-[11px] text-muted-foreground font-medium">{item.label}</span>
                    <span className="text-[11px] font-bold text-foreground text-right max-w-[230px]">{item.value}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setNafathOpen(false)}
                className="w-full py-3 rounded-[14px] bg-foreground text-white text-[13px] font-bold hover:opacity-90 transition-opacity"
              >
                Continue with Role Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
