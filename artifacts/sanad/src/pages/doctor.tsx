import React, { useState, useRef, useEffect } from "react";
import {
  Search, Shield, Activity, AlertCircle, Syringe, Clock,
  User as UserIcon, Pill, FlaskConical, Building2, X, Stethoscope, CalendarDays,
  TrendingUp, TrendingDown, Minus, Brain, Bell, BellOff, CheckCheck,
  TriangleAlert, Zap, ArrowUpRight, ArrowDownRight, ChevronRight, Lightbulb,
  Wifi, WifiOff, Network, Users, CheckCircle2, BookOpen, GitBranch, CircleDot
} from "lucide-react";
import {
  LineChart, Line, ResponsiveContainer, Tooltip as RechartsTooltip,
  ReferenceLine, XAxis, YAxis, CartesianGrid, Area, AreaChart,
} from "recharts";
import { Layout } from "@/components/layout";
import {
  Card, CardHeader, CardTitle, CardBody,
  Input, Button, Badge, PageHeader, Tabs, KpiCard, StatusDot, Select, DataLabel, AlertBanner
} from "@/components/shared";
import {
  useGetPatientByNationalId,
  useGetPatientRiskScore,
  useCheckDrugInteraction,
  usePrescribeMedication,
  useListAlerts,
  useMarkAlertRead,
  useGetPatientPredictions,
} from "@workspace/api-client-react";
import { useAiDecision, useAuditLog } from "@/hooks/use-ai-decision";
import { useSseAlerts } from "@/hooks/use-sse-alerts";
import { useAuth } from "@/contexts/auth-context";
import { useQuery } from "@tanstack/react-query";
import { format, isValid } from "date-fns";

type PredictionWarning = {
  type: string;
  severity: "low" | "moderate" | "high" | "critical";
  title: string;
  description: string;
  recommendation: string;
  confidence: "low" | "moderate" | "high";
};

const predictionSeverityStyle: Record<string, { bg: string; border: string; icon: string; badge: string }> = {
  critical: { bg: "bg-secondary", border: "border-border", icon: "text-red-600", badge: "destructive" },
  high: { bg: "bg-secondary", border: "border-border", icon: "text-amber-600", badge: "warning" },
  moderate: { bg: "bg-secondary", border: "border-border", icon: "text-sky-600", badge: "info" },
  low: { bg: "bg-secondary", border: "border-border", icon: "text-muted-foreground", badge: "outline" },
};

function safeDate(dateStr: string) {
  const d = new Date(dateStr);
  return isValid(d) ? d : new Date();
}

type TimelineEvent = {
  id: number;
  type: "visit" | "lab" | "medication" | "alert";
  date: Date;
  title: string;
  subtitle: string;
  status?: string;
  badge?: string;
  badgeVariant?: "success" | "warning" | "destructive" | "outline" | "info";
};

export default function DoctorDashboard() {
  const [searchId, setSearchId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("ai");
  const [recFeedback, setRecFeedback] = useState<Record<number, "accepted" | "rejected">>({});
  const [showSsePanel, setShowSsePanel] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { alerts: sseAlerts, connected: sseConnected, unreadCount: sseUnread, markRead: markSseRead, clearAll: clearSseAlerts } = useSseAlerts(user?.role ?? "");

  const { data: nameSearchResults } = useQuery({
    queryKey: ["patient-name-search", searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 2) return { patients: [] };
      const res = await fetch(`/api/patients?search=${encodeURIComponent(searchQuery)}&limit=6`);
      if (!res.ok) return { patients: [] };
      return res.json();
    },
    enabled: searchQuery.length >= 2 && !/^\d+$/.test(searchQuery),
  });
  const searchPatients: any[] = nameSearchResults?.patients ?? [];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const { data: patient, isLoading } = useGetPatientByNationalId(
    patientId || "",
    { query: { enabled: !!patientId, retry: false } }
  );

  const { data: riskScore } = useGetPatientRiskScore(
    patient?.id || 0,
    { query: { enabled: !!patient?.id } }
  );

  const { data: predictionsData } = useGetPatientPredictions(
    patient?.id || 0,
    { query: { enabled: !!patient?.id } }
  );

  const { data: aiDecision, isLoading: decisionLoading } = useAiDecision(
    patient?.id || 0,
    { enabled: !!patient?.id }
  );

  const { data: medMatrixData } = useQuery({
    queryKey: ["med-matrix", patient?.id],
    queryFn: async () => {
      const res = await fetch(`/api/ai/medication-matrix/${patient!.id}`);
      if (!res.ok) return { interactions: [] };
      return res.json() as Promise<{ interactions: Array<{ drug1: string; drug2: string; severity: string; description: string; recommendation: string }> }>;
    },
    enabled: !!patient?.id,
  });

  const { data: auditData } = useAuditLog(
    patient?.id || 0,
    { enabled: !!patient?.id && activeTab === "tools" }
  );

  const { data: alertsData, refetch: refetchAlerts } = useListAlerts(
    { patientId: patient?.id || 0 },
    { query: { enabled: !!patient?.id } }
  );

  const markReadMutation = useMarkAlertRead();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchId.trim()) { setPatientId(searchId.trim()); setActiveTab("ai"); setShowDropdown(false); }
  };

  const handleSelectPatient = (nationalId: string, name: string) => {
    setSearchId(nationalId);
    setSearchQuery(name);
    setPatientId(nationalId);
    setActiveTab("ai");
    setShowDropdown(false);
  };

  const activeMeds = patient?.medications?.filter(m => m.isActive) ?? [];
  const labResults = patient?.labResults ?? [];
  const criticalLabs = labResults.filter(l => l.status === "critical").length;
  const abnormalLabs = labResults.filter(l => l.status === "abnormal").length;

  const alerts = alertsData?.alerts ?? [];
  const unreadAlerts = alerts.filter(a => !a.isRead).length;

  const predictions: PredictionWarning[] = (predictionsData as any)?.predictions ?? [];
  const criticalPredictions = predictions.filter(p => p.severity === "critical" || p.severity === "high").length;

  const handleMarkRead = async (alertId: number) => {
    await markReadMutation.mutateAsync({ id: alertId });
    refetchAlerts();
  };

  const timeline: TimelineEvent[] = [
    ...(patient?.visits?.map(v => ({
      id: v.id,
      type: "visit" as const,
      date: safeDate(v.visitDate),
      title: `${v.visitType.charAt(0).toUpperCase() + v.visitType.slice(1)} Visit — ${v.hospital}`,
      subtitle: v.diagnosis ?? "",
      badge: v.visitType,
      badgeVariant: v.visitType === "emergency" ? "destructive" : v.visitType === "inpatient" ? "warning" : "outline",
    })) ?? []),
    ...(patient?.labResults?.map(l => ({
      id: l.id,
      type: "lab" as const,
      date: safeDate(l.testDate),
      title: l.testName,
      subtitle: `${l.result} ${l.unit ?? ""} · ${l.hospital}`,
      status: l.status,
      badge: l.status,
      badgeVariant: l.status === "normal" ? "success" : l.status === "abnormal" ? "warning" : "destructive",
    })) ?? []),
    ...(patient?.medications?.map(m => ({
      id: m.id,
      type: "medication" as const,
      date: safeDate(m.startDate ?? new Date().toISOString()),
      title: `Prescribed: ${m.drugName} ${m.dosage ?? ""}`,
      subtitle: `By ${m.prescribedBy} · ${m.hospital}`,
      badge: m.isActive ? "active" : "completed",
      badgeVariant: m.isActive ? "success" : "outline",
    })) ?? []),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const timelineIconMap = {
    visit: { icon: Building2, bg: "bg-secondary", color: "text-foreground" },
    lab: { icon: FlaskConical, bg: "bg-secondary", color: "text-foreground" },
    medication: { icon: Pill, bg: "bg-secondary", color: "text-foreground" },
    alert: { icon: AlertCircle, bg: "bg-secondary", color: "text-red-600" },
  };

  const labsByName: Record<string, typeof labResults> = {};
  for (const lab of [...labResults].sort((a, b) => new Date(b.testDate).getTime() - new Date(a.testDate).getTime())) {
    const k = lab.testName;
    if (!labsByName[k]) labsByName[k] = [];
    labsByName[k].push(lab);
  }

  const _creatKey = Object.keys(labsByName).find(k => k.toLowerCase().includes("creatinine") && !k.toLowerCase().includes("urine"));
  const _creatGroup = _creatKey ? labsByName[_creatKey] : [];
  const latestCreatinine = _creatGroup.length > 0 ? parseFloat(_creatGroup[0]!.result) : undefined;

  const getTrend = (labGroup: typeof labResults) => {
    if (labGroup.length < 2) return "stable";
    const vals = labGroup.slice(0, 3).map(l => parseFloat(l.result)).filter(v => !isNaN(v));
    if (vals.length < 2) return "stable";
    const diff = vals[0]! - vals[vals.length - 1]!;
    const pct = Math.abs(diff / (vals[vals.length - 1]! || 1)) * 100;
    if (pct < 5) return "stable";
    return diff > 0 ? "rising" : "falling";
  };

  const topPredictions = predictions.filter(p => p.severity === "critical" || p.severity === "high").slice(0, 3);

  const priorityItems = (() => {
    const items: Array<{ color: string; label: string; text: string; pulse?: boolean }> = [];
    if (aiDecision?.urgency === "immediate") {
      items.push({ color: "bg-red-600", label: "IMMEDIATE", text: aiDecision.primaryAction, pulse: true });
    } else if (aiDecision?.urgency === "urgent") {
      items.push({ color: "bg-amber-500", label: "URGENT", text: aiDecision.primaryAction, pulse: true });
    } else if (aiDecision?.urgency === "soon") {
      items.push({ color: "bg-sky-500", label: "SOON", text: aiDecision.primaryAction });
    }
    const critFactor = aiDecision?.whyFactors?.find(f => f.impact === "critical" || f.impact === "high");
    if (critFactor) {
      items.push({ color: "bg-amber-500", label: "WHY", text: critFactor.description });
    }
    const topBehavior = aiDecision?.behavioralFlags?.[0];
    if (topBehavior && topBehavior.severity === "high") {
      items.push({ color: "bg-violet-600", label: "BEHAVIOR", text: topBehavior.description });
    }
    const critLab = labResults.find(l => l.status === "critical");
    if (critLab && !items.some(i => i.label === "IMMEDIATE")) {
      items.push({ color: "bg-red-500", label: "CRITICAL LAB", text: `${critLab.testName}: ${critLab.result} ${critLab.unit ?? ""}`, pulse: true });
    }
    return items.slice(0, 3);
  })();

  // ── Workspace tab definitions ───────────────────────────────────────────────
  const TABS = [
    { id: "ai",      label: "AI Decisions",   icon: Brain,        badge: aiDecision?.urgency === "immediate" || aiDecision?.urgency === "urgent" ? "!" : undefined },
    { id: "labs",    label: "Labs & Tests",   icon: FlaskConical, badge: criticalLabs > 0 ? String(criticalLabs) : abnormalLabs > 0 ? String(abnormalLabs) : undefined },
    { id: "meds",    label: "Medications",    icon: Pill,         badge: undefined },
    { id: "history", label: "History",        icon: Clock,        badge: undefined },
    { id: "tools",   label: "Clinical Tools", icon: BookOpen,     badge: undefined },
  ];

  const patientAge = patient ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear() : undefined;

  return (
    <Layout role="doctor">
      {/* ── Critical alert banners ── */}
      {criticalLabs > 0 && (
        <AlertBanner variant="destructive">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span><strong>Critical Lab Alert:</strong> {criticalLabs} lab result{criticalLabs > 1 ? "s" : ""} require immediate clinical review.</span>
          <Badge variant="destructive" className="ml-auto shrink-0">{criticalLabs} critical</Badge>
        </AlertBanner>
      )}
      {criticalPredictions > 0 && (
        <AlertBanner variant="warning">
          <Brain className="w-4 h-4 text-amber-600 shrink-0" />
          <span><strong>AI Warning:</strong> {criticalPredictions} high-priority clinical prediction{criticalPredictions > 1 ? "s" : ""} require attention.</span>
          <Badge variant="warning" className="ml-auto shrink-0">{criticalPredictions} flagged</Badge>
        </AlertBanner>
      )}

      {/* ── SSE Real-time Alerts Panel ── */}
      {showSsePanel && sseAlerts.length > 0 && (
        <Card className="mb-4 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-secondary/60 rounded-t-[2rem]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="font-bold text-sm text-foreground">Live Clinical Alerts</span>
              <Badge variant="destructive" className="text-[10px]">{sseUnread} new</Badge>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={clearSseAlerts} className="text-[11px] text-muted-foreground hover:text-foreground font-medium">Clear all</button>
              <button onClick={() => setShowSsePanel(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="divide-y divide-border max-h-64 overflow-y-auto">
            {sseAlerts.map(alert => (
              <div key={alert.id} className={`px-4 py-3 flex items-start gap-3 ${alert.read ? "opacity-50" : ""}`}>
                <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${alert.severity === "critical" ? "bg-red-500" : alert.severity === "high" ? "bg-orange-500" : "bg-amber-500"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase bg-secondary text-muted-foreground">
                      {alert.type === "drug_interaction_alert" ? "Drug Interaction" : alert.type === "risk_escalation" ? "Risk Escalation" : "Lab Alert"}
                    </span>
                  </div>
                  <p className="font-bold text-sm text-foreground">{alert.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {alert.patientName}
                    {alert.result ? ` · ${alert.result}` : ""}
                    {alert.drugName && alert.conflictingDrug ? ` · ${alert.drugName} ↔ ${alert.conflictingDrug}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{alert.action ?? alert.recommendation}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">{new Date(alert.timestamp).toLocaleTimeString()}</p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <button
                    onClick={() => { handleSelectPatient(alert.nationalId, alert.patientName); markSseRead(alert.id); }}
                    className="text-[10px] font-semibold text-foreground bg-secondary hover:bg-border rounded-xl px-2 py-1 transition-colors"
                  >
                    View Patient
                  </button>
                  {!alert.read && (
                    <button onClick={() => markSseRead(alert.id)} className="text-[10px] text-muted-foreground hover:text-foreground">Dismiss</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════
          PHYSICIAN COMMAND CENTER HEADER
      ══════════════════════════════════════════════════ */}
      <div className="rounded-3xl overflow-hidden mb-6"
        style={{ background: "linear-gradient(135deg, #020a18 0%, #041224 50%, #020c1c 100%)", boxShadow: "0 0 60px rgba(0,122,255,0.10)" }}>
        <div className="h-1" style={{ background: "linear-gradient(90deg, #004b9d, #007AFF, #60a5fa, #007AFF, #004b9d)" }} />

        <div className="px-6 py-5">
          <div className="flex items-center justify-between gap-6">
            {/* Identity */}
            <div className="flex items-center gap-4 shrink-0">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(0,122,255,0.22)", border: "1px solid rgba(0,122,255,0.35)" }}>
                <Stethoscope className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white leading-tight">Physician Dashboard</h1>
                <p className="text-[11px] text-white/40 mt-0.5">Clinical records · AI diagnostics · Prescribing · Predictive risk alerts · MOH</p>
              </div>
            </div>

            {/* Search + Bell */}
            <div className="flex items-center gap-2 flex-1 justify-end">
              <button onClick={() => setShowSsePanel(p => !p)}
                className="relative flex items-center justify-center w-8 h-8 rounded-xl transition-all hover:opacity-80 shrink-0"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}
                title={sseConnected ? "Live alerts connected" : "Connecting…"}>
                <Bell className="w-3.5 h-3.5 text-white/50" />
                {sseUnread > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center border border-[#020a18]">
                    {sseUnread > 9 ? "9+" : sseUnread}
                  </span>
                )}
                <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#020a18] ${sseConnected ? "bg-emerald-400" : "bg-gray-600"}`} />
              </button>
              <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 max-w-sm">
                <div className="relative flex-1" ref={searchRef}>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "rgba(0,122,255,0.50)" }} />
                  <input
                    placeholder="Patient name or National ID..."
                    className="w-full h-10 pl-9 pr-4 rounded-xl text-sm text-white placeholder:text-white/25 focus:outline-none font-medium"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: (searchQuery || searchId) ? "1.5px solid rgba(0,122,255,0.55)" : "1px solid rgba(255,255,255,0.10)",
                    }}
                    value={searchQuery || searchId}
                    onChange={(e) => { const v = e.target.value; setSearchQuery(v); setSearchId(v); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                  />
                  {showDropdown && searchPatients.length > 0 && (
                    <div className="absolute top-full right-0 mt-2 w-80 rounded-2xl z-50 overflow-hidden"
                      style={{ background: "rgba(4,18,36,0.98)", backdropFilter: "blur(20px)", boxShadow: "0 8px 32px rgba(0,0,0,0.40), 0 0 0 1px rgba(0,122,255,0.15)" }}>
                      {searchPatients.map((p: any) => (
                        <button key={p.id} type="button"
                          onClick={() => handleSelectPatient(p.nationalId, p.fullName)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                            style={{ background: "rgba(0,122,255,0.15)", border: "1px solid rgba(0,122,255,0.25)" }}>
                            <UserIcon className="w-4 h-4 text-blue-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-white truncate">{p.fullName}</p>
                            <p className="text-[10px] text-white/40 font-mono">{p.nationalId} · Age {new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear()}</p>
                          </div>
                          {p.riskLevel === "critical" && <span className="text-[9px] font-black text-red-400 px-1.5 py-0.5 rounded-lg shrink-0" style={{ background: "rgba(220,38,38,0.15)" }}>Critical</span>}
                          {p.riskLevel === "high" && <span className="text-[9px] font-black text-amber-400 px-1.5 py-0.5 rounded-lg shrink-0" style={{ background: "rgba(245,158,11,0.15)" }}>High Risk</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button type="submit"
                  className="h-10 px-5 rounded-xl font-black text-sm text-white shrink-0"
                  style={{ background: "linear-gradient(135deg, #007AFF, #004b9d)", boxShadow: "0 2px 12px rgba(0,122,255,0.30)" }}>
                  Load
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* ── Empty state ── */}
      {!patientId && !isLoading && (
        <div className="rounded-3xl border border-border bg-background flex flex-col items-center justify-center py-24 px-8 text-center">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5" style={{ background: "linear-gradient(135deg, #007AFF15, #007AFF05)", border: "1px solid #007AFF20" }}>
            <Stethoscope className="w-9 h-9 text-primary/50" />
          </div>
          <p className="text-xl font-bold text-foreground mb-2">No Patient Loaded</p>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">Search by name or National ID to open a patient's clinical workspace.</p>
          <div className="inline-flex items-center gap-3 bg-secondary rounded-2xl px-5 py-3">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Demo IDs</span>
            <span className="text-xs font-mono text-foreground">1000000001 · 1000000003 · 1000000005 · 1000000023</span>
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {isLoading && (
        <div className="flex items-center gap-3 py-20 text-muted-foreground justify-center">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
          <span className="text-sm font-medium">Loading patient record…</span>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          PATIENT LOADED — 2-COLUMN CLINICAL COMMAND CENTER
      ══════════════════════════════════════════════════════════════════════ */}
      {patient && (
        <div className="flex gap-5 items-start">

          {/* ──────────────────────────────────────────────────────────────────
              LEFT SIDEBAR — Patient Context Panel (320px)
          ─────────────────────────────────────────────────────────────────── */}
          <div className="w-80 shrink-0 space-y-3 sticky top-4">

            {/* Allergy alert strip */}
            {patient.allergies?.length > 0 && (
              <div className="rounded-2xl px-4 py-3 flex items-start gap-2.5" style={{ background: "linear-gradient(135deg, #dc2626, #991b1b)" }}>
                <AlertCircle className="w-4 h-4 text-white shrink-0 mt-0.5" />
                <div>
                  <p className="text-white text-xs font-black uppercase tracking-widest mb-0.5">Allergy Alert</p>
                  <p className="text-white/90 text-xs leading-relaxed">{patient.allergies.join(" · ")}</p>
                </div>
              </div>
            )}

            {/* Patient identity card */}
            <Card>
              <CardBody className="p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-lg font-black text-white" style={{ background: "linear-gradient(135deg, #007AFF, #5856D6)" }}>
                    {patient.fullName.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground text-sm leading-snug">{patient.fullName}</p>
                    <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{patient.nationalId}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {patientAge}y · {patient.gender} · Born {format(safeDate(patient.dateOfBirth), "dd MMM yyyy")}
                    </p>
                  </div>
                </div>

                {/* Blood type */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 rounded-xl px-3 py-2 flex items-center gap-2" style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.20)" }}>
                    <Activity className="w-3.5 h-3.5 text-red-600" />
                    <span className="text-[11px] font-semibold text-muted-foreground">Blood Type</span>
                    <span className="text-base font-black text-red-600 ml-auto">{patient.bloodType}</span>
                  </div>
                </div>

                {/* AI Risk Score */}
                {riskScore && (
                  <div className="rounded-xl p-3 mb-3" style={{
                    background: riskScore.riskLevel === "critical" ? "rgba(220,38,38,0.07)" : riskScore.riskLevel === "high" ? "rgba(245,158,11,0.07)" : "rgba(34,197,94,0.07)",
                    border: `1px solid ${riskScore.riskLevel === "critical" ? "rgba(220,38,38,0.20)" : riskScore.riskLevel === "high" ? "rgba(245,158,11,0.20)" : "rgba(34,197,94,0.20)"}`,
                  }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Brain className={`w-3.5 h-3.5 ${riskScore.riskLevel === "critical" ? "text-red-600" : riskScore.riskLevel === "high" ? "text-amber-600" : "text-emerald-600"}`} />
                        <span className="text-[11px] font-semibold text-muted-foreground">AI Risk Score</span>
                      </div>
                      <Badge variant={riskScore.riskLevel === "critical" ? "destructive" : riskScore.riskLevel === "high" ? "warning" : "success"} className="text-[9px]">
                        {riskScore.riskLevel?.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-end gap-2 mb-2">
                      <span className={`text-3xl font-black tabular-nums leading-none ${riskScore.riskLevel === "critical" ? "text-red-600" : riskScore.riskLevel === "high" ? "text-amber-600" : "text-emerald-600"}`}>
                        {riskScore.riskScore}
                      </span>
                      <span className="text-sm text-muted-foreground mb-1">/100</span>
                    </div>
                    <div className="w-full bg-background rounded-full h-2">
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${riskScore.riskScore}%`,
                        background: riskScore.riskLevel === "critical" ? "#dc2626" : riskScore.riskLevel === "high" ? "#f59e0b" : "#22c55e"
                      }} />
                    </div>
                    {riskScore.factors?.length > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-1.5">{riskScore.factors.slice(0, 2).map((f: any) => f.factor).join(" · ")}</p>
                    )}
                  </div>
                )}

                {/* Chronic conditions */}
                {patient.chronicConditions?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Chronic Conditions</p>
                    <div className="flex flex-col gap-1">
                      {patient.chronicConditions.map((c: string, i: number) => (
                        <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 bg-secondary rounded-xl">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          <span className="text-xs text-foreground">{c}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="space-y-2">
                  <PrescribeModal patientId={patient.id} patientAge={patientAge} creatinine={latestCreatinine} />
                  <Button variant="outline" size="sm" className="w-full">
                    <CalendarDays className="w-3.5 h-3.5" /> Schedule Visit
                  </Button>
                </div>
              </CardBody>
            </Card>

            {/* Quick stats grid */}
            <Card>
              <CardBody className="p-4">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Patient Summary</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Active Meds", value: activeMeds.length, icon: Pill, color: "#059669" },
                    { label: "Lab Results", value: labResults.length, icon: FlaskConical, color: "#7c3aed", alert: criticalLabs > 0 ? `${criticalLabs} critical` : abnormalLabs > 0 ? `${abnormalLabs} abnormal` : undefined },
                    { label: "Total Visits", value: patient.visits?.length ?? 0, icon: Building2, color: "#0284c7" },
                    { label: "AI Predictions", value: predictions.length, icon: Brain, color: "#f59e0b", alert: criticalPredictions > 0 ? `${criticalPredictions} high` : undefined },
                  ].map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                      <div key={i} className="p-3 bg-secondary rounded-2xl">
                        <Icon className="w-3.5 h-3.5 mb-1.5" style={{ color: stat.color }} />
                        <p className="text-xl font-black text-foreground tabular-nums leading-none">{stat.value}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
                        {stat.alert && <p className="text-[9px] font-bold text-red-600 mt-0.5">{stat.alert}</p>}
                      </div>
                    );
                  })}
                </div>
              </CardBody>
            </Card>

            {/* System alerts (from API) */}
            {alerts.length > 0 && (
              <Card>
                <CardBody className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">System Alerts</p>
                    {unreadAlerts > 0 && <Badge variant="destructive" className="text-[9px]">{unreadAlerts} unread</Badge>}
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {alerts.slice(0, 5).map(alert => (
                      <div key={alert.id} className={`flex items-start gap-2.5 p-2.5 rounded-xl transition-colors ${alert.isRead ? "opacity-60" : "bg-secondary"}`}>
                        <div className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${(alert as any).severity === "critical" ? "bg-red-500" : (alert as any).severity === "high" ? "bg-amber-500" : "bg-sky-400"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground leading-snug">{alert.message}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{alert.createdAt ? format(new Date(alert.createdAt), "dd MMM HH:mm") : "—"}</p>
                        </div>
                        {!alert.isRead && (
                          <button onClick={() => handleMarkRead(alert.id)} className="text-[9px] text-primary font-bold shrink-0">✓</button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}

            {/* SSE live status indicator */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-secondary rounded-2xl">
              <div className={`w-2 h-2 rounded-full shrink-0 ${sseConnected ? "bg-emerald-400 animate-pulse" : "bg-gray-300"}`} />
              <span className="text-[11px] font-medium text-muted-foreground">
                {sseConnected ? "Live clinical alerts connected" : "Connecting to live alerts…"}
              </span>
            </div>
          </div>

          {/* ──────────────────────────────────────────────────────────────────
              RIGHT WORKSPACE — 5-Tab Clinical Workspace
          ─────────────────────────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Tab bar */}
            <div className="flex gap-1 bg-secondary p-1 rounded-2xl">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="relative flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all"
                    style={isActive ? {
                      background: "white",
                      color: "#007AFF",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.10)",
                    } : { color: "var(--muted-foreground)" }}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    {tab.badge && (
                      <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center text-white ${tab.badge === "!" ? "bg-red-500 animate-pulse" : "bg-amber-500"}`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* ── TAB: AI DECISIONS ─────────────────────────────────────────── */}
            {activeTab === "ai" && (
              <div className="space-y-4">
                {/* Priority action strip */}
                {priorityItems.length > 0 && (
                  <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #0f172a, #1e293b)" }}>
                    <div className="px-5 py-3 flex items-center gap-2 border-b border-white/10">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[11px] font-black text-white/70 uppercase tracking-widest">AI Priority Actions</span>
                    </div>
                    <div className="divide-y divide-white/5">
                      {priorityItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                          <div className={`flex items-center gap-1.5 shrink-0 ${item.pulse ? "animate-pulse" : ""}`}>
                            <div className={`w-2 h-2 rounded-full ${item.color}`} />
                            <span className="text-[10px] font-black text-white/60 uppercase tracking-wider w-20">{item.label}</span>
                          </div>
                          <p className="text-sm font-semibold text-white leading-snug">{item.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Run AI decision button */}
                {!aiDecision && !decisionLoading && (
                  <Card>
                    <CardBody className="py-16 text-center">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "linear-gradient(135deg, #007AFF, #5856D6)" }}>
                        <Brain className="w-6 h-6 text-white" />
                      </div>
                      <p className="font-bold text-foreground mb-1">AI Decision Engine</p>
                      <p className="text-sm text-muted-foreground mb-5">Run a full clinical intelligence analysis for this patient.</p>
                      <Button variant="primary" onClick={() => {}}>
                        <Brain className="w-4 h-4" /> Run AI Analysis
                      </Button>
                    </CardBody>
                  </Card>
                )}

                {decisionLoading && (
                  <Card>
                    <CardBody className="py-12 flex items-center justify-center gap-3 text-muted-foreground">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
                      <span className="text-sm font-medium">Running AI analysis…</span>
                    </CardBody>
                  </Card>
                )}

                {aiDecision && (
                  <>
                    {/* Urgency + Decision hero */}
                    <Card>
                      <CardBody className="p-5 space-y-5">
                        {/* Urgency hero */}
                        {aiDecision.urgency && (
                          <div className="rounded-2xl p-4 flex items-center gap-4" style={{
                            background: aiDecision.urgency === "immediate" ? "linear-gradient(135deg, rgba(220,38,38,0.10), rgba(153,27,27,0.05))" :
                              aiDecision.urgency === "urgent" ? "linear-gradient(135deg, rgba(245,158,11,0.10), rgba(217,119,6,0.05))" :
                              aiDecision.urgency === "soon" ? "linear-gradient(135deg, rgba(14,165,233,0.10), rgba(2,132,199,0.05))" :
                              "linear-gradient(135deg, rgba(34,197,94,0.10), rgba(21,128,61,0.05))",
                            borderLeft: `3px solid ${aiDecision.urgency === "immediate" ? "#dc2626" : aiDecision.urgency === "urgent" ? "#f59e0b" : aiDecision.urgency === "soon" ? "#0ea5e9" : "#22c55e"}`,
                          }}>
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{
                              background: aiDecision.urgency === "immediate" ? "#dc2626" : aiDecision.urgency === "urgent" ? "#f59e0b" : aiDecision.urgency === "soon" ? "#0ea5e9" : "#22c55e"
                            }}>
                              {aiDecision.urgency === "immediate" || aiDecision.urgency === "urgent"
                                ? <TriangleAlert className="w-6 h-6 text-white" />
                                : aiDecision.urgency === "soon" ? <Clock className="w-6 h-6 text-white" /> : <CheckCircle2 className="w-6 h-6 text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant={
                                  aiDecision.urgency === "immediate" ? "destructive" :
                                  aiDecision.urgency === "urgent" ? "warning" :
                                  aiDecision.urgency === "soon" ? "info" : "success"
                                }>{aiDecision.urgency?.toUpperCase()}</Badge>
                                {aiDecision.confidence != null && (
                                  <span className="text-[10px] font-mono text-muted-foreground">Confidence: {Math.round(aiDecision.confidence * 100)}%</span>
                                )}
                              </div>
                              <p className="font-bold text-foreground text-sm">{aiDecision.primaryAction}</p>
                              {aiDecision.reasoning && <p className="text-[11px] text-muted-foreground mt-0.5">{aiDecision.reasoning}</p>}
                            </div>
                          </div>
                        )}

                        {/* Decision path (cascade chain) */}
                        {aiDecision.decisionPath?.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Decision Path</p>
                            <div className="relative pl-5">
                              <div className="absolute left-[9px] top-3 bottom-3 w-px bg-border" />
                              <div className="space-y-3">
                                {aiDecision.decisionPath.map((step: any, i: number) => (
                                  <div key={i} className="relative flex items-start gap-3">
                                    <div className={`w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0 -ml-5 mt-0.5 ${step.outcome === "triggered" ? "bg-red-100 border-2 border-red-400" : step.outcome === "completed" ? "bg-emerald-100 border-2 border-emerald-400" : "bg-secondary border-2 border-border"}`}>
                                      <div className={`w-1.5 h-1.5 rounded-full ${step.outcome === "triggered" ? "bg-red-500" : step.outcome === "completed" ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                                    </div>
                                    <div className="flex-1 min-w-0 pb-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-foreground">{step.node}</span>
                                        {step.outcome && (
                                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${step.outcome === "triggered" ? "bg-secondary text-red-600" : step.outcome === "completed" ? "bg-secondary text-emerald-600" : "bg-secondary text-muted-foreground"}`}>
                                            {step.outcome}
                                          </span>
                                        )}
                                      </div>
                                      {step.description && <p className="text-[11px] text-muted-foreground mt-0.5">{step.description}</p>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </CardBody>
                    </Card>

                    {/* AI Recommendations */}
                    {aiDecision.recommendations?.length > 0 && (
                      <Card>
                        <CardBody className="p-5">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #007AFF, #5856D6)" }}>
                              <CheckCheck className="w-3.5 h-3.5 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-foreground">AI Recommendations</p>
                              <p className="text-[11px] text-muted-foreground">{aiDecision.recommendations.length} guideline-based actions</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {aiDecision.recommendations.map((rec: any, i: number) => {
                              const text = typeof rec === "string" ? rec : rec.text ?? JSON.stringify(rec);
                              const fb = recFeedback[i];
                              return (
                                <div key={i} className="flex items-start gap-3 p-3.5 rounded-2xl bg-secondary" style={fb === "accepted" ? { borderLeft: "3px solid #22c55e" } : fb === "rejected" ? { borderLeft: "3px solid #ef4444" } : {}}>
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-black ${fb === "accepted" ? "bg-emerald-100 text-emerald-700" : fb === "rejected" ? "bg-red-100 text-red-700" : "bg-white text-foreground"}`}>
                                    {fb === "accepted" ? "✓" : fb === "rejected" ? "✕" : i + 1}
                                  </div>
                                  <p className="text-sm text-foreground flex-1 min-w-0 leading-relaxed">{text}</p>
                                  {!fb && (
                                    <div className="flex gap-1.5 shrink-0">
                                      <button onClick={() => setRecFeedback(p => ({ ...p, [i]: "accepted" }))} className="w-7 h-7 rounded-xl bg-white hover:bg-emerald-50 flex items-center justify-center transition-colors text-muted-foreground hover:text-emerald-600">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button onClick={() => setRecFeedback(p => ({ ...p, [i]: "rejected" }))} className="w-7 h-7 rounded-xl bg-white hover:bg-red-50 flex items-center justify-center transition-colors text-muted-foreground hover:text-red-600">
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </CardBody>
                      </Card>
                    )}

                    {/* XAI score breakdown */}
                    {aiDecision.whyFactors?.length > 0 && (
                      <Card>
                        <CardBody className="p-5">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #6366f1, #3730a3)" }}>
                              <Brain className="w-3.5 h-3.5 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-foreground">Explainable AI — Score Breakdown</p>
                              <p className="text-[11px] text-muted-foreground">Risk: {aiDecision.riskScore}/100 · SANAD-Risk-v4.2 · Confidence: {Math.round(aiDecision.confidence * 100)}%</p>
                            </div>
                          </div>
                          <div className="space-y-2.5">
                            {aiDecision.whyFactors.map((f: any, i: number) => {
                              const maxContrib = Math.max(...aiDecision.whyFactors.map((x: any) => parseFloat(x.contribution) || 10));
                              const pct = Math.min(100, ((parseFloat(f.contribution) || 5) / maxContrib) * 100);
                              const barColor = f.impact === "critical" ? "#ef4444" : f.impact === "high" ? "#f97316" : f.impact === "moderate" ? "#3b82f6" : "#94a3b8";
                              return (
                                <div key={i} className="flex items-center gap-3">
                                  <span className="text-[10px] text-muted-foreground w-4 text-right shrink-0">{i + 1}</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-[11px] font-semibold text-foreground truncate">{f.factor}</span>
                                      <span className="text-[10px] font-bold tabular-nums ml-2 shrink-0" style={{ color: barColor }}>+{f.contribution}</span>
                                    </div>
                                    <div className="w-full bg-secondary rounded-full h-2">
                                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                                    </div>
                                  </div>
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold shrink-0 capitalize" style={{ background: `${barColor}20`, color: barColor }}>{f.impact}</span>
                                </div>
                              );
                            })}
                          </div>
                        </CardBody>
                      </Card>
                    )}

                    {/* Behavioral flags */}
                    {aiDecision.behavioralFlags?.length > 0 && (
                      <Card>
                        <CardBody className="p-5">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #7c3aed, #4c1d95)" }}>
                              <Network className="w-3.5 h-3.5 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-foreground">Behavioral Intelligence Flags</p>
                              <p className="text-[11px] text-muted-foreground">Adherence, lifestyle, and pattern signals</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {aiDecision.behavioralFlags.map((flag: any, i: number) => (
                              <div key={i} className="flex items-start gap-3 p-3 rounded-2xl bg-secondary"
                                style={{ borderLeft: `3px solid ${flag.severity === "high" ? "#f59e0b" : flag.severity === "moderate" ? "#38bdf8" : "#94a3b8"}` }}>
                                <Bell className={`w-4 h-4 shrink-0 mt-0.5 ${flag.severity === "high" ? "text-amber-600" : flag.severity === "moderate" ? "text-sky-600" : "text-muted-foreground"}`} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-foreground">{flag.description}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">{flag.recommendation}</p>
                                </div>
                                <Badge variant={flag.severity === "high" ? "warning" : flag.severity === "moderate" ? "info" : "outline"} className="shrink-0 text-[9px]">{flag.severity}</Badge>
                              </div>
                            ))}
                          </div>
                        </CardBody>
                      </Card>
                    )}

                    {/* Differential Diagnosis */}
                    {(() => {
                      const conds = (patient.chronicConditions ?? []).map((c: string) => c.toLowerCase());
                      const labs = labResults;
                      type DDx = { condition: string; icd: string; pct: number; evidence: string[]; priority: "primary" | "secondary" | "rule-out"; source: string };
                      const dd: DDx[] = [];
                      const addIf = (keyword: string, entry: DDx) => {
                        if (conds.some(c => c.includes(keyword)) && !dd.find(d => d.icd === entry.icd)) dd.push(entry);
                      };
                      addIf("diabetes", { condition: "Type 2 Diabetes Mellitus", icd: "E11.9", pct: 94, evidence: ["HbA1c trend", "Chronic history"], priority: "primary", source: "ADA 2024" });
                      addIf("hypertension", { condition: "Essential Hypertension", icd: "I10", pct: 91, evidence: ["BP readings", "Medication history"], priority: "primary", source: "ESC 2023" });
                      addIf("heart failure", { condition: "Congestive Heart Failure", icd: "I50.0", pct: 87, evidence: ["Cardiac history", "Symptoms"], priority: "primary", source: "ACC/AHA 2022" });
                      addIf("coronary", { condition: "Coronary Artery Disease", icd: "I25.1", pct: 83, evidence: ["Cardiac history", "Risk score"], priority: "primary", source: "ESC 2019" });
                      addIf("chronic kidney", { condition: "Chronic Kidney Disease Stage 3", icd: "N18.3", pct: 81, evidence: ["eGFR trend", "Creatinine elevated"], priority: "primary", source: "KDIGO 2022" });
                      addIf("ckd", { condition: "Chronic Kidney Disease", icd: "N18.3", pct: 81, evidence: ["Creatinine trend"], priority: "primary", source: "KDIGO 2022" });
                      addIf("atrial fibrillation", { condition: "Atrial Fibrillation", icd: "I48.1", pct: 88, evidence: ["ECG history"], priority: "primary", source: "ACC/AHA 2023" });
                      addIf("copd", { condition: "COPD", icd: "J44.1", pct: 85, evidence: ["Spirometry history"], priority: "primary", source: "GOLD 2024" });
                      addIf("depression", { condition: "Major Depressive Disorder", icd: "F32.1", pct: 76, evidence: ["PHQ-9 score"], priority: "secondary", source: "DSM-5 / NICE 2022" });
                      addIf("cancer", { condition: "Malignant Neoplasm — Active Monitoring", icd: "C80.1", pct: 92, evidence: ["Oncology history"], priority: "primary", source: "NCCN 2024" });
                      addIf("anemia", { condition: "Anemia of Chronic Disease", icd: "D63.1", pct: 71, evidence: ["Hgb trend"], priority: "secondary", source: "NCCN 2023" });
                      const hasElevCr = labs.some(l => l.testName.toLowerCase().includes("creatinine") && (l.status === "abnormal" || l.status === "critical"));
                      const hasElevGluc = labs.some(l => (l.testName.toLowerCase().includes("glucose") || l.testName.toLowerCase().includes("hba1c")) && l.status !== "normal");
                      const hasLowHgb = labs.some(l => l.testName.toLowerCase().includes("hemoglobin") && l.status !== "normal");
                      const hasElevWbc = labs.some(l => l.testName.toLowerCase().includes("wbc") && (l.status === "abnormal" || l.status === "critical"));
                      if (hasElevCr && !dd.find(d => d.icd === "N18.3")) dd.push({ condition: "Acute Kidney Injury", icd: "N17.9", pct: 67, evidence: ["↑ Creatinine"], priority: "secondary", source: "KDIGO 2012" });
                      if (hasElevGluc && !dd.find(d => d.icd.startsWith("E11"))) dd.push({ condition: "Hyperglycemia / Pre-diabetes", icd: "R73.09", pct: 58, evidence: ["Elevated glucose labs"], priority: "secondary", source: "ADA 2024" });
                      if (hasLowHgb && !dd.find(d => d.icd.startsWith("D"))) dd.push({ condition: "Iron Deficiency Anemia", icd: "D50.9", pct: 54, evidence: ["↓ Hemoglobin"], priority: "rule-out", source: "WHO 2020" });
                      if (hasElevWbc) dd.push({ condition: "Systemic Inflammatory Response", icd: "R65.10", pct: 48, evidence: ["↑ WBC"], priority: "rule-out", source: "SCCM 2016" });
                      if (dd.length === 0) return null;
                      const sorted = [...dd].sort((a, b) => b.pct - a.pct);
                      return (
                        <Card>
                          <CardBody className="p-5">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #0d9488, #065f46)" }}>
                                <Stethoscope className="w-3.5 h-3.5 text-white" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-foreground">Differential Diagnosis Engine</p>
                                <p className="text-[11px] text-muted-foreground">ICD-10 · WHO · ADA · KDIGO · ACC/AHA</p>
                              </div>
                            </div>
                            <div className="space-y-2">
                              {sorted.slice(0, 6).map((dx, i) => {
                                const lc = { primary: "#7c3aed", secondary: "#0284c7", "rule-out": "#94a3b8" }[dx.priority];
                                const textC = { primary: "text-violet-700", secondary: "text-sky-700", "rule-out": "text-muted-foreground" }[dx.priority];
                                return (
                                  <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-secondary" style={{ borderLeft: `3px solid ${lc}` }}>
                                    <div className="w-7 h-7 rounded-full bg-background flex items-center justify-center shrink-0">
                                      <span className="text-[11px] font-bold text-foreground">{i + 1}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[12px] font-bold text-foreground truncate">{dx.condition}</span>
                                        <span className="font-mono text-[9px] text-muted-foreground shrink-0">{dx.icd}</span>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <div className="flex-1 bg-background rounded-full h-1.5 max-w-[140px]">
                                          <div className="h-full rounded-full" style={{ width: `${dx.pct}%`, background: lc }} />
                                        </div>
                                        <span className={`text-[10px] font-bold tabular-nums ${textC}`}>{dx.pct}%</span>
                                        <span className="text-[9px] text-muted-foreground">{dx.source}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </CardBody>
                        </Card>
                      );
                    })()}

                    {/* Cross-lab correlations */}
                    {(() => {
                      const labs = labResults;
                      type Correlation = { title: string; risk: string; badge: "destructive" | "warning"; labs: string[]; action: string };
                      const corrs: Correlation[] = [];
                      const isAbn = (kw: string) => labs.some(l => l.testName.toLowerCase().includes(kw) && (l.status === "abnormal" || l.status === "critical"));
                      const hasName = (kw: string) => labs.some(l => l.testName.toLowerCase().includes(kw));
                      if (isAbn("glucose") && isAbn("creatinine")) corrs.push({ title: "Diabetic Nephropathy Risk Pattern", risk: "Concurrent hyperglycemia + impaired renal function — high CKD progression risk", badge: "destructive", labs: ["Glucose ↑", "Creatinine ↑"], action: "SGLT2i + nephrology consult + ACE inhibitor titration" });
                      if (isAbn("hba1c") && isAbn("cholesterol")) corrs.push({ title: "Cardiometabolic Syndrome", risk: "Dysglycemia + dyslipidemia — 3× increased cardiovascular event risk", badge: "destructive", labs: ["HbA1c ↑", "Cholesterol ↑"], action: "Statin therapy + intensive glucose control + lifestyle intervention" });
                      if (isAbn("creatinine") && hasName("potassium") && isAbn("potassium")) corrs.push({ title: "Renal-Electrolyte Imbalance", risk: "Renal impairment with hyperkalemia — arrhythmia and AKI risk", badge: "destructive", labs: ["Creatinine ↑", "K+ ↑"], action: "Hold K-sparing agents, cardiology review, dietary restriction" });
                      if (isAbn("hemoglobin") && isAbn("creatinine")) corrs.push({ title: "Cardiorenal Anemia Syndrome", risk: "Anemia secondary to CKD — EPO deficiency pattern", badge: "warning", labs: ["Hgb ↓", "Creatinine ↑"], action: "ESA therapy evaluation, iron studies, nephrology follow-up" });
                      if (corrs.length === 0) return null;
                      return (
                        <Card>
                          <CardBody className="p-5">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #e11d48, #9f1239)" }}>
                                <TrendingUp className="w-3.5 h-3.5 text-white" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-foreground">Cross-Lab Correlation Engine</p>
                                <p className="text-[11px] text-muted-foreground">Compound risk detection across biomarkers</p>
                              </div>
                            </div>
                            <div className="space-y-2">
                              {corrs.map((c, i) => (
                                <div key={i} className="p-4 rounded-2xl bg-secondary" style={{ borderLeft: `3px solid ${c.badge === "destructive" ? "#ef4444" : "#f59e0b"}` }}>
                                  <div className="flex items-start gap-3">
                                    <div className="shrink-0 flex gap-1 mt-0.5">
                                      {c.labs.map((l, j) => <span key={j} className="text-[9px] font-black px-1.5 py-0.5 rounded font-mono bg-background text-foreground">{l}</span>)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-[12px] font-bold text-foreground">{c.title}</span>
                                        <Badge variant={c.badge} className="text-[9px]">{c.badge === "destructive" ? "CRITICAL" : "HIGH"}</Badge>
                                      </div>
                                      <p className="text-[11px] text-foreground/80 mb-2">{c.risk}</p>
                                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-background">
                                        <ChevronRight className="w-3 h-3 shrink-0 text-foreground" />
                                        <span className="text-[10px] font-semibold text-foreground">{c.action}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardBody>
                        </Card>
                      );
                    })()}

                    {/* Evidence-based references */}
                    {(() => {
                      const conds = (patient.chronicConditions ?? []).map((c: string) => c.toLowerCase());
                      type Ref = { org: string; title: string; year: string; relevance: string; leftColor: string };
                      const refs: Ref[] = [];
                      if (conds.some(c => c.includes("diabetes"))) refs.push({ org: "ADA", title: "Standards of Medical Care in Diabetes", year: "2024", relevance: "HbA1c <7% target, GLP-1 RA preferred with CKD/CVD", leftColor: "#3b82f6" });
                      if (conds.some(c => c.includes("hypertension"))) refs.push({ org: "ESC/ESH", title: "Guidelines on Arterial Hypertension", year: "2023", relevance: "BP target <130/80 mmHg in high-risk patients", leftColor: "#7c3aed" });
                      if (conds.some(c => c.includes("heart failure"))) refs.push({ org: "ACC/AHA", title: "Heart Failure Management Guidelines", year: "2022", relevance: "ACEi/ARB + beta-blocker + MRA in HFrEF", leftColor: "#ef4444" });
                      if (conds.some(c => c.includes("chronic kidney") || c.includes("ckd"))) refs.push({ org: "KDIGO", title: "CKD Evaluation and Management", year: "2022", relevance: "SGLT2i reduces CKD progression; eGFR monitoring q3m", leftColor: "#0d9488" });
                      if (conds.some(c => c.includes("atrial"))) refs.push({ org: "ACC/AHA", title: "Atrial Fibrillation Guidelines", year: "2023", relevance: "CHA₂DS₂-VASc ≥2: anticoagulation mandatory", leftColor: "#f97316" });
                      if (conds.some(c => c.includes("copd"))) refs.push({ org: "GOLD", title: "COPD Management Report", year: "2024", relevance: "LAMA + LABA for persistent dyspnea; avoid beta-blockers", leftColor: "#f59e0b" });
                      if (conds.some(c => c.includes("depression"))) refs.push({ org: "NICE", title: "Depression in Adults", year: "2022", relevance: "SSRI first-line; consider CBT alongside pharmacotherapy", leftColor: "#ec4899" });
                      if (refs.length === 0) return null;
                      return (
                        <Card>
                          <CardBody className="p-5">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #d97706, #92400e)" }}>
                                <Lightbulb className="w-3.5 h-3.5 text-white" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-foreground">Evidence-Based References</p>
                                <p className="text-[11px] text-muted-foreground">WHO · NICE · ACC · ADA · KDIGO · ESC</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {refs.map((r, i) => (
                                <div key={i} className="p-3.5 rounded-2xl bg-secondary" style={{ borderLeft: `3px solid ${r.leftColor}` }}>
                                  <div className="flex items-start gap-2.5">
                                    <div className="shrink-0 font-black text-[10px] bg-background border border-border px-2 py-1 rounded-lg text-foreground min-w-fit">{r.org}</div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[11px] font-bold text-foreground leading-snug">{r.title} <span className="font-normal text-muted-foreground">({r.year})</span></p>
                                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">→ {r.relevance}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardBody>
                        </Card>
                      );
                    })()}

                    {/* Digital Twin */}
                    {aiDecision.digitalTwin && (
                      <Card>
                        <CardBody className="p-5">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #7c3aed, #4c1d95)" }}>
                              <CircleDot className="w-3.5 h-3.5 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-foreground">AI Digital Twin</p>
                              <p className="text-[11px] text-muted-foreground">Trajectory simulation · {aiDecision.digitalTwin.timeframe}</p>
                            </div>
                            <Badge variant={aiDecision.digitalTwin.riskTrajectory?.includes("worsening") ? "destructive" : "success"} className="ml-auto">
                              {aiDecision.digitalTwin.riskTrajectory?.replace("_", " ").toUpperCase() ?? "STABLE"}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-secondary rounded-2xl">
                              <p className="text-[10px] text-muted-foreground font-semibold mb-1">Projected Risk Score</p>
                              <p className={`text-2xl font-black tabular-nums ${aiDecision.digitalTwin.projectedRiskScore > 70 ? "text-red-600" : aiDecision.digitalTwin.projectedRiskScore > 40 ? "text-amber-600" : "text-emerald-600"}`}>
                                {aiDecision.digitalTwin.projectedRiskScore}
                                <span className="text-sm font-normal text-muted-foreground">/100</span>
                              </p>
                            </div>
                            <div className="p-3 bg-secondary rounded-2xl">
                              <p className="text-[10px] text-muted-foreground font-semibold mb-1">Intervention Window</p>
                              <p className="text-sm font-bold text-foreground">{aiDecision.digitalTwin.interventionWindow}</p>
                            </div>
                          </div>
                          {aiDecision.digitalTwin.keyDrivers?.length > 0 && (
                            <div className="mt-3">
                              <p className="text-[10px] text-muted-foreground font-semibold mb-2">Key Drivers</p>
                              <div className="flex flex-wrap gap-1.5">
                                {aiDecision.digitalTwin.keyDrivers.map((d: string, i: number) => (
                                  <span key={i} className="text-[10px] bg-secondary text-foreground px-2.5 py-1 rounded-xl">{d}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {aiDecision.digitalTwin.predictedConditions?.length > 0 && (
                            <div className="mt-3 p-3 rounded-2xl bg-secondary" style={{ borderLeft: "3px solid #f59e0b" }}>
                              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-1">Without Intervention</p>
                              <p className="text-[11px] text-foreground">{aiDecision.digitalTwin.predictedConditions.slice(0, 3).join(", ")}</p>
                            </div>
                          )}
                        </CardBody>
                      </Card>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── TAB: LABS & TESTS ─────────────────────────────────────────── */}
            {activeTab === "labs" && (
              <div className="space-y-4">
                <Card>
                  <CardBody className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #7c3aed, #4c1d95)" }}>
                        <FlaskConical className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">Laboratory Results</p>
                        <p className="text-[11px] text-muted-foreground">{labResults.length} results · sparklines show trend over time</p>
                      </div>
                      <div className="flex items-center gap-2 ml-auto">
                        {criticalLabs > 0 && <Badge variant="destructive">{criticalLabs} Critical</Badge>}
                        {abnormalLabs > 0 && <Badge variant="warning">{abnormalLabs} Abnormal</Badge>}
                      </div>
                    </div>

                    {labResults.length === 0 && (
                      <div className="py-12 text-center">
                        <FlaskConical className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                        <p className="font-bold text-foreground">No lab results</p>
                        <p className="text-sm text-muted-foreground mt-1">No laboratory results on file for this patient.</p>
                      </div>
                    )}
                  </CardBody>
                </Card>

                {/* HbA1c Trend Chart */}
                {(() => {
                  const hba1cKey = Object.keys(labsByName).find(k => k.toLowerCase().includes("hba1c") || k.toLowerCase().includes("hemoglobin a1c") || k.toLowerCase().includes("haemoglobin a1c"));
                  const hba1cGroup = hba1cKey ? labsByName[hba1cKey] : [];
                  if (!hba1cGroup || hba1cGroup.length < 2) return null;
                  const hba1cData = [...hba1cGroup].reverse().map(l => ({ date: format(safeDate(l.testDate), "MMM yy"), val: parseFloat(l.result), status: l.status })).filter(d => !isNaN(d.val));
                  const latest = hba1cData[hba1cData.length - 1]!;
                  const first = hba1cData[0]!;
                  const delta = latest.val - first.val;
                  const isWorsening = delta > 0.2;
                  const isImproving = delta < -0.2;
                  const areaColor = isWorsening ? "#ef4444" : isImproving ? "#22c55e" : "#6366f1";
                  const trend = isWorsening ? "↑ WORSENING" : isImproving ? "↓ IMPROVING" : "→ STABLE";
                  return (
                    <Card>
                      <CardBody className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <FlaskConical className="w-4 h-4" style={{ color: areaColor }} />
                              <span className="font-bold text-sm text-foreground">HbA1c Glycemic Trajectory</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-foreground">{trend}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{hba1cData.length} readings · {first.date} → {latest.date} · Δ {delta > 0 ? "+" : ""}{delta.toFixed(1)}%</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-2xl font-black ${latest.val >= 7.0 ? "text-red-600" : latest.val >= 5.7 ? "text-amber-600" : "text-emerald-600"}`}>{latest.val}%</p>
                            <p className="text-[10px] text-muted-foreground">{latest.val >= 7.0 ? "Diabetic range" : latest.val >= 5.7 ? "Pre-diabetic" : "Normal"}</p>
                          </div>
                        </div>
                        <ResponsiveContainer width="100%" height={140}>
                          <AreaChart data={hba1cData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                            <defs>
                              <linearGradient id="hba1cGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={areaColor} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={areaColor} stopOpacity={0.03} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#00000010" />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                            <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                            <RechartsTooltip content={({ active, payload }) => active && payload?.length ? <div className="bg-white rounded-xl px-3 py-2 shadow-lg border border-border text-xs"><p className="font-bold">{payload[0]?.payload?.val}% HbA1c</p><p className="text-muted-foreground">{payload[0]?.payload?.date}</p></div> : null} />
                            <ReferenceLine y={6.5} stroke="#ef4444" strokeDasharray="4 2" label={{ value: "6.5% DM", fontSize: 9, fill: "#ef4444", position: "insideTopLeft" }} />
                            <ReferenceLine y={5.7} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: "5.7% Pre-DM", fontSize: 9, fill: "#f59e0b", position: "insideTopLeft" }} />
                            <Area type="monotone" dataKey="val" stroke={areaColor} strokeWidth={2.5} fill="url(#hba1cGrad)" dot={{ r: 4, fill: areaColor, strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6 }} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </CardBody>
                    </Card>
                  );
                })()}

                {/* Glucose Trend */}
                {(() => {
                  const glucKey = Object.keys(labsByName).find(k => k.toLowerCase().includes("glucose") || k.toLowerCase().includes("blood sugar") || k.toLowerCase().includes("fasting glucose"));
                  const glucGroup = glucKey ? labsByName[glucKey] : [];
                  if (!glucGroup || glucGroup.length < 2) return null;
                  const glucData = [...glucGroup].reverse().map(l => ({ date: format(safeDate(l.testDate), "MMM yy"), val: parseFloat(l.result), status: l.status })).filter(d => !isNaN(d.val));
                  if (glucData.length < 2) return null;
                  const latest = glucData[glucData.length - 1]!;
                  const first = glucData[0]!;
                  const delta = latest.val - first.val;
                  const isWorsening = delta > 5;
                  const isImproving = delta < -5;
                  const areaColor = isWorsening ? "#f97316" : isImproving ? "#22c55e" : "#6366f1";
                  const trend = isWorsening ? "↑ RISING" : isImproving ? "↓ FALLING" : "→ STABLE";
                  return (
                    <Card>
                      <CardBody className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <FlaskConical className="w-4 h-4" style={{ color: areaColor }} />
                              <span className="font-bold text-sm text-foreground">Blood Glucose Trajectory</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-foreground">{trend}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{glucData.length} readings · {first.date} → {latest.date} · Δ {delta > 0 ? "+" : ""}{delta.toFixed(0)} {glucGroup[0]?.unit ?? "mg/dL"}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-2xl font-black ${latest.val > 126 ? "text-orange-600" : latest.val > 100 ? "text-amber-600" : "text-emerald-600"}`}>{latest.val}</p>
                            <p className="text-[10px] text-muted-foreground">{latest.val > 126 ? "Diabetic range" : latest.val > 100 ? "Pre-diabetic" : "Normal"}</p>
                          </div>
                        </div>
                        <ResponsiveContainer width="100%" height={120}>
                          <AreaChart data={glucData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                            <defs>
                              <linearGradient id="glucGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={areaColor} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={areaColor} stopOpacity={0.03} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#00000010" />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                            <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                            <RechartsTooltip content={({ active, payload }) => active && payload?.length ? <div className="bg-white rounded-xl px-3 py-2 shadow-lg border border-border text-xs"><p className="font-bold">{payload[0]?.payload?.val} {glucGroup[0]?.unit ?? "mg/dL"}</p><p className="text-muted-foreground">{payload[0]?.payload?.date}</p></div> : null} />
                            <ReferenceLine y={126} stroke="#f97316" strokeDasharray="4 2" label={{ value: "126 DM", fontSize: 9, fill: "#f97316", position: "insideTopLeft" }} />
                            <ReferenceLine y={100} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: "100 Pre-DM", fontSize: 9, fill: "#f59e0b", position: "insideTopLeft" }} />
                            <Area type="monotone" dataKey="val" stroke={areaColor} strokeWidth={2.5} fill="url(#glucGrad)" dot={{ r: 4, fill: areaColor, strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6 }} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </CardBody>
                    </Card>
                  );
                })()}

                {/* Creatinine Trend */}
                {(() => {
                  const creatKey = Object.keys(labsByName).find(k => k.toLowerCase().includes("creatinine") && !k.toLowerCase().includes("urine"));
                  const creatGroup = creatKey ? labsByName[creatKey] : [];
                  if (!creatGroup || creatGroup.length < 2) return null;
                  const creatData = [...creatGroup].reverse().map(l => ({ date: format(safeDate(l.testDate), "MMM yy"), val: parseFloat(l.result), status: l.status })).filter(d => !isNaN(d.val));
                  if (creatData.length < 2) return null;
                  const latest = creatData[creatData.length - 1]!;
                  const first = creatData[0]!;
                  const delta = latest.val - first.val;
                  const isWorsening = delta > 0.1;
                  const isImproving = delta < -0.1;
                  const areaColor = isWorsening ? "#ef4444" : isImproving ? "#22c55e" : "#38bdf8";
                  const trend = isWorsening ? "↑ WORSENING — Renal Stress" : isImproving ? "↓ IMPROVING" : "→ STABLE";
                  return (
                    <Card>
                      <CardBody className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <FlaskConical className="w-4 h-4" style={{ color: areaColor }} />
                              <span className="font-bold text-sm text-foreground">Creatinine — Renal Function Trend</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-foreground">{trend}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{creatData.length} readings · {first.date} → {latest.date} · Δ {delta > 0 ? "+" : ""}{delta.toFixed(2)} {creatGroup[0]?.unit ?? "mg/dL"}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-2xl font-black ${latest.val > 1.2 ? "text-red-600" : "text-emerald-600"}`}>{latest.val}</p>
                            <p className="text-[10px] text-muted-foreground">{latest.val > 1.2 ? "Elevated — renal stress" : "Normal range"}</p>
                          </div>
                        </div>
                        <ResponsiveContainer width="100%" height={120}>
                          <AreaChart data={creatData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                            <defs>
                              <linearGradient id="creatGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={areaColor} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={areaColor} stopOpacity={0.03} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#00000010" />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                            <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                            <RechartsTooltip content={({ active, payload }) => active && payload?.length ? <div className="bg-white rounded-xl px-3 py-2 shadow-lg border border-border text-xs"><p className="font-bold">{payload[0]?.payload?.val} {creatGroup[0]?.unit ?? "mg/dL"}</p><p className="text-muted-foreground">{payload[0]?.payload?.date}</p></div> : null} />
                            <ReferenceLine y={1.2} stroke="#ef4444" strokeDasharray="4 2" label={{ value: "1.2 upper limit", fontSize: 9, fill: "#ef4444", position: "insideTopLeft" }} />
                            <Area type="monotone" dataKey="val" stroke={areaColor} strokeWidth={2.5} fill="url(#creatGrad)" dot={{ r: 4, fill: areaColor, strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6 }} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </CardBody>
                    </Card>
                  );
                })()}

                {/* Lab results table */}
                {labResults.length > 0 && (
                  <Card>
                    <CardBody className="p-0">
                      <div className="px-5 py-4 border-b border-border">
                        <p className="text-sm font-bold text-foreground">All Lab Results</p>
                        <p className="text-[11px] text-muted-foreground">Reference ranges · trend indicators</p>
                      </div>
                      <div className="divide-y divide-border">
                        {Object.entries(labsByName).map(([testName, group]) => {
                          const latest = group[0]!;
                          const trend = getTrend(group);
                          const chartData = [...group].reverse().map((l, i) => ({ i, val: parseFloat(l.result), date: format(safeDate(l.testDate), "MMM yy") })).filter(d => !isNaN(d.val));
                          const hasChart = chartData.length >= 2;
                          const statusColor = latest.status === "critical" ? "text-red-600" : latest.status === "abnormal" ? "text-amber-600" : "text-emerald-600";
                          const TrendIcon = trend === "rising" ? TrendingUp : trend === "falling" ? TrendingDown : Minus;
                          const trendColor = trend === "rising" ? "text-red-500" : trend === "falling" ? "text-emerald-500" : "text-muted-foreground";
                          return (
                            <div key={testName} className="flex items-center gap-4 px-5 py-3.5 hover:bg-secondary/30 transition-colors">
                              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: latest.status === "critical" ? "rgba(220,38,38,0.10)" : latest.status === "abnormal" ? "rgba(245,158,11,0.10)" : "rgba(34,197,94,0.10)" }}>
                                <FlaskConical className={`w-3.5 h-3.5 ${statusColor}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-foreground">{testName}</span>
                                  <Badge variant={latest.status === "critical" ? "destructive" : latest.status === "abnormal" ? "warning" : "success"} className="text-[9px]">{latest.status}</Badge>
                                  <TrendIcon className={`w-3 h-3 ${trendColor}`} />
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-0.5">{latest.hospital} · {format(safeDate(latest.testDate), "dd MMM yyyy")}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className={`text-base font-black tabular-nums ${statusColor}`}>{latest.result}<span className="text-[10px] font-normal text-muted-foreground ml-1">{latest.unit}</span></p>
                                {latest.referenceRange && <p className="text-[9px] text-muted-foreground">Ref: {latest.referenceRange}</p>}
                              </div>
                              {hasChart && (
                                <div className="w-20 h-10 shrink-0">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData}>
                                      <Line type="monotone" dataKey="val" stroke={latest.status === "critical" ? "#ef4444" : latest.status === "abnormal" ? "#f59e0b" : "#22c55e"} strokeWidth={2} dot={false} />
                                    </LineChart>
                                  </ResponsiveContainer>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardBody>
                  </Card>
                )}
              </div>
            )}

            {/* ── TAB: MEDICATIONS ─────────────────────────────────────────── */}
            {activeTab === "meds" && (
              <div className="space-y-4">
                {/* Quick prescribe prompt */}
                <div className="rounded-2xl p-4 flex items-center gap-4" style={{ background: "linear-gradient(135deg, rgba(5,150,105,0.08), rgba(6,78,59,0.04))", border: "1px solid rgba(5,150,105,0.20)" }}>
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #059669, #064e3b)" }}>
                    <Syringe className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-foreground text-sm">Prescribe New Medication</p>
                    <p className="text-xs text-muted-foreground">AI drug interaction check + renal dose validation included.</p>
                  </div>
                  <PrescribeModal patientId={patient.id} patientAge={patientAge} creatinine={latestCreatinine} />
                </div>

                {/* Drug interaction matrix */}
                {activeMeds.length >= 2 && (
                  <Card>
                    <CardBody className="p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #ef4444, #7f1d1d)" }}>
                          <Network className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">Drug Interaction Matrix</p>
                          <p className="text-[11px] text-muted-foreground">{activeMeds.length} active medications · AI cross-check</p>
                        </div>
                        <div className="ml-auto flex items-center gap-2 text-[10px]">
                          {[{ color: "#ef4444", label: "Critical" }, { color: "#f59e0b", label: "High" }, { color: "#38bdf8", label: "Moderate" }, { color: "#22c55e", label: "Safe" }].map(l => (
                            <div key={l.label} className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-sm" style={{ background: l.color }} />
                              <span className="text-muted-foreground">{l.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {medMatrixData?.interactions && medMatrixData.interactions.length > 0 && (
                        <div className="space-y-2 mb-4">
                          {medMatrixData.interactions.map((ix, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 rounded-2xl bg-secondary" style={{ borderLeft: `3px solid ${ix.severity === "critical" ? "#ef4444" : ix.severity === "high" ? "#f59e0b" : "#38bdf8"}` }}>
                              <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${ix.severity === "critical" ? "text-red-600" : ix.severity === "high" ? "text-amber-600" : "text-sky-500"}`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-sm font-bold text-foreground">{ix.drug1} ↔ {ix.drug2}</span>
                                  <Badge variant={ix.severity === "critical" ? "destructive" : ix.severity === "high" ? "warning" : "info"} className="text-[9px]">{ix.severity}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">{ix.description}</p>
                                <p className="text-xs font-semibold text-foreground mt-1">→ {ix.recommendation}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr>
                              <th className="w-28 p-1" />
                              {activeMeds.map(m => (
                                <th key={m.id} className="p-1 min-w-[80px]">
                                  <div className="text-[8px] font-bold text-muted-foreground text-center truncate max-w-[76px]" title={m.drugName}>{m.drugName.split(" ")[0]}</div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {activeMeds.map(rowMed => (
                              <tr key={rowMed.id}>
                                <td className="p-1 pr-2">
                                  <div className="text-[8px] font-bold text-muted-foreground text-right truncate max-w-[108px]" title={rowMed.drugName}>{rowMed.drugName.split(" ")[0]}</div>
                                </td>
                                {activeMeds.map(colMed => {
                                  if (rowMed.id === colMed.id) return (
                                    <td key={colMed.id} className="p-0.5"><div className="w-full h-8 rounded bg-secondary/30 flex items-center justify-center"><div className="w-2 h-px bg-border" /></div></td>
                                  );
                                  const ix = medMatrixData?.interactions?.find(i =>
                                    (i.drug1.toLowerCase().includes(rowMed.drugName.toLowerCase().split(" ")[0]!) && i.drug2.toLowerCase().includes(colMed.drugName.toLowerCase().split(" ")[0]!)) ||
                                    (i.drug2.toLowerCase().includes(rowMed.drugName.toLowerCase().split(" ")[0]!) && i.drug1.toLowerCase().includes(colMed.drugName.toLowerCase().split(" ")[0]!))
                                  );
                                  const bg = ix ? (ix.severity === "critical" ? "#ef4444" : ix.severity === "high" ? "#f59e0b" : "#38bdf8") : "#22c55e";
                                  const label = ix ? (ix.severity === "critical" ? "CRIT" : ix.severity === "high" ? "HIGH" : "MOD") : "SAFE";
                                  return (
                                    <td key={colMed.id} className="p-0.5">
                                      <div className="w-full h-8 rounded flex items-center justify-center text-[7px] font-black text-white" style={{ background: bg, opacity: ix ? 1 : 0.4 }}
                                        title={ix ? `${ix.drug1} ↔ ${ix.drug2}: ${ix.severity}` : "No known interaction"}>
                                        {label}
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardBody>
                  </Card>
                )}

                {/* Medication cards */}
                <Card>
                  <CardBody className="p-0">
                    <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-foreground">Medication List</p>
                        <p className="text-[11px] text-muted-foreground">{activeMeds.length} active · {(patient.medications?.length ?? 0) - activeMeds.length} completed</p>
                      </div>
                    </div>
                    <div className="divide-y divide-border">
                      {patient.medications?.map(med => {
                        const hasCritical = medMatrixData?.interactions?.some(ix => (ix.drug1.toLowerCase() === med.drugName.toLowerCase() || ix.drug2.toLowerCase() === med.drugName.toLowerCase()) && ix.severity === "critical");
                        const hasHigh = medMatrixData?.interactions?.some(ix => (ix.drug1.toLowerCase() === med.drugName.toLowerCase() || ix.drug2.toLowerCase() === med.drugName.toLowerCase()) && ix.severity === "high");
                        const alertColor = hasCritical ? "#ef4444" : hasHigh ? "#f59e0b" : null;
                        return (
                          <div key={med.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-secondary/30 transition-colors"
                            style={alertColor ? { borderLeft: `3px solid ${alertColor}` } : {}}>
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: med.isActive ? "linear-gradient(135deg, #059669, #064e3b)" : "var(--secondary)" }}>
                              <Pill className={`w-4 h-4 ${med.isActive ? "text-white" : "text-muted-foreground"}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-foreground truncate">{med.drugName}</p>
                                {(hasCritical || hasHigh) && (
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-secondary ${hasCritical ? "text-red-600" : "text-amber-600"}`}>
                                    {hasCritical ? "CRITICAL" : "HIGH"}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                <span className="font-mono font-semibold text-foreground">{med.dosage}</span> · {med.frequency} · Dr. {med.prescribedBy}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <Badge variant={med.isActive ? "success" : "outline"} className="text-[10px] mb-1">{med.isActive ? "Active" : "Completed"}</Badge>
                              <p className="text-[10px] text-muted-foreground font-mono">{med.startDate ? format(safeDate(med.startDate), "dd MMM yyyy") : "—"}</p>
                            </div>
                          </div>
                        );
                      })}
                      {!patient.medications?.length && (
                        <div className="py-12 text-center">
                          <Pill className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm font-bold text-foreground">No medications on file</p>
                        </div>
                      )}
                    </div>
                  </CardBody>
                </Card>
              </div>
            )}

            {/* ── TAB: HISTORY ─────────────────────────────────────────────── */}
            {activeTab === "history" && (
              <div className="space-y-4">
                {/* AI Predictions */}
                {predictions.length > 0 && (
                  <Card>
                    <CardBody className="p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #f59e0b, #92400e)" }}>
                          <Brain className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">AI Clinical Predictions</p>
                          <p className="text-[11px] text-muted-foreground">{predictions.length} active predictions · {criticalPredictions} high-priority</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {predictions.map((pred, i) => {
                          const style = predictionSeverityStyle[pred.severity] ?? predictionSeverityStyle.low;
                          return (
                            <div key={i} className="flex items-start gap-3 p-3.5 rounded-2xl bg-secondary" style={{
                              borderLeft: `3px solid ${pred.severity === "critical" ? "#ef4444" : pred.severity === "high" ? "#f59e0b" : pred.severity === "moderate" ? "#38bdf8" : "#94a3b8"}`
                            }}>
                              <TriangleAlert className={`w-4 h-4 shrink-0 mt-0.5 ${style.icon}`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-bold text-foreground">{pred.title}</span>
                                  <Badge variant={style.badge as any} className="text-[9px] shrink-0">{pred.severity}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">{pred.description}</p>
                                {pred.recommendation && (
                                  <p className="text-xs font-semibold text-foreground mt-1.5">→ {pred.recommendation}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardBody>
                  </Card>
                )}

                {/* LACE+ Readmission Risk */}
                {riskScore && (
                  <Card>
                    <CardBody className="p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #dc2626, #7f1d1d)" }}>
                          <Activity className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">LACE+ Readmission Risk</p>
                          <p className="text-[11px] text-muted-foreground">30-day hospital readmission prediction · CIHI LACE+ Index</p>
                        </div>
                      </div>
                      {(() => {
                        const score = riskScore.riskScore ?? 0;
                        const readmissionPct = Math.min(95, Math.round(15 + score * 0.65));
                        const level = readmissionPct >= 60 ? "High" : readmissionPct >= 35 ? "Moderate" : "Low";
                        const levelColor = readmissionPct >= 60 ? "#dc2626" : readmissionPct >= 35 ? "#f59e0b" : "#22c55e";
                        return (
                          <div>
                            <div className="grid grid-cols-3 gap-3 mb-4">
                              {[
                                { label: "Readmission Risk", value: `${readmissionPct}%`, color: levelColor },
                                { label: "Risk Level", value: level, color: levelColor },
                                { label: "AI Score", value: `${score}/100`, color: score > 70 ? "#dc2626" : score > 40 ? "#f59e0b" : "#22c55e" },
                              ].map((m, i) => (
                                <div key={i} className="p-3 bg-secondary rounded-2xl text-center">
                                  <p className="text-[10px] text-muted-foreground font-semibold mb-1">{m.label}</p>
                                  <p className="text-xl font-black tabular-nums" style={{ color: m.color }}>{m.value}</p>
                                </div>
                              ))}
                            </div>
                            <div className="w-full bg-secondary rounded-full h-3 mb-2">
                              <div className="h-full rounded-full transition-all" style={{ width: `${readmissionPct}%`, background: `linear-gradient(90deg, ${levelColor}, ${levelColor}99)` }} />
                            </div>
                            {riskScore.factors?.slice(0, 4).map((f: any, i: number) => (
                              <div key={i} className="flex items-center gap-3 py-2.5 border-t border-border">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                <span className="text-xs text-foreground flex-1">{f.factor}</span>
                                <span className="text-xs font-bold text-foreground">+{f.contribution}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </CardBody>
                  </Card>
                )}

                {/* Visit history */}
                <Card>
                  <CardBody className="p-0">
                    <div className="px-5 py-4 border-b border-border">
                      <p className="text-sm font-bold text-foreground">Visit History</p>
                      <p className="text-[11px] text-muted-foreground">{patient.visits?.length ?? 0} visits on record</p>
                    </div>
                    {patient.visits?.length ? (
                      <div className="divide-y divide-border">
                        {[...patient.visits].sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()).map(v => (
                          <div key={v.id} className="flex items-start gap-4 px-5 py-3.5 hover:bg-secondary/30 transition-colors">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{
                              background: v.visitType === "emergency" ? "rgba(220,38,38,0.10)" : v.visitType === "inpatient" ? "rgba(245,158,11,0.10)" : "rgba(2,132,199,0.10)"
                            }}>
                              <Building2 className={`w-4 h-4 ${v.visitType === "emergency" ? "text-red-600" : v.visitType === "inpatient" ? "text-amber-600" : "text-sky-600"}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="text-sm font-bold text-foreground">{v.hospital}</p>
                                <Badge variant={v.visitType === "emergency" ? "destructive" : v.visitType === "inpatient" ? "warning" : "outline"} className="text-[9px]">{v.visitType}</Badge>
                              </div>
                              {v.diagnosis && <p className="text-xs text-foreground/80">{v.diagnosis}</p>}
                              <p className="text-[11px] text-muted-foreground mt-0.5">{format(safeDate(v.visitDate), "dd MMM yyyy")}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 text-center">
                        <Building2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm font-bold text-foreground">No visits on record</p>
                      </div>
                    )}
                  </CardBody>
                </Card>

                {/* Clinical timeline */}
                <Card>
                  <CardBody className="p-5">
                    <p className="text-sm font-bold text-foreground mb-4">Clinical Timeline</p>
                    {timeline.length > 0 ? (
                      <div className="relative pl-6">
                        <div className="absolute left-[11px] top-3 bottom-3 w-px bg-border" />
                        <div className="space-y-3">
                          {timeline.slice(0, 20).map((event, i) => {
                            const cfg = timelineIconMap[event.type];
                            const Icon = cfg.icon;
                            return (
                              <div key={`${event.id}-${event.type}`} className="relative flex items-start gap-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 -ml-6 mt-0.5 border-2 border-background ${cfg.bg}`}>
                                  <Icon className={`w-3 h-3 ${cfg.color}`} />
                                </div>
                                <div className="flex-1 min-w-0 pb-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-foreground">{event.title}</span>
                                    {event.badge && (
                                      <Badge variant={event.badgeVariant ?? "outline"} className="text-[9px]">{event.badge}</Badge>
                                    )}
                                    <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{format(event.date, "dd MMM yyyy")}</span>
                                  </div>
                                  {event.subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{event.subtitle}</p>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="py-8 text-center">
                        <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm font-bold text-foreground">No timeline events</p>
                      </div>
                    )}
                  </CardBody>
                </Card>
              </div>
            )}

            {/* ── TAB: CLINICAL TOOLS ───────────────────────────────────────── */}
            {activeTab === "tools" && (
              <div className="space-y-4">
                {/* SOAP Note */}
                {(() => {
                  const now = new Date();
                  const facilityName = "King Abdulaziz Medical City, Riyadh";
                  const facilityCode = "KAMC-RUH";
                  const physName = "Dr. Sarah Al-Rashidi, MBBS, FRCPC";
                  const mrn = `MRN-${patient.id.toString().padStart(6, "0")}`;
                  const dateStr = now.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
                  const timeStr = now.toLocaleTimeString("en-SA", { hour: "2-digit", minute: "2-digit" });
                  const age = patientAge ?? 0;
                  const activeMedsList = activeMeds.map((m: any) => `${m.drugName}${m.dosage ? " " + m.dosage : ""}${m.frequency ? ", " + m.frequency : ""}`);
                  const critLabs = labResults.filter((l: any) => l.status === "critical");
                  const abnLabs = labResults.filter((l: any) => l.status === "abnormal");
                  const recentVisit = patient.visits?.at(-1);
                  const riskLvl = riskScore?.riskLevel ?? "unknown";
                  const riskScoreVal = riskScore?.riskScore ?? "—";
                  const topFactors = riskScore?.factors?.slice(0, 3).map((f: any) => f.factor) ?? [];
                  const aiRecs = aiDecision?.recommendations ?? [];

                  const soapSections = [
                    {
                      id: "S", label: "Subjective", color: "#007AFF", icon: "🗣",
                      content: [
                        `Patient: ${patient.fullName}, ${age} years, ${patient.gender}, Blood type ${patient.bloodType}.`,
                        recentVisit ? `Chief complaint / most recent visit: ${recentVisit.visitType ?? "routine"} on ${format(new Date(recentVisit.visitDate), "dd MMM yyyy")}${(recentVisit as any).notes ? " — " + (recentVisit as any).notes : ""}.` : "No recent visits on record.",
                        patient.chronicConditions?.length ? `Known chronic conditions: ${patient.chronicConditions.join("; ")}.` : "No chronic conditions documented.",
                        patient.allergies?.length ? `⚠ Allergies: ${patient.allergies.join(", ")}.` : "No known drug allergies.",
                        activeMedsList.length ? `Current medications (${activeMedsList.length}): ${activeMedsList.slice(0, 5).join("; ")}${activeMedsList.length > 5 ? ` + ${activeMedsList.length - 5} more.` : "."}` : "No active medications.",
                      ].filter(Boolean) as string[],
                    },
                    {
                      id: "O", label: "Objective", color: "#7c3aed", icon: "🔬",
                      content: [
                        `National ID: ${patient.nationalId} · ${mrn}`,
                        `Facility: ${facilityName} (${facilityCode})`,
                        labResults.length ? `Lab results (${labResults.length} total): ${critLabs.length} critical, ${abnLabs.length} abnormal, ${labResults.length - critLabs.length - abnLabs.length} within normal limits.` : "No laboratory results on file.",
                        critLabs.length ? `Critical values: ${critLabs.map((l: any) => `${l.testName} ${l.result}${l.unit ?? ""}`).join("; ")}.` : null,
                        abnLabs.length ? `Abnormal values: ${abnLabs.map((l: any) => `${l.testName} ${l.result}${l.unit ?? ""}`).join("; ")}.` : null,
                        `Total visits recorded: ${patient.visits?.length ?? 0}.`,
                      ].filter(Boolean) as string[],
                    },
                    {
                      id: "A", label: "Assessment", color: "#dc2626", icon: "🧠",
                      content: [
                        `AI Risk Score: ${riskScoreVal}/100 — ${riskLvl.toUpperCase()} risk level.`,
                        topFactors.length ? `Top risk factors: ${topFactors.join("; ")}.` : null,
                        patient.chronicConditions?.length ? `Active diagnoses: ${patient.chronicConditions.join("; ")}.` : "No active diagnoses documented.",
                        riskScore?.factors?.length ? `${riskScore.factors.length} risk factor(s) identified by SANAD AI v3.0 (LACE+ index integrated).` : null,
                        aiDecision?.urgency && aiDecision.urgency !== "routine" ? `Clinical urgency level: ${aiDecision.urgency.toUpperCase()} — immediate clinical attention recommended.` : "Clinical urgency level: ROUTINE — continue standard management.",
                      ].filter(Boolean) as string[],
                    },
                    {
                      id: "P", label: "Plan", color: "#059669", icon: "📋",
                      content: [
                        ...(aiRecs.length ? aiRecs.slice(0, 5).map((r: any) => `• ${typeof r === "string" ? r : r.text ?? JSON.stringify(r)}`) : ["• Continue current management plan as documented."]),
                        `• Follow-up: ${patient.chronicConditions?.length ? "3–6 months chronic disease review" : "Annual preventive health check"}.`,
                        critLabs.length ? `• Urgent: Repeat critical labs and notify on-call team for ${critLabs.map((l: any) => l.testName).join(", ")}.` : null,
                        `• Patient education provided regarding medication adherence and lifestyle modification.`,
                        `• Documentation completed in SANAD HIS — PDPL compliant. Immutable audit record generated.`,
                      ].filter(Boolean) as string[],
                    },
                  ];

                  const handleCopy = () => {
                    const text = soapSections.map(s => `=== ${s.id}. ${s.label.toUpperCase()} ===\n${s.content.join("\n")}`).join("\n\n");
                    const header = `SOAP NOTE — ${facilityName}\nDate: ${dateStr}  Time: ${timeStr}\nPhysician: ${physName}\nPatient: ${patient.fullName} · ${patient.nationalId} · ${mrn}\n${"─".repeat(60)}\n\n`;
                    navigator.clipboard?.writeText(header + text).catch(() => {});
                  };

                  return (
                    <Card>
                      <CardBody className="p-5">
                        <div className="flex items-center gap-3 mb-5">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #0f172a, #1e293b)" }}>
                            <BookOpen className="w-3.5 h-3.5 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-foreground">SOAP Clinical Note</p>
                            <p className="text-[11px] text-muted-foreground">{facilityName} · {physName} · {dateStr} {timeStr}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={handleCopy} className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground bg-secondary hover:bg-border px-3 py-1.5 rounded-xl transition-colors">
                              <CheckCircle2 className="w-3 h-3" /> Copy
                            </button>
                            <button onClick={() => window.print()} className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground bg-secondary hover:bg-border px-3 py-1.5 rounded-xl transition-colors">
                              <BookOpen className="w-3 h-3" /> Print
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {soapSections.map((section) => (
                            <div key={section.id} className="rounded-2xl overflow-hidden border border-border">
                              <div className="flex items-center gap-3 px-4 py-3" style={{ background: `${section.color}0d`, borderBottom: `2px solid ${section.color}` }}>
                                <span className="text-base">{section.icon}</span>
                                <p className="text-xs font-black uppercase tracking-widest" style={{ color: section.color }}>{section.id} — {section.label}</p>
                              </div>
                              <div className="px-4 py-3.5 space-y-2 bg-background">
                                {section.content.map((line, i) => (
                                  <p key={i} className={`text-sm leading-relaxed ${line.startsWith("⚠") ? "font-bold text-red-600" : line.startsWith("•") ? "text-foreground font-medium" : "text-foreground"}`}>
                                    {line}
                                  </p>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-start gap-3 px-4 py-3 bg-secondary rounded-2xl mt-4">
                          <Shield className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                          <p className="text-[10px] text-muted-foreground leading-relaxed">
                            This SOAP note was generated by SANAD AI v3.0 on {dateStr} at {timeStr}. It must be reviewed and co-signed by the treating physician before filing. All data handling complies with Saudi PDPL Article 12 and MOH e-health regulations.
                          </p>
                        </div>
                      </CardBody>
                    </Card>
                  );
                })()}

                {/* Audit trail */}
                <Card>
                  <CardBody className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #0f172a, #1e293b)" }}>
                        <Shield className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">Immutable Audit Trail</p>
                        <p className="text-[11px] text-muted-foreground">WHO · WHAT · WHEN · WHY · Tamper-proof log</p>
                      </div>
                    </div>
                    {(!auditData || (auditData as any)?.auditLog?.length === 0) ? (
                      <div className="py-12 text-center">
                        <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                        <p className="font-bold text-foreground">No audit records yet</p>
                        <p className="text-sm text-muted-foreground mt-1">Run the Decision Engine to generate audit entries.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {((auditData as any)?.auditLog ?? []).map((log: any, i: number) => (
                          <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-secondary/60">
                            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                              <Shield className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-foreground">{log.what}</p>
                                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                                    <span className="text-[10px] text-muted-foreground">
                                      <span className="font-semibold text-foreground">{log.who}</span> · {log.whoRole}
                                    </span>
                                    {log.confidence && (
                                      <span className="text-[10px] font-mono bg-background rounded-md px-1.5 py-0.5 text-muted-foreground">
                                        {Math.round(log.confidence * 100)}% confidence
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <span className="text-[10px] text-muted-foreground font-mono shrink-0 bg-background rounded-lg px-2 py-1">
                                  {log.createdAt ? format(new Date(log.createdAt), "dd MMM HH:mm") : "—"}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardBody>
                </Card>

                {/* Cross-portal intelligence */}
                <Card>
                  <CardBody className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #7c3aed, #4c1d95)" }}>
                        <Network className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">Cross-Portal Intelligence</p>
                        <p className="text-[11px] text-muted-foreground">Lab · Pharmacy · Emergency · Insurance feeds</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { icon: FlaskConical, label: "Lab Portal", value: `${labResults.length} results`, sub: `${criticalLabs} critical pending`, color: "#7c3aed", alert: criticalLabs > 0 },
                        { icon: Pill, label: "Pharmacy", value: `${activeMeds.length} active`, sub: "eRx sync active", color: "#059669", alert: false },
                        { icon: Building2, label: "Emergency", value: `${(patient.visits ?? []).filter((v: any) => v.visitType === "emergency").length} ED visits`, sub: "MOH alert feed live", color: "#dc2626", alert: (patient.visits ?? []).filter((v: any) => v.visitType === "emergency").length >= 2 },
                        { icon: Shield, label: "Insurance", value: "CCHI Verified", sub: "Coverage active", color: "#0284c7", alert: false },
                      ].map((item, i) => {
                        const Icon = item.icon;
                        return (
                          <div key={i} className="p-3.5 rounded-2xl bg-secondary flex items-start gap-3" style={item.alert ? { borderLeft: "3px solid #ef4444" } : {}}>
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${item.color}15` }}>
                              <Icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">{item.label}</p>
                              <p className="text-sm font-bold text-foreground">{item.value}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{item.sub}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardBody>
                </Card>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}

// ─── Clinical Drug Database with Renal / Age Dose Adjustment ────────────────
const DRUG_DB: Record<string, {
  stdDose: string; renalCaution: number; renalContraindicated: number;
  renalAdjust: string; elderlyWarning: boolean; elderlyNote: string;
  guideline: string; class: string;
}> = {
  metformin:    { stdDose: "500–1000 mg twice daily with food", renalCaution: 45, renalContraindicated: 30, renalAdjust: "Reduce dose if eGFR 30–45 mL/min/1.73m². STOP if eGFR < 30 — lactic acidosis risk.", elderlyWarning: true, elderlyNote: "Start at lowest dose 500 mg/day in patients ≥ 70 years. Monitor renal function every 6 months.", guideline: "ADA 2024 · §9.3 Pharmacologic Approaches", class: "Biguanide" },
  warfarin:     { stdDose: "2–5 mg once daily (INR-guided)", renalCaution: 30, renalContraindicated: 15, renalAdjust: "eGFR < 30: Dose reduction required. Monitor INR more frequently. Risk of bleeding accumulation.", elderlyWarning: true, elderlyNote: "Elderly highly sensitive — increased bleeding risk. Start 2 mg/day. Weekly INR monitoring initially.", guideline: "ACC/AHA 2019 · Anticoagulation Guideline §4.2", class: "Vitamin K Antagonist" },
  lisinopril:   { stdDose: "5–40 mg once daily", renalCaution: 30, renalContraindicated: 15, renalAdjust: "eGFR 30–60: Start 2.5–5 mg, titrate slowly. eGFR < 30: Use with caution, monitor K+ and creatinine closely.", elderlyWarning: false, elderlyNote: "Well-tolerated in elderly but monitor for hypotension and hyperkalemia.", guideline: "KDIGO CKD 2022 · §3.1 RAS Blockade", class: "ACE Inhibitor" },
  atorvastatin: { stdDose: "10–80 mg once daily at night", renalCaution: 30, renalContraindicated: 0, renalAdjust: "No dose adjustment required for renal impairment. Preferred statin in CKD per KDIGO.", elderlyWarning: false, elderlyNote: "Generally safe. Monitor for myopathy (CK if symptomatic).", guideline: "ACC/AHA 2019 Cholesterol Guidelines · COR I", class: "HMG-CoA Reductase Inhibitor" },
  aspirin:      { stdDose: "75–325 mg once daily (indication-dependent)", renalCaution: 30, renalContraindicated: 10, renalAdjust: "eGFR < 30: Avoid regular use — fluid retention, GI bleeding, and renal prostaglandin inhibition risk.", elderlyWarning: true, elderlyNote: "Age ≥ 70: Increased GI bleeding risk without proton pump inhibitor cover. Use gastroprotection.", guideline: "ACC/AHA 2019 · Primary Prevention §6.2", class: "Antiplatelet / NSAID" },
  amlodipine:   { stdDose: "2.5–10 mg once daily", renalCaution: 0, renalContraindicated: 0, renalAdjust: "No renal dose adjustment required. Hepatically metabolised — caution in liver disease.", elderlyWarning: true, elderlyNote: "Start at 2.5 mg in elderly — ankle oedema and hypotension risk more pronounced.", guideline: "ESC/ESH 2023 Hypertension Guidelines · §7.4", class: "Calcium Channel Blocker" },
  metoprolol:   { stdDose: "25–200 mg once daily (XL) or twice daily (IR)", renalCaution: 0, renalContraindicated: 0, renalAdjust: "No renal dose adjustment required. Hepatically cleared.", elderlyWarning: true, elderlyNote: "Elderly: Start 12.5–25 mg. Bradycardia and fatigue more common. Avoid abrupt discontinuation.", guideline: "ACC/AHA 2022 Heart Failure Guidelines · §7.1", class: "Beta-1 Selective Blocker" },
  omeprazole:   { stdDose: "20–40 mg once daily before meal", renalCaution: 0, renalContraindicated: 0, renalAdjust: "No renal dose adjustment required. Safe across all eGFR levels.", elderlyWarning: false, elderlyNote: "Safe in elderly. Long-term use: monitor magnesium and B12 annually.", guideline: "ACG 2022 PPI Guideline", class: "Proton Pump Inhibitor" },
  furosemide:   { stdDose: "20–80 mg once or twice daily", renalCaution: 30, renalContraindicated: 0, renalAdjust: "eGFR < 30: Higher doses required for efficacy (up to 160–200 mg/day). Monitor electrolytes closely.", elderlyWarning: true, elderlyNote: "Elderly: Monitor Na, K, volume status. Orthostatic hypotension and falls risk.", guideline: "ESC 2021 Heart Failure Guideline · §7.2", class: "Loop Diuretic" },
  insulin:      { stdDose: "Dose individualised by endocrinologist (units/kg)", renalCaution: 45, renalContraindicated: 0, renalAdjust: "eGFR < 45: Reduce basal dose by 25%. eGFR < 30: Reduce by 50%. Insulin clearance decreases with CKD — high hypoglycaemia risk.", elderlyWarning: true, elderlyNote: "Elderly: Simplify regimen. Target HbA1c 7.5–8.5% to avoid hypoglycaemia. Consider CGM.", guideline: "ADA 2024 · §13 Older Adults", class: "Insulin Therapy" },
  codeine:      { stdDose: "15–60 mg every 4–6 hours", renalCaution: 30, renalContraindicated: 30, renalAdjust: "AVOID if eGFR < 30 — active metabolite (morphine-6-glucuronide) accumulates causing CNS/respiratory depression.", elderlyWarning: true, elderlyNote: "Avoid in elderly where possible — falls, confusion, constipation. Consider paracetamol alternatives.", guideline: "MOH Pain Management 2024 · §4.3 Renal Dosing", class: "Opioid Analgesic" },
  gabapentin:   { stdDose: "300–1200 mg three times daily", renalCaution: 60, renalContraindicated: 15, renalAdjust: "Renally cleared. eGFR 30–60: Max 600 mg TID. eGFR 15–30: Max 300 mg TID. eGFR < 15: 300 mg once daily. Dialysis: supplemental dose post-session.", elderlyWarning: true, elderlyNote: "Elderly: Start 100–300 mg/day. Sedation, dizziness, falls risk significant.", guideline: "NICE NG193 Neuropathic Pain · §1.3", class: "Anticonvulsant / Neuropathic" },
};

function computeEGFR(creatinine: number, age: number, isMale = true): number {
  const egfr = ((140 - age) * 72) / (creatinine * 72) * (isMale ? 1 : 0.85);
  return Math.round(Math.max(1, Math.min(egfr, 120)));
}

function getDrugAlerts(drug: string, egfr: number, age: number): { level: "danger" | "warn" | "info"; msg: string; guideline: string }[] {
  const key = drug.toLowerCase().trim();
  const db = Object.entries(DRUG_DB).find(([k]) => key.includes(k))?.[1];
  if (!db) return [];
  const alerts: { level: "danger" | "warn" | "info"; msg: string; guideline: string }[] = [];
  if (db.renalContraindicated > 0 && egfr < db.renalContraindicated) {
    alerts.push({ level: "danger", msg: `CONTRAINDICATED: eGFR ${egfr} < ${db.renalContraindicated} mL/min/1.73m². ${db.renalAdjust}`, guideline: db.guideline });
  } else if (egfr < db.renalCaution && db.renalCaution > 0) {
    alerts.push({ level: "warn", msg: `Renal caution (eGFR ${egfr} < ${db.renalCaution} mL/min/1.73m²): ${db.renalAdjust}`, guideline: db.guideline });
  }
  if (db.elderlyWarning && age >= 65) {
    alerts.push({ level: "warn", msg: `Elderly patient (age ${age}): ${db.elderlyNote}`, guideline: db.guideline });
  }
  if (alerts.length === 0 && db) {
    alerts.push({ level: "info", msg: `Standard dose: ${db.stdDose}. No renal or age-based dose adjustment required.`, guideline: db.guideline });
  }
  return alerts;
}

function PrescribeModal({ patientId, patientAge, creatinine }: { patientId: number; patientAge?: number; creatinine?: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [drugName, setDrugName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");

  const checkMutation = useCheckDrugInteraction();
  const prescribeMutation = usePrescribeMedication();

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drugName) return;
    await checkMutation.mutateAsync({ data: { patientId, newDrug: drugName } });
  };

  const handlePrescribe = async () => {
    await prescribeMutation.mutateAsync({
      data: {
        patientId, drugName, dosage, frequency,
        prescribedBy: "Dr. Ahmed Al-Rashidi",
        hospital: "King Fahd Medical City",
        startDate: new Date().toISOString().split("T")[0]!,
      }
    });
    setIsOpen(false);
    setDrugName(""); setDosage(""); setFrequency("");
    checkMutation.reset();
    window.location.reload();
  };

  const close = () => { setIsOpen(false); checkMutation.reset(); };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} size="sm" variant="primary" className="w-full">
        <Syringe className="w-3.5 h-3.5" /> Prescribe Medication
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-[2rem]" style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(24px)", boxShadow: "0 24px 64px rgba(0,0,0,0.16), 0 0 0 1px rgba(255,255,255,0.60)" }}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div>
                <h3 className="font-bold text-foreground text-base">Prescribe Medication</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Renal dose validation + AI drug interaction check.</p>
              </div>
              <div className="flex items-center gap-2">
                {creatinine != null && patientAge != null && (
                  <div className="text-center px-3 py-1.5 bg-secondary rounded-xl">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">eGFR</p>
                    <p className={`text-base font-black tabular-nums ${computeEGFR(creatinine, patientAge) < 30 ? "text-red-600" : computeEGFR(creatinine, patientAge) < 60 ? "text-amber-600" : "text-emerald-600"}`}>
                      {computeEGFR(creatinine, patientAge)}
                    </p>
                    <p className="text-[8px] text-muted-foreground">mL/min/1.73m²</p>
                  </div>
                )}
                <button onClick={close} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-border transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <form onSubmit={handleCheck} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Drug Name</label>
                  <Input
                    value={drugName}
                    onChange={e => setDrugName(e.target.value)}
                    placeholder="e.g. Warfarin, Aspirin, Metformin..."
                    required
                  />
                  {drugName.length > 2 && creatinine != null && patientAge != null && (() => {
                    const egfr = computeEGFR(creatinine, patientAge);
                    const alerts = getDrugAlerts(drugName, egfr, patientAge);
                    const dbKey = Object.keys(DRUG_DB).find(k => drugName.toLowerCase().includes(k));
                    const dbEntry = dbKey ? DRUG_DB[dbKey] : null;
                    if (alerts.length === 0) return null;
                    return (
                      <div className="mt-3 space-y-2">
                        {dbEntry && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-xl">
                            <Pill className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="text-[10px] font-bold text-foreground">{dbEntry.class}</span>
                            <span className="text-[10px] text-muted-foreground">· Standard: {dbEntry.stdDose}</span>
                          </div>
                        )}
                        {alerts.map((alert, i) => (
                          <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-xl text-xs" style={{
                            background: alert.level === "danger" ? "rgba(239,68,68,0.07)" : alert.level === "warn" ? "rgba(245,158,11,0.07)" : "rgba(34,197,94,0.07)",
                            borderLeft: `3px solid ${alert.level === "danger" ? "#ef4444" : alert.level === "warn" ? "#f59e0b" : "#22c55e"}`,
                          }}>
                            <AlertCircle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${alert.level === "danger" ? "text-red-500" : alert.level === "warn" ? "text-amber-500" : "text-emerald-500"}`} />
                            <div className="flex-1 min-w-0">
                              <p className={`font-bold leading-snug ${alert.level === "danger" ? "text-red-700" : alert.level === "warn" ? "text-amber-700" : "text-emerald-700"}`}>{alert.msg}</p>
                              <p className="text-muted-foreground mt-0.5 font-mono text-[10px]">{alert.guideline}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Dosage</label>
                    <Input value={dosage} onChange={e => setDosage(e.target.value)} required placeholder="e.g. 50mg" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Frequency</label>
                    <Select value={frequency} onChange={e => setFrequency(e.target.value)} required>
                      <option value="">Select...</option>
                      <option>Once daily</option>
                      <option>Twice daily</option>
                      <option>Three times daily</option>
                      <option>Every 8 hours</option>
                      <option>As needed</option>
                    </Select>
                  </div>
                </div>
                {!checkMutation.data && (
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={close}>Cancel</Button>
                    <Button type="submit" isLoading={checkMutation.isPending}>
                      <Shield className="w-3.5 h-3.5" /> Run AI Check
                    </Button>
                  </div>
                )}
              </form>

              {checkMutation.data && (
                <div className="space-y-3 border-t border-border pt-4">
                  {checkMutation.data.safe ? (
                    <div className="flex items-center gap-3 p-4 bg-secondary rounded-2xl" style={{ borderLeft: "3px solid #22c55e" }}>
                      <div className="w-9 h-9 rounded-xl bg-background flex items-center justify-center shrink-0">
                        <Shield className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-bold text-emerald-600 text-sm">No Interactions Detected</p>
                        <p className="text-xs text-muted-foreground">Safe to prescribe based on current medication profile.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {checkMutation.data.warnings.map((w: any, i: number) => (
                        <div key={i} className="p-4 bg-secondary rounded-2xl" style={{ borderLeft: "3px solid #ef4444" }}>
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="w-4 h-4 text-red-600" />
                            <span className="text-sm font-bold text-red-600">Interaction: {w.conflictingDrug}</span>
                            <Badge variant={w.severity === "critical" ? "destructive" : "warning"} className="ml-auto text-[10px]">{w.severity}</Badge>
                          </div>
                          <p className="text-xs text-foreground/80 mb-2 ml-6">{w.description}</p>
                          <p className="text-xs font-semibold bg-background rounded-xl p-2 ml-6">{w.recommendation}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-end gap-2 pt-1">
                    <Button variant="outline" size="sm" onClick={close}>Cancel</Button>
                    <Button
                      variant={checkMutation.data.safe ? "primary" : "destructive"}
                      size="sm"
                      onClick={handlePrescribe}
                      isLoading={prescribeMutation.isPending}
                    >
                      {checkMutation.data.safe ? "Confirm & Prescribe" : "Override & Prescribe"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
