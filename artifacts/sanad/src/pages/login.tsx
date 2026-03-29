import React, { useState } from "react";
import { useLocation } from "wouter";
import { Brain, ShieldAlert, HeartPulse, User, Building2, FlaskConical, Pill, BedDouble, Shield, Users, Package, Globe, Lock, ChevronRight, Activity } from "lucide-react";
import { useAuth, type UserRole } from "@/contexts/auth-context";

const ROLES: {
  role: UserRole;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  ring: string;
  href: string;
  badge?: string;
}[] = [
  { role: "emergency", label: "Emergency Response", sublabel: "First Responders · SRCA", icon: ShieldAlert, color: "text-red-600", bg: "bg-red-50", ring: "ring-red-200", href: "/emergency", badge: "24/7" },
  { role: "doctor", label: "Physician Portal", sublabel: "Clinical Decision Support", icon: HeartPulse, color: "text-blue-600", bg: "bg-blue-50", ring: "ring-blue-200", href: "/doctor" },
  { role: "citizen", label: "Citizen App", sublabel: "Personal Health Record", icon: User, color: "text-amber-600", bg: "bg-amber-50", ring: "ring-amber-200", href: "/citizen" },
  { role: "admin", label: "Ministry Dashboard", sublabel: "National Health Intelligence", icon: Building2, color: "text-indigo-600", bg: "bg-indigo-50", ring: "ring-indigo-200", href: "/admin", badge: "Gov" },
  { role: "lab", label: "Lab Portal", sublabel: "Results · AI Interpretation", icon: FlaskConical, color: "text-teal-600", bg: "bg-teal-50", ring: "ring-teal-200", href: "/lab" },
  { role: "pharmacy", label: "Pharmacy Portal", sublabel: "Dispense · Drug Safety AI", icon: Pill, color: "text-purple-600", bg: "bg-purple-50", ring: "ring-purple-200", href: "/pharmacy" },
  { role: "hospital", label: "Hospital Operations", sublabel: "Bed Mgmt · Capacity", icon: BedDouble, color: "text-sky-600", bg: "bg-sky-50", ring: "ring-sky-200", href: "/hospital" },
  { role: "insurance", label: "Insurance Portal", sublabel: "Claims · Fraud Detection", icon: Shield, color: "text-violet-600", bg: "bg-violet-50", ring: "ring-violet-200", href: "/insurance" },
  { role: "ai-control", label: "AI Control Center", sublabel: "9-Engine Monitor · Drift", icon: Brain, color: "text-rose-600", bg: "bg-rose-50", ring: "ring-rose-200", href: "/ai-control", badge: "Core" },
  { role: "research", label: "Research Portal", sublabel: "Anonymized Data · Studies", icon: FlaskConical, color: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-200", href: "/research" },
  { role: "family", label: "Family Health", sublabel: "Genetic Risk · Linking", icon: Users, color: "text-orange-600", bg: "bg-orange-50", ring: "ring-orange-200", href: "/family" },
  { role: "supply-chain", label: "Supply Chain", sublabel: "Drug Availability · Shortages", icon: Package, color: "text-lime-700", bg: "bg-lime-50", ring: "ring-lime-200", href: "/supply-chain" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEnter = () => {
    if (!selected) return;
    setLoading(true);
    const found = ROLES.find(r => r.role === selected)!;
    setTimeout(() => {
      login(selected);
      setLocation(found.href);
    }, 600);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "hsl(240 6% 97%)" }}>

      {/* Header */}
      <header
        className="h-16 flex items-center justify-between px-10 sticky top-0 z-10"
        style={{
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[11px] flex items-center justify-center" style={{ background: "hsl(211 100% 50%)" }}>
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-[15px] text-foreground tracking-tight">Sanad</span>
            <span className="text-muted-foreground text-[11px] ml-2 font-medium">National AI Health Platform</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
            All Systems Live
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground bg-white border border-black/[0.07] px-3 py-1.5 rounded-full shadow-sm">
            <Globe className="w-3 h-3" />
            Ministry of Health — KSA
          </div>
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full px-10 py-12">

        {/* Hero */}
        <div className="mb-10 flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-primary mb-4 px-3.5 py-1.5 rounded-full border" style={{ background: "rgba(0,122,255,0.06)", borderColor: "rgba(0,122,255,0.2)" }}>
              <Lock className="w-3 h-3" />
              Role-Based Access Control · Identity Verified
            </div>
            <h1 className="text-[36px] font-bold text-foreground tracking-tight leading-tight mb-2">
              Select Your Portal
            </h1>
            <p className="text-[14px] text-muted-foreground max-w-lg">
              Each portal is designed for a specific role within the national health ecosystem. Your access is governed by RBAC policies aligned with MOH standards.
            </p>
          </div>

          {selected && (
            <button
              onClick={handleEnter}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-70"
              style={{ background: "hsl(211 100% 50%)" }}
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Authenticating...</>
              ) : (
                <>Enter Portal <ChevronRight className="w-4 h-4" /></>
              )}
            </button>
          )}
        </div>

        {/* System Status Bar */}
        <div className="flex items-center gap-6 mb-8 px-5 py-3 rounded-2xl bg-white border border-black/[0.05] shadow-sm">
          <div className="flex items-center gap-2 text-[12px]">
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            <span className="font-semibold text-foreground">50</span>
            <span className="text-muted-foreground">Active Patients</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-2 text-[12px]">
            <Brain className="w-3.5 h-3.5 text-violet-500" />
            <span className="font-semibold text-foreground">9</span>
            <span className="text-muted-foreground">AI Engines Running</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-2 text-[12px]">
            <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
            <span className="font-semibold text-foreground">10</span>
            <span className="text-muted-foreground">Critical Cases</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-2 text-[12px]">
            <Globe className="w-3.5 h-3.5 text-blue-500" />
            <span className="font-semibold text-foreground">13</span>
            <span className="text-muted-foreground">Regions Monitored</span>
          </div>
        </div>

        {/* Role Grid */}
        <div className="grid grid-cols-4 gap-3">
          {ROLES.map((r) => {
            const Icon = r.icon;
            const isSelected = selected === r.role;
            return (
              <button
                key={r.role}
                onClick={() => setSelected(r.role)}
                className={`
                  group text-left p-4 rounded-2xl border-2 transition-all duration-150 relative overflow-hidden
                  ${isSelected
                    ? `${r.bg} border-transparent ring-2 ${r.ring} shadow-lg scale-[1.01]`
                    : "bg-white border-transparent hover:border-black/[0.06] hover:shadow-md"
                  }
                `}
                style={{
                  boxShadow: isSelected ? "0 4px 20px rgba(0,0,0,0.1)" : "0 1px 3px rgba(0,0,0,0.06)",
                }}
              >
                {r.badge && (
                  <span className={`absolute top-3 right-3 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${r.bg} ${r.color}`}>
                    {r.badge}
                  </span>
                )}
                <div className={`w-9 h-9 rounded-[11px] flex items-center justify-center mb-3 ${r.bg}`}>
                  <Icon className={`w-4.5 h-4.5 ${r.color}`} style={{ width: 18, height: 18 }} />
                </div>
                <p className={`text-[13px] font-bold mb-0.5 ${isSelected ? r.color : "text-foreground"}`}>{r.label}</p>
                <p className="text-[11px] text-muted-foreground">{r.sublabel}</p>
                {isSelected && (
                  <div className={`mt-2 flex items-center gap-1 text-[11px] font-semibold ${r.color}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                    Selected — ready to enter
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom note */}
        <div className="mt-8 flex items-center gap-2 text-[11px] text-muted-foreground/70">
          <Lock className="w-3 h-3" />
          <span>All access is governed by RBAC · Session encrypted · Audit logged per MOH Circular 42/1445</span>
        </div>
      </div>
    </div>
  );
}
