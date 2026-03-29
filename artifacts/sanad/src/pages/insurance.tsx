import React, { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardHeader, CardTitle, CardBody, Input, Button, Badge, PageHeader, KpiCard, DataLabel, StatusDot } from "@/components/shared";
import { Shield, Search, AlertTriangle, CheckCircle2, TrendingUp, DollarSign, Users, Brain, ShieldAlert, Zap, X, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

async function fetchInsurancePatient(nationalId: string) {
  const res = await fetch(`/api/insurance/patient/${nationalId}`);
  if (!res.ok) throw new Error("Patient not found");
  return res.json();
}

async function fetchInsuranceDashboard() {
  const res = await fetch("/api/insurance/dashboard");
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  approved: { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", label: "Approved" },
  pending: { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", label: "Pending" },
  under_review: { color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", label: "Under Review" },
  rejected: { color: "text-red-700", bg: "bg-red-50", border: "border-red-200", label: "Rejected" },
};

const COLORS = ["#007AFF", "#22c55e", "#f59e0b", "#ef4444"];

export default function InsurancePortal() {
  const [searchId, setSearchId] = useState("");
  const [nationalId, setNationalId] = useState("");

  const { data: dashboard } = useQuery({ queryKey: ["insurance-dashboard"], queryFn: fetchInsuranceDashboard });
  const { data: patient, isLoading, isError } = useQuery({
    queryKey: ["insurance-patient", nationalId],
    queryFn: () => fetchInsurancePatient(nationalId),
    enabled: !!nationalId,
    retry: false,
  });

  return (
    <Layout role="insurance">
      <div className="flex items-center gap-2 mb-5">
        <div className="flex items-center gap-2 bg-violet-600 text-white text-xs font-bold px-3.5 py-1.5 rounded-full uppercase tracking-widest">
          <Shield className="w-3 h-3" />
          Insurance Operations Center
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full ml-auto">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
          AI Fraud Detection: Active
        </div>
      </div>

      <div className="flex items-start justify-between mb-6">
        <PageHeader title="Insurance Portal" subtitle="Claims management, AI fraud detection, risk-based pricing, and policy analytics." />
        <form onSubmit={(e) => { e.preventDefault(); if (searchId.trim()) setNationalId(searchId.trim()); }} className="flex items-center gap-2 shrink-0 ml-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input placeholder="National ID..." className="pl-9 w-52" value={searchId} onChange={(e) => setSearchId(e.target.value)} />
          </div>
          <Button type="submit" size="md">Lookup Policy</Button>
        </form>
      </div>

      {/* Dashboard KPIs */}
      {dashboard && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <KpiCard title="Active Policies" value={dashboard.totalPolicies?.toLocaleString()} sub="Nationwide coverage" icon={Users} iconBg="bg-violet-100" iconColor="text-violet-600" />
          <KpiCard title="Total Claims" value={dashboard.totalClaims?.toLocaleString()} sub={`${dashboard.pendingClaims} pending review`} icon={Shield} iconBg="bg-primary/10" iconColor="text-primary" />
          <KpiCard title="Total Payout" value={`SAR ${(dashboard.totalPayout / 1000).toFixed(0)}K`} sub={`Avg SAR ${dashboard.avgClaimValue?.toLocaleString()} per claim`} icon={DollarSign} iconBg="bg-emerald-100" iconColor="text-emerald-600" />
          <KpiCard title="Fraud Detected" value={dashboard.fraudSuspected} sub={`${dashboard.fraudRate}% fraud rate`} icon={ShieldAlert} iconBg="bg-red-100" iconColor="text-red-600" />
        </div>
      )}

      <div className="grid grid-cols-12 gap-5 mb-6">
        {/* Claims Breakdown Chart */}
        {dashboard && (
          <Card className="col-span-7">
            <CardHeader>
              <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /><CardTitle>Claims by Type</CardTitle></div>
              <Badge variant="outline">{dashboard.approvalRate}% approval rate</Badge>
            </CardHeader>
            <CardBody>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboard.claimsByType} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="type" axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11 }} />
                    <RechartsTooltip contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: 12 }} />
                    <Bar dataKey="count" fill="#007AFF" radius={[6, 6, 0, 0]} barSize={40} name="Claims" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Fraud Alerts */}
        {dashboard && (
          <Card className="col-span-5">
            <CardHeader>
              <div className="flex items-center gap-2"><Brain className="w-4 h-4 text-red-500" /><CardTitle>AI Fraud Detection</CardTitle></div>
              <Badge variant="destructive">{dashboard.fraudSuspected} flags</Badge>
            </CardHeader>
            <CardBody className="space-y-3">
              {dashboard.fraudAlerts?.map((alert: any, i: number) => (
                <div key={i} className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl ${alert.severity === "high" ? "bg-red-50 border border-red-100" : "bg-amber-50 border border-amber-100"}`}>
                  <ShieldAlert className={`w-4 h-4 shrink-0 ${alert.severity === "high" ? "text-red-500" : "text-amber-500"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{alert.type}</p>
                    <p className={`text-xs font-bold mt-0.5 ${alert.severity === "high" ? "text-red-600" : "text-amber-600"}`}>{alert.count} cases flagged</p>
                  </div>
                  <Badge variant={alert.severity === "high" ? "destructive" : "warning"} className="shrink-0">{alert.severity}</Badge>
                </div>
              ))}
              <div className="pt-2 border-t border-border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5"><Zap className="w-3 h-3 text-amber-500" /> Risk-Based Pricing Alerts</p>
                {dashboard.riskPricingAlerts?.slice(0, 2).map((a: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 py-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${a.trend === "rising" ? "bg-red-500" : "bg-emerald-500"}`} />
                    <div>
                      <p className="text-xs font-semibold text-foreground">{a.region} — {a.trend}</p>
                      <p className="text-xs text-muted-foreground">{a.action}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      {/* Patient Lookup */}
      {isLoading && <div className="flex items-center gap-3 py-10 text-muted-foreground justify-center"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" /><span className="text-sm">Loading policy data...</span></div>}
      {isError && nationalId && (
        <Card className="border-red-200 bg-red-50 mb-5">
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
                  <p className="font-mono text-sm text-muted-foreground">{patient.patient?.nationalId}</p>
                </div>
                <div className="px-6 py-4 flex flex-col items-center justify-center min-w-[130px]">
                  <DataLabel label="Insurance Plan">
                    <p className="text-sm font-bold text-foreground text-center">{patient.insurancePlan}</p>
                  </DataLabel>
                  <Badge variant="success" className="mt-2">Active</Badge>
                </div>
                <div className={`px-6 py-4 flex flex-col items-center justify-center min-w-[130px] ${patient.fraudRisk === "high" ? "bg-red-50" : patient.fraudRisk === "medium" ? "bg-amber-50" : "bg-secondary/40"}`}>
                  <DataLabel label="Fraud Risk">
                    <p className={`text-2xl font-bold ${patient.fraudRisk === "high" ? "text-red-600" : patient.fraudRisk === "medium" ? "text-amber-600" : "text-emerald-600"}`}>{patient.fraudRisk?.toUpperCase()}</p>
                  </DataLabel>
                </div>
                <div className="px-6 py-4 flex flex-col items-center justify-center min-w-[140px] bg-violet-50">
                  <DataLabel label="Monthly Premium">
                    <p className="text-2xl font-bold text-violet-700">SAR {patient.monthlyPremium}</p>
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

          {/* Fraud Flags */}
          {patient.fraudFlags?.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardBody className="flex items-start gap-3 p-4">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-800 mb-2">AI Fraud Detection Flags</p>
                  {patient.fraudFlags.map((flag: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-amber-700 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      {flag}
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Claims Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /><CardTitle>Claims History</CardTitle></div>
              <Badge variant="default">{patient.totalClaims} claims</Badge>
            </CardHeader>
            <CardBody className="p-0">
              <div className="divide-y divide-border">
                {patient.claims?.map((claim: any, i: number) => {
                  const cfg = STATUS_CONFIG[claim.status] ?? STATUS_CONFIG["pending"]!;
                  return (
                    <div key={i} className="flex items-center gap-4 px-5 py-3.5 hover:bg-secondary/30 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono text-xs text-muted-foreground">{claim.claimId}</span>
                          <Badge variant={claim.type === "Emergency" ? "destructive" : claim.type === "Inpatient" ? "warning" : "outline"} className="text-[10px]">{claim.type}</Badge>
                          {claim.aiVerified && <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold"><CheckCircle2 className="w-3 h-3" />AI Verified</span>}
                        </div>
                        <p className="text-sm font-semibold text-foreground">{claim.diagnosis}</p>
                        <p className="text-xs text-muted-foreground">{claim.hospital} · {claim.date}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-base font-bold text-foreground">SAR {claim.estimatedCost.toLocaleString()}</p>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border}`}>{cfg.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </Layout>
  );
}
