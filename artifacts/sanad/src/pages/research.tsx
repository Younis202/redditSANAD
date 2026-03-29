import React, { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardHeader, CardTitle, CardBody, Badge, PageHeader, KpiCard } from "@/components/shared";
import {
  FlaskConical, Brain, Activity, TrendingUp, Users, Lightbulb, Lock,
  BarChart2, Download, BookOpen, Microscope, GitBranch, Target, Zap,
  ArrowUpRight, FileText, Filter, Globe, Star, ChevronRight, Database
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, LineChart, Line, ScatterChart, Scatter, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend,
  AreaChart, Area
} from "recharts";

async function fetchResearchInsights() {
  const res = await fetch("/api/research/insights");
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

const TREND_CONFIG = {
  rising: { color: "text-red-600", bg: "bg-red-50", border: "border-red-100", label: "Rising ↑", dot: "bg-red-500" },
  stable: { color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", label: "Stable →", dot: "bg-amber-500" },
  declining: { color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100", label: "Declining ↓", dot: "bg-emerald-500" },
};

const CLINICAL_STUDIES = [
  {
    id: "KSU-2024-001",
    title: "HbA1c Trajectory & Cardiovascular Risk in Type-2 Diabetes — National Cohort",
    status: "active",
    phase: "Phase III",
    cohortSize: 12480,
    enrolled: 11932,
    startDate: "Jan 2024",
    expectedEnd: "Dec 2025",
    primaryEndpoint: "Composite MACE (MI, stroke, CV death) at 24 months",
    keyFinding: "HbA1c reduction ≥1.5% associated with 34% lower MACE risk (HR 0.66, 95% CI 0.54-0.81)",
    significance: "high",
    sponsor: "MOH / King Abdulaziz University",
    lead: "Dr. Reem Al-Zahrani",
    aiInsight: "Digital Twin simulation predicts 28% reduction in hospitalizations if 80% of cohort achieves HbA1c <7.0%",
  },
  {
    id: "SANAD-2024-002",
    title: "AI-Guided Antihypertensive Therapy Optimization — Riyadh Region",
    status: "active",
    phase: "Phase II",
    cohortSize: 4200,
    enrolled: 3871,
    startDate: "Mar 2024",
    expectedEnd: "Sep 2025",
    primaryEndpoint: "BP control <130/80 at 12 months using AI-driven titration vs. standard care",
    keyFinding: "AI-guided arm shows 47% higher target attainment at 6 months (p<0.001)",
    significance: "high",
    sponsor: "SANAD AI Division",
    lead: "Dr. Khalid Al-Mansouri",
    aiInsight: "Behavioral AI identifies medication non-adherence as primary failure mode in 62% of non-responders",
  },
  {
    id: "MOH-2024-003",
    title: "Metabolic Syndrome Prevalence & Progression in Saudi Adults 35-65",
    status: "completed",
    phase: "Observational",
    cohortSize: 8900,
    enrolled: 8900,
    startDate: "Jun 2023",
    expectedEnd: "Jun 2024",
    primaryEndpoint: "MetSyn prevalence and 12-month incident T2DM rate",
    keyFinding: "MetSyn prevalence 39.2% (95% CI 38.1-40.3); T2DM incidence 8.7/100 person-years in high-risk quartile",
    significance: "medium",
    sponsor: "Ministry of Health — KSA",
    lead: "Prof. Saud Al-Shammari",
    aiInsight: "Risk Engine identifies waist circumference + fasting insulin as strongest predictors (AUC 0.84)",
  },
  {
    id: "NGHA-2024-004",
    title: "Chronic Kidney Disease Progression Prediction Using Multi-Modal AI",
    status: "recruiting",
    phase: "Phase II",
    cohortSize: 6000,
    enrolled: 1243,
    startDate: "Oct 2024",
    expectedEnd: "Oct 2026",
    primaryEndpoint: "eGFR decline ≥40% or ESRD at 24 months predicted by AI vs. traditional Framingham model",
    keyFinding: "Interim: AI model outperforms Framingham (AUROC 0.91 vs 0.74, p=0.002)",
    significance: "high",
    sponsor: "National Guard Health Affairs",
    lead: "Dr. Faisal Al-Harbi",
    aiInsight: "Medication adherence pattern alone improves CKD prediction accuracy by 18%",
  },
];

const DISEASE_CORRELATIONS = [
  { condition: "Type-2 Diabetes", hypertension: 72, ckd: 48, heartDisease: 41, obesity: 65, dyslipidemia: 58 },
  { condition: "Hypertension", hypertension: 100, ckd: 52, heartDisease: 64, obesity: 47, dyslipidemia: 51 },
  { condition: "CKD", hypertension: 52, ckd: 100, heartDisease: 38, obesity: 29, dyslipidemia: 44 },
  { condition: "Heart Disease", hypertension: 64, ckd: 38, heartDisease: 100, obesity: 35, dyslipidemia: 69 },
];

const POPULATION_TRENDS = [
  { month: "Jan", diabetes: 38, hypertension: 52, ckd: 14, obesity: 31 },
  { month: "Feb", diabetes: 39, hypertension: 52, ckd: 14, obesity: 32 },
  { month: "Mar", diabetes: 40, hypertension: 53, ckd: 15, obesity: 33 },
  { month: "Apr", diabetes: 40, hypertension: 54, ckd: 15, obesity: 33 },
  { month: "May", diabetes: 41, hypertension: 55, ckd: 16, obesity: 34 },
  { month: "Jun", diabetes: 42, hypertension: 55, ckd: 16, obesity: 35 },
  { month: "Jul", diabetes: 43, hypertension: 56, ckd: 17, obesity: 35 },
  { month: "Aug", diabetes: 44, hypertension: 57, ckd: 17, obesity: 36 },
  { month: "Sep", diabetes: 44, hypertension: 57, ckd: 18, obesity: 36 },
  { month: "Oct", diabetes: 45, hypertension: 58, ckd: 18, obesity: 37 },
  { month: "Nov", diabetes: 46, hypertension: 59, ckd: 19, obesity: 37 },
  { month: "Dec", diabetes: 47, hypertension: 60, ckd: 19, obesity: 38 },
];

const COHORT_RADAR = [
  { metric: "Diabetes", A: 47, B: 23 },
  { metric: "Hypertension", B: 60, A: 28 },
  { metric: "CKD", A: 19, B: 9 },
  { metric: "Dyslipidemia", A: 44, B: 21 },
  { metric: "Obesity", A: 38, B: 17 },
  { metric: "Heart Disease", A: 22, B: 10 },
];

const STATUS_CONFIG: Record<string, { bg: string; border: string; badge: any; dot: string; label: string }> = {
  active: { bg: "bg-emerald-50", border: "border-emerald-200", badge: "success" as const, dot: "bg-emerald-500 animate-pulse", label: "Active" },
  recruiting: { bg: "bg-sky-50", border: "border-sky-200", badge: "info" as const, dot: "bg-sky-500 animate-pulse", label: "Recruiting" },
  completed: { bg: "bg-secondary", border: "border-border", badge: "outline" as const, dot: "bg-muted-foreground", label: "Completed" },
  paused: { bg: "bg-amber-50", border: "border-amber-200", badge: "warning" as const, dot: "bg-amber-500", label: "Paused" },
};

type ViewTab = "overview" | "studies" | "trends" | "correlations" | "cohorts";

export default function ResearchPortal() {
  const [activeView, setActiveView] = useState<ViewTab>("overview");
  const [selectedConditions, setSelectedConditions] = useState<"conditions" | "labs" | "drugs" | "age">("conditions");
  const { data, isLoading } = useQuery({ queryKey: ["research-insights"], queryFn: fetchResearchInsights });

  const handleExport = async (format: "csv" | "json") => {
    const res = await fetch(`/api/research/export?format=${format}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sanad-research-export.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Layout role="research">
        <div className="flex items-center justify-center gap-3 py-20 text-muted-foreground">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-teal-500" />
          <span className="text-sm font-medium">Aggregating anonymized research data...</span>
        </div>
      </Layout>
    );
  }

  const TABS: { id: ViewTab; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: "Population Overview", icon: BarChart2 },
    { id: "studies", label: "Clinical Studies", icon: BookOpen },
    { id: "trends", label: "Disease Trends", icon: TrendingUp },
    { id: "correlations", label: "Correlation Analysis", icon: GitBranch },
    { id: "cohorts", label: "Cohort Comparison", icon: Users },
  ];

  return (
    <Layout role="research">
      {/* Header Strip */}
      <div className="flex items-center gap-2 mb-5">
        <div className="flex items-center gap-2 bg-teal-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-full uppercase tracking-widest">
          <FlaskConical className="w-3 h-3" />
          Research Portal
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
          <Lock className="w-3 h-3" />
          All data anonymized · GDPR + PDPL compliant
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => handleExport("csv")}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-full hover:bg-teal-100 transition-colors"
          >
            <Download className="w-3 h-3" />
            Export CSV
          </button>
          <button
            onClick={() => handleExport("json")}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-violet-700 bg-violet-50 border border-violet-200 px-3 py-1.5 rounded-full hover:bg-violet-100 transition-colors"
          >
            <Database className="w-3 h-3" />
            Export JSON
          </button>
        </div>
      </div>

      <PageHeader
        title="Clinical Research & Population Analytics"
        subtitle="Anonymized population-level health intelligence · Clinical study management · Disease correlation engine · National insights"
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard title="Anonymized Records" value={data?.totalAnonymizedRecords?.toLocaleString()} sub="Fully de-identified" icon={Users} iconBg="bg-teal-100" iconColor="text-teal-600" />
        <KpiCard title="Active Studies" value={CLINICAL_STUDIES.filter(s => s.status === "active").length} sub={`${CLINICAL_STUDIES.length} total registered`} icon={BookOpen} iconBg="bg-violet-100" iconColor="text-violet-600" />
        <KpiCard title="AI Decisions Analyzed" value={data?.aiMetrics?.totalDecisions?.toLocaleString()} sub={`${data?.aiMetrics?.avgConfidence}% avg confidence`} icon={Brain} iconBg="bg-amber-100" iconColor="text-amber-600" />
        <KpiCard title="Lab Results" value={data?.totalLabResults?.toLocaleString()} sub="Cross-patient trend data" icon={FlaskConical} iconBg="bg-primary/10" iconColor="text-primary" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
                activeView === tab.id ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3 h-3" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── OVERVIEW ─── */}
      {activeView === "overview" && (
        <div className="space-y-5">
          {/* AI Clinical Findings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-500" /><CardTitle>AI Clinical Findings — Population Level</CardTitle></div>
              <Badge variant="warning">{data?.clinicalFindings?.length} insights</Badge>
            </CardHeader>
            <CardBody className="space-y-3">
              {data?.clinicalFindings?.map((f: any, i: number) => (
                <div key={i} className={`flex items-start gap-3 px-4 py-3.5 rounded-2xl border ${f.significance === "high" ? "bg-amber-50 border-amber-200" : "bg-sky-50 border-sky-200"}`}>
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${f.significance === "high" ? "bg-amber-500" : "bg-sky-500"}`} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{f.finding}</p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                      <ChevronRight className="w-3 h-3 text-primary shrink-0" />
                      {f.recommendation}
                    </p>
                  </div>
                  <Badge variant={f.significance === "high" ? "warning" : "info"} className="shrink-0">{f.significance}</Badge>
                </div>
              ))}
            </CardBody>
          </Card>

          {/* Data Charts */}
          <div className="flex items-center gap-2 mb-3">
            {[
              { id: "conditions", label: "Disease Prevalence" },
              { id: "labs", label: "Lab Abnormality Rates" },
              { id: "drugs", label: "Drug Utilization" },
              { id: "age", label: "Age × Risk" },
            ].map(tab => (
              <button key={tab.id} onClick={() => setSelectedConditions(tab.id as any)} className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${selectedConditions === tab.id ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-12 gap-5">
            {selectedConditions === "conditions" && (
              <>
                <Card className="col-span-7">
                  <CardHeader><div className="flex items-center gap-2"><BarChart2 className="w-4 h-4 text-primary" /><CardTitle>Disease Prevalence by Condition</CardTitle></div></CardHeader>
                  <CardBody>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data?.conditionInsights?.slice(0, 8)} layout="vertical" margin={{ top: 0, right: 40, left: 160, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                          <XAxis type="number" hide />
                          <YAxis dataKey="condition" type="category" axisLine={false} tickLine={false} tick={{ fill: "#374151", fontSize: 10, fontWeight: 500 }} width={155} />
                          <RechartsTooltip contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: 12 }} formatter={(v: any) => [`${v}%`, "Prevalence"]} />
                          <Bar dataKey="prevalence" fill="#0d9488" radius={[0, 6, 6, 0]} barSize={14} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardBody>
                </Card>
                <Card className="col-span-5">
                  <CardHeader><CardTitle>Condition Trend Analysis</CardTitle></CardHeader>
                  <CardBody className="space-y-2 max-h-72 overflow-y-auto">
                    {data?.conditionInsights?.map((c: any, i: number) => {
                      const cfg = TREND_CONFIG[c.trend as keyof typeof TREND_CONFIG] ?? TREND_CONFIG.stable;
                      return (
                        <div key={i} className={`flex items-center gap-3 px-3 py-2.5 ${cfg.bg} border ${cfg.border} rounded-xl`}>
                          <div className={`w-2 h-2 rounded-full ${cfg.dot} shrink-0`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{c.condition}</p>
                            <p className="text-xs text-muted-foreground">{c.patientCount} patients · Risk: {c.avgRiskScore}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-xs font-bold ${cfg.color}`}>{c.prevalence}%</p>
                            <p className={`text-[10px] font-medium ${cfg.color}`}>{cfg.label}</p>
                          </div>
                        </div>
                      );
                    })}
                  </CardBody>
                </Card>
              </>
            )}
            {selectedConditions === "labs" && (
              <Card className="col-span-12">
                <CardHeader><div className="flex items-center gap-2"><FlaskConical className="w-4 h-4 text-violet-600" /><CardTitle>Lab Test Abnormality Rates</CardTitle></div></CardHeader>
                <CardBody>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data?.labInsights} margin={{ top: 5, right: 30, bottom: 20, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="test" axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 10 }} angle={-20} textAnchor="end" dy={8} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11 }} />
                        <RechartsTooltip contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: 12 }} formatter={(v: any, n: string) => [`${v}%`, n === "abnormalRate" ? "Abnormal Rate" : "Critical Rate"]} />
                        <Legend />
                        <Bar dataKey="abnormalRate" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={28} name="Abnormal Rate" />
                        <Bar dataKey="criticalRate" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={28} name="Critical Rate" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardBody>
              </Card>
            )}
            {selectedConditions === "drugs" && (
              <Card className="col-span-12">
                <CardHeader><div className="flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /><CardTitle>Top Drug Utilization Patterns</CardTitle></div></CardHeader>
                <CardBody>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data?.drugPatterns} layout="vertical" margin={{ top: 0, right: 30, left: 180, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="drug" type="category" axisLine={false} tickLine={false} tick={{ fill: "#374151", fontSize: 11, fontWeight: 500 }} width={175} />
                        <RechartsTooltip contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: 12 }} />
                        <Bar dataKey="prescriptions" fill="#007AFF" radius={[0, 6, 6, 0]} barSize={14} name="Prescriptions" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardBody>
              </Card>
            )}
            {selectedConditions === "age" && (
              <Card className="col-span-12">
                <CardHeader><div className="flex items-center gap-2"><Users className="w-4 h-4 text-primary" /><CardTitle>Age Group × Average Risk Score</CardTitle></div></CardHeader>
                <CardBody>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data?.ageRiskData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="ageGroup" axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11 }} />
                        <RechartsTooltip contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: 12 }} />
                        <Bar dataKey="avgRiskScore" fill="#f97316" radius={[6, 6, 0, 0]} barSize={50} name="Avg Risk Score" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ─── CLINICAL STUDIES ─── */}
      {activeView === "studies" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-violet-50 border border-violet-200 rounded-2xl">
            <BookOpen className="w-5 h-5 text-violet-600 shrink-0" />
            <div>
              <p className="text-sm font-bold text-violet-800">SANAD Clinical Research Registry</p>
              <p className="text-xs text-violet-600 mt-0.5">
                {CLINICAL_STUDIES.filter(s => s.status === "active").length} active ·{" "}
                {CLINICAL_STUDIES.filter(s => s.status === "recruiting").length} recruiting ·{" "}
                {CLINICAL_STUDIES.filter(s => s.status === "completed").length} completed ·{" "}
                {CLINICAL_STUDIES.reduce((sum, s) => sum + s.enrolled, 0).toLocaleString()} total participants
              </p>
            </div>
          </div>

          {CLINICAL_STUDIES.map((study) => {
            const cfg = STATUS_CONFIG[study.status] ?? STATUS_CONFIG.active;
            const enrollPct = Math.round((study.enrolled / study.cohortSize) * 100);
            return (
              <Card key={study.id} className={`border ${cfg.border}`}>
                <CardBody className="p-0">
                  <div className={`px-5 py-4 ${cfg.bg} border-b ${cfg.border}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0`} />
                          <span className="font-mono text-[10px] text-muted-foreground">{study.id}</span>
                          <Badge variant={cfg.badge} className="text-[10px]">{cfg.label}</Badge>
                          <span className="text-[10px] font-semibold text-muted-foreground bg-white/60 border border-border px-2 py-0.5 rounded-full">{study.phase}</span>
                        </div>
                        <h3 className="text-sm font-bold text-foreground leading-snug">{study.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Lead: <span className="font-semibold text-foreground">{study.lead}</span> · {study.sponsor}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-2xl font-bold text-foreground">{enrollPct}%</p>
                        <p className="text-[10px] text-muted-foreground">Enrolled</p>
                      </div>
                    </div>
                    <div className="mt-3 w-full bg-white/60 rounded-full h-1.5">
                      <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${enrollPct}%` }} />
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-[10px] text-muted-foreground">
                      <span>{study.enrolled.toLocaleString()} / {study.cohortSize.toLocaleString()} participants</span>
                      <span>·</span>
                      <span>{study.startDate} → {study.expectedEnd}</span>
                    </div>
                  </div>

                  <div className="px-5 py-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-1">
                        <Target className="w-3 h-3" /> Primary Endpoint
                      </p>
                      <p className="text-xs text-foreground font-medium leading-relaxed">{study.primaryEndpoint}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-500" /> Key Finding
                      </p>
                      <p className="text-xs font-semibold text-foreground leading-relaxed">{study.keyFinding}</p>
                    </div>
                  </div>

                  <div className="px-5 py-3 bg-violet-50 border-t border-violet-100 rounded-b-[inherit]">
                    <div className="flex items-start gap-2">
                      <Brain className="w-3.5 h-3.5 text-violet-600 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-violet-800">
                        <span className="font-bold">AI Insight:</span> {study.aiInsight}
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── DISEASE TRENDS ─── */}
      {activeView === "trends" && (
        <div className="space-y-5">
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <TrendingUp className="w-5 h-5 text-red-600 shrink-0" />
            <div>
              <p className="text-sm font-bold text-red-800">National Disease Trend Radar — 12-Month View</p>
              <p className="text-xs text-red-600 mt-0.5">All 4 major chronic diseases showing upward trend — immediate national response required</p>
            </div>
            <Badge variant="destructive" className="ml-auto shrink-0">RISING</Badge>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-red-500" /><CardTitle>Disease Prevalence Trends — 12-Month Progression</CardTitle></div>
              <span className="text-[11px] text-muted-foreground font-mono ml-auto">% of total patient population</span>
            </CardHeader>
            <CardBody>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={POPULATION_TRENDS} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <defs>
                      <linearGradient id="colorDiabetes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorHypertension" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorCKD" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorObesity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#007AFF" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#007AFF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11 }} unit="%" />
                    <RechartsTooltip contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: 12 }} formatter={(v: any, n: string) => [`${v}%`, n]} />
                    <Legend />
                    <Area type="monotone" dataKey="diabetes" stroke="#f59e0b" fill="url(#colorDiabetes)" strokeWidth={2.5} name="Type-2 Diabetes" />
                    <Area type="monotone" dataKey="hypertension" stroke="#ef4444" fill="url(#colorHypertension)" strokeWidth={2.5} name="Hypertension" />
                    <Area type="monotone" dataKey="ckd" stroke="#8b5cf6" fill="url(#colorCKD)" strokeWidth={2.5} name="CKD" />
                    <Area type="monotone" dataKey="obesity" stroke="#007AFF" fill="url(#colorObesity)" strokeWidth={2.5} name="Obesity" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>

          <div className="grid grid-cols-4 gap-4">
            {[
              { name: "Type-2 Diabetes", current: "47%", change: "+9%", trend: "rising", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
              { name: "Hypertension", current: "60%", change: "+8%", trend: "rising", color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
              { name: "Chronic Kidney Disease", current: "19%", change: "+5%", trend: "rising", color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200" },
              { name: "Obesity", current: "38%", change: "+7%", trend: "rising", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
            ].map((d, i) => (
              <div key={i} className={`p-4 ${d.bg} border ${d.border} rounded-2xl`}>
                <p className="text-xs font-bold text-muted-foreground mb-2">{d.name}</p>
                <div className="flex items-end gap-2">
                  <p className={`text-3xl font-bold ${d.color}`}>{d.current}</p>
                  <p className="text-sm font-bold text-red-500 mb-1">{d.change} YTD</p>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className={`w-3 h-3 ${d.color}`} />
                  <p className={`text-[10px] font-bold ${d.color}`}>RISING TREND</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── CORRELATION ANALYSIS ─── */}
      {activeView === "correlations" && (
        <div className="space-y-5">
          <div className="flex items-center gap-3 p-4 bg-teal-50 border border-teal-200 rounded-2xl">
            <GitBranch className="w-5 h-5 text-teal-600 shrink-0" />
            <div>
              <p className="text-sm font-bold text-teal-800">Disease Co-Occurrence Correlation Matrix</p>
              <p className="text-xs text-teal-600 mt-0.5">AI-detected co-occurrence patterns across chronic conditions — values represent % of patients with Condition A who also have Condition B</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2"><GitBranch className="w-4 h-4 text-teal-600" /><CardTitle>Chronic Disease Co-Occurrence Matrix</CardTitle></div>
              <Badge variant="info">AI-Detected Patterns</Badge>
            </CardHeader>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-secondary/50">
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Condition A →</th>
                      {["Hypertension", "CKD", "Heart Disease", "Obesity", "Dyslipidemia"].map(h => (
                        <th key={h} className="px-4 py-3 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {DISEASE_CORRELATIONS.map((row, ri) => (
                      <tr key={ri} className="hover:bg-secondary/20">
                        <td className="px-4 py-3 text-sm font-bold text-foreground">{row.condition}</td>
                        {[row.hypertension, row.ckd, row.heartDisease, row.obesity, row.dyslipidemia].map((val, ci) => {
                          const intensity = val >= 60 ? "bg-red-100 text-red-700 font-bold" : val >= 40 ? "bg-amber-100 text-amber-700 font-semibold" : val >= 20 ? "bg-sky-100 text-sky-700" : "bg-secondary text-muted-foreground";
                          return (
                            <td key={ci} className="px-4 py-3 text-center">
                              <span className={`inline-block text-sm px-2.5 py-1 rounded-xl ${intensity}`}>{val}%</span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-border bg-secondary/30">
                <div className="flex items-center gap-4 text-[10px]">
                  <span className="font-bold text-muted-foreground uppercase tracking-wide">Legend:</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100" /> ≥60% Strong</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100" /> 40–59% Moderate</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-sky-100" /> 20–39% Weak</span>
                </div>
              </div>
            </CardBody>
          </Card>

          <div className="grid grid-cols-12 gap-5">
            <Card className="col-span-6">
              <CardHeader><div className="flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /><CardTitle>Top Clinical Associations</CardTitle></div></CardHeader>
              <CardBody className="space-y-3">
                {[
                  { a: "Hypertension", b: "Heart Disease", r: 64, p: "<0.001", note: "Most critical dyad — shared vascular pathology" },
                  { a: "Diabetes T2", b: "Hypertension", r: 72, p: "<0.001", note: "Metabolic syndrome overlap — dual management required" },
                  { a: "CKD", b: "Hypertension", r: 52, p: "<0.001", note: "Bidirectional — each accelerates the other" },
                  { a: "Dyslipidemia", b: "Heart Disease", r: 69, p: "<0.001", note: "Strongest modifiable risk factor for CAD" },
                  { a: "Diabetes T2", b: "Obesity", r: 65, p: "<0.001", note: "Upstream preventable risk — lifestyle intervention effective" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 px-3.5 py-3 bg-secondary rounded-2xl">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground">{item.a} ↔ {item.b}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{item.note}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-primary">{item.r}%</p>
                      <p className="text-[9px] font-mono text-muted-foreground">p{item.p}</p>
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>

            <Card className="col-span-6">
              <CardHeader><div className="flex items-center gap-2"><Brain className="w-4 h-4 text-violet-600" /><CardTitle>AI Policy Recommendations</CardTitle></div></CardHeader>
              <CardBody className="space-y-3">
                {[
                  { priority: "P1", rec: "Launch integrated DM+HTN screening program — high co-occurrence (72%) demands co-management protocol", impact: "High" },
                  { priority: "P2", rec: "Implement CKD early detection in all hypertensive patients — 52% correlation justifies routine eGFR monitoring", impact: "High" },
                  { priority: "P3", rec: "Dyslipidemia screening in all CVD patients — 69% co-occurrence, statin therapy massively underused", impact: "High" },
                  { priority: "P4", rec: "Obesity management centers in high-prevalence regions — upstream intervention for DM prevention", impact: "Medium" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 px-3.5 py-3 bg-violet-50 border border-violet-100 rounded-2xl">
                    <span className="text-[10px] font-bold text-violet-700 bg-violet-200 px-1.5 py-0.5 rounded-full shrink-0 mt-0.5">{item.priority}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">{item.rec}</p>
                    </div>
                    <Badge variant={item.impact === "High" ? "warning" : "info"} className="shrink-0 text-[9px]">{item.impact}</Badge>
                  </div>
                ))}
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* ─── COHORT COMPARISON ─── */}
      {activeView === "cohorts" && (
        <div className="space-y-5">
          <div className="flex items-center gap-3 p-4 bg-sky-50 border border-sky-200 rounded-2xl">
            <Users className="w-5 h-5 text-sky-600 shrink-0" />
            <div>
              <p className="text-sm font-bold text-sky-800">Population Cohort Analysis — AI Treatment Group vs. Standard Care</p>
              <p className="text-xs text-sky-600 mt-0.5">Comparing health outcomes across AI-managed cohort (n=12,480) vs. standard care cohort (n=11,200)</p>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-5">
            <Card className="col-span-5">
              <CardHeader>
                <div className="flex items-center gap-2"><Microscope className="w-4 h-4 text-primary" /><CardTitle>Condition Burden Comparison</CardTitle></div>
                <span className="text-[10px] text-muted-foreground ml-auto">% prevalence</span>
              </CardHeader>
              <CardBody>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={COHORT_RADAR}>
                      <PolarGrid stroke="#E2E8F0" />
                      <PolarAngleAxis dataKey="metric" tick={{ fill: "#374151", fontSize: 11 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 80]} tick={{ fill: "#94A3B8", fontSize: 9 }} />
                      <Radar name="AI Cohort" dataKey="A" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} strokeWidth={2} />
                      <Radar name="Standard Care" dataKey="B" stroke="#007AFF" fill="#007AFF" fillOpacity={0.15} strokeWidth={2} />
                      <Legend />
                      <RechartsTooltip contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: 12 }} formatter={(v: any, n: string) => [`${v}%`, n]} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardBody>
            </Card>

            <Card className="col-span-7">
              <CardHeader><div className="flex items-center gap-2"><Target className="w-4 h-4 text-emerald-600" /><CardTitle>Outcome Metrics — AI vs. Standard Care</CardTitle></div></CardHeader>
              <CardBody className="space-y-4">
                {[
                  { metric: "HbA1c Control (<7.0%)", ai: 68, std: 41, unit: "%" },
                  { metric: "BP Control (<130/80)", ai: 72, std: 48, unit: "%" },
                  { metric: "30-day Readmission Rate", ai: 8, std: 19, unit: "%", lower_is_better: true },
                  { metric: "Medication Adherence", ai: 84, std: 56, unit: "%" },
                  { metric: "Emergency Visits (per 100)", ai: 12, std: 31, unit: "cases", lower_is_better: true },
                  { metric: "Screening Compliance", ai: 91, std: 63, unit: "%" },
                ].map((item, i) => {
                  const aiWins = item.lower_is_better ? item.ai < item.std : item.ai > item.std;
                  const diff = item.lower_is_better ? item.std - item.ai : item.ai - item.std;
                  return (
                    <div key={i} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-foreground">{item.metric}</p>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          AI: +{diff}{item.unit} better
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] w-24 text-red-600 font-semibold">AI Cohort</span>
                          <div className="flex-1 bg-secondary rounded-full h-2">
                            <div className="h-full rounded-full bg-red-500 transition-all" style={{ width: `${item.ai}%` }} />
                          </div>
                          <span className="text-[10px] font-bold w-10 text-right text-foreground">{item.ai}{item.unit}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] w-24 text-blue-600 font-semibold">Standard Care</span>
                          <div className="flex-1 bg-secondary rounded-full h-2">
                            <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${item.std}%` }} />
                          </div>
                          <span className="text-[10px] font-bold w-10 text-right text-foreground">{item.std}{item.unit}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardBody>
            </Card>

            <Card className="col-span-12">
              <CardHeader>
                <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-teal-600" /><CardTitle>Research Data Export</CardTitle></div>
                <Badge variant="success">PDPL Compliant</Badge>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { title: "Full Anonymized Dataset", desc: `${data?.totalAnonymizedRecords?.toLocaleString()} records · All conditions · Risk scores`, format: "JSON", size: "~2.4 MB", onclick: () => handleExport("json") },
                    { title: "Population Summary CSV", desc: "Age groups · Gender breakdown · Condition prevalence · Risk distribution", format: "CSV", size: "~180 KB", onclick: () => handleExport("csv") },
                    { title: "Research API Access", desc: "RESTful API for approved research institutions · OAuth 2.0 · Rate limited", format: "API", size: "Real-time", onclick: () => {} },
                  ].map((item, i) => (
                    <div key={i} className="p-4 bg-secondary border border-border rounded-2xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Database className="w-4 h-4 text-teal-600" />
                        <p className="text-sm font-bold text-foreground">{item.title}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{item.desc}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">{item.format}</span>
                          <span className="text-[10px] text-muted-foreground">{item.size}</span>
                        </div>
                        <button
                          onClick={item.onclick}
                          className="flex items-center gap-1.5 text-[11px] font-semibold text-teal-700 hover:text-teal-800 transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          Export
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </Layout>
  );
}
