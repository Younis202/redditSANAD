import React from "react";
import { Layout } from "@/components/layout";
import {
  Card, CardHeader, CardTitle, CardBody,
  Badge, PageHeader, KpiCard
} from "@/components/shared";
import {
  Building2, BedDouble, Users, Brain, Activity, AlertTriangle,
  TrendingUp, Zap, Lightbulb, ChevronRight
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

export default function HospitalPortal() {
  const { data, isLoading } = useQuery({
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

  return (
    <Layout role="hospital">
      <PageHeader
        title={data?.hospitalName ?? "Hospital Portal"}
        subtitle="Bed management · AI capacity · Priority queue"
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
          title="Admissions Today"
          value={data?.admissionsToday ?? "—"}
          icon={Activity}
          sub={`${data?.dischargesToday} discharges today`}
        />
        <KpiCard
          title="Avg Length of Stay"
          value={`${data?.avgLengthOfStay} days`}
          icon={Zap}
          sub={`${data?.pendingSurgeries} pending surgeries`}
        />
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Bed Status Grid */}
        <Card className="col-span-8">
          <CardHeader>
            <BedDouble className="w-4 h-4 text-blue-600" />
            <CardTitle>Bed Occupancy by Unit</CardTitle>
            <span className="ml-auto text-[10px] font-mono text-muted-foreground">Live · updates every 60s</span>
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

        {/* Staff KPIs */}
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
                  <p className="text-[10px] font-bold text-muted-foreground">Doctor : Patient Ratio</p>
                  <p className="text-xs font-bold text-primary font-mono">{data?.staffKPIs?.doctorPatientRatio}</p>
                </div>
                <div className="flex items-center justify-between px-3.5 py-2 bg-primary/5 border border-primary/15 rounded-xl">
                  <p className="text-[10px] font-bold text-muted-foreground">Nurse : Patient Ratio</p>
                  <p className="text-xs font-bold text-primary font-mono">{data?.staffKPIs?.nursePatientRatio}</p>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* AI Capacity Insights */}
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

        {/* Priority Queue */}
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
                    <td>
                      <Badge variant={style.badge} className="text-[9px]">{p.priority}</Badge>
                    </td>
                    <td>
                      <p className="font-bold text-foreground">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{p.nationalId}</p>
                    </td>
                    <td className="tabular-nums">{p.age}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold tabular-nums ${
                          p.riskScore >= 70 ? "text-red-600" : p.riskScore >= 50 ? "text-amber-600" : "text-foreground"
                        }`}>{p.riskScore}</span>
                        <div className="w-16 bg-secondary rounded-full h-1.5">
                          <div
                            className={`h-full rounded-full ${p.riskScore >= 70 ? "bg-red-500" : p.riskScore >= 50 ? "bg-amber-500" : "bg-emerald-500"}`}
                            style={{ width: `${p.riskScore}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {p.chronicConditions.slice(0, 2).map((c: string) => (
                          <span key={c} className="text-[9px] bg-secondary px-1.5 py-0.5 rounded-full font-medium">{c}</span>
                        ))}
                        {p.chronicConditions.length > 2 && (
                          <span className="text-[9px] text-muted-foreground">+{p.chronicConditions.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        p.suggestedWard === "ICU" ? "bg-red-100 text-red-700" :
                        p.suggestedWard === "Emergency" ? "bg-amber-100 text-amber-700" :
                        "bg-sky-100 text-sky-700"
                      }`}>{p.suggestedWard}</span>
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
    </Layout>
  );
}
