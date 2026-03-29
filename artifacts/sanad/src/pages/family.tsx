import React, { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardHeader, CardTitle, CardBody, Input, Button, Badge, PageHeader, DataLabel } from "@/components/shared";
import {
  Users, Search, Heart, AlertTriangle, Shield, Dna, CalendarDays, Activity,
  User, X, ChevronRight, TrendingUp, Brain, Zap, CheckCircle2, Clock, Info
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, BarChart, Bar, Cell, Legend
} from "recharts";

async function fetchFamilyData(nationalId: string) {
  const res = await fetch(`/api/family/patient/${nationalId}`);
  if (!res.ok) throw new Error("Not found");
  return res.json();
}

const RISK_CONFIG = {
  high: { color: "text-red-700", bg: "bg-red-50", border: "border-red-200", badge: "destructive" as const, dot: "bg-red-500", bar: "#ef4444" },
  medium: { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", badge: "warning" as const, dot: "bg-amber-500", bar: "#f59e0b" },
  low: { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", badge: "success" as const, dot: "bg-emerald-500", bar: "#22c55e" },
};

const STATUS_CONFIG = {
  "high-risk": { bg: "bg-red-100", border: "border-red-200", text: "text-red-700", ringColor: "ring-red-400", dotColor: "bg-red-500" },
  "moderate": { bg: "bg-amber-100", border: "border-amber-200", text: "text-amber-700", ringColor: "ring-amber-400", dotColor: "bg-amber-500" },
  "healthy": { bg: "bg-emerald-100", border: "border-emerald-200", text: "text-emerald-700", ringColor: "ring-emerald-400", dotColor: "bg-emerald-500" },
};

function FamilyMemberCard({ member, isPatient = false }: { member: any; isPatient?: boolean }) {
  const statusCfg = STATUS_CONFIG[member.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG["healthy"];
  const riskColor = member.riskScore >= 70 ? "text-red-600" : member.riskScore >= 40 ? "text-amber-600" : "text-emerald-600";
  const riskBg = member.riskScore >= 70 ? "bg-red-50" : member.riskScore >= 40 ? "bg-amber-50" : "bg-emerald-50";

  return (
    <div className={`relative p-4 rounded-2xl border-2 transition-all ${isPatient ? "border-primary bg-primary/5 ring-2 ring-primary/20" : `${statusCfg.border} ${statusCfg.bg} ring-1 ${statusCfg.ringColor}/20`}`}>
      {isPatient && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-bold bg-primary text-white px-2.5 py-0.5 rounded-full whitespace-nowrap uppercase tracking-widest">
          INDEX PATIENT
        </div>
      )}
      <div className="flex items-start gap-2.5 mb-2.5">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isPatient ? "bg-primary/20" : statusCfg.bg}`}>
          <User className={`w-4 h-4 ${isPatient ? "text-primary" : statusCfg.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{member.fullName}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-muted-foreground">{member.relationship ?? "Patient"}</span>
            <span className="text-[10px] text-muted-foreground">·</span>
            <span className="text-[10px] text-muted-foreground">Age {member.age}</span>
            <span className="text-[10px] text-muted-foreground">·</span>
            <span className="text-[10px] font-bold text-red-500">{member.bloodType}</span>
          </div>
        </div>
      </div>
      <div className={`flex items-center justify-between px-3 py-2 rounded-xl ${riskBg}`}>
        <div>
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">AI Risk</p>
          <p className={`text-xl font-bold ${riskColor}`}>{member.riskScore}</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Conditions</p>
          <p className="text-sm font-bold text-foreground">{member.chronicConditions?.length ?? 0}</p>
        </div>
      </div>
      {member.sharedConditions?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          <span className="text-[9px] font-bold text-muted-foreground w-full mb-0.5">SHARED:</span>
          {member.sharedConditions.map((c: string, i: number) => (
            <span key={i} className="text-[9px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">{c}</span>
          ))}
        </div>
      )}
      {member.chronicConditions?.length > 0 && !member.sharedConditions?.length && (
        <div className="mt-2 flex flex-wrap gap-1">
          {member.chronicConditions.slice(0, 2).map((c: string, i: number) => (
            <span key={i} className="text-[9px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full">{c}</span>
          ))}
          {member.chronicConditions.length > 2 && <span className="text-[9px] text-muted-foreground">+{member.chronicConditions.length - 2}</span>}
        </div>
      )}
    </div>
  );
}

type TabId = "tree" | "genetics" | "burden" | "screening";

export default function FamilyPortal() {
  const [searchId, setSearchId] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("tree");
  const [expandedRisk, setExpandedRisk] = useState<number | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["family-data", nationalId],
    queryFn: () => fetchFamilyData(nationalId),
    enabled: !!nationalId,
    retry: false,
  });

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "tree", label: "Family Tree", icon: <Users className="w-3.5 h-3.5" /> },
    { id: "genetics", label: "Genetic Risks", icon: <Dna className="w-3.5 h-3.5" /> },
    { id: "burden", label: "Condition Burden", icon: <Activity className="w-3.5 h-3.5" /> },
    { id: "screening", label: "Screening Plan", icon: <Shield className="w-3.5 h-3.5" /> },
  ];

  return (
    <Layout role="family">
      <div className="flex items-center gap-2 mb-5">
        <div className="flex items-center gap-2 bg-pink-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-full uppercase tracking-widest">
          <Users className="w-3 h-3" /> Family Health Portal
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-violet-600 bg-violet-50 px-3 py-1.5 rounded-full">
          <Dna className="w-3 h-3" /> Genetic Risk Intelligence Active
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (searchId.trim()) { setNationalId(searchId.trim()); setActiveTab("tree"); } }} className="flex items-center gap-2 ml-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input placeholder="National ID..." className="pl-9 w-52" value={searchId} onChange={(e) => setSearchId(e.target.value)} />
          </div>
          <Button type="submit" size="md">Load Family Profile</Button>
        </form>
      </div>

      <div className="flex items-start justify-between mb-5">
        <PageHeader title="Family Health & Genetic Risk Portal" subtitle="Map familial disease inheritance, shared genetic risks, and coordinate family-wide preventive screening." />
        {data && (
          <div className="flex gap-1.5 shrink-0 ml-6">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full transition-all ${activeTab === t.id ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {!nationalId && (
        <Card>
          <CardBody className="py-16 text-center">
            <div className="w-16 h-16 rounded-3xl bg-pink-50 flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7 text-pink-500" />
            </div>
            <p className="font-bold text-foreground mb-1">No Family Profile Selected</p>
            <p className="text-sm text-muted-foreground mb-2">Enter a National ID to load genetic risk analysis, family tree, and hereditary condition mapping.</p>
            <p className="text-xs text-muted-foreground font-mono bg-secondary inline-block px-3 py-1.5 rounded-xl">Demo: 1000000001 · 1000000003 · 1000000005</p>
          </CardBody>
        </Card>
      )}
      {isLoading && (
        <div className="flex items-center gap-3 py-16 text-muted-foreground justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-pink-500" />
          <span className="text-sm">Loading family health data...</span>
        </div>
      )}
      {isError && nationalId && (
        <Card className="border-red-200 bg-red-50">
          <CardBody className="flex items-center gap-3 p-4">
            <X className="w-4 h-4 text-red-500" />
            <p className="text-sm text-red-700">Patient not found for <span className="font-mono">{nationalId}</span></p>
          </CardBody>
        </Card>
      )}

      {data && (
        <div className="space-y-5">
          {/* Alert Banner */}
          {data.familyRiskAlert && (
            <div className={`flex items-start gap-3 p-4 border-2 rounded-3xl ${data.summary.overallFamilyRisk === "HIGH" ? "bg-red-50 border-red-300" : "bg-amber-50 border-amber-300"}`}>
              <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${data.summary.overallFamilyRisk === "HIGH" ? "text-red-600" : "text-amber-600"}`} />
              <div>
                <p className={`text-sm font-bold ${data.summary.overallFamilyRisk === "HIGH" ? "text-red-800" : "text-amber-800"}`}>{data.familyRiskAlert}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[10px] font-semibold text-muted-foreground">{data.summary.totalMembers} family members mapped</span>
                  <span className="text-[10px] font-semibold text-red-600">{data.summary.highRiskMembers} high-risk</span>
                  <span className="text-[10px] font-semibold text-muted-foreground">{data.summary.sharedConditionsCount} shared conditions</span>
                </div>
              </div>
              <div className="ml-auto shrink-0 text-right">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Family Risk</p>
                <p className={`text-2xl font-bold ${data.summary.overallFamilyRisk === "HIGH" ? "text-red-600" : data.summary.overallFamilyRisk === "MODERATE" ? "text-amber-600" : "text-emerald-600"}`}>{data.summary.overallFamilyRisk}</p>
              </div>
            </div>
          )}

          {/* Summary KPIs */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Heritability Score", value: data.heritabilityScore, suffix: "/100", color: data.heritabilityScore >= 70 ? "text-red-600" : data.heritabilityScore >= 40 ? "text-amber-600" : "text-emerald-600", bg: data.heritabilityScore >= 70 ? "bg-red-50" : "bg-secondary" },
              { label: "Genetic Risk Factors", value: data.geneticRisks?.length, suffix: " identified", color: "text-violet-600", bg: "bg-violet-50" },
              { label: "Family Members Linked", value: data.summary?.totalMembers, suffix: " members", color: "text-primary", bg: "bg-primary/5" },
              { label: "Patient Risk Score", value: data.patient?.riskScore, suffix: "/100", color: data.patient?.riskScore >= 70 ? "text-red-600" : "text-amber-600", bg: "bg-amber-50" },
            ].map((kpi, i) => (
              <div key={i} className={`p-5 rounded-3xl ${kpi.bg}`}>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{kpi.label}</p>
                <p className={`text-4xl font-bold ${kpi.color}`}>{kpi.value}<span className="text-sm font-semibold text-muted-foreground">{kpi.suffix}</span></p>
              </div>
            ))}
          </div>

          {/* ─── FAMILY TREE TAB ─── */}
          {activeTab === "tree" && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2"><Users className="w-4 h-4 text-pink-600" /><CardTitle>Family Tree — Risk Map</CardTitle></div>
                <p className="text-xs text-muted-foreground ml-auto">Colors indicate AI Risk Score</p>
              </CardHeader>
              <CardBody>
                <div className="space-y-6">
                  {/* Parents */}
                  {data.parents?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <span className="w-4 h-0.5 bg-border inline-block" /> Parents (P1)
                      </p>
                      <div className={`grid gap-4 ${data.parents.length === 1 ? "grid-cols-1 max-w-xs mx-auto" : "grid-cols-2"}`}>
                        {data.parents.map((m: any) => <FamilyMemberCard key={m.id} member={m} />)}
                      </div>
                    </div>
                  )}

                  {/* Connector line */}
                  {data.parents?.length > 0 && (
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-6 w-px bg-border" />
                      <div className="w-24 h-px bg-border" />
                      <div className="h-6 w-px bg-border" />
                    </div>
                  )}

                  {/* INDEX PATIENT + Siblings */}
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <span className="w-4 h-0.5 bg-border inline-block" /> Index Patient + Siblings (P2)
                    </p>
                    <div className={`grid gap-4 ${(data.siblings?.length + 1) <= 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                      <FamilyMemberCard member={{ ...data.patient, relationship: "Index Patient" }} isPatient />
                      {data.siblings?.map((m: any) => <FamilyMemberCard key={m.id} member={m} />)}
                    </div>
                  </div>

                  {/* Children */}
                  {data.children?.length > 0 && (
                    <>
                      <div className="flex items-center justify-center">
                        <div className="h-6 w-px bg-border" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                          <span className="w-4 h-0.5 bg-border inline-block" /> Children (P3)
                        </p>
                        <div className={`grid gap-4 ${data.children.length <= 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                          {data.children.map((m: any) => <FamilyMemberCard key={m.id} member={m} />)}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Risk Trend */}
                  {data.familyRiskTrend?.length > 0 && (
                    <div className="pt-4 border-t border-border">
                      <p className="text-xs font-bold text-muted-foreground mb-3 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-primary" /> 5-Year Family Risk Trajectory
                      </p>
                      <div className="h-36">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={data.familyRiskTrend} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11 }} domain={[0, 100]} />
                            <RechartsTooltip contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: 12 }} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Line type="monotone" dataKey="familyRisk" name="Family Risk" stroke="#ef4444" strokeWidth={2} dot={{ r: 4, fill: "#ef4444" }} />
                            <Line type="monotone" dataKey="patientRisk" name="Patient Risk" stroke="#007AFF" strokeWidth={2} dot={{ r: 4, fill: "#007AFF" }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          )}

          {/* ─── GENETIC RISKS TAB ─── */}
          {activeTab === "genetics" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Dna className="w-4 h-4 text-violet-600" />
                <p className="text-sm font-bold text-foreground">{data.geneticRisks?.length} Hereditary Risk Factors Identified</p>
                <Badge variant={data.geneticRisks?.filter((r: any) => r.riskLevel === "high").length > 0 ? "destructive" : "success"} className="ml-auto">
                  {data.geneticRisks?.filter((r: any) => r.riskLevel === "high").length} high-penetrance
                </Badge>
              </div>
              {data.geneticRisks?.map((risk: any, i: number) => {
                const cfg = RISK_CONFIG[risk.riskLevel as keyof typeof RISK_CONFIG] ?? RISK_CONFIG.low;
                const isExpanded = expandedRisk === i;
                return (
                  <Card key={i} className={`border-2 ${cfg.border} overflow-hidden`}>
                    <div className={`${cfg.bg} px-5 py-4`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${cfg.dot}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`text-sm font-bold ${cfg.color}`}>{risk.condition}</p>
                            {risk.icdCode && <span className="font-mono text-[10px] bg-white/60 border border-current/20 px-1.5 py-0.5 rounded-lg text-muted-foreground">{risk.icdCode}</span>}
                            <Badge variant={cfg.badge} className="text-[10px] ml-auto shrink-0">{risk.riskLevel} penetrance</Badge>
                          </div>
                          {risk.gene && <p className="text-[11px] text-muted-foreground mt-0.5"><span className="font-semibold text-foreground">Genes:</span> {risk.gene}</p>}
                          <div className="flex items-center gap-4 mt-1.5">
                            <span className="text-[11px] text-muted-foreground"><span className="font-semibold text-foreground">Inheritance:</span> {risk.inheritanceType}</span>
                            <span className="text-[11px] text-muted-foreground"><span className="font-semibold text-foreground">Transmission:</span> {Math.round(risk.transmissionProb * 100)}%</span>
                          </div>
                        </div>
                        <button onClick={() => setExpandedRisk(isExpanded ? null : i)}
                          className="text-[10px] font-bold text-primary bg-white/60 px-2.5 py-1 rounded-xl hover:bg-white transition-colors shrink-0">
                          {isExpanded ? "Less" : "Details"}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <CardBody className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-secondary rounded-2xl p-3">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Inheritance Pattern</p>
                            <p className="text-xs text-foreground">{risk.inheritancePattern}</p>
                          </div>
                          <div className="bg-secondary rounded-2xl p-3">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Penetrance</p>
                            <p className="text-xs text-foreground">{risk.penetrance}</p>
                          </div>
                        </div>
                        <div className="bg-secondary rounded-2xl p-3">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Transmission Probability</p>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-3 bg-white rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${risk.riskLevel === "high" ? "bg-red-500" : risk.riskLevel === "medium" ? "bg-amber-500" : "bg-emerald-500"}`}
                                style={{ width: `${risk.transmissionProb * 100}%` }} />
                            </div>
                            <span className={`text-sm font-bold shrink-0 ${risk.riskLevel === "high" ? "text-red-600" : risk.riskLevel === "medium" ? "text-amber-600" : "text-emerald-600"}`}>
                              {Math.round(risk.transmissionProb * 100)}%
                            </span>
                          </div>
                        </div>
                        {risk.affectedRelatives?.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">At-Risk Relatives</p>
                            <div className="flex flex-wrap gap-1.5">
                              {risk.affectedRelatives.map((r: string, ri: number) => (
                                <span key={ri} className="text-xs font-semibold bg-secondary border border-border px-2.5 py-1 rounded-xl">{r}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className={`flex items-start gap-2.5 p-3 rounded-2xl border ${cfg.bg} ${cfg.border}`}>
                          <ChevronRight className={`w-4 h-4 shrink-0 mt-0.5 ${cfg.color}`} />
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Clinical Recommendation</p>
                            <p className="text-xs font-semibold text-foreground">{risk.recommendation}</p>
                          </div>
                        </div>
                      </CardBody>
                    )}

                    {!isExpanded && (
                      <div className="px-5 pb-4">
                        <div className="flex items-start gap-2 mt-2">
                          <ChevronRight className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${cfg.color}`} />
                          <p className="text-xs text-muted-foreground">{risk.recommendation}</p>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {/* ─── CONDITION BURDEN TAB ─── */}
          {activeTab === "burden" && (
            <div className="space-y-5">
              <div className="grid grid-cols-12 gap-5">
                <Card className="col-span-7">
                  <CardHeader>
                    <div className="flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /><CardTitle>Condition Burden Across Family</CardTitle></div>
                    <p className="text-xs text-muted-foreground">Family load = % of members affected</p>
                  </CardHeader>
                  <CardBody>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.conditionBurden} layout="vertical" margin={{ top: 0, right: 60, bottom: 0, left: 0 }}>
                          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 10 }} domain={[0, 100]} />
                          <YAxis type="category" dataKey="condition" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} width={170} />
                          <RechartsTooltip contentStyle={{ borderRadius: "12px", fontSize: 11 }} formatter={(v: any, n: string) => [n === "familyLoad" ? `${v}%` : v, n === "familyLoad" ? "Family Load" : "Count"]} />
                          <Bar dataKey="familyLoad" name="Family Load %" radius={[0, 6, 6, 0]} barSize={16}>
                            {data.conditionBurden?.map((_: any, i: number) => (
                              <Cell key={i} fill={i === 0 ? "#ef4444" : i === 1 ? "#f97316" : i <= 3 ? "#f59e0b" : "#007AFF"} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardBody>
                </Card>

                <Card className="col-span-5">
                  <CardHeader>
                    <div className="flex items-center gap-2"><Brain className="w-4 h-4 text-violet-600" /><CardTitle>Condition Details</CardTitle></div>
                  </CardHeader>
                  <CardBody className="space-y-2.5">
                    {data.conditionBurden?.slice(0, 6).map((c: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-secondary rounded-2xl">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${i === 0 ? "bg-red-500" : i === 1 ? "bg-orange-500" : i <= 3 ? "bg-amber-500" : "bg-blue-500"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{c.condition}</p>
                          <p className="text-[10px] text-muted-foreground">{c.penetrance}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-foreground">{c.count}</p>
                          <p className="text-[10px] text-muted-foreground">{c.familyLoad}%</p>
                        </div>
                      </div>
                    ))}
                  </CardBody>
                </Card>
              </div>

              {/* Family Risk Trajectory */}
              {data.familyRiskTrend?.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /><CardTitle>5-Year Family Risk Trajectory</CardTitle></div>
                    <Badge variant="outline">AI Projection · 2025–2029</Badge>
                  </CardHeader>
                  <CardBody>
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.familyRiskTrend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11 }} domain={[0, 100]} />
                          <RechartsTooltip contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: 12 }} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Line type="monotone" dataKey="familyRisk" name="Family Aggregate Risk" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 5, fill: "#ef4444" }} />
                          <Line type="monotone" dataKey="patientRisk" name="Patient Risk" stroke="#007AFF" strokeWidth={2.5} dot={{ r: 5, fill: "#007AFF" }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-3 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5">
                      <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800">AI projection based on current chronic condition trajectory, age-related risk accumulation, and hereditary penetrance rates. Assumes no major lifestyle or therapeutic intervention.</p>
                    </div>
                  </CardBody>
                </Card>
              )}
            </div>
          )}

          {/* ─── SCREENING PLAN TAB ─── */}
          {activeTab === "screening" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                <p className="text-sm font-bold text-foreground">Family-Wide Screening Protocol</p>
                <Badge variant="success" className="ml-auto">{data.screeningRecommendations?.length} active recommendations</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {data.screeningRecommendations?.map((rec: any, i: number) => {
                  const priBg = rec.priority === "high" ? "bg-red-50 border-red-200" : rec.priority === "medium" ? "bg-sky-50 border-sky-200" : "bg-secondary border-border";
                  const priIcon = rec.priority === "high" ? <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" /> : rec.priority === "medium" ? <Clock className="w-4 h-4 text-sky-500 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
                  return (
                    <div key={i} className={`p-4 rounded-3xl border ${priBg}`}>
                      <div className="flex items-start gap-3 mb-3">
                        {priIcon}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground">{rec.test}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{rec.for}</p>
                        </div>
                        <Badge variant={rec.priority === "high" ? "destructive" : rec.priority === "medium" ? "info" : "success"} className="text-[10px] shrink-0">{rec.priority}</Badge>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground">{rec.frequency}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-white/60 border border-border rounded-full text-muted-foreground ml-auto">Due: {rec.dueIn}</span>
                      </div>
                      {rec.members?.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Applies to</p>
                          <div className="flex flex-wrap gap-1">
                            {rec.members.slice(0, 3).map((m: string, mi: number) => (
                              <div key={mi} className="flex items-center gap-1 bg-white/60 border border-border px-2 py-0.5 rounded-xl">
                                <User className="w-2.5 h-2.5 text-muted-foreground" />
                                <span className="text-[10px] font-medium text-foreground">{m.split(" ")[0]}</span>
                              </div>
                            ))}
                            {rec.members.length > 3 && <span className="text-[10px] text-muted-foreground self-center">+{rec.members.length - 3}</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Family member conditions full list */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2"><Users className="w-4 h-4 text-primary" /><CardTitle>Family Members — Full Health Summary</CardTitle></div>
                </CardHeader>
                <CardBody className="p-0">
                  <div className="divide-y divide-border">
                    {[{ ...data.patient, relationship: "Index Patient (You)" }, ...(data.familyMembers ?? [])].map((m: any, i: number) => {
                      const riskColor = m.riskScore >= 70 ? "text-red-600 bg-red-50" : m.riskScore >= 40 ? "text-amber-600 bg-amber-50" : "text-emerald-600 bg-emerald-50";
                      return (
                        <div key={i} className="flex items-center gap-4 px-5 py-3.5 hover:bg-secondary/30 transition-colors">
                          <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-foreground">{m.fullName}</p>
                              {i === 0 && <Badge variant="outline" className="text-[9px]">Index</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">{m.relationship} · Age {m.age} · {m.gender} · {m.bloodType}</p>
                          </div>
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {m.chronicConditions?.slice(0, 3).map((c: string, ci: number) => (
                              <span key={ci} className="text-[9px] font-semibold bg-secondary border border-border px-1.5 py-0.5 rounded-full text-muted-foreground">{c}</span>
                            ))}
                            {m.chronicConditions?.length > 3 && <span className="text-[9px] text-muted-foreground self-center">+{m.chronicConditions.length - 3}</span>}
                            {m.chronicConditions?.length === 0 && <span className="text-[9px] text-emerald-600 font-semibold">No chronic conditions</span>}
                          </div>
                          <div className={`flex items-center justify-center w-12 h-10 rounded-xl text-sm font-bold shrink-0 ${riskColor}`}>
                            {m.riskScore}
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
      )}
    </Layout>
  );
}
