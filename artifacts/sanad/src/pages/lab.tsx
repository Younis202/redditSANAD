import React, { useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import {
  Card, CardHeader, CardTitle, CardBody,
  Input, Button, Badge, PageHeader, StatusDot, DataLabel
} from "@/components/shared";
import {
  FlaskConical, Search, AlertTriangle, CheckCircle2, Zap,
  Brain, TrendingUp, TrendingDown, Minus, ArrowRight, Plus, X, Activity, Bell
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSseAlerts } from "@/hooks/use-sse-alerts";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend
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

export default function LabPortal() {
  const [searchId, setSearchId] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [showSsePanel, setShowSsePanel] = useState(true);
  const { alerts: sseAlerts, connected: sseConnected, unreadCount: sseUnread, markRead: markSseRead, clearAll: clearSseAlerts } = useSseAlerts("lab");

  const [form, setForm] = useState({
    testName: "", result: "", unit: "", referenceRange: "", status: "normal", hospital: "SANAD Lab Network", notes: ""
  });

  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["lab-patient", nationalId],
    queryFn: () => fetchLabPatient(nationalId),
    enabled: !!nationalId,
    retry: false,
  });

  const submitMutation = useMutation({
    mutationFn: (formData: Record<string, string>) => submitLabResult({ ...formData, patientId: data?.patient?.id }),
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

  const trendChartData = useMemo(() => {
    if (!data?.labs?.length) return {};
    const grouped: Record<string, { date: string; value: number; status: string }[]> = {};
    for (const lab of data.labs) {
      const val = parseFloat(lab.result);
      if (isNaN(val)) continue;
      if (!grouped[lab.testName]) grouped[lab.testName] = [];
      grouped[lab.testName]!.push({
        date: lab.testDate?.split("T")[0] ?? lab.testDate,
        value: val,
        status: lab.status,
      });
    }
    for (const key of Object.keys(grouped)) {
      grouped[key] = grouped[key]!.sort((a, b) => a.date.localeCompare(b.date));
    }
    return grouped;
  }, [data]);

  const CHART_TESTS = [
    "HbA1c", "Fasting Glucose", "Fasting Blood Glucose", "Total Cholesterol",
    "LDL Cholesterol", "Creatinine", "Hemoglobin", "eGFR", "Potassium", "Sodium"
  ];
  const CHART_COLORS: Record<string, string> = {
    "HbA1c": "#e11d48",
    "Fasting Glucose": "#f59e0b", "Fasting Blood Glucose": "#f59e0b",
    "Total Cholesterol": "#8b5cf6",
    "LDL Cholesterol": "#3b82f6",
    "Creatinine": "#10b981",
    "Hemoglobin": "#f97316",
    "eGFR": "#06b6d4",
    "Potassium": "#84cc16",
    "Sodium": "#a855f7",
  };
  const NORMAL_RANGES: Record<string, { min: number; max: number; unit: string }> = {
    "HbA1c": { min: 4.0, max: 5.7, unit: "%" },
    "Fasting Glucose": { min: 70, max: 100, unit: "mg/dL" },
    "Fasting Blood Glucose": { min: 70, max: 100, unit: "mg/dL" },
    "Total Cholesterol": { min: 0, max: 200, unit: "mg/dL" },
    "LDL Cholesterol": { min: 0, max: 100, unit: "mg/dL" },
    "Creatinine": { min: 0.6, max: 1.2, unit: "mg/dL" },
    "Hemoglobin": { min: 12, max: 17, unit: "g/dL" },
    "eGFR": { min: 60, max: 120, unit: "mL/min" },
    "Potassium": { min: 3.5, max: 5.0, unit: "mEq/L" },
    "Sodium": { min: 135, max: 145, unit: "mEq/L" },
  };

  const chartsToShow = CHART_TESTS.filter(t => (trendChartData[t]?.length ?? 0) >= 1);

  const statusColor = (status: string) => ({
    normal: "success", abnormal: "warning", critical: "destructive"
  } as Record<string, any>)[status] ?? "outline";

  const trendIcon = (trend: string) => {
    if (trend.includes("WORSENING") || trend.includes("HIGH") || trend.includes("ELEVATED") || trend.includes("DIABETIC") || trend.includes("CRITICAL") || trend.includes("ANEMIA") || trend.includes("STRESS") || trend.includes("ABNORMAL")) {
      return <TrendingUp className="w-3.5 h-3.5 text-red-500" />;
    }
    if (trend === "NORMAL" || trend === "OPTIMAL") return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
    return <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />;
  };

  return (
    <Layout role="lab">
      {/* SSE Live Alert Panel */}
      {showSsePanel && sseAlerts.length > 0 && (
        <div className="mb-4 rounded-2xl border border-teal-200 bg-teal-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-teal-200 bg-teal-100/60">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              <span className="font-bold text-sm text-teal-800">Live Lab Alerts</span>
              <Badge variant="info" className="text-[10px]">{sseUnread} new</Badge>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={clearSseAlerts} className="text-[11px] text-teal-600 hover:text-teal-800 font-medium">Clear all</button>
              <button onClick={() => setShowSsePanel(false)} className="text-teal-400 hover:text-teal-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="divide-y divide-teal-100 max-h-48 overflow-y-auto">
            {sseAlerts.map(alert => (
              <div key={alert.id} className={`px-4 py-3 flex items-start gap-3 ${alert.read ? "opacity-60" : ""}`}>
                <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${alert.severity === "critical" ? "bg-red-500" : alert.severity === "high" ? "bg-amber-500" : "bg-teal-400"}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-teal-900">{alert.title}</p>
                  <p className="text-xs text-teal-700 mt-0.5">{alert.patientName}{alert.result ? ` · ${alert.result}` : ""}</p>
                </div>
                {!alert.read && (
                  <button onClick={() => markSseRead(alert.id)} className="text-[10px] text-teal-500 hover:text-teal-800 shrink-0">Dismiss</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-start justify-between mb-5">
        <PageHeader
          title="Lab Portal"
          subtitle="Upload results · AI interpretation · Clinical flags"
        />
        <button
          onClick={() => setShowSsePanel(p => !p)}
          className={`relative flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl border transition-colors ${
            sseUnread > 0 ? "bg-teal-50 border-teal-200 text-teal-700" : "bg-secondary border-border text-muted-foreground"
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          {sseUnread > 0 ? `${sseUnread} Live Alert${sseUnread > 1 ? "s" : ""}` : "Live Alerts"}
          <span className={`w-1.5 h-1.5 rounded-full ${sseConnected ? "bg-emerald-400" : "bg-gray-300"}`} />
        </button>
      </div>

      {/* Search */}
      <Card className="mb-5">
        <CardBody>
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Patient National ID"
                value={searchId}
                onChange={e => setSearchId(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit" disabled={!searchId.trim()}>
              <Search className="w-4 h-4" /> Retrieve Patient
            </Button>
          </form>
        </CardBody>
      </Card>

      {isLoading && (
        <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-teal-600" />
          <span className="text-sm font-medium">Retrieving patient records...</span>
        </div>
      )}

      {error && (
        <Card>
          <CardBody className="py-10 text-center">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
            <p className="font-bold text-foreground">Patient Not Found</p>
            <p className="text-sm text-muted-foreground mt-1">No records for National ID: {nationalId}</p>
          </CardBody>
        </Card>
      )}

      {data && (
        <div className="space-y-4">
          {/* Patient Card */}
          <div className="rounded-3xl border border-border overflow-hidden">
            {data.patient.allergies?.length > 0 && (
              <div className="bg-red-600 text-white px-5 py-2.5 flex items-center gap-2.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <p className="text-xs font-bold uppercase tracking-widest">KNOWN ALLERGIES: {data.patient.allergies.join(", ")}</p>
              </div>
            )}
            <div className="bg-white p-5 flex items-center justify-between gap-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Patient Identified</p>
                <p className="text-2xl font-bold text-foreground">{data.patient.name}</p>
                <div className="flex items-center gap-2.5 mt-2 flex-wrap">
                  <span className="font-mono bg-secondary text-xs px-2.5 py-1 rounded-xl">{data.patient.nationalId}</span>
                  <span className="text-xs text-muted-foreground">Age {data.patient.age}</span>
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">Blood: {data.patient.bloodType}</span>
                </div>
              </div>
              <div className="flex items-center gap-6 shrink-0">
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Labs on Record</p>
                  <p className="text-3xl font-bold tabular-nums text-foreground">{data.summary.total}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Critical</p>
                  <p className="text-3xl font-bold tabular-nums text-red-600">{data.summary.critical}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Abnormal</p>
                  <p className="text-3xl font-bold tabular-nums text-amber-600">{data.summary.abnormal}</p>
                </div>
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="w-4 h-4" /> Add Result
                </Button>
              </div>
            </div>
          </div>

          {/* ─── Trend Charts ─── */}
          {chartsToShow.length > 0 && (
            <Card>
              <CardHeader>
                <Activity className="w-4 h-4 text-teal-600" />
                <CardTitle>Lab Trends — Clinical Progression</CardTitle>
                <span className="ml-auto text-[11px] font-medium text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
                  {chartsToShow.length} test{chartsToShow.length > 1 ? "s" : ""} charted
                </span>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-2 gap-5">
                  {chartsToShow.map(testName => {
                    const points = trendChartData[testName]!;
                    const color = CHART_COLORS[testName] ?? "#6366f1";
                    const range = NORMAL_RANGES[testName];
                    const latest = points[points.length - 1];
                    const previous = points.length >= 2 ? points[points.length - 2] : null;
                    const isWorsening = previous && latest && latest.value > previous.value && latest.status !== "normal";
                    const isImproving = previous && latest && latest.value < previous.value && latest.status === "normal";

                    return (
                      <div key={testName} className="rounded-2xl border border-border p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-[13px] font-bold text-foreground">{testName}</p>
                            <p className="text-[11px] text-muted-foreground">
                              Latest: <span className="font-bold" style={{ color }}>{latest?.value} {range?.unit ?? ""}</span>
                              {range && (
                                <span className="ml-1 text-muted-foreground/70">
                                  (Normal: {range.min}–{range.max})
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {isWorsening && (
                              <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" /> WORSENING
                              </span>
                            )}
                            {isImproving && (
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <TrendingDown className="w-3 h-3" /> IMPROVING
                              </span>
                            )}
                            {!isWorsening && !isImproving && points.length > 1 && (
                              <span className="text-[10px] font-bold text-muted-foreground bg-secondary px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Minus className="w-3 h-3" /> STABLE
                              </span>
                            )}
                          </div>
                        </div>
                        <ResponsiveContainer width="100%" height={140}>
                          <LineChart data={points} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 10, fill: "#94a3b8" }}
                              tickFormatter={d => d.slice(5)}
                            />
                            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                            <Tooltip
                              contentStyle={{ borderRadius: 10, border: "1px solid rgba(0,0,0,0.08)", fontSize: 11 }}
                              formatter={(val: any) => [`${val} ${range?.unit ?? ""}`, testName]}
                            />
                            {range && range.max > 0 && (
                              <ReferenceLine y={range.max} stroke="#f59e0b" strokeDasharray="4 2" strokeWidth={1.5} label={{ value: "Max", fill: "#f59e0b", fontSize: 9 }} />
                            )}
                            {range && range.min > 0 && (
                              <ReferenceLine y={range.min} stroke="#10b981" strokeDasharray="4 2" strokeWidth={1.5} label={{ value: "Min", fill: "#10b981", fontSize: 9 }} />
                            )}
                            <Line
                              type="monotone"
                              dataKey="value"
                              stroke={color}
                              strokeWidth={2.5}
                              dot={(props: any) => {
                                const { cx, cy, payload } = props;
                                const fill = payload.status === "critical" ? "#ef4444" : payload.status === "abnormal" ? "#f59e0b" : "#10b981";
                                return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={5} fill={fill} stroke="white" strokeWidth={2} />;
                              }}
                              activeDot={{ r: 7, strokeWidth: 2 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  })}
                </div>
              </CardBody>
            </Card>
          )}

          {/* ─── Lab Panel AI Summary (Grouped Clinical Panels) ─── */}
          {data.labs.length > 0 && (() => {
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
            const panels = [
              {
                name: "Metabolic Panel", icon: "MET", tests: [
                  { label: "HbA1c", v: get("HbA1c"), normal: "<5.7%", hi: "≥6.5% = Diabetes" },
                  { label: "Fasting Glucose", v: get("Glucose"), normal: "70–100 mg/dL", hi: ">126 = Diabetes" },
                  { label: "Creatinine", v: get("Creatinine"), normal: "0.6–1.2 mg/dL", hi: ">1.5 = CKD risk" },
                  { label: "eGFR", v: get("eGFR"), normal: ">60 mL/min", hi: "<60 = CKD" },
                ],
                insight: "Metabolic function screen — diabetes, renal function, and glycaemic control",
              },
              {
                name: "Lipid Panel", icon: "LIP", tests: [
                  { label: "Total Cholesterol", v: get("Cholesterol"), normal: "<200 mg/dL", hi: ">240 = High risk" },
                  { label: "LDL", v: get("LDL"), normal: "<100 mg/dL", hi: ">160 = High" },
                  { label: "HDL", v: get("HDL"), normal: ">40 mg/dL", hi: "<40 = Low" },
                  { label: "Triglycerides", v: get("Triglycerides"), normal: "<150 mg/dL", hi: ">200 = High" },
                ],
                insight: "Cardiovascular lipid risk assessment — ATP III guidelines",
              },
              {
                name: "CBC — Blood Count", icon: "CBC", tests: [
                  { label: "Hemoglobin", v: get("Hemoglobin"), normal: "12–17 g/dL", hi: "<12 = Anemia" },
                  { label: "WBC", v: get("WBC"), normal: "4–11 K/μL", hi: ">11 = Infection?" },
                  { label: "Platelets", v: get("Platelet"), normal: "150–400 K/μL", hi: "<150 = Thrombocytopenia" },
                ],
                insight: "Complete blood count — anemia, infection, and bleeding risk screening",
              },
            ].filter(p => p.tests.some(t => t.v));

            if (panels.length === 0) return null;

            return (
              <Card>
                <CardHeader>
                  <FlaskConical className="w-4 h-4 text-violet-600" />
                  <CardTitle>AI Panel Summary — Clinical Lab Groups</CardTitle>
                  <Badge variant="purple" className="ml-auto">{panels.length} Panels Detected</Badge>
                </CardHeader>
                <CardBody>
                  <div className="grid grid-cols-3 gap-4">
                    {panels.map((panel, pi) => {
                      const presentTests = panel.tests.filter(t => t.v);
                      const abnormal = presentTests.filter(t => t.v!.status !== "normal");
                      const critical = presentTests.filter(t => t.v!.status === "critical");
                      const panelStatus = critical.length > 0 ? "critical" : abnormal.length > 0 ? "abnormal" : "normal";
                      return (
                        <div key={pi} className={`p-4 rounded-2xl border-2 ${panelStatus === "critical" ? "bg-red-50 border-red-300" : panelStatus === "abnormal" ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-[9px] font-black text-muted-foreground">{panel.icon}</span>
                            <div>
                              <p className="text-sm font-bold text-foreground">{panel.name}</p>
                              <p className="text-[9px] text-muted-foreground">{presentTests.length} results · {abnormal.length} abnormal</p>
                            </div>
                            <span className={`ml-auto text-[8px] font-black px-1.5 py-0.5 rounded text-white ${panelStatus === "critical" ? "bg-red-600" : panelStatus === "abnormal" ? "bg-amber-500" : "bg-emerald-600"}`}>
                              {panelStatus.toUpperCase()}
                            </span>
                          </div>
                          <div className="space-y-1.5 mb-3">
                            {presentTests.map((t, ti) => (
                              <div key={ti} className="flex items-center justify-between text-[10px]">
                                <span className="text-muted-foreground">{t.label}</span>
                                <div className="flex items-center gap-1.5">
                                  <span className={`font-black tabular-nums ${t.v!.status === "critical" ? "text-red-600" : t.v!.status === "abnormal" ? "text-amber-600" : "text-emerald-700"}`}>
                                    {t.v!.result} {t.v!.unit}
                                  </span>
                                  <span className="text-muted-foreground font-mono">(N: {t.normal})</span>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className={`text-[9px] px-2 py-1.5 rounded-lg ${panelStatus === "critical" ? "bg-red-100 text-red-800" : panelStatus === "abnormal" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                            <Brain className="w-2.5 h-2.5 inline mr-1" />{panel.insight}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardBody>
              </Card>
            );
          })()}

          {/* AI Interpretation of last submitted result */}
          {lastResult && (
            <div className={`rounded-2xl p-5 border-2 ${lastResult.aiAnalysis?.status === "critical" ? "bg-red-50 border-red-300" : lastResult.aiAnalysis?.status === "abnormal" ? "bg-amber-50 border-amber-300" : "bg-emerald-50 border-emerald-300"}`}>
              <div className="flex items-start gap-3 mb-3">
                <Brain className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">AI Lab Interpreter — Just Submitted</p>
                  <p className="font-bold text-foreground">{lastResult.result?.testName} = {lastResult.result?.result} {lastResult.result?.unit}</p>
                </div>
                <Badge variant={statusColor(lastResult.aiAnalysis?.status)} className="ml-auto">{lastResult.aiAnalysis?.status}</Badge>
              </div>
              <p className="text-sm text-foreground mb-2">{lastResult.aiAnalysis?.significance}</p>
              <div className="flex items-start gap-2 px-3 py-2.5 bg-white/60 rounded-xl">
                <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-foreground">{lastResult.aiAnalysis?.action}</p>
              </div>
              <div className="flex items-center gap-3 mt-2.5">
                <span className="text-[10px] text-muted-foreground">RISK IMPACT: +{lastResult.aiAnalysis?.riskImpact} pts</span>
                <span className="text-[10px] text-muted-foreground">CONFIDENCE: {Math.round(lastResult.aiAnalysis?.confidence * 100)}%</span>
                <span className="text-[10px] text-muted-foreground ml-auto">EVENT: {lastResult.event}</span>
              </div>
            </div>
          )}

          {/* Add Result Form */}
          {showAddForm && (
            <Card>
              <CardHeader>
                <FlaskConical className="w-4 h-4 text-teal-600" />
                <CardTitle>Upload New Lab Result</CardTitle>
                <button onClick={() => setShowAddForm(false)} className="ml-auto text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">Test Name *</p>
                    <select
                      className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      value={form.testName}
                      onChange={e => setForm(f => ({ ...f, testName: e.target.value }))}
                    >
                      <option value="">Select test...</option>
                      {TEST_NAMES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">Result Value *</p>
                    <Input
                      placeholder="e.g. 8.2"
                      value={form.result}
                      onChange={e => setForm(f => ({ ...f, result: e.target.value }))}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">Unit</p>
                    <Input
                      placeholder="e.g. mg/dL, %"
                      value={form.unit}
                      onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">Reference Range</p>
                    <Input
                      placeholder="e.g. 70–99 mg/dL"
                      value={form.referenceRange}
                      onChange={e => setForm(f => ({ ...f, referenceRange: e.target.value }))}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">Status *</p>
                    <select
                      className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      value={form.status}
                      onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    >
                      <option value="normal">Normal</option>
                      <option value="abnormal">Abnormal</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">Hospital / Lab</p>
                    <Input
                      value={form.hospital}
                      onChange={e => setForm(f => ({ ...f, hospital: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">Clinical Notes</p>
                  <Input
                    placeholder="Optional clinical notes..."
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => submitMutation.mutate(form as any)}
                    disabled={!form.testName || !form.result || !form.status || submitMutation.isPending}
                    className="flex-1"
                  >
                    <Zap className="w-4 h-4" />
                    {submitMutation.isPending ? "Submitting + AI Analysis..." : "Submit Result & Run AI Analysis"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Lab Results List */}
          <Card>
            <CardHeader>
              <FlaskConical className="w-4 h-4 text-teal-600" />
              <CardTitle>Lab Results with AI Interpretation</CardTitle>
              <Badge variant="outline" className="ml-auto">{data.labs.length} results</Badge>
            </CardHeader>
            <div className="divide-y divide-border">
              {data.labs.length === 0 ? (
                <div className="py-12 text-center">
                  <FlaskConical className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="font-bold text-foreground">No lab results on record</p>
                </div>
              ) : (
                data.labs.map((lab: any) => (
                  <div key={lab.id} className={`p-4 ${lab.status === "critical" ? "bg-red-50/50" : lab.status === "abnormal" ? "bg-amber-50/30" : ""}`}>
                    <div className="flex items-start gap-4">
                      <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-teal-500" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-sm text-foreground">{lab.testName}</p>
                          <Badge variant={statusColor(lab.status)} className="text-[9px]">{lab.status}</Badge>
                          <div className="flex items-center gap-1 ml-1">
                            {trendIcon(lab.interpretation?.trend ?? "")}
                            <span className="text-[10px] font-bold text-muted-foreground">{lab.interpretation?.trend}</span>
                          </div>
                          <span className="ml-auto text-[10px] text-muted-foreground font-mono">{lab.testDate}</span>
                        </div>
                        <div className="flex items-center gap-3 mb-2">
                          <p className="text-lg font-bold tabular-nums text-foreground">{lab.result} <span className="text-sm font-normal text-muted-foreground">{lab.unit}</span></p>
                          {lab.referenceRange && <p className="text-[10px] text-muted-foreground font-mono bg-secondary px-2 py-0.5 rounded-full">REF: {lab.referenceRange}</p>}
                          <p className="text-[10px] text-muted-foreground">{lab.hospital}</p>
                        </div>
                        <div className={`px-3 py-2.5 rounded-xl border text-xs ${
                          lab.status === "critical" ? "bg-red-50 border-red-200" :
                          lab.status === "abnormal" ? "bg-amber-50 border-amber-200" :
                          "bg-emerald-50 border-emerald-200"
                        }`}>
                          <div className="flex items-start gap-2">
                            <Brain className="w-3.5 h-3.5 text-violet-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-semibold text-foreground mb-0.5">{lab.interpretation?.significance}</p>
                              <p className="text-muted-foreground">→ {lab.interpretation?.action}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-[10px] font-mono text-muted-foreground">RISK IMPACT: +{lab.interpretation?.riskImpact}</span>
                                <span className="text-[10px] font-mono text-muted-foreground">CONFIDENCE: {Math.round((lab.interpretation?.confidence ?? 0) * 100)}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {!nationalId && !isLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-3xl bg-teal-100 flex items-center justify-center mx-auto mb-5">
            <FlaskConical className="w-8 h-8 text-teal-600" />
          </div>
          <p className="text-xl font-bold text-foreground mb-2">Lab Results Portal</p>
          <p className="text-sm text-muted-foreground max-w-sm">Enter a patient's National ID to retrieve their lab history and upload new results with AI interpretation.</p>
        </div>
      )}
    </Layout>
  );
}
