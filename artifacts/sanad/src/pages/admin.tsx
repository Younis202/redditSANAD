import React from "react";
import { Layout } from "@/components/layout";
import { PageHeader, Card, CardHeader, CardTitle, CardBody, KpiCard, Badge, AlertBanner } from "@/components/shared";
import { useGetAdminStats, useGetPopulationHealth } from "@workspace/api-client-react";
import { useNationalIntelligence } from "@/hooks/use-ai-decision";
import { Users, Activity, ShieldAlert, Building, TrendingUp, AlertTriangle, PieChart as PieIcon, Globe, Brain, Zap, Radio, Lightbulb, Target } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";

const COLORS = ["#007AFF", "#34C759", "#FF9500", "#FF3B30", "#5856D6", "#32ADE6", "#AF52DE"];
const RISK_COLORS = { Low: "#22c55e", Medium: "#f59e0b", High: "#f97316", Critical: "#ef4444" };

export default function AdminDashboard() {
  const { data: statsRaw, isLoading: statsLoading } = useGetAdminStats();
  const { data: popHealth, isLoading: healthLoading } = useGetPopulationHealth();
  const { data: intelligence } = useNationalIntelligence();

  const stats = statsRaw as any;

  if (statsLoading || healthLoading) {
    return (
      <Layout role="admin">
        <div className="flex items-center gap-3 py-20 justify-center text-muted-foreground">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
          <span className="text-sm font-medium">Aggregating national health data...</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout role="admin">
      {stats && stats.highRiskPatients > 0 && (
        <AlertBanner variant="warning">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>{stats.highRiskPatients} patients</strong> currently classified as high or critical risk require clinical follow-up.
          </span>
          <Badge variant="warning" className="ml-auto shrink-0">{stats.highRiskPatients} flagged</Badge>
        </AlertBanner>
      )}

      <div className="flex items-start justify-between mb-6">
        <PageHeader
          title="Ministry of Health — Analytics Command Center"
          subtitle="Real-time national infrastructure metrics and population health intelligence."
        />
        <span className="text-xs font-mono bg-card border border-border rounded-xl px-3 py-2 text-muted-foreground shrink-0 ml-4">
          {new Date().toLocaleString("en-SA", { dateStyle: "medium", timeStyle: "short" })}
        </span>
      </div>

      {/* KPI Row */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <KpiCard
            title="Registered Patients"
            value={stats.totalPatients.toLocaleString()}
            sub="Active national records"
            icon={Users}
            iconBg="bg-primary/10"
            iconColor="text-primary"
            trend="+2.4%"
          />
          <KpiCard
            title="Visits Today"
            value={stats.totalVisitsToday.toLocaleString()}
            sub="Across all facilities"
            icon={Activity}
            iconBg="bg-sky-100"
            iconColor="text-sky-600"
            trend="+12%"
          />
          <KpiCard
            title="AI Interactions Blocked"
            value={stats.drugInteractionsBlocked.toLocaleString()}
            sub="Drug conflicts prevented"
            icon={ShieldAlert}
            iconBg="bg-emerald-100"
            iconColor="text-emerald-600"
          />
          <KpiCard
            title="Connected Hospitals"
            value={stats.hospitalsConnected.toLocaleString()}
            sub="Nationwide network"
            icon={Building}
            iconBg="bg-violet-100"
            iconColor="text-violet-600"
          />
        </div>
      )}

      {/* Charts Grid */}
      {popHealth && (
        <div className="grid grid-cols-12 gap-5">

          {/* Monthly Trend */}
          <Card className="col-span-8">
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <CardTitle>Monthly Visit Trend</CardTitle>
              </div>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <span className="w-3 h-0.5 bg-primary inline-block rounded-full" /> Total Visits
                </span>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <span className="w-3 h-0.5 bg-destructive inline-block rounded-full" /> Emergency
                </span>
              </div>
            </CardHeader>
            <CardBody>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={popHealth.monthlyVisitTrend} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11 }} />
                    <RechartsTooltip contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: 12 }} />
                    <Line type="monotone" dataKey="visits" stroke="#007AFF" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="emergency" stroke="#FF3B30" strokeWidth={2.5} dot={{ r: 3 }} strokeDasharray="5 3" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>

          {/* Blood Type Pie */}
          <Card className="col-span-4">
            <CardHeader><CardTitle>Blood Type Distribution</CardTitle></CardHeader>
            <CardBody>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={popHealth.bloodTypeDistribution}
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="count"
                      nameKey="bloodType"
                    >
                      {popHealth.bloodTypeDistribution.map((_: any, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-4 gap-x-2 gap-y-1.5 mt-1">
                {popHealth.bloodTypeDistribution.map((d: any, i: number) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-md shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-xs text-muted-foreground font-mono">{d.bloodType}</span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Conditions Bar */}
          <Card className="col-span-6">
            <CardHeader>
              <CardTitle>Top Chronic Conditions</CardTitle>
              <Badge variant="default">{popHealth.conditionBreakdown?.length} tracked</Badge>
            </CardHeader>
            <CardBody>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={popHealth.conditionBreakdown} layout="vertical" margin={{ top: 0, right: 20, left: 140, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="condition" type="category" axisLine={false} tickLine={false} tick={{ fill: "#374151", fontSize: 11, fontWeight: 500 }} width={130} />
                    <RechartsTooltip cursor={{ fill: "#F1F5F9" }} contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: 12 }} />
                    <Bar dataKey="count" fill="#007AFF" radius={[0, 6, 6, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>

          {/* Age Distribution */}
          <Card className="col-span-6">
            <CardHeader><CardTitle>Population Age Distribution</CardTitle></CardHeader>
            <CardBody>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={popHealth.ageDistribution} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="ageGroup" axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11 }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11 }} />
                    <RechartsTooltip cursor={{ fill: "#F1F5F9" }} contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: 12 }} />
                    <Bar dataKey="count" fill="#007AFF" radius={[6, 6, 0, 0]} barSize={34} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>

          {/* Risk Distribution */}
          {stats?.riskDistribution && (
            <Card className="col-span-5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-amber-600" />
                  <CardTitle>Patient Risk Distribution</CardTitle>
                </div>
                <Badge variant="warning">{stats.highRiskPatients} high/critical</Badge>
              </CardHeader>
              <CardBody>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.riskDistribution}
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="count"
                        nameKey="level"
                        label={({ level, percent }) => percent > 0.05 ? `${level} ${(percent * 100).toFixed(0)}%` : ""}
                        labelLine={false}
                      >
                        {stats.riskDistribution.map((entry: any, i: number) => (
                          <Cell key={i} fill={RISK_COLORS[entry.level as keyof typeof RISK_COLORS] || "#94a3b8"} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value: any, name: any) => [`${value} patients`, name]}
                        contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {stats.riskDistribution.map((d: any, i: number) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 bg-secondary rounded-xl">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: RISK_COLORS[d.level as keyof typeof RISK_COLORS] }} />
                        <span className="text-xs font-medium text-foreground">{d.level}</span>
                      </div>
                      <span className="text-xs font-bold text-muted-foreground tabular-nums">{d.count}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Risk by region bar */}
          {stats?.regionalStats && stats.regionalStats.length > 0 && (
            <Card className="col-span-7">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  <CardTitle>High-Risk Patients by Region</CardTitle>
                </div>
              </CardHeader>
              <CardBody>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.regionalStats.slice(0, 8)} layout="vertical" margin={{ top: 0, right: 20, left: 130, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="region" type="category" axisLine={false} tickLine={false} tick={{ fill: "#374151", fontSize: 11 }} width={125} />
                      <RechartsTooltip cursor={{ fill: "#F1F5F9" }} contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: 12 }} />
                      <Bar dataKey="highRisk" fill="#FF3B30" name="High Risk" radius={[0, 6, 6, 0]} barSize={14} />
                      <Bar dataKey="patients" fill="#007AFF" name="Total Patients" radius={[0, 6, 6, 0]} barSize={14} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardBody>
            </Card>
          )}

          {/* ─── Saudi Regional Command Center ─── */}
          <Card className="col-span-12">
            <CardHeader>
              <Globe className="w-4 h-4 text-primary" />
              <CardTitle>National Regional Command Center — المملكة العربية السعودية</CardTitle>
              <Badge variant="outline" className="ml-auto">13 Regions · Live</Badge>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-7 gap-2.5 mb-4">
                {[
                  { name: "Riyadh", ar: "الرياض", risk: "high", patients: 14200, highRisk: 31, coverage: 97, hospitals: 48, flag: "⚠ Diabetes surge" },
                  { name: "Makkah", ar: "مكة المكرمة", risk: "critical", patients: 9800, highRisk: 44, coverage: 95, hospitals: 36, flag: "🔴 Hypertension +12%" },
                  { name: "Madinah", ar: "المدينة المنورة", risk: "moderate", patients: 5400, highRisk: 8, coverage: 91, hospitals: 22, flag: null },
                  { name: "Eastern Province", ar: "المنطقة الشرقية", risk: "high", patients: 7600, highRisk: 22, coverage: 93, hospitals: 31, flag: "⚠ CKD elevated" },
                  { name: "Asir", ar: "عسير", risk: "moderate", patients: 3900, highRisk: 7, coverage: 84, hospitals: 18, flag: null },
                  { name: "Qassim", ar: "القصيم", risk: "low", patients: 2800, highRisk: 4, coverage: 89, hospitals: 14, flag: null },
                  { name: "Tabuk", ar: "تبوك", risk: "moderate", patients: 2100, highRisk: 6, coverage: 82, hospitals: 11, flag: null },
                  { name: "Hail", ar: "حائل", risk: "low", patients: 1600, highRisk: 3, coverage: 78, hospitals: 9, flag: null },
                  { name: "Jizan", ar: "جازان", risk: "high", patients: 2900, highRisk: 14, coverage: 76, hospitals: 13, flag: "⚠ Low coverage" },
                  { name: "Najran", ar: "نجران", risk: "moderate", patients: 1400, highRisk: 5, coverage: 72, hospitals: 8, flag: null },
                  { name: "Al Baha", ar: "الباحة", risk: "low", patients: 900, highRisk: 2, coverage: 71, hospitals: 6, flag: null },
                  { name: "Northern Border", ar: "الحدود الشمالية", risk: "low", patients: 700, highRisk: 1, coverage: 68, hospitals: 5, flag: null },
                  { name: "Al Jouf", ar: "الجوف", risk: "low", patients: 1100, highRisk: 2, coverage: 75, hospitals: 7, flag: null },
                ].map((region, i) => {
                  const cfg = {
                    critical: { bg: "bg-red-50", border: "border-red-300", badge: "destructive" as const, dot: "bg-red-500", bar: "#ef4444", label: "CRITICAL" },
                    high: { bg: "bg-orange-50", border: "border-orange-300", badge: "warning" as const, dot: "bg-orange-500", bar: "#f97316", label: "HIGH" },
                    moderate: { bg: "bg-amber-50", border: "border-amber-200", badge: "warning" as const, dot: "bg-amber-400", bar: "#f59e0b", label: "MODERATE" },
                    low: { bg: "bg-emerald-50", border: "border-emerald-200", badge: "success" as const, dot: "bg-emerald-500", bar: "#22c55e", label: "NORMAL" },
                  }[region.risk];
                  return (
                    <div key={i} className={`p-3.5 rounded-2xl border ${cfg.bg} ${cfg.border} flex flex-col gap-2`}>
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <p className="text-[11px] font-bold text-foreground leading-tight">{region.name}</p>
                          <p className="text-[10px] text-muted-foreground">{region.ar}</p>
                        </div>
                        <Badge variant={cfg.badge} className="text-[8px] shrink-0">{cfg.label}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0`} />
                        <span className="font-mono font-bold text-foreground">{region.patients.toLocaleString()}</span>
                        <span className="text-muted-foreground">patients</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[9px]">
                        <div>
                          <p className="text-muted-foreground">High Risk</p>
                          <p className={`font-bold tabular-nums ${region.highRisk > 10 ? "text-red-600" : "text-foreground"}`}>{region.highRisk}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Coverage</p>
                          <p className="font-bold tabular-nums">{region.coverage}%</p>
                        </div>
                      </div>
                      <div className="w-full bg-white/60 rounded-full h-1">
                        <div className="h-full rounded-full" style={{ width: `${region.coverage}%`, background: cfg.bar }} />
                      </div>
                      {region.flag && (
                        <p className="text-[9px] font-bold text-red-700 bg-red-100/80 px-2 py-0.5 rounded-lg">{region.flag}</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Summary strip */}
              <div className="flex items-center gap-6 px-5 py-3.5 bg-secondary rounded-2xl border border-border">
                {[
                  { label: "Critical Regions", value: "1", color: "text-red-600" },
                  { label: "High-Risk Regions", value: "3", color: "text-orange-600" },
                  { label: "Moderate Regions", value: "4", color: "text-amber-600" },
                  { label: "Normal Regions", value: "5", color: "text-emerald-600" },
                  { label: "Total Patients", value: "54.4K+", color: "text-primary" },
                  { label: "Avg Coverage", value: "83%", color: "text-primary" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="text-center flex-1">
                    <p className={`text-base font-bold tabular-nums ${color}`}>{value}</p>
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* National Intelligence Panel */}
          {intelligence && (
            <Card className="col-span-12">
              <CardHeader>
                <Brain className="w-4 h-4 text-violet-600" />
                <CardTitle>National AI Intelligence Platform</CardTitle>
                <Badge variant="outline" className="ml-auto">LIVE · v3.0</Badge>
              </CardHeader>
              <CardBody className="space-y-6">
                {/* AI Engine Status Row */}
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-amber-500" /> AI Engine Cluster — 9 Active Engines
                  </p>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { name: "Risk Scoring Engine", status: "online", version: "v4.2" },
                      { name: "Decision Engine", status: "online", version: "v3.0" },
                      { name: "Digital Twin Simulator", status: "online", version: "v2.1" },
                      { name: "Behavioral AI", status: "online", version: "v1.8" },
                      { name: "Recommendation Engine", status: "online", version: "v2.5" },
                      { name: "Policy Intelligence", status: "online", version: "v1.3" },
                      { name: "Multi-Agent Orchestrator", status: "online", version: "v1.0" },
                      { name: "Explainability Layer", status: "online", version: "v2.0" },
                      { name: "Unknown Pattern Detector", status: "standby", version: "v0.9" },
                    ].map((engine, i) => (
                      <div key={i} className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border ${engine.status === "online" ? "bg-emerald-50 border-emerald-200" : "bg-secondary border-border"}`}>
                        <div className={`w-2 h-2 rounded-full shrink-0 ${engine.status === "online" ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"}`} />
                        <div>
                          <p className="text-xs font-bold text-foreground">{engine.name}</p>
                          <p className="text-[10px] text-muted-foreground">{engine.version} · {engine.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Epidemic Radar */}
                {(intelligence as any)?.epidemicRadar && (intelligence as any).epidemicRadar.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Radio className="w-3.5 h-3.5 text-red-500" /> Epidemic Radar — Disease Surveillance
                    </p>
                    <div className="grid grid-cols-2 gap-2.5">
                      {(intelligence as any).epidemicRadar.map((item: any, i: number) => (
                        <div key={i} className={`flex items-start gap-3 px-4 py-3.5 rounded-2xl border ${
                          item.alert === "high" ? "bg-red-50 border-red-200" :
                          item.alert === "medium" ? "bg-amber-50 border-amber-200" :
                          "bg-secondary border-border"
                        }`}>
                          <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                            item.alert === "high" ? "bg-red-500" :
                            item.alert === "medium" ? "bg-amber-500" : "bg-muted-foreground"
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-bold text-foreground">{item.condition}</p>
                              <Badge variant={item.alert === "high" ? "destructive" : item.alert === "medium" ? "warning" : "outline"} className="text-[9px] shrink-0">{item.alert}</Badge>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{item.count} cases · {item.trend}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Policy Insights */}
                {(intelligence as any)?.policyInsights && (intelligence as any).policyInsights.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Lightbulb className="w-3.5 h-3.5 text-violet-500" /> AI Policy Intelligence Recommendations
                    </p>
                    <div className="space-y-2">
                      {(intelligence as any).policyInsights.map((insight: any, i: number) => (
                        <div key={i} className={`flex items-start gap-3 px-4 py-3.5 rounded-2xl border ${
                          insight.priority === "high" ? "bg-violet-50 border-violet-200" :
                          "bg-secondary border-border"
                        }`}>
                          <Target className="w-4 h-4 shrink-0 mt-0.5 text-violet-600" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-bold text-foreground">{insight.insight}</p>
                              <Badge variant={insight.priority === "high" ? "info" : "outline"} className="text-[9px] shrink-0">{insight.priority}</Badge>
                            </div>
                            {insight.action && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">→ {insight.action}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* National Metrics Footer */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "AI Decisions Today", value: (intelligence as any)?.aiDecisionsToday ?? "0", icon: Brain },
                    { label: "Event Bus Throughput", value: (intelligence as any)?.eventBusThroughput ?? "—", icon: Zap },
                    { label: "Audit Records", value: (intelligence as any)?.auditRecords ?? "0", icon: Target },
                    { label: "Avg Response Time", value: (intelligence as any)?.avgResponseMs ? `${(intelligence as any).avgResponseMs}ms` : "—", icon: Activity },
                  ].map((m, i) => (
                    <div key={i} className="px-4 py-3.5 bg-secondary rounded-2xl border border-border">
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5">
                        <m.icon className="w-3 h-3" /> {m.label}
                      </p>
                      <p className="text-xl font-bold text-foreground tabular-nums">{m.value}</p>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* ─── Hospital Performance Ranking ─── */}
          <Card className="col-span-12">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-primary" />
                <CardTitle>Hospital Performance Ranking — National League Table</CardTitle>
              </div>
              <Badge variant="outline" className="ml-auto">Top 12 · Composite Score</Badge>
            </CardHeader>
            <CardBody className="p-0">
              <table className="w-full data-table">
                <thead>
                  <tr>
                    <th className="w-10">Rank</th>
                    <th>Hospital</th>
                    <th>Region</th>
                    <th>Beds</th>
                    <th>Occupancy</th>
                    <th>AI Adoption</th>
                    <th>Avg LOS</th>
                    <th>Mortality Rate</th>
                    <th>Patient Score</th>
                    <th>Composite</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { rank: 1, name: "King Faisal Specialist Hospital", region: "Riyadh", beds: 1200, occupancy: 91, ai: 98, los: 4.2, mortality: 1.1, patient: 94, composite: 96 },
                    { rank: 2, name: "King Fahad Medical City", region: "Riyadh", beds: 1700, occupancy: 88, ai: 96, los: 4.8, mortality: 1.3, patient: 92, composite: 93 },
                    { rank: 3, name: "King Abdulaziz Medical City", region: "Riyadh", beds: 1500, occupancy: 86, ai: 94, los: 5.1, mortality: 1.4, patient: 91, composite: 91 },
                    { rank: 4, name: "Makkah Al-Mukarramah Hospital", region: "Makkah", beds: 900, occupancy: 94, ai: 89, los: 5.5, mortality: 1.8, patient: 88, composite: 87 },
                    { rank: 5, name: "King Khalid University Hospital", region: "Riyadh", beds: 820, occupancy: 82, ai: 91, los: 4.9, mortality: 1.5, patient: 90, composite: 86 },
                    { rank: 6, name: "Madinah General Hospital", region: "Madinah", beds: 640, occupancy: 79, ai: 82, los: 5.2, mortality: 1.9, patient: 87, composite: 82 },
                    { rank: 7, name: "Dammam Medical Complex", region: "Eastern Province", beds: 780, occupancy: 85, ai: 85, los: 5.7, mortality: 2.0, patient: 85, composite: 81 },
                    { rank: 8, name: "Asir Central Hospital", region: "Asir", beds: 520, occupancy: 77, ai: 74, los: 6.1, mortality: 2.2, patient: 82, composite: 76 },
                    { rank: 9, name: "Qassim Regional Hospital", region: "Qassim", beds: 460, occupancy: 73, ai: 70, los: 6.4, mortality: 2.4, patient: 80, composite: 72 },
                    { rank: 10, name: "Tabuk General Hospital", region: "Tabuk", beds: 390, occupancy: 68, ai: 62, los: 6.8, mortality: 2.7, patient: 78, composite: 67 },
                    { rank: 11, name: "Jizan Medical City", region: "Jizan", beds: 350, occupancy: 71, ai: 58, los: 7.1, mortality: 2.9, patient: 74, composite: 63 },
                    { rank: 12, name: "Najran General Hospital", region: "Najran", beds: 280, occupancy: 66, ai: 52, los: 7.5, mortality: 3.1, patient: 72, composite: 59 },
                  ].map((h) => {
                    const medal = h.rank <= 3 ? ["🥇", "🥈", "🥉"][h.rank - 1] : null;
                    const compositeColor = h.composite >= 90 ? "text-emerald-700 bg-emerald-50" : h.composite >= 75 ? "text-amber-700 bg-amber-50" : "text-red-700 bg-red-50";
                    const aiColor = h.ai >= 90 ? "text-emerald-600" : h.ai >= 75 ? "text-amber-600" : "text-red-600";
                    const mortalityColor = h.mortality < 1.5 ? "text-emerald-600" : h.mortality < 2.5 ? "text-amber-600" : "text-red-600";
                    return (
                      <tr key={h.rank} className={h.rank <= 3 ? "bg-amber-50/30" : ""}>
                        <td className="font-black text-center text-sm">{medal ? medal : `#${h.rank}`}</td>
                        <td className="font-bold text-foreground">{h.name}</td>
                        <td className="text-muted-foreground text-xs">{h.region}</td>
                        <td className="font-mono tabular-nums text-right">{h.beds.toLocaleString()}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-secondary rounded-full h-1.5 max-w-[60px]">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${h.occupancy}%` }} />
                            </div>
                            <span className="text-xs font-mono">{h.occupancy}%</span>
                          </div>
                        </td>
                        <td className={`font-bold text-xs ${aiColor}`}>{h.ai}%</td>
                        <td className="font-mono text-xs text-center">{h.los}d</td>
                        <td className={`font-bold text-xs ${mortalityColor}`}>{h.mortality}%</td>
                        <td className="font-mono text-xs text-center">{h.patient}/100</td>
                        <td>
                          <span className={`text-xs font-black px-2 py-0.5 rounded-full tabular-nums ${compositeColor}`}>{h.composite}</span>
                        </td>
                        <td>
                          <Badge variant={h.composite >= 85 ? "success" : h.composite >= 70 ? "warning" : "destructive"} className="text-[9px]">
                            {h.composite >= 85 ? "Excellent" : h.composite >= 70 ? "Good" : "Needs Improvement"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardBody>
          </Card>

          {/* Regional table */}
          {stats?.regionalStats && stats.regionalStats.length > 0 && (
            <Card className="col-span-12">
              <CardHeader>
                <CardTitle>Regional Health Overview</CardTitle>
                <Badge variant="outline">{stats.regionalStats.length} regions</Badge>
              </CardHeader>
              <table className="w-full data-table">
                <thead>
                  <tr>
                    <th>Region</th>
                    <th>Total Patients</th>
                    <th>Hospitals</th>
                    <th>High Risk Patients</th>
                    <th>Network Coverage</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.regionalStats.map((r: any, i: number) => (
                    <tr key={i}>
                      <td className="font-bold text-foreground">{r.region}</td>
                      <td className="font-mono tabular-nums">{r.patients?.toLocaleString()}</td>
                      <td className="tabular-nums">{r.hospitals}</td>
                      <td>
                        <span className={`font-mono font-bold ${r.highRisk > 5 ? "text-orange-600" : "text-muted-foreground"}`}>{r.highRisk ?? "—"}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="flex-1 bg-secondary rounded-full h-1.5 max-w-[100px]">
                            <div className="h-full bg-primary rounded-full" style={{ width: r.coverage }} />
                          </div>
                          <span className="text-xs text-muted-foreground font-mono">{r.coverage}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}
    </Layout>
  );
}
