import React, { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardHeader, CardTitle, CardBody, Badge, PageHeader, KpiCard } from "@/components/shared";
import { FlaskConical, Brain, Activity, TrendingUp, Users, Lightbulb, Lock, BarChart2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, ScatterChart, Scatter } from "recharts";

async function fetchResearchInsights() {
  const res = await fetch("/api/research/insights");
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

const TREND_CONFIG = {
  rising: { color: "text-red-600", bg: "bg-red-50", border: "border-red-100", label: "Rising ↑" },
  stable: { color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", label: "Stable →" },
  declining: { color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100", label: "Declining ↓" },
};

export default function ResearchPortal() {
  const [activeView, setActiveView] = useState<"conditions" | "labs" | "drugs" | "age">("conditions");
  const { data, isLoading } = useQuery({ queryKey: ["research-insights"], queryFn: fetchResearchInsights });

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

  return (
    <Layout role="research">
      <div className="flex items-center gap-2 mb-5">
        <div className="flex items-center gap-2 bg-teal-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-full uppercase tracking-widest">
          <FlaskConical className="w-3 h-3" />
          Research Portal
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full ml-auto">
          <Lock className="w-3 h-3" />
          All data anonymized · GDPR-compliant
        </div>
      </div>

      <PageHeader title="Clinical Research & Population Analytics" subtitle="Anonymized population-level health data, disease patterns, AI-detected clinical findings, and drug utilization insights." />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard title="Anonymized Records" value={data?.totalAnonymizedRecords?.toLocaleString()} sub="Fully de-identified" icon={Users} iconBg="bg-teal-100" iconColor="text-teal-600" />
        <KpiCard title="Lab Results Analyzed" value={data?.totalLabResults?.toLocaleString()} sub="Cross-patient trends" icon={FlaskConical} iconBg="bg-violet-100" iconColor="text-violet-600" />
        <KpiCard title="Clinical Visits" value={data?.totalVisits?.toLocaleString()} sub="Longitudinal data" icon={Activity} iconBg="bg-primary/10" iconColor="text-primary" />
        <KpiCard title="AI Decisions Analyzed" value={data?.aiMetrics?.totalDecisions?.toLocaleString()} sub={`${data?.aiMetrics?.avgConfidence}% avg confidence`} icon={Brain} iconBg="bg-amber-100" iconColor="text-amber-600" />
      </div>

      {/* Clinical Findings */}
      <Card className="mb-5">
        <CardHeader>
          <div className="flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-500" /><CardTitle>AI Clinical Findings</CardTitle></div>
          <Badge variant="warning">{data?.clinicalFindings?.length} insights</Badge>
        </CardHeader>
        <CardBody className="space-y-3">
          {data?.clinicalFindings?.map((f: any, i: number) => (
            <div key={i} className={`flex items-start gap-3 px-4 py-3.5 rounded-2xl border ${f.significance === "high" ? "bg-amber-50 border-amber-200" : "bg-sky-50 border-sky-200"}`}>
              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${f.significance === "high" ? "bg-amber-500" : "bg-sky-500"}`} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{f.finding}</p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5"><TrendingUp className="w-3 h-3" />{f.recommendation}</p>
              </div>
              <Badge variant={f.significance === "high" ? "warning" : "info"} className="shrink-0">{f.significance}</Badge>
            </div>
          ))}
        </CardBody>
      </Card>

      {/* View Selector */}
      <div className="flex items-center gap-2 mb-4">
        {[
          { id: "conditions", label: "Disease Prevalence" },
          { id: "labs", label: "Lab Abnormality Rates" },
          { id: "drugs", label: "Drug Utilization" },
          { id: "age", label: "Age × Risk" },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveView(tab.id as any)} className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${activeView === tab.id ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-5">
        {activeView === "conditions" && (
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
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{c.condition}</p>
                        <p className="text-xs text-muted-foreground">{c.patientCount} patients · Avg risk: {c.avgRiskScore}</p>
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

        {activeView === "labs" && (
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
                    <Bar dataKey="abnormalRate" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={28} name="Abnormal Rate" />
                    <Bar dataKey="criticalRate" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={28} name="Critical Rate" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>
        )}

        {activeView === "drugs" && (
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

        {activeView === "age" && (
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
    </Layout>
  );
}
