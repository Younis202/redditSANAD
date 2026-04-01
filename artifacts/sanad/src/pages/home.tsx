import React, { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  ArrowRight, Brain, ShieldCheck, Activity, Clock, TrendingUp, Cpu,
  HeartPulse, FlaskConical, Shield, Users, Building2, Pill, BedDouble,
  Package, Truck, Globe, Lock, Zap, ChevronDown,
  ShieldAlert, User, Radio, FileSearch, BarChart3,
} from "lucide-react";

/* ─── Animated counter ─── */
function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const duration = 1800;
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min((now - start) / duration, 1);
          const ease = 1 - Math.pow(1 - t, 4);
          setVal(Math.round(ease * target));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

/* ─── Portal definitions ─── */
const PORTALS = [
  { icon: ShieldAlert,  label: "Emergency",      sub: "First Responders",        accent: "#ef4444", href: "/login" },
  { icon: HeartPulse,   label: "Physician",       sub: "Clinical Decisions",      accent: "#007AFF", href: "/login" },
  { icon: User,         label: "Citizen",         sub: "Personal Health",         accent: "#f59e0b", href: "/login" },
  { icon: Building2,    label: "Ministry",        sub: "National Intelligence",   accent: "#6366f1", href: "/login" },
  { icon: FlaskConical, label: "Laboratory",      sub: "AI Diagnostics",          accent: "#10b981", href: "/login" },
  { icon: Pill,         label: "Pharmacy",        sub: "Drug Safety AI",          accent: "#06b6d4", href: "/login" },
  { icon: BedDouble,    label: "Hospital Ops",    sub: "Capacity & Beds",         accent: "#0ea5e9", href: "/login" },
  { icon: Shield,       label: "Insurance",       sub: "Fraud & Claims",          accent: "#8b5cf6", href: "/login" },
  { icon: Users,        label: "Family Health",   sub: "Genetic Risk",            accent: "#ec4899", href: "/login" },
  { icon: Package,      label: "Supply Chain",    sub: "Drug Logistics",          accent: "#f97316", href: "/login" },
  { icon: FileSearch,   label: "Research",        sub: "Population AI",           accent: "#14b8a6", href: "/login" },
  { icon: Radio,        label: "AI Control",      sub: "Engine Command",          accent: "#a855f7", href: "/login" },
];

const ENGINES = [
  { label: "Risk Stratification Engine",    desc: "LACE+, HbA1c trajectory, comorbidity weighting" },
  { label: "Drug Interaction Checker",      desc: "43,000+ drug-pair interaction database, renal dosing" },
  { label: "Digital Twin Projection",       desc: "12-month individual health trajectory forecast" },
  { label: "Fraud Detection Engine",        desc: "Behavioral anomaly scoring on 100% of claims" },
  { label: "Clinical NLP Engine",           desc: "MOH protocol matching, ICD-10 auto-coding" },
  { label: "Demand Forecast Engine",        desc: "Regional drug demand prediction, reorder automation" },
  { label: "Triage & Routing AI",           desc: "Emergency severity scoring, OR & ICU coordination" },
  { label: "Genetic Risk Cascade",          desc: "Hereditary disease propagation across family units" },
  { label: "Population Hypothesis Engine",  desc: "Auto-generates IRB-ready research from 34M+ records" },
];

/* ─── Tiny pulse dot ─── */
function Pulse({ color = "#22c55e" }: { color?: string }) {
  return (
    <span className="relative inline-flex">
      <span className="absolute inset-0 rounded-full animate-ping opacity-60" style={{ background: color }} />
      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
    </span>
  );
}

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "#06080f", color: "#fff", fontFamily: "'Manrope', system-ui, sans-serif" }}>

      {/* ══════════════════════════════════
          HEADER
      ══════════════════════════════════ */}
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? "rgba(6,8,15,0.90)" : "transparent",
          backdropFilter: scrolled ? "blur(24px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "none",
        }}
      >
        <div className="max-w-[1200px] mx-auto px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, #007AFF 0%, #5856D6 100%)" }}
            >
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-black text-[15px] tracking-tight text-white">SANAD</span>
              <span className="text-[11px] text-white/30 font-medium hidden sm:block">National AI Health Platform</span>
            </div>
          </div>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {["Portals", "Architecture", "Security"].map(n => (
              <a key={n} href={`#${n.toLowerCase()}`}
                className="text-[13px] font-medium text-white/50 hover:text-white/90 px-4 py-2 rounded-xl transition-colors">
                {n}
              </a>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
              <Pulse color="#22c55e" />
              <span>All Systems Live</span>
            </div>
            <Link href="/login">
              <div
                className="flex items-center gap-2 text-[13px] font-bold text-white px-5 py-2.5 rounded-xl cursor-pointer transition-all hover:scale-[1.02]"
                style={{ background: "linear-gradient(135deg, #007AFF 0%, #5856D6 100%)", boxShadow: "0 4px 24px rgba(0,122,255,0.3)" }}
              >
                Sign In
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════
          HERO SECTION
      ══════════════════════════════════ */}
      <section className="relative min-h-screen flex flex-col justify-center overflow-hidden">
        {/* Background atmospherics */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Primary glow */}
          <div className="absolute top-[-20%] left-[50%] -translate-x-1/2 w-[900px] h-[600px] rounded-full opacity-[0.12]"
            style={{ background: "radial-gradient(ellipse, #007AFF 0%, transparent 65%)" }} />
          {/* Secondary violet glow */}
          <div className="absolute top-[30%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.08]"
            style={{ background: "radial-gradient(circle, #5856D6 0%, transparent 65%)" }} />
          {/* Bottom left glow */}
          <div className="absolute bottom-[10%] left-[-5%] w-[400px] h-[400px] rounded-full opacity-[0.06]"
            style={{ background: "radial-gradient(circle, #34d399 0%, transparent 65%)" }} />
          {/* Grid lines */}
          <div className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
              backgroundSize: "80px 80px",
            }} />
        </div>

        <div className="relative z-10 max-w-[1200px] mx-auto px-8 pt-28 pb-20 flex flex-col items-center text-center">
          {/* Eyebrow badge */}
          <div
            className="inline-flex items-center gap-2 text-[11px] font-bold text-white/60 mb-10 px-4 py-2 rounded-full border"
            style={{ borderColor: "rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)" }}
          >
            <Zap className="w-3 h-3 text-blue-400" />
            SANAD AI Health Platform · v4.0 · Kingdom of Saudi Arabia
            <Zap className="w-3 h-3 text-violet-400" />
          </div>

          {/* Main headline */}
          <h1 className="text-[72px] font-black tracking-[-0.03em] leading-[1.0] mb-6 max-w-[900px]"
            style={{ letterSpacing: "-0.025em" }}>
            <span className="text-white">The operating system</span>
            <br />
            <span style={{
              background: "linear-gradient(90deg, #60a5fa 0%, #a78bfa 40%, #f472b6 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>for Saudi Healthcare</span>
          </h1>

          {/* Subheadline */}
          <p className="text-[18px] text-white/40 font-medium leading-relaxed mb-12 max-w-[580px]">
            34 million citizen health records. 9 AI engines. 12 specialist portals.
            <br />
            <span className="text-white/60">Every clinical decision, connected in real time.</span>
          </p>

          {/* CTAs */}
          <div className="flex items-center gap-4 mb-20">
            <Link href="/login">
              <div
                className="flex items-center gap-2.5 px-8 py-4 text-[15px] font-bold text-white rounded-2xl cursor-pointer transition-all hover:scale-[1.02] hover:shadow-2xl"
                style={{ background: "linear-gradient(135deg, #007AFF 0%, #5856D6 100%)", boxShadow: "0 8px 32px rgba(0,122,255,0.35)" }}
              >
                Access Your Portal
                <ArrowRight className="w-4.5 h-4.5" />
              </div>
            </Link>
            <div
              className="flex items-center gap-2 px-6 py-4 text-[13px] font-semibold text-white/60 rounded-2xl border cursor-default"
              style={{ borderColor: "rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)" }}
            >
              <Lock className="w-3.5 h-3.5 text-white/30" />
              Role-Based · PDPL-Compliant
            </div>
          </div>

          {/* Live stats strip */}
          <div className="w-full grid grid-cols-4 gap-3 max-w-[900px]">
            {[
              { n: 34.2, suffix: "M+", label: "Citizen Records", sub: "National Health IDs" },
              { n: 450,  suffix: "+",  label: "Connected Hospitals", sub: "All 13 regions" },
              { n: 847,  suffix: "K",  label: "AI Decisions/Day", sub: "Zero human delay" },
              { n: 4.7,  suffix: "B",  label: "SAR Saved/Year", sub: "AI-driven efficiency" },
            ].map((s, i) => (
              <div key={i}
                className="rounded-2xl px-5 py-5 text-left"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <p className="text-[32px] font-black text-white tracking-tight leading-none mb-1">
                  {s.n < 100 ? s.n.toFixed(1) : <Counter target={s.n} />}{s.suffix}
                </p>
                <p className="text-[12px] text-white/70 font-semibold">{s.label}</p>
                <p className="text-[10px] text-white/30 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/20 animate-bounce">
          <ChevronDown className="w-5 h-5" />
        </div>
      </section>

      {/* ══════════════════════════════════
          PORTALS SECTION
      ══════════════════════════════════ */}
      <section id="portals" className="py-28 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] opacity-[0.04]"
            style={{ background: "radial-gradient(ellipse, #fff 0%, transparent 70%)" }} />
        </div>

        <div className="max-w-[1200px] mx-auto px-8 relative z-10">
          {/* Section header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-[11px] font-bold text-white/30 uppercase tracking-[0.15em] mb-4">
              <span className="w-8 h-px bg-white/15" />
              Platform Coverage
              <span className="w-8 h-px bg-white/15" />
            </div>
            <h2 className="text-[48px] font-black text-white tracking-tight leading-tight mb-4">
              12 Specialist Portals
            </h2>
            <p className="text-[16px] text-white/35 max-w-[500px] mx-auto leading-relaxed">
              Every clinical role — emergency to research — operates through a dedicated, AI-powered world of its own.
            </p>
          </div>

          {/* Portal grid */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {PORTALS.slice(0, 8).map((p, i) => (
              <Link key={i} href={p.href}>
                <div
                  className="group relative p-5 rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02]"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  {/* Hover glow */}
                  <div
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: `radial-gradient(circle at 30% 40%, ${p.accent}15 0%, transparent 60%)` }}
                  />
                  <div className="relative z-10">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                      style={{ background: `${p.accent}20`, border: `1px solid ${p.accent}40` }}
                    >
                      <p.icon className="w-5 h-5" style={{ color: p.accent }} />
                    </div>
                    <p className="text-[14px] font-bold text-white mb-1">{p.label}</p>
                    <p className="text-[11px] text-white/35">{p.sub}</p>
                    <div
                      className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: p.accent }}
                    >
                      Open Portal <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-4">
            {PORTALS.slice(8).map((p, i) => (
              <Link key={i} href={p.href}>
                <div
                  className="group relative p-5 rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02]"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: `radial-gradient(circle at 30% 40%, ${p.accent}15 0%, transparent 60%)` }} />
                  <div className="relative z-10">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                      style={{ background: `${p.accent}20`, border: `1px solid ${p.accent}40` }}>
                      <p.icon className="w-5 h-5" style={{ color: p.accent }} />
                    </div>
                    <p className="text-[14px] font-bold text-white mb-1">{p.label}</p>
                    <p className="text-[11px] text-white/35">{p.sub}</p>
                    <div className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: p.accent }}>
                      Open Portal <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}

            {/* CTA card */}
            <Link href="/login">
              <div
                className="relative p-5 rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between"
                style={{ background: "linear-gradient(135deg, rgba(0,122,255,0.15) 0%, rgba(88,86,214,0.15) 100%)", border: "1px solid rgba(0,122,255,0.25)" }}
              >
                <div>
                  <p className="text-[14px] font-bold text-white mb-1">All Portals</p>
                  <p className="text-[11px] text-white/40">Sign in to access your role</p>
                </div>
                <div className="flex items-center gap-2 text-[12px] font-bold text-blue-400 mt-6">
                  Sign In <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          AI ENGINES SECTION
      ══════════════════════════════════ */}
      <section id="architecture" className="py-28 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/2 pointer-events-none opacity-[0.04]"
          style={{ background: "linear-gradient(90deg, transparent, #5856D6)" }} />

        <div className="max-w-[1200px] mx-auto px-8 relative z-10">
          <div className="grid grid-cols-2 gap-20 items-center">
            {/* Left: copy */}
            <div>
              <div className="inline-flex items-center gap-2 text-[11px] font-bold text-white/30 uppercase tracking-[0.15em] mb-4">
                <span className="w-8 h-px bg-white/15" />
                Platform Architecture
              </div>
              <h2 className="text-[48px] font-black text-white tracking-tight leading-tight mb-6">
                9 AI Engines.<br />
                <span style={{ background: "linear-gradient(90deg, #60a5fa, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Always on.
                </span>
              </h2>
              <p className="text-[16px] text-white/35 leading-relaxed mb-8 max-w-[420px]">
                Every clinical event — a lab result, a prescription, an emergency triage — triggers an autonomous AI cascade across all connected portals within 250ms.
              </p>
              <div className="flex items-center gap-3 p-4 rounded-xl"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(0,122,255,0.15)" }}>
                  <Activity className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-white">234ms average cascade latency</p>
                  <p className="text-[11px] text-white/35">From lab result to 7 portal alerts — zero human intervention</p>
                </div>
              </div>
            </div>

            {/* Right: engine list */}
            <div className="space-y-2">
              {ENGINES.map((e, i) => (
                <div key={i}
                  className="group flex items-start gap-4 p-4 rounded-xl transition-all duration-200 hover:bg-white/[0.04] cursor-default"
                  style={{ border: "1px solid transparent" }}
                  onMouseEnter={ev => (ev.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")}
                  onMouseLeave={ev => (ev.currentTarget.style.borderColor = "transparent")}
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: `rgba(${[0,122,255, 88,86,214, 52,211,153, 239,68,68, 245,158,11, 6,182,212, 139,92,246, 236,72,153, 20,184,166][i*3] ?? 0},${[122,255,0, 86,214,88, 211,153,52, 68,68,239, 158,11,245, 182,212,6, 92,246,139, 72,153,236, 184,166,20][i*3] ?? 122},${[255,0,122, 214,88,86, 153,52,211, 68,239,68, 11,245,158, 212,6,182, 246,139,92, 153,236,72, 166,20,184][i*3] ?? 255},0.15)` }}>
                    <span className="text-[10px] font-black text-white/60">{i + 1}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-white/80 group-hover:text-white transition-colors">{e.label}</p>
                    <p className="text-[11px] text-white/30 mt-0.5">{e.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          SECURITY SECTION
      ══════════════════════════════════ */}
      <section id="security" className="py-28">
        <div className="max-w-[1200px] mx-auto px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-[11px] font-bold text-white/30 uppercase tracking-[0.15em] mb-4">
              <span className="w-8 h-px bg-white/15" />
              Compliance & Security
              <span className="w-8 h-px bg-white/15" />
            </div>
            <h2 className="text-[48px] font-black text-white tracking-tight mb-4">
              Sovereign. Secure. Compliant.
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: Shield, title: "PDPL Compliant", desc: "Royal Decree M/19 · Full Article 12 data sovereignty. Every patient record stored on KSA sovereign infrastructure.", color: "#22c55e" },
              { icon: Lock, title: "AES-256 + TLS 1.3", desc: "Military-grade encryption at rest and in transit. HSM-backed key management. Zero-knowledge PHI architecture.", color: "#007AFF" },
              { icon: Cpu, title: "ISO 27001 + NDMO", desc: "National Data Management Office v2.0 compliance. NCA Healthcare Standard certified. HIPAA-equivalent controls.", color: "#8b5cf6" },
              { icon: Activity, title: "Immutable Audit Trail", desc: "4.28M events/month. SHA-256 chained ledger. 100% PHI access logging. Tamper-proof per MOH Standard v2.0.", color: "#f59e0b" },
              { icon: Globe, title: "Multi-region Active-Active", desc: "Riyadh ↔ Jeddah active-active redundancy. <80ms SSE latency. 99.98% uptime SLA. Sub-second failover.", color: "#0ea5e9" },
              { icon: Brain, title: "AI Governance Layer", desc: "Every AI decision explained. Clinician override on all recommendations. Full XAI audit log with confidence scoring.", color: "#ec4899" },
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: `${item.color}18`, border: `1px solid ${item.color}35` }}>
                  <item.icon className="w-5 h-5" style={{ color: item.color }} />
                </div>
                <p className="text-[14px] font-bold text-white mb-2">{item.title}</p>
                <p className="text-[12px] text-white/35 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          CTA SECTION
      ══════════════════════════════════ */}
      <section className="py-20 px-8">
        <div className="max-w-[1200px] mx-auto">
          <div
            className="relative rounded-[32px] px-16 py-16 overflow-hidden text-center"
            style={{ background: "linear-gradient(135deg, rgba(0,122,255,0.15) 0%, rgba(88,86,214,0.15) 50%, rgba(168,85,247,0.12) 100%)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none opacity-[0.06]"
              style={{ background: "radial-gradient(ellipse, #fff 0%, transparent 65%)" }} />
            <div className="relative z-10">
              <p className="text-[11px] font-bold text-white/30 uppercase tracking-[0.15em] mb-4">Ready to Begin</p>
              <h2 className="text-[48px] font-black text-white tracking-tight leading-tight mb-4">
                Access your portal.
                <br />
                <span style={{ background: "linear-gradient(90deg, #60a5fa, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Transform Saudi healthcare.
                </span>
              </h2>
              <p className="text-[16px] text-white/35 max-w-[480px] mx-auto mb-10">
                Sign in with your Ministry-issued credentials or National ID via Nafath.
              </p>
              <Link href="/login">
                <div
                  className="inline-flex items-center gap-3 px-10 py-4 text-[16px] font-bold text-white rounded-2xl cursor-pointer transition-all hover:scale-[1.02]"
                  style={{ background: "linear-gradient(135deg, #007AFF 0%, #5856D6 100%)", boxShadow: "0 12px 40px rgba(0,122,255,0.35)" }}
                >
                  Access SANAD Platform
                  <ArrowRight className="w-5 h-5" />
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          FOOTER
      ══════════════════════════════════ */}
      <footer className="py-8 px-8" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #007AFF 0%, #5856D6 100%)" }}>
              <Brain className="w-3 h-3 text-white" />
            </div>
            <p className="text-[12px] text-white/25">© 2026 Ministry of Health — Kingdom of Saudi Arabia · All Rights Reserved</p>
          </div>
          <div className="flex items-center gap-6">
            <p className="text-[11px] text-white/20 font-mono">SANAD v4.0 · PDPL-COMPLIANT</p>
            <div className="flex items-center gap-1.5">
              <Pulse color="#22c55e" />
              <span className="text-[11px] text-emerald-400 font-semibold">99.99% Uptime</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
