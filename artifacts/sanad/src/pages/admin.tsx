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
