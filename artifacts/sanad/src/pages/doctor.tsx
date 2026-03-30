import React, { useState, useRef, useEffect } from "react";
import {
  Search, Shield, Activity, AlertCircle, Syringe, Clock,
  User as UserIcon, Pill, FlaskConical, Building2, X, Stethoscope, CalendarDays,
  TrendingUp, TrendingDown, Minus, Brain, Bell, BellOff, CheckCheck,
  TriangleAlert, Zap, ArrowUpRight, ArrowDownRight, ChevronRight, Lightbulb,
  Wifi, WifiOff
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
  critical: { bg: "bg-red-50", border: "border-red-200", icon: "text-red-600", badge: "destructive" },
  high: { bg: "bg-amber-50", border: "border-amber-200", icon: "text-amber-600", badge: "warning" },
  moderate: { bg: "bg-sky-50", border: "border-sky-200", icon: "text-sky-600", badge: "info" },
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
  const [activeTab, setActiveTab] = useState("overview");
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
    visit: { icon: Building2, bg: "bg-sky-100", color: "text-sky-600" },
    lab: { icon: FlaskConical, bg: "bg-violet-100", color: "text-violet-600" },
    medication: { icon: Pill, bg: "bg-emerald-100", color: "text-emerald-600" },
    alert: { icon: AlertCircle, bg: "bg-red-100", color: "text-red-600" },
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

      {/* SSE Real-time Lab Alerts Panel */}
      {showSsePanel && sseAlerts.length > 0 && (
        <div className="mx-0 mb-4 rounded-2xl border border-red-200 bg-red-50 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-red-200 bg-red-100/60">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="font-bold text-sm text-red-800">Live Lab Alerts</span>
              <Badge variant="destructive" className="text-[10px]">{sseUnread} new</Badge>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={clearSseAlerts} className="text-[11px] text-red-600 hover:text-red-800 font-medium">Clear all</button>
              <button onClick={() => setShowSsePanel(false)} className="text-red-400 hover:text-red-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="divide-y divide-red-200 max-h-64 overflow-y-auto">
            {sseAlerts.map(alert => (
              <div key={alert.id} className={`px-4 py-3 flex items-start gap-3 ${alert.read ? "opacity-60" : ""}`}>
                <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${alert.severity === "critical" ? "bg-red-500" : "bg-amber-500"}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-red-900">{alert.title}</p>
                  <p className="text-xs text-red-700 mt-0.5">{alert.patientName} · {alert.result}</p>
                  <p className="text-xs text-red-600 mt-0.5">{alert.action}</p>
                  <p className="text-[10px] text-red-400 mt-1">{new Date(alert.timestamp).toLocaleTimeString()}</p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <button
                    onClick={() => { handleSelectPatient(alert.nationalId, alert.patientName); markSseRead(alert.id); }}
                    className="text-[10px] font-semibold text-red-700 bg-red-100 hover:bg-red-200 rounded-lg px-2 py-1 transition-colors"
                  >
                    View Patient
                  </button>
                  {!alert.read && (
                    <button onClick={() => markSseRead(alert.id)} className="text-[10px] text-red-400 hover:text-red-700">Dismiss</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-start justify-between mb-6">
        <PageHeader
          title="Physician Dashboard"
          subtitle="Patient clinical records, prescribing, AI-assisted risk analysis, and predictive alerts."
        />
        <div className="flex items-center gap-2 shrink-0 ml-6">
          {/* SSE Real-time Alert Bell */}
          <div className="relative">
            <button
              onClick={() => setShowSsePanel(p => !p)}
              className={`relative flex items-center justify-center w-10 h-10 rounded-full border transition-colors ${
                sseUnread > 0 ? "bg-red-50 border-red-200 hover:bg-red-100" : "bg-white border-border hover:bg-secondary"
              }`}
              title={sseConnected ? "Live alerts connected" : "Connecting to live alerts..."}
            >
              {sseUnread > 0 ? (
                <Bell className="w-4.5 h-4.5 text-red-600" />
              ) : (
                <Bell className="w-4.5 h-4.5 text-muted-foreground" />
              )}
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
              <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-2xl shadow-xl border border-black/[0.07] z-50 overflow-hidden">
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
                    {p.riskLevel === "critical" && <span className="text-[9px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full shrink-0">Critical</span>}
                    {p.riskLevel === "high" && <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full shrink-0">High Risk</span>}
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
          <CardBody className="py-20 text-center">
            <div className="w-16 h-16 rounded-3xl bg-secondary flex items-center justify-center mx-auto mb-4">
              <Stethoscope className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="font-bold text-foreground mb-1">No Patient Selected</p>
            <p className="text-sm text-muted-foreground mb-2">Enter a National ID above to load a patient record.</p>
            <p className="text-xs text-muted-foreground font-mono bg-secondary inline-block px-3 py-1.5 rounded-xl">
              Demo: 1000000001 · 1000000003 · 1000000005 · 1000000023
            </p>
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
          {/* Patient Banner */}
          <Card>
            <CardBody className="p-0">
              <div className="flex items-stretch divide-x divide-border">
                <div className="flex-1 p-5 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                    <UserIcon className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground mb-1">{patient.fullName}</h2>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs bg-secondary px-2.5 py-1 rounded-xl">{patient.nationalId}</span>
                      <span className="text-xs text-muted-foreground">
                        DOB: {format(safeDate(patient.dateOfBirth), "dd MMM yyyy")}
                      </span>
                      <span className="text-xs text-muted-foreground">· {patient.gender}</span>
                      {patient.allergies?.length > 0 && (
                        <Badge variant="destructive">{patient.allergies.length} Allergi{patient.allergies.length > 1 ? "es" : "y"}</Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 flex flex-col items-center justify-center bg-red-50 min-w-[90px]">
                  <DataLabel label="Blood Type">
                    <p className="text-3xl font-bold text-red-600">{patient.bloodType}</p>
                  </DataLabel>
                </div>

                {riskScore && (
                  <div className={`px-6 py-4 flex flex-col items-center justify-center min-w-[120px] ${
                    riskScore.riskLevel === "critical" ? "bg-red-50" :
                    riskScore.riskLevel === "high" ? "bg-amber-50" : "bg-secondary/40"
                  }`}>
                    <DataLabel label="AI Risk Score">
                      <p className={`text-3xl font-bold tabular-nums ${
                        riskScore.riskLevel === "critical" ? "text-red-600" :
                        riskScore.riskLevel === "high" ? "text-amber-600" : "text-primary"
                      }`}>{riskScore.riskScore}<span className="text-base font-normal text-muted-foreground">/100</span></p>
                    </DataLabel>
                    <Badge variant={
                      riskScore.riskLevel === "critical" ? "destructive" :
                      riskScore.riskLevel === "high" ? "warning" : "success"
                    } className="mt-2 text-[10px]">
                      {riskScore.riskLevel?.toUpperCase()}
                    </Badge>
                  </div>
                )}

                <div className="px-5 py-4 flex flex-col justify-center gap-2 min-w-[160px]">
                  <PrescribeModal patientId={patient.id} />
                  <Button variant="outline" size="sm">
                    <CalendarDays className="w-3.5 h-3.5" /> Schedule Visit
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>

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
              iconBg={criticalLabs > 0 ? "bg-red-100" : "bg-sky-100"}
              iconColor={criticalLabs > 0 ? "text-red-600" : "text-sky-600"}
            />
            <KpiCard
              title="Visit History"
              value={patient.visits?.length ?? 0}
              sub="Total hospital visits"
              icon={Building2}
              iconBg="bg-emerald-100"
              iconColor="text-emerald-600"
            />
            <KpiCard
              title="AI Predictions"
              value={predictions.length}
              sub={`${criticalPredictions} high priority`}
              icon={Brain}
              iconBg={criticalPredictions > 0 ? "bg-amber-100" : "bg-violet-100"}
              iconColor={criticalPredictions > 0 ? "text-amber-600" : "text-violet-600"}
            />
            <KpiCard
              title="Active Alerts"
              value={unreadAlerts}
              sub={`${alerts.length} total alerts`}
              icon={Bell}
              iconBg={unreadAlerts > 0 ? "bg-red-100" : "bg-secondary"}
              iconColor={unreadAlerts > 0 ? "text-red-600" : "text-muted-foreground"}
            />
          </div>

          {/* Tabbed Content */}
          <Card>
            <Tabs
              tabs={[
                { id: "overview", label: "Clinical Overview" },
                { id: "decision", label: "🧠 Decision Engine" },
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
              <div className="divide-y divide-border">
                {/* Clinical Decision Panel */}
                {riskScore && (
                  <div className={`p-5 ${
                    riskScore.riskLevel === "critical" ? "bg-red-50" :
                    riskScore.riskLevel === "high" ? "bg-amber-50" : "bg-secondary/30"
                  }`}>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Brain className="w-3.5 h-3.5 text-violet-600" /> Clinical Intelligence — Decision Summary
                    </p>
                    <div className="flex items-stretch gap-4">
                      {/* Score Block */}
                      <div className={`rounded-2xl px-6 py-4 flex flex-col items-center justify-center min-w-[130px] shrink-0 ${
                        riskScore.riskLevel === "critical" ? "bg-red-600 text-white" :
                        riskScore.riskLevel === "high" ? "bg-amber-500 text-white" :
                        riskScore.riskLevel === "medium" ? "bg-sky-500 text-white" : "bg-emerald-500 text-white"
                      }`}>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-1">Risk Score</p>
                        <p className="text-5xl font-bold tabular-nums leading-none">{riskScore.riskScore}</p>
                        <p className="text-white/60 text-xs mt-1">/ 100</p>
                        <div className="mt-3 border border-white/25 rounded-xl px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide">
                          {riskScore.riskLevel}
                        </div>
                      </div>

                      {/* WHY Block */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5">
                          <TriangleAlert className="w-3 h-3 text-amber-500" /> WHY — Top Risk Factors
                        </p>
                        <div className="space-y-1.5">
                          {riskScore.factors.slice(0, 4).map((f: any, i: number) => (
                            <div key={i} className="flex items-center gap-2.5 px-3 py-2 bg-white/70 border border-white rounded-xl">
                              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                f.impact === "high" ? "bg-red-500" :
                                f.impact === "moderate" ? "bg-amber-500" : "bg-primary"
                              }`} />
                              <span className="text-xs font-semibold text-foreground flex-1 truncate">{f.factor}</span>
                              <Badge variant={f.impact === "high" ? "destructive" : f.impact === "moderate" ? "warning" : "info"} className="text-[9px] shrink-0">{f.impact}</Badge>
                            </div>
                          ))}
                          {riskScore.factors.length === 0 && (
                            <p className="text-xs text-muted-foreground px-2">No significant risk factors detected.</p>
                          )}
                        </div>
                      </div>

                      {/* ACTION Block */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5">
                          <ChevronRight className="w-3 h-3 text-primary" /> RECOMMENDED ACTIONS
                        </p>
                        <div className="space-y-1.5">
                          {riskScore.recommendations.slice(0, 3).map((rec: string, i: number) => (
                            <div key={i} className="flex items-start gap-2 px-3 py-2 bg-white/70 border border-white rounded-xl">
                              <Lightbulb className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                              <p className="text-xs text-foreground leading-snug">{rec}</p>
                            </div>
                          ))}
                        </div>
                        {topPredictions.length > 0 && (
                          <div className="mt-2 px-3 py-2 bg-amber-100/60 border border-amber-200 rounded-xl">
                            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-1">AI Alert</p>
                            <p className="text-xs text-amber-800 font-medium">{topPredictions[0]?.title}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Conditions + Allergies */}
                <div className="grid grid-cols-2 divide-x divide-border">
                  <div className="p-5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Activity className="w-3.5 h-3.5" /> Chronic Conditions
                    </p>
                    {patient.chronicConditions?.length > 0 ? (
                      <div className="space-y-2">
                        {patient.chronicConditions.map((c, i) => (
                          <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5 bg-secondary rounded-2xl">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                            <span className="text-sm font-semibold">{c}</span>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-sm text-muted-foreground">None on record.</p>}
                  </div>
                  <div className="p-5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500" /> Documented Allergies
                    </p>
                    {patient.allergies?.length > 0 ? (
                      <div className="space-y-2">
                        {patient.allergies.map((a, i) => (
                          <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5 bg-red-50 border border-red-100 rounded-2xl">
                            <StatusDot status="critical" />
                            <span className="text-sm font-bold text-red-700">{a}</span>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-sm text-muted-foreground">No known allergies.</p>}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "timeline" && (
              <div className="p-5">
                <div className="flex items-center gap-3 mb-5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Unified Clinical Timeline</p>
                  <div className="flex items-center gap-2 ml-auto">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><div className="w-2 h-2 rounded-full bg-sky-500" /> Visit</div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><div className="w-2 h-2 rounded-full bg-violet-500" /> Lab</div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Medication</div>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
                  <div className="space-y-4">
                    {timeline.slice(0, 30).map((event, idx) => {
                      const cfg = timelineIconMap[event.type];
                      const Icon = cfg.icon;
                      return (
                        <div key={`${event.type}-${event.id}-${idx}`} className="flex gap-4 relative pl-14">
                          <div className={`absolute left-2 top-1.5 w-6 h-6 rounded-full ${cfg.bg} flex items-center justify-center border-2 border-background z-10`}>
                            <Icon className={`w-3 h-3 ${cfg.color}`} />
                          </div>
                          <div className="flex-1 min-w-0 pb-4 border-b border-border last:border-0">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-foreground truncate">{event.title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">{event.subtitle}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {event.badge && (
                                  <Badge variant={event.badgeVariant ?? "outline"} className="text-[10px]">{event.badge}</Badge>
                                )}
                                <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">
                                  {format(event.date, "dd MMM yyyy")}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {timeline.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">No timeline data available.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "medications" && (
              <div>
                <div className="flex items-center justify-between px-5 py-3 border-b border-black/[0.05]" style={{ background: "hsl(240 6% 97%)" }}>
                  <p className="text-xs font-semibold text-muted-foreground">{activeMeds.length} active prescription{activeMeds.length !== 1 ? "s" : ""}</p>
                  <PrescribeModal patientId={patient.id} />
                </div>
                <table className="w-full data-table">
                  <thead><tr>
                    <th>Drug Name</th><th>Dosage</th><th>Frequency</th>
                    <th>Prescribed By</th><th>Hospital</th><th>Start Date</th><th>Status</th>
                  </tr></thead>
                  <tbody>
                    {patient.medications?.map(med => (
                      <tr key={med.id}>
                        <td className="font-bold text-foreground">{med.drugName}</td>
                        <td className="font-mono text-sm">{med.dosage}</td>
                        <td className="text-muted-foreground">{med.frequency}</td>
                        <td>{med.prescribedBy}</td>
                        <td className="text-muted-foreground text-xs">{med.hospital}</td>
                        <td className="text-muted-foreground font-mono text-xs">
                          {med.startDate ? format(safeDate(med.startDate), "dd MMM yyyy") : "—"}
                        </td>
                        <td><Badge variant={med.isActive ? "success" : "outline"}>{med.isActive ? "Active" : "Completed"}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "labs" && (
              <div>
                <div className="flex items-center gap-3 px-5 py-3 border-b border-black/[0.05]" style={{ background: "hsl(240 6% 97%)" }}>
                  {criticalLabs > 0 && <Badge variant="destructive">{criticalLabs} Critical</Badge>}
                  {abnormalLabs > 0 && <Badge variant="warning">{abnormalLabs} Abnormal</Badge>}
                  <span className="text-xs text-muted-foreground ml-auto">{labResults.length} results · sparkline shows value trend over time</span>
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
                    <div className={`mx-5 my-4 rounded-2xl border p-4 ${isWorsening ? "border-red-200 bg-red-50" : isImproving ? "border-emerald-200 bg-emerald-50" : "border-violet-200 bg-violet-50/40"}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <FlaskConical className={`w-4 h-4 ${isWorsening ? "text-red-500" : isImproving ? "text-emerald-500" : "text-violet-500"}`} />
                            <span className="font-bold text-sm">HbA1c Glycemic Trajectory</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isWorsening ? "bg-red-100 text-red-700" : isImproving ? "bg-emerald-100 text-emerald-700" : "bg-violet-100 text-violet-700"}`}>
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
                      <div key={latest.id} className={`px-5 py-3.5 flex items-center gap-4 hover:bg-secondary/20 transition-colors ${
                        latest.status === "critical" ? "border-l-2 border-red-500 bg-red-50/30" :
                        latest.status === "abnormal" ? "border-l-2 border-amber-400 bg-amber-50/20" : ""
                      }`}>
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
              <div>
                <div className="px-5 py-3 border-b border-black/[0.05]" style={{ background: "hsl(240 6% 97%)" }}>
                  <p className="text-xs font-semibold text-muted-foreground">{patient.visits?.length ?? 0} recorded visits</p>
                </div>
                <table className="w-full data-table">
                  <thead><tr>
                    <th>Hospital</th><th>Department</th><th>Physician</th><th>Visit Type</th><th>Diagnosis</th><th>Date</th>
                  </tr></thead>
                  <tbody>
                    {patient.visits?.map(visit => (
                      <tr key={visit.id}>
                        <td className="font-bold text-foreground">{visit.hospital}</td>
                        <td>{visit.department}</td>
                        <td className="text-muted-foreground">{visit.doctor ? `Dr. ${visit.doctor}` : "—"}</td>
                        <td><Badge variant={visit.visitType === "emergency" ? "destructive" : visit.visitType === "inpatient" ? "warning" : "outline"}>{visit.visitType}</Badge></td>
                        <td className="text-muted-foreground max-w-xs truncate">{visit.diagnosis}</td>
                        <td className="text-muted-foreground font-mono text-xs">{format(safeDate(visit.visitDate), "dd MMM yyyy")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "predictions" && (
              <div className="p-5">
                <div className="flex items-center gap-3 mb-5">
                  <Brain className="w-4 h-4 text-violet-600" />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">AI Clinical Predictions</p>
                  <Badge variant="outline" className="ml-auto">{predictions.length} total</Badge>
                </div>
                {predictions.length === 0 ? (
                  <div className="py-12 text-center">
                    <Brain className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="font-bold text-foreground mb-1">No Predictions Generated</p>
                    <p className="text-sm text-muted-foreground">Insufficient clinical data for predictive analysis.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {predictions.map((p, i) => {
                      const style = predictionSeverityStyle[p.severity] ?? predictionSeverityStyle.low;
                      return (
                        <div key={i} className={`p-4 ${style.bg} border ${style.border} rounded-2xl`}>
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-xl bg-white flex items-center justify-center shrink-0`}>
                              {p.severity === "critical" || p.severity === "high" ? (
                                <TriangleAlert className={`w-4 h-4 ${style.icon}`} />
                              ) : (
                                <Zap className={`w-4 h-4 ${style.icon}`} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant={style.badge as any} className="text-[10px]">{p.severity}</Badge>
                                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">{p.type.replace("_", " ")}</span>
                                <span className="ml-auto text-[10px] text-muted-foreground">Confidence: {p.confidence}</span>
                              </div>
                              <p className="font-bold text-sm text-foreground">{p.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                              <div className="mt-2 p-2.5 bg-white/60 border border-white rounded-xl">
                                <p className="text-xs font-semibold text-foreground">Recommendation: {p.recommendation}</p>
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
              <div>
                <div className="flex items-center justify-between px-5 py-3 border-b border-black/[0.05]" style={{ background: "hsl(240 6% 97%)" }}>
                  <div className="flex items-center gap-2">
                    {unreadAlerts > 0 && <Badge variant="destructive">{unreadAlerts} unread</Badge>}
                    <span className="text-xs text-muted-foreground">{alerts.length} total alerts</span>
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
                  <div className="py-12 text-center">
                    <BellOff className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="font-bold text-foreground mb-1">No Alerts</p>
                    <p className="text-sm text-muted-foreground">No clinical alerts for this patient.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {alerts.map(alert => (
                      <div key={alert.id} className={`flex items-start gap-4 px-5 py-4 transition-colors ${alert.isRead ? "opacity-60" : "bg-amber-50/30"}`}>
                        <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                          alert.severity === "critical" ? "bg-red-600" :
                          alert.severity === "high" ? "bg-amber-500" :
                          alert.severity === "moderate" ? "bg-sky-500" : "bg-secondary"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <Badge variant={
                              alert.severity === "critical" ? "destructive" :
                              alert.severity === "high" ? "warning" :
                              alert.severity === "moderate" ? "info" : "outline"
                            } className="text-[10px]">{alert.severity}</Badge>
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{alert.alertType}</span>
                          </div>
                          <p className="font-bold text-sm text-foreground">{alert.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                          <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                            {format(safeDate(alert.createdAt), "dd MMM yyyy HH:mm")}
                          </p>
                        </div>
                        {!alert.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkRead(alert.id)}
                            className="shrink-0 text-xs"
                          >
                            <CheckCheck className="w-3.5 h-3.5" /> Read
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "decision" && (
              <div className="p-5">
                {decisionLoading && (
                  <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-violet-600" />
                    <span className="text-sm font-medium">AI Decision Engine processing...</span>
                  </div>
                )}
                {!decisionLoading && !aiDecision && (
                  <div className="py-12 text-center">
                    <Brain className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="font-bold text-foreground">No decision data</p>
                  </div>
                )}
                {!decisionLoading && aiDecision && (
                  <div className="space-y-5">
                    {/* Urgency Header Strip */}
                    <div className={`rounded-2xl p-5 ${
                      aiDecision.urgency === "immediate" ? "bg-red-600 text-white" :
                      aiDecision.urgency === "urgent" ? "bg-amber-500 text-white" :
                      aiDecision.urgency === "soon" ? "bg-sky-500 text-white" :
                      "bg-emerald-500 text-white"
                    }`}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">Urgency Level</span>
                            <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                              {aiDecision.urgency}
                            </span>
                          </div>
                          <p className="text-lg font-bold leading-snug">{aiDecision.primaryAction}</p>
                          <div className="flex items-center gap-3 mt-3">
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-white/80">
                              <Clock className="w-3.5 h-3.5" /> {aiDecision.timeWindow}
                            </span>
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-white/80">
                              <Zap className="w-3.5 h-3.5" /> Confidence: {Math.round(aiDecision.confidence * 100)}%
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-5xl font-bold tabular-nums leading-none">{aiDecision.riskScore}</p>
                          <p className="text-white/60 text-xs mt-1">/ 100</p>
                          <p className="text-xs font-bold uppercase tracking-wide mt-2 text-white/80">{aiDecision.riskLevel} risk</p>
                        </div>
                      </div>
                      {aiDecision.explainability.uncertaintyNote && (
                        <div className="mt-3 px-3 py-2 bg-white/20 rounded-xl text-xs font-semibold text-white">
                          ⚠ {aiDecision.explainability.uncertaintyNote}
                        </div>
                      )}
                    </div>

                    {/* WHY Factors */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                          <TriangleAlert className="w-3.5 h-3.5 text-amber-500" /> WHY — Clinical Factors
                        </p>
                        <div className="space-y-2">
                          {aiDecision.whyFactors.map((f, i) => (
                            <div key={i} className={`flex items-start gap-3 px-3.5 py-3 rounded-2xl border ${
                              f.impact === "critical" ? "bg-red-50 border-red-200" :
                              f.impact === "high" ? "bg-amber-50 border-amber-200" :
                              f.impact === "moderate" ? "bg-sky-50 border-sky-200" :
                              "bg-secondary border-border"
                            }`}>
                              <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                                f.impact === "critical" ? "bg-red-600" :
                                f.impact === "high" ? "bg-amber-500" :
                                f.impact === "moderate" ? "bg-sky-500" : "bg-muted-foreground"
                              }`} />
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
                        {/* Recommendations */}
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                            <ChevronRight className="w-3.5 h-3.5 text-primary" /> Recommended Actions
                          </p>
                          <div className="space-y-2">
                            {aiDecision.recommendations.map((rec, i) => (
                              <div key={i} className="flex items-start gap-2.5 px-3.5 py-2.5 bg-primary/5 border border-primary/15 rounded-xl">
                                <Lightbulb className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                                <p className="text-xs text-foreground leading-snug">{rec}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Explainability */}
                        <div className="p-4 bg-secondary rounded-2xl">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Clinical Basis</p>
                          <div className="space-y-1">
                            {aiDecision.explainability.clinicalBasis.map((b, i) => (
                              <p key={i} className="text-xs text-foreground flex items-start gap-1.5">
                                <span className="text-primary shrink-0">·</span> {b}
                              </p>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 mt-3">
                            <span className="text-[10px] text-muted-foreground font-mono">SOURCE: {aiDecision.source}</span>
                            <span className="ml-auto text-[10px] font-bold text-foreground">CONFIDENCE: {Math.round(aiDecision.confidence * 100)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Digital Twin */}
                    {aiDecision.digitalTwin && (
                      <div className={`p-5 rounded-2xl border-2 ${
                        aiDecision.digitalTwin.riskTrajectory === "rapidly_worsening" ? "bg-red-50 border-red-300" :
                        aiDecision.digitalTwin.riskTrajectory === "worsening" ? "bg-amber-50 border-amber-200" :
                        aiDecision.digitalTwin.riskTrajectory === "improving" ? "bg-emerald-50 border-emerald-200" :
                        "bg-secondary border-border"
                      }`}>
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
                        <div className="px-3 py-2 bg-white/60 rounded-xl">
                          <p className="text-xs font-semibold text-foreground">{aiDecision.digitalTwin.interventionWindow}</p>
                        </div>
                      </div>
                    )}

                    {/* Behavioral Flags */}
                    {aiDecision.behavioralFlags && aiDecision.behavioralFlags.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                          <Activity className="w-3.5 h-3.5 text-sky-600" /> Behavioral AI Flags
                        </p>
                        <div className="space-y-2">
                          {aiDecision.behavioralFlags.map((flag, i) => (
                            <div key={i} className={`flex items-start gap-3 p-4 rounded-2xl border ${
                              flag.severity === "high" ? "bg-amber-50 border-amber-200" :
                              flag.severity === "moderate" ? "bg-sky-50 border-sky-200" :
                              "bg-secondary border-border"
                            }`}>
                              <Bell className={`w-4 h-4 shrink-0 mt-0.5 ${
                                flag.severity === "high" ? "text-amber-600" :
                                flag.severity === "moderate" ? "text-sky-600" : "text-muted-foreground"
                              }`} />
                              <div>
                                <p className="text-sm font-bold text-foreground">{flag.description}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">→ {flag.recommendation}</p>
                              </div>
                              <Badge variant={flag.severity === "high" ? "warning" : flag.severity === "moderate" ? "info" : "outline"} className="ml-auto shrink-0 text-[9px]">{flag.severity}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === "audit" && (
              <div className="p-5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-primary" /> Immutable Audit Trail — WHO · WHAT · WHEN · WHY
                </p>
                {(!auditData || (auditData as any)?.auditLog?.length === 0) ? (
                  <div className="py-12 text-center">
                    <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="font-bold text-foreground">No audit records yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Run the Decision Engine to generate audit entries.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {((auditData as any)?.auditLog ?? []).map((log: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 px-4 py-3 bg-secondary rounded-2xl border border-border">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-bold text-foreground">{log.what}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                WHO: <span className="font-semibold">{log.who}</span> · ROLE: {log.whoRole}
                                {log.confidence && ` · CONFIDENCE: ${Math.round(log.confidence * 100)}%`}
                              </p>
                            </div>
                            <p className="text-[10px] text-muted-foreground font-mono shrink-0">
                              {log.createdAt ? format(new Date(log.createdAt), "dd MMM yyyy HH:mm") : "—"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "ai" && riskScore && (
              <div className="p-5">
                <div className="flex items-start gap-6">
                  <div className={`rounded-2xl p-6 min-w-[200px] text-center ${
                    riskScore.riskLevel === "critical" ? "bg-red-600 text-white" :
                    riskScore.riskLevel === "high" ? "bg-amber-500 text-white" :
                    "bg-primary text-white"
                  }`}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-3">AI Risk Score</p>
                    <p className="text-6xl font-bold tabular-nums leading-none">{riskScore.riskScore}</p>
                    <p className="text-white/60 text-sm mt-1">/ 100 risk score</p>
                    <div className="mt-4 border border-white/20 rounded-xl px-3 py-1.5 text-xs font-bold uppercase tracking-wide">
                      {riskScore.riskLevel} risk level
                    </div>
                  </div>

                  <div className="flex-1 space-y-4">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                        {riskScore.factors.length} Risk Factors Identified
                      </p>
                      <div className="space-y-2.5">
                        {riskScore.factors.map((f: any, i: number) => (
                          <div key={i} className="flex items-start gap-3 p-3.5 bg-secondary rounded-2xl">
                            <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                              f.impact === "high" ? "bg-red-500" :
                              f.impact === "moderate" ? "bg-amber-500" : "bg-primary"
                            }`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-bold text-foreground">{f.factor}</span>
                                <Badge variant={
                                  f.impact === "high" ? "destructive" :
                                  f.impact === "moderate" ? "warning" : "info"
                                } className="text-[10px] shrink-0">{f.impact} impact</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {riskScore.recommendations && riskScore.recommendations.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Clinical Recommendations</p>
                        <div className="space-y-2">
                          {riskScore.recommendations.map((rec: string, i: number) => (
                            <div key={i} className="flex items-start gap-2.5 p-3 bg-primary/5 border border-primary/10 rounded-xl">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                              <p className="text-xs text-foreground">{rec}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>
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
          <div className="bg-card rounded-3xl border border-border shadow-2xl w-full max-w-lg overflow-hidden">
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
                    <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                        <Shield className="w-4.5 h-4.5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-bold text-emerald-700 text-sm">No Interactions Detected</p>
                        <p className="text-xs text-muted-foreground">Safe to prescribe based on current medication profile.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {checkMutation.data.warnings.map((w: any, i: number) => (
                        <div key={i} className="p-4 bg-red-50 border border-red-200 rounded-2xl">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="w-4 h-4 text-red-600" />
                            <span className="text-sm font-bold text-red-700">Interaction: {w.conflictingDrug}</span>
                            <Badge variant={w.severity === "critical" ? "destructive" : "warning"} className="ml-auto text-[10px]">{w.severity}</Badge>
                          </div>
                          <p className="text-xs text-foreground/80 mb-2 ml-6">{w.description}</p>
                          <p className="text-xs font-semibold bg-white border border-red-100 rounded-xl p-2 ml-6">{w.recommendation}</p>
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
