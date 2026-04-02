import React, { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import {
  Brain, ShieldAlert, HeartPulse, User, Building2, FlaskConical, Pill,
  BedDouble, Shield, Users, Package, Globe, Lock, Activity,
  Eye, EyeOff, CheckCircle2, Fingerprint, Cpu, Radio, AlertTriangle, ArrowLeft,
  Zap, ArrowRight, ShieldCheck,
} from "lucide-react";
import { useAuth, type UserRole } from "@/contexts/auth-context";
import { useQuery } from "@tanstack/react-query";

type RoleConfig = {
  role: UserRole;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  accent: string;
  href: string;
  badge?: string;
  clearance: "PUBLIC" | "RESTRICTED" | "CONFIDENTIAL" | "SECRET";
  employeeId: string;
  demoPassword: string;
};

const CLEARANCE_COLOR: Record<string, string> = {
  PUBLIC:       "#22c55e",
  RESTRICTED:   "#f59e0b",
  CONFIDENTIAL: "#0ea5e9",
  SECRET:       "#ef4444",
};

const ROLES: RoleConfig[] = [
  {
    role: "emergency", label: "Emergency Response", sublabel: "First Responders · SRCA",
    icon: ShieldAlert, accent: "#ef4444",
    href: "/emergency", badge: "24/7",
    clearance: "RESTRICTED", employeeId: "SRCA-07-RYD", demoPassword: "SANAD@2025",
  },
  {
    role: "doctor", label: "Physician Portal", sublabel: "Clinical Decision Support",
    icon: HeartPulse, accent: "#007AFF",
    href: "/doctor",
    clearance: "CONFIDENTIAL", employeeId: "MOH-DOC-4821", demoPassword: "SANAD@2025",
  },
  {
    role: "citizen", label: "Citizen Portal", sublabel: "Personal Health Record",
    icon: User, accent: "#f59e0b",
    href: "/citizen",
    clearance: "PUBLIC", employeeId: "1000000001", demoPassword: "SANAD@2025",
  },
  {
    role: "admin", label: "Ministry Dashboard", sublabel: "National Health Intelligence",
    icon: Building2, accent: "#6366f1",
    href: "/admin", badge: "Gov",
    clearance: "SECRET", employeeId: "MOH-DIR-0001", demoPassword: "SANAD@2025",
  },
  {
    role: "lab", label: "Laboratory Portal", sublabel: "AI-Interpreted Results",
    icon: FlaskConical, accent: "#10b981",
    href: "/lab",
    clearance: "RESTRICTED", employeeId: "LAB-DIR-0101", demoPassword: "SANAD@2025",
  },
  {
    role: "pharmacy", label: "Pharmacy Portal", sublabel: "Dispense · Drug Safety AI",
    icon: Pill, accent: "#06b6d4",
    href: "/pharmacy",
    clearance: "RESTRICTED", employeeId: "PHARM-01-RYD", demoPassword: "SANAD@2025",
  },
  {
    role: "hospital", label: "Hospital Operations", sublabel: "Bed Management · Capacity",
    icon: BedDouble, accent: "#0ea5e9",
    href: "/hospital",
    clearance: "RESTRICTED", employeeId: "HOSP-ADM-0001", demoPassword: "SANAD@2025",
  },
  {
    role: "insurance", label: "Insurance Portal", sublabel: "Claims · Fraud Detection",
    icon: Shield, accent: "#8b5cf6",
    href: "/insurance",
    clearance: "CONFIDENTIAL", employeeId: "INS-MGR-3310", demoPassword: "SANAD@2025",
  },
  {
    role: "ai-control", label: "AI Control Center", sublabel: "Model Governance · Ops",
    icon: Cpu, accent: "#a855f7",
    href: "/ai-control",
    clearance: "SECRET", employeeId: "AI-ENG-0001", demoPassword: "SANAD@2025",
  },
  {
    role: "research", label: "Research Portal", sublabel: "Population Analytics · AI",
    icon: FlaskConical, accent: "#14b8a6",
    href: "/research",
    clearance: "CONFIDENTIAL", employeeId: "RES-DIR-0091", demoPassword: "SANAD@2025",
  },
  {
    role: "family", label: "Family Health", sublabel: "Genetic Risk · Linking",
    icon: Users, accent: "#ec4899",
    href: "/family",
    clearance: "RESTRICTED", employeeId: "FAM-COO-5521", demoPassword: "SANAD@2025",
  },
  {
    role: "supply-chain", label: "Supply Chain", sublabel: "Drug Availability · Logistics",
    icon: Package, accent: "#f97316",
    href: "/supply-chain",
    clearance: "RESTRICTED", employeeId: "SUP-NPS-4401", demoPassword: "SANAD@2025",
  },
];

/* ─── Tiny live dot ─── */
function LiveDot() {
  return (
    <span className="relative inline-flex">
      <span className="absolute inset-0 rounded-full animate-ping opacity-50" style={{ background: "#22c55e" }} />
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#22c55e" }} />
    </span>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [selected, setSelected] = useState<UserRole | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authPhase, setAuthPhase] = useState("");
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const [nafathOpen, setNafathOpen] = useState(false);
  const [hoveredRole, setHoveredRole] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const roleParam = params.get("role");
    if (roleParam && !selected) {
      const match = ROLES.find(r => r.role === roleParam);
      if (match) {
        setSelected(match.role);
        setEmployeeId(match.employeeId);
        setPassword(match.demoPassword);
        setStep(2);
      }
    }
  }, [search]);

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
    const phases = ["Verifying identity...", "Checking RBAC permissions...", "Establishing secure session...", "Awaiting consent..."];
    for (const phase of phases) {
      setAuthPhase(phase);
      await new Promise(r => setTimeout(r, 450));
    }
    setLoading(false);
    setStep(3);
  };

  const handleConsent = () => {
    login(selected!);
    setLocation(selectedRole!.href);
  };

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-SA", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'Manrope', system-ui, sans-serif" }}>

      {/* ══════════════════════════════════
          LEFT PANEL — Dark branding
      ══════════════════════════════════ */}
      <div
        className="hidden lg:flex flex-col w-[420px] shrink-0 relative overflow-hidden"
        style={{ background: "#06080f" }}
      >
        {/* Atmospheric glows */}
        <div className="absolute top-[-80px] left-[-40px] w-[320px] h-[320px] rounded-full pointer-events-none opacity-[0.12]"
          style={{ background: "radial-gradient(circle, #007AFF 0%, transparent 65%)" }} />
        <div className="absolute bottom-[10%] right-[-60px] w-[250px] h-[250px] rounded-full pointer-events-none opacity-[0.07]"
          style={{ background: "radial-gradient(circle, #5856D6 0%, transparent 65%)" }} />
        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full p-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #007AFF 0%, #5856D6 100%)" }}>
              <Brain className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <p className="text-[15px] font-black text-white tracking-tight">SANAD</p>
              <p className="text-[10px] text-white/30 font-medium">National AI Health Platform</p>
            </div>
          </div>

          {/* Main copy */}
          <div className="flex-1">
            <h2 className="text-[36px] font-black text-white leading-[1.05] tracking-tight mb-6">
              Saudi Healthcare.<br />
              <span style={{ background: "linear-gradient(90deg, #60a5fa, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Powered by AI.
              </span>
            </h2>
            <p className="text-[14px] text-white/35 leading-relaxed mb-10">
              Sign in with your Ministry-issued credentials to access your role-specific portal.
            </p>

            {/* Live stats */}
            <div className="space-y-3">
              {[
                { label: "Citizen Records", value: liveStats?.totalPatients?.toLocaleString() ?? "34.2M+", color: "#60a5fa" },
                { label: "Hospitals Connected", value: "450+", color: "#34d399" },
                { label: "AI Decisions / Day", value: "847K", color: "#a78bfa" },
                { label: "Live Portals", value: "12 Active", color: "#fb923c" },
              ].map((s, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 px-3.5 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="text-[12px] text-white/40 font-medium">{s.label}</p>
                  <p className="text-[13px] font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom security strip */}
          <div className="space-y-2">
            {[
              { icon: Lock, text: "AES-256 · TLS 1.3 Encrypted" },
              { icon: ShieldCheck, text: "PDPL Compliant · ISO 27001" },
              { icon: Activity, text: "99.99% Uptime SLA" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <item.icon className="w-3 h-3 text-white/20 shrink-0" />
                <p className="text-[11px] text-white/25 font-medium">{item.text}</p>
              </div>
            ))}
            <div className="flex items-center gap-1.5 pt-2">
              <LiveDot />
              <p className="text-[11px] text-emerald-400 font-semibold">All Systems Operational</p>
              <p className="text-[11px] text-white/20 ml-auto font-mono">{timeStr}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════
          RIGHT PANEL — Auth area
      ══════════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-y-auto" style={{ background: "#F2F2F7" }}>

        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-6 py-4 bg-white border-b border-black/5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #007AFF 0%, #5856D6 100%)" }}>
              <Brain className="w-3.5 h-3.5 text-white" />
            </div>
            <p className="text-[14px] font-black text-foreground">SANAD</p>
          </div>
          <div className="flex items-center gap-1.5">
            <LiveDot />
            <p className="text-[11px] text-emerald-600 font-semibold">Live</p>
          </div>
        </div>

        {/* ── STEP 1: ROLE SELECTION ── */}
        {step === 1 && (
          <div className="flex-1 flex flex-col p-8 lg:p-12 max-w-[760px] mx-auto w-full">

            {/* Header */}
            <div className="mb-8">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em] mb-2">Secure Access</p>
              <h1 className="text-[32px] font-black text-foreground tracking-tight leading-tight mb-3">
                Select your portal
              </h1>
              <p className="text-[14px] text-muted-foreground leading-relaxed">
                Each role has a dedicated AI workspace. Your access is scoped, encrypted, and fully audited.
              </p>
            </div>

            {/* Nafath SSO banner */}
            <button
              onClick={() => setNafathOpen(true)}
              className="flex items-center gap-4 px-5 py-4 rounded-2xl mb-6 w-full text-left transition-all hover:scale-[1.005]"
              style={{ background: "rgba(5,150,105,0.08)", border: "1px solid rgba(5,150,105,0.20)" }}
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
                <Fingerprint className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-emerald-800">Nafath National SSO</p>
                <p className="text-[11px] text-emerald-700/60">Authenticate via National Single Sign-On · MOH Certified</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-600/10 px-2.5 py-1 rounded-full">MOH Certified</span>
                <ArrowRight className="w-4 h-4 text-emerald-600" />
              </div>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-black/[0.07]" />
              <span className="text-[11px] font-semibold text-muted-foreground">or select your role</span>
              <div className="flex-1 h-px bg-black/[0.07]" />
            </div>

            {/* Role grid */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {ROLES.map(r => {
                const Icon = r.icon;
                const isHovered = hoveredRole === r.role;
                return (
                  <button
                    key={r.role}
                    onClick={() => handleSelectRole(r)}
                    onMouseEnter={() => setHoveredRole(r.role)}
                    onMouseLeave={() => setHoveredRole(null)}
                    className="group relative text-left rounded-2xl overflow-hidden transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background: isHovered ? `${r.accent}0F` : "rgba(255,255,255,0.80)",
                      border: isHovered ? `1px solid ${r.accent}35` : "1px solid rgba(0,0,0,0.06)",
                      boxShadow: isHovered ? `0 8px 24px ${r.accent}18` : "0 2px 8px rgba(0,0,0,0.04)",
                    }}
                  >
                    {/* Clearance indicator */}
                    <div
                      className="absolute top-0 right-0 w-1.5 h-full"
                      style={{ background: `${CLEARANCE_COLOR[r.clearance]}25` }}
                    />
                    <div className="p-4">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 transition-all duration-200"
                        style={{
                          background: isHovered ? r.accent : `${r.accent}15`,
                        }}
                      >
                        <Icon className="w-4.5 h-4.5 transition-colors duration-200"
                          style={{ color: isHovered ? "#fff" : r.accent }} />
                      </div>
                      <p className="text-[12px] font-bold text-foreground leading-tight mb-0.5">{r.label}</p>
                      <p className="text-[10px] text-muted-foreground leading-snug mb-2">{r.sublabel}</p>
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: CLEARANCE_COLOR[r.clearance] }} />
                        <span className="text-[9px] font-bold text-muted-foreground">{r.clearance}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Security footer */}
            <div className="flex items-center justify-center gap-1.5 text-[10.5px] text-muted-foreground/50">
              <Lock className="w-3 h-3" />
              Session encrypted via TLS 1.3 · Access logged to immutable audit chain · MOH Circular 42/1445
            </div>
          </div>
        )}

        {/* ── STEP 2: CREDENTIALS ── */}
        {step === 2 && selectedRole && (
          <div className="flex-1 flex flex-col p-8 lg:p-12 max-w-[480px] mx-auto w-full justify-center">

            {/* Back */}
            <button onClick={handleBack}
              className="flex items-center gap-2 text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors mb-8 self-start">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to portal selection
            </button>

            {/* Selected portal display */}
            <div className="rounded-2xl p-5 mb-5 flex items-center gap-4"
              style={{ background: `${selectedRole.accent}0A`, border: `1px solid ${selectedRole.accent}25` }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: selectedRole.accent }}>
                <selectedRole.icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-foreground">{selectedRole.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{selectedRole.sublabel}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full"
                style={{ background: `${CLEARANCE_COLOR[selectedRole.clearance]}15` }}>
                <div className="w-1.5 h-1.5 rounded-full"
                  style={{ background: CLEARANCE_COLOR[selectedRole.clearance] }} />
                <span className="text-[10px] font-bold" style={{ color: CLEARANCE_COLOR[selectedRole.clearance] }}>
                  {selectedRole.clearance}
                </span>
              </div>
            </div>

            {/* Auth form card */}
            <div className="rounded-3xl bg-white p-8 shadow-sm" style={{ border: "1px solid rgba(0,0,0,0.06)" }}>
              <h2 className="text-[22px] font-black text-foreground mb-6 tracking-tight">Authenticate</h2>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.12em] mb-2 block">
                    Employee / National ID
                  </label>
                  <div className="relative">
                    <Cpu className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <input
                      type="text"
                      value={employeeId}
                      onChange={e => setEmployeeId(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl text-[13px] font-mono font-semibold text-foreground transition-all focus:outline-none"
                      style={{ background: "#F2F2F7", border: "1px solid transparent" }}
                      onFocus={e => { e.target.style.border = `1px solid ${selectedRole.accent}60`; e.target.style.background = "#fff"; }}
                      onBlur={e => { e.target.style.border = "1px solid transparent"; e.target.style.background = "#F2F2F7"; }}
                      placeholder="Employee ID"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.12em] mb-2 block">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-11 pr-12 py-3.5 rounded-xl text-[13px] font-mono text-foreground transition-all focus:outline-none"
                      style={{ background: "#F2F2F7", border: "1px solid transparent" }}
                      onFocus={e => { e.target.style.border = `1px solid ${selectedRole.accent}60`; e.target.style.background = "#fff"; }}
                      onBlur={e => { e.target.style.border = "1px solid transparent"; e.target.style.background = "#F2F2F7"; }}
                      placeholder="••••••••"
                      onKeyDown={e => e.key === "Enter" && !loading && handleAuthenticate()}
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-red-700"
                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)" }}>
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    <p className="text-[12px] font-medium">{error}</p>
                  </div>
                )}

                {/* Demo hint */}
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl"
                  style={{ background: `${selectedRole.accent}08`, border: `1px solid ${selectedRole.accent}20` }}>
                  <Zap className="w-3.5 h-3.5 shrink-0" style={{ color: selectedRole.accent }} />
                  <p className="text-[11px] text-muted-foreground">
                    Demo credentials pre-filled — click <strong>Authenticate</strong> to enter
                  </p>
                </div>

                <button
                  onClick={handleAuthenticate}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl text-[14px] font-bold text-white transition-all disabled:opacity-70 mt-2"
                  style={{ background: loading ? `${selectedRole.accent}aa` : selectedRole.accent, boxShadow: `0 8px 24px ${selectedRole.accent}35` }}
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
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Security badges */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              {[
                { label: "Access Level", value: selectedRole.clearance },
                { label: "Encryption", value: "AES-256" },
                { label: "Audit Trail", value: "Immutable" },
                { label: "2FA Method", value: "Biometric" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white"
                  style={{ border: "1px solid rgba(0,0,0,0.06)" }}>
                  <div>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{label}</p>
                    <p className="text-[11px] font-bold text-foreground">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 3: CONSENT ── */}
        {step === 3 && selectedRole && (
          <div className="flex-1 flex flex-col p-8 lg:p-12 max-w-[520px] mx-auto w-full justify-center">
            <div className="rounded-3xl bg-white overflow-hidden shadow-sm" style={{ border: "1px solid rgba(0,0,0,0.06)" }}>
              {/* Header */}
              <div className="px-8 pt-8 pb-6" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: selectedRole.accent }}>
                    <selectedRole.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-foreground">{selectedRole.label}</p>
                    <p className="text-[11px] text-muted-foreground">Authentication verified</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                    style={{ background: "rgba(34,197,94,0.10)" }}>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-[10px] font-bold text-emerald-700">Verified</span>
                  </div>
                </div>
                <h2 className="text-[22px] font-black text-foreground tracking-tight mb-1">Data Access Consent</h2>
                <p className="text-[12px] text-muted-foreground">Required under PDPL (Law No. M/19) and MOH Circular 42/1445</p>
              </div>

              {/* Terms */}
              <div className="px-8 py-5 space-y-3 max-h-[300px] overflow-y-auto">
                {[
                  { title: "National Health Data Access", body: "Authorised to access personal health information under your designated role only. Access is role-scoped and governed by RBAC controls aligned with MOH Circular 42/1445.", icon: ShieldCheck },
                  { title: "Personal Data Protection Law (PDPL)", body: "All data is protected under Saudi Arabia's PDPL (Law No. M/19, 2021). Unauthorised sharing or transmission is a criminal offence subject to fines up to SAR 5,000,000.", icon: Shield },
                  { title: "Immutable Audit Logging", body: "Every action in this session is logged to a cryptographically signed, immutable audit trail that cannot be altered or deleted.", icon: Lock },
                  { title: "AI Decision Support Only", body: "AI recommendations are decision support only. All clinical decisions remain the sole responsibility of the licensed clinician.", icon: Brain },
                  { title: "Minimum Necessary Principle", body: "You agree to access only data necessary for your current task. Bulk extraction or speculative lookups are prohibited and automatically flagged.", icon: Activity },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3.5 rounded-xl"
                    style={{ background: "#F2F2F7" }}>
                    <item.icon className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[12px] font-bold text-foreground mb-0.5">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="px-8 py-6" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                <p className="text-[11px] text-muted-foreground mb-4 leading-relaxed">
                  By clicking "I Agree & Enter", you confirm full compliance with Saudi national law and MOH policy.
                </p>
                <button onClick={handleConsent}
                  className="w-full h-13 py-4 rounded-xl text-white text-[14px] font-bold transition-all flex items-center justify-center gap-2 hover:opacity-95"
                  style={{ background: "linear-gradient(135deg, #059669 0%, #064e3b 100%)", boxShadow: "0 8px 24px rgba(5,150,105,0.3)" }}>
                  <CheckCircle2 className="w-4 h-4" />
                  I Agree & Enter Portal
                </button>
                <button onClick={handleBack}
                  className="w-full h-10 mt-2 text-muted-foreground text-[12px] font-semibold hover:text-foreground transition-colors">
                  Cancel — Go back
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-8 py-4 flex items-center justify-between border-t border-black/[0.05] bg-white/60 lg:bg-transparent">
          <p className="text-[10px] text-muted-foreground/50">© 2026 Ministry of Health — KSA · SANAD v4.0</p>
          <p className="text-[10px] text-muted-foreground/50">PDPL Certified · All Rights Reserved</p>
        </div>
      </div>

      {/* Nafath Modal */}
      {nafathOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setNafathOpen(false)}>
          <div className="w-full max-w-md rounded-3xl bg-white overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center">
                  <Fingerprint className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-[17px] font-black text-foreground">Nafath National SSO</h3>
                  <p className="text-[12px] text-muted-foreground">Ministry of Interior · NCDT Saudi Arabia</p>
                </div>
              </div>
              <div className="rounded-2xl px-5 py-4 mb-6"
                style={{ background: "rgba(5,150,105,0.07)", border: "1px solid rgba(5,150,105,0.15)" }}>
                <p className="text-[13px] font-bold text-emerald-800 mb-1">Integration in Test Phase</p>
                <p className="text-[12px] text-emerald-700/70 leading-relaxed">
                  Nafath SSO is implemented and awaiting production certification from NCDT. The demo environment uses direct role-based login.
                </p>
              </div>
              {[
                { label: "Integration Type", value: "OAuth 2.0 + PKCE · OpenID Connect" },
                { label: "Authority", value: "MOI Nafath · NCDT Saudi Arabia" },
                { label: "Status", value: "MOH Certified · Awaiting NCDT production" },
                { label: "Expected Live", value: "Q3 2026 production rollout" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-black/[0.05] last:border-0">
                  <span className="text-[11px] text-muted-foreground">{item.label}</span>
                  <span className="text-[11px] font-semibold text-foreground text-right max-w-[220px]">{item.value}</span>
                </div>
              ))}
              <button onClick={() => setNafathOpen(false)}
                className="w-full mt-6 py-3.5 rounded-xl bg-foreground text-white text-[13px] font-bold hover:opacity-90 transition-opacity">
                Continue with Role Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
