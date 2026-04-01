import React, { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardHeader, CardTitle, CardBody, Badge } from "@/components/shared";
import {
  Building2, BedDouble, Users, Brain, Activity, AlertTriangle,
  TrendingUp, Zap, Lightbulb, ChevronRight, Stethoscope, Clock,
  HeartPulse, RefreshCw, CheckCircle2, Scissors, Wifi, ArrowUp,
  ArrowDown, Shield, Flame, Thermometer, Droplets
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

async function fetchHospitalOverview() {
  const res = await fetch("/api/hospital/overview");
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

const UNIT_COLORS: Record<string, string> = {
  Icu: "#ef4444",
  General: "#3b82f6",
  Emergency: "#f59e0b",
  Pediatric: "#22c55e",
  Maternity: "#a855f7",
  Surgical: "#06b6d4",
};

const PRIORITY_COLORS = {
  immediate: { borderColor: "#ef4444", badge: "destructive" as const, label: "Immediate" },
  urgent:    { borderColor: "#f59e0b", badge: "warning"     as const, label: "Urgent" },
  soon:      { borderColor: "#0ea5e9", badge: "info"        as const, label: "Soon" },
};

const OR_STATUS = {
  in_progress: { color: "#22c55e",  label: "In Progress",  dot: "bg-emerald-400 animate-pulse" },
  scheduled:   { color: "#3b82f6",  label: "Scheduled",    dot: "bg-blue-400" },
  emergency:   { color: "#ef4444",  label: "Emergency",    dot: "bg-red-500 animate-pulse" },
};

type TabId = "overview" | "icu" | "or" | "readmission" | "flow";

const TABS: { id: TabId; label: string; icon: React.ElementType; alert?: boolean }[] = [
  { id: "overview",     label: "Bed Overview",       icon: BedDouble },
  { id: "icu",          label: "ICU Alerts",         icon: HeartPulse, alert: true },
  { id: "or",           label: "OR Schedule",        icon: Scissors },
  { id: "readmission",  label: "Readmission Risk",   icon: TrendingUp },
  { id: "flow",         label: "AI Patient Flow",    icon: Brain },
];

function RiskRing({ pct, size = 56 }: { pct: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const filled = circ * (pct / 100);
  const color = pct >= 80 ? "#ef4444" : pct >= 60 ? "#f59e0b" : "#3b82f6";
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${filled} ${circ - filled}`} strokeLinecap="round" />
    </svg>
  );
}

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
        <div className="flex flex-col items-center justify-center gap-4 py-32">
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center"
            style={{ background: "rgba(37,99,235,0.10)", border: "1px solid rgba(37,99,235,0.20)" }}>
            <Building2 className="w-7 h-7 text-blue-400 animate-pulse" />
          </div>
          <p className="text-sm font-bold text-muted-foreground">Loading hospital operations...</p>
        </div>
      </Layout>
    );
  }

  const icuCritical = (data?.icuAlerts ?? []).filter((a: any) => a.severity === "critical").length;
  const available = (data?.totalBeds ?? 0) - (data?.totalOccupied ?? 0);
  const occupancyHigh = (data?.overallOccupancy ?? 0) >= 80;
  const inProgress = (data?.orSchedule ?? []).filter((s: any) => s.status === "in_progress").length;

  return (
    <Layout role="hospital">

      {/* ══════════════════════════════════════════════════════════════════
          HOSPITAL OPERATIONS COMMAND CENTER HEADER
      ══════════════════════════════════════════════════════════════════ */}
      <div className="rounded-3xl overflow-hidden mb-6"
        style={{
          background: "linear-gradient(135deg, #020916 0%, #030d1e 45%, #020b18 100%)",
          boxShadow: "0 0 0 1px rgba(37,99,235,0.12), 0 8px 40px rgba(0,0,0,0.50), 0 0 80px rgba(37,99,235,0.06)"
        }}>

        {/* Top accent bar */}
        <div className="h-[3px]" style={{ background: "linear-gradient(90deg, transparent, #1e3a8a 10%, #2563eb 30%, #60a5fa 50%, #2563eb 70%, #1e3a8a 90%, transparent)" }} />

        {/* ICU critical banner */}
        {icuCritical > 0 && (
          <div className="flex items-center gap-2 px-6 py-2.5"
            style={{ background: "linear-gradient(90deg, rgba(220,38,38,0.20) 0%, rgba(220,38,38,0.10) 100%)", borderBottom: "1px solid rgba(220,38,38,0.20)" }}>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
            <p className="text-[11px] font-black text-red-300 uppercase tracking-wider">
              ⚠ {icuCritical} ICU patient{icuCritical > 1 ? "s" : ""} require immediate clinical attention
            </p>
            <div className="ml-auto flex items-center gap-1.5 text-[10px] font-bold text-red-400/70">
              <Wifi className="w-3 h-3" />
              Real-time monitoring active
            </div>
          </div>
        )}

        <div className="px-6 py-5">
          {/* Identity row */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.30) 0%, rgba(29,78,216,0.15) 100%)", border: "1px solid rgba(37,99,235,0.40)" }}>
                  <Building2 className="w-7 h-7 text-blue-400" />
                </div>
                {icuCritical > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 border-2 flex items-center justify-center text-[9px] font-black text-white"
                    style={{ borderColor: "#020916" }}>
                    {icuCritical}
                  </span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-black text-white leading-none">{data?.hospitalName ?? "Hospital Operations"}</h1>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest"
                    style={{ background: "rgba(37,99,235,0.20)", color: "#93c5fd", border: "1px solid rgba(37,99,235,0.30)" }}>
                    MOH National Network
                  </span>
                </div>
                <p className="text-[11px] text-white/35 leading-relaxed">
                  Bed management · ICU monitoring · OR scheduling · AI readmission prediction
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-black text-emerald-400">LIVE</span>
              </div>
              <button onClick={() => refetch()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all hover:opacity-80 active:scale-95"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.45)" }}>
                <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
                <span className="text-[11px] font-bold">Refresh</span>
              </button>
            </div>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-5 gap-3 mb-5">
            {[
              {
                label: "Total Beds",
                value: data?.totalBeds?.toLocaleString() ?? "—",
                sub: "National facility total",
                icon: BedDouble,
                accent: "#3b82f6",
                glow: "rgba(59,130,246,0.12)",
              },
              {
                label: "Occupancy Rate",
                value: `${data?.overallOccupancy ?? "—"}%`,
                sub: occupancyHigh ? "⚠ High occupancy" : "Within normal range",
                icon: Activity,
                accent: occupancyHigh ? "#ef4444" : "#22c55e",
                glow: occupancyHigh ? "rgba(239,68,68,0.10)" : "rgba(34,197,94,0.08)",
              },
              {
                label: "Available Beds",
                value: available.toLocaleString(),
                sub: `${data?.totalOccupied?.toLocaleString()} currently occupied`,
                icon: CheckCircle2,
                accent: available < 20 ? "#f59e0b" : "#34d399",
                glow: "rgba(52,211,153,0.08)",
              },
              {
                label: "OR Procedures Today",
                value: data?.pendingSurgeries ?? "—",
                sub: `${inProgress} in progress now`,
                icon: Scissors,
                accent: "#a855f7",
                glow: "rgba(168,85,247,0.10)",
              },
              {
                label: "Avg Length of Stay",
                value: `${data?.avgLengthOfStay ?? "—"}d`,
                sub: `${data?.dischargesToday ?? "—"} discharges today`,
                icon: Clock,
                accent: "#0ea5e9",
                glow: "rgba(14,165,233,0.10)",
              },
            ].map((kpi, i) => {
              const Icon = kpi.icon;
              return (
                <div key={i} className="rounded-2xl p-4 relative overflow-hidden"
                  style={{ background: `linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)`, border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="absolute inset-0 opacity-100" style={{ background: kpi.glow }} />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: `${kpi.accent}18`, border: `1px solid ${kpi.accent}28` }}>
                        <Icon className="w-3.5 h-3.5" style={{ color: kpi.accent }} />
                      </div>
                      <p className="text-[9px] font-black text-white/35 uppercase tracking-widest leading-tight">{kpi.label}</p>
                    </div>
                    <p className="text-[22px] font-black text-white tabular-nums leading-none mb-1">{kpi.value}</p>
                    <p className="text-[10px] leading-tight" style={{ color: "rgba(255,255,255,0.30)" }}>{kpi.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tab bar */}
          <div className="flex items-center gap-1.5">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const isAlertTab = tab.id === "icu" && icuCritical > 0;
              const accentActive = isAlertTab ? "#ef4444" : "#2563eb";
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap"
                  style={{
                    background: isActive
                      ? `linear-gradient(135deg, ${accentActive}30, ${accentActive}18)`
                      : "rgba(255,255,255,0.04)",
                    border: isActive
                      ? `1px solid ${accentActive}55`
                      : "1px solid rgba(255,255,255,0.07)",
                    color: isActive ? "white" : "rgba(255,255,255,0.30)",
                  }}>
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {isAlertTab && (
                    <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TAB: BED OVERVIEW
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-12 gap-4">

            {/* Bed Map */}
            <Card className="col-span-8">
              <CardHeader>
                <BedDouble className="w-4 h-4 text-blue-500" />
                <CardTitle>Live Bed Map — All Units</CardTitle>
                <div className="ml-auto flex items-center gap-3 text-[9px] font-bold text-muted-foreground">
                  {[{ c: "#ef4444", l: "Critical" }, { c: "#f59e0b", l: "High Risk" }, { c: "#3b82f6", l: "Stable" }, { c: "rgba(0,0,0,0.08)", l: "Available" }].map(i => (
                    <div key={i.l} className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm border border-border/50" style={{ background: i.c }} />
                      {i.l}
                    </div>
                  ))}
                </div>
              </CardHeader>
              <CardBody>
                <div className="space-y-3 mb-5">
                  {data?.bedStatus?.map((unit: any) => {
                    const color = UNIT_COLORS[unit.unit] ?? "#3b82f6";
                    const total = unit.total ?? 20;
                    const occupied = unit.occupied ?? Math.round(total * (unit.occupancyPct / 100));
                    const critical = Math.round(occupied * (unit.status === "critical" ? 0.30 : unit.status === "high" ? 0.12 : 0.04));
                    const highRisk = Math.round(occupied * (unit.status === "critical" ? 0.40 : unit.status === "high" ? 0.28 : 0.10));
                    const stable = occupied - critical - highRisk;
                    const statusColor = unit.status === "critical" ? "#ef4444" : unit.status === "high" ? "#f59e0b" : "#22c55e";
                    return (
                      <div key={unit.unitKey} className="flex items-center gap-4 px-4 py-3 rounded-2xl"
                        style={{ background: "hsl(var(--secondary))", borderLeft: `3px solid ${statusColor}` }}>
                        <div className="w-28 shrink-0">
                          <p className="text-[11px] font-bold text-foreground">{unit.unit}</p>
                          <p className="text-[9px] text-muted-foreground mt-0.5">{unit.occupied}/{unit.total} beds</p>
                        </div>
                        <div className="flex-1 flex flex-wrap gap-0.5">
                          {Array.from({ length: total }).map((_, bi) => {
                            const bedColor =
                              bi < critical   ? "#ef4444" :
                              bi < critical + highRisk ? "#f59e0b" :
                              bi < occupied   ? color :
                              "rgba(0,0,0,0.08)";
                            return (
                              <div key={bi} className="w-4 h-4 rounded-sm border border-border/30 transition-colors"
                                style={{ background: bedColor }} title={`Bed ${bi + 1}`} />
                            );
                          })}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-black tabular-nums" style={{ color }}>{unit.occupancyPct}%</p>
                          <Badge variant={unit.status === "critical" ? "destructive" : unit.status === "high" ? "warning" : unit.status === "moderate" ? "info" : "success"}
                            className="text-[8px]">{unit.status}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Unit stat cards */}
                <div className="grid grid-cols-3 gap-3">
                  {data?.bedStatus?.map((unit: any) => {
                    const color = UNIT_COLORS[unit.unit] ?? "#3b82f6";
                    return (
                      <div key={unit.unitKey} className="p-4 rounded-2xl bg-secondary relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-0.5" style={{ background: color }} />
                        <div className="flex items-center justify-between mb-2.5">
                          <p className="text-xs font-black text-foreground">{unit.unit}</p>
                          <Badge variant={unit.status === "critical" ? "destructive" : unit.status === "high" ? "warning" : unit.status === "moderate" ? "info" : "success"}
                            className="text-[8px]">{unit.status}</Badge>
                        </div>
                        <p className="text-3xl font-black tabular-nums mb-0.5" style={{ color }}>{unit.occupancyPct}<span className="text-base text-muted-foreground font-bold">%</span></p>
                        <div className="w-full bg-background rounded-full h-1.5 mt-2 mb-2">
                          <div className="h-full rounded-full transition-all" style={{ width: `${unit.occupancyPct}%`, background: color }} />
                        </div>
                        <div className="flex justify-between text-[9px] text-muted-foreground font-semibold">
                          <span>{unit.occupied} occupied</span>
                          <span>{unit.available} free</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardBody>
            </Card>

            {/* Staff */}
            <div className="col-span-4 space-y-4">
              <Card>
                <CardHeader>
                  <Users className="w-4 h-4 text-blue-500" />
                  <CardTitle>Staff Allocation</CardTitle>
                  <Badge variant="outline" className="ml-auto text-[9px]">On Duty Now</Badge>
                </CardHeader>
                <CardBody>
                  <div className="space-y-2.5">
                    {[
                      { label: "Doctors", value: data?.staffKPIs?.doctors, dot: "#3b82f6" },
                      { label: "Nurses", value: data?.staffKPIs?.nurses, dot: "#ec4899" },
                      { label: "Specialists", value: data?.staffKPIs?.specialists, dot: "#a855f7" },
                      { label: "On Duty Now", value: data?.staffKPIs?.onDuty, dot: "#22c55e" },
                      { label: "Available for Call", value: data?.staffKPIs?.available, dot: "#0ea5e9" },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-secondary">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.dot }} />
                          <p className="text-[11px] font-semibold text-foreground">{item.label}</p>
                        </div>
                        <p className="text-sm font-black tabular-nums text-foreground">{item.value?.toLocaleString() ?? "—"}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {[
                      { label: "Doctor : Patient", value: data?.staffKPIs?.doctorPatientRatio },
                      { label: "Nurse : Patient", value: data?.staffKPIs?.nursePatientRatio },
                    ].map(r => (
                      <div key={r.label} className="px-3 py-2 rounded-xl text-center"
                        style={{ background: "rgba(37,99,235,0.06)", border: "1px solid rgba(37,99,235,0.12)" }}>
                        <p className="text-[9px] font-bold text-muted-foreground mb-0.5">{r.label}</p>
                        <p className="text-sm font-black text-blue-500 font-mono">{r.value ?? "—"}</p>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <Brain className="w-4 h-4 text-violet-500" />
                  <CardTitle>AI Capacity Insights</CardTitle>
                </CardHeader>
                <CardBody>
                  <div className="space-y-2.5">
                    {data?.aiCapacityInsights?.map((insight: string, i: number) => (
                      <div key={i} className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-secondary">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-foreground leading-relaxed">{insight}</p>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Priority Queue */}
            <Card className="col-span-12">
              <CardHeader>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <CardTitle>AI Priority Patient Queue</CardTitle>
                <Badge variant="outline" className="ml-auto text-[9px]">Sorted by AI Risk Score · High → Low</Badge>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b border-border">
                      {["#", "Priority", "Patient", "Age", "Risk Score", "Conditions", "Suggested Ward", "Last Visit"].map(h => (
                        <th key={h} className="px-4 py-2.5 text-[9px] font-black text-muted-foreground uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data?.priorityQueue?.map((p: any, i: number) => {
                      const style = PRIORITY_COLORS[p.priority as keyof typeof PRIORITY_COLORS] ?? PRIORITY_COLORS.soon;
                      const isTop = i < 3;
                      return (
                        <tr key={p.id} className={isTop ? "bg-secondary/40" : "hover:bg-secondary/20 transition-colors"}>
                          <td className="px-4 py-3">
                            <span className="text-[11px] font-black text-muted-foreground tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {isTop && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                              <Badge variant={style.badge} className="text-[9px]">{p.priority}</Badge>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-bold text-foreground">{p.name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{p.nationalId}</p>
                          </td>
                          <td className="px-4 py-3 text-sm tabular-nums text-foreground">{p.age}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-black tabular-nums ${p.riskScore >= 70 ? "text-red-500" : p.riskScore >= 50 ? "text-amber-500" : "text-foreground"}`}>
                                {p.riskScore}
                              </span>
                              <div className="w-16 bg-secondary rounded-full h-1.5">
                                <div className={`h-full rounded-full ${p.riskScore >= 70 ? "bg-red-500" : p.riskScore >= 50 ? "bg-amber-500" : "bg-emerald-500"}`}
                                  style={{ width: `${p.riskScore}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {p.chronicConditions.slice(0, 2).map((c: string) => (
                                <span key={c} className="text-[9px] bg-secondary px-2 py-0.5 rounded-full font-semibold text-foreground">{c}</span>
                              ))}
                              {p.chronicConditions.length > 2 && (
                                <span className="text-[9px] text-muted-foreground">+{p.chronicConditions.length - 2}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg ${
                              p.suggestedWard === "ICU" ? "text-red-500 bg-red-500/10" :
                              p.suggestedWard === "Emergency" ? "text-amber-500 bg-amber-500/10" : "text-sky-500 bg-sky-500/10"
                            }`}>{p.suggestedWard}</span>
                          </td>
                          <td className="px-4 py-3 text-[10px] text-muted-foreground font-mono whitespace-nowrap">
                            {p.lastVisit ? `${p.lastVisit.date} · ${p.lastVisit.department}` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB: ICU ALERTS — Clinical Monitor Style
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "icu" && (
        <div className="space-y-4">
          {/* Status banner */}
          <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl"
            style={{ background: "linear-gradient(90deg, rgba(220,38,38,0.12) 0%, rgba(220,38,38,0.04) 100%)", border: "1px solid rgba(220,38,38,0.20)" }}>
            <HeartPulse className="w-5 h-5 text-red-500 shrink-0" />
            <div>
              <p className="text-sm font-black text-foreground">ICU Alert System — Real-time Patient Monitoring</p>
              <p className="text-[11px] text-red-500/80 mt-0.5 font-semibold">
                {(data?.icuAlerts ?? []).length} patients flagged · {icuCritical} require immediate action
              </p>
            </div>
            <div className="ml-auto flex items-center gap-1.5 text-[10px] font-black text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Live monitoring
            </div>
          </div>

          {/* Monitor cards */}
          <div className="grid grid-cols-2 gap-4">
            {(data?.icuAlerts ?? []).map((alert: any, i: number) => {
              const isCrit = alert.severity === "critical";
              const accentColor = isCrit ? "#ef4444" : "#f59e0b";
              return (
                <div key={i} className="rounded-3xl overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--secondary)) 0%, hsl(var(--background)) 100%)",
                    border: `1px solid ${accentColor}30`,
                    boxShadow: `0 0 24px ${accentColor}10`
                  }}>
                  {/* Monitor header strip */}
                  <div className="px-5 py-3 flex items-center gap-3"
                    style={{ background: `linear-gradient(90deg, ${accentColor}22 0%, ${accentColor}08 100%)`, borderBottom: `1px solid ${accentColor}20` }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${accentColor}20`, border: `1px solid ${accentColor}30` }}>
                      <HeartPulse className="w-4 h-4" style={{ color: accentColor }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-foreground">{alert.name}</p>
                        <Badge variant={isCrit ? "destructive" : "warning"} className="text-[8px]">
                          {isCrit ? "CRITICAL" : "HIGH RISK"}
                        </Badge>
                      </div>
                      <p className="text-[10px] font-mono text-muted-foreground">{alert.nationalId}</p>
                    </div>
                    {/* Risk score ring */}
                    <div className="relative shrink-0">
                      <RiskRing pct={alert.riskScore} size={52} />
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <p className="text-sm font-black tabular-nums" style={{ color: accentColor, lineHeight: 1 }}>{alert.riskScore}</p>
                        <p className="text-[7px] text-muted-foreground font-bold">risk</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    {/* Alert type + time window */}
                    <div className="flex items-start gap-3 px-4 py-3 rounded-2xl"
                      style={{ background: `${accentColor}10`, border: `1px solid ${accentColor}20` }}>
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: accentColor }} />
                      <div>
                        <p className="text-[11px] font-black" style={{ color: accentColor }}>{alert.alertType}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <p className="text-[10px] text-muted-foreground font-bold">Action window: <span style={{ color: accentColor }}>{alert.timeWindow}</span></p>
                        </div>
                      </div>
                    </div>

                    {/* Conditions */}
                    <div className="flex flex-wrap gap-1.5">
                      {alert.conditions.map((c: string, ci: number) => (
                        <span key={ci} className="text-[10px] font-bold px-2.5 py-1 rounded-lg"
                          style={{ background: `${accentColor}12`, color: accentColor, border: `1px solid ${accentColor}22` }}>
                          {c}
                        </span>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      <button className="flex-1 py-2 rounded-xl text-[11px] font-black text-white transition-all hover:opacity-90 active:scale-95"
                        style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` }}>
                        {isCrit ? "⚡ Escalate to Attending" : "Acknowledge Alert"}
                      </button>
                      <button className="px-4 py-2 rounded-xl text-[11px] font-bold text-muted-foreground bg-secondary hover:bg-border transition-colors">
                        View Record
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB: OR SCHEDULE
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "or" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl"
            style={{ background: "rgba(14,165,233,0.06)", border: "1px solid rgba(14,165,233,0.15)" }}>
            <Scissors className="w-5 h-5 text-sky-500 shrink-0" />
            <div>
              <p className="text-sm font-black text-foreground">Operating Room Schedule — Today</p>
              <p className="text-[11px] text-sky-500/80 mt-0.5 font-semibold">
                {(data?.orSchedule ?? []).length} procedures · {inProgress} in progress · {(data?.orSchedule ?? []).filter((s: any) => s.status === "emergency").length} emergency
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <Scissors className="w-4 h-4 text-sky-500" />
              <CardTitle>OR Schedule — All Rooms</CardTitle>
              <Badge variant="outline" className="ml-auto text-[9px]">{(data?.orSchedule ?? []).length} procedures today</Badge>
            </CardHeader>
            <div className="divide-y divide-border">
              {(data?.orSchedule ?? []).map((op: any, i: number) => {
                const cfg = OR_STATUS[op.status as keyof typeof OR_STATUS] ?? OR_STATUS.scheduled;
                return (
                  <div key={i} className="px-5 py-4 hover:bg-secondary/30 transition-colors">
                    <div className="flex items-start gap-4">
                      {/* Status indicator */}
                      <div className="flex flex-col items-center gap-1.5 shrink-0 pt-0.5">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: `${cfg.color}12`, border: `1px solid ${cfg.color}22` }}>
                          <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                        </div>
                        <p className="text-[9px] font-black text-center" style={{ color: cfg.color }}>{op.room}</p>
                      </div>

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-black text-foreground">{op.procedure}</p>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-lg"
                            style={{ background: `${cfg.color}12`, color: cfg.color, border: `1px solid ${cfg.color}25` }}>
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{op.patient}</p>
                        <p className="text-[11px] text-muted-foreground">Surgeon: <span className="font-semibold text-foreground">{op.surgeon}</span></p>
                      </div>

                      {/* Time */}
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1.5 justify-end mb-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <p className="text-sm font-black text-foreground">{op.scheduledTime}</p>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{op.estimatedDuration}</p>
                        {op.status === "in_progress" && (
                          <p className="text-[9px] font-black text-emerald-500 mt-1">● IN PROGRESS</p>
                        )}
                        {op.status === "emergency" && (
                          <p className="text-[9px] font-black text-red-500 mt-1 animate-pulse">⚡ EMERGENCY</p>
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

      {/* ══════════════════════════════════════════════════════════════════
          TAB: READMISSION RISK
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "readmission" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl"
            style={{ background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.18)" }}>
            <Brain className="w-5 h-5 text-violet-500 shrink-0" />
            <div>
              <p className="text-sm font-black text-foreground">AI Readmission Risk Analysis — 30-Day Window</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 font-semibold">
                Patients with highest readmission probability · Calculated from clinical history · Powered by SANAD Risk Engine v4.2
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {(data?.readmissionRisks ?? []).map((p: any, i: number) => {
              const color = p.readmissionRisk >= 80 ? "#ef4444" : p.readmissionRisk >= 60 ? "#f59e0b" : "#3b82f6";
              return (
                <div key={i} className="flex items-center gap-5 px-5 py-4 rounded-2xl bg-secondary"
                  style={p.readmissionRisk >= 80 ? { borderLeft: "3px solid #ef4444" } : p.readmissionRisk >= 60 ? { borderLeft: "3px solid #f59e0b" } : {}}>
                  {/* Risk ring */}
                  <div className="relative shrink-0">
                    <RiskRing pct={p.readmissionRisk} size={60} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-base font-black tabular-nums" style={{ color, lineHeight: 1 }}>{p.readmissionRisk}%</p>
                      <p className="text-[8px] text-muted-foreground font-bold">risk</p>
                    </div>
                  </div>

                  {/* Patient info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-black text-foreground">{p.name}</p>
                      <span className="text-[10px] font-bold text-muted-foreground font-mono">{p.nationalId}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-secondary text-foreground border border-border">{p.primaryReason}</span>
                      <span className="text-[10px] text-muted-foreground">Last discharge: <span className="font-semibold text-foreground">{p.lastDischarge}</span></span>
                    </div>
                  </div>

                  {/* Recommended action */}
                  <div className="shrink-0 max-w-[220px]">
                    <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
                      style={{ background: `${color}10`, border: `1px solid ${color}20` }}>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color }} />
                      <p className="text-[11px] font-bold" style={{ color: p.readmissionRisk >= 80 ? color : "hsl(var(--foreground))" }}>
                        {p.recommendedAction}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB: AI PATIENT FLOW
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "flow" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl"
            style={{ background: "rgba(37,99,235,0.06)", border: "1px solid rgba(37,99,235,0.15)" }}>
            <Brain className="w-5 h-5 text-blue-500 shrink-0" />
            <div>
              <p className="text-sm font-black text-foreground">AI Patient Flow Optimizer — Predictive Demand & Discharge Intelligence</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Real-time flow predictions, surge alerts, and discharge recommendations — SANAD Risk Engine v4.2</p>
            </div>
            <span className="ml-auto text-[9px] font-black px-2.5 py-1 rounded-full whitespace-nowrap shrink-0"
              style={{ background: "rgba(37,99,235,0.10)", color: "#93c5fd", border: "1px solid rgba(37,99,235,0.20)" }}>
              LIVE · Updates every 15min
            </span>
          </div>

          <div className="grid grid-cols-12 gap-4">
            {/* ED Demand Forecast */}
            <Card className="col-span-8">
              <CardHeader>
                <Activity className="w-4 h-4 text-blue-500" />
                <CardTitle>Emergency Department — 24h Demand Forecast</CardTitle>
                <Badge variant="outline" className="ml-auto text-[9px]">AI Prediction · Hourly</Badge>
              </CardHeader>
              <CardBody>
                <div className="space-y-2 mb-4">
                  {[
                    { hour: "06:00–09:00", label: "Early Morning",  predicted: 18, actual: 15,   surge: false },
                    { hour: "09:00–12:00", label: "Morning Peak",   predicted: 47, actual: 51,   surge: true  },
                    { hour: "12:00–15:00", label: "Afternoon",      predicted: 38, actual: 35,   surge: false },
                    { hour: "15:00–18:00", label: "Evening Peak",   predicted: 62, actual: null, surge: true  },
                    { hour: "18:00–21:00", label: "Night Peak",     predicted: 54, actual: null, surge: true  },
                    { hour: "21:00–06:00", label: "Night",          predicted: 22, actual: null, surge: false },
                  ].map((slot, i) => {
                    const isPast = slot.actual !== null;
                    const displayValue = isPast ? slot.actual! : slot.predicted;
                    const max = 70;
                    const barColor = slot.surge ? "#ef4444" : isPast ? "#22c55e" : "#3b82f6";
                    return (
                      <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
                        style={{
                          background: "hsl(var(--secondary))",
                          borderLeft: slot.surge ? "3px solid #ef4444" : "3px solid transparent"
                        }}>
                        <span className="text-[10px] font-mono text-muted-foreground w-24 shrink-0">{slot.hour}</span>
                        <span className="text-[10px] text-muted-foreground w-24 shrink-0">{slot.label}</span>
                        <div className="flex-1 bg-background rounded-full h-2">
                          <div className="h-full rounded-full transition-all" style={{ width: `${(displayValue / max) * 100}%`, background: barColor }} />
                        </div>
                        <span className="text-[12px] font-black tabular-nums w-8 text-right" style={{ color: slot.surge ? "#ef4444" : "hsl(var(--foreground))" }}>
                          {displayValue}
                        </span>
                        <span className="text-[9px] font-bold w-14 shrink-0 text-muted-foreground">{isPast ? "Actual" : "Forecast"}</span>
                        {slot.surge && (
                          <span className="text-[8px] font-black text-white bg-red-500 px-1.5 py-0.5 rounded shrink-0">SURGE</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Surge warning */}
                <div className="flex items-start gap-3 px-4 py-3.5 rounded-2xl"
                  style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.20)", borderLeft: "3px solid #f59e0b" }}>
                  <Flame className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1">AI Surge Warning — 15:00–21:00 Today</p>
                    <p className="text-[11px] text-foreground leading-relaxed">
                      AI predicts 116 patients across peak 6h window. Recommend activating surge protocol: call in 2 additional ER physicians and prepare 8 temporary overflow beds in corridor B.
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Discharge Candidates */}
            <Card className="col-span-4">
              <CardHeader>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <CardTitle>Discharge Planning AI</CardTitle>
                <Badge variant="success" className="ml-auto text-[9px]">Today</Badge>
              </CardHeader>
              <CardBody className="p-0">
                <div className="divide-y divide-border">
                  {[
                    { name: "Ahmad Al-Rashid",    ward: "General — B3",      los: 4, confidence: 92, condition: "Post-appendectomy",    ready: true },
                    { name: "Fatimah Al-Ghamdi",  ward: "Maternity — C1",    los: 2, confidence: 87, condition: "Normal delivery",       ready: true },
                    { name: "Khalid Saad",         ward: "Surgical — A2",     los: 6, confidence: 71, condition: "Post-knee replacement", ready: true },
                    { name: "Norah Al-Harthi",     ward: "General — B1",      los: 3, confidence: 64, condition: "Pneumonia recovery",    ready: false },
                    { name: "Sultan Al-Dosari",    ward: "ICU → Step-Down",   los: 8, confidence: 58, condition: "Post-MI stable",        ready: false },
                  ].map((p, i) => (
                    <div key={i} className={`px-4 py-3 ${!p.ready ? "opacity-60" : ""}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold text-foreground truncate">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{p.ward} · LOS {p.los}d</p>
                          <p className="text-[10px] text-foreground mt-0.5">{p.condition}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className={`text-[11px] font-black tabular-nums ${p.confidence >= 80 ? "text-emerald-500" : p.confidence >= 65 ? "text-amber-500" : "text-muted-foreground"}`}>
                            {p.confidence}%
                          </span>
                          <p className="text-[8px] text-muted-foreground">confidence</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3 border-t border-border"
                  style={{ background: "rgba(34,197,94,0.06)", borderLeft: "3px solid #22c55e" }}>
                  <p className="text-[10px] font-bold text-emerald-600">Est. 3 discharges by 14:00 → frees 3 beds for surge</p>
                </div>
              </CardBody>
            </Card>

            {/* AI Bed Optimization */}
            <Card className="col-span-12">
              <CardHeader>
                <Brain className="w-4 h-4 text-violet-500" />
                <CardTitle>AI Bed Optimization Engine — 48h Ahead Recommendations</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { title: "Transfer 2 stable ICU patients to Step-Down Unit",            impact: "Frees 2 ICU beds · Saves SAR 8,400/day",              severity: "urgent" },
                    { title: "Convert Conference Room D to temporary observation bay (4 beds)", impact: "Required by 17:00 for surge capacity",              severity: "urgent" },
                    { title: "Cancel 3 elective surgical cases scheduled for tomorrow AM",   impact: "Risk: OR blocked by emergencies · 78% probability",   severity: "warning" },
                    { title: "Activate on-call nursing pool — request 12 additional RNs",   impact: "Nurse:patient ratio will breach 1:6 during peak",      severity: "warning" },
                    { title: "Pre-position portable monitoring equipment in ER corridor",    impact: "Surge prediction confidence: 94%",                     severity: "info" },
                    { title: "Notify blood bank: O+ and A+ units likely needed by 18:00",   impact: "Based on trauma admission patterns + ED forecast",     severity: "info" },
                  ].map((rec, i) => {
                    const color = rec.severity === "urgent" ? "#ef4444" : rec.severity === "warning" ? "#f59e0b" : "#3b82f6";
                    return (
                      <div key={i} className="p-4 rounded-2xl bg-secondary"
                        style={{ borderLeft: `3px solid ${color}` }}>
                        <div className="flex items-start gap-2 mb-2">
                          <span className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ background: color }} />
                          <p className="text-[11px] font-bold text-foreground leading-relaxed">{rec.title}</p>
                        </div>
                        <p className="text-[10px] pl-4 font-semibold" style={{ color: rec.severity === "urgent" ? color : "hsl(var(--muted-foreground))" }}>
                          {rec.impact}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </Layout>
  );
}
