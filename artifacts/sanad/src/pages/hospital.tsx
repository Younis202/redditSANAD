import React, { useState } from "react";
import { Layout } from "@/components/layout";
import {
  Card, CardHeader, CardTitle, CardBody,
  Badge, PageHeader, KpiCard
} from "@/components/shared";
import {
  Building2, BedDouble, Users, Brain, Activity, AlertTriangle,
  TrendingUp, Zap, Lightbulb, ChevronRight, Stethoscope, Clock,
  HeartPulse, RefreshCw, CheckCircle2
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

async function fetchHospitalOverview() {
  const res = await fetch("/api/hospital/overview");
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

const UNIT_COLORS: Record<string, string> = {
  Icu: "#ef4444",
  General: "#007AFF",
  Emergency: "#f59e0b",
  Pediatric: "#22c55e",
  Maternity: "#a855f7",
  Surgical: "#06b6d4",
};

const PRIORITY_COLORS = {
  immediate: { bg: "bg-red-50", border: "border-red-300", badge: "destructive" as const, text: "text-red-600" },
  urgent: { bg: "bg-amber-50", border: "border-amber-200", badge: "warning" as const, text: "text-amber-600" },
  soon: { bg: "bg-sky-50", border: "border-sky-200", badge: "info" as const, text: "text-sky-600" },
};

const OR_STATUS = {
  in_progress: { bg: "bg-green-50", border: "border-green-200", badge: "success" as const, label: "In Progress", dot: "bg-green-500 animate-pulse" },
  scheduled: { bg: "bg-sky-50", border: "border-sky-200", badge: "info" as const, label: "Scheduled", dot: "bg-sky-500" },
  emergency: { bg: "bg-red-50", border: "border-red-300", badge: "destructive" as const, label: "Emergency", dot: "bg-red-500 animate-pulse" },
};

type TabId = "overview" | "icu" | "or" | "readmission";

export default function HospitalPortal() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["hospital-overview"],
    queryFn: fetchHospitalOverview,
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <Layout role="hospital">
        <div className="flex items-center justify-center gap-3 py-20 text-muted-foreground">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
          <span className="text-sm font-medium">Loading hospital operations...</span>
        </div>
      </Layout>
    );
  }

  const icuCritical = (data?.icuAlerts ?? []).filter((a: any) => a.severity === "critical").length;

  return (
    <Layout role="hospital">
      <div className="flex items-center gap-2 mb-5">
        <div className="flex items-center gap-2 bg-blue-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-full uppercase tracking-widest">
          <Building2 className="w-3 h-3" />
          Hospital Operations Center
        </div>
        {icuCritical > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-full ml-2 animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            {icuCritical} ICU Critical Alert{icuCritical > 1 ? "s" : ""}
          </div>
        )}
        <button
          onClick={() => refetch()}
          className="ml-auto flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground bg-white border border-black/[0.08] px-3 py-1.5 rounded-full hover:text-foreground transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
        <span className="text-[11px] font-mono text-muted-foreground">Live · auto-refresh 60s</span>
      </div>

      <PageHeader
        title={data?.hospitalName ?? "Hospital Portal"}
        subtitle="Bed management · ICU alerts · OR scheduling · Readmission risk"
      />

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        <KpiCard
          title="Total Beds"
          value={data?.totalBeds?.toLocaleString() ?? "—"}
          icon={BedDouble}
          sub={`${data?.overallOccupancy}% occupied`}
          trend={data?.overallOccupancy >= 80 ? "High Occupancy" : "Normal"}
        />
        <KpiCard
          title="Occupied Beds"
          value={data?.totalOccupied?.toLocaleString() ?? "—"}
          icon={Users}
          sub={`${(data?.totalBeds ?? 0) - (data?.totalOccupied ?? 0)} available`}
        />
        <KpiCard
          title="OR Today"
          value={data?.pendingSurgeries ?? "—"}
          icon={Stethoscope}
          sub={`${(data?.orSchedule ?? []).filter((s: any) => s.status === "in_progress").length} in progress`}
        />
        <KpiCard
          title="Avg Length of Stay"
          value={`${data?.avgLengthOfStay} days`}
          icon={Zap}
          sub={`${data?.dischargesToday} discharges today`}
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-5">
        {([
          { id: "overview", label: "Bed Overview" },
          { id: "icu", label: `ICU Alerts ${icuCritical > 0 ? `(${icuCritical} critical)` : ""}` },
          { id: "or", label: "OR Schedule" },
          { id: "readmission", label: "Readmission Risk" },
        ] as { id: TabId; label: string }[]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              activeTab === tab.id
                ? tab.id === "icu" && icuCritical > 0
                  ? "bg-red-600 text-white"
                  : "bg-primary text-white"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-12 gap-4">
          <Card className="col-span-8">
            <CardHeader>
              <BedDouble className="w-4 h-4 text-blue-600" />
              <CardTitle>Bed Occupancy by Unit</CardTitle>
              <span className="ml-auto text-[10px] font-mono text-muted-foreground">Live data</span>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-3 gap-3">
                {data?.bedStatus?.map((unit: any) => {
                  const color = UNIT_COLORS[unit.unit] ?? "#007AFF";
                  return (
                    <div key={unit.unitKey} className={`p-4 rounded-2xl border ${
                      unit.status === "critical" ? "bg-red-50 border-red-200" :
                      unit.status === "high" ? "bg-amber-50 border-amber-200" :
                      "bg-secondary border-border"
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-bold text-foreground">{unit.unit}</p>
                        <Badge variant={
                          unit.status === "critical" ? "destructive" :
                          unit.status === "high" ? "warning" :
                          unit.status === "moderate" ? "info" : "success"
                        } className="text-[9px]">
                          {unit.status}
                        </Badge>
                      </div>
                      <div className="flex items-end justify-between mb-2">
                        <div>
                          <p className="text-3xl font-bold tabular-nums" style={{ color }}>{unit.occupancyPct}%</p>
                          <p className="text-[10px] text-muted-foreground">occupancy</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-foreground">{unit.occupied} / {unit.total}</p>
                          <p className="text-[10px] text-muted-foreground">{unit.available} available</p>
                        </div>
                      </div>
                      <div className="w-full bg-background rounded-full h-2">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${unit.occupancyPct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          <Card className="col-span-4">
            <CardHeader>
              <Users className="w-4 h-4 text-blue-600" />
              <CardTitle>Staff Allocation</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                {[
                  { label: "Total Doctors", value: data?.staffKPIs?.doctors, icon: "👨‍⚕️" },
                  { label: "Total Nurses", value: data?.staffKPIs?.nurses, icon: "👩‍⚕️" },
                  { label: "Specialists", value: data?.staffKPIs?.specialists, icon: "🧠" },
                  { label: "Currently On Duty", value: data?.staffKPIs?.onDuty, icon: "✅" },
                  { label: "Available for Call", value: data?.staffKPIs?.available, icon: "📞" },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between px-3.5 py-2.5 bg-secondary rounded-2xl">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{item.icon}</span>
                      <p className="text-xs font-semibold text-foreground">{item.label}</p>
                    </div>
                    <p className="text-sm font-bold tabular-nums text-foreground">{item.value?.toLocaleString()}</p>
                  </div>
                ))}
                <div className="pt-1 space-y-1.5">
                  <div className="flex items-center justify-between px-3.5 py-2 bg-primary/5 border border-primary/15 rounded-xl">
                    <p className="text-[10px] font-bold text-muted-foreground">Doctor : Patient</p>
                    <p className="text-xs font-bold text-primary font-mono">{data?.staffKPIs?.doctorPatientRatio}</p>
                  </div>
                  <div className="flex items-center justify-between px-3.5 py-2 bg-primary/5 border border-primary/15 rounded-xl">
                    <p className="text-[10px] font-bold text-muted-foreground">Nurse : Patient</p>
                    <p className="text-xs font-bold text-primary font-mono">{data?.staffKPIs?.nursePatientRatio}</p>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="col-span-12">
            <CardHeader>
              <Brain className="w-4 h-4 text-violet-600" />
              <CardTitle>AI Capacity Intelligence</CardTitle>
              <Badge variant="outline" className="ml-auto">Predictive Analysis</Badge>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 gap-3">
                {data?.aiCapacityInsights?.map((insight: string, i: number) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3.5 bg-secondary rounded-2xl border border-border">
                    <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground">{insight}</p>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card className="col-span-12">
            <CardHeader>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <CardTitle>AI Priority Patient Queue</CardTitle>
              <Badge variant="outline" className="ml-auto">Sorted by AI Risk Score · High → Low</Badge>
            </CardHeader>
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Patient</th>
                  <th>Age</th>
                  <th>Risk Score</th>
                  <th>Conditions</th>
                  <th>Suggested Ward</th>
                  <th>Last Visit</th>
                </tr>
              </thead>
              <tbody>
                {data?.priorityQueue?.map((p: any, i: number) => {
                  const style = PRIORITY_COLORS[p.priority as keyof typeof PRIORITY_COLORS] ?? PRIORITY_COLORS.soon;
                  return (
                    <tr key={p.id} className={i < 3 ? "bg-red-50/20" : ""}>
                      <td><Badge variant={style.badge} className="text-[9px]">{p.priority}</Badge></td>
                      <td>
                        <p className="font-bold text-foreground">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{p.nationalId}</p>
                      </td>
                      <td className="tabular-nums">{p.age}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold tabular-nums ${p.riskScore >= 70 ? "text-red-600" : p.riskScore >= 50 ? "text-amber-600" : "text-foreground"}`}>{p.riskScore}</span>
                          <div className="w-16 bg-secondary rounded-full h-1.5">
                            <div className={`h-full rounded-full ${p.riskScore >= 70 ? "bg-red-500" : p.riskScore >= 50 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${p.riskScore}%` }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {p.chronicConditions.slice(0, 2).map((c: string) => (
                            <span key={c} className="text-[9px] bg-secondary px-1.5 py-0.5 rounded-full font-medium">{c}</span>
                          ))}
                          {p.chronicConditions.length > 2 && <span className="text-[9px] text-muted-foreground">+{p.chronicConditions.length - 2}</span>}
                        </div>
                      </td>
                      <td>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${p.suggestedWard === "ICU" ? "bg-red-100 text-red-700" : p.suggestedWard === "Emergency" ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"}`}>{p.suggestedWard}</span>
                      </td>
                      <td className="text-[10px] text-muted-foreground font-mono">
                        {p.lastVisit ? `${p.lastVisit.date} · ${p.lastVisit.department}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {activeTab === "icu" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 border-2 border-red-300 rounded-2xl">
            <HeartPulse className="w-5 h-5 text-red-600 shrink-0" />
            <div>
              <p className="text-sm font-bold text-red-800">ICU Alert System — Real-time Patient Monitoring</p>
              <p className="text-xs text-red-600 mt-0.5">{(data?.icuAlerts ?? []).length} patients flagged · {icuCritical} require immediate action</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {(data?.icuAlerts ?? []).map((alert: any, i: number) => (
              <div key={i} className={`p-5 rounded-2xl border-2 ${alert.severity === "critical" ? "bg-red-50 border-red-300" : "bg-amber-50 border-amber-200"}`}>
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${alert.severity === "critical" ? "bg-red-100" : "bg-amber-100"}`}>
                    <AlertTriangle className={`w-5 h-5 ${alert.severity === "critical" ? "text-red-600" : "text-amber-600"}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-bold text-foreground">{alert.name}</p>
                      <Badge variant={alert.severity === "critical" ? "destructive" : "warning"} className="text-[9px]">{alert.severity.toUpperCase()}</Badge>
                    </div>
                    <p className="text-[10px] font-mono text-muted-foreground">{alert.nationalId}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-2xl font-bold ${alert.riskScore >= 90 ? "text-red-600" : "text-amber-600"}`}>{alert.riskScore}</p>
                    <p className="text-[10px] text-muted-foreground">risk score</p>
                  </div>
                </div>

                <div className={`px-3 py-2 rounded-xl mb-2 ${alert.severity === "critical" ? "bg-red-100" : "bg-amber-100"}`}>
                  <p className={`text-xs font-bold ${alert.severity === "critical" ? "text-red-800" : "text-amber-800"}`}>{alert.alertType}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className={`w-3 h-3 ${alert.severity === "critical" ? "text-red-600" : "text-amber-600"}`} />
                    <p className={`text-[11px] font-bold ${alert.severity === "critical" ? "text-red-600" : "text-amber-600"}`}>Time window: {alert.timeWindow}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {alert.conditions.map((c: string, ci: number) => (
                    <span key={ci} className="text-[10px] font-semibold bg-white/80 border border-red-100 text-red-700 px-2 py-0.5 rounded-full">{c}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "or" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-sky-50 border border-sky-200 rounded-2xl">
            <Stethoscope className="w-5 h-5 text-sky-600 shrink-0" />
            <div>
              <p className="text-sm font-bold text-sky-800">Operating Room Schedule — Today</p>
              <p className="text-xs text-sky-600 mt-0.5">{(data?.orSchedule ?? []).length} procedures · {(data?.orSchedule ?? []).filter((s: any) => s.status === "in_progress").length} in progress · {(data?.orSchedule ?? []).filter((s: any) => s.status === "emergency").length} emergency</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <Stethoscope className="w-4 h-4 text-sky-600" />
              <CardTitle>OR Schedule</CardTitle>
              <Badge variant="outline" className="ml-auto">{(data?.orSchedule ?? []).length} procedures today</Badge>
            </CardHeader>
            <div className="divide-y divide-border">
              {(data?.orSchedule ?? []).map((op: any, i: number) => {
                const cfg = OR_STATUS[op.status as keyof typeof OR_STATUS] ?? OR_STATUS.scheduled;
                return (
                  <div key={i} className={`p-5 ${op.status === "emergency" ? "bg-red-50/30" : op.status === "in_progress" ? "bg-green-50/30" : ""}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg} border ${cfg.border}`}>
                        <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-bold text-foreground">{op.procedure}</p>
                          <Badge variant={cfg.badge} className="text-[9px]">{cfg.label}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{op.patient} · {op.surgeon}</p>
                      </div>
                      <div className="text-right shrink-0 space-y-0.5">
                        <p className="text-sm font-bold text-foreground">{op.room}</p>
                        <div className="flex items-center gap-1.5 justify-end">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">{op.scheduledTime} · {op.estimatedDuration}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {activeTab === "readmission" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-violet-50 border border-violet-200 rounded-2xl">
            <Brain className="w-5 h-5 text-violet-600 shrink-0" />
            <div>
              <p className="text-sm font-bold text-violet-800">AI Readmission Risk Analysis</p>
              <p className="text-xs text-violet-600 mt-0.5">Patients with highest 30-day readmission probability — AI-calculated from clinical history</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <TrendingUp className="w-4 h-4 text-violet-600" />
              <CardTitle>Readmission Risk — Top Patients</CardTitle>
              <Badge variant="outline" className="ml-auto">Sorted by risk %</Badge>
            </CardHeader>
            <div className="divide-y divide-border">
              {(data?.readmissionRisks ?? []).map((p: any, i: number) => (
                <div key={i} className={`p-5 ${p.readmissionRisk >= 80 ? "bg-red-50/30" : p.readmissionRisk >= 60 ? "bg-amber-50/20" : ""}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 ${p.readmissionRisk >= 80 ? "bg-red-100" : p.readmissionRisk >= 60 ? "bg-amber-100" : "bg-secondary"}`}>
                      <p className={`text-lg font-bold tabular-nums ${p.readmissionRisk >= 80 ? "text-red-700" : p.readmissionRisk >= 60 ? "text-amber-700" : "text-foreground"}`}>{p.readmissionRisk}%</p>
                      <p className="text-[9px] text-muted-foreground">risk</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground">{p.name}</p>
                      <p className="text-[10px] font-mono text-muted-foreground mb-1">{p.nationalId}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold bg-secondary px-2 py-0.5 rounded-full text-foreground">{p.primaryReason}</span>
                        <span className="text-[10px] text-muted-foreground">Last discharge: {p.lastDischarge}</span>
                      </div>
                    </div>
                    <div className="shrink-0 max-w-[200px] text-right">
                      <div className={`flex items-start gap-1.5 px-3 py-2 rounded-xl ${p.readmissionRisk >= 80 ? "bg-red-50 border border-red-200" : "bg-secondary border border-border"}`}>
                        <ChevronRight className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${p.readmissionRisk >= 80 ? "text-red-500" : "text-primary"}`} />
                        <p className={`text-[11px] font-semibold ${p.readmissionRisk >= 80 ? "text-red-700" : "text-foreground"}`}>{p.recommendedAction}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </Layout>
  );
}
