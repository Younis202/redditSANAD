import React from "react";
import { Link } from "wouter";
import {
  Brain, Shield, Activity, Zap, Lock,
  ArrowRight, Globe, Users, Building2,
  HeartPulse, FlaskConical, ChevronRight,
  ShieldCheck, Clock, TrendingUp, Cpu
} from "lucide-react";

const STATS = [
  { value: "34.2M+", label: "Registered Citizens",   sub: "National Health IDs" },
  { value: "450+",   label: "Connected Hospitals",    sub: "Across all 13 regions" },
  { value: "847K",   label: "AI Decisions / Day",     sub: "Real-time clinical support" },
  { value: "SAR 4.7B", label: "Annual AI Savings",   sub: "Across the health system" },
];

const FEATURES = [
  {
    icon: Brain,
    title: "9 AI Engines",
    description: "From risk scoring to drug interaction checks, autonomous AI engines run every clinical event in real time.",
    accent: "#007AFF",
  },
  {
    icon: ShieldCheck,
    title: "PDPL Compliant",
    description: "All data governed by Royal Decree M/19 and NCA Healthcare Data Standard v2.0. Sovereign KSA infrastructure.",
    accent: "#059669",
  },
  {
    icon: Activity,
    title: "Real-time SSE",
    description: "Live server-sent events connect 12 portals — a single clinical event cascades to every relevant stakeholder in milliseconds.",
    accent: "#7c3aed",
  },
  {
    icon: Clock,
    title: "Sub-second Response",
    description: "Emergency lookup returns blood type, allergies, medications, and AI clinical actions in under one second.",
    accent: "#dc2626",
  },
  {
    icon: TrendingUp,
    title: "Digital Twin Engine",
    description: "12-month AI health trajectory forecast per citizen. Predicts hospitalisation risk, chronic disease progression, and lab trends.",
    accent: "#d97706",
  },
  {
    icon: Cpu,
    title: "Immutable Audit Trail",
    description: "Every access event, AI decision, and data touch logged permanently per MOH Compliance Standard v2.0.",
    accent: "#0284c7",
  },
];

const PORTALS = [
  { icon: ShieldCheck,  label: "Emergency Response",  sub: "First Responders · SRCA",       accent: "#dc2626" },
  { icon: HeartPulse,   label: "Physician Portal",     sub: "Clinical Decision Support",     accent: "#007AFF" },
  { icon: Users,        label: "Citizen Portal",       sub: "Personal Health Records",       accent: "#d97706" },
  { icon: Building2,    label: "Ministry Analytics",   sub: "National Intelligence",         accent: "#059669" },
  { icon: FlaskConical, label: "Lab & Research",       sub: "Diagnostics & Population Data", accent: "#0f766e" },
  { icon: Shield,       label: "Insurance & Supply",   sub: "Claims, Fraud & Logistics",     accent: "#7c3aed" },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F5F5F7" }}>

      {/* ─── Header ─── */}
      <header
        className="h-[64px] flex items-center justify-between px-10 sticky top-0 z-20"
        style={{
          background: "rgba(255,255,255,0.88)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-[32px] h-[32px] rounded-[9px] flex items-center justify-center bg-[hsl(211_100%_50%)] shrink-0">
            <img
              src={`${import.meta.env.BASE_URL}images/sanad-logo.png`}
              alt="Sanad"
              className="w-[17px] h-[17px] brightness-0 invert"
            />
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="font-extrabold text-[15px] text-foreground tracking-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>SANAD</span>
            <span className="text-[11px] text-muted-foreground font-medium hidden sm:block">National AI Health Intelligence Platform</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground px-3 py-1.5 rounded-full border border-black/[0.07] bg-white">
            <Globe className="w-3 h-3 shrink-0" />
            Ministry of Health — KSA
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-secondary px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
            All Systems Live
          </div>
          <Link href="/login">
            <div className="flex items-center gap-1.5 text-[12px] font-bold text-white bg-primary hover:bg-primary/90 px-4 py-1.5 rounded-full transition-colors cursor-pointer">
              Sign In
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>
      </header>

      <main className="flex-1">

        {/* ─── HERO ─── */}
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(160deg, hsl(211 100% 24%) 0%, hsl(230 80% 15%) 55%, hsl(270 60% 12%) 100%)",
            }}
          />
          <div
            className="absolute top-[-80px] right-[-80px] w-[600px] h-[600px] rounded-full opacity-[0.08]"
            style={{ background: "radial-gradient(circle, #ffffff 0%, transparent 70%)" }}
          />
          <div
            className="absolute bottom-[-100px] left-[20%] w-[400px] h-[400px] rounded-full opacity-[0.05]"
            style={{ background: "radial-gradient(circle, #60a5fa 0%, transparent 70%)" }}
          />

          <div className="relative z-10 max-w-[1160px] mx-auto px-10 pt-20 pb-24">
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-white/50 mb-7 px-3.5 py-1.5 rounded-full border border-white/[0.12] bg-white/[0.05]">
              <Zap className="w-3 h-3 text-blue-400" />
              AI-Driven National Health Operating System · v3.0
            </div>

            <h1
              className="text-[56px] font-black text-white tracking-tight leading-[1.06] mb-6 max-w-[700px]"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              The intelligence layer for<br />
              <span style={{ background: "linear-gradient(90deg, #60a5fa, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Saudi Healthcare
              </span>
            </h1>

            <p className="text-[16px] text-white/55 leading-relaxed mb-10 max-w-[560px]">
              SANAD connects <span className="text-white/90 font-semibold">450+ hospitals</span> and <span className="text-white/90 font-semibold">34M citizen records</span> through 9 AI engines — delivering clinical decisions, risk scoring, and real-time alerts to 12 specialist portals.
            </p>

            <div className="flex items-center gap-3 flex-wrap mb-14">
              <Link href="/login">
                <div className="flex items-center gap-2 px-6 py-3 bg-white text-[hsl(211_100%_30%)] text-[14px] font-bold rounded-2xl hover:bg-white/90 transition-colors cursor-pointer shadow-lg shadow-black/20">
                  Access SANAD Platform
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
              <div className="flex items-center gap-2 px-5 py-3 bg-white/[0.08] text-white/80 text-[13px] font-semibold rounded-2xl border border-white/[0.12] cursor-default">
                <Lock className="w-3.5 h-3.5 text-white/50" />
                PDPL-Compliant · Role-Based Access
              </div>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-4 gap-3">
              {STATS.map(({ value, label, sub }) => (
                <div
                  key={label}
                  className="rounded-2xl px-5 py-4"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}
                >
                  <p className="text-[28px] font-black text-white leading-none tracking-tight">{value}</p>
                  <p className="text-[12px] text-white/80 font-semibold mt-1">{label}</p>
                  <p className="text-[10px] text-white/35 font-medium mt-0.5">{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 12 PORTALS PREVIEW ─── */}
        <section className="max-w-[1160px] mx-auto px-10 py-16">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Platform Coverage</p>
              <h2 className="text-[28px] font-black text-foreground tracking-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>
                12 Specialist Portals
              </h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-[460px]">
                Every clinical role — from emergency responders to insurance auditors — operates through a dedicated, role-locked portal with tailored AI tools.
              </p>
            </div>
            <Link href="/login">
              <div className="flex items-center gap-1.5 text-[12px] font-semibold text-primary cursor-pointer hover:text-primary/80 transition-colors">
                View all portals
                <ChevronRight className="w-4 h-4" />
              </div>
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            {PORTALS.map(({ icon: Icon, label, sub, accent }) => (
              <div
                key={label}
                className="flex items-center gap-4 p-5 rounded-[20px] transition-all duration-200 hover:scale-[1.01]"
                style={{
                  background: "rgba(255,255,255,0.70)",
                  backdropFilter: "blur(20px)",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                }}
              >
                <div className="w-11 h-11 rounded-[13px] flex items-center justify-center shrink-0" style={{ background: accent }}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-foreground leading-tight">{label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          <div
            className="rounded-[20px] px-6 py-4 flex items-center justify-between"
            style={{
              background: "rgba(255,255,255,0.60)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
            }}
          >
            <p className="text-[12px] text-muted-foreground font-medium">
              Plus: Family Health, Hospital Operations, Pharmacy, Supply Chain, Lab, Research — all role-locked with individual AI decision stacks.
            </p>
            <Link href="/login">
              <div className="flex items-center gap-1.5 text-[12px] font-bold text-primary whitespace-nowrap ml-6 cursor-pointer hover:text-primary/80 transition-colors">
                Sign in to access
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          </div>
        </section>

        {/* ─── FEATURES GRID ─── */}
        <section className="max-w-[1160px] mx-auto px-10 pb-16">
          <div className="mb-8">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Platform Architecture</p>
            <h2 className="text-[28px] font-black text-foreground tracking-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>
              Built for national-scale healthcare
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, description, accent }) => (
              <div
                key={title}
                className="p-6 rounded-[20px]"
                style={{
                  background: "rgba(255,255,255,0.70)",
                  backdropFilter: "blur(20px)",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-[12px] flex items-center justify-center mb-4"
                  style={{ background: accent }}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-[14px] font-bold text-foreground mb-1.5">{title}</p>
                <p className="text-[12px] text-muted-foreground leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── CTA SECTION ─── */}
        <section className="max-w-[1160px] mx-auto px-10 pb-20">
          <div
            className="rounded-[28px] px-12 py-12 flex items-center justify-between gap-8 overflow-hidden relative"
            style={{
              background: "linear-gradient(135deg, hsl(211 100% 32%) 0%, hsl(220 90% 22%) 100%)",
              boxShadow: "0 20px 60px rgba(0,80,200,0.25)",
            }}
          >
            <div
              className="absolute top-0 right-0 w-[360px] h-[360px] rounded-full opacity-[0.07] pointer-events-none"
              style={{ background: "radial-gradient(circle, white 0%, transparent 70%)", transform: "translate(100px,-100px)" }}
            />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/40 mb-2">Get Started</p>
              <h2 className="text-[32px] font-black text-white tracking-tight leading-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>
                Ready to access<br />your portal?
              </h2>
              <p className="text-[13px] text-white/60 mt-3 max-w-[360px] leading-relaxed">
                Sign in with your Ministry-issued credentials or National ID via Nafath to access your role-specific dashboard.
              </p>
            </div>
            <Link href="/login">
              <div className="flex items-center gap-2.5 px-8 py-4 bg-white text-[hsl(211_100%_30%)] text-[15px] font-bold rounded-2xl hover:bg-white/90 transition-colors cursor-pointer shadow-xl shadow-black/20 shrink-0">
                Access SANAD Platform
                <ArrowRight className="w-5 h-5" />
              </div>
            </Link>
          </div>
        </section>

      </main>

      {/* ─── Footer ─── */}
      <footer
        className="px-10 py-5 flex items-center justify-between"
        style={{ borderTop: "1px solid rgba(0,0,0,0.06)", background: "rgba(255,255,255,0.70)" }}
      >
        <div className="flex items-center gap-2">
          <div className="w-[22px] h-[22px] rounded-[6px] flex items-center justify-center bg-[hsl(211_100%_50%)] shrink-0">
            <img
              src={`${import.meta.env.BASE_URL}images/sanad-logo.png`}
              alt="Sanad"
              className="w-[11px] h-[11px] brightness-0 invert"
            />
          </div>
          <p className="text-[11px] text-muted-foreground">© 2026 Ministry of Health — Kingdom of Saudi Arabia · All Rights Reserved</p>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-[11px] text-muted-foreground font-mono">SANAD v3.0 · PDPL-COMPLIANT</p>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
            99.99% Uptime
          </div>
        </div>
      </footer>
    </div>
  );
}
