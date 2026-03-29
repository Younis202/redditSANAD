import React, { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardHeader, CardTitle, CardBody, Input, Button, Badge, PageHeader, KpiCard, DataLabel } from "@/components/shared";
import {
  Shield, Search, AlertTriangle, CheckCircle2, TrendingUp, DollarSign, Users, Brain,
  ShieldAlert, Zap, X, Clock, BarChart2, Activity, ChevronRight, FileCheck,
  RefreshCw, TrendingDown, Eye, MessageSquare
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart, Legend
} from "recharts";

async function fetchInsurancePatient(nationalId: string) {
  const res = await fetch(`/api/insurance/patient/${nationalId}`);
  if (!res.ok) throw new Error("Patient not found");
  return res.json();
}
async function fetchInsuranceDashboard() {
  const res = await fetch("/api/insurance/dashboard");
  if (!res.ok) throw new Error("Failed");
  return res.json();
}
async function reviewClaim(claimId: string, action: string, notes: string) {
  const res = await fetch(`/api/insurance/claim/${claimId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, notes, reviewedBy: "Senior Insurance Analyst — Nasser Al-Dossari" }),
  });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; badge: any; label: string }> = {
  approved: { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", badge: "success" as const, label: "Approved" },
  pending: { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", badge: "warning" as const, label: "Pending" },
  under_review: { color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", badge: "info" as const, label: "Under Review" },
  rejected: { color: "text-red-700", bg: "bg-red-50", border: "border-red-200", badge: "destructive" as const, label: "Rejected" },
};
const PORTFOLIO_COLORS = ["#22c55e", "#f59e0b", "#ef4444", "#7c3aed"];
type TabId = "dashboard" | "patient" | "portfolio";

function AnomalyGauge({ score }: { score: number }) {
  const color = score >= 60 ? "#ef4444" : score >= 30 ? "#f59e0b" : "#22c55e";
  const label = score >= 60 ? "HIGH RISK" : score >= 30 ? "MODERATE" : "LOW RISK";
  const sweepAngle = (score / 100) * 180;
  const r = 54;
  const cx = 70;
  const cy = 70;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const startAngle = 180;
  const endAngle = startAngle + sweepAngle;
  const x1 = cx + r * Math.cos(toRad(startAngle));
  const y1 = cy + r * Math.sin(toRad(startAngle));
  const x2 = cx + r * Math.cos(toRad(endAngle));
  const y2 = cy + r * Math.sin(toRad(endAngle));
  const largeArc = sweepAngle > 180 ? 1 : 0;

  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="80" viewBox="0 0 140 80">
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#e2e8f0" strokeWidth="10" strokeLinecap="round" />
        {score > 0 && (
          <path d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />
        )}
        <text x={cx} y={cy - 4} textAnchor="middle" fill={color} fontSize="20" fontWeight="bold">{score}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="#64748b" fontSize="8" fontWeight="600">{label}</text>
      </svg>
      <p className="text-[10px] text-muted-foreground font-semibold -mt-1">Neural Fraud Score</p>
    </div>
  );
}

export default function InsurancePortal() {
  const [searchId, setSearchId] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [reviewingClaim, setReviewingClaim] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewResults, setReviewResults] = useState<Record<string, any>>({});
  const [expandedClaim, setExpandedClaim] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: dashboard, isLoading: loadingDash } = useQuery({ queryKey: ["insurance-dashboard"], queryFn: fetchInsuranceDashboard });
  const { data: patient, isLoading: loadingPatient, isError: patientError } = useQuery({
    queryKey: ["insurance-patient", nationalId],
    queryFn: () => fetchInsurancePatient(nationalId),
    enabled: !!nationalId,
    retry: false,
  });

  const reviewMutation = useMutation({
    mutationFn: ({ claimId, action }: { claimId: string; action: string }) => reviewClaim(claimId, action, reviewNotes),
    onSuccess: (result, { claimId }) => {
      setReviewResults(prev => ({ ...prev, [claimId]: result }));
      setReviewingClaim(null);
      setReviewNotes("");
      qc.invalidateQueries({ queryKey: ["insurance-patient", nationalId] });
    },
  });

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard", label: "Operations Dashboard", icon: <BarChart2 className="w-3.5 h-3.5" /> },
    { id: "patient", label: "Policy Lookup", icon: <Search className="w-3.5 h-3.5" /> },
    { id: "portfolio", label: "Portfolio Risk", icon: <Activity className="w-3.5 h-3.5" /> },
  ];

  return (
    <Layout role="insurance">
      <div className="flex items-center gap-2 mb-5">
        <div className="flex items-center gap-2 bg-violet-600 text-white text-xs font-bold px-3.5 py-1.5 rounded-full uppercase tracking-widest">
          <Shield className="w-3 h-3" /> Insurance Operations Center
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
          AI Fraud Engine: Active · {dashboard?.fraudSuspected ?? "—"} cases flagged
        </div>
        <div className="ml-auto flex gap-1.5">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full transition-all ${activeTab === t.id ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── DASHBOARD TAB ─── */}
      {activeTab === "dashboard" && (
        <div className="space-y-5">
          <PageHeader title="Insurance Portal" subtitle="National health insurance operations, AI fraud detection, risk-based pricing, and portfolio analytics." />

          {loadingDash ? (
            <div className="flex items-center gap-3 py-16 justify-center text-muted-foreground">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-violet-600" />
              <span className="text-sm">Loading insurance operations...</span>
            </div>
          ) : dashboard && (
            <>
              <div className="grid grid-cols-4 gap-4">
                <KpiCard title="Active Policies" value={dashboard.totalPolicies?.toLocaleString()} sub="National coverage" icon={Users} iconBg="bg-violet-100" iconColor="text-violet-600" />
                <KpiCard title="Total Claims" value={dashboard.totalClaims?.toLocaleString()} sub={`${dashboard.pendingClaims} awaiting review`} icon={Shield} iconBg="bg-primary/10" iconColor="text-primary" />
                <KpiCard title="Total Payout" value={`SAR ${(dashboard.totalPayout / 1000).toFixed(0)}K`} sub={`Avg SAR ${dashboard.avgClaimValue?.toLocaleString()} per claim`} icon={DollarSign} iconBg="bg-emerald-100" iconColor="text-emerald-600" />
                <KpiCard title="Fraud Flagged" value={dashboard.fraudSuspected} sub={`${dashboard.fraudRate}% fraud rate`} icon={ShieldAlert} iconBg="bg-red-100" iconColor="text-red-600" />
              </div>

              <div className="grid grid-cols-12 gap-5">
                {/* Claims Trend */}
                <Card className="col-span-8">
                  <CardHeader>
                    <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /><CardTitle>Claims & Fraud Trend — 2025</CardTitle></div>
                    <Badge variant="outline">{dashboard.approvalRate}% approval rate</Badge>
                  </CardHeader>
                  <CardBody>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dashboard.trendData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                          <defs>
                            <linearGradient id="gClaims" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#007AFF" stopOpacity={0.15} />
                              <stop offset="95%" stopColor="#007AFF" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="gFraud" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11 }} />
                          <RechartsTooltip contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: 12 }} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Area type="monotone" dataKey="claims" name="Claims" stroke="#007AFF" fill="url(#gClaims)" strokeWidth={2} dot={false} />
                          <Area type="monotone" dataKey="fraud" name="Fraud" stroke="#ef4444" fill="url(#gFraud)" strokeWidth={2} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardBody>
                </Card>

                {/* Fraud Alerts Panel */}
                <Card className="col-span-4">
                  <CardHeader>
                    <div className="flex items-center gap-2"><Brain className="w-4 h-4 text-red-500" /><CardTitle>AI Fraud Intelligence</CardTitle></div>
                    <Badge variant="destructive">{dashboard.fraudSuspected} active</Badge>
                  </CardHeader>
                  <CardBody className="space-y-2.5">
                    {dashboard.fraudAlerts?.map((alert: any, i: number) => (
                      <div key={i} className={`p-3.5 rounded-2xl border ${alert.severity === "high" ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-100"}`}>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <ShieldAlert className={`w-3.5 h-3.5 shrink-0 ${alert.severity === "high" ? "text-red-500" : "text-amber-500"}`} />
                            <p className="text-xs font-bold text-foreground">{alert.type}</p>
                          </div>
                          <Badge variant={alert.severity === "high" ? "destructive" : "warning"} className="text-[9px] shrink-0">{alert.count} cases</Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{alert.description}</p>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-border">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5"><Zap className="w-3 h-3 text-amber-500" /> Regional Pricing Alerts</p>
                      {dashboard.riskPricingAlerts?.map((a: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 py-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${a.trend === "rising" ? "bg-red-500" : a.trend === "declining" ? "bg-emerald-500" : "bg-amber-500"}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-foreground truncate">{a.region}</p>
                              <span className={`text-[10px] font-bold shrink-0 ml-2 ${a.trend === "rising" ? "text-red-600" : "text-emerald-600"}`}>{a.change}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate">{a.action}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardBody>
                </Card>
              </div>

              {/* Claims by Type */}
              <div className="grid grid-cols-12 gap-5">
                <Card className="col-span-5">
                  <CardHeader>
                    <div className="flex items-center gap-2"><BarChart2 className="w-4 h-4 text-primary" /><CardTitle>Claims by Type</CardTitle></div>
                  </CardHeader>
                  <CardBody>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dashboard.claimsByType} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis dataKey="type" axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11 }} />
                          <RechartsTooltip contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: 12 }} />
                          <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={48} name="Claims">
                            {dashboard.claimsByType.map((entry: any, i: number) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardBody>
                </Card>

                <Card className="col-span-4">
                  <CardHeader>
                    <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /><CardTitle>Claim Status</CardTitle></div>
                  </CardHeader>
                  <CardBody className="flex items-center justify-center">
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={[
                            { name: "Approved", value: dashboard.approvedClaims },
                            { name: "Pending", value: dashboard.pendingClaims },
                            { name: "Rejected", value: dashboard.rejectedClaims },
                            { name: "Fraud", value: dashboard.fraudSuspected },
                          ]} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                            {["#22c55e", "#f59e0b", "#ef4444", "#7c3aed"].map((color, i) => <Cell key={i} fill={color} />)}
                          </Pie>
                          <RechartsTooltip contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: 12 }} />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardBody>
                </Card>

                <Card className="col-span-3">
                  <CardHeader>
                    <div className="flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /><CardTitle>Quick Stats</CardTitle></div>
                  </CardHeader>
                  <CardBody className="space-y-3">
                    {[
                      { label: "Approval Rate", value: `${dashboard.approvalRate}%`, color: "text-emerald-600" },
                      { label: "Fraud Rate", value: `${dashboard.fraudRate}%`, color: "text-red-600" },
                      { label: "High-Risk Policies", value: dashboard.highRiskPolicies, color: "text-amber-600" },
                      { label: "Critical Policies", value: dashboard.criticalPolicies, color: "text-red-600" },
                      { label: "Avg Claim Value", value: `SAR ${dashboard.avgClaimValue?.toLocaleString()}`, color: "text-primary" },
                    ].map((s, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                        <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                      </div>
                    ))}
                  </CardBody>
                </Card>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── PATIENT LOOKUP TAB ─── */}
      {activeTab === "patient" && (
        <div className="space-y-5">
          <div className="flex items-start justify-between mb-2">
            <PageHeader title="Policy Lookup & Fraud Analysis" subtitle="AI-powered per-patient fraud scoring, anomaly detection, and claim review workflow." />
            <form onSubmit={(e) => { e.preventDefault(); if (searchId.trim()) setNationalId(searchId.trim()); }} className="flex items-center gap-2 shrink-0 ml-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input placeholder="National ID..." className="pl-9 w-52" value={searchId} onChange={(e) => setSearchId(e.target.value)} />
              </div>
              <Button type="submit" size="md">Lookup Policy</Button>
            </form>
          </div>

          {!nationalId && (
            <Card>
              <CardBody className="py-16 text-center">
                <div className="w-16 h-16 rounded-3xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-7 h-7 text-violet-500" />
                </div>
                <p className="font-bold text-foreground mb-1">No Policy Selected</p>
                <p className="text-sm text-muted-foreground mb-2">Enter a National ID to load full fraud analysis and claim review tools.</p>
                <p className="text-xs text-muted-foreground font-mono bg-secondary inline-block px-3 py-1.5 rounded-xl">Demo: 1000000001 · 1000000003 · 1000000005</p>
              </CardBody>
            </Card>
          )}

          {loadingPatient && (
            <div className="flex items-center gap-3 py-16 justify-center text-muted-foreground">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-violet-600" />
              <span className="text-sm">Loading policy data...</span>
            </div>
          )}
          {patientError && nationalId && (
            <Card className="border-red-200 bg-red-50">
              <CardBody className="flex items-center gap-3 p-4">
                <X className="w-4 h-4 text-red-500" />
                <p className="text-sm text-red-700">No policy found for <span className="font-mono">{nationalId}</span></p>
              </CardBody>
            </Card>
          )}

          {patient && (
            <div className="space-y-4">
              {/* Policy Header */}
              <Card>
                <CardBody className="p-0">
                  <div className="flex items-stretch divide-x divide-border">
                    <div className="flex-1 p-5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Policy Holder</p>
                      <h2 className="text-xl font-bold text-foreground mb-1">{patient.patient?.fullName}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-xs bg-secondary px-2.5 py-1 rounded-xl">{patient.patient?.nationalId}</span>
                        <span className="text-xs text-muted-foreground">Age {patient.patient?.age} · {patient.patient?.gender}</span>
                        <span className="text-xs font-bold text-red-600">{patient.patient?.bloodType}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="success">Active Policy</Badge>
                        <span className="text-xs font-semibold text-muted-foreground">{patient.insurancePlan}</span>
                      </div>
                    </div>
                    <div className="px-4 py-3 flex items-center justify-center">
                      <AnomalyGauge score={patient.anomalyScore ?? 0} />
                    </div>
                    <div className={`px-6 py-4 flex flex-col items-center justify-center min-w-[130px] ${patient.fraudRisk === "high" ? "bg-red-50" : patient.fraudRisk === "medium" ? "bg-amber-50" : "bg-emerald-50/50"}`}>
                      <DataLabel label="Fraud Risk">
                        <p className={`text-2xl font-bold ${patient.fraudRisk === "high" ? "text-red-600" : patient.fraudRisk === "medium" ? "text-amber-600" : "text-emerald-600"}`}>{patient.fraudRisk?.toUpperCase()}</p>
                      </DataLabel>
                    </div>
                    <div className="px-6 py-4 flex flex-col items-center justify-center min-w-[150px] bg-violet-50">
                      <DataLabel label="Monthly Premium">
                        <p className="text-2xl font-bold text-violet-700">SAR {patient.monthlyPremium?.toLocaleString()}</p>
                      </DataLabel>
                      <p className="text-xs text-muted-foreground mt-1">{patient.riskMultiplier}× risk factor</p>
                    </div>
                    <div className="px-6 py-4 flex flex-col items-center justify-center min-w-[120px]">
                      <DataLabel label="Total Claims">
                        <p className="text-2xl font-bold text-foreground">{patient.totalClaims}</p>
                      </DataLabel>
                      <p className="text-xs text-muted-foreground mt-1">SAR {patient.totalClaimValue?.toLocaleString()}</p>
                    </div>
                  </div>
                </CardBody>
              </Card>

              <div className="grid grid-cols-12 gap-4">
                {/* Anomaly Breakdown */}
                <Card className="col-span-5">
                  <CardHeader>
                    <div className="flex items-center gap-2"><Brain className="w-4 h-4 text-violet-600" /><CardTitle>Neural Fraud Analysis</CardTitle></div>
                    <Badge variant={patient.anomalyScore >= 50 ? "destructive" : patient.anomalyScore >= 25 ? "warning" : "success"}>
                      Score: {patient.anomalyScore}/100
                    </Badge>
                  </CardHeader>
                  <CardBody className="space-y-2.5">
                    {patient.anomalyFactors?.map((factor: any, i: number) => (
                      <div key={i} className={`p-3 rounded-2xl border ${factor.flag ? "bg-red-50 border-red-200" : "bg-secondary border-transparent"}`}>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className={`text-xs font-bold ${factor.flag ? "text-red-700" : "text-foreground"}`}>{factor.label}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${factor.flag ? "bg-red-100 text-red-700" : "bg-secondary text-muted-foreground"}`}>+{factor.weight}pts</span>
                        </div>
                        <p className={`text-[11px] ${factor.flag ? "text-red-600" : "text-muted-foreground"}`}>{factor.value}</p>
                        <div className="mt-1.5 h-1 bg-white rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${factor.flag ? "bg-red-500" : "bg-emerald-400"}`} style={{ width: `${Math.min(100, factor.weight * 4)}%` }} />
                        </div>
                      </div>
                    ))}
                  </CardBody>
                </Card>

                {/* Behavioral Profile + Premium Breakdown */}
                <div className="col-span-7 space-y-4">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2"><Eye className="w-4 h-4 text-primary" /><CardTitle>Behavioral Profile</CardTitle></div>
                    </CardHeader>
                    <CardBody>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: "Visit Pattern", value: patient.behaviorProfile?.visitPattern },
                          { label: "Preferred Hospital", value: patient.behaviorProfile?.preferredHospital },
                          { label: "Avg Claim Interval", value: `${patient.behaviorProfile?.avgClaimInterval} days` },
                          { label: "Claim Consistency", value: patient.behaviorProfile?.claimConsistency },
                        ].map((item, i) => (
                          <div key={i} className="bg-secondary rounded-2xl px-4 py-3">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{item.label}</p>
                            <p className="text-sm font-bold text-foreground">{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </CardBody>
                  </Card>

                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-violet-600" /><CardTitle>Premium Breakdown</CardTitle></div>
                      <p className="text-sm font-bold text-violet-700 ml-auto">SAR {patient.monthlyPremium}/mo</p>
                    </CardHeader>
                    <CardBody>
                      <div className="h-36">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={patient.premiumBreakdown} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }}>
                            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 10 }} />
                            <YAxis type="category" dataKey="factor" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} width={160} />
                            <RechartsTooltip contentStyle={{ borderRadius: "10px", fontSize: 11 }} formatter={(v: any) => [`SAR ${v}`, "Amount"]} />
                            <Bar dataKey="amount" radius={[0, 6, 6, 0]} barSize={14}>
                              {patient.premiumBreakdown?.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardBody>
                  </Card>
                </div>
              </div>

              {/* Fraud Flags */}
              {patient.fraudFlags?.length > 0 && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border-2 border-amber-300 rounded-3xl">
                  <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-800 mb-2">AI Fraud Detection Flags ({patient.fraudFlags.length})</p>
                    <div className="grid grid-cols-2 gap-2">
                      {patient.fraudFlags.map((flag: string, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-amber-700">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />{flag}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Claims Table with Review Workflow */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /><CardTitle>Claims — AI Review Workflow</CardTitle></div>
                  <Badge variant="default">{patient.totalClaims} claims</Badge>
                </CardHeader>
                <CardBody className="p-0">
                  <div className="divide-y divide-border">
                    {patient.claims?.map((claim: any) => {
                      const cfg = STATUS_CONFIG[reviewResults[claim.claimId]?.newStatus ?? claim.status] ?? STATUS_CONFIG["pending"]!;
                      const isReviewing = reviewingClaim === claim.claimId;
                      const reviewResult = reviewResults[claim.claimId];
                      const effectiveStatus = reviewResult?.newStatus ?? claim.status;
                      const canReview = effectiveStatus === "pending" || effectiveStatus === "under_review";

                      return (
                        <div key={claim.claimId} className={`transition-colors ${isReviewing ? "bg-violet-50/50" : "hover:bg-secondary/20"}`}>
                          <div className="flex items-center gap-4 px-5 py-3.5">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-mono text-xs text-muted-foreground">{claim.claimId}</span>
                                <Badge variant={claim.type === "Emergency" ? "destructive" : claim.type === "Inpatient" ? "warning" : "outline"} className="text-[10px]">{claim.type}</Badge>
                                {(reviewResult?.newStatus ?? claim.aiVerified) && (
                                  <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                                    <CheckCircle2 className="w-3 h-3" />AI Verified
                                  </span>
                                )}
                                {claim.anomalyScore > 0 && (
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${claim.anomalyScore >= 30 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                                    Anomaly: {claim.anomalyScore}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm font-semibold text-foreground">{claim.diagnosis}</p>
                              <p className="text-xs text-muted-foreground">{claim.hospital} · {claim.date}</p>
                            </div>
                            <div className="text-right shrink-0 mr-2">
                              <p className="text-base font-bold text-foreground">SAR {claim.estimatedCost?.toLocaleString()}</p>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border}`}>{cfg.label}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {canReview && !isReviewing && (
                                <button onClick={() => setExpandedClaim(expandedClaim === claim.claimId ? null : claim.claimId)}
                                  className="text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-xl hover:bg-primary/20 transition-colors flex items-center gap-1">
                                  <FileCheck className="w-3 h-3" /> Review
                                </button>
                              )}
                              {claim.anomalyReasons?.length > 0 && (
                                <button onClick={() => setExpandedClaim(expandedClaim === claim.claimId ? null : claim.claimId)}
                                  className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-xl hover:bg-amber-200 transition-colors flex items-center gap-1">
                                  <Eye className="w-3 h-3" /> Details
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Expanded Panel */}
                          {expandedClaim === claim.claimId && (
                            <div className="mx-5 mb-4 p-4 bg-white border border-border rounded-2xl space-y-3">
                              {claim.anomalyReasons?.length > 0 && (
                                <div>
                                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                    <AlertTriangle className="w-3 h-3 text-amber-500" /> Anomaly Reasons
                                  </p>
                                  {claim.anomalyReasons.map((r: string, i: number) => (
                                    <div key={i} className="flex items-center gap-2 text-xs text-amber-700 mb-1">
                                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />{r}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {reviewResult && (
                                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                                  <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-1">Review Complete</p>
                                  <p className="text-xs text-foreground">{reviewResult.aiReason}</p>
                                  <p className="text-[10px] text-muted-foreground mt-1">By {reviewResult.reviewedBy} · {new Date(reviewResult.reviewedAt).toLocaleString()}</p>
                                </div>
                              )}
                              {canReview && (
                                <div>
                                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                    <MessageSquare className="w-3 h-3" /> Review Notes (optional)
                                  </p>
                                  <Input placeholder="Add review notes..." value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} className="mb-3 text-xs" />
                                  <div className="flex gap-2">
                                    <button onClick={() => reviewMutation.mutate({ claimId: claim.claimId, action: "approve" })}
                                      disabled={reviewMutation.isPending}
                                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50">
                                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                                    </button>
                                    <button onClick={() => reviewMutation.mutate({ claimId: claim.claimId, action: "flag" })}
                                      disabled={reviewMutation.isPending}
                                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50">
                                      <Clock className="w-3.5 h-3.5" /> Flag for Review
                                    </button>
                                    <button onClick={() => reviewMutation.mutate({ claimId: claim.claimId, action: "reject" })}
                                      disabled={reviewMutation.isPending}
                                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50">
                                      <X className="w-3.5 h-3.5" /> Reject
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardBody>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ─── PORTFOLIO RISK TAB ─── */}
      {activeTab === "portfolio" && (
        <div className="space-y-5">
          <PageHeader title="Portfolio Risk Intelligence" subtitle="National insurance portfolio risk distribution, pricing bands, and actuarial overview." />
          {dashboard && (
            <>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: "Low Risk", value: dashboard.portfolioRisk?.low, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
                  { label: "Medium Risk", value: dashboard.portfolioRisk?.medium, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
                  { label: "High Risk", value: dashboard.portfolioRisk?.high, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
                  { label: "Critical Risk", value: dashboard.portfolioRisk?.critical, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
                ].map((band, i) => (
                  <div key={i} className={`p-5 rounded-3xl border ${band.bg} ${band.border}`}>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{band.label}</p>
                    <p className={`text-4xl font-bold ${band.color}`}>{band.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">policyholders</p>
                    <div className="mt-3 h-1.5 bg-white/60 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${band.bg.replace("50", "500")}`} style={{ width: `${Math.round((band.value / dashboard.totalPolicies) * 100)}%` }} />
                    </div>
                    <p className="text-[10px] font-semibold text-muted-foreground mt-1">{Math.round((band.value / dashboard.totalPolicies) * 100)}% of portfolio</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-12 gap-5">
                <Card className="col-span-6">
                  <CardHeader>
                    <div className="flex items-center gap-2"><PieChart className="w-4 h-4 text-primary" /><CardTitle>Portfolio Risk Distribution</CardTitle></div>
                  </CardHeader>
                  <CardBody>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={[
                            { name: "Low Risk", value: dashboard.portfolioRisk?.low },
                            { name: "Medium Risk", value: dashboard.portfolioRisk?.medium },
                            { name: "High Risk", value: dashboard.portfolioRisk?.high },
                            { name: "Critical", value: dashboard.portfolioRisk?.critical },
                          ]} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                            {PORTFOLIO_COLORS.map((color, i) => <Cell key={i} fill={color} />)}
                          </Pie>
                          <RechartsTooltip contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: 12 }} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardBody>
                </Card>

                <Card className="col-span-6">
                  <CardHeader>
                    <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /><CardTitle>Regional Risk Pricing</CardTitle></div>
                  </CardHeader>
                  <CardBody>
                    <div className="space-y-4">
                      {dashboard.riskPricingAlerts?.map((a: any, i: number) => (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              {a.trend === "rising" ? <TrendingUp className="w-3.5 h-3.5 text-red-500" /> : a.trend === "declining" ? <TrendingDown className="w-3.5 h-3.5 text-emerald-500" /> : <Activity className="w-3.5 h-3.5 text-amber-500" />}
                              <p className="text-sm font-semibold text-foreground">{a.region}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Risk: {a.avgRisk}</span>
                              <span className={`text-xs font-bold ${a.trend === "rising" ? "text-red-600" : "text-emerald-600"}`}>{a.change}</span>
                            </div>
                          </div>
                          <div className="h-2 bg-secondary rounded-full overflow-hidden mb-1">
                            <div className={`h-full rounded-full transition-all ${a.trend === "rising" ? "bg-red-500" : a.trend === "declining" ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${a.avgRisk}%` }} />
                          </div>
                          <p className="text-[10px] text-muted-foreground">{a.action}</p>
                        </div>
                      ))}
                    </div>
                  </CardBody>
                </Card>
              </div>
            </>
          )}
        </div>
      )}
    </Layout>
  );
}
