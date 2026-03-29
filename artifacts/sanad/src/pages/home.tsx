import React from "react";
import { Link } from "wouter";
import {
  ShieldAlert, HeartPulse, User, Building2, ArrowUpRight,
  Shield, Cpu, Globe, Activity, Zap, FlaskConical, Pill, BedDouble, Brain,
  Package, Users
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "hsl(240 6% 97%)" }}>

      {/* ─── Topbar ─── */}
      <header
        className="h-16 flex items-center justify-between px-10 sticky top-0 z-10"
        style={{
          background: "rgba(255,255,255,0.8)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-[11px] flex items-center justify-center"
            style={{ background: "hsl(211 100% 50%)" }}
          >
            <img
              src={`${import.meta.env.BASE_URL}images/sanad-logo.png`}
              alt="Sanad"
              className="w-5 h-5 brightness-0 invert"
            />
          </div>
          <div>
            <span className="font-bold text-[15px] text-foreground tracking-tight">Sanad</span>
            <span className="text-muted-foreground text-[11px] ml-2 font-medium">National AI Health Platform</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            All Systems Live
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground bg-white border border-black/[0.07] px-3 py-1.5 rounded-full shadow-sm">
            <Globe className="w-3 h-3" />
            Ministry of Health — KSA
          </div>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <div className="flex-1 flex flex-col">
        <div className="max-w-6xl mx-auto w-full px-10 pt-14 pb-10 flex flex-col">

          <div className="mb-10">
            <div
              className="inline-flex items-center gap-2 text-[11px] font-semibold text-primary mb-5 px-3.5 py-1.5 rounded-full border"
              style={{ background: "rgba(0,122,255,0.06)", borderColor: "rgba(0,122,255,0.2)" }}
            >
              <Brain className="w-3 h-3" />
              AI-Driven National Health Operating System · v3.0
            </div>

            <h1 className="text-[48px] font-bold text-foreground tracking-tight leading-[1.08] mb-4">
              Saudi Arabia's Digital
              <br />
              <span style={{ color: "hsl(211 100% 50%)" }}>Health Backbone</span>
            </h1>

            <p className="text-[16px] text-muted-foreground max-w-[560px] leading-relaxed">
              Connecting <strong className="text-foreground font-semibold">450+ hospitals</strong> and{" "}
              <strong className="text-foreground font-semibold">34 million citizen records</strong> with
              AI-powered clinical decision support — every event → AI → decision → action.
            </p>
          </div>

          {/* ─── Role Cards Row 1 ─── */}
          <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.12em] mb-3">Clinical Portals</p>
          <div className="grid grid-cols-4 gap-3.5 mb-3.5">
            <RoleCard
              href="/emergency"
              icon={ShieldAlert}
              label="Emergency Response"
              description="Instant life-critical patient data for first responders — blood type, allergies, medications in under 1 second."
              accent="#dc2626"
              accentBg="rgba(220,38,38,0.08)"
              tag="First Responders"
            />
            <RoleCard
              href="/doctor"
              icon={HeartPulse}
              label="Physician Portal"
              description="Complete patient history, AI decision engine, drug interaction checking, risk scoring, and e-prescribing."
              accent="hsl(211 100% 50%)"
              accentBg="rgba(0,122,255,0.08)"
              tag="Clinical Staff"
            />
            <RoleCard
              href="/citizen"
              icon={User}
              label="Citizen Portal"
              description="Secure access to personal health records, prescriptions, lab results, and Digital Twin 12-month forecast."
              accent="#d97706"
              accentBg="rgba(217,119,6,0.08)"
              tag="Citizens"
            />
            <RoleCard
              href="/admin"
              icon={Building2}
              label="Ministry Analytics"
              description="Population health intelligence, national AI engine panel, epidemic radar, and policy decision support."
              accent="#059669"
              accentBg="rgba(5,150,105,0.08)"
              tag="Ministry Officials"
            />
          </div>

          {/* ─── Role Cards Row 2 ─── */}
          <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.12em] mb-3 mt-2">Operational Portals</p>
          <div className="grid grid-cols-3 gap-3.5 mb-3.5">
            <RoleCard
              href="/lab"
              icon={FlaskConical}
              label="Lab Portal"
              description="Upload lab results and receive instant AI interpretation — clinical flags, risk impact, and trend analysis for every test."
              accent="#0d9488"
              accentBg="rgba(13,148,136,0.08)"
              tag="Lab Technicians"
            />
            <RoleCard
              href="/pharmacy"
              icon={Pill}
              label="Pharmacy Portal"
              description="Dispense prescriptions with AI drug safety checks, allergy conflict detection, and real-time insurance verification."
              accent="#9333ea"
              accentBg="rgba(147,51,234,0.08)"
              tag="Pharmacists"
            />
            <RoleCard
              href="/hospital"
              icon={BedDouble}
              label="Hospital Operations"
              description="Live bed occupancy across all wards, AI-prioritized patient queue, staff allocation, and capacity planning insights."
              accent="#2563eb"
              accentBg="rgba(37,99,235,0.08)"
              tag="Hospital Managers"
            />
          </div>

          {/* ─── Role Cards Row 3 ─── */}
          <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.12em] mb-3 mt-2">Intelligence & Support Portals</p>
          <div className="grid grid-cols-5 gap-3 mb-8">
            <RoleCard
              href="/insurance"
              icon={Shield}
              label="Insurance Portal"
              description="AI-powered claims management, fraud detection, risk-based premium pricing, and policy analytics."
              accent="#7c3aed"
              accentBg="rgba(124,58,237,0.08)"
              tag="Insurers"
            />
            <RoleCard
              href="/ai-control"
              icon={Brain}
              label="AI Control Center"
              description="Monitor all 9 AI engines — confidence scores, model drift, latency, retraining status, and system health."
              accent="#6d28d9"
              accentBg="rgba(109,40,217,0.08)"
              tag="AI Engineers"
            />
            <RoleCard
              href="/research"
              icon={FlaskConical}
              label="Research Portal"
              description="Anonymized population analytics, disease prevalence, lab abnormality rates, and AI-detected clinical insights."
              accent="#0f766e"
              accentBg="rgba(15,118,110,0.08)"
              tag="Researchers"
            />
            <RoleCard
              href="/family"
              icon={Users}
              label="Family Health Portal"
              description="Map hereditary disease risks across families, coordinate screenings, and track genetic risk inheritance patterns."
              accent="#be185d"
              accentBg="rgba(190,24,93,0.08)"
              tag="Care Coordinators"
            />
            <RoleCard
              href="/supply-chain"
              icon={Package}
              label="Supply Chain"
              description="Real-time drug inventory tracking, AI shortage prediction, automated reorder alerts, and distribution management."
              accent="#c2410c"
              accentBg="rgba(194,65,12,0.08)"
              tag="Logistics"
            />
          </div>

          {/* ─── Stats Row ─── */}
          <div
            className="grid grid-cols-4 rounded-[20px] overflow-hidden mb-7"
            style={{
              background: "white",
              boxShadow: "0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)",
              border: "1px solid rgba(0,0,0,0.05)",
            }}
          >
            {[
              { icon: User,      value: "34.2M+",  label: "Registered Citizens" },
              { icon: Building2, value: "450+",    label: "Connected Hospitals" },
              { icon: Cpu,       value: "99.99%",  label: "System Uptime SLA" },
              { icon: Brain,     value: "9",       label: "Active AI Engines" },
            ].map(({ icon: Icon, value, label }, i) => (
              <div
                key={label}
                className="flex flex-col items-center justify-center py-7 text-center"
                style={{ borderRight: i < 3 ? "1px solid rgba(0,0,0,0.06)" : "none" }}
              >
                <div
                  className="w-9 h-9 rounded-[12px] flex items-center justify-center mb-3"
                  style={{ background: "rgba(0,122,255,0.08)" }}
                >
                  <Icon className="w-4.5 h-4.5" style={{ color: "hsl(211 100% 50%)" }} />
                </div>
                <p className="text-[26px] font-bold text-foreground tabular-nums leading-none mb-1">{value}</p>
                <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          {/* ─── AI Feature Pills ─── */}
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">Powered by</p>
            {[
              { icon: Brain, label: "AI Decision Engine" },
              { icon: Zap, label: "Digital Twin Forecasting" },
              { icon: Activity, label: "Drug Interaction AI" },
              { icon: Shield, label: "Clinical Decision Support" },
              { icon: Cpu, label: "Real-time Analytics" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-1.5 text-[12px] font-medium text-foreground bg-white border px-3 py-1.5 rounded-full"
                style={{ borderColor: "rgba(0,0,0,0.08)", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
              >
                <Icon className="w-3.5 h-3.5 text-primary" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Footer ─── */}
      <footer
        className="px-10 py-4 flex items-center justify-between"
        style={{ borderTop: "1px solid rgba(0,0,0,0.06)", background: "rgba(255,255,255,0.7)" }}
      >
        <p className="text-[11px] text-muted-foreground">© 2026 Ministry of Health — Kingdom of Saudi Arabia</p>
        <p className="text-[11px] text-muted-foreground font-mono">SANAD v3.0 · AI-FIRST · RESTRICTED</p>
      </footer>
    </div>
  );
}

function RoleCard({ href, icon: Icon, label, description, accent, accentBg, tag }: {
  href: string;
  icon: React.ElementType;
  label: string;
  description: string;
  accent: string;
  accentBg: string;
  tag: string;
}) {
  return (
    <Link href={href}>
      <div
        className="group flex flex-col h-full p-5 cursor-pointer transition-all duration-200 rounded-[20px]"
        style={{
          background: "white",
          boxShadow: "0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)",
          border: "1px solid rgba(0,0,0,0.05)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)";
        }}
      >
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-10 h-10 rounded-[13px] flex items-center justify-center"
            style={{ background: accentBg }}
          >
            <Icon className="w-5 h-5" style={{ color: accent }} />
          </div>
          <span
            className="text-[10px] font-semibold rounded-full px-2.5 py-1"
            style={{ background: accentBg, color: accent }}
          >
            {tag}
          </span>
        </div>

        <h3 className="text-[14px] font-bold text-foreground mb-1.5 leading-tight">{label}</h3>
        <p className="text-[12px] text-muted-foreground leading-relaxed flex-1">{description}</p>

        <div
          className="mt-4 flex items-center gap-1 text-[12px] font-semibold transition-all duration-150"
          style={{ color: accent }}
        >
          Access Portal
          <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </div>
      </div>
    </Link>
  );
}
