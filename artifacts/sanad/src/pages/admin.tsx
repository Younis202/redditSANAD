import React from "react";
import { Layout } from "@/components/layout";
import { PageHeader, Card, CardHeader, CardTitle, CardBody, KpiCard, Badge, AlertBanner, SectionDivider, PortalHero } from "@/components/shared";
import { useGetAdminStats, useGetPopulationHealth } from "@workspace/api-client-react";
import { useNationalIntelligence } from "@/hooks/use-ai-decision";
import {
  Users, Activity, ShieldAlert, Building, TrendingUp, AlertTriangle,
  Globe, Brain, Zap, Radio, Lightbulb, Target, Heart, CheckCircle2,
  Shield, Star, Settings, Lock
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";

const COLORS = ["#007AFF", "#34C759", "#FF9500", "#FF3B30", "#5856D6", "#32ADE6", "#AF52DE"];
const RISK_COLORS = { Low: "#22c55e", Medium: "#f59e0b", High: "#f97316", Critical: "#ef4444" };

const HOSPITALS = [
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
];

const REGIONS = [
  { name: "Riyadh", sub: "Central Region", risk: "high", patients: 14200, highRisk: 31, coverage: 97, hospitals: 48, flag: "Diabetes surge" },
  { name: "Makkah", sub: "Western Region", risk: "critical", patients: 9800, highRisk: 44, coverage: 95, hospitals: 36, flag: "Hypertension +12%" },
  { name: "Madinah", sub: "Western Region", risk: "moderate", patients: 5400, highRisk: 8, coverage: 91, hospitals: 22, flag: null },
  { name: "Eastern Province", sub: "Eastern Region", risk: "high", patients: 7600, highRisk: 22, coverage: 93, hospitals: 31, flag: "CKD elevated" },
  { name: "Asir", sub: "Southern Region", risk: "moderate", patients: 3900, highRisk: 7, coverage: 84, hospitals: 18, flag: null },
  { name: "Qassim", sub: "Central Region", risk: "low", patients: 2800, highRisk: 4, coverage: 89, hospitals: 14, flag: null },
  { name: "Tabuk", sub: "Northern Region", risk: "moderate", patients: 2100, highRisk: 6, coverage: 82, hospitals: 11, flag: null },
  { name: "Hail", sub: "Northern Region", risk: "low", patients: 1600, highRisk: 3, coverage: 78, hospitals: 9, flag: null },
  { name: "Jizan", sub: "Southern Region", risk: "high", patients: 2900, highRisk: 14, coverage: 76, hospitals: 13, flag: "Low coverage" },
  { name: "Najran", sub: "Southern Region", risk: "moderate", patients: 1400, highRisk: 5, coverage: 72, hospitals: 8, flag: null },
  { name: "Al Baha", sub: "Southern Region", risk: "low", patients: 900, highRisk: 2, coverage: 71, hospitals: 6, flag: null },
  { name: "Northern Border", sub: "Northern Region", risk: "low", patients: 700, highRisk: 1, coverage: 68, hospitals: 5, flag: null },
  { name: "Al Jouf", sub: "Northern Region", risk: "low", patients: 1100, highRisk: 2, coverage: 75, hospitals: 7, flag: null },
];

const RISK_CFG = {
  critical: { bg: "bg-red-50", borderColor: "#ef4444", dot: "bg-red-500", bar: "#ef4444", badge: "destructive" as const, label: "CRITICAL", heat: "rgba(239,68,68,0.12)", textColor: "text-red-800" },
  high:     { bg: "bg-orange-50", borderColor: "#f97316", dot: "bg-orange-500", bar: "#f97316", badge: "warning" as const, label: "HIGH", heat: "rgba(249,115,22,0.10)", textColor: "text-orange-800" },
  moderate: { bg: "bg-amber-50", borderColor: "#f59e0b", dot: "bg-amber-400", bar: "#f59e0b", badge: "warning" as const, label: "MODERATE", heat: "rgba(245,158,11,0.08)", textColor: "text-amber-800" },
  low:      { bg: "bg-emerald-50", borderColor: "#22c55e", dot: "bg-emerald-500", bar: "#22c55e", badge: "success" as const, label: "NORMAL", heat: "rgba(34,197,94,0.07)", textColor: "text-emerald-800" },
};

const IMPACT_TREND = [
  { month: "Jan", prevented: 4820, accepted: 58200 },
  { month: "Feb", prevented: 5140, accepted: 63400 },
  { month: "Mar", prevented: 5870, accepted: 72100 },
  { month: "Apr", prevented: 6230, accepted: 78400 },
  { month: "May", prevented: 6780, accepted: 84200 },
  { month: "Jun", prevented: 7120, accepted: 89100 },
  { month: "Jul", prevented: 7480, accepted: 94300 },
  { month: "Aug", prevented: 8100, accepted: 98200 },
  { month: "Sep", prevented: 8640, accepted: 103400 },
  { month: "Oct", prevented: 9180, accepted: 109100 },
  { month: "Nov", prevented: 9720, accepted: 114800 },
  { month: "Dec", prevented: 10300, accepted: 121200 },
];

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

      <PortalHero
        title="Ministry Analytics"
        subtitle="Real-time national infrastructure metrics and population health intelligence — Kingdom of Saudi Arabia."
        icon={Building}
        gradient="linear-gradient(135deg, #1f2937 0%, #0f172a 100%)"
        badge="Ministry of Health · KSA"
        stats={[
          { label: "Citizens", value: stats?.totalPatients ? `${(stats.totalPatients / 1_000_000).toFixed(1)}M` : "34M+" },
          { label: "Hospitals", value: stats?.totalHospitals ?? "450+" },
          { label: "AI Decisions / Day", value: stats?.aiDecisionsToday?.toLocaleString() ?? "847K" },
        ]}
        action={
          <span className="text-xs font-mono bg-white/20 text-white/70 rounded-xl px-3 py-2">
            {new Date().toLocaleString("en-SA", { dateStyle: "medium", timeStyle: "short" })}
          </span>
        }
      />

      {/* ─── KPI Row ─── */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <KpiCard title="Registered Patients" value={stats.totalPatients.toLocaleString()} sub="Active national records" icon={Users} iconBg="bg-primary/10" iconColor="text-primary" trend="+2.4%" />
          <KpiCard title="Visits Today" value={stats.totalVisitsToday.toLocaleString()} sub="Across all facilities" icon={Activity} iconBg="bg-primary/10" iconColor="text-primary" trend="+12%" />
          <KpiCard title="Drug Interactions Blocked" value={stats.drugInteractionsBlocked.toLocaleString()} sub="Conflicts prevented by AI" icon={ShieldAlert} iconBg="bg-primary/10" iconColor="text-primary" />
          <KpiCard title="Connected Hospitals" value={stats.hospitalsConnected.toLocaleString()} sub="Nationwide network" icon={Building} iconBg="bg-primary/10" iconColor="text-primary" />
        </div>
      )}

      {/* ─── Charts Grid ─── */}
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
                    <Pie data={popHealth.bloodTypeDistribution} innerRadius={50} outerRadius={70} paddingAngle={3} dataKey="count" nameKey="bloodType">
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
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <CardTitle>Patient Risk Distribution</CardTitle>
                </div>
                <Badge variant="warning">{stats.highRiskPatients} high / critical</Badge>
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

          {/* Risk by region */}
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

          {/* ─── Regional Command Center ─── */}
          <Card className="col-span-12">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                <CardTitle>National Regional Command Center — Kingdom of Saudi Arabia</CardTitle>
              </div>
              <Badge variant="outline" className="ml-auto">13 Regions · Live</Badge>
            </CardHeader>
            <CardBody>
              {/* Heatmap Legend */}
              <div className="flex items-center gap-5 mb-3 px-1">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">Risk Level:</span>
                {(["critical","high","moderate","low"] as const).map(r => (
                  <div key={r} className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${RISK_CFG[r].dot}`} />
                    <span className="text-[10px] font-bold" style={{ color: RISK_CFG[r].borderColor }}>{RISK_CFG[r].label}</span>
                  </div>
                ))}
                <span className="ml-auto text-[10px] text-muted-foreground">Cell intensity = patient load · Bar = network coverage</span>
              </div>
              <div className="grid grid-cols-7 gap-2.5 mb-4">
                {REGIONS.map((region, i) => {
                  const cfg = RISK_CFG[region.risk as keyof typeof RISK_CFG];
                  const highRiskPct = Math.round((region.highRisk / region.patients) * 1000) / 10;
                  return (
                    <div
                      key={i}
                      className="p-3.5 rounded-2xl flex flex-col gap-2 transition-all hover:scale-[1.02]"
                      style={{
                        background: cfg.heat,
                        border: `1.5px solid ${cfg.borderColor}40`,
                        boxShadow: `0 2px 12px ${cfg.borderColor}18`,
                      }}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <p className={`text-[11px] font-bold leading-tight ${cfg.textColor}`}>{region.name}</p>
                          <p className="text-[10px] text-muted-foreground">{region.sub}</p>
                        </div>
                        <Badge variant={cfg.badge} className="text-[8px] shrink-0">{cfg.label}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0`} />
                        <span className="font-mono font-bold text-foreground">{region.patients.toLocaleString()}</span>
                        <span className="text-muted-foreground">pts</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[9px]">
                        <div>
                          <p className="text-muted-foreground">High Risk</p>
                          <p className={`font-bold tabular-nums ${region.highRisk > 10 ? "text-red-600" : "text-foreground"}`}>{region.highRisk}% <span className="font-normal text-muted-foreground">({highRiskPct}%)</span></p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Coverage</p>
                          <p className={`font-bold tabular-nums ${region.coverage < 80 ? "text-red-600" : "text-foreground"}`}>{region.coverage}%</p>
                        </div>
                      </div>
                      <div className="w-full bg-white/70 rounded-full h-1.5">
                        <div className="h-full rounded-full" style={{ width: `${region.coverage}%`, background: cfg.bar }} />
                      </div>
                      {region.flag && (
                        <p className="text-[9px] font-bold px-2 py-0.5 rounded-lg" style={{ color: cfg.borderColor, background: `${cfg.borderColor}15` }}>⚠ {region.flag}</p>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-6 px-5 py-3.5 bg-secondary rounded-2xl">
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

          {/* ─── National AI Intelligence Panel ─── */}
          {intelligence && (
            <Card className="col-span-12">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-violet-600" />
                  <CardTitle>National AI Intelligence Platform</CardTitle>
                </div>
                <Badge variant="outline" className="ml-auto">LIVE · v3.0</Badge>
              </CardHeader>
              <CardBody className="space-y-6">

                {/* AI Engine Status */}
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
                      <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-secondary"
                        style={engine.status === "online" ? { borderLeft: "2px solid #22c55e" } : {}}>
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
                        <div key={i} className="flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-secondary"
                          style={item.alert === "high" ? { borderLeft: "3px solid #ef4444" } : item.alert === "medium" ? { borderLeft: "3px solid #f59e0b" } : {}}>
                          <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                            item.alert === "high" ? "bg-red-500" :
                            item.alert === "medium" ? "bg-amber-500" : "bg-muted-foreground"
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-bold text-foreground">{item.condition}</p>
                              <Badge variant={item.alert === "high" ? "destructive" : item.alert === "medium" ? "warning" : "outline"} className="text-[9px]">
                                {item.alert?.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{item.region} · {item.cases} cases</p>
                            {item.trend && <p className="text-[10px] text-muted-foreground mt-1">{item.trend}</p>}
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
                        <div key={i} className="flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-secondary"
                          style={insight.priority === "high" ? { borderLeft: "3px solid #8b5cf6" } : {}}>
                          <Target className="w-4 h-4 shrink-0 mt-0.5 text-violet-600" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-bold text-foreground">{insight.insight}</p>
                              <Badge variant={insight.priority === "high" ? "info" : "outline"} className="text-[9px] shrink-0">{insight.priority}</Badge>
                            </div>
                            {insight.action && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">{insight.action}</p>
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
                    <div key={i} className="px-4 py-3.5 bg-secondary rounded-2xl">
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

          {/* ─── National Disease Burden ─── */}
          <Card className="col-span-12">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                <CardTitle>National Disease Burden — Chronic Condition Prevalence by Region</CardTitle>
              </div>
              <Badge variant="outline" className="ml-auto">KSA 34M Citizens · 2025 Data</Badge>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Top Chronic Conditions — National Prevalence</p>
                  {[
                    { condition: "Hypertension", prevalence: 31.4, trend: "up", patients: "10.6M", color: "bg-red-500" },
                    { condition: "Type 2 Diabetes", prevalence: 27.6, trend: "up", patients: "9.4M", color: "bg-amber-500" },
                    { condition: "Obesity (BMI ≥30)", prevalence: 24.7, trend: "up", patients: "8.4M", color: "bg-orange-500" },
                    { condition: "Dyslipidemia", prevalence: 19.3, trend: "stable", patients: "6.6M", color: "bg-violet-500" },
                    { condition: "Coronary Artery Disease", prevalence: 8.2, trend: "down", patients: "2.8M", color: "bg-rose-500" },
                    { condition: "Chronic Kidney Disease", prevalence: 6.7, trend: "up", patients: "2.3M", color: "bg-blue-500" },
                    { condition: "COPD", prevalence: 4.1, trend: "stable", patients: "1.4M", color: "bg-sky-500" },
                    { condition: "Depression / Mental Health", prevalence: 3.8, trend: "up", patients: "1.3M", color: "bg-indigo-500" },
                  ].map((d, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-[11px] font-semibold text-foreground w-44 shrink-0 truncate">{d.condition}</span>
                      <div className="flex-1 bg-secondary rounded-full h-2">
                        <div className={`h-full rounded-full ${d.color}`} style={{ width: `${(d.prevalence / 35) * 100}%` }} />
                      </div>
                      <span className="text-[11px] font-bold tabular-nums text-foreground w-10 text-right">{d.prevalence}%</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 bg-secondary ${d.trend === "up" ? "text-red-600" : d.trend === "down" ? "text-emerald-600" : "text-muted-foreground"}`}>
                        {d.trend === "up" ? "Rising" : d.trend === "down" ? "Falling" : "Stable"}
                      </span>
                      <span className="text-[10px] text-muted-foreground w-10 shrink-0 text-right">{d.patients}</span>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">High-Burden Regions — AI Policy Alert Zones</p>
                  <div className="space-y-2.5">
                    {[
                      { region: "Riyadh", topCondition: "Diabetes + Hypertension", risk: "CRITICAL", pct: 94, level: "destructive" as const, bar: "bg-red-500" },
                      { region: "Makkah", topCondition: "Obesity + Cardiovascular", risk: "HIGH", pct: 81, level: "warning" as const, bar: "bg-orange-400" },
                      { region: "Madinah", topCondition: "Hypertension + CKD", risk: "HIGH", pct: 76, level: "warning" as const, bar: "bg-amber-400" },
                      { region: "Eastern Province", topCondition: "Dyslipidemia + CAD", risk: "MODERATE", pct: 62, level: "info" as const, bar: "bg-sky-400" },
                      { region: "Asir", topCondition: "COPD + Respiratory", risk: "MODERATE", pct: 57, level: "info" as const, bar: "bg-sky-400" },
                      { region: "Jizan", topCondition: "Infectious Disease + Malaria", risk: "MODERATE", pct: 53, level: "success" as const, bar: "bg-emerald-400" },
                    ].map((r, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Badge variant={r.level} className="text-[9px] shrink-0 w-20 justify-center">{r.risk}</Badge>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[11px] font-bold text-foreground truncate">{r.region}</span>
                            <span className="text-[10px] text-muted-foreground ml-2 shrink-0">{r.topCondition}</span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-1.5">
                            <div className={`h-full rounded-full ${r.bar}`} style={{ width: `${r.pct}%` }} />
                          </div>
                        </div>
                        <span className="text-[11px] font-bold tabular-nums text-foreground shrink-0">{r.pct}%</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 p-4 bg-secondary rounded-2xl" style={{ borderLeft: "3px solid #8b5cf6" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Settings className="w-3.5 h-3.5 text-violet-700" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-foreground">Policy Engine — AI Recommendations</p>
                    </div>
                    <div className="space-y-1.5">
                      {[
                        "Deploy 3 mobile diabetes clinics to Riyadh Northern Districts (est. 45K undiagnosed)",
                        "Expand CKD screening in Madinah — eGFR testing in all primary care centres",
                        "COPD awareness campaign targeting Jizan and Asir highland zones",
                      ].map((r, i) => (
                        <div key={i} className="flex items-start gap-2 text-[10px] text-violet-900">
                          <span className="shrink-0 font-bold text-violet-500">{i + 1}.</span>
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

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
                  {HOSPITALS.map((h) => {
                    const compositeColor = h.composite >= 90 ? "text-emerald-700 bg-secondary" : h.composite >= 75 ? "text-amber-700 bg-secondary" : "text-red-700 bg-secondary";
                    const aiColor = h.ai >= 90 ? "text-emerald-600" : h.ai >= 75 ? "text-amber-600" : "text-red-600";
                    const mortalityColor = h.mortality < 1.5 ? "text-emerald-600" : h.mortality < 2.5 ? "text-amber-600" : "text-red-600";
                    const rankColors = ["bg-amber-400 text-white", "bg-slate-400 text-white", "bg-orange-400 text-white"];
                    return (
                      <tr key={h.rank} style={h.rank <= 3 ? { borderLeft: "2px solid #f59e0b" } : {}}>
                        <td className="font-black text-center text-sm">
                          <span className={`inline-flex w-7 h-7 items-center justify-center rounded-lg text-[11px] font-black ${h.rank <= 3 ? rankColors[h.rank - 1] : "bg-secondary text-muted-foreground"}`}>
                            {h.rank}
                          </span>
                        </td>
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

          {/* ─── NCA Security & Compliance ─── */}
          <Card className="col-span-12">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                <CardTitle>National Cybersecurity Authority — Compliance & Data Governance</CardTitle>
              </div>
              <Badge variant="success" className="ml-auto">NCA Certified · April 2025</Badge>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-4 gap-4 mb-5">
                {[
                  { label: "NCA CSF Score", value: "94.2", sub: "Cyber Security Framework v2.0", color: "text-emerald-600", borderColor: "#10b981", dot: "bg-emerald-500" },
                  { label: "PDPL Compliance", value: "97.8%", sub: "Personal Data Protection Law", color: "text-blue-600", borderColor: "#3b82f6", dot: "bg-blue-500" },
                  { label: "Audit Trail Coverage", value: "99.97%", sub: "34M patient records audited", color: "text-violet-600", borderColor: "#8b5cf6", dot: "bg-violet-500" },
                  { label: "Security Events (30d)", value: "3", sub: "0 Critical · 0 High · 3 Medium", color: "text-amber-600", borderColor: "#f59e0b", dot: "bg-amber-500" },
                ].map((item, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-secondary" style={{ borderLeft: `3px solid ${item.borderColor}` }}>
                    <div className="flex items-start justify-between mb-2">
                      <span className={`w-2.5 h-2.5 rounded-full mt-1 ${item.dot}`} />
                      <span className={`text-2xl font-black tabular-nums ${item.color}`}>{item.value}</span>
                    </div>
                    <p className="text-sm font-bold text-foreground">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground">{item.sub}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Data Encryption Status</p>
                  {[
                    { layer: "In-Transit Encryption", protocol: "TLS 1.3", ok: true },
                    { layer: "At-Rest Encryption", protocol: "AES-256-GCM", ok: true },
                    { layer: "Database Encryption", protocol: "TDE — PostgreSQL", ok: true },
                    { layer: "Key Management", protocol: "HSM — FIPS 140-2 Level 3", ok: true },
                    { layer: "Backup Encryption", protocol: "AES-256 + SHA-512", ok: true },
                  ].map((e, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 bg-secondary rounded-xl">
                      <div>
                        <p className="text-xs font-semibold text-foreground">{e.layer}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{e.protocol}</p>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full bg-secondary ${e.ok ? "text-emerald-700" : "text-red-700"}`}>Active</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Compliance Certifications</p>
                  {[
                    { cert: "NCA Cyber Security Framework", status: "CERTIFIED", score: "94.2/100", dot: "bg-emerald-600" },
                    { cert: "PDPL (Saudi Data Protection)", status: "COMPLIANT", score: "97.8%", dot: "bg-blue-600" },
                    { cert: "ISO 27001 Information Security", status: "CERTIFIED", score: "Valid to Dec 2026", dot: "bg-emerald-600" },
                    { cert: "HIPAA-Equivalent Standard", status: "ALIGNED", score: "92.4%", dot: "bg-violet-600" },
                    { cert: "HL7 FHIR R4 Compliance", status: "CERTIFIED", score: "FHIR R4 Full", dot: "bg-sky-600" },
                    { cert: "MOH Clinical Data Standards", status: "CERTIFIED", score: "Version 3.1", dot: "bg-indigo-600" },
                  ].map((c, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-secondary rounded-xl">
                      <div className={`w-2 h-2 rounded-full ${c.dot} shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-foreground truncate">{c.cert}</p>
                        <p className="text-[9px] text-muted-foreground">{c.score}</p>
                      </div>
                      <span className={`text-[8px] font-black text-white px-1.5 py-0.5 rounded ${c.dot} shrink-0`}>{c.status}</span>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Security Event Log — Last 30 Days</p>
                  <div className="space-y-2 mb-4">
                    {[
                      { date: "Mar 28 2026", event: "Suspicious login pattern — 3 failed attempts", severity: "MEDIUM", resolved: true },
                      { date: "Mar 15 2026", event: "API rate limit exceeded — Eastern Province node", severity: "MEDIUM", resolved: true },
                      { date: "Mar 04 2026", event: "Certificate rotation — HSM key refresh", severity: "INFO", resolved: true },
                    ].map((ev, i) => (
                      <div key={i} className="px-3 py-2.5 rounded-xl text-xs bg-secondary"
                        style={ev.severity === "MEDIUM" ? { borderLeft: "3px solid #f59e0b" } : {}}>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${ev.severity === "MEDIUM" ? "bg-amber-500 text-white" : "bg-sky-500 text-white"}`}>{ev.severity}</span>
                          <span className="text-[10px] text-muted-foreground">{ev.date}</span>
                          {ev.resolved && <span className="text-[9px] font-bold text-emerald-600 ml-auto">Resolved</span>}
                        </div>
                        <p className="text-[11px] text-foreground font-medium">{ev.event}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 bg-secondary rounded-2xl" style={{ borderLeft: "3px solid #22c55e" }}>
                    <div className="flex items-center gap-2 mb-1">
                      <Lock className="w-3.5 h-3.5 text-emerald-700" />
                      <p className="text-[10px] font-black text-foreground uppercase tracking-widest">Security Posture</p>
                    </div>
                    <p className="text-sm font-bold text-foreground">Excellent — 0 Critical or High incidents in 90 days</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Last penetration test: Feb 2026 · Zero critical vulnerabilities</p>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* ─── Regional Stats Table ─── */}
          {stats?.regionalStats && stats.regionalStats.length > 0 && (
            <Card className="col-span-12">
              <CardHeader>
                <CardTitle>Regional Health Overview</CardTitle>
                <Badge variant="outline">{stats.regionalStats.length} regions</Badge>
              </CardHeader>
              <CardBody className="p-0">
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
              </CardBody>
            </Card>
          )}

        </div>
      )}

      {/* ─── National AI Clinical Impact Tracker ─── */}
      <SectionDivider label="National AI Clinical Impact — Real-Time" />

      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-red-500" />
            <span className="text-sm font-bold text-foreground">AI Clinical Performance — Kingdom of Saudi Arabia</span>
            <Badge variant="success" className="text-[10px]">Live · Updated hourly</Badge>
          </div>
          <span className="text-[11px] text-muted-foreground font-mono bg-secondary px-3 py-1.5 rounded-full">
            Fiscal Year 2025 · MOH Performance Dashboard
          </span>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <KpiCard title="Lives Directly Impacted" value="2.84M" sub="Patients with AI-driven care decisions" icon={Heart} iconBg="bg-primary/10" iconColor="text-primary" />
          <KpiCard title="AI Recommendations Accepted" value="847K" sub="By physicians YTD 2025" icon={Brain} iconBg="bg-primary/10" iconColor="text-primary" />
          <KpiCard title="Hospitalizations Prevented" value="73,481" sub="AI early intervention" icon={CheckCircle2} iconBg="bg-primary/10" iconColor="text-primary" />
          <KpiCard title="Healthcare Savings" value="SAR 4.7B" sub="Direct AI cost avoidance YTD" icon={Star} iconBg="bg-primary/10" iconColor="text-primary" />
        </div>

        <div className="grid grid-cols-12 gap-5">
          <Card className="col-span-8">
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <CardTitle>AI Clinical Outcomes — Monthly YTD 2025</CardTitle>
              </div>
              <Badge variant="info" className="text-[10px]">vs. pre-AI baseline (2022)</Badge>
            </CardHeader>
            <CardBody>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={IMPACT_TREND} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11 }} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11 }} />
                    <RechartsTooltip contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line yAxisId="left" type="monotone" dataKey="prevented" name="Hospitalizations Prevented" stroke="#ef4444" strokeWidth={2.5} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="accepted" name="AI Recommendations Accepted" stroke="#7c3aed" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>

          <Card className="col-span-4">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-600" />
                <CardTitle>AI Portal Adoption Rate</CardTitle>
              </div>
            </CardHeader>
            <CardBody className="space-y-3">
              {[
                { portal: "Emergency Portal", adoption: 98, users: 2847, color: "bg-red-500" },
                { portal: "Doctor Decision Engine", adoption: 89, users: 12480, color: "bg-violet-500" },
                { portal: "Pharmacy AI", adoption: 94, users: 4210, color: "bg-primary" },
                { portal: "Lab AI Summary", adoption: 87, users: 6820, color: "bg-emerald-500" },
                { portal: "Insurance Pre-Auth", adoption: 76, users: 1920, color: "bg-amber-500" },
                { portal: "Family Risk Engine", adoption: 71, users: 3140, color: "bg-pink-500" },
                { portal: "Research Hypothesis AI", adoption: 64, users: 480, color: "bg-indigo-500" },
              ].map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-foreground">{item.portal}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">{item.users.toLocaleString()} users</span>
                      <span className="text-xs font-bold text-primary">{item.adoption}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${item.color}`} style={{ width: `${item.adoption}%` }} />
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-5">
          {[
            {
              title: "Critical Condition Interventions",
              icon: ShieldAlert,
              iconColor: "text-red-600",
              iconBg: "bg-primary/10",
              items: [
                { label: "Sepsis Early Warnings Fired", value: "18,420", trend: "+23% vs 2024" },
                { label: "DKA Episodes Prevented", value: "4,281", trend: "+41% catch rate" },
                { label: "Stroke Alerts Triggered", value: "2,847", trend: "Avg 8 min earlier" },
                { label: "Cardiac Arrest Predictions", value: "1,240", trend: "92% accuracy" },
                { label: "Drug Interactions Blocked", value: "94,382", trend: "0 fatalities" },
              ],
            },
            {
              title: "Population Health AI Improvements",
              icon: Activity,
              iconColor: "text-emerald-600",
              iconBg: "bg-primary/10",
              items: [
                { label: "DM HbA1c Control Rate", value: "68%", trend: "+27% vs pre-AI" },
                { label: "HTN BP Control (<130/80)", value: "72%", trend: "+24% improvement" },
                { label: "Medication Adherence", value: "84%", trend: "+28% via AI nudges" },
                { label: "Screening Compliance", value: "91%", trend: "+45% AI reminders" },
                { label: "Obesity Interventions", value: "134K", trend: "Lifestyle AI program" },
              ],
            },
            {
              title: "Healthcare System Efficiency",
              icon: Zap,
              iconColor: "text-primary",
              iconBg: "bg-primary/10",
              items: [
                { label: "30-Day Readmission Rate", value: "8.2%", trend: "-44% vs national avg" },
                { label: "Avg ER Wait Time", value: "12 min", trend: "-67% via AI triage" },
                { label: "Unnecessary Tests Prevented", value: "241K", trend: "SAR 1.8B saved" },
                { label: "Avg Diagnosis Time", value: "4.2 min", trend: "-89% vs manual" },
                { label: "Pharmacy Errors Caught", value: "28,471", trend: "0 dispensing fatalities" },
              ],
            },
          ].map((section, i) => {
            const Icon = section.icon;
            return (
              <Card key={i}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${section.iconBg}`}>
                      <Icon className={`w-4 h-4 ${section.iconColor}`} />
                    </div>
                    <CardTitle>{section.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardBody className="space-y-2.5">
                  {section.items.map((item, j) => (
                    <div key={j} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">{item.value}</p>
                        <p className="text-[10px] text-emerald-600 font-semibold">{item.trend}</p>
                      </div>
                    </div>
                  ))}
                </CardBody>
              </Card>
            );
          })}
        </div>
      </div>

    </Layout>
  );
}
