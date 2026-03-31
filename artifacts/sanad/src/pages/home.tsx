import React from "react";
import { Link } from "wouter";
import {
  ShieldAlert, HeartPulse, User, Building2, ArrowRight,
  Shield, Brain, Activity, FlaskConical, Pill, BedDouble,
  Package, Users, Cpu, TrendingUp, Globe, Zap, Lock
} from "lucide-react";

const PORTALS = [
  {
    href: "/emergency",
    icon: ShieldAlert,
    label: "Emergency Response",
    description: "Instant life-critical data for first responders — blood type, allergies, and medications in under one second.",
    accent: "#dc2626",
    accentLight: "rgba(220,38,38,0.08)",
    tag: "First Responders",
    clearance: "RESTRICTED",
  },
  {
    href: "/doctor",
    icon: HeartPulse,
    label: "Physician Portal",
    description: "Complete patient history, AI clinical decision engine, drug interaction checks, risk scoring, and e-prescribing.",
    accent: "hsl(211 100% 50%)",
    accentLight: "rgba(0,122,255,0.08)",
    tag: "Clinical Staff",
    clearance: "CONFIDENTIAL",
  },
  {
    href: "/citizen",
    icon: User,
    label: "Citizen Portal",
    description: "Secure personal health records, prescriptions, lab results, and an AI-powered 12-month Digital Twin forecast.",
    accent: "#d97706",
    accentLight: "rgba(217,119,6,0.08)",
    tag: "Citizens",
    clearance: "PUBLIC",
  },
  {
    href: "/admin",
    icon: Building2,
    label: "Ministry Analytics",
    description: "National population health intelligence, epidemic radar, policy decision support, and executive reporting.",
    accent: "#059669",
    accentLight: "rgba(5,150,105,0.08)",
    tag: "Ministry Officials",
    clearance: "SECRET",
  },
  {
    href: "/lab",
    icon: FlaskConical,
    label: "Lab Portal",
    description: "Upload results and receive instant AI interpretation — clinical flags, risk impact, and trend analysis for every test.",
    accent: "#0d9488",
    accentLight: "rgba(13,148,136,0.08)",
    tag: "Lab Technicians",
    clearance: "RESTRICTED",
  },
  {
    href: "/pharmacy",
    icon: Pill,
    label: "Pharmacy Portal",
    description: "Dispense with AI drug safety checks, allergy conflict detection, and real-time insurance verification.",
    accent: "#9333ea",
    accentLight: "rgba(147,51,234,0.08)",
    tag: "Pharmacists",
    clearance: "RESTRICTED",
  },
  {
    href: "/hospital",
    icon: BedDouble,
    label: "Hospital Operations",
    description: "Live bed occupancy across all wards, AI-prioritized patient queue, staff allocation, and capacity insights.",
    accent: "#2563eb",
    accentLight: "rgba(37,99,235,0.08)",
    tag: "Hospital Managers",
    clearance: "CONFIDENTIAL",
  },
  {
    href: "/insurance",
    icon: Shield,
    label: "Insurance Portal",
    description: "AI-powered pre-authorization, fraud detection, real-time clinical necessity scoring, and claims analytics.",
    accent: "#7c3aed",
    accentLight: "rgba(124,58,237,0.08)",
    tag: "Insurers",
    clearance: "CONFIDENTIAL",
  },
  {
    href: "/ai-control",
    icon: Brain,
    label: "AI Control Center",
    description: "Monitor all 9 AI engines — confidence scores, model drift detection, retraining orchestration, and audit trails.",
    accent: "#6d28d9",
    accentLight: "rgba(109,40,217,0.08)",
    tag: "AI Engineers",
    clearance: "SECRET",
  },
  {
    href: "/research",
    icon: FlaskConical,
    label: "Research Portal",
    description: "Anonymized population analytics, disease prevalence trends, lab abnormality rates, and AI hypothesis engine.",
    accent: "#0f766e",
    accentLight: "rgba(15,118,110,0.08)",
    tag: "Researchers",
    clearance: "CONFIDENTIAL",
  },
  {
    href: "/family",
    icon: Users,
    label: "Family Health Portal",
    description: "Hereditary disease risk mapping, coordinated family screenings, and genetic risk inheritance pattern tracking.",
    accent: "#be185d",
    accentLight: "rgba(190,24,93,0.08)",
    tag: "Care Coordinators",
    clearance: "RESTRICTED",
  },
  {
    href: "/supply-chain",
    icon: Package,
    label: "Supply Chain",
    description: "Real-time drug inventory tracking, AI shortage prediction, automated reorder alerts, and seasonal surge planning.",
    accent: "#c2410c",
    accentLight: "rgba(194,65,12,0.08)",
    tag: "Logistics",
    clearance: "RESTRICTED",
  },
];

const CLEARANCE_STYLE: Record<string, string> = {
  PUBLIC:       "bg-emerald-100 text-emerald-700",
  RESTRICTED:   "bg-amber-100 text-amber-700",
  CONFIDENTIAL: "bg-blue-100 text-blue-700",
  SECRET:       "bg-red-100 text-red-700",
};

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "hsl(220 14% 96%)" }}>

      {/* ─── Header ─── */}
      <header
        className="h-[60px] flex items-center justify-between px-10 sticky top-0 z-20"
        style={{
          background: "rgba(255,255,255,0.82)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center bg-[hsl(211_100%_50%)] shrink-0">
            <img
              src={`${import.meta.env.BASE_URL}images/sanad-logo.png`}
              alt="Sanad"
              className="w-[18px] h-[18px] brightness-0 invert"
            />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-[15px] text-foreground tracking-tight">Sanad</span>
            <span className="text-[11px] text-muted-foreground font-medium hidden sm:block">National AI Health Intelligence Platform</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
            All Systems Live
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground bg-white border border-black/[0.07] px-3 py-1.5 rounded-full">
            <Globe className="w-3 h-3 shrink-0" />
            <span className="hidden sm:block">Ministry of Health — KSA</span>
          </div>
        </div>
      </header>

      {/* ─── Main ─── */}
      <main className="flex-1 max-w-[1200px] mx-auto w-full px-10 pt-10 pb-12 flex flex-col gap-10">

        {/* ─── Hero Card ─── */}
        <div
          className="relative overflow-hidden rounded-[28px] px-10 py-9"
          style={{
            background: "linear-gradient(135deg, hsl(211 100% 32%) 0%, hsl(220 90% 22%) 100%)",
            boxShadow: "0 20px 60px rgba(0,80,200,0.25), 0 4px 12px rgba(0,0,0,0.12)",
          }}
        >
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full opacity-[0.07]"
            style={{ background: "radial-gradient(circle, white 0%, transparent 70%)", transform: "translate(120px,-120px)" }} />
          <div className="absolute bottom-0 left-1/2 w-[300px] h-[300px] rounded-full opacity-[0.05]"
            style={{ background: "radial-gradient(circle, white 0%, transparent 70%)", transform: "translateY(100px)" }} />

          <div className="relative z-10 flex items-center justify-between gap-8">
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-white/60 mb-4 px-3 py-1 rounded-full border border-white/15 bg-white/8">
                <Brain className="w-3 h-3" />
                AI-Driven National Health Operating System · v3.0
              </div>
              <h1 className="text-[38px] font-bold text-white tracking-tight leading-[1.1] mb-3">
                Saudi Arabia's Digital<br />
                <span className="text-white/80">Health Backbone</span>
              </h1>
              <p className="text-[14px] text-white/65 max-w-[520px] leading-relaxed mb-6">
                Connecting <span className="text-white font-semibold">450+ hospitals</span> and <span className="text-white font-semibold">34M citizen records</span> with AI-powered clinical decision support. Every event triggers an AI decision — in milliseconds.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                {[
                  { icon: Zap, label: "9 AI Engines" },
                  { icon: Lock, label: "PDPL Compliant" },
                  { icon: Activity, label: "Real-time SSE" },
                  { icon: TrendingUp, label: "99.99% Uptime" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-1.5 text-[11px] font-medium text-white/70 bg-white/10 border border-white/15 px-2.5 py-1 rounded-full">
                    <Icon className="w-3 h-3" />
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="shrink-0 grid grid-cols-2 gap-3">
              {[
                { value: "34.2M+", label: "Registered Citizens" },
                { value: "450+",   label: "Connected Hospitals" },
                { value: "SAR 4.7B", label: "AI Savings Generated" },
                { value: "847K",   label: "AI Decisions / Day" },
              ].map(({ value, label }) => (
                <div key={label} className="bg-white/10 border border-white/15 rounded-[16px] px-5 py-4 text-center min-w-[120px]">
                  <p className="text-[22px] font-bold text-white leading-none mb-1">{value}</p>
                  <p className="text-[10px] text-white/55 font-medium">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Portal Grid ─── */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em] mb-0.5">Access Portals</p>
              <p className="text-[19px] font-bold text-foreground tracking-tight">Select Your Role</p>
            </div>
            <div className="text-[11px] text-muted-foreground bg-white border border-black/[0.06] px-3 py-1.5 rounded-full font-medium">
              12 portals · Role-based access
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            {PORTALS.map((portal) => (
              <PortalCard key={portal.href} {...portal} />
            ))}
          </div>
        </div>

      </main>

      {/* ─── Footer ─── */}
      <footer
        className="px-10 py-4 flex items-center justify-between"
        style={{ borderTop: "1px solid rgba(0,0,0,0.06)", background: "rgba(255,255,255,0.6)" }}
      >
        <p className="text-[11px] text-muted-foreground">© 2026 Ministry of Health — Kingdom of Saudi Arabia · All Rights Reserved</p>
        <p className="text-[11px] text-muted-foreground font-mono">SANAD v3.0 · AI-FIRST · PDPL-COMPLIANT</p>
      </footer>
    </div>
  );
}

function PortalCard({ href, icon: Icon, label, description, accent, accentLight, tag, clearance }: {
  href: string;
  icon: React.ElementType;
  label: string;
  description: string;
  accent: string;
  accentLight: string;
  tag: string;
  clearance: string;
}) {
  return (
    <Link href={href}>
      <div
        className="group flex flex-col h-full p-5 rounded-[20px] cursor-pointer border"
        style={{
          background: "white",
          borderColor: "rgba(0,0,0,0.055)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.transform = "translateY(-3px)";
          el.style.boxShadow = "0 16px 40px rgba(0,0,0,0.1), 0 3px 8px rgba(0,0,0,0.06)";
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.transform = "translateY(0)";
          el.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)";
        }}
      >
        {/* Top row */}
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-[13px] flex items-center justify-center shrink-0" style={{ background: accentLight }}>
            <Icon className="w-[18px] h-[18px]" style={{ color: accent }} />
          </div>
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${CLEARANCE_STYLE[clearance] ?? "bg-secondary text-muted-foreground"}`}>
            {clearance}
          </span>
        </div>

        {/* Content */}
        <p className="text-[13px] font-bold text-foreground mb-1 leading-tight tracking-tight">{label}</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed flex-1">{description}</p>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[10px] font-semibold text-muted-foreground">{tag}</span>
          <div
            className="flex items-center gap-1 text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            style={{ color: accent }}
          >
            Open
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </Link>
  );
}
