import React, { useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import { StatusDot } from "@/components/shared";
import {
  FlaskConical, Search, AlertTriangle, CheckCircle2, Zap,
  Brain, TrendingUp, TrendingDown, Minus, ArrowRight, Plus, X, Activity,
  Bell, ChevronDown, ChevronUp, Microscope, Beaker, Radio, BarChart3,
  RefreshCw, Upload, FileText, Syringe, TestTube, Atom
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSseAlerts } from "@/hooks/use-sse-alerts";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

async function fetchLabPatient(nationalId: string) {
  const res = await fetch(`/api/lab/patient/${nationalId}`);
  if (!res.ok) throw new Error("Patient not found");
  return res.json();
}

async function submitLabResult(data: Record<string, string>) {
  const res = await fetch("/api/lab/result", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to submit result");
  return res.json();
}

const TEST_NAMES = [
  "HbA1c", "Fasting Glucose", "Total Cholesterol", "LDL Cholesterol", "HDL Cholesterol",
  "Triglycerides", "Creatinine", "eGFR", "Hemoglobin", "WBC Count", "Platelet Count",
  "ALT", "AST", "TSH", "Uric Acid", "Vitamin D", "Sodium", "Potassium",
];

const CHART_TESTS = [
  "HbA1c", "Fasting Glucose", "Fasting Blood Glucose", "Total Cholesterol",
  "LDL Cholesterol", "Creatinine", "Hemoglobin", "eGFR", "Potassium", "Sodium"
];
const CHART_COLORS: Record<string, string> = {
  "HbA1c":                "#e11d48",
  "Fasting Glucose":      "#f59e0b",
  "Fasting Blood Glucose":"#f59e0b",
  "Total Cholesterol":    "#8b5cf6",
  "LDL Cholesterol":      "#3b82f6",
  "Creatinine":           "#10b981",
  "Hemoglobin":           "#f97316",
  "eGFR":                 "#06b6d4",
  "Potassium":            "#84cc16",
  "Sodium":               "#a855f7",
};
const NORMAL_RANGES: Record<string, { min: number; max: number; unit: string }> = {
  "HbA1c":                { min: 4.0,  max: 5.7,   unit: "%"        },
  "Fasting Glucose":      { min: 70,   max: 100,   unit: "mg/dL"    },
  "Fasting Blood Glucose":{ min: 70,   max: 100,   unit: "mg/dL"    },
  "Total Cholesterol":    { min: 0,    max: 200,   unit: "mg/dL"    },
  "LDL Cholesterol":      { min: 0,    max: 100,   unit: "mg/dL"    },
  "Creatinine":           { min: 0.6,  max: 1.2,   unit: "mg/dL"    },
  "Hemoglobin":           { min: 12,   max: 17,    unit: "g/dL"     },
  "eGFR":                 { min: 60,   max: 120,   unit: "mL/min"   },
  "Potassium":            { min: 3.5,  max: 5.0,   unit: "mEq/L"    },
  "Sodium":               { min: 135,  max: 145,   unit: "mEq/L"    },
};

/* ── status helpers ── */
const statusDot = (s: string) =>
  s === "critical" ? "#ef4444" : s === "abnormal" ? "#f59e0b" : "#22c55e";

const statusBg = (s: string) =>
  s === "critical" ? "rgba(239,68,68,0.12)"  :
  s === "abnormal" ? "rgba(245,158,11,0.12)" : "rgba(34,197,94,0.12)";

const statusText = (s: string) =>
  s === "critical" ? "#dc2626" : s === "abnormal" ? "#d97706" : "#16a34a";

const statusBorder = (s: string) =>
  s === "critical" ? "#ef4444" : s === "abnormal" ? "#f59e0b" : "#22c55e";

function TrendChip({ trend }: { trend: string }) {
  const bad = trend.includes("WORSENING") || trend.includes("HIGH") || trend.includes("ELEVATED")
    || trend.includes("DIABETIC") || trend.includes("CRITICAL") || trend.includes("ANEMIA")
    || trend.includes("STRESS") || trend.includes("ABNORMAL");
  const good = trend === "NORMAL" || trend === "OPTIMAL" || trend === "IMPROVING";
  const color = bad ? "#dc2626" : good ? "#16a34a" : "#d97706";
  const Icon  = bad ? TrendingUp : good ? CheckCircle2 : TrendingDown;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase" style={{ background: `${color}12`, color }}>
      <Icon className="w-2.5 h-2.5" /> {trend}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════ */
export default function LabPortal() {
  const [searchId, setSearchId]     = useState("");
  const [nationalId, setNationalId] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [lastResult, setLastResult]   = useState<any>(null);
  const [alertsOpen, setAlertsOpen]   = useState(true);
  const [chartsOpen, setChartsOpen]   = useState(true);

  const { alerts: sseAlerts, connected: sseConnected, unreadCount: sseUnread,
          markRead: markSseRead, clearAll: clearSseAlerts } = useSseAlerts("lab");

  const [form, setForm] = useState({
    testName: "", result: "", unit: "", referenceRange: "",
    status: "normal", hospital: "SANAD Lab Network", notes: "",
  });

  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["lab-patient", nationalId],
    queryFn:  () => fetchLabPatient(nationalId),
    enabled:  !!nationalId,
    retry:    false,
  });

  const submitMutation = useMutation({
    mutationFn: (formData: Record<string, string>) =>
      submitLabResult({ ...formData, patientId: data?.patient?.id }),
    onSuccess: (result) => {
      setLastResult(result);
      setShowAddForm(false);
      setForm({ testName: "", result: "", unit: "", referenceRange: "", status: "normal", hospital: "SANAD Lab Network", notes: "" });
      qc.invalidateQueries({ queryKey: ["lab-patient", nationalId] });
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchId.trim()) setNationalId(searchId.trim());
  };

  /* ── trend chart data ── */
  const trendChartData = useMemo(() => {
    if (!data?.labs?.length) return {} as Record<string, { date: string; value: number; status: string }[]>;
    const grouped: Record<string, { date: string; value: number; status: string }[]> = {};
    for (const lab of data.labs) {
      const val = parseFloat(lab.result);
      if (isNaN(val)) continue;
      if (!grouped[lab.testName]) grouped[lab.testName] = [];
      grouped[lab.testName]!.push({ date: lab.testDate?.split("T")[0] ?? lab.testDate, value: val, status: lab.status });
    }
    for (const key of Object.keys(grouped)) {
      grouped[key] = grouped[key]!.sort((a, b) => a.date.localeCompare(b.date));
    }
    return grouped;
  }, [data]);

  const chartsToShow = CHART_TESTS.filter(t => (trendChartData[t]?.length ?? 0) >= 1);

  /* ── AI panel summary data ── */
  const panels = useMemo(() => {
    if (!data?.labs?.length) return [];
    type LabResult = { testName: string; result: string; status: string; unit: string };
    const labMap: Record<string, LabResult> = {};
    for (const lab of data.labs) {
      if (!labMap[lab.testName]) labMap[lab.testName] = lab;
    }
    const get = (name: string): LabResult | null => {
      for (const [k, v] of Object.entries(labMap)) {
        if (k.toLowerCase().includes(name.toLowerCase())) return v;
      }
      return null;
    };
    return [
      {
        name: "Metabolic Panel", code: "MET", icon: Atom, color: "#0ea5e9",
        tests: [
          { label: "HbA1c",          v: get("HbA1c"),     normal: "<5.7%",        hi: "≥6.5% = Diabetes" },
          { label: "Fasting Glucose", v: get("Glucose"),   normal: "70–100 mg/dL", hi: ">126 = Diabetes" },
          { label: "Creatinine",      v: get("Creatinine"),normal: "0.6–1.2 mg/dL",hi: ">1.5 = CKD risk" },
          { label: "eGFR",            v: get("eGFR"),      normal: ">60 mL/min",   hi: "<60 = CKD" },
        ],
        insight: "Diabetes, renal function, and glycaemic control",
      },
      {
        name: "Lipid Panel", code: "LIP", icon: BarChart3, color: "#8b5cf6",
        tests: [
          { label: "Total Cholesterol", v: get("Cholesterol"),   normal: "<200 mg/dL", hi: ">240 = High risk" },
          { label: "LDL",               v: get("LDL"),           normal: "<100 mg/dL", hi: ">160 = High" },
          { label: "HDL",               v: get("HDL"),           normal: ">40 mg/dL",  hi: "<40 = Low" },
          { label: "Triglycerides",     v: get("Triglycerides"), normal: "<150 mg/dL", hi: ">200 = High" },
        ],
        insight: "Cardiovascular lipid risk — ATP III guidelines",
      },
      {
        name: "CBC — Blood Count", code: "CBC", icon: Syringe, color: "#f97316",
        tests: [
          { label: "Hemoglobin", v: get("Hemoglobin"), normal: "12–17 g/dL",   hi: "<12 = Anemia" },
          { label: "WBC",        v: get("WBC"),        normal: "4–11 K/μL",    hi: ">11 = Infection?" },
          { label: "Platelets",  v: get("Platelet"),   normal: "150–400 K/μL", hi: "<150 = Thrombocytopenia" },
        ],
        insight: "Anemia, infection, and bleeding risk screening",
      },
    ].filter(p => p.tests.some(t => t.v));
  }, [data]);

  return (
    <Layout role="lab">

      {/* ══════════════════════════════════════════════════
          FLOATING SSE ALERTS PANEL
      ══════════════════════════════════════════════════ */}
      {sseAlerts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] rounded-3xl overflow-hidden"
          style={{ background: "rgba(2,32,58,0.94)", backdropFilter: "blur(24px)", boxShadow: "0 20px 60px rgba(0,0,0,0.35), 0 0 0 1px rgba(14,165,233,0.20)" }}>
          <button onClick={() => setAlertsOpen(p => !p)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left"
            style={{ background: "rgba(14,165,233,0.18)", borderBottom: "1px solid rgba(14,165,233,0.18)" }}>
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-400" />
            </span>
            <span className="font-black text-sm text-white flex-1">Live Lab Alerts</span>
            {sseUnread > 0 && (
              <span className="text-[10px] font-black text-white px-2 py-0.5 rounded-full" style={{ background: "rgba(14,165,233,0.40)" }}>{sseUnread}</span>
            )}
            <button onClick={e => { e.stopPropagation(); clearSseAlerts(); }}
              className="text-[11px] font-bold px-2 py-0.5 rounded-lg"
              style={{ color: "rgba(255,255,255,0.40)", background: "rgba(255,255,255,0.06)" }}>
              Clear
            </button>
            {alertsOpen ? <ChevronDown className="w-3.5 h-3.5 text-white/40" /> : <ChevronUp className="w-3.5 h-3.5 text-white/40" />}
          </button>
          {alertsOpen && (
            <div className="divide-y max-h-[280px] overflow-y-auto" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              {sseAlerts.map(alert => (
                <div key={alert.id} className={`px-4 py-3 flex items-start gap-3 ${alert.read ? "opacity-30" : ""}`}>
                  <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                    alert.severity === "critical" ? "bg-red-400 animate-pulse" :
                    alert.severity === "high" ? "bg-amber-400" : "bg-sky-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white leading-snug">{alert.title}</p>
                    <p className="text-xs text-white/40 mt-0.5">{alert.patientName}{alert.result ? ` · ${alert.result}` : ""}</p>
                  </div>
                  {!alert.read && (
                    <button onClick={() => { if (alert.nationalId) { setSearchId(alert.nationalId); setNationalId(alert.nationalId); } markSseRead(alert.id); }}
                      className="text-[10px] font-black text-white px-2.5 py-1 rounded-xl shrink-0 transition-all"
                      style={{ background: "rgba(14,165,233,0.30)", border: "1px solid rgba(14,165,233,0.25)" }}>
                      Load
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          LAB INTELLIGENCE HEADER
      ══════════════════════════════════════════════════ */}
      <div className="rounded-3xl overflow-hidden mb-6"
        style={{ background: "linear-gradient(135deg, #0c1929 0%, #0c2340 50%, #082034 100%)", boxShadow: "0 0 60px rgba(14,165,233,0.10)" }}>
        {/* Top cyan accent */}
        <div className="h-1" style={{ background: "linear-gradient(90deg, #0369a1, #0ea5e9, #38bdf8, #0ea5e9, #0369a1)" }} />

        <div className="px-6 py-5">
          {/* Header row */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(14,165,233,0.18)", border: "1px solid rgba(14,165,233,0.28)" }}>
                <Microscope className="w-6 h-6 text-sky-400" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white leading-tight">Clinical Laboratory Intelligence</h1>
                <p className="text-[11px] text-white/40 mt-0.5">AI Lab Interpreter · Trend Analysis · Critical Flags · MOH Network</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                style={{ background: sseConnected ? "rgba(34,197,94,0.10)" : "rgba(255,255,255,0.05)", border: sseConnected ? "1px solid rgba(34,197,94,0.20)" : "1px solid rgba(255,255,255,0.08)" }}>
                <Radio className="w-3 h-3" style={{ color: sseConnected ? "#86efac" : "rgba(255,255,255,0.30)" }} />
                <span className="text-[10px] font-black" style={{ color: sseConnected ? "#86efac" : "rgba(255,255,255,0.30)" }}>
                  {sseConnected ? "Live" : "Connecting"}
                </span>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: sseConnected ? "#22c55e" : "rgba(255,255,255,0.20)" }} />
              </div>
              {sseUnread > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl animate-pulse"
                  style={{ background: "rgba(14,165,233,0.20)", border: "1px solid rgba(14,165,233,0.30)" }}>
                  <Bell className="w-3 h-3 text-sky-400" />
                  <span className="text-[10px] font-black text-sky-300">{sseUnread} alerts</span>
                </div>
              )}
            </div>
          </div>

          {/* Stat strip */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: "Tests / Day", value: "12K+",   sub: "Across SANAD network" },
              { label: "Critical Flag Rate", value: "8.2%", sub: "Auto-notified in < 30s" },
              { label: "AI Accuracy", value: "99.1%",  sub: "Lab interpretation" },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl px-4 py-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-xl font-black text-white">{s.value}</p>
                <p className="text-[10px] font-bold text-white/60 mt-0.5">{s.label}</p>
                <p className="text-[9px] text-white/30 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* SEARCH */}
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "rgba(14,165,233,0.50)" }} />
              <input
                autoFocus
                value={searchId}
                onChange={e => setSearchId(e.target.value)}
                placeholder="Patient National ID — retrieve full lab history with AI analysis..."
                className="w-full h-13 pl-11 pr-4 py-3.5 rounded-2xl text-sm font-mono text-white placeholder:text-white/20 focus:outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: searchId ? "1.5px solid rgba(14,165,233,0.50)" : "1px solid rgba(255,255,255,0.10)",
                  boxShadow: searchId ? "0 0 20px rgba(14,165,233,0.12)" : "none",
                }}
              />
            </div>
            <button type="submit"
              className="h-13 px-7 py-3.5 rounded-2xl flex items-center gap-2.5 font-black text-sm text-white transition-all hover:opacity-90 shrink-0"
              style={{ background: "linear-gradient(135deg, #0284c7, #0369a1)", boxShadow: "0 4px 20px rgba(2,132,199,0.30)" }}>
              <Search className="w-4 h-4" /> Retrieve
            </button>
          </form>

          {/* Demo IDs */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-[10px] font-bold text-white/25 uppercase tracking-wider">Demo:</span>
            {["1000000001","1000000003","1000000005"].map(id => (
              <button key={id} type="button"
                onClick={() => { setSearchId(id); setNationalId(id); }}
                className="font-mono text-[11px] font-bold px-3 py-1 rounded-lg transition-all hover:text-sky-300"
                style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {id}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          LOADING
      ══════════════════════════════════════════════════ */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-14 h-14 rounded-3xl flex items-center justify-center" style={{ background: "rgba(14,165,233,0.12)", border: "1px solid rgba(14,165,233,0.20)" }}>
            <div className="w-6 h-6 rounded-full border-2 border-sky-200/20 border-t-sky-400 animate-spin" />
          </div>
          <p className="font-black text-foreground">Retrieving lab records...</p>
          <p className="text-sm text-muted-foreground">Querying 12,000+ daily results via SANAD Lab Network</p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          ERROR
      ══════════════════════════════════════════════════ */}
      {error && !isLoading && (
        <div className="flex items-center gap-4 p-5 rounded-2xl" style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)" }}>
          <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
          <div>
            <p className="font-black text-red-700">Patient Not Found</p>
            <p className="text-sm text-muted-foreground mt-0.5">No lab records for National ID: <span className="font-mono font-bold">{nationalId}</span></p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          EMPTY STATE
      ══════════════════════════════════════════════════ */}
      {!nationalId && !isLoading && (
        <div className="space-y-5">
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, rgba(14,165,233,0.15), rgba(2,132,199,0.10))", border: "1px solid rgba(14,165,233,0.20)" }}>
              <FlaskConical className="w-10 h-10 text-sky-500" />
            </div>
            <div>
              <p className="text-xl font-black text-foreground">Lab Intelligence Portal</p>
              <p className="text-sm text-muted-foreground max-w-sm mt-1 leading-relaxed">
                Enter a patient National ID to retrieve their full lab history, AI-interpreted results, and clinical trend analysis.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Brain,     title: "AI Interpretation",  desc: "Every result interpreted by 9 clinical AI models", color: "#8b5cf6" },
              { icon: BarChart3, title: "Trend Analysis",     desc: "Longitudinal charts for key biomarkers over time",  color: "#0ea5e9" },
              { icon: Bell,      title: "Critical Flags",     desc: "Auto-alert within 30s of critical result upload",   color: "#ef4444" },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="p-5 rounded-2xl" style={{ background: "rgba(14,165,233,0.04)", border: "1px solid rgba(14,165,233,0.10)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${f.color}15`, border: `1px solid ${f.color}20` }}>
                    <Icon className="w-5 h-5" style={{ color: f.color }} />
                  </div>
                  <p className="text-sm font-black text-foreground mb-1">{f.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          PATIENT DATA
      ══════════════════════════════════════════════════ */}
      {data && !isLoading && (
        <div className="space-y-5">

          {/* ── PATIENT BANNER ── */}
          <div className="rounded-3xl overflow-hidden" style={{ border: "1px solid rgba(14,165,233,0.18)", background: "linear-gradient(135deg, rgba(14,165,233,0.06) 0%, rgba(2,132,199,0.03) 100%)" }}>
            {/* Allergy strip */}
            {data.patient.allergies?.length > 0 && (
              <div className="px-5 py-2.5 flex items-center gap-2.5" style={{ background: "linear-gradient(90deg, #b91c1c, #dc2626)" }}>
                <AlertTriangle className="w-3.5 h-3.5 text-white shrink-0" />
                <p className="text-xs font-black uppercase tracking-widest text-white">Known Allergies: {data.patient.allergies.join(", ")}</p>
              </div>
            )}

            <div className="flex items-center justify-between gap-6 px-6 py-5">
              {/* Identity */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl text-white shrink-0"
                  style={{ background: "linear-gradient(135deg, rgba(14,165,233,0.30), rgba(2,132,199,0.25))", border: "1px solid rgba(14,165,233,0.25)" }}>
                  {String(data.patient.name).split(" ").map((n: string) => n[0]).slice(0,2).join("")}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Patient Identified</p>
                  <p className="text-2xl font-black text-foreground">{data.patient.name}</p>
                  <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                    <span className="font-mono text-xs px-2.5 py-0.5 rounded-xl text-muted-foreground" style={{ background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.15)" }}>{data.patient.nationalId}</span>
                    <span className="text-xs text-muted-foreground">Age {data.patient.age} · {data.patient.gender}</span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full" style={{ background: "rgba(220,38,38,0.10)", color: "#dc2626", border: "1px solid rgba(220,38,38,0.18)" }}>Blood: {data.patient.bloodType}</span>
                    <StatusDot status="active" />
                    <span className="text-[10px] text-emerald-600 font-semibold">Live</span>
                  </div>
                </div>
              </div>

              {/* Summary counts */}
              <div className="flex items-center gap-6 shrink-0">
                {[
                  { label: "Labs on Record", value: String(data.summary.total),    color: "#0ea5e9" },
                  { label: "Critical",        value: String(data.summary.critical), color: "#ef4444" },
                  { label: "Abnormal",        value: String(data.summary.abnormal), color: "#f59e0b" },
                  { label: "Normal",          value: String(data.summary.total - data.summary.critical - data.summary.abnormal), color: "#22c55e" },
                ].map((s, i) => (
                  <div key={i} className="text-center">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1">{s.label}</p>
                    <p className="text-3xl font-black tabular-nums" style={{ color: s.color }}>{s.value}</p>
                  </div>
                ))}
                <button onClick={() => setShowAddForm(p => !p)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-black text-white transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #0284c7, #0369a1)", boxShadow: "0 4px 16px rgba(2,132,199,0.25)" }}>
                  <Plus className="w-4 h-4" /> Add Result
                </button>
              </div>
            </div>
          </div>

          {/* ── AI RESULT NOTIFICATION (last submitted) ── */}
          {lastResult && (
            <div className="rounded-2xl p-5" style={{
              background: `${statusBg(lastResult.aiAnalysis?.status)} `,
              border: `1.5px solid ${statusBorder(lastResult.aiAnalysis?.status)}30`,
              borderLeft: `4px solid ${statusBorder(lastResult.aiAnalysis?.status)}`,
            }}>
              <div className="flex items-start gap-3 mb-3">
                <Brain className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">AI Lab Interpreter — Just Submitted</p>
                  <p className="font-black text-foreground">{lastResult.result?.testName} = {lastResult.result?.result} {lastResult.result?.unit}</p>
                </div>
                <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full text-white" style={{ background: statusDot(lastResult.aiAnalysis?.status) }}>
                  {lastResult.aiAnalysis?.status}
                </span>
              </div>
              <p className="text-sm text-foreground mb-2">{lastResult.aiAnalysis?.significance}</p>
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.50)" }}>
                <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-foreground">{lastResult.aiAnalysis?.action}</p>
              </div>
              <div className="flex items-center gap-4 mt-2.5">
                <span className="text-[10px] font-mono text-muted-foreground">Risk Impact: +{lastResult.aiAnalysis?.riskImpact} pts</span>
                <span className="text-[10px] font-mono text-muted-foreground">Confidence: {Math.round(lastResult.aiAnalysis?.confidence * 100)}%</span>
                <span className="text-[10px] font-mono text-muted-foreground ml-auto">Event: {lastResult.event}</span>
              </div>
            </div>
          )}

          {/* ── ADD RESULT FORM ── */}
          {showAddForm && (
            <div className="rounded-3xl overflow-hidden" style={{ border: "1px solid rgba(14,165,233,0.20)", background: "rgba(14,165,233,0.04)" }}>
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(14,165,233,0.12)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(14,165,233,0.15)" }}>
                    <Upload className="w-4 h-4 text-sky-500" />
                  </div>
                  <p className="font-black text-foreground">Upload New Lab Result</p>
                </div>
                <button onClick={() => setShowAddForm(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {[
                    {
                      label: "Test Name *",
                      node: (
                        <select
                          className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-sky-400"
                          value={form.testName}
                          onChange={e => setForm(f => ({ ...f, testName: e.target.value }))}>
                          <option value="">Select test...</option>
                          {TEST_NAMES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      )
                    },
                    {
                      label: "Result Value *",
                      node: (
                        <input className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-sky-400"
                          placeholder="e.g. 8.2" value={form.result} onChange={e => setForm(f => ({ ...f, result: e.target.value }))} />
                      )
                    },
                    {
                      label: "Unit",
                      node: (
                        <input className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-sky-400"
                          placeholder="e.g. mg/dL, %" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
                      )
                    },
                    {
                      label: "Reference Range",
                      node: (
                        <input className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-sky-400"
                          placeholder="e.g. 70–99 mg/dL" value={form.referenceRange} onChange={e => setForm(f => ({ ...f, referenceRange: e.target.value }))} />
                      )
                    },
                    {
                      label: "Status *",
                      node: (
                        <select className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-sky-400"
                          value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                          <option value="normal">Normal</option>
                          <option value="abnormal">Abnormal</option>
                          <option value="critical">Critical</option>
                        </select>
                      )
                    },
                    {
                      label: "Hospital / Lab",
                      node: (
                        <input className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-sky-400"
                          value={form.hospital} onChange={e => setForm(f => ({ ...f, hospital: e.target.value }))} />
                      )
                    },
                  ].map((field, i) => (
                    <div key={i}>
                      <p className="text-xs font-semibold text-muted-foreground mb-1.5">{field.label}</p>
                      {field.node}
                    </div>
                  ))}
                </div>
                <div className="mb-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">Clinical Notes</p>
                  <input className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-sky-400"
                    placeholder="Optional clinical notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => submitMutation.mutate(form as any)}
                    disabled={!form.testName || !form.result || !form.status || submitMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-sm text-white transition-all hover:opacity-90 disabled:opacity-40"
                    style={{ background: "linear-gradient(135deg, #0284c7, #0369a1)" }}>
                    <Zap className="w-4 h-4" />
                    {submitMutation.isPending ? "Submitting + AI Analysis..." : "Submit Result & Run AI Analysis"}
                  </button>
                  <button onClick={() => setShowAddForm(false)}
                    className="px-5 py-3 rounded-2xl font-bold text-sm border border-border text-muted-foreground hover:text-foreground transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── AI PANEL SUMMARY ── */}
          {panels.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <FlaskConical className="w-3.5 h-3.5 text-sky-500" /> AI Clinical Panel Summary
                </p>
                <span className="text-[10px] font-bold text-sky-600 px-2.5 py-1 rounded-full" style={{ background: "rgba(14,165,233,0.10)" }}>
                  {panels.length} panels detected
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {panels.map((panel, pi) => {
                  const presentTests = panel.tests.filter(t => t.v);
                  const abnormal  = presentTests.filter(t => t.v!.status !== "normal");
                  const critical  = presentTests.filter(t => t.v!.status === "critical");
                  const pStatus   = critical.length > 0 ? "critical" : abnormal.length > 0 ? "abnormal" : "normal";
                  const Icon = panel.icon;
                  return (
                    <div key={pi} className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${statusBorder(pStatus)}25`, borderLeft: `4px solid ${statusBorder(pStatus)}` }}>
                      {/* Panel header */}
                      <div className="flex items-center gap-3 px-4 py-3" style={{ background: `${panel.color}10`, borderBottom: `1px solid ${panel.color}18` }}>
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${panel.color}18` }}>
                          <Icon className="w-4 h-4" style={{ color: panel.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-foreground">{panel.name}</p>
                          <p className="text-[9px] text-muted-foreground">{presentTests.length} results · {abnormal.length} abnormal</p>
                        </div>
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full text-white uppercase" style={{ background: statusDot(pStatus) }}>
                          {pStatus}
                        </span>
                      </div>

                      {/* Test rows */}
                      <div className="p-3 space-y-1.5">
                        {presentTests.map((t, ti) => (
                          <div key={ti} className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">{t.label}</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-black tabular-nums" style={{ color: statusText(t.v!.status) }}>
                                {t.v!.result} {t.v!.unit}
                              </span>
                              <span className="text-[9px] text-muted-foreground/60 font-mono">(N: {t.normal})</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Insight */}
                      <div className="px-3 pb-3">
                        <div className="px-2.5 py-2 rounded-xl flex items-start gap-1.5" style={{ background: `${statusBorder(pStatus)}0d` }}>
                          <Brain className="w-2.5 h-2.5 mt-0.5 shrink-0" style={{ color: statusText(pStatus) }} />
                          <p className="text-[9px] leading-relaxed" style={{ color: statusText(pStatus) }}>{panel.insight}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── TREND CHARTS ── */}
          {chartsToShow.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-sky-500" /> Clinical Trend Analysis
                </p>
                <button onClick={() => setChartsOpen(p => !p)}
                  className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground transition-colors">
                  {chartsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {chartsOpen ? "Collapse" : "Show"} charts · {chartsToShow.length} biomarkers
                </button>
              </div>
              {chartsOpen && (
                <div className="grid grid-cols-2 gap-4">
                  {chartsToShow.map(testName => {
                    const points   = trendChartData[testName]!;
                    const color    = CHART_COLORS[testName] ?? "#6366f1";
                    const range    = NORMAL_RANGES[testName];
                    const latest   = points[points.length - 1];
                    const previous = points.length >= 2 ? points[points.length - 2] : null;
                    const isWorsening = previous && latest && latest.value > previous.value && latest.status !== "normal";
                    const isImproving = previous && latest && latest.value < previous.value && latest.status === "normal";

                    return (
                      <div key={testName} className="rounded-2xl p-4" style={{ background: "rgba(14,165,233,0.04)", border: "1px solid rgba(14,165,233,0.10)" }}>
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-sm font-black text-foreground">{testName}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Latest: <span className="font-bold" style={{ color }}>{latest?.value} {range?.unit ?? ""}</span>
                              {range && <span className="text-muted-foreground/60 ml-1">(Normal: {range.min}–{range.max})</span>}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {isWorsening && (
                              <span className="text-[9px] font-black flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.12)", color: "#dc2626" }}>
                                <TrendingUp className="w-2.5 h-2.5" /> WORSENING
                              </span>
                            )}
                            {isImproving && (
                              <span className="text-[9px] font-black flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.12)", color: "#16a34a" }}>
                                <TrendingDown className="w-2.5 h-2.5" /> IMPROVING
                              </span>
                            )}
                            {!isWorsening && !isImproving && points.length > 1 && (
                              <span className="text-[9px] font-black flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                                <Minus className="w-2.5 h-2.5" /> STABLE
                              </span>
                            )}
                          </div>
                        </div>
                        <ResponsiveContainer width="100%" height={140}>
                          <LineChart data={points} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,165,233,0.08)" />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={d => d.slice(5)} />
                            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                            <Tooltip
                              contentStyle={{ borderRadius: 12, border: "1px solid rgba(14,165,233,0.20)", fontSize: 11, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)" }}
                              formatter={(val: any) => [`${val} ${range?.unit ?? ""}`, testName]}
                            />
                            {range && range.max > 0 && (
                              <ReferenceLine y={range.max} stroke="#f59e0b" strokeDasharray="4 2" strokeWidth={1.5}
                                label={{ value: "Max", fill: "#f59e0b", fontSize: 9 }} />
                            )}
                            {range && range.min > 0 && (
                              <ReferenceLine y={range.min} stroke="#10b981" strokeDasharray="4 2" strokeWidth={1.5}
                                label={{ value: "Min", fill: "#10b981", fontSize: 9 }} />
                            )}
                            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.5}
                              dot={(props: any) => {
                                const { cx, cy, payload } = props;
                                const fill = payload.status === "critical" ? "#ef4444" : payload.status === "abnormal" ? "#f59e0b" : "#10b981";
                                return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={5} fill={fill} stroke="white" strokeWidth={2} />;
                              }}
                              activeDot={{ r: 7, strokeWidth: 2 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── LAB RESULTS TABLE ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <TestTube className="w-3.5 h-3.5 text-sky-500" /> Lab Results with AI Interpretation
              </p>
              <span className="text-[10px] font-bold text-muted-foreground px-2.5 py-1 rounded-full bg-secondary">{data.labs.length} results</span>
            </div>

            <div className="rounded-3xl overflow-hidden" style={{ border: "1px solid rgba(14,165,233,0.12)" }}>
              {data.labs.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
                  <FlaskConical className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                  <p className="font-bold text-foreground">No lab results on record</p>
                  <p className="text-sm text-muted-foreground">Use the "Add Result" button to upload the first result.</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "rgba(14,165,233,0.08)" }}>
                  {data.labs.map((lab: any, idx: number) => {
                    /* ── reference range gauge ── */
                    const refRange  = lab.referenceRange ?? "";
                    const resultVal = parseFloat(lab.result);
                    let gaugeMin = 0, gaugeMax = 100, refLo = 0, refHi = 100, valuePct = 50;
                    const dashMatch = refRange.match(/^([0-9.]+)\s*[-–]\s*([0-9.]+)/);
                    const ltMatch   = refRange.match(/^<\s*([0-9.]+)/);
                    const gtMatch   = refRange.match(/^>\s*([0-9.]+)/);
                    if (dashMatch) {
                      refLo = parseFloat(dashMatch[1]); refHi = parseFloat(dashMatch[2]);
                      gaugeMin = refLo * 0.6; gaugeMax = refHi * 1.6;
                      valuePct = Math.max(2, Math.min(98, ((resultVal - gaugeMin) / (gaugeMax - gaugeMin)) * 100));
                    } else if (ltMatch) {
                      refLo = 0; refHi = parseFloat(ltMatch[1]);
                      gaugeMax = refHi * 2;
                      valuePct = Math.max(2, Math.min(98, (resultVal / gaugeMax) * 100));
                    } else if (gtMatch) {
                      refLo = parseFloat(gtMatch[1]); refHi = 9999;
                      gaugeMax = refLo * 2; gaugeMin = 0;
                      valuePct = Math.max(2, Math.min(98, (resultVal / gaugeMax) * 100));
                    }
                    const hasGauge    = !!(dashMatch || ltMatch || gtMatch) && !isNaN(resultVal);
                    const gaugeColor  = statusDot(lab.status);
                    const refLoPct    = dashMatch ? Math.max(0, ((refLo - gaugeMin) / (gaugeMax - gaugeMin)) * 100) : ltMatch ? 0 : Math.max(0, ((refLo - gaugeMin) / (gaugeMax - gaugeMin)) * 100);
                    const refHiPct    = dashMatch ? Math.min(100, ((refHi - gaugeMin) / (gaugeMax - gaugeMin)) * 100) : ltMatch ? Math.min(100, (refHi / gaugeMax) * 100) : 80;

                    return (
                      <div key={lab.id ?? idx} className="px-5 py-4 hover:bg-sky-50/30 transition-colors" style={{ borderLeft: `4px solid ${gaugeColor}` }}>
                        <div className="flex items-start gap-4">
                          {/* Color dot */}
                          <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ background: gaugeColor, outline: `3px solid ${gaugeColor}22` }} />

                          <div className="flex-1 min-w-0">
                            {/* Top row */}
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <p className="font-black text-sm text-foreground">{lab.testName}</p>
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full text-white" style={{ background: gaugeColor }}>
                                {lab.status}
                              </span>
                              {lab.interpretation?.trend && <TrendChip trend={lab.interpretation.trend} />}
                              <span className="ml-auto text-[10px] text-muted-foreground font-mono">{lab.testDate}</span>
                            </div>

                            {/* Value + reference */}
                            <div className="flex items-center gap-3 mb-3">
                              <p className="text-2xl font-black tabular-nums text-foreground">{lab.result}
                                <span className="text-sm font-normal text-muted-foreground ml-1">{lab.unit}</span>
                              </p>
                              {lab.referenceRange && (
                                <span className="text-[10px] font-mono text-muted-foreground px-2.5 py-1 rounded-full bg-secondary">
                                  REF: {lab.referenceRange}
                                </span>
                              )}
                              <span className="text-[10px] text-muted-foreground">{lab.hospital}</span>
                            </div>

                            {/* Reference range gauge */}
                            {hasGauge && (
                              <div className="mb-3">
                                <div className="relative h-2.5 rounded-full overflow-hidden bg-secondary">
                                  <div className="absolute top-0 h-full rounded-full" style={{
                                    left: `${refLoPct}%`,
                                    width: `${Math.max(0, refHiPct - refLoPct)}%`,
                                    background: "rgba(34,197,94,0.22)",
                                    borderLeft:  "1.5px solid rgba(34,197,94,0.50)",
                                    borderRight: "1.5px solid rgba(34,197,94,0.50)",
                                  }} />
                                  <div className="absolute top-0 h-full w-0.5 -ml-px" style={{ left: `${valuePct}%`, background: gaugeColor }} />
                                  <div className="absolute w-3.5 h-3.5 rounded-full -translate-x-1/2 -translate-y-[2px] border-2 border-white shadow-md" style={{ left: `${valuePct}%`, background: gaugeColor }} />
                                </div>
                                <div className="flex justify-between mt-1">
                                  <span className="text-[8px] text-muted-foreground font-mono">{gaugeMin.toFixed(1)}</span>
                                  <span className="text-[8px] font-bold font-mono" style={{ color: "#16a34a" }}>Normal: {lab.referenceRange}</span>
                                  <span className="text-[8px] text-muted-foreground font-mono">{gaugeMax.toFixed(1)}</span>
                                </div>
                              </div>
                            )}

                            {/* AI Interpretation */}
                            {lab.interpretation && (
                              <div className="p-3 rounded-xl" style={{ background: `${gaugeColor}08`, borderLeft: `2.5px solid ${gaugeColor}40` }}>
                                <div className="flex items-start gap-2">
                                  <Brain className="w-3.5 h-3.5 text-violet-500 shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-xs font-semibold text-foreground mb-0.5">{lab.interpretation?.significance}</p>
                                    <p className="text-xs text-muted-foreground">→ {lab.interpretation?.action}</p>
                                    <div className="flex items-center gap-4 mt-1.5">
                                      <span className="text-[9px] font-mono text-muted-foreground">Risk: +{lab.interpretation?.riskImpact} pts</span>
                                      <span className="text-[9px] font-mono text-muted-foreground">Confidence: {Math.round((lab.interpretation?.confidence ?? 0) * 100)}%</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </Layout>
  );
}
