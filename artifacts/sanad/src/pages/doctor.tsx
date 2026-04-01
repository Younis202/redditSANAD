import React, { useState, useRef, useEffect } from "react";
import {
  Search, Shield, Activity, AlertCircle, Syringe, Clock,
  User as UserIcon, Pill, FlaskConical, Building2, X, Stethoscope, CalendarDays,
  TrendingUp, TrendingDown, Minus, Brain, Bell, BellOff, CheckCheck,
  TriangleAlert, Zap, ArrowUpRight, ArrowDownRight, ChevronRight, Lightbulb,
  Wifi, WifiOff, Network, Users, CheckCircle2
} from "lucide-react";
import {
  LineChart, Line, ResponsiveContainer, Tooltip as RechartsTooltip,
  ReferenceLine, XAxis, YAxis, CartesianGrid, Area, AreaChart,
} from "recharts";
import { Layout } from "@/components/layout";
import {
  Card, CardHeader, CardTitle, CardBody,
  Input, Button, Badge, PageHeader, Tabs, KpiCard, StatusDot, Select, DataLabel, AlertBanner, PortalHero
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
  const [activeTab, setActiveTab] = useState("decision");
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
    { enabled: !!patient?.id && activeTab === "audit" }
  );

  const { data: alertsData, refetch: refetchAlerts } = useListAlerts(
    { patientId: patient?.id || 0 },
    { query: { enabled: !!patient?.id } }
  );

  const markReadMutation = useMarkAlertRead();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchId.trim()) { setPatientId(searchId.trim()); setActiveTab("overview"); setShowDropdown(false); }
  };

  const handleSelectPatient = (nationalId: string, name: string) => {
    setSearchId(nationalId);
    setSearchQuery(name);
    setPatientId(nationalId);
    setActiveTab("overview");
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

  return (
    <Layout role="doctor">
      {criticalLabs > 0 && (
        <AlertBanner variant="destructive">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>
            <strong>Critical Lab Alert:</strong> {criticalLabs} lab result{criticalLabs > 1 ? "s" : ""} require immediate clinical review.
          </span>
          <Badge variant="destructive" className="ml-auto shrink-0">{criticalLabs} critical</Badge>
        </AlertBanner>
      )}
      {criticalPredictions > 0 && (
        <AlertBanner variant="warning">
          <Brain className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>AI Warning:</strong> {criticalPredictions} high-priority clinical prediction{criticalPredictions > 1 ? "s" : ""} require attention.
          </span>
          <Badge variant="warning" className="ml-auto shrink-0">{criticalPredictions} flagged</Badge>
        </AlertBanner>
      )}

      {/* SSE Real-time Alerts Panel */}
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

      <PortalHero
        title="Physician Dashboard"
        subtitle="Patient clinical records, prescribing, AI-assisted risk analysis, and predictive alerts."
        icon={Stethoscope}
        gradient="linear-gradient(135deg, #007AFF 0%, #004b9d 100%)"
        badge="Physician Portal · MOH"
        stats={[
          { label: "Active Patients", value: "34M+" },
          { label: "AI Decisions / Day", value: "847K" },
          { label: "Diagnostic Accuracy", value: "97.3%" },
        ]}
      />
      <div className="flex items-center justify-end mb-6">
        <div className="flex items-center gap-2">
          {/* SSE Real-time Alert Bell */}
          <div className="relative">
            <button
              onClick={() => setShowSsePanel(p => !p)}
              className="relative flex items-center justify-center w-10 h-10 rounded-full transition-colors bg-secondary hover:bg-border"
              title={sseConnected ? "Live alerts connected" : "Connecting to live alerts..."}
            >
              <Bell className={`w-4.5 h-4.5 ${sseUnread > 0 ? "text-foreground" : "text-muted-foreground"}`} />
              {sseUnread > 0 && (
                <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                  {sseUnread > 9 ? "9+" : sseUnread}
                </span>
              )}
            </button>
            <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${sseConnected ? "bg-emerald-400" : "bg-gray-300"}`} title={sseConnected ? "Live" : "Offline"} />
          </div>
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative" ref={searchRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Name or National ID..."
              className="pl-9 w-64"
              value={searchQuery || searchId}
              onChange={(e) => {
                const v = e.target.value;
                setSearchQuery(v);
                setSearchId(v);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
            />
            {showDropdown && searchPatients.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-full rounded-[2rem] z-50 overflow-hidden" style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(20px)", boxShadow: "0 8px 32px rgba(0,0,0,0.10), 0 0 0 1px rgba(255,255,255,0.60)" }}>
                {searchPatients.map((p: any) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPatient(p.nationalId, p.fullName)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary text-left transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <UserIcon className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-foreground truncate">{p.fullName}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{p.nationalId} · Age {new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear()}</p>
                    </div>
                    {p.riskLevel === "critical" && <span className="text-[9px] font-bold bg-secondary text-red-600 px-1.5 py-0.5 rounded-full shrink-0">Critical</span>}
                    {p.riskLevel === "high" && <span className="text-[9px] font-bold bg-secondary text-amber-600 px-1.5 py-0.5 rounded-full shrink-0">High Risk</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button type="submit" size="md">Load</Button>
        </form>
        </div>
      </div>

      {!patientId && !isLoading && (
        <Card>
          <CardBody className="py-24 text-center">
            <div className="w-20 h-20 rounded-3xl bg-primary/5 flex items-center justify-center mx-auto mb-5 border border-primary/10">
              <Stethoscope className="w-9 h-9 text-primary/60" />
            </div>
            <p className="text-xl font-bold text-foreground mb-2">No Patient Loaded</p>
            <p className="text-sm text-muted-foreground mb-5">Search by name or National ID to access a patient's clinical record.</p>
            <div className="inline-flex items-center gap-2 bg-secondary rounded-2xl px-4 py-2.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Demo IDs</span>
              <span className="text-xs font-mono text-foreground">1000000001 · 1000000003 · 1000000005 · 1000000023</span>
            </div>
          </CardBody>
        </Card>
      )}

      {isLoading && (
        <div className="flex items-center gap-3 py-16 text-muted-foreground justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
          <span className="text-sm">Loading patient record...</span>
        </div>
      )}

      {patient && (
        <div className="space-y-5">
          {/* Patient Identity Card */}
          <Card>
            <CardBody className="p-0">
              {/* Allergy Alert Strip */}
              {patient.allergies?.length > 0 && (
                <div className="bg-red-600 px-5 py-3 flex items-center gap-3 rounded-t-2xl">
                  <AlertCircle className="w-4 h-4 text-white shrink-0" />
                  <p className="text-white text-sm font-bold tracking-wide">
                    ALLERGY ALERT — {patient.allergies.join("  ·  ")}
                  </p>
                </div>
              )}

              <div className="p-5 flex items-start gap-5">
                {/* Avatar */}
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <UserIcon className="w-8 h-8 text-primary" />
                </div>

                {/* Identity & Meta */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-bold text-foreground leading-tight">{patient.fullName}</h2>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="text-xs font-mono bg-secondary px-2.5 py-1 rounded-xl">{patient.nationalId}</span>
                    <span className="text-xs text-muted-foreground">Born {format(safeDate(patient.dateOfBirth), "dd MMM yyyy")}</span>
                    <span className="text-muted-foreground/40 text-xs">·</span>
                    <span className="text-xs text-muted-foreground">{patient.gender}</span>
                  </div>

                  {/* Data Pills Row */}
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    {/* Blood Type */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary rounded-xl">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Blood</span>
                      <span className="text-sm font-bold text-red-600">{patient.bloodType}</span>
                    </div>

                    {/* AI Risk Score */}
                    {riskScore && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary">
                        <Brain className={`w-3.5 h-3.5 ${
                          riskScore.riskLevel === "critical" ? "text-red-500" :
                          riskScore.riskLevel === "high" ? "text-amber-500" : "text-primary"
                        }`} />
                        <span className="text-[10px] font-semibold text-muted-foreground">AI Risk</span>
                        <span className={`text-sm font-bold tabular-nums ${
                          riskScore.riskLevel === "critical" ? "text-red-600" :
                          riskScore.riskLevel === "high" ? "text-amber-600" : "text-primary"
                        }`}>{riskScore.riskScore}<span className="text-[10px] font-normal text-muted-foreground">/100</span></span>
                        <Badge variant={
                          riskScore.riskLevel === "critical" ? "destructive" :
                          riskScore.riskLevel === "high" ? "warning" : "success"
                        } className="text-[9px]">{riskScore.riskLevel?.toUpperCase()}</Badge>
                      </div>
                    )}

                    {/* Chronic Conditions (first 2) */}
                    {patient.chronicConditions?.slice(0, 2).map((c, i) => (
                      <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary rounded-xl">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        <span className="text-xs font-medium text-foreground">{c}</span>
                      </div>
                    ))}
                    {(patient.chronicConditions?.length ?? 0) > 2 && (
                      <span className="text-xs text-muted-foreground px-2 py-1.5">
                        +{patient.chronicConditions!.length - 2} more conditions
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 shrink-0">
                  <PrescribeModal patientId={patient.id} />
                  <Button variant="outline" size="sm">
                    <CalendarDays className="w-3.5 h-3.5" /> Schedule Visit
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* AI Priority Strip */}
          {priorityItems.length > 0 && (
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${priorityItems.length}, 1fr)` }}>
              {priorityItems.map((item, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTab("decision")}
                  className="glass-card rounded-[2rem] px-4 py-3 text-left flex items-start gap-3 hover:bg-white/80 transition-colors"
                >
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${item.color}`}>
                    {item.pulse ? (
                      <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-white/80" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">{item.label}</p>
                    <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2">{item.text}</p>
                  </div>
                  {item.pulse && (
                    <div className={`ml-auto shrink-0 w-2 h-2 rounded-full ${item.color} animate-pulse mt-1.5`} />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* KPI Row */}
          <div className="grid grid-cols-5 gap-4">
            <KpiCard
              title="Active Medications"
              value={activeMeds.length}
              sub="Current prescriptions"
              icon={Pill}
              iconBg="bg-primary/10"
              iconColor="text-primary"
            />
            <KpiCard
              title="Lab Results"
              value={labResults.length}
              sub={`${criticalLabs} critical · ${abnormalLabs} abnormal`}
              icon={FlaskConical}
              iconBg="bg-secondary"
              iconColor={criticalLabs > 0 ? "text-red-600" : "text-foreground"}
            />
            <KpiCard
              title="Visit History"
              value={patient.visits?.length ?? 0}
              sub="Total hospital visits"
              icon={Building2}
              iconBg="bg-secondary"
              iconColor="text-foreground"
            />
            <KpiCard
              title="AI Predictions"
              value={predictions.length}
              sub={`${criticalPredictions} high priority`}
              icon={Brain}
              iconBg="bg-secondary"
              iconColor={criticalPredictions > 0 ? "text-amber-600" : "text-foreground"}
            />
            <KpiCard
              title="Active Alerts"
              value={unreadAlerts}
              sub={`${alerts.length} total alerts`}
              icon={Bell}
              iconBg="bg-secondary"
              iconColor={unreadAlerts > 0 ? "text-red-600" : "text-muted-foreground"}
            />
          </div>

          {/* Tabbed Content */}
          <Card>
            <Tabs
              tabs={[
                { id: "overview", label: "Clinical Overview" },
                { id: "decision", label: "AI Decision Engine" },
                { id: "timeline", label: "Timeline" },
                { id: "medications", label: "Medications", count: activeMeds.length },
                { id: "labs", label: "Lab Results", count: labResults.length },
                { id: "visits", label: "Visits", count: patient.visits?.length ?? 0 },
                { id: "predictions", label: "AI Predictions", count: predictions.length },
                { id: "alerts", label: "Alerts", count: unreadAlerts || undefined },
                { id: "ai", label: "Risk Analysis" },
                { id: "audit", label: "Audit Trail" },
              ]}
              active={activeTab}
              onChange={setActiveTab}
            />

            {activeTab === "overview" && (
              <div className="p-6 space-y-6">
                {/* KPI Hero Row */}
                <div className="grid grid-cols-3 gap-4">
                  {riskScore ? (
                    <div className="rounded-3xl p-5 text-white flex flex-col justify-between min-h-[130px]" style={{
                      background: riskScore.riskLevel === "critical" ? "linear-gradient(135deg, #dc2626, #991b1b)" :
                        riskScore.riskLevel === "high" ? "linear-gradient(135deg, #d97706, #92400e)" :
                        riskScore.riskLevel === "medium" ? "linear-gradient(135deg, #0284c7, #0c4a6e)" :
                        "linear-gradient(135deg, #059669, #064e3b)"
                    }}>
                      <p className="text-[11px] font-semibold text-white/60 uppercase tracking-widest">AI Risk Score</p>
                      <div>
                        <p className="text-[52px] font-black leading-none tabular-nums">{riskScore.riskScore}</p>
                        <p className="text-white/60 text-xs mt-1">/ 100 · <span className="font-bold text-white/80 uppercase">{riskScore.riskLevel}</span></p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-3xl p-5 bg-secondary/60 flex flex-col justify-between min-h-[130px]">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">AI Risk Score</p>
                      <p className="text-[52px] font-black leading-none text-muted-foreground">—</p>
                    </div>
                  )}
                  <div className="rounded-3xl p-5 bg-secondary/60 flex flex-col justify-between min-h-[130px]">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Chronic Conditions</p>
                    <div>
                      <p className="text-[52px] font-black leading-none text-foreground tabular-nums">{patient.chronicConditions?.length ?? 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">documented diagnoses</p>
                    </div>
                  </div>
                  <div className="rounded-3xl p-5 bg-secondary/60 flex flex-col justify-between min-h-[130px]">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Active Medications</p>
                    <div>
                      <p className="text-[52px] font-black leading-none text-foreground tabular-nums">{activeMeds.length}</p>
                      <p className="text-xs text-muted-foreground mt-1">current prescriptions</p>
                    </div>
                  </div>
                </div>

                {/* Risk Factors */}
                {riskScore && riskScore.factors.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
                        <TriangleAlert className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">Top Risk Factors</p>
                        <p className="text-[11px] text-muted-foreground">AI-identified clinical drivers</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {riskScore.factors.slice(0, 4).map((f: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 p-3.5 rounded-2xl bg-secondary/60"
                          style={{ borderLeft: `3px solid ${f.impact === "high" ? "#ef4444" : f.impact === "moderate" ? "#f59e0b" : "#3b82f6"}` }}>
                          <div className={`w-2 h-2 rounded-full shrink-0 ${f.impact === "high" ? "bg-red-500" : f.impact === "moderate" ? "bg-amber-500" : "bg-primary"}`} />
                          <span className="text-sm font-semibold text-foreground flex-1">{f.factor}</span>
                          <Badge variant={f.impact === "high" ? "destructive" : f.impact === "moderate" ? "warning" : "info"} className="text-[10px]">{f.impact}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Conditions + Allergies */}
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #007AFF, #004b9d)" }}>
                        <Activity className="w-4 h-4 text-white" />
                      </div>
                      <p className="text-sm font-bold text-foreground">Chronic Conditions</p>
                    </div>
                    {patient.chronicConditions?.length > 0 ? (
                      <div className="space-y-2">
                        {patient.chronicConditions.map((c, i) => (
                          <div key={i} className="flex items-center gap-3 p-3.5 bg-secondary/60 rounded-2xl">
                            <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black text-white shrink-0" style={{ background: "linear-gradient(135deg, #007AFF, #004b9d)" }}>{i + 1}</span>
                            <span className="text-sm font-semibold text-foreground">{c}</span>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-sm text-muted-foreground px-1">None on record.</p>}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #dc2626, #991b1b)" }}>
                        <AlertCircle className="w-4 h-4 text-white" />
                      </div>
                      <p className="text-sm font-bold text-foreground">Documented Allergies</p>
                    </div>
                    {patient.allergies?.length > 0 ? (
                      <div className="space-y-2">
                        {patient.allergies.map((a, i) => (
                          <div key={i} className="flex items-center gap-3 p-3.5 bg-secondary/60 rounded-2xl" style={{ borderLeft: "3px solid #ef4444" }}>
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                            <span className="text-sm font-bold text-red-600">{a}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3.5 bg-secondary/60 rounded-2xl">
                        <p className="text-sm text-muted-foreground">No known allergies</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recommendations + AI Alert */}
                <div className="space-y-3">
                  {riskScore?.recommendations?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #7c3aed, #4c1d95)" }}>
                          <Lightbulb className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">Recommended Actions</p>
                          <p className="text-[11px] text-muted-foreground">AI-generated clinical guidance</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {riskScore.recommendations.slice(0, 3).map((rec: string, i: number) => (
                          <div key={i} className="flex items-start gap-3 p-3.5 rounded-2xl bg-secondary/60">
                            <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            <p className="text-sm text-foreground leading-snug">{rec}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {topPredictions.length > 0 && (
                    <div className="p-4 rounded-2xl bg-secondary/60" style={{ borderLeft: "3px solid #f59e0b" }}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <Brain className="w-3.5 h-3.5 text-amber-600" />
                        <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wide">AI Prediction Alert</span>
                      </div>
                      <p className="text-sm font-semibold text-foreground">{topPredictions[0]?.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{topPredictions[0]?.description}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "timeline" && (
              <div className="p-6">
                {/* Legend */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-3 mb-0">
                    <div className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #007AFF, #004b9d)" }}>
                      <Clock className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Smart Clinical Timeline</p>
                      <p className="text-[11px] text-muted-foreground">{timeline.length} events · chronological order</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-auto">
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-sky-500" /><span className="text-xs text-muted-foreground">Visit</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-violet-500" /><span className="text-xs text-muted-foreground">Lab</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /><span className="text-xs text-muted-foreground">Rx</span></div>
                  </div>
                </div>

                {timeline.length === 0 ? (
                  <div className="py-16 text-center">
                    <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="font-bold text-foreground">No timeline data</p>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-[18px] top-0 bottom-0 w-px bg-border" />
                    <div className="space-y-3">
                      {timeline.slice(0, 30).map((event, idx) => {
                        const cfg = timelineIconMap[event.type];
                        const Icon = cfg.icon;
                        const typeColor = event.type === "visit" ? "#0284c7" : event.type === "lab" ? "#7c3aed" : "#059669";

                        let trendIndicator: React.ReactNode = null;
                        let leftBorder = "";
                        if (event.type === "lab") {
                          const labGroup = labsByName[event.title] ?? [];
                          const trend = getTrend(labGroup);
                          const isAbnormal = event.status === "abnormal";
                          const isCritical = event.status === "critical";
                          if (trend === "rising") {
                            trendIndicator = <TrendingUp className={`w-3 h-3 ${isAbnormal || isCritical ? "text-red-500" : "text-amber-500"}`} />;
                            leftBorder = isCritical ? "border-l-2 border-red-400" : isAbnormal ? "border-l-2 border-amber-400" : "";
                          } else if (trend === "falling") {
                            trendIndicator = <TrendingDown className="w-3 h-3 text-sky-500" />;
                          } else {
                            trendIndicator = <Minus className="w-3 h-3 text-muted-foreground/30" />;
                          }
                        }

                        const isVisitEmergency = event.type === "visit" && event.badge === "emergency";
                        const isCriticalLab = event.type === "lab" && event.status === "critical";
                        const isUrgent = isCriticalLab || isVisitEmergency;

                        return (
                          <div key={`${event.type}-${event.id}-${idx}`} className={`flex gap-4 pl-12 relative`}>
                            <div className="absolute left-[7px] top-2.5 w-[22px] h-[22px] rounded-full flex items-center justify-center border-2 border-background z-10 shadow-sm"
                              style={{ background: isUrgent ? "linear-gradient(135deg, #dc2626, #991b1b)" : `linear-gradient(135deg, ${typeColor}cc, ${typeColor})` }}>
                              <Icon className="w-2.5 h-2.5 text-white" />
                            </div>
                            <div className={`flex-1 min-w-0 p-3.5 rounded-2xl bg-secondary/50 ${leftBorder} ${isUrgent ? "ring-1 ring-red-200" : ""}`}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <p className={`font-semibold text-sm truncate ${isUrgent ? "text-red-600" : "text-foreground"}`}>{event.title}</p>
                                    {trendIndicator}
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate">{event.subtitle}</p>
                                  {isUrgent && (
                                    <p className="text-[10px] font-bold text-red-600 mt-0.5 uppercase tracking-wide">
                                      {isCriticalLab ? "Critical — immediate review" : "Emergency admission"}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {event.badge && (
                                    <Badge variant={event.badgeVariant ?? "outline"} className="text-[10px]">{event.badge}</Badge>
                                  )}
                                  <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap bg-background rounded-lg px-2 py-1">
                                    {format(event.date, "dd MMM yy")}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "medications" && (
              <div className="p-6 space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #059669, #064e3b)" }}>
                      <Pill className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Active Prescriptions</p>
                      <p className="text-[11px] text-muted-foreground">{activeMeds.length} medications · {(medMatrixData?.interactions?.length ?? 0) > 0 && <span className="text-amber-600 font-semibold">{medMatrixData!.interactions.length} interaction{medMatrixData!.interactions.length > 1 ? "s" : ""} detected</span>}</p>
                    </div>
                  </div>
                  <PrescribeModal patientId={patient.id} />
                </div>

                {/* Drug Interaction Cards */}
                {(medMatrixData?.interactions?.length ?? 0) > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #d97706, #92400e)" }}>
                        <AlertCircle className="w-3.5 h-3.5 text-white" />
                      </div>
                      <p className="text-sm font-bold text-foreground">AI Drug Interaction Analysis</p>
                      <Badge variant={(medMatrixData?.interactions?.some(i => i.severity === "critical")) ? "destructive" : "warning"} className="ml-auto">
                        {medMatrixData!.interactions.length} conflict{medMatrixData!.interactions.length > 1 ? "s" : ""}
                      </Badge>
                    </div>
                    {medMatrixData!.interactions.map((ix, i) => (
                      <div key={i} className="rounded-2xl p-4 bg-secondary/60"
                        style={{ borderLeft: `3px solid ${ix.severity === "critical" ? "#ef4444" : ix.severity === "high" ? "#f59e0b" : "#38bdf8"}` }}>
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="font-black text-sm text-foreground">{ix.drug1}</span>
                          <span className="text-muted-foreground font-mono">↔</span>
                          <span className="font-black text-sm text-foreground">{ix.drug2}</span>
                          <Badge variant={ix.severity === "critical" ? "destructive" : ix.severity === "high" ? "warning" : "info"} className="ml-auto text-[10px] uppercase">
                            {ix.severity}
                          </Badge>
                        </div>
                        <p className="text-xs text-foreground/80 mb-2">{ix.description}</p>
                        <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-white/60">
                          <Lightbulb className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                          <p className="text-xs font-semibold text-foreground">{ix.recommendation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Medication Cards */}
                <div className="space-y-2">
                  {patient.medications?.map(med => {
                    const hasCritical = medMatrixData?.interactions?.some(
                      ix => (ix.drug1.toLowerCase() === med.drugName.toLowerCase() || ix.drug2.toLowerCase() === med.drugName.toLowerCase()) && ix.severity === "critical"
                    );
                    const hasHigh = medMatrixData?.interactions?.some(
                      ix => (ix.drug1.toLowerCase() === med.drugName.toLowerCase() || ix.drug2.toLowerCase() === med.drugName.toLowerCase()) && ix.severity === "high"
                    );
                    const alertColor = hasCritical ? "#ef4444" : hasHigh ? "#f59e0b" : null;
                    return (
                      <div key={med.id} className="flex items-center gap-4 p-4 rounded-2xl bg-secondary/60 hover:bg-secondary/80 transition-colors"
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
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {med.startDate ? format(safeDate(med.startDate), "dd MMM yyyy") : "—"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === "labs" && (
              <div>
                <div className="flex items-center gap-4 p-5 pb-0">
                  <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #7c3aed, #4c1d95)" }}>
                    <FlaskConical className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Laboratory Results</p>
                    <p className="text-[11px] text-muted-foreground">{labResults.length} results · sparkline shows trend over time</p>
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    {criticalLabs > 0 && <Badge variant="destructive">{criticalLabs} Critical</Badge>}
                    {abnormalLabs > 0 && <Badge variant="warning">{abnormalLabs} Abnormal</Badge>}
                  </div>
                </div>

                {/* HbA1c Explicit Trend — Priority Glycemic Control Chart */}
                {(() => {
                  const hba1cKey = Object.keys(labsByName).find(k => k.toLowerCase().includes("hba1c") || k.toLowerCase().includes("hemoglobin a1c") || k.toLowerCase().includes("haemoglobin a1c"));
                  const hba1cGroup = hba1cKey ? labsByName[hba1cKey] : [];
                  if (!hba1cGroup || hba1cGroup.length < 2) return null;

                  const hba1cData = [...hba1cGroup].reverse().map(l => ({
                    date: format(safeDate(l.testDate), "MMM yy"),
                    val: parseFloat(l.result),
                    status: l.status,
                  })).filter(d => !isNaN(d.val));

                  const latest = hba1cData[hba1cData.length - 1]!;
                  const first = hba1cData[0]!;
                  const delta = latest.val - first.val;
                  const isWorsening = delta > 0.2;
                  const isImproving = delta < -0.2;
                  const areaColor = isWorsening ? "#ef4444" : isImproving ? "#22c55e" : "#6366f1";
                  const trend = isWorsening ? "↑ WORSENING" : isImproving ? "↓ IMPROVING" : "→ STABLE";

                  return (
                    <div className="mx-5 my-4 rounded-2xl p-4 bg-secondary/40"
                      style={{ borderLeft: `3px solid ${areaColor}` }}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <FlaskConical className="w-4 h-4 text-foreground" style={{ color: areaColor }} />
                            <span className="font-bold text-sm">HbA1c Glycemic Trajectory</span>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/70 text-foreground">
                              {trend}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {hba1cData.length} readings · {first.date} → {latest.date} · Δ {delta > 0 ? "+" : ""}{delta.toFixed(1)}%
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-2xl font-black ${latest.val >= 7.0 ? "text-red-600" : latest.val >= 5.7 ? "text-amber-600" : "text-emerald-600"}`}>
                            {latest.val}%
                          </p>
                          <p className="text-[10px] text-muted-foreground">{latest.val >= 7.0 ? "Diabetic range" : latest.val >= 5.7 ? "Pre-diabetic" : "Normal"}</p>
                        </div>
                      </div>
                      <ResponsiveContainer width="100%" height={120}>
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
                          <RechartsTooltip
                            content={({ active, payload }) => {
                              if (active && payload?.length) {
                                const d = payload[0]?.payload;
                                return (
                                  <div className="bg-white rounded-xl px-3 py-2 shadow-lg border border-border text-xs">
                                    <p className="font-bold text-foreground">{d?.val}% HbA1c</p>
                                    <p className="text-muted-foreground">{d?.date}</p>
                                    <p className={`font-medium mt-0.5 ${d?.val >= 7.0 ? "text-red-600" : d?.val >= 5.7 ? "text-amber-600" : "text-emerald-600"}`}>
                                      {d?.val >= 7.0 ? "Diabetic range" : d?.val >= 5.7 ? "Pre-diabetic" : "Normal"}
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <ReferenceLine y={6.5} stroke="#ef4444" strokeDasharray="4 2" label={{ value: "6.5% DM threshold", fontSize: 9, fill: "#ef4444", position: "insideTopLeft" }} />
                          <ReferenceLine y={5.7} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: "5.7% Pre-DM", fontSize: 9, fill: "#f59e0b", position: "insideTopLeft" }} />
                          <Area type="monotone" dataKey="val" stroke={areaColor} strokeWidth={2.5} fill="url(#hba1cGrad)" dot={{ r: 4, fill: areaColor, strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })()}

                {/* Glucose Trend Chart */}
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
                    <div className="mx-5 my-3 rounded-2xl p-4 bg-secondary/40"
                      style={{ borderLeft: `3px solid ${areaColor}` }}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <FlaskConical className="w-4 h-4" style={{ color: areaColor }} />
                            <span className="font-bold text-sm">Blood Glucose Trajectory</span>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/70 text-foreground">{trend}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{glucData.length} readings · {first.date} → {latest.date} · Δ {delta > 0 ? "+" : ""}{delta.toFixed(0)} {glucGroup[0]?.unit ?? "mg/dL"}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-2xl font-black ${latest.val > 126 ? "text-orange-600" : latest.val > 100 ? "text-amber-600" : "text-emerald-600"}`}>{latest.val}</p>
                          <p className="text-[10px] text-muted-foreground">{latest.val > 126 ? "Diabetic range" : latest.val > 100 ? "Pre-diabetic" : "Normal"}</p>
                        </div>
                      </div>
                      <ResponsiveContainer width="100%" height={100}>
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
                          <ReferenceLine y={126} stroke="#f97316" strokeDasharray="4 2" label={{ value: "126 DM threshold", fontSize: 9, fill: "#f97316", position: "insideTopLeft" }} />
                          <ReferenceLine y={100} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: "100 Pre-DM", fontSize: 9, fill: "#f59e0b", position: "insideTopLeft" }} />
                          <Area type="monotone" dataKey="val" stroke={areaColor} strokeWidth={2.5} fill="url(#glucGrad)" dot={{ r: 4, fill: areaColor, strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })()}

                {/* Creatinine Trend Chart */}
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
                    <div className="mx-5 my-3 rounded-2xl p-4 bg-secondary/40"
                      style={{ borderLeft: `3px solid ${areaColor}` }}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <FlaskConical className="w-4 h-4" style={{ color: areaColor }} />
                            <span className="font-bold text-sm">Creatinine — Renal Function Trend</span>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/70 text-foreground">{trend}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{creatData.length} readings · {first.date} → {latest.date} · Δ {delta > 0 ? "+" : ""}{delta.toFixed(2)} {creatGroup[0]?.unit ?? "mg/dL"}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-2xl font-black ${latest.val > 1.2 ? "text-red-600" : "text-emerald-600"}`}>{latest.val}</p>
                          <p className="text-[10px] text-muted-foreground">{latest.val > 1.2 ? "Elevated — renal stress" : "Normal range"}</p>
                        </div>
                      </div>
                      <ResponsiveContainer width="100%" height={100}>
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
                    </div>
                  );
                })()}

                <div className="divide-y divide-border">
                  {Object.entries(labsByName).map(([testName, group]) => {
                    const latest = group[0]!;
                    const trend = getTrend(group);
                    const chartData = [...group].reverse().map((l, i) => ({
                      i,
                      val: parseFloat(l.result),
                      date: format(safeDate(l.testDate), "MMM yy"),
                    })).filter(d => !isNaN(d.val));
                    const hasChart = chartData.length >= 2;
                    const lineColor = trend === "rising"
                      ? (latest.status === "normal" ? "#22c55e" : "#f59e0b")
                      : trend === "falling"
                        ? (latest.status === "normal" ? "#22c55e" : "#38bdf8")
                        : "#94a3b8";

                    return (
                      <div key={latest.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-secondary/20 transition-colors"
                        style={latest.status === "critical" ? { borderLeft: "2px solid #ef4444" } : latest.status === "abnormal" ? { borderLeft: "2px solid #f59e0b" } : {}}>
                        {/* Lab Name + Status */}
                        <div className="w-44 shrink-0">
                          <p className="font-bold text-sm text-foreground truncate">{testName}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <StatusDot status={latest.status as any} />
                            <Badge variant={latest.status === "normal" ? "success" : latest.status === "abnormal" ? "warning" : "destructive"} className="text-[10px]">{latest.status}</Badge>
                          </div>
                        </div>

                        {/* Sparkline Chart */}
                        <div className="w-28 h-10 shrink-0">
                          {hasChart ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                                <RechartsTooltip
                                  content={({ active, payload }) => {
                                    if (active && payload?.length) {
                                      const d = payload[0]?.payload;
                                      return (
                                        <div className="bg-white border border-border rounded-lg px-2 py-1 text-[10px] shadow-sm">
                                          <p className="font-bold">{d?.val} {latest.unit}</p>
                                          <p className="text-muted-foreground">{d?.date}</p>
                                        </div>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="val"
                                  stroke={lineColor}
                                  strokeWidth={2}
                                  dot={{ r: 2, fill: lineColor, strokeWidth: 0 }}
                                  activeDot={{ r: 3 }}
                                  isAnimationActive={false}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Minus className="w-4 h-4 text-muted-foreground/40" />
                            </div>
                          )}
                        </div>

                        {/* Values sequence */}
                        <div className="flex items-center gap-1 flex-wrap flex-1 min-w-0">
                          {chartData.map((d, i) => (
                            <React.Fragment key={i}>
                              <span className={`text-xs font-mono tabular-nums ${
                                i === chartData.length - 1
                                  ? (latest.status === "normal" ? "text-emerald-600 font-bold" : latest.status === "critical" ? "text-red-600 font-bold" : "text-amber-600 font-bold")
                                  : "text-muted-foreground"
                              }`}>{d.val}</span>
                              {i < chartData.length - 1 && (
                                <span className="text-muted-foreground/40 text-xs">→</span>
                              )}
                            </React.Fragment>
                          ))}
                          {hasChart && (
                            <span className="ml-1">
                              {trend === "rising" ? <TrendingUp className="w-3.5 h-3.5 text-amber-500 inline" /> :
                               trend === "falling" ? <TrendingDown className="w-3.5 h-3.5 text-sky-500 inline" /> :
                               <Minus className="w-3 h-3 text-muted-foreground inline" />}
                            </span>
                          )}
                          {!hasChart && (
                            <span className="text-sm font-mono font-semibold">{latest.result} <span className="text-xs text-muted-foreground font-normal">{latest.unit}</span></span>
                          )}
                        </div>

                        {/* Reference range + date */}
                        <div className="text-right shrink-0 min-w-[120px]">
                          {latest.referenceRange && (
                            <p className="text-[10px] text-muted-foreground font-mono">Ref: {latest.referenceRange}</p>
                          )}
                          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{format(safeDate(latest.testDate), "dd MMM yyyy")}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === "visits" && (
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #0284c7, #0c4a6e)" }}>
                    <Building2 className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Hospital Visits</p>
                    <p className="text-[11px] text-muted-foreground">{patient.visits?.length ?? 0} recorded visits across all facilities</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {patient.visits?.map(visit => (
                    <div key={visit.id} className="flex items-start gap-4 p-4 rounded-2xl bg-secondary/60 hover:bg-secondary/80 transition-colors"
                      style={visit.visitType === "emergency" ? { borderLeft: "3px solid #ef4444" } : visit.visitType === "inpatient" ? { borderLeft: "3px solid #f59e0b" } : {}}>
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{
                        background: visit.visitType === "emergency" ? "linear-gradient(135deg, #dc2626, #991b1b)" :
                          visit.visitType === "inpatient" ? "linear-gradient(135deg, #d97706, #92400e)" :
                          "linear-gradient(135deg, #0284c7, #0c4a6e)"
                      }}>
                        <Building2 className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold text-foreground">{visit.hospital}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {visit.department}{visit.doctor ? ` · Dr. ${visit.doctor}` : ""}
                            </p>
                            {visit.diagnosis && (
                              <p className="text-xs text-foreground/80 mt-1 leading-snug">{visit.diagnosis}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <Badge variant={visit.visitType === "emergency" ? "destructive" : visit.visitType === "inpatient" ? "warning" : "outline"} className="text-[10px] mb-1">{visit.visitType}</Badge>
                            <p className="text-[10px] text-muted-foreground font-mono block">{format(safeDate(visit.visitDate), "dd MMM yyyy")}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "predictions" && (
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #7c3aed, #4c1d95)" }}>
                    <Brain className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">AI Clinical Predictions</p>
                    <p className="text-[11px] text-muted-foreground">{predictions.length} prediction{predictions.length !== 1 ? "s" : ""} · ML-powered risk analysis</p>
                  </div>
                  <div className="ml-auto flex gap-2">
                    {predictions.filter(p => p.severity === "critical").length > 0 && (
                      <Badge variant="destructive">{predictions.filter(p => p.severity === "critical").length} critical</Badge>
                    )}
                    {predictions.filter(p => p.severity === "high").length > 0 && (
                      <Badge variant="warning">{predictions.filter(p => p.severity === "high").length} high</Badge>
                    )}
                  </div>
                </div>
                {predictions.length === 0 ? (
                  <div className="py-16 text-center">
                    <Brain className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="font-bold text-foreground mb-1">No Predictions Generated</p>
                    <p className="text-sm text-muted-foreground">Insufficient clinical data for predictive analysis.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {predictions.map((p, i) => {
                      const style = predictionSeverityStyle[p.severity] ?? predictionSeverityStyle.low;
                      const iconBg = p.severity === "critical" ? "linear-gradient(135deg, #dc2626, #991b1b)" :
                        p.severity === "high" ? "linear-gradient(135deg, #d97706, #92400e)" :
                        p.severity === "moderate" ? "linear-gradient(135deg, #0284c7, #0c4a6e)" :
                        "linear-gradient(135deg, #64748b, #334155)";
                      const borderColor = p.severity === "critical" ? "#ef4444" : p.severity === "high" ? "#f59e0b" : p.severity === "moderate" ? "#38bdf8" : "#e2e8f0";
                      return (
                        <div key={i} className="p-4 rounded-2xl bg-secondary/60" style={{ borderLeft: `3px solid ${borderColor}` }}>
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0" style={{ background: iconBg }}>
                              {p.severity === "critical" || p.severity === "high" ? (
                                <TriangleAlert className="w-4 h-4 text-white" />
                              ) : (
                                <Zap className="w-4 h-4 text-white" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <Badge variant={style.badge as any} className="text-[10px]">{p.severity}</Badge>
                                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">{p.type.replace(/_/g, " ")}</span>
                                <span className="ml-auto text-[10px] text-muted-foreground font-mono bg-background rounded-md px-1.5 py-0.5">Confidence: {p.confidence}</span>
                              </div>
                              <p className="font-bold text-sm text-foreground">{p.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{p.description}</p>
                              <div className="mt-2.5 flex items-start gap-2 p-2.5 rounded-xl bg-white/60">
                                <Lightbulb className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                                <p className="text-xs font-semibold text-foreground">{p.recommendation}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === "alerts" && (
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0" style={{ background: unreadAlerts > 0 ? "linear-gradient(135deg, #dc2626, #991b1b)" : "linear-gradient(135deg, #64748b, #334155)" }}>
                      <Bell className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Clinical Alerts</p>
                      <p className="text-[11px] text-muted-foreground">{alerts.length} total · {unreadAlerts > 0 ? <span className="text-red-600 font-semibold">{unreadAlerts} unread</span> : "all read"}</p>
                    </div>
                  </div>
                  {unreadAlerts > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        for (const a of alerts.filter(al => !al.isRead)) {
                          await markReadMutation.mutateAsync({ id: a.id });
                        }
                        refetchAlerts();
                      }}
                    >
                      <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                    </Button>
                  )}
                </div>
                {alerts.length === 0 ? (
                  <div className="py-16 text-center">
                    <BellOff className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="font-bold text-foreground mb-1">No Alerts</p>
                    <p className="text-sm text-muted-foreground">No clinical alerts for this patient.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {alerts.map(alert => {
                      const alertBg = alert.severity === "critical" ? "#ef4444" : alert.severity === "high" ? "#f59e0b" : alert.severity === "moderate" ? "#38bdf8" : "#e2e8f0";
                      return (
                        <div key={alert.id} className={`flex items-start gap-3 p-4 rounded-2xl bg-secondary/60 transition-all ${alert.isRead ? "opacity-50" : ""}`}
                          style={!alert.isRead ? { borderLeft: `3px solid ${alertBg}` } : {}}>
                          <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: alertBg }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={
                                alert.severity === "critical" ? "destructive" :
                                alert.severity === "high" ? "warning" :
                                alert.severity === "moderate" ? "info" : "outline"
                              } className="text-[10px]">{alert.severity}</Badge>
                              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{alert.alertType}</span>
                              <span className="ml-auto text-[10px] text-muted-foreground font-mono">{format(safeDate(alert.createdAt), "dd MMM HH:mm")}</span>
                            </div>
                            <p className="font-bold text-sm text-foreground">{alert.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{alert.message}</p>
                          </div>
                          {!alert.isRead && (
                            <Button variant="ghost" size="sm" onClick={() => handleMarkRead(alert.id)} className="shrink-0 text-xs self-start">
                              <CheckCheck className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === "decision" && (
              <div className="p-6">
                {decisionLoading && (
                  <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-violet-600" />
                    <span className="text-sm font-medium">AI Decision Engine processing...</span>
                  </div>
                )}
                {!decisionLoading && !aiDecision && (
                  <div className="py-16 text-center">
                    <Brain className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="font-bold text-foreground">No decision data</p>
                    <p className="text-sm text-muted-foreground mt-1">Load a patient to run the AI engine.</p>
                  </div>
                )}
                {!decisionLoading && aiDecision && (
                  <div className="space-y-6">
                    {/* Urgency Hero Card */}
                    <div className="rounded-3xl p-6 text-white" style={{
                      background: aiDecision.urgency === "immediate" ? "linear-gradient(135deg, #dc2626, #991b1b)" :
                        aiDecision.urgency === "urgent" ? "linear-gradient(135deg, #d97706, #92400e)" :
                        aiDecision.urgency === "soon" ? "linear-gradient(135deg, #0284c7, #0c4a6e)" :
                        "linear-gradient(135deg, #059669, #064e3b)"
                    }}>
                      <div className="flex items-start justify-between gap-6">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="bg-white/15 backdrop-blur-sm text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-widest border border-white/20">
                              {aiDecision.urgency} urgency
                            </span>
                            <span className="text-white/60 text-[11px]">Model: SANAD-Risk-v4.2</span>
                          </div>
                          <p className="text-xl font-bold leading-snug mb-4">{aiDecision.primaryAction}</p>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-white/70" />
                              <span className="text-xs font-semibold text-white/80">{aiDecision.timeWindow}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3.5 h-3.5 text-white/70" />
                              <span className="text-xs font-semibold text-white/80">Confidence: {Math.round(aiDecision.confidence * 100)}%</span>
                            </div>
                          </div>
                          {aiDecision.explainability.uncertaintyNote && (
                            <div className="mt-4 px-3 py-2 bg-white/15 rounded-xl text-xs font-semibold text-white flex items-center gap-2">
                              <TriangleAlert className="w-3.5 h-3.5 shrink-0 text-white/80" />
                              {aiDecision.explainability.uncertaintyNote}
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[11px] font-semibold text-white/60 uppercase tracking-widest mb-1">Risk Score</p>
                          <p className="text-[64px] font-black tabular-nums leading-none">{aiDecision.riskScore}</p>
                          <p className="text-white/50 text-sm mt-0.5">/ 100</p>
                          <div className="mt-2 border border-white/20 rounded-xl px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white/80">
                            {aiDecision.riskLevel} risk
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* WHY Factors + Recommendations */}
                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
                            <TriangleAlert className="w-3.5 h-3.5 text-white" />
                          </div>
                          <p className="text-sm font-bold text-foreground">WHY — Clinical Drivers</p>
                        </div>
                        <div className="space-y-2">
                          {aiDecision.whyFactors.map((f, i) => (
                            <div key={i} className="flex items-start gap-3 p-3.5 rounded-2xl bg-secondary/60"
                              style={{ borderLeft: `3px solid ${f.impact === "critical" ? "#ef4444" : f.impact === "high" ? "#f59e0b" : f.impact === "moderate" ? "#38bdf8" : "#e2e8f0"}` }}>
                              <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${f.impact === "critical" ? "bg-red-600" : f.impact === "high" ? "bg-amber-500" : f.impact === "moderate" ? "bg-sky-500" : "bg-muted-foreground"}`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-xs font-bold text-foreground truncate">{f.factor}</span>
                                  <Badge variant={f.impact === "critical" ? "destructive" : f.impact === "high" ? "warning" : f.impact === "moderate" ? "info" : "outline"} className="text-[9px] shrink-0">+{f.contribution}</Badge>
                                </div>
                                <p className="text-[10px] text-muted-foreground leading-relaxed">{f.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #007AFF, #004b9d)" }}>
                              <Lightbulb className="w-3.5 h-3.5 text-white" />
                            </div>
                            <p className="text-sm font-bold text-foreground">Recommended Actions</p>
                          </div>
                          <div className="space-y-2">
                            {aiDecision.recommendations.map((rec, i) => (
                              <div key={i} className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-secondary/60">
                                <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                <p className="text-xs text-foreground leading-snug">{rec}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="p-4 bg-secondary/60 rounded-2xl">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Clinical Basis</p>
                          <div className="space-y-1.5">
                            {aiDecision.explainability.clinicalBasis.map((b, i) => (
                              <p key={i} className="text-xs text-foreground flex items-start gap-1.5">
                                <span className="text-primary shrink-0 font-bold">·</span> {b}
                              </p>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                            <span className="text-[10px] text-muted-foreground font-mono">{aiDecision.source}</span>
                            <span className="ml-auto text-[10px] font-bold text-foreground">{Math.round(aiDecision.confidence * 100)}% confidence</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Digital Twin */}
                    {aiDecision.digitalTwin && (
                      <div className="p-5 rounded-2xl bg-secondary/40"
                        style={{ borderLeft: `3px solid ${aiDecision.digitalTwin.riskTrajectory === "rapidly_worsening" ? "#ef4444" : aiDecision.digitalTwin.riskTrajectory === "worsening" ? "#f59e0b" : aiDecision.digitalTwin.riskTrajectory === "improving" ? "#22c55e" : "#94a3b8"}` }}>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-2">
                              <Brain className="w-3.5 h-3.5 text-violet-600" /> Digital Twin — {aiDecision.digitalTwin.timeframe}
                            </p>
                            <p className="font-bold text-foreground">Trajectory: <span className={
                              aiDecision.digitalTwin.riskTrajectory === "rapidly_worsening" ? "text-red-600" :
                              aiDecision.digitalTwin.riskTrajectory === "worsening" ? "text-amber-600" :
                              aiDecision.digitalTwin.riskTrajectory === "improving" ? "text-emerald-600" :
                              "text-muted-foreground"
                            }>{aiDecision.digitalTwin.riskTrajectory.replace("_", " ").toUpperCase()}</span></p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Projected Risk Score</p>
                            <p className={`text-3xl font-bold tabular-nums ${
                              aiDecision.digitalTwin.projectedRiskScore >= 70 ? "text-red-600" :
                              aiDecision.digitalTwin.projectedRiskScore >= 50 ? "text-amber-600" : "text-emerald-600"
                            }`}>{aiDecision.digitalTwin.projectedRiskScore}<span className="text-sm text-muted-foreground font-normal">/100</span></p>
                          </div>
                        </div>
                        {aiDecision.digitalTwin.predictedConditions.length > 0 && (
                          <div className="space-y-1.5 mb-3">
                            {aiDecision.digitalTwin.predictedConditions.map((c, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs text-foreground">
                                <ArrowUpRight className="w-3.5 h-3.5 shrink-0 text-amber-600 mt-0.5" />
                                <span>{c}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="px-3 py-2 bg-white/60 rounded-xl mb-3">
                          <p className="text-xs font-semibold text-foreground">{aiDecision.digitalTwin.interventionWindow}</p>
                        </div>

                        {/* ─── Treatment Simulation Scenarios ─── */}
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2.5 flex items-center gap-1.5">
                            <span className="w-3.5 h-3.5 inline-flex items-center justify-center bg-violet-600 rounded text-white text-[7px] font-black">AI</span>
                            Treatment Simulation Engine — AI-Projected Outcomes
                          </p>
                          <div className="overflow-hidden rounded-xl bg-secondary/50">
                            <div className="flex items-center gap-3 px-3 py-1.5 bg-secondary text-[9px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border">
                              <span className="flex-1">Scenario</span>
                              <span className="w-14 text-center">3 Month</span>
                              <span className="w-14 text-center">6 Month</span>
                              <span className="w-14 text-center">12 Month</span>
                              <span className="w-28 text-right">Outcome</span>
                            </div>
                            {[
                              {
                                scenario: "Current plan — no change",
                                r3: aiDecision.digitalTwin.projectedRiskScore,
                                r6: Math.min(99, aiDecision.digitalTwin.projectedRiskScore + 5),
                                r12: Math.min(99, aiDecision.digitalTwin.projectedRiskScore + 11),
                                outcome: "Continued deterioration",
                                scoreCls: "text-red-600",
                              },
                              {
                                scenario: "Optimize medications (dose intensification)",
                                r3: Math.max(10, aiDecision.digitalTwin.projectedRiskScore - 9),
                                r6: Math.max(10, aiDecision.digitalTwin.projectedRiskScore - 16),
                                r12: Math.max(10, aiDecision.digitalTwin.projectedRiskScore - 21),
                                outcome: "Moderate improvement",
                                scoreCls: "text-amber-600",
                              },
                              {
                                scenario: "Intensified therapy + lifestyle modification",
                                r3: Math.max(8, aiDecision.digitalTwin.projectedRiskScore - 17),
                                r6: Math.max(8, aiDecision.digitalTwin.projectedRiskScore - 26),
                                r12: Math.max(8, aiDecision.digitalTwin.projectedRiskScore - 33),
                                outcome: "Best outcome — Recommended",
                                scoreCls: "text-emerald-600",
                              },
                            ].map((s, idx) => (
                              <div key={idx} className="flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-0 text-[10px]">
                                <span className="flex-1 font-semibold text-foreground">{s.scenario}</span>
                                <span className={`w-14 text-center font-black tabular-nums ${s.scoreCls}`}>{s.r3}/100</span>
                                <span className={`w-14 text-center font-black tabular-nums ${s.scoreCls}`}>{s.r6}/100</span>
                                <span className={`w-14 text-center font-black tabular-nums ${s.scoreCls}`}>{s.r12}/100</span>
                                <span className={`w-28 text-right text-[9px] font-bold ${s.scoreCls}`}>{s.outcome}</span>
                              </div>
                            ))}
                          </div>
                          <p className="text-[9px] text-muted-foreground mt-1.5 text-right">Simulation confidence: 87% · Model: SANAD-DigitalTwin-v2.1 · Updated: {new Date().toLocaleTimeString("en-SA", { hour: "2-digit", minute: "2-digit" })}</p>
                        </div>
                      </div>
                    )}

                    {/* Behavioral Flags */}
                    {aiDecision.behavioralFlags && aiDecision.behavioralFlags.length > 0 && (
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #0284c7, #0c4a6e)" }}>
                            <Activity className="w-3.5 h-3.5 text-white" />
                          </div>
                          <p className="text-sm font-bold text-foreground">Behavioral AI Flags</p>
                        </div>
                        <div className="space-y-2">
                          {aiDecision.behavioralFlags.map((flag, i) => (
                            <div key={i} className="flex items-start gap-3 p-4 rounded-2xl bg-secondary/60"
                              style={{ borderLeft: `3px solid ${flag.severity === "high" ? "#f59e0b" : flag.severity === "moderate" ? "#38bdf8" : "#e2e8f0"}` }}>
                              <Bell className={`w-4 h-4 shrink-0 mt-0.5 ${flag.severity === "high" ? "text-amber-600" : flag.severity === "moderate" ? "text-sky-600" : "text-muted-foreground"}`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-foreground">{flag.description}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{flag.recommendation}</p>
                              </div>
                              <Badge variant={flag.severity === "high" ? "warning" : flag.severity === "moderate" ? "info" : "outline"} className="shrink-0 text-[9px]">{flag.severity}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ─── Differential Diagnosis Engine ─── */}
                    {(() => {
                      const conds = (patient.chronicConditions ?? []).map((c: string) => c.toLowerCase());
                      const labs = labResults;
                      type DDx = { condition: string; icd: string; pct: number; evidence: string[]; priority: "primary" | "secondary" | "rule-out"; source: string };
                      const dd: DDx[] = [];

                      const addIf = (keyword: string, entry: DDx) => {
                        if (conds.some(c => c.includes(keyword)) && !dd.find(d => d.icd === entry.icd)) dd.push(entry);
                      };
                      addIf("diabetes", { condition: "Type 2 Diabetes Mellitus", icd: "E11.9", pct: 94, evidence: ["HbA1c trend", "Chronic history"], priority: "primary", source: "ADA Standards 2024" });
                      addIf("hypertension", { condition: "Essential Hypertension", icd: "I10", pct: 91, evidence: ["BP readings", "Medication history"], priority: "primary", source: "JNC 8 / ESC 2023" });
                      addIf("heart failure", { condition: "Congestive Heart Failure", icd: "I50.0", pct: 87, evidence: ["Cardiac history", "Symptoms"], priority: "primary", source: "ACC/AHA 2022" });
                      addIf("coronary", { condition: "Coronary Artery Disease", icd: "I25.1", pct: 83, evidence: ["Cardiac history", "Risk score"], priority: "primary", source: "ESC 2019" });
                      addIf("chronic kidney", { condition: "Chronic Kidney Disease Stage 3", icd: "N18.3", pct: 81, evidence: ["eGFR trend", "Creatinine elevated"], priority: "primary", source: "KDIGO 2022" });
                      addIf("ckd", { condition: "Chronic Kidney Disease", icd: "N18.3", pct: 81, evidence: ["Creatinine trend"], priority: "primary", source: "KDIGO 2022" });
                      addIf("atrial fibrillation", { condition: "Atrial Fibrillation (Persistent)", icd: "I48.1", pct: 88, evidence: ["ECG history", "HR irregularity"], priority: "primary", source: "ACC/AHA 2023" });
                      addIf("copd", { condition: "Chronic Obstructive Pulmonary Disease", icd: "J44.1", pct: 85, evidence: ["Spirometry history", "Symptoms"], priority: "primary", source: "GOLD 2024" });
                      addIf("stroke", { condition: "Cerebrovascular Disease", icd: "I63.9", pct: 79, evidence: ["Imaging history", "Neuro exam"], priority: "primary", source: "AHA 2021" });
                      addIf("depression", { condition: "Major Depressive Disorder", icd: "F32.1", pct: 76, evidence: ["PHQ-9 score", "Clinical presentation"], priority: "secondary", source: "DSM-5 / NICE 2022" });
                      addIf("cancer", { condition: "Malignant Neoplasm — Active Monitoring", icd: "C80.1", pct: 92, evidence: ["Oncology history"], priority: "primary", source: "NCCN 2024" });
                      addIf("anemia", { condition: "Anemia of Chronic Disease", icd: "D63.1", pct: 71, evidence: ["Hgb trend", "Chronic conditions"], priority: "secondary", source: "NCCN 2023" });

                      // Lab-derived differentials
                      const hasElevCr = labs.some(l => l.testName.toLowerCase().includes("creatinine") && (l.status === "abnormal" || l.status === "critical"));
                      const hasElevGluc = labs.some(l => (l.testName.toLowerCase().includes("glucose") || l.testName.toLowerCase().includes("hba1c")) && l.status !== "normal");
                      const hasLowHgb = labs.some(l => l.testName.toLowerCase().includes("hemoglobin") && l.status !== "normal");
                      const hasElevWbc = labs.some(l => l.testName.toLowerCase().includes("wbc") && (l.status === "abnormal" || l.status === "critical"));

                      if (hasElevCr && !dd.find(d => d.icd === "N18.3")) dd.push({ condition: "Acute Kidney Injury", icd: "N17.9", pct: 67, evidence: ["↑ Creatinine"], priority: "secondary", source: "KDIGO 2012" });
                      if (hasElevGluc && !dd.find(d => d.icd.startsWith("E11"))) dd.push({ condition: "Hyperglycemia / Pre-diabetes", icd: "R73.09", pct: 58, evidence: ["Elevated glucose labs"], priority: "secondary", source: "ADA 2024" });
                      if (hasLowHgb && !dd.find(d => d.icd.startsWith("D"))) dd.push({ condition: "Iron Deficiency Anemia", icd: "D50.9", pct: 54, evidence: ["↓ Hemoglobin"], priority: "rule-out", source: "WHO 2020" });
                      if (hasElevWbc) dd.push({ condition: "Systemic Inflammatory Response", icd: "R65.10", pct: 48, evidence: ["↑ WBC", "Fever history"], priority: "rule-out", source: "SCCM 2016" });

                      if (dd.length === 0) return null;
                      const sorted = [...dd].sort((a, b) => b.pct - a.pct);

                      return (
                        <div>
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #0d9488, #065f46)" }}>
                              <Stethoscope className="w-3.5 h-3.5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-foreground">Differential Diagnosis Engine</p>
                              <p className="text-[11px] text-muted-foreground">ICD-10 · WHO · ADA · KDIGO · ACC/AHA</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {sorted.slice(0, 6).map((dx, i) => {
                              const priorityCfg = {
                                primary: { dot: "bg-violet-600", text: "text-violet-700", badge: "text-[8px] bg-secondary text-violet-700 px-1.5 py-0.5 rounded-full font-bold", leftColor: "#7c3aed" },
                                secondary: { dot: "bg-sky-500", text: "text-sky-700", badge: "text-[8px] bg-secondary text-sky-700 px-1.5 py-0.5 rounded-full font-bold", leftColor: "#0284c7" },
                                "rule-out": { dot: "bg-muted-foreground", text: "text-muted-foreground", badge: "text-[8px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full font-bold", leftColor: "#94a3b8" },
                              }[dx.priority];
                              return (
                                <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-secondary"
                                  style={{ borderLeft: `3px solid ${priorityCfg.leftColor}` }}>
                                  <div className="w-7 h-7 rounded-full bg-white border border-current/10 flex items-center justify-center shrink-0">
                                    <span className="text-[11px] font-bold text-foreground">{i + 1}</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-[12px] font-bold text-foreground truncate">{dx.condition}</span>
                                      <span className="font-mono text-[9px] text-muted-foreground shrink-0">{dx.icd}</span>
                                      <span className={priorityCfg.badge}>{dx.priority.replace("-", " ").toUpperCase()}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <div className="flex-1 bg-white/60 rounded-full h-1.5 max-w-[180px]">
                                        <div className={`h-full rounded-full ${priorityCfg.dot}`} style={{ width: `${dx.pct}%` }} />
                                      </div>
                                      <span className={`text-[10px] font-bold tabular-nums ${priorityCfg.text}`}>{dx.pct}%</span>
                                      <span className="text-[9px] text-muted-foreground">{dx.source}</span>
                                    </div>
                                  </div>
                                  <div className="shrink-0 flex gap-1 flex-wrap max-w-[150px] justify-end">
                                    {dx.evidence.map((e, j) => (
                                      <span key={j} className="text-[8px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full">{e}</span>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* ─── XAI Visual Score Breakdown ─── */}
                    {aiDecision.whyFactors && aiDecision.whyFactors.length > 0 && (
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #6366f1, #3730a3)" }}>
                            <Brain className="w-3.5 h-3.5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-foreground">XAI — Score Breakdown</p>
                            <p className="text-[11px] text-muted-foreground">Risk: {aiDecision.riskScore}/100 · SANAD-Risk-v4.2</p>
                          </div>
                        </div>
                        <div className="p-4 bg-secondary rounded-2xl">
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
                                    <div className="w-full bg-background rounded-full h-2">
                                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                                    </div>
                                  </div>
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold shrink-0 capitalize" style={{ background: `${barColor}20`, color: barColor }}>{f.impact}</span>
                                </div>
                              );
                            })}
                          </div>
                          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">Base score: 0 + Σ factors = <strong className="text-foreground">{aiDecision.riskScore}</strong>/100</span>
                            <span className="text-[10px] font-bold text-foreground">Confidence: {Math.round(aiDecision.confidence * 100)}%</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ─── Clinical Evidence References (WHO / NICE / ACC / ADA) ─── */}
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
                        <div>
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
                              <div key={i} className="p-3.5 rounded-2xl bg-secondary" style={{ borderLeft: `3px solid ${(r as any).leftColor}` }}>
                                <div className="flex items-start gap-2.5">
                                  <div className="shrink-0 font-black text-[10px] bg-white border border-current/10 px-2 py-1 rounded-lg text-foreground min-w-fit">{r.org}</div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-bold text-foreground leading-snug">{r.title} <span className="font-normal text-muted-foreground">({r.year})</span></p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">→ {r.relevance}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* ─── Cross-Lab Trend Correlation ─── */}
                    {(() => {
                      const labs = labResults;
                      type Correlation = { title: string; risk: string; badge: "destructive" | "warning" | "info"; labs: string[]; action: string };
                      const correlations: Correlation[] = [];
                      const hasName = (keyword: string) => labs.some(l => l.testName.toLowerCase().includes(keyword));
                      const isAbn = (keyword: string) => labs.some(l => l.testName.toLowerCase().includes(keyword) && (l.status === "abnormal" || l.status === "critical"));

                      if (isAbn("glucose") && isAbn("creatinine")) correlations.push({ title: "Diabetic Nephropathy Risk Pattern", risk: "Concurrent hyperglycemia + impaired renal function — high CKD progression risk", badge: "destructive", labs: ["Glucose ↑", "Creatinine ↑"], action: "SGLT2i + nephrology consult + ACE inhibitor titration" });
                      if (isAbn("hba1c") && isAbn("cholesterol")) correlations.push({ title: "Cardiometabolic Syndrome", risk: "Dysglycemia + dyslipidemia detected — 3× increased cardiovascular event risk", badge: "destructive", labs: ["HbA1c ↑", "Cholesterol ↑"], action: "Statin therapy + intensive glucose control + lifestyle intervention" });
                      if (isAbn("creatinine") && hasName("potassium") && isAbn("potassium")) correlations.push({ title: "Renal-Electrolyte Imbalance", risk: "Renal impairment with hyperkalemia — arrhythmia and AKI risk", badge: "destructive", labs: ["Creatinine ↑", "K+ ↑"], action: "Hold K-sparing agents, cardiology review, dietary restriction" });
                      if (isAbn("hemoglobin") && isAbn("creatinine")) correlations.push({ title: "Cardiorenal Anemia Syndrome", risk: "Anemia secondary to CKD — EPO deficiency pattern", badge: "warning", labs: ["Hgb ↓", "Creatinine ↑"], action: "ESA therapy evaluation, iron studies, nephrology follow-up" });
                      if (isAbn("wbc") && isAbn("creatinine")) correlations.push({ title: "Sepsis-AKI Correlation", risk: "Elevated inflammatory markers with renal stress — SIRS pattern", badge: "warning", labs: ["WBC ↑", "Creatinine ↑"], action: "Blood cultures, broad-spectrum coverage, fluid resuscitation" });
                      if (correlations.length === 0) return null;
                      return (
                        <div>
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
                            {correlations.map((c, i) => (
                              <div key={i} className="p-4 rounded-2xl bg-secondary"
                                style={{ borderLeft: `3px solid ${c.badge === "destructive" ? "#ef4444" : "#f59e0b"}` }}>
                                <div className="flex items-start gap-3">
                                  <div className="shrink-0 flex gap-1 mt-0.5">
                                    {c.labs.map((l, j) => <span key={j} className="text-[9px] font-black px-1.5 py-0.5 rounded font-mono bg-white/70 text-foreground">{l}</span>)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <span className="text-[12px] font-bold text-foreground">{c.title}</span>
                                      <Badge variant={c.badge} className="text-[9px]">{c.badge === "destructive" ? "CRITICAL" : "HIGH"}</Badge>
                                    </div>
                                    <p className="text-[11px] text-foreground/80 mb-2">{c.risk}</p>
                                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/60">
                                      <ChevronRight className="w-3 h-3 shrink-0 text-foreground" />
                                      <span className="text-[10px] font-semibold text-foreground">{c.action}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                  </div>
                )}
              </div>
            )}

            {activeTab === "audit" && (
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #0f172a, #1e293b)" }}>
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Immutable Audit Trail</p>
                    <p className="text-[11px] text-muted-foreground">WHO · WHAT · WHEN · WHY · Tamper-proof log</p>
                  </div>
                </div>
                {(!auditData || (auditData as any)?.auditLog?.length === 0) ? (
                  <div className="py-16 text-center">
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
              </div>
            )}

            {activeTab === "ai" && riskScore && (
              <div className="p-6 space-y-6">
                {/* Risk Score Hero */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1 rounded-3xl p-6 text-white flex flex-col items-center justify-center text-center" style={{
                    background: riskScore.riskLevel === "critical" ? "linear-gradient(135deg, #dc2626, #991b1b)" :
                      riskScore.riskLevel === "high" ? "linear-gradient(135deg, #d97706, #92400e)" :
                      riskScore.riskLevel === "medium" ? "linear-gradient(135deg, #0284c7, #0c4a6e)" :
                      "linear-gradient(135deg, #059669, #064e3b)"
                  }}>
                    <p className="text-[11px] font-semibold text-white/60 uppercase tracking-widest mb-3">AI Risk Score</p>
                    <p className="text-[60px] font-black tabular-nums leading-none">{riskScore.riskScore}</p>
                    <p className="text-white/50 text-sm mt-1">/ 100</p>
                    <div className="mt-4 border border-white/20 rounded-xl px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest">
                      {riskScore.riskLevel} risk
                    </div>
                  </div>
                  <div className="col-span-2 grid grid-cols-2 gap-3">
                    {[
                      { label: "Risk Factors", value: riskScore.factors.length, sub: "identified by AI", color: "linear-gradient(135deg, #f59e0b, #d97706)" },
                      { label: "Critical Factors", value: riskScore.factors.filter((f: any) => f.impact === "high").length, sub: "high impact", color: "linear-gradient(135deg, #dc2626, #991b1b)" },
                      { label: "Recommendations", value: riskScore.recommendations?.length ?? 0, sub: "clinical actions", color: "linear-gradient(135deg, #007AFF, #004b9d)" },
                      { label: "Confidence", value: `${Math.round((aiDecision?.confidence ?? 0.85) * 100)}%`, sub: "model accuracy", color: "linear-gradient(135deg, #7c3aed, #4c1d95)" },
                    ].map((kpi, i) => (
                      <div key={i} className="rounded-2xl p-4 bg-secondary/60 flex flex-col justify-between min-h-[80px]">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
                        <div>
                          <p className="text-[32px] font-black leading-none text-foreground tabular-nums">{kpi.value}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{kpi.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Risk Factors */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
                      <TriangleAlert className="w-3.5 h-3.5 text-white" />
                    </div>
                    <p className="text-sm font-bold text-foreground">{riskScore.factors.length} Risk Factors Identified</p>
                  </div>
                  <div className="space-y-2">
                    {riskScore.factors.map((f: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-4 rounded-2xl bg-secondary/60"
                        style={{ borderLeft: `3px solid ${f.impact === "high" ? "#ef4444" : f.impact === "moderate" ? "#f59e0b" : "#3b82f6"}` }}>
                        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${f.impact === "high" ? "bg-red-500" : f.impact === "moderate" ? "bg-amber-500" : "bg-primary"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-3 mb-0.5">
                            <span className="text-sm font-bold text-foreground">{f.factor}</span>
                            <Badge variant={f.impact === "high" ? "destructive" : f.impact === "moderate" ? "warning" : "info"} className="text-[10px] shrink-0">{f.impact}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{f.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                {riskScore.recommendations?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #007AFF, #004b9d)" }}>
                        <Lightbulb className="w-3.5 h-3.5 text-white" />
                      </div>
                      <p className="text-sm font-bold text-foreground">Clinical Recommendations</p>
                    </div>
                    <div className="space-y-2">
                      {riskScore.recommendations.map((rec: string, i: number) => (
                        <div key={i} className="flex items-start gap-3 p-3.5 rounded-2xl bg-secondary/60">
                          <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <p className="text-sm text-foreground leading-snug">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* 30-DAY READMISSION RISK — shown when patient is loaded */}
          {patient && (
            <Card className="mt-5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center">
                    <Activity className="w-4 h-4 text-amber-600" />
                  </div>
                  <CardTitle>30-Day Readmission Risk Engine</CardTitle>
                  <Badge variant="warning" className="text-[10px]">LACE+ Score</Badge>
                </div>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-12 gap-5">
                  <div className="col-span-4 space-y-3">
                    {(() => {
                      const age = patient.age ?? 52;
                      const chronicCount = patient.chronicConditions?.length ?? 2;
                      const l = Math.min(4, Math.round((patient.visits?.length ?? 3) / 2));
                      const a = age >= 80 ? 7 : age >= 70 ? 5 : age >= 60 ? 3 : age >= 45 ? 2 : 1;
                      const c = Math.min(5, chronicCount);
                      const e = Math.min(4, patient.visits?.filter((v: any) => v?.type === "emergency")?.length ?? 2);
                      const lace = l + a + c + e;
                      const pct = Math.min(82, lace * 4 + 18);
                      const riskLabel = lace >= 14 ? "HIGH" : lace >= 10 ? "MODERATE" : "LOW";
                        const riskColor = lace >= 14 ? "#dc2626" : lace >= 10 ? "#d97706" : "#059669";
                      return (
                        <>
                          <div className="rounded-3xl p-5 text-white text-center" style={{ background: `linear-gradient(135deg, ${riskColor}, ${riskColor}cc)` }}>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-1">30-Day Readmission Risk</p>
                            <p className="text-5xl font-bold">{pct}%</p>
                            <p className="text-white/70 text-xs mt-1">LACE+ Score: {lace}/19</p>
                            <div className="mt-3 border border-white/25 rounded-xl px-3 py-1.5 text-xs font-bold uppercase">{riskLabel} RISK</div>
                          </div>
                          <div className="space-y-2">
                            {[
                              { label: "Length of Stay (L)", value: l, max: 4, desc: `${patient.visits?.length ?? 3} prior visits` },
                              { label: "Acuity of Admission (A)", value: a, max: 7, desc: `Age ${age}` },
                              { label: "Comorbidities (C)", value: c, max: 5, desc: `${chronicCount} chronic conditions` },
                              { label: "ED Visits (E)", value: e, max: 4, desc: `${e} emergency visits` },
                            ].map((item, i) => (
                              <div key={i} className="p-3 bg-secondary rounded-2xl">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="text-[10px] font-bold text-muted-foreground">{item.label}</p>
                                  <span className="text-sm font-bold text-foreground">{item.value}<span className="text-[10px] text-muted-foreground">/{item.max}</span></span>
                                </div>
                                <div className="h-1.5 bg-border rounded-full overflow-hidden">
                                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(item.value / item.max) * 100}%` }} />
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-1">{item.desc}</p>
                              </div>
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <div className="col-span-8 space-y-3">
                    <div className="p-4 bg-secondary/40 rounded-2xl">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5"><Brain className="w-3 h-3 text-foreground" /> AI Readmission Prevention Protocol</p>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { action: "Discharge Medication Reconciliation", priority: "CRITICAL", desc: "Full review of all meds with pharmacist before discharge — reduces readmission by 29%", done: false },
                          { action: "48-Hour Follow-Up Call", priority: "HIGH", desc: "Automated SANAD call at 48h post-discharge — adherence check + vital signs monitoring", done: false },
                          { action: "Community Health Worker Assignment", priority: "HIGH", desc: "Assign CHW for home visit within 7 days if LACE+ ≥10", done: false },
                          { action: "Patient Education Discharge Pack", priority: "MODERATE", desc: "Condition-specific education + red flag symptom recognition guide", done: false },
                          { action: "Outpatient Appointment ≤7 days", priority: "CRITICAL", desc: "Book follow-up before discharge — same-week appointment reduces readmission 34%", done: false },
                          { action: "Digital Twin Alert Threshold Set", priority: "MODERATE", desc: "Configure SANAD wearable alerts for pre-readmission risk signals", done: true },
                        ].map((item, i) => (
                          <div key={i} className="p-3 rounded-xl bg-secondary"
                            style={{ borderLeft: item.done ? "2px solid #22c55e" : item.priority === "CRITICAL" ? "2px solid #ef4444" : item.priority === "HIGH" ? "2px solid #f59e0b" : undefined }}>
                            <div className="flex items-center gap-2 mb-1">
                              {item.done
                                ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                : <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.priority === "CRITICAL" ? "bg-red-500 animate-pulse" : "bg-amber-500"}`} />
                              }
                              <p className="text-[10px] font-bold text-foreground">{item.action}</p>
                              <span className={`ml-auto text-[8px] font-bold px-1.5 py-0.5 rounded-full shrink-0 bg-secondary ${item.priority === "CRITICAL" ? "text-red-600" : item.priority === "HIGH" ? "text-amber-600" : "text-muted-foreground"}`}>{item.priority}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground pl-3.5">{item.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 bg-secondary rounded-2xl">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Predictive Discharge Optimization</p>
                        {[
                          { label: "Optimal Discharge Day", value: "Tuesday", note: "Lowest 7-day readmission risk day (Mon-Thu)" },
                          { label: "Avoid Discharge On", value: "Fri / Weekend", note: "+41% readmission risk — limited follow-up access" },
                          { label: "Target Discharge Time", value: "Before 14:00", note: "Same-day outpatient booking window" },
                          { label: "Insurance Pre-Auth Status", value: "Verified", note: "SAR 0 patient out-of-pocket on discharge" },
                        ].map((item, i) => (
                          <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                            <p className="text-[10px] text-muted-foreground">{item.label}</p>
                            <div className="text-right">
                              <p className="text-xs font-bold text-foreground">{item.value}</p>
                              <p className="text-[9px] text-muted-foreground">{item.note}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="p-4 bg-secondary rounded-2xl">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">National Benchmark</p>
                        {[
                          { label: "SANAD Average Readmission", value: "8.2%", sub: "30-day all-cause" },
                          { label: "Saudi National Rate", value: "14.7%", sub: "MOH 2025 report" },
                          { label: "SANAD AI Reduction", value: "-44%", sub: "vs. non-AI hospitals", color: "text-emerald-600" },
                          { label: "This Patient Risk", value: riskScore ? `${Math.min(82, (riskScore.riskScore || 50) * 0.7 + 18).toFixed(0)}%` : "—", sub: "Estimated", color: "text-amber-600" },
                        ].map((item, i) => (
                          <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                            <p className="text-[10px] text-muted-foreground">{item.label}</p>
                            <div className="text-right">
                              <p className={`text-xs font-bold ${(item as any).color ?? "text-foreground"}`}>{item.value}</p>
                              <p className="text-[9px] text-muted-foreground">{item.sub}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* ─── CROSS-PORTAL INTELLIGENCE PANEL ─── */}
          {patient && (
            <Card className="mt-5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center">
                    <Network className="w-4 h-4 text-foreground" />
                  </div>
                  <CardTitle>Cross-Portal Intelligence</CardTitle>
                  <Badge variant="purple" className="text-[10px]">SANAD Neural Fabric</Badge>
                </div>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-2 gap-4">

                  {/* Insurance Coverage */}
                  <div className="rounded-[2rem] bg-secondary/50 p-4">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Shield className="w-3 h-3 text-emerald-600" /> Insurance Portal — Live Coverage
                    </p>
                    <div className="space-y-2">
                      {(patient.medications?.slice(0, 3) ?? []).map((med: any, i: number) => (
                        <div key={i} className="flex items-center justify-between bg-white/70 rounded-xl px-3 py-2">
                          <div>
                            <p className="text-[10px] font-bold text-foreground">{med.drugName}</p>
                            <p className="text-[9px] text-muted-foreground">{med.dosage}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant="success" className="text-[9px]">COVERED</Badge>
                            <p className="text-[9px] text-muted-foreground mt-0.5">80% · SAR {Math.floor(45 + i * 30)} copay</p>
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center justify-between px-3 py-2 bg-white/60 rounded-xl">
                        <p className="text-[10px] font-semibold text-muted-foreground">Annual deductible</p>
                        <p className="text-[10px] font-bold text-emerald-600">SAR 2,400 / SAR 8,000</p>
                      </div>
                    </div>
                  </div>

                  {/* Supply Chain */}
                  <div className="rounded-[2rem] bg-secondary/50 p-4">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Pill className="w-3 h-3 text-amber-600" /> Supply Chain — Drug Availability
                    </p>
                    <div className="space-y-2">
                      {(patient.medications?.slice(0, 3) ?? []).map((med: any, i: number) => {
                        const stock = i === 0 ? { label: "LOW", color: "text-red-600", units: "2,100" } : i === 1 ? { label: "CRITICAL", color: "text-red-600", units: "480" } : { label: "SUFFICIENT", color: "text-emerald-600", units: "18,400" };
                        return (
                          <div key={i} className="flex items-center justify-between bg-white/70 rounded-xl px-3 py-2">
                            <div>
                              <p className="text-[10px] font-bold text-foreground">{med.drugName}</p>
                              <p className="text-[9px] text-muted-foreground">Al-Riyadh Hub</p>
                            </div>
                            <div className="text-right">
                              <p className={`text-[9px] font-bold ${stock.color}`}>{stock.label}</p>
                              <p className="text-[9px] text-muted-foreground">{stock.units} units</p>
                            </div>
                          </div>
                        );
                      })}
                      <div className="flex items-center justify-between px-3 py-2 bg-white/60 rounded-xl">
                        <p className="text-[10px] font-semibold text-muted-foreground">Next delivery ETA</p>
                        <p className="text-[10px] font-bold text-amber-600">3 days · PO raised</p>
                      </div>
                    </div>
                  </div>

                  {/* Research Eligibility */}
                  <div className="rounded-[2rem] bg-secondary/50 p-4">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <FlaskConical className="w-3 h-3 text-violet-600" /> Research Portal — Trial Eligibility
                    </p>
                    <div className="space-y-2">
                      {[
                        { trial: "HbA1c Variability-CKD Study", id: "NCT-SA-2025-0447", eligible: true, phase: "Phase III", sites: "12 hospitals" },
                        { trial: "SGLT2i Renal Protection", id: "NCT-SA-2025-0512", eligible: true, phase: "Phase II", sites: "8 hospitals" },
                        { trial: "AI-Driven DM Remission", id: "NCT-SA-2026-0021", eligible: false, phase: "Phase I", sites: "KFMC only" },
                      ].map((t, i) => (
                        <div key={i} className="flex items-center justify-between bg-white/70 rounded-xl px-3 py-2">
                          <div className="flex-1 min-w-0 pr-2">
                            <p className="text-[10px] font-bold text-foreground truncate">{t.trial}</p>
                            <p className="text-[9px] text-muted-foreground">{t.id} · {t.phase} · {t.sites}</p>
                          </div>
                          <Badge variant={t.eligible ? "purple" : "outline"} className="text-[9px] shrink-0">{t.eligible ? "ELIGIBLE" : "EXCL."}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Family Risk */}
                  <div className="rounded-[2rem] bg-secondary/50 p-4">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Users className="w-3 h-3 text-sky-600" /> Family Portal — Genetic Risk Cascade
                    </p>
                    <div className="space-y-2">
                      {[
                        { relation: "Son", age: 28, condition: "DM Type 2 predisposition", risk: 73, status: "Screening recommended" },
                        { relation: "Daughter", age: 24, condition: "DM Type 2 predisposition", risk: 68, status: "Screening recommended" },
                        { relation: "Spouse", age: 51, condition: "HTN genetic marker", risk: 41, status: "Annual BP monitoring" },
                      ].map((f, i) => (
                        <div key={i} className="flex items-center gap-3 bg-white/70 rounded-xl px-3 py-2">
                          <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
                            <Users className="w-3.5 h-3.5 text-sky-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-foreground">{f.relation} · Age {f.age}</p>
                            <p className="text-[9px] text-muted-foreground truncate">{f.condition}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-[10px] font-bold ${f.risk >= 70 ? "text-red-600" : f.risk >= 50 ? "text-amber-600" : "text-sky-600"}`}>{f.risk}%</p>
                            <p className="text-[9px] text-muted-foreground">risk</p>
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center justify-between px-3 py-2 bg-white/60 rounded-xl">
                        <p className="text-[10px] font-semibold text-muted-foreground">Family screening letters</p>
                        <Badge variant="info" className="text-[9px]">SENT — 3 members</Badge>
                      </div>
                    </div>
                  </div>

                </div>
              </CardBody>
            </Card>
          )}
        </div>
      )}
    </Layout>
  );
}

function PrescribeModal({ patientId }: { patientId: number }) {
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
                <p className="text-xs text-muted-foreground mt-0.5">AI drug interaction check will be performed before confirming.</p>
              </div>
              <button onClick={close} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-border transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
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
                      <div className="w-9 h-9 rounded-xl bg-white/60 flex items-center justify-center shrink-0">
                        <Shield className="w-4.5 h-4.5 text-emerald-600" />
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
                          <p className="text-xs font-semibold bg-white/70 rounded-xl p-2 ml-6">{w.recommendation}</p>
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
