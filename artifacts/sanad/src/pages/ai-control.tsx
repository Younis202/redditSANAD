import React, { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/layout";
import { Card, CardHeader, CardTitle, CardBody, Badge } from "@/components/shared";
import {
  Brain, Activity, AlertTriangle, CheckCircle2, Zap, TrendingUp,
  RefreshCw, RotateCcw, Shield, Cpu, Database, Clock, Settings, BarChart2,
  Layers, Eye, AlertCircle, GitBranch, ChevronRight, Network, Radio,
  ArrowRight, Users, FlaskConical, Pill, Truck, HeartPulse, FileSearch,
  Building2, ShieldCheck, Stethoscope
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, AreaChart, Area, Legend
} from "recharts";

async function fetchMetrics() {
  const res = await fetch("/api/ai-control/metrics");
  if (!res.ok) throw new Error("Failed");
  return res.json();
}
async function fetchDrift() {
  const res = await fetch("/api/ai-control/drift-analysis");
  if (!res.ok) throw new Error("Failed");
  return res.json();
}
async function fetchRetrainingJobs() {
  const res = await fetch("/api/ai-control/retraining/jobs");
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string; borderColor: string; badge: any; dot: string }> = {
  operational: { bg: "bg-secondary", text: "text-emerald-700", border: "", borderColor: "#22c55e", badge: "success" as const, dot: "bg-emerald-500" },
  degraded: { bg: "bg-secondary", text: "text-amber-700", border: "", borderColor: "#f59e0b", badge: "warning" as const, dot: "bg-amber-500 animate-pulse" },
  drift_detected: { bg: "bg-secondary", text: "text-red-700", border: "", borderColor: "#ef4444", badge: "destructive" as const, dot: "bg-red-500 animate-pulse" },
  monitoring: { bg: "bg-secondary", text: "text-sky-700", border: "", borderColor: "#0ea5e9", badge: "info" as const, dot: "bg-sky-500" },
  stable: { bg: "bg-secondary", text: "text-emerald-700", border: "", borderColor: "#22c55e", badge: "success" as const, dot: "bg-emerald-500" },
  needs_retraining: { bg: "bg-secondary", text: "text-red-700", border: "", borderColor: "#ef4444", badge: "destructive" as const, dot: "bg-red-500 animate-pulse" },
};

type ViewTab = "overview" | "engines" | "drift" | "retraining" | "decisions" | "fabric" | "stream";

const CASCADE_CHAIN = [
  { step: 1, portal: "Lab Portal", icon: FlaskConical, action: "RESULT_CRITICAL", badge: "destructive" as const, detail: "HbA1c = 9.2% received for Patient 1000000023 — Critical threshold exceeded (target <7.0%). Creatinine 3.1 mg/dL (Stage 3 CKD flag).", cascade: "→ Triggers: Risk Engine (immediate) · Doctor Portal alert (urgent) · Insurance pre-auth review", latency: "0 ms", color: "bg-rose-600" },
  { step: 2, portal: "AI Risk Engine", icon: Brain, action: "RISK_SCORED", badge: "purple" as const, detail: "Patient risk score updated: 62 → 78/100 (+16 pts). Trajectory: WORSENING. LACE+ readmission score: 14/19. Diabetes complication probability: 84%.", cascade: "→ Triggers: Doctor alert · Insurance pre-auth · Research data capture · Supply Chain demand signal", latency: "12 ms", color: "bg-purple-600" },
  { step: 3, portal: "Doctor Portal", icon: Stethoscope, action: "ALERT_DISPATCHED", badge: "info" as const, detail: "Priority alert dispatched to Dr. Reem Al-Ghamdi (Endocrinology). AI recommendation: Intensify insulin regimen + start SGLT2i + nephrology referral.", cascade: "→ AI Copilot suggestion: Switch to Insulin Glargine 300U + Empagliflozin 10mg", latency: "45 ms", color: "bg-blue-600" },
  { step: 4, portal: "Insurance Portal", icon: ShieldCheck, action: "PRE_AUTH_AUTO", badge: "success" as const, detail: "Pre-authorization auto-review triggered for: Insulin Glargine 300U + Empagliflozin 10mg. AI clinical necessity score: 94/100. ADA guideline alignment: 98%.", cascade: "→ Decision: AUTO-APPROVED in 2.8s · Coverage: 80% · Patient copay: SAR 85", latency: "89 ms", color: "bg-emerald-600" },
  { step: 5, portal: "Supply Chain", icon: Truck, action: "DEMAND_SIGNAL", badge: "warning" as const, detail: "Insulin Glargine 300U demand +1 unit logged. Al-Riyadh hub stock check: 2,100 units (LOW — reorder threshold 3,000). Empagliflozin: SUFFICIENT (18,400 units).", cascade: "→ Procurement alert raised · Emergency PO triggered: +500 units Insulin · ETA: 3 days", latency: "134 ms", color: "bg-amber-600" },
  { step: 6, portal: "Family Portal", icon: Users, action: "GENETIC_CASCADE", badge: "info" as const, detail: "Genetic risk cascade triggered. 2 registered family members flagged: Son (age 28) — DM Type 2 predisposition 73%. Daughter (age 24) — predisposition 68%.", cascade: "→ Family screening letters sent · Annual HbA1c + glucose tolerance test recommended", latency: "189 ms", color: "bg-sky-600" },
  { step: 7, portal: "Research Portal", icon: FileSearch, action: "DATA_CAPTURED", badge: "purple" as const, detail: "Patient data anonymized + captured for HbA1c Variability-CKD Study NCT-SA-2025-0447 (n=18,421 → 18,422). IRB-compliant. PDPL Article 12 compliant.", cascade: "→ Hypothesis confidence: 94.3% → 94.4% · Study statistical power updated", latency: "234 ms", color: "bg-violet-600" },
];

const MATRIX_PORTALS = ["Doctor", "Lab", "Insurance", "Supply", "Family", "Research", "Admin", "Emergency"];
const MATRIX_DATA = [
  [0,3,2,1,2,1,1,3],
  [3,0,2,1,2,3,2,1],
  [1,0,0,2,0,0,3,1],
  [1,0,0,0,0,0,3,2],
  [2,1,0,0,0,2,1,0],
  [3,1,0,0,1,0,2,0],
  [1,1,1,1,0,1,0,1],
  [3,2,2,2,1,0,2,0],
];

const PORTAL_CARDS = [
  { name: "Doctor Portal", icon: Stethoscope, bg: "bg-secondary", border: "", borderColor: "#007AFF", iconBg: "bg-primary/10", iconColor: "text-blue-600", sends: "Lab · Insurance · Supply · Research", receives: "Lab · Risk Engine · Insurance", events: "12,400", badge: "info" as const },
  { name: "Lab Portal", icon: FlaskConical, bg: "bg-secondary", border: "", borderColor: "#f43f5e", iconBg: "bg-primary/10", iconColor: "text-rose-600", sends: "Doctor · Risk Engine · Research · Family", receives: "Doctor · Admin", events: "34,800", badge: "destructive" as const },
  { name: "Insurance Portal", icon: ShieldCheck, bg: "bg-secondary", border: "", borderColor: "#22c55e", iconBg: "bg-primary/10", iconColor: "text-emerald-600", sends: "Doctor · Admin · Supply", receives: "Doctor · Lab · Emergency", events: "8,200", badge: "success" as const },
  { name: "Supply Chain", icon: Truck, bg: "bg-secondary", border: "", borderColor: "#f59e0b", iconBg: "bg-primary/10", iconColor: "text-amber-600", sends: "Doctor · Admin · Hospital", receives: "Doctor · Lab · Emergency", events: "5,100", badge: "warning" as const },
  { name: "Family Portal", icon: Users, bg: "bg-secondary", border: "", borderColor: "#0ea5e9", iconBg: "bg-primary/10", iconColor: "text-sky-600", sends: "Doctor · Research · Admin", receives: "Doctor · Risk Engine · Lab", events: "3,400", badge: "info" as const },
  { name: "Research Portal", icon: FileSearch, bg: "bg-secondary", border: "", borderColor: "#8b5cf6", iconBg: "bg-primary/10", iconColor: "text-violet-600", sends: "Doctor · Admin", receives: "Doctor · Lab · Family", events: "9,200", badge: "purple" as const },
  { name: "Admin / Ministry", icon: Building2, bg: "bg-secondary", border: "", borderColor: "#64748b", iconBg: "bg-primary/10", iconColor: "text-slate-600", sends: "Doctor · Insurance · Supply · Research", receives: "ALL portals", events: "2,800", badge: "outline" as const },
  { name: "Emergency Portal", icon: HeartPulse, bg: "bg-secondary", border: "", borderColor: "#ef4444", iconBg: "bg-primary/10", iconColor: "text-red-600", sends: "Doctor · Insurance · Admin · Supply", receives: "Doctor · Lab · Admin", events: "6,700", badge: "destructive" as const },
];

const STREAM_SEED: Array<{ ms: number; portal: string; portalColor: string; engine: string; patient: string; action: string; outcome: string; cascades: number; badge: "destructive"|"warning"|"success"|"info"|"purple"|"outline" }> = [
  { ms: 0, portal: "DOCTOR", portalColor: "bg-blue-600", engine: "Risk Engine", patient: "1000000023", action: "HbA1c 9.2% critical", outcome: "Alert → Dr. Reem Al-Ghamdi", cascades: 4, badge: "destructive" },
  { ms: 2800, portal: "INSURANCE", portalColor: "bg-emerald-600", engine: "Pre-Auth Engine", patient: "1000000004", action: "Insulin Glargine 300U request", outcome: "AUTO-APPROVED · SAR 0 copay", cascades: 1, badge: "success" },
  { ms: 5600, portal: "LAB", portalColor: "bg-rose-600", engine: "Anomaly Detector", patient: "1000000010", action: "Creatinine 3.8 → CRITICAL", outcome: "Nephrology alert dispatched", cascades: 3, badge: "destructive" },
  { ms: 8400, portal: "SUPPLY", portalColor: "bg-amber-600", engine: "Demand Forecast", patient: "System-wide", action: "Insulin stock 2,100u (LOW)", outcome: "PO raised +500u · ETA 3d", cascades: 0, badge: "warning" },
  { ms: 11200, portal: "FAMILY", portalColor: "bg-sky-600", engine: "Genetic Risk", patient: "1000000001", action: "DM Type 2 genetic flag", outcome: "2 family members screened", cascades: 2, badge: "info" },
  { ms: 14000, portal: "RESEARCH", portalColor: "bg-violet-600", engine: "Data Capture", patient: "1000000023", action: "HbA1c-CKD study NCT-SA-2025", outcome: "n=18,422 · Hypothesis +0.1%", cascades: 0, badge: "purple" },
  { ms: 16800, portal: "EMERGENCY", portalColor: "bg-red-600", engine: "Triage Engine", patient: "1000000005", action: "Chest pain · ECG STEMI pattern", outcome: "CATH LAB ACTIVATION — 4 min", cascades: 3, badge: "destructive" },
  { ms: 19600, portal: "DOCTOR", portalColor: "bg-blue-600", engine: "Drug Interaction", patient: "1000000003", action: "Warfarin + Amoxicillin prescribed", outcome: "INTERACTION BLOCKED · Alt given", cascades: 1, badge: "warning" },
  { ms: 22400, portal: "INSURANCE", portalColor: "bg-emerald-600", engine: "Fraud Detection", patient: "1000000015", action: "Duplicate MRI request (7 days)", outcome: "FLAGGED · Sent to audit", cascades: 0, badge: "warning" },
  { ms: 25200, portal: "LAB", portalColor: "bg-rose-600", engine: "Trend Analysis", patient: "1000000001", action: "HbA1c improving: 9.1→7.8→7.2", outcome: "Positive trajectory · Risk −18pts", cascades: 2, badge: "success" },
];

const STREAM_EVENTS_POOL = [
  { portal: "DOCTOR", portalColor: "bg-blue-600", engine: "Risk Engine", patient: "100000002X", action: "eGFR <30 — CKD Stage 4", outcome: "Nephrology urgent referral", cascades: 3, badge: "destructive" as const },
  { portal: "SUPPLY", portalColor: "bg-amber-600", engine: "Seasonal Planner", patient: "System-wide", action: "Ramadan D-14 surge forecast", outcome: "Insulin orders +42% approved", cascades: 0, badge: "warning" as const },
  { portal: "FAMILY", portalColor: "bg-sky-600", engine: "Cascade Engine", patient: "100000003X", action: "BRCA1 variant detected", outcome: "3 family members flagged", cascades: 3, badge: "info" as const },
  { portal: "RESEARCH", portalColor: "bg-violet-600", engine: "Hypothesis Engine", patient: "Population", action: "New correlation: HTN + CKD n=24k", outcome: "Hypothesis #8 auto-generated", cascades: 0, badge: "purple" as const },
  { portal: "INSURANCE", portalColor: "bg-emerald-600", engine: "Pre-Auth Engine", patient: "100000004X", action: "MRI lumbar spine L4-L5", outcome: "AUTO-APPROVED · SAR 1,200", cascades: 1, badge: "success" as const },
  { portal: "EMERGENCY", portalColor: "bg-red-600", engine: "Sepsis Detector", patient: "100000005X", action: "SOFA score 8 — severe sepsis", outcome: "ICU transfer ordered · Abx started", cascades: 4, badge: "destructive" as const },
  { portal: "LAB", portalColor: "bg-rose-600", engine: "Anomaly Detector", patient: "100000006X", action: "Troponin I 2.8 ng/mL (↑×14)", outcome: "STEMI equivalent alert fired", cascades: 3, badge: "destructive" as const },
  { portal: "ADMIN", portalColor: "bg-gray-600", engine: "Policy Engine", patient: "National", action: "Diabetes prevalence >22% threshold", outcome: "MOH policy brief auto-drafted", cascades: 0, badge: "info" as const },
];

export default function AIControlCenter() {
  const [activeTab, setActiveTab] = useState<ViewTab>("overview");
  const [retrainingTarget, setRetrainingTarget] = useState<string | null>(null);
  const [retrainResult, setRetrainResult] = useState<Record<string, any>>({});
  const [streamEvents, setStreamEvents] = useState<typeof STREAM_SEED>([...STREAM_SEED]);
  const streamPoolRef = useRef(0);
  useEffect(() => {
    const id = setInterval(() => {
      const ev = STREAM_EVENTS_POOL[streamPoolRef.current % STREAM_EVENTS_POOL.length]!;
      streamPoolRef.current++;
      setStreamEvents(prev => [{ ...ev, ms: Date.now() }, ...prev].slice(0, 35));
    }, 2800);
    return () => clearInterval(id);
  }, []);

  const qc = useQueryClient();

  const { data: metrics, isLoading: loadingMetrics } = useQuery({ queryKey: ["ai-metrics"], queryFn: fetchMetrics, refetchInterval: 30000 });
  const { data: drift, isLoading: loadingDrift } = useQuery({ queryKey: ["ai-drift"], queryFn: fetchDrift, refetchInterval: 30000 });
  const { data: jobs } = useQuery({ queryKey: ["retraining-jobs"], queryFn: fetchRetrainingJobs, refetchInterval: 5000 });

  const retrainMutation = useMutation({
    mutationFn: async (engineName: string) => {
      const res = await fetch(`/api/ai-control/engines/${encodeURIComponent(engineName)}/retrain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triggeredBy: "Dr. Khalid Al-Mansouri — AI Control Center" }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (result, engineName) => {
      setRetrainResult(prev => ({ ...prev, [engineName]: result }));
      setRetrainingTarget(null);
      qc.invalidateQueries({ queryKey: ["retraining-jobs"] });
    },
  });

  const isLoading = loadingMetrics || loadingDrift;

  if (isLoading) {
    return (
      <Layout role="ai-control">
        <div className="flex items-center justify-center gap-3 py-20 text-muted-foreground">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-rose-500" />
          <span className="text-sm font-medium">Connecting to AI Control Bus...</span>
        </div>
      </Layout>
    );
  }

  const TABS: { id: ViewTab; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: "System Overview", icon: Layers },
    { id: "engines", label: "Engine Monitor", icon: Cpu },
    { id: "drift", label: "Drift Detection", icon: GitBranch },
    { id: "retraining", label: "Retraining Panel", icon: RotateCcw },
    { id: "decisions", label: "Decision Analysis", icon: BarChart2 },
    { id: "fabric", label: "Neural Fabric", icon: Network },
    { id: "stream", label: "Live Intelligence", icon: Radio },
  ];

  const driftEngines = drift?.engines ?? [];
  const driftDetected = driftEngines.filter((e: any) => e.status === "drift_detected");

  return (
    <Layout role="ai-control">
      {/* Priority Strip */}
      {driftDetected.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-red-600 text-white rounded-2xl mb-5">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <p className="text-xs font-bold uppercase tracking-widest">
            DRIFT DETECTED — {driftDetected.length} engine{driftDetected.length > 1 ? "s" : ""} require retraining:{" "}
            {driftDetected.map((e: any) => e.engine).join(" · ")}
          </p>
          <button
            onClick={() => setActiveTab("drift")}
            className="ml-auto text-[11px] font-bold bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors"
          >
            View Drift Analysis →
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          AI CONTROL COMMAND HEADER
      ══════════════════════════════════════════════════ */}
      <div className="rounded-3xl overflow-hidden mb-6"
        style={{ background: "linear-gradient(135deg, #06080f 0%, #0e0b1e 50%, #080610 100%)", boxShadow: "0 0 60px rgba(79,70,229,0.10)" }}>
        <div className="h-1" style={{ background: "linear-gradient(90deg, #1e1b4b, #4f46e5, #a855f7, #e11d48, #4f46e5, #1e1b4b)" }} />

        <div className="px-6 py-5">
          {/* Row 1: Identity + Status */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 relative"
                style={{ background: "rgba(79,70,229,0.22)", border: "1px solid rgba(79,70,229,0.35)" }}>
                <Brain className="w-6 h-6 text-indigo-400" />
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#06080f]" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white leading-tight">AI Governance & Control</h1>
                <p className="text-[11px] text-white/40 mt-0.5">9-engine monitor · Drift detection · Retraining orchestration · Decision audit trail</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                style={{ background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.20)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-black text-emerald-300">
                  {metrics?.engines?.filter((e: any) => e.status === "operational").length ?? "—"} / {metrics?.engines?.length ?? 9} Operational
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <span className="font-mono text-[10px] text-white/30">Uptime {metrics?.systemHealth?.uptime ?? "99.99%"}</span>
              </div>
            </div>
          </div>

          {/* Row 2: KPI strip */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            {[
              {
                label: "Model Confidence", value: `${metrics?.avgConfidence ?? 97}%`,
                sub: metrics?.modelStatus === "optimal" ? "Optimal performance" : metrics?.modelStatus === "needs_retraining" ? "Retraining required" : "Stable",
                icon: Brain, accent: "#a855f7", glow: "rgba(168,85,247,0.20)",
              },
              {
                label: "Drift Risk", value: `${metrics?.driftRisk ?? 0}%`,
                sub: `${metrics?.lowConfidenceCount ?? 0} low-confidence decisions`,
                icon: AlertCircle, accent: metrics?.driftRisk > 10 ? "#ef4444" : "#22c55e", glow: metrics?.driftRisk > 10 ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.10)",
              },
              {
                label: "AI Decisions", value: (metrics?.totalDecisions ?? 0).toLocaleString(),
                sub: `${metrics?.decisionsLast24h ?? 0} in last 24h`,
                icon: Zap, accent: "#4f46e5", glow: "rgba(79,70,229,0.15)",
              },
              {
                label: "Audit Records", value: (metrics?.auditRecords ?? 0).toLocaleString(),
                sub: "Tamper-evident · Immutable",
                icon: Shield, accent: "#0ea5e9", glow: "rgba(14,165,233,0.15)",
              },
            ].map((kpi, i) => {
              const Icon = kpi.icon;
              return (
                <div key={i} className="rounded-2xl px-4 py-3.5"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", boxShadow: `inset 0 0 30px ${kpi.glow}` }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: kpi.accent }} />
                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">{kpi.label}</p>
                  </div>
                  <p className="text-2xl font-black text-white tabular-nums">{kpi.value}</p>
                  <p className="text-[10px] text-white/35 mt-0.5">{kpi.sub}</p>
                </div>
              );
            })}
          </div>

          {/* Row 3: Tab bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className="relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap shrink-0"
                  style={{
                    background: isActive ? "rgba(79,70,229,0.35)" : "rgba(255,255,255,0.04)",
                    border:     isActive ? "1px solid rgba(79,70,229,0.50)" : "1px solid rgba(255,255,255,0.07)",
                    color:      isActive ? "white" : "rgba(255,255,255,0.35)",
                    boxShadow:  isActive ? "0 0 16px rgba(79,70,229,0.25)" : "none",
                  }}>
                  <Icon className="w-3 h-3" />
                  {tab.label}
                  {tab.id === "drift" && driftDetected.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center border border-[#06080f]">
                      {driftDetected.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── OVERVIEW ─── */}
      {activeTab === "overview" && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <Card className="col-span-1">
              <CardHeader><Cpu className="w-4 h-4 text-primary" /><CardTitle>System Health</CardTitle></CardHeader>
              <CardBody className="space-y-3">
                {[
                  { label: "CPU Usage", value: metrics?.systemHealth?.cpu, unit: "%", color: "bg-blue-500" },
                  { label: "Memory Usage", value: metrics?.systemHealth?.memory, unit: "%", color: "bg-violet-500" },
                  { label: "DB Connections", value: metrics?.systemHealth?.dbConnections, unit: " active", color: "bg-sky-500" },
                  { label: "Event Bus Lag", value: metrics?.systemHealth?.eventBusLag, unit: "ms", color: "bg-emerald-500" },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                      <span className="text-xs font-bold text-foreground">{item.value}{item.unit}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5">
                      <div className={`h-full rounded-full ${item.color}`} style={{ width: `${Math.min(Number(item.value) || 0, 100)}%` }} />
                    </div>
                  </div>
                ))}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {[
                    { label: "Immediate", value: metrics?.urgencyBreakdown?.immediate, color: "text-red-600", borderColor: "#ef4444" },
                    { label: "Urgent", value: metrics?.urgencyBreakdown?.urgent, color: "text-amber-600", borderColor: "#f59e0b" },
                    { label: "Soon", value: metrics?.urgencyBreakdown?.soon, color: "text-sky-600", borderColor: "#0ea5e9" },
                    { label: "Routine", value: metrics?.urgencyBreakdown?.routine, color: "text-emerald-600", borderColor: "#22c55e" },
                  ].map((u, i) => (
                    <div key={i} className="bg-secondary rounded-xl px-3 py-2 text-center" style={{ borderLeft: `3px solid ${u.borderColor}` }}>
                      <p className={`text-lg font-bold ${u.color}`}>{u.value}</p>
                      <p className="text-[10px] text-muted-foreground">{u.label}</p>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            <Card className="col-span-2">
              <CardHeader>
                <Activity className="w-4 h-4 text-rose-600" />
                <CardTitle>Model Confidence History — 12 Months</CardTitle>
                <span className="ml-auto text-[11px] font-mono text-muted-foreground">Target: ≥85%</span>
              </CardHeader>
              <CardBody>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metrics?.confidenceHistory} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <defs>
                        <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#007AFF" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#007AFF" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11 }} />
                      <YAxis domain={[60, 100]} axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11 }} unit="%" />
                      <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: 12 }} formatter={(v: any) => [`${v}%`, "Confidence"]} />
                      <ReferenceLine y={85} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1.5} label={{ value: "85% Target", fill: "#ef4444", fontSize: 10 }} />
                      <Area type="monotone" dataKey="confidence" stroke="#007AFF" fill="url(#confGrad)" strokeWidth={2.5} dot={{ fill: "#007AFF", r: 3 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* ─── Population Learning Engine ─── */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="col-span-2">
              <CardHeader>
                <Brain className="w-4 h-4 text-rose-600" />
                <CardTitle>Population Learning Engine — Continuous Training Pipeline</CardTitle>
                <span className="ml-auto flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-secondary px-2 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active Training
                </span>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  {[
                    { label: "Training Samples Processed", value: "4.7M", sub: "+127K this week", pct: 87, color: "bg-rose-500" },
                    { label: "Model Accuracy Improvement", value: "+3.2%", sub: "vs. baseline Q3 2024", pct: 74, color: "bg-violet-500" },
                    { label: "Feature Coverage", value: "91%", sub: "Lab + Vitals + Demographics + Medications", pct: 91, color: "bg-blue-500" },
                    { label: "Bias Mitigation Score", value: "96.4", sub: "Across 13 regions · gender-balanced", pct: 96, color: "bg-emerald-500" },
                  ].map((item, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">{item.sub}</span>
                          <span className="text-sm font-bold text-foreground">{item.value}</span>
                        </div>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-1.5">
                        <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    { label: "Last Training Run", value: "6h ago", icon: Clock },
                    { label: "Next Auto-Retrain", value: "18h", icon: RotateCcw },
                    { label: "Training Epochs", value: "248", icon: Layers },
                  ].map((m, i) => (
                    <div key={i} className="px-3 py-2.5 bg-secondary rounded-xl text-center">
                      <m.icon className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-1" />
                      <p className="text-sm font-bold text-foreground">{m.value}</p>
                      <p className="text-[10px] text-muted-foreground">{m.label}</p>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <Database className="w-4 h-4 text-primary" />
                <CardTitle>Regional Data Contributions</CardTitle>
              </CardHeader>
              <CardBody className="space-y-2">
                {[
                  { region: "Riyadh", pct: 34, patients: "1.6M" },
                  { region: "Makkah", pct: 22, patients: "1.0M" },
                  { region: "Eastern", pct: 14, patients: "657K" },
                  { region: "Madinah", pct: 11, patients: "516K" },
                  { region: "Asir", pct: 7, patients: "328K" },
                  { region: "Others (8)", pct: 12, patients: "563K" },
                ].map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[11px] text-foreground w-16 shrink-0">{r.region}</span>
                    <div className="flex-1 bg-secondary rounded-full h-1.5">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${r.pct}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-foreground w-6 text-right">{r.pct}%</span>
                    <span className="text-[9px] text-muted-foreground w-10 text-right">{r.patients}</span>
                  </div>
                ))}
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-[10px] text-muted-foreground text-center">Total: <strong className="text-foreground">4.7M</strong> patient records in training corpus</p>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* ─── Event-Driven Architecture Monitor ─── */}
          <Card>
            <CardHeader>
              <Zap className="w-4 h-4 text-amber-500" />
              <CardTitle>Event-Driven Architecture — Real-Time Message Bus Monitor</CardTitle>
              <span className="ml-auto flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-secondary px-2 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> 9 Queues Active
              </span>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-4 gap-3 mb-5">
                {[
                  { label: "Events / sec", value: "12,847", sub: "↑ 3.2% vs. avg", color: "text-primary" },
                  { label: "Queue Depth", value: "183", sub: "Normal range < 500", color: "text-emerald-600" },
                  { label: "Processing Latency p95", value: "42ms", sub: "SLA target: <100ms", color: "text-emerald-600" },
                  { label: "Dead Letter Queue", value: "0", sub: "Zero failed events", color: "text-emerald-600" },
                ].map((m, i) => (
                  <div key={i} className="px-4 py-3 bg-secondary rounded-2xl">
                    <p className={`text-xl font-black tabular-nums ${m.color}`}>{m.value}</p>
                    <p className="text-xs font-bold text-foreground">{m.label}</p>
                    <p className="text-[10px] text-muted-foreground">{m.sub}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Active Event Queues — Message Throughput</p>
                  <div className="space-y-2">
                    {[
                      { queue: "clinical.risk.assessment", rate: "4,821 msg/s", latency: "18ms", depth: 42, pct: 84, color: "bg-blue-500" },
                      { queue: "lab.result.ingest", rate: "2,140 msg/s", latency: "8ms", depth: 17, pct: 70, color: "bg-emerald-500" },
                      { queue: "alert.critical.route", rate: "284 msg/s", latency: "3ms", depth: 5, pct: 55, color: "bg-red-500" },
                      { queue: "patient.prediction.run", rate: "1,203 msg/s", latency: "67ms", depth: 89, pct: 42, color: "bg-violet-500" },
                      { queue: "drug.interaction.check", rate: "987 msg/s", latency: "12ms", depth: 23, pct: 35, color: "bg-amber-500" },
                      { queue: "digital.twin.update", rate: "612 msg/s", latency: "94ms", depth: 7, pct: 28, color: "bg-rose-500" },
                    ].map((q, i) => (
                      <div key={i} className="flex items-center gap-3 px-3 py-2 bg-secondary rounded-xl">
                        <div className={`w-2 h-2 rounded-full ${q.color} shrink-0`} />
                        <code className="text-[10px] text-foreground flex-1 font-mono">{q.queue}</code>
                        <span className="text-[10px] font-bold text-foreground w-20 text-right">{q.rate}</span>
                        <span className="text-[10px] text-muted-foreground w-12 text-right">{q.latency}</span>
                        <div className="w-20 bg-background rounded-full h-1.5">
                          <div className={`h-full rounded-full ${q.color}`} style={{ width: `${q.pct}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground w-8 text-right">D:{q.depth}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Microservices Health Map</p>
                  <div className="space-y-2">
                    {[
                      { svc: "risk-engine-api", status: "healthy", rps: "4.2K", cpu: 38, mem: 52 },
                      { svc: "prediction-worker", status: "healthy", rps: "1.8K", cpu: 61, mem: 67 },
                      { svc: "alert-router", status: "healthy", rps: "840", cpu: 12, mem: 28 },
                      { svc: "xai-explainer", status: "healthy", rps: "1.1K", cpu: 44, mem: 55 },
                      { svc: "fhir-gateway", status: "healthy", rps: "6.7K", cpu: 29, mem: 41 },
                      { svc: "digital-twin-sim", status: "healthy", rps: "420", cpu: 73, mem: 81 },
                    ].map((s, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-xl">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        <code className="text-[10px] font-mono text-foreground flex-1 truncate">{s.svc}</code>
                        <span className="text-[9px] text-muted-foreground">{s.rps}/s</span>
                        <span className={`text-[9px] font-bold ${s.cpu > 65 ? "text-amber-600" : "text-emerald-600"}`}>{s.cpu}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 p-3 bg-secondary rounded-2xl text-center" style={{ borderLeft: "3px solid #22c55e" }}>
                    <p className="text-xs font-bold text-foreground">System Availability</p>
                    <p className="text-2xl font-black text-emerald-700">99.97%</p>
                    <p className="text-[10px] text-muted-foreground">SLA: 99.9% · 90-day uptime</p>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <Layers className="w-4 h-4 text-primary" />
              <CardTitle>9-Engine Quick Status</CardTitle>
              <Badge variant={driftDetected.length > 0 ? "destructive" : "success"}>
                {driftDetected.length > 0 ? `${driftDetected.length} Drift Alerts` : "All Engines Nominal"}
              </Badge>
            </CardHeader>
            <div className="divide-y divide-border">
              {metrics?.engines?.map((engine: any, i: number) => {
                const driftInfo = driftEngines.find((d: any) => d.engine === engine.name);
                const hasDrift = driftInfo?.status === "drift_detected";
                const statusCfg = STATUS_COLORS[hasDrift ? "drift_detected" : engine.status] ?? STATUS_COLORS.operational;
                return (
                  <div key={i} className="flex items-center gap-4 px-5 py-3.5"
                    style={hasDrift ? { borderLeft: "3px solid #ef4444" } : {}}>
                    <div className={`w-2 h-2 rounded-full ${statusCfg.dot} shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{engine.name}</p>
                      <p className="text-xs text-muted-foreground">{engine.version} · {engine.requests?.toLocaleString()} requests · avg {engine.avgLatencyMs}ms</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-secondary rounded-full h-1.5">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${engine.accuracy}%` }} />
                      </div>
                      <span className="text-xs font-bold text-foreground w-8">{engine.accuracy}%</span>
                      {driftInfo && (
                        <span className={`text-[10px] font-bold bg-secondary ${driftInfo.driftScore > 5 ? "text-red-600" : driftInfo.driftScore > 3 ? "text-amber-600" : "text-emerald-600"} px-2 py-0.5 rounded-full`}>
                          Drift: {driftInfo.driftScore}
                        </span>
                      )}
                      <Badge variant={statusCfg.badge} className="text-[9px] shrink-0">{hasDrift ? "Drift" : engine.status}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ─── ENGINE MONITOR ─── */}
      {activeTab === "engines" && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-4">
            {metrics?.engines?.map((engine: any, i: number) => {
              const driftInfo = driftEngines.find((d: any) => d.engine === engine.name);
              const hasDrift = driftInfo?.status === "drift_detected";
              const isMonitoring = driftInfo?.status === "monitoring";
              const statusCfg = STATUS_COLORS[hasDrift ? "drift_detected" : isMonitoring ? "monitoring" : engine.status] ?? STATUS_COLORS.operational;
              return (
                <Card key={i}>
                  <CardBody className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`w-2 h-2 rounded-full ${statusCfg.dot}`} />
                          <Badge variant={statusCfg.badge} className="text-[9px]">{hasDrift ? "Drift Detected" : isMonitoring ? "Monitoring" : engine.status}</Badge>
                        </div>
                        <p className="text-sm font-bold text-foreground">{engine.name}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{engine.version}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">{engine.accuracy}%</p>
                        <p className="text-[10px] text-muted-foreground">Accuracy</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-secondary px-2.5 py-2 rounded-xl text-center">
                        <p className="text-sm font-bold text-foreground">{engine.requests?.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">Requests</p>
                      </div>
                      <div className="bg-secondary px-2.5 py-2 rounded-xl text-center">
                        <p className="text-sm font-bold text-foreground">{engine.avgLatencyMs}ms</p>
                        <p className="text-[10px] text-muted-foreground">Avg Latency</p>
                      </div>
                    </div>
                    {driftInfo && (
                      <div className="bg-secondary rounded-xl px-3 py-2 mb-3"
                        style={statusCfg.borderColor ? { borderLeft: `3px solid ${statusCfg.borderColor}` } : {}}>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Drift Score</span>
                          <span className={`text-xs font-bold ${hasDrift ? "text-red-700" : "text-emerald-700"}`}>{driftInfo.driftScore} / {driftInfo.threshold}</span>
                        </div>
                        <div className="mt-1.5 w-full bg-white/60 rounded-full h-1.5">
                          <div className={`h-full rounded-full ${hasDrift ? "bg-red-500" : isMonitoring ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min((driftInfo.driftScore / driftInfo.threshold) * 100, 100)}%` }} />
                        </div>
                      </div>
                    )}
                    {hasDrift && (
                      <button
                        onClick={() => { setRetrainingTarget(engine.name); retrainMutation.mutate(engine.name); }}
                        disabled={retrainMutation.isPending}
                        className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        {retrainResult[engine.name] ? "Retraining Queued" : "Trigger Retraining"}
                      </button>
                    )}
                  </CardBody>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader><BarChart2 className="w-4 h-4 text-primary" /><CardTitle>Event Type Distribution</CardTitle></CardHeader>
            <CardBody>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics?.eventTypes?.slice(0, 10)} layout="vertical" margin={{ top: 0, right: 30, left: 170, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11 }} />
                    <YAxis dataKey="type" type="category" axisLine={false} tickLine={false} tick={{ fill: "#374151", fontSize: 10, fontWeight: 500 }} width={165} />
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: 12 }} />
                    <Bar dataKey="count" fill="#007AFF" radius={[0, 6, 6, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ─── DRIFT DETECTION ─── */}
      {activeTab === "drift" && (
        <div className="space-y-5">
          {driftDetected.length > 0 && (
            <div className="space-y-3">
              {driftDetected.map((engine: any, i: number) => (
                <div key={i} className="flex items-start gap-4 px-5 py-4 bg-secondary rounded-2xl" style={{ borderLeft: "3px solid #ef4444" }}>
                  <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground">DRIFT DETECTED: {engine.engine}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Drift score {engine.driftScore} exceeds threshold {engine.threshold} — Model predictions may be unreliable</p>
                  </div>
                  <button
                    onClick={() => { setRetrainingTarget(engine.engine); retrainMutation.mutate(engine.engine); }}
                    disabled={retrainMutation.isPending}
                    className="shrink-0 flex items-center gap-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-xl transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Retrain Now
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 px-4 py-3 bg-secondary rounded-2xl">
            <Brain className="w-4 h-4 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground">
              <span className="font-bold text-foreground">Drift Analysis</span> · {drift?.summary?.stable} stable · {drift?.summary?.driftDetected} drift detected · {drift?.summary?.monitoring} monitoring · Threshold: {driftEngines[0]?.threshold ?? 5.0}
            </p>
          </div>

          <Card>
            <CardHeader>
              <GitBranch className="w-4 h-4 text-rose-600" />
              <CardTitle>Drift Score by Engine</CardTitle>
              <span className="ml-auto font-mono text-[11px] text-muted-foreground">Alert threshold: 5.0</span>
            </CardHeader>
            <CardBody>
              <div className="space-y-2.5">
                {[...driftEngines].sort((a: any, b: any) => b.driftScore - a.driftScore).map((engine: any, i: number) => {
                  const pct = (engine.driftScore / 10) * 100;
                  const color = engine.driftScore > 5 ? "bg-red-500" : engine.driftScore > 3 ? "bg-amber-500" : "bg-emerald-500";
                  const textColor = engine.driftScore > 5 ? "text-red-700" : engine.driftScore > 3 ? "text-amber-700" : "text-emerald-700";
                  const bg = "bg-secondary";
                  const statusCfg = STATUS_COLORS[engine.status] ?? STATUS_COLORS.stable;
                  return (
                    <div key={i} className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl ${bg}`}>
                      <div className={`w-2 h-2 rounded-full ${statusCfg.dot} shrink-0`} />
                      <span className="text-xs font-medium text-foreground w-44 truncate shrink-0">{engine.engine}</span>
                      <div className="flex-1 bg-white/60 rounded-full h-2">
                        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={`text-xs font-bold w-8 text-right ${textColor}`}>{engine.driftScore}</span>
                      <Badge variant={statusCfg.badge} className="text-[9px] w-28 justify-center shrink-0">{engine.status.replace("_", " ")}</Badge>
                      {engine.driftScore > 5 && (
                        <button
                          onClick={() => { setRetrainingTarget(engine.engine); retrainMutation.mutate(engine.engine); }}
                          disabled={retrainMutation.isPending}
                          className="text-[10px] font-bold text-white bg-red-600 hover:bg-red-700 px-2.5 py-1 rounded-lg transition-colors shrink-0"
                        >
                          Retrain
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader><Eye className="w-4 h-4 text-primary" /><CardTitle>Drift Root Cause Analysis</CardTitle><Badge variant="info">AI Generated</Badge></CardHeader>
            <CardBody className="space-y-3">
              {[
                { engine: "Digital Twin Simulator", score: 6.8, cause: "Population diabetes prevalence increased 9% since last training — simulator underestimating complication trajectories", action: "Retrain with Q4 2025 population data and updated HbA1c progression rates" },
                { engine: "Behavioral AI", score: 7.2, cause: "Ramadan seasonal behavior patterns not captured in training data — medication adherence model degraded for observant patient cohort", action: "Augment training data with seasonal behavioral patterns; implement time-aware feature engineering" },
                { engine: "Policy AI", score: 4.1, cause: "MOH Circular 47/1445 introduced new screening protocols not reflected in current policy ruleset — minor policy drift", action: "Manual rule update + full retrain scheduled for March 2026 review cycle" },
              ].map((item, i) => (
                <div key={i} className="px-4 py-3.5 rounded-2xl bg-secondary"
                  style={item.score > 5 ? { borderLeft: "3px solid #ef4444" } : { borderLeft: "3px solid #f59e0b" }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-bold text-foreground">{item.engine}</p>
                    <span className={`text-xs font-bold ${item.score > 5 ? "text-red-600" : "text-amber-600"}`}>Score: {item.score}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2"><span className="font-semibold text-foreground">Root cause:</span> {item.cause}</p>
                  <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                    <ChevronRight className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                    <span><span className="font-semibold text-foreground">Action:</span> {item.action}</span>
                  </p>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      )}

      {/* ─── RETRAINING PANEL ─── */}
      {activeTab === "retraining" && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-4 p-4 bg-secondary rounded-2xl">
            <div className="text-center">
              <p className="text-xl font-bold text-foreground">{metrics?.systemHealth?.lastRetraining}</p>
              <p className="text-xs text-muted-foreground">Last Retraining</p>
            </div>
            <div className="text-center border-x border-border">
              <p className="text-xl font-bold text-foreground">{metrics?.systemHealth?.nextScheduledReview}</p>
              <p className="text-xs text-muted-foreground">Next Scheduled Review</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-foreground">{jobs?.jobs?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">Retraining Jobs This Session</p>
            </div>
          </div>

          <Card>
            <CardHeader><RotateCcw className="w-4 h-4 text-rose-600" /><CardTitle>Manual Retraining Triggers</CardTitle><Badge variant="warning">Privileged Action · Logged</Badge></CardHeader>
            <div className="divide-y divide-border">
              {metrics?.engines?.map((engine: any, i: number) => {
                const driftInfo = driftEngines.find((d: any) => d.engine === engine.name);
                const hasDrift = driftInfo?.status === "drift_detected";
                const jobResult = retrainResult[engine.name];
                const isMonitoring = driftInfo?.status === "monitoring";
                return (
                  <div key={i} className="flex items-center gap-4 px-5 py-4"
                    style={hasDrift ? { borderLeft: "3px solid #ef4444" } : {}}>
                    <div className={`w-2 h-2 rounded-full ${hasDrift ? "bg-red-500 animate-pulse" : isMonitoring ? "bg-amber-500" : "bg-emerald-500"} shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{engine.name}</p>
                      <p className="text-xs text-muted-foreground">{engine.version} · Accuracy: {engine.accuracy}% · Drift: {driftInfo?.driftScore ?? "—"}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {hasDrift && <Badge variant="destructive" className="text-[9px]">Drift Detected</Badge>}
                      {isMonitoring && <Badge variant="warning" className="text-[9px]">Monitoring</Badge>}
                      {jobResult ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Queued: {jobResult.jobId}
                        </div>
                      ) : (
                        <button
                          onClick={() => { setRetrainingTarget(engine.name); retrainMutation.mutate(engine.name); }}
                          disabled={retrainMutation.isPending}
                          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors ${
                            hasDrift ? "bg-red-600 hover:bg-red-700 text-white" : "bg-secondary border border-border text-muted-foreground hover:text-foreground hover:bg-black/[0.06]"
                          }`}
                        >
                          <RotateCcw className="w-3 h-3" />
                          {retrainingTarget === engine.name && retrainMutation.isPending ? "Queuing..." : "Trigger Retrain"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {jobs?.jobs?.length > 0 && (
            <Card>
              <CardHeader><Clock className="w-4 h-4 text-primary" /><CardTitle>Retraining Job History</CardTitle><Badge variant="outline">{jobs.jobs.length} jobs</Badge></CardHeader>
              <div className="divide-y divide-border">
                {jobs.jobs.map((job: any, i: number) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                    <div className={`w-2 h-2 rounded-full ${job.status === "completed" ? "bg-emerald-500" : job.status === "running" ? "bg-blue-500 animate-pulse" : "bg-amber-500"} shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground font-mono">{job.id}</p>
                      <p className="text-xs text-muted-foreground">{job.engine} · Started: {new Date(job.startedAt).toLocaleTimeString()} · By: {job.triggeredBy}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {job.status === "running" && (
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-secondary rounded-full h-1.5">
                            <div className="h-full rounded-full bg-blue-500" style={{ width: `${job.progress}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground">{job.progress}%</span>
                        </div>
                      )}
                      <Badge variant={job.status === "completed" ? "success" : job.status === "running" ? "info" : "warning"} className="text-[9px]">
                        {job.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ─── DECISION ANALYSIS ─── */}
      {activeTab === "decisions" && (
        <div className="space-y-5">
          <div className="grid grid-cols-12 gap-5">
            <Card className="col-span-6">
              <CardHeader><BarChart2 className="w-4 h-4 text-primary" /><CardTitle>Decision Urgency Breakdown</CardTitle></CardHeader>
              <CardBody>
                <div className="space-y-4">
                  {[
                    { urgency: "Immediate", value: metrics?.urgencyBreakdown?.immediate, color: "bg-red-500", text: "text-red-700" },
                    { urgency: "Urgent", value: metrics?.urgencyBreakdown?.urgent, color: "bg-amber-500", text: "text-amber-700" },
                    { urgency: "Soon", value: metrics?.urgencyBreakdown?.soon, color: "bg-sky-500", text: "text-sky-700" },
                    { urgency: "Routine", value: metrics?.urgencyBreakdown?.routine, color: "bg-emerald-500", text: "text-emerald-700" },
                  ].map((item, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-semibold ${item.text}`}>{item.urgency}</span>
                        <span className="text-xs font-bold text-foreground">{item.value?.toLocaleString()} ({metrics?.totalDecisions ? Math.round((item.value / metrics.totalDecisions) * 100) : 0}%)</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2.5">
                        <div className={`h-full rounded-full ${item.color}`} style={{ width: `${metrics?.totalDecisions ? (item.value / metrics.totalDecisions) * 100 : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            <Card className="col-span-6">
              <CardHeader><Shield className="w-4 h-4 text-primary" /><CardTitle>Risk Level Distribution</CardTitle></CardHeader>
              <CardBody className="space-y-3">
                {[
                  { level: "Critical Risk", value: metrics?.riskBreakdown?.critical, color: "bg-red-500", text: "text-red-700" },
                  { level: "High Risk", value: metrics?.riskBreakdown?.high, color: "bg-amber-500", text: "text-amber-700" },
                  { level: "Medium Risk", value: metrics?.riskBreakdown?.medium, color: "bg-sky-500", text: "text-sky-700" },
                  { level: "Low Risk", value: metrics?.riskBreakdown?.low, color: "bg-emerald-500", text: "text-emerald-700" },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-semibold ${item.text}`}>{item.level}</span>
                      <span className="text-xs font-bold text-foreground">{item.value?.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div className={`h-full rounded-full ${item.color}`} style={{ width: `${metrics?.totalDecisions ? (item.value / metrics.totalDecisions) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
                <div className="pt-3 border-t border-border grid grid-cols-2 gap-3">
                  <div className="bg-secondary px-3 py-2.5 rounded-xl text-center">
                    <p className="text-sm font-bold text-foreground">{metrics?.totalDecisions?.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">Total Decisions</p>
                  </div>
                  <div className="bg-secondary px-3 py-2.5 rounded-xl text-center" style={{ borderLeft: "3px solid #f59e0b" }}>
                    <p className="text-sm font-bold text-amber-700">{metrics?.lowConfidenceCount?.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">Low Confidence</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          <div className="px-5 py-3.5 bg-secondary rounded-2xl flex items-center gap-4">
            <Shield className="w-4 h-4 text-muted-foreground shrink-0" />
            <p className="flex-1 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Audit Status:</span> All AI decisions fully traceable · {metrics?.auditRecords?.toLocaleString()} audit records · Aligned with MOH AI Governance Framework 1445 · ISO/IEC 42001 AI Management compliance target 2026
            </p>
            <Badge variant="success">Audit Active</Badge>
          </div>
        </div>
      )}

      {/* ─── NEURAL FABRIC ─── */}
      {activeTab === "fabric" && (
        <div className="space-y-5">
          {/* Header banner */}
          <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-purple-600 to-rose-600 rounded-3xl text-white">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <Network className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-lg">SANAD Neural Fabric</p>
              <p className="text-sm text-white/80">Cross-portal AI intelligence map — a single lab result cascades through 7 portals and 9 AI engines in under 234ms</p>
            </div>
            <div className="flex items-center gap-2 bg-white/20 px-3 py-2 rounded-xl shrink-0">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-xs font-bold">LIVE</span>
            </div>
          </div>

          {/* Cascade Chain */}
          <Card>
            <CardHeader>
              <GitBranch className="w-4 h-4 text-primary" />
              <CardTitle>AI Cascade Intelligence Chain</CardTitle>
              <Badge variant="info">Real patient event — Patient 1000000023</Badge>
              <span className="ml-auto text-[10px] font-mono text-muted-foreground">Total cascade time: 234ms</span>
            </CardHeader>
            <CardBody>
              <p className="text-xs text-muted-foreground mb-5">Trigger event: <span className="font-bold text-foreground">HbA1c 9.2% received from Central Lab → cascades automatically through SANAD AI Fabric</span></p>
              <div className="space-y-0">
                {CASCADE_CHAIN.map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <div key={i} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-white shrink-0 ${step.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        {i < CASCADE_CHAIN.length - 1 && <div className="w-0.5 flex-1 bg-border my-1 min-h-[20px]" />}
                      </div>
                      <div className="pb-5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-bold text-foreground">{step.portal}</span>
                          <Badge variant={step.badge} className="text-[9px] uppercase">{step.action}</Badge>
                          <span className="ml-auto font-mono text-[10px] text-muted-foreground shrink-0">+{step.latency}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mb-2">{step.detail}</p>
                        <div className="flex items-start gap-2 px-3 py-2 bg-primary/5 rounded-xl">
                          <ArrowRight className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                          <p className="text-[10px] font-semibold text-primary">{step.cascade}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          {/* Cross-Portal Intelligence Matrix */}
          <Card>
            <CardHeader>
              <Layers className="w-4 h-4 text-primary" />
              <CardTitle>Cross-Portal Intelligence Matrix</CardTitle>
              <Badge variant="outline">8 portals · dependency strength</Badge>
            </CardHeader>
            <CardBody>
              <div className="overflow-x-auto">
                <table className="w-full text-center text-[10px]">
                  <thead>
                    <tr>
                      <th className="text-left text-muted-foreground font-semibold w-20 pb-2 text-[10px]">FROM ↓ / TO →</th>
                      {MATRIX_PORTALS.map(p => <th key={p} className="text-muted-foreground font-semibold pb-2 px-0.5 text-[10px] min-w-[50px]">{p}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {MATRIX_DATA.map((row, i) => (
                      <tr key={i}>
                        <td className="text-left font-bold text-foreground py-1.5 pr-2 text-[10px]">{MATRIX_PORTALS[i]}</td>
                        {row.map((cell, j) => (
                          <td key={j} className="py-1.5 px-0.5">
                            {i === j ? (
                              <span className="text-muted-foreground/20 text-[8px]">—</span>
                            ) : (
                              <span className={`inline-flex items-center justify-center w-7 h-7 rounded-xl text-[9px] font-bold bg-secondary ${
                                cell === 3 ? "text-red-700" :
                                cell === 2 ? "text-amber-700" :
                                cell === 1 ? "text-sky-700" :
                                "text-muted-foreground/30"
                              }`}>
                                {cell === 3 ? "HIGH" : cell === 2 ? "MED" : cell === 1 ? "LOW" : "—"}
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border flex-wrap">
                {[{ borderColor: "#ef4444", color: "text-red-700", l: "HIGH — strong dependency" }, { borderColor: "#f59e0b", color: "text-amber-700", l: "MED — moderate influence" }, { borderColor: "#0ea5e9", color: "text-sky-700", l: "LOW — weak signal" }, { borderColor: "", color: "text-muted-foreground", l: "No direct link" }].map((x, i) => (
                  <div key={i} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-bold bg-secondary ${x.color}`}
                    style={x.borderColor ? { borderLeft: `2px solid ${x.borderColor}` } : {}}>{x.l}</div>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Portal Ecosystem Cards */}
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Portal Ecosystem — Sends / Receives</p>
            <div className="grid grid-cols-4 gap-3">
              {PORTAL_CARDS.map((p, i) => {
                const Icon = p.icon;
                return (
                  <div key={i} className="rounded-2xl p-4 bg-secondary"
                    style={p.borderColor ? { borderLeft: `3px solid ${p.borderColor}` } : {}}>
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className={`w-8 h-8 rounded-xl ${p.iconBg} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-4 h-4 ${p.iconColor}`} />
                      </div>
                      <p className="text-xs font-bold text-foreground leading-tight">{p.name}</p>
                    </div>
                    <div className="space-y-1.5">
                      <div>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Sends data to</p>
                        <p className="text-[10px] font-semibold text-foreground">{p.sends}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Receives from</p>
                        <p className="text-[10px] font-semibold text-foreground">{p.receives}</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-current/10 flex items-center justify-between">
                      <Badge variant={p.badge} className="text-[9px]">{p.events} events/day</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── LIVE INTELLIGENCE STREAM ─── */}
      {activeTab === "stream" && (
        <div className="space-y-5">
          {/* Live KPIs */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-rose-600 rounded-3xl p-5 text-white text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-1">AI Events / min</p>
              <p className="text-4xl font-bold">847</p>
              <p className="text-[10px] text-white/60 mt-1">across 12 portals</p>
            </div>
            <div className="bg-secondary rounded-3xl p-5 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Portals Active Now</p>
              <p className="text-4xl font-bold text-foreground">12 / 12</p>
              <p className="text-[10px] text-emerald-600 mt-1 font-semibold">All systems operational</p>
            </div>
            <div className="bg-secondary rounded-3xl p-5 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Cascades / hour</p>
              <p className="text-4xl font-bold text-foreground">2,841</p>
              <p className="text-[10px] text-muted-foreground mt-1">cross-portal triggers</p>
            </div>
            <div className="bg-secondary rounded-3xl p-5 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Avg Decision Time</p>
              <p className="text-4xl font-bold text-foreground">2.8s</p>
              <p className="text-[10px] text-muted-foreground mt-1">vs. 3 days manual</p>
            </div>
          </div>

          {/* Cascade Flow Diagram */}
          <Card>
            <CardHeader>
              <Activity className="w-4 h-4 text-violet-600" />
              <CardTitle>AI Decision Cascade — Live Trace</CardTitle>
              <Badge variant="purple" className="text-[9px] ml-auto">SAMPLE TRACE · Patient 1000000023</Badge>
            </CardHeader>
            <CardBody>
              <p className="text-[10px] text-muted-foreground mb-4">HbA1c 9.2% lab result triggers a 7-step cross-portal AI cascade in under 250ms — zero human intervention required.</p>
              <div className="flex items-stretch gap-0 overflow-x-auto pb-2">
                {CASCADE_CHAIN.map((step, i) => (
                  <React.Fragment key={step.step}>
                    <div className="flex flex-col items-center shrink-0" style={{ minWidth: 120 }}>
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-2 text-white shrink-0 ${step.color}`}>
                        <step.icon className="w-4 h-4" />
                      </div>
                      <div className="text-center">
                        <p className="text-[8px] font-black text-foreground uppercase tracking-widest leading-tight">{step.portal.replace(" Portal", "")}</p>
                        <p className="text-[7px] font-mono text-muted-foreground mt-0.5">{step.latency}</p>
                        <Badge variant={step.badge} className="text-[7px] mt-1 px-1">{step.action.replace("_", " ")}</Badge>
                      </div>
                    </div>
                    {i < CASCADE_CHAIN.length - 1 && (
                      <div className="flex items-center shrink-0 px-1 mt-5">
                        <div className="w-8 h-px bg-border relative">
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0"
                            style={{ borderLeft: "6px solid var(--border)", borderTop: "3px solid transparent", borderBottom: "3px solid transparent" }} />
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
              <div className="mt-3 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-[10px] font-bold text-emerald-700">Total cascade latency: 234ms · 7 engines activated · 0 human interventions · 4 portals updated</p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <Radio className="w-4 h-4 text-rose-600" />
                <CardTitle>Live AI Intelligence Stream</CardTitle>
              </div>
              <Badge variant="destructive" className="text-[9px]">LIVE</Badge>
              <span className="ml-auto text-[10px] text-muted-foreground">{streamEvents.length} events captured · auto-updating every 2.8s</span>
            </CardHeader>
            <div className="divide-y divide-border">
              {streamEvents.map((ev, i) => (
                <div key={i} className={`flex items-start gap-3 px-5 py-3 transition-colors ${i === 0 ? "bg-primary/5 border-l-4 border-primary" : ""}`}>
                  <div className={`${ev.portalColor} text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md shrink-0 mt-0.5`}>{ev.portal}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-semibold text-muted-foreground">{ev.engine}</span>
                      <span className="text-[10px] text-muted-foreground">·</span>
                      <span className="font-mono text-[10px] font-bold text-foreground">Patient {ev.patient}</span>
                      <span className="text-[10px] text-muted-foreground">→</span>
                      <span className="text-[10px] font-semibold text-foreground">{ev.action}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{ev.outcome}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {ev.cascades > 0 && (
                      <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">{ev.cascades} cascades</span>
                    )}
                    <Badge variant={ev.badge} className="text-[9px]">{ev.badge === "success" ? "APPROVED" : ev.badge === "destructive" ? "CRITICAL" : ev.badge === "warning" ? "FLAGGED" : ev.badge === "purple" ? "DATA" : "INFO"}</Badge>
                    <span className="text-[9px] font-mono text-muted-foreground">{i === 0 ? "just now" : `${(i * 2.8).toFixed(0)}s ago`}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Portal Activity Heatmap */}
          <Card>
            <CardHeader>
              <Activity className="w-4 h-4 text-primary" />
              <CardTitle>Portal Activity — Last 60 Minutes</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                {[
                  { portal: "Lab Portal", events: 34800, pct: 100, color: "bg-rose-500" },
                  { portal: "Doctor Portal", events: 12400, pct: 36, color: "bg-blue-500" },
                  { portal: "Research Portal", events: 9200, pct: 26, color: "bg-violet-500" },
                  { portal: "Insurance Portal", events: 8200, pct: 24, color: "bg-emerald-500" },
                  { portal: "Emergency Portal", events: 6700, pct: 19, color: "bg-red-500" },
                  { portal: "Supply Chain", events: 5100, pct: 15, color: "bg-amber-500" },
                  { portal: "Family Portal", events: 3400, pct: 10, color: "bg-sky-500" },
                  { portal: "Admin / Ministry", events: 2800, pct: 8, color: "bg-gray-500" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <p className="text-[10px] font-semibold text-foreground w-28 shrink-0">{item.portal}</p>
                    <div className="flex-1 bg-secondary rounded-full h-2.5 overflow-hidden">
                      <div className={`h-full rounded-full ${item.color} transition-all`} style={{ width: `${item.pct}%` }} />
                    </div>
                    <p className="text-[10px] font-bold text-foreground w-16 text-right shrink-0">{item.events.toLocaleString()} <span className="font-normal text-muted-foreground">ev/h</span></p>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </Layout>
  );
}
