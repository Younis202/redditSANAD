import React, { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardHeader, CardTitle, CardBody, Input, Button, Badge, PageHeader, KpiCard, DataLabel, PortalHero } from "@/components/shared";
import {
  Shield, Search, AlertTriangle, CheckCircle2, TrendingUp, DollarSign, Users, Brain,
  ShieldAlert, Zap, X, Clock, BarChart2, Activity, ChevronRight, FileCheck,
  RefreshCw, TrendingDown, Eye, MessageSquare, Bell
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSseAlerts } from "@/hooks/use-sse-alerts";
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
type TabId = "dashboard" | "patient" | "portfolio" | "preauth";

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
  const [showSsePanel, setShowSsePanel] = useState(false);
  const { alerts: sseAlerts, unreadCount: sseUnread, markRead: markSseRead, clearAll: clearSseAlerts } = useSseAlerts("insurance");
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
    { id: "preauth", label: "AI Pre-Authorization", icon: <FileCheck className="w-3.5 h-3.5" /> },
  ];

  return (
    <Layout role="insurance">
      <div className="flex items-center gap-2 mb-5">
        <div className="flex items-center gap-2 bg-secondary text-foreground text-xs font-bold px-3.5 py-1.5 rounded-full uppercase tracking-widest">
          <Shield className="w-3 h-3" /> Insurance Operations Center
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
          AI Fraud Engine: Active · {dashboard?.fraudSuspected ?? "—"} cases flagged
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowSsePanel(p => !p)}
              className="relative flex items-center justify-center w-10 h-10 rounded-full transition-colors bg-secondary hover:bg-border"
            >
              <Bell className={`w-4 h-4 ${sseUnread > 0 ? "text-foreground" : "text-muted-foreground"}`} />
              {sseUnread > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-foreground text-background text-[9px] font-bold flex items-center justify-center">
                  {sseUnread > 9 ? "9+" : sseUnread}
                </span>
              )}
            </button>
          </div>
          <div className="flex gap-1.5">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full transition-all ${activeTab === t.id ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SSE Fraud Alert Panel */}
      {showSsePanel && sseAlerts.length > 0 && (
        <Card className="mb-5 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-secondary/60 rounded-t-[2rem]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-foreground animate-pulse" />
              <span className="font-bold text-sm text-foreground">Live Risk & Fraud Alerts</span>
              <Badge variant="info" className="text-[10px]">{sseUnread} new</Badge>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={clearSseAlerts} className="text-[11px] text-muted-foreground hover:text-foreground font-medium">Clear all</button>
              <button onClick={() => setShowSsePanel(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="divide-y divide-border max-h-56 overflow-y-auto">
            {sseAlerts.map(alert => (
              <div key={alert.id} className={`px-4 py-3 flex items-start gap-3 ${alert.read ? "opacity-50" : ""}`}>
                <ShieldAlert className={`mt-0.5 w-4 h-4 shrink-0 ${alert.severity === "critical" ? "text-red-500" : "text-amber-500"}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-foreground">{alert.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Patient: {alert.patientName} · ID: {alert.nationalId}</p>
                  {alert.recommendation && <p className="text-xs text-muted-foreground mt-0.5">{alert.recommendation}</p>}
                  <p className="text-[10px] text-muted-foreground/60 mt-1">{new Date(alert.timestamp).toLocaleTimeString()}</p>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => { setSearchId(alert.nationalId ?? ""); setNationalId(alert.nationalId ?? ""); setActiveTab("patient"); markSseRead(alert.id); }}
                    className="text-[10px] font-semibold text-foreground bg-secondary hover:bg-border rounded-lg px-2 py-1 transition-colors"
                  >
                    View Policy
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ─── DASHBOARD TAB ─── */}
      {activeTab === "dashboard" && (
        <div className="space-y-5">
          <PortalHero
            title="Insurance Operations"
            subtitle="National health insurance operations, AI fraud detection, risk-based pricing, and portfolio analytics."
            icon={Shield}
            gradient="linear-gradient(135deg, #0284c7 0%, #0c4a6e 100%)"
            badge="Insurance Ops · MOH / CCHI"
            stats={[
              { label: "Fraud Suspected", value: dashboard?.fraudSuspected ?? "—" },
              { label: "Pending Claims", value: dashboard?.pendingClaims ?? "—" },
              { label: "Total Policies", value: dashboard?.totalPolicies?.toLocaleString() ?? "—" },
            ]}
          />

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
                      <div key={i} className={`p-3.5 rounded-2xl ${alert.severity === "high" ? "bg-red-50" : "bg-amber-50"}`}>
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
          <div className="flex items-center justify-between gap-4 p-5 rounded-[2rem] mb-4" style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(20px)", boxShadow: "0 8px 32px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #0284c7 0%, #0c4a6e 100%)" }}>
                <Search className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black text-foreground" style={{ fontFamily: "'Manrope', sans-serif" }}>Policy Lookup & Fraud Analysis</h2>
                <p className="text-sm text-muted-foreground">AI fraud scoring · Anomaly detection · Claim review workflow</p>
              </div>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); if (searchId.trim()) setNationalId(searchId.trim()); }} className="flex items-center gap-2 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input placeholder="National ID..." className="pl-9 w-56" value={searchId} onChange={(e) => setSearchId(e.target.value)} />
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
            <Card className="bg-red-50">
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
                <CardBody className="p-5">
                  <div className="flex items-start gap-5">
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Policy Holder</p>
                      <h2 className="text-xl font-bold text-foreground mb-1">{patient.patient?.fullName}</h2>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-xs bg-secondary px-2.5 py-1 rounded-xl">{patient.patient?.nationalId}</span>
                        <span className="text-xs text-muted-foreground">Age {patient.patient?.age} · {patient.patient?.gender}</span>
                        <span className="text-xs font-bold text-red-600">{patient.patient?.bloodType}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="success">Active Policy</Badge>
                        <span className="text-xs font-semibold text-muted-foreground">{patient.insurancePlan}</span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <AnomalyGauge score={patient.anomalyScore ?? 0} />
                    </div>
                    <div className="grid grid-cols-3 gap-3 shrink-0">
                      <div className="text-center p-4 rounded-2xl bg-secondary min-w-[110px]">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Fraud Risk</p>
                        <p className={`text-2xl font-bold ${patient.fraudRisk === "high" ? "text-red-600" : patient.fraudRisk === "medium" ? "text-amber-600" : "text-emerald-600"}`}>{patient.fraudRisk?.toUpperCase()}</p>
                      </div>
                      <div className="text-center p-4 rounded-2xl bg-secondary min-w-[130px]">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Monthly Premium</p>
                        <p className="text-xl font-bold text-foreground">SAR {patient.monthlyPremium?.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{patient.riskMultiplier}× risk factor</p>
                      </div>
                      <div className="text-center p-4 rounded-2xl bg-secondary min-w-[110px]">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Claims</p>
                        <p className="text-2xl font-bold text-foreground">{patient.totalClaims}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">SAR {patient.totalClaimValue?.toLocaleString()}</p>
                      </div>
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
                      <div key={i} className={`p-3 rounded-2xl ${factor.flag ? "bg-red-50" : "bg-secondary"}`}>
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
                <Card>
                  <CardBody className="flex items-start gap-4 p-5">
                    <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center shrink-0">
                      <ShieldAlert className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-foreground mb-3">AI Fraud Detection Flags — {patient.fraudFlags.length} detected</p>
                      <div className="grid grid-cols-2 gap-2">
                        {patient.fraudFlags.map((flag: string, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary rounded-xl px-3 py-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />{flag}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardBody>
                </Card>
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
                        <div key={claim.claimId} className={`transition-colors ${isReviewing ? "bg-secondary/50" : "hover:bg-secondary/30"}`}>
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
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
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
                            <div className="mx-5 mb-4 p-4 bg-secondary rounded-2xl space-y-3">
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
                                <div className="p-3 bg-secondary rounded-xl">
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

      {/* ─── AI PRE-AUTHORIZATION ENGINE ─── */}
      {activeTab === "preauth" && (
        <div className="space-y-5">
          <div className="flex items-center gap-5 p-5 rounded-[2rem]" style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(20px)", boxShadow: "0 8px 32px rgba(0,0,0,0.04)" }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #0284c7 0%, #4f46e5 100%)" }}>
              <FileCheck className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-bold text-foreground text-sm">SANAD AI Pre-Authorization Engine v2.1</p>
                <Badge variant="info" className="text-[10px]">Clinical Necessity AI · Live</Badge>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-xs text-muted-foreground mb-2.5">AI-powered real-time clinical necessity scoring. Evaluates medical necessity, guideline alignment, fraud risk, and cost-effectiveness in under 3 seconds. Expected SAR 4.2B savings annually through automated adjudication.</p>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-[10px] font-bold text-foreground bg-secondary px-2.5 py-1 rounded-full">12 Pending</span>
                <span className="text-[10px] font-semibold text-emerald-600 bg-secondary px-2.5 py-1 rounded-full flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />8 Auto-Approved</span>
                <span className="text-[10px] font-semibold text-amber-600 bg-secondary px-2.5 py-1 rounded-full flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />3 Flagged</span>
                <span className="text-[10px] font-semibold text-red-600 bg-secondary px-2.5 py-1 rounded-full flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />1 AI-Denied</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <KpiCard title="Requests Today" value="247" sub="89% auto-adjudicated" icon={FileCheck} iconBg="bg-secondary" iconColor="text-foreground" />
            <KpiCard title="Avg Decision Time" value="2.8s" sub="vs 3-day manual process" icon={Zap} iconBg="bg-secondary" iconColor="text-foreground" />
            <KpiCard title="Auto-Approval Rate" value="72%" sub="Meeting NCCHI guidelines" icon={CheckCircle2} iconBg="bg-secondary" iconColor="text-emerald-600" />
            <KpiCard title="AI SAR Savings YTD" value="SAR 1.1B" sub="Fraud + unnecessary procedures" icon={DollarSign} iconBg="bg-secondary" iconColor="text-foreground" />
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2"><Brain className="w-4 h-4 text-violet-600" /><CardTitle>Pre-Authorization Request Queue — Active</CardTitle></div>
              <Badge variant="warning" className="text-[10px]">12 pending review</Badge>
            </CardHeader>
            <div className="divide-y divide-border">
              {[
                {
                  id: "PA-2025-08841",
                  patient: "Khalid Al-Mansouri",
                  nationalId: "1000000001",
                  age: 52,
                  icd10: "E11.65 · I10",
                  procedure: "Continuous Glucose Monitor (CGM) — FreeStyle Libre 3",
                  hospital: "King Faisal Specialist Hospital",
                  requestedBy: "Dr. Reem Al-Zahrani",
                  necessityScore: 94,
                  guidelineMatch: "ADA Standards of Care 2025 — Grade A",
                  fraudScore: 8,
                  estimatedCost: 4200,
                  annualCostSavings: 18400,
                  aiDecision: "AUTO_APPROVED",
                  reasoning: "Patient has T2DM with HbA1c 8.6%, on insulin therapy. ADA/NICE guidelines strongly recommend CGM for insulin-treated T2DM. Cost-effectiveness analysis: CGM reduces DKA hospitalizations (avg SAR 18,400/episode) at SAR 4,200/year device cost. ROI positive.",
                  alternatives: [],
                },
                {
                  id: "PA-2025-08842",
                  patient: "Fatima Al-Rashidi",
                  nationalId: "1000000003",
                  age: 67,
                  icd10: "N18.4 · E11",
                  procedure: "Erythropoiesis-Stimulating Agent (ESA) — Darbepoetin Alfa 60mcg",
                  hospital: "King Abdulaziz Medical City",
                  requestedBy: "Dr. Faisal Al-Harbi",
                  necessityScore: 88,
                  guidelineMatch: "KDIGO 2024 — Grade B",
                  fraudScore: 12,
                  estimatedCost: 8400,
                  annualCostSavings: 0,
                  aiDecision: "AUTO_APPROVED",
                  reasoning: "CKD Stage G4 patient with Hgb 8.2 g/dL, symptomatic anemia. KDIGO guidelines indicate ESA therapy when Hgb <10 g/dL in CKD. Iron stores adequate (TSAT 28%). Dose appropriate for eGFR 22. No red flags detected.",
                  alternatives: [],
                },
                {
                  id: "PA-2025-08847",
                  patient: "Mohammed Al-Ghamdi",
                  nationalId: "1000000010",
                  age: 44,
                  icd10: "M79.3",
                  procedure: "Lumbar MRI with contrast — repeated (3rd in 8 months)",
                  hospital: "Saad Medical City",
                  requestedBy: "Dr. Ahmed Al-Qahtani",
                  necessityScore: 31,
                  guidelineMatch: "ACR Appropriateness Criteria — Not Recommended (repeated imaging without clinical change)",
                  fraudScore: 74,
                  estimatedCost: 3800,
                  annualCostSavings: 3800,
                  aiDecision: "FLAGGED_REVIEW",
                  reasoning: "CLINICAL RED FLAG: 3rd lumbar MRI in 8 months for non-specific low back pain. No documented neurological deficit, no change in clinical status. ACR guidelines: MRI repeat contraindicated within 12 months unless acute neurological deterioration. Fraud pattern: same requesting physician, same facility, same patient — 3rd high-cost imaging in 8 months.",
                  alternatives: ["Physical therapy trial (6 weeks)", "Clinical re-examination documenting neurological signs if present", "X-ray if structural concern"],
                },
                {
                  id: "PA-2025-08849",
                  patient: "Nasser Al-Dossari",
                  nationalId: "1000000005",
                  age: 58,
                  icd10: "E78.5 · I25.10",
                  procedure: "PCSK9 Inhibitor — Evolocumab 140mg (monthly)",
                  hospital: "Prince Sultan Cardiac Center",
                  requestedBy: "Dr. Saud Al-Shammari",
                  necessityScore: 91,
                  guidelineMatch: "ESC/EAS 2023 Dyslipidemia Guidelines — Class IA",
                  fraudScore: 6,
                  estimatedCost: 28000,
                  annualCostSavings: 142000,
                  aiDecision: "AUTO_APPROVED",
                  reasoning: "Established CAD patient with LDL 3.8 mmol/L despite maximum-tolerated statin + ezetimibe. ESC 2023 guidelines: PCSK9i indicated when LDL >1.8 mmol/L with CAD despite dual lipid-lowering therapy. Cost-effectiveness: prevents 1 MACE event (avg SAR 142,000 hospitalization) for every 28 patients treated annually.",
                  alternatives: [],
                },
                {
                  id: "PA-2025-08852",
                  patient: "Sara Al-Otaibi",
                  nationalId: "1000000023",
                  age: 29,
                  icd10: "K92.1",
                  procedure: "Upper GI Endoscopy — 4th procedure (3 in past 6 months)",
                  hospital: "Al-Hamad Medical Corporation",
                  requestedBy: "Dr. Hani Al-Rashidi",
                  necessityScore: 22,
                  guidelineMatch: "ACG 2024 Guidelines — NOT indicated: no alarm features, endoscopy-negative GERD established",
                  fraudScore: 89,
                  estimatedCost: 5200,
                  annualCostSavings: 5200,
                  aiDecision: "AI_DENIED",
                  reasoning: "FRAUD ALERT — HIGH CONFIDENCE: 4th upper GI endoscopy in 6 months for 29-year-old with endoscopy-confirmed GERD. Previous 3 endoscopies negative for malignancy, H. pylori eradicated. ACG guidelines explicitly state: repeat endoscopy NOT indicated in uncomplicated GERD without new alarm symptoms. Fraud score 89/100 — pattern consistent with unnecessary procedure billing.",
                  alternatives: ["Continue PPI therapy (Omeprazole 20mg daily)", "Dietary and lifestyle modification counseling", "Refer to functional GI specialist if symptoms persist"],
                },
                {
                  id: "PA-2025-08855",
                  patient: "Ibrahim Al-Dosari",
                  nationalId: "1000000004",
                  age: 63,
                  icd10: "J44.1",
                  procedure: "Mepolizumab 100mg SC (Anti-IL5 biologic) — COPD",
                  hospital: "King Fahad Medical City",
                  requestedBy: "Dr. Khalid Al-Jabri",
                  necessityScore: 67,
                  guidelineMatch: "GOLD 2025 — Conditional: eosinophil count required for eligibility",
                  fraudScore: 14,
                  estimatedCost: 72000,
                  annualCostSavings: 0,
                  aiDecision: "PENDING_INFO",
                  reasoning: "ADDITIONAL INFORMATION REQUIRED: Mepolizumab for COPD is conditionally indicated per GOLD 2025 when blood eosinophil count ≥300 cells/μL AND ≥2 exacerbations/year on triple therapy. Request is missing: 1) Most recent eosinophil count (last documented 14 months ago), 2) Exacerbation history documentation for past 12 months. Please provide updated labs within 48 hours.",
                  alternatives: ["Provide eosinophil count from within 6 months", "Document exacerbation log with dates and severity"],
                },
              ].map((req) => {
                const decisionCfg = req.aiDecision === "AUTO_APPROVED"
                  ? { bg: "bg-emerald-50", border: "border-emerald-200", badgeV: "success" as const, label: "AUTO-APPROVED", icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" /> }
                  : req.aiDecision === "AI_DENIED"
                  ? { bg: "bg-red-50", border: "border-red-200", badgeV: "destructive" as const, label: "AI-DENIED", icon: <X className="w-4 h-4 text-red-600" /> }
                  : req.aiDecision === "FLAGGED_REVIEW"
                  ? { bg: "bg-amber-50", border: "border-amber-200", badgeV: "warning" as const, label: "FLAGGED", icon: <ShieldAlert className="w-4 h-4 text-amber-600" /> }
                  : { bg: "bg-sky-50", border: "border-sky-200", badgeV: "info" as const, label: "PENDING INFO", icon: <Clock className="w-4 h-4 text-sky-600" /> };
                const necessityColor = req.necessityScore >= 80 ? "text-emerald-600" : req.necessityScore >= 50 ? "text-amber-600" : "text-red-600";
                const fraudColor = req.fraudScore >= 70 ? "text-red-600" : req.fraudScore >= 30 ? "text-amber-600" : "text-emerald-600";
                const borderColor = req.aiDecision === "AUTO_APPROVED" ? "#22c55e" : req.aiDecision === "AI_DENIED" ? "#ef4444" : req.aiDecision === "FLAGGED_REVIEW" ? "#f59e0b" : "#0ea5e9";
                return (
                  <div key={req.id} className="p-5" style={{ borderLeft: `4px solid ${borderColor}` }}>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                        {decisionCfg.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-mono text-[10px] text-muted-foreground">{req.id}</span>
                              <Badge variant={decisionCfg.badgeV} className="text-[9px]">{decisionCfg.label}</Badge>
                              <span className="text-[10px] text-muted-foreground">ICD-10: {req.icd10}</span>
                            </div>
                            <p className="text-sm font-bold text-foreground">{req.procedure}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{req.patient} · Age {req.age} · {req.hospital}</p>
                            <p className="text-[10px] text-muted-foreground">Requested by: {req.requestedBy}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2 shrink-0">
                            <div className="text-center bg-white/70 rounded-xl px-3 py-2">
                              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Necessity</p>
                              <p className={`text-xl font-bold ${necessityColor}`}>{req.necessityScore}</p>
                            </div>
                            <div className="text-center bg-white/70 rounded-xl px-3 py-2">
                              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Fraud Risk</p>
                              <p className={`text-xl font-bold ${fraudColor}`}>{req.fraudScore}</p>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 bg-secondary/70 rounded-2xl mb-3">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1.5"><Brain className="w-3 h-3 text-violet-600" /> AI Clinical Reasoning</p>
                          <p className="text-xs text-foreground leading-relaxed">{req.reasoning}</p>
                        </div>

                        <div className="flex items-center gap-4 mb-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Guideline:</span>
                            <span className="text-[10px] font-semibold text-foreground">{req.guidelineMatch}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Cost:</span>
                            <span className="text-[10px] font-semibold text-foreground">SAR {req.estimatedCost.toLocaleString()}</span>
                          </div>
                          {req.annualCostSavings > 0 && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">AI Saves:</span>
                              <span className="text-[10px] font-bold text-emerald-600">SAR {req.annualCostSavings.toLocaleString()}/yr</span>
                            </div>
                          )}
                        </div>

                        {req.alternatives.length > 0 && (
                          <div className="p-3 bg-secondary/60 rounded-2xl mb-2">
                            <p className="text-[10px] font-bold text-muted-foreground mb-1.5 uppercase tracking-widest">AI-Recommended Alternatives</p>
                            <div className="space-y-1">
                              {req.alternatives.map((alt, ai) => (
                                <p key={ai} className="text-xs text-foreground flex items-center gap-1.5"><ChevronRight className="w-3 h-3 shrink-0 text-muted-foreground" />{alt}</p>
                              ))}
                            </div>
                          </div>
                        )}

                        {(req.aiDecision === "FLAGGED_REVIEW" || req.aiDecision === "AI_DENIED") && (
                          <div className="flex items-center gap-2 mt-2">
                            <button className="flex items-center gap-1.5 text-[11px] font-bold text-foreground bg-secondary hover:bg-border px-3 py-1.5 rounded-full transition-colors">
                              <Eye className="w-3 h-3" /> Manual Review
                            </button>
                            <button className="flex items-center gap-1.5 text-[11px] font-bold text-red-700 bg-secondary hover:bg-border px-3 py-1.5 rounded-full transition-colors">
                              <MessageSquare className="w-3 h-3" /> Request Peer Review
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {activeTab === "portfolio" && (
        <div className="space-y-5">
          <div className="flex items-center gap-4 p-5 rounded-[2rem]" style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(20px)", boxShadow: "0 8px 32px rgba(0,0,0,0.04)" }}>
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #0284c7 0%, #0c4a6e 100%)" }}>
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground" style={{ fontFamily: "'Manrope', sans-serif" }}>Portfolio Risk Intelligence</h2>
              <p className="text-sm text-muted-foreground">National portfolio risk distribution · Pricing bands · Actuarial overview</p>
            </div>
          </div>
          {dashboard && (
            <>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: "Low Risk", value: dashboard.portfolioRisk?.low, color: "text-emerald-600", barColor: "bg-emerald-500" },
                  { label: "Medium Risk", value: dashboard.portfolioRisk?.medium, color: "text-amber-600", barColor: "bg-amber-500" },
                  { label: "High Risk", value: dashboard.portfolioRisk?.high, color: "text-orange-600", barColor: "bg-orange-500" },
                  { label: "Critical Risk", value: dashboard.portfolioRisk?.critical, color: "text-red-600", barColor: "bg-red-500" },
                ].map((band, i) => (
                  <div key={i} className="p-5 rounded-3xl" style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(12px)", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{band.label}</p>
                    <p className={`text-4xl font-bold ${band.color}`}>{band.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">policyholders</p>
                    <div className="mt-3 h-1.5 bg-black/8 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${band.barColor}`} style={{ width: `${Math.round((band.value / dashboard.totalPolicies) * 100)}%` }} />
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
