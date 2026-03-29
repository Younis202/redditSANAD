import React from "react";
import { Layout } from "@/components/layout";
import { Card, CardHeader, CardTitle, CardBody, Badge, PageHeader, KpiCard } from "@/components/shared";
import { Brain, Cpu, Zap, Activity, CheckCircle2, AlertTriangle, TrendingUp, Shield, Database, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

async function fetchAiControlMetrics() {
  const res = await fetch("/api/ai-control/metrics");
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

const ENGINE_STATUS_CONFIG = {
  operational: { bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500", label: "Operational", badge: "success" as const },
  degraded: { bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-500", label: "Degraded", badge: "warning" as const },
  offline: { bg: "bg-red-50", border: "border-red-200", dot: "bg-red-500", label: "Offline", badge: "destructive" as const },
};

export default function AiControlCenter() {
  const { data, isLoading } = useQuery({ queryKey: ["ai-control-metrics"], queryFn: fetchAiControlMetrics, refetchInterval: 30000 });

  if (isLoading) {
    return (
      <Layout role="ai-control">
        <div className="flex items-center justify-center gap-3 py-20 text-muted-foreground">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-violet-500" />
          <span className="text-sm font-medium">Loading AI engine metrics...</span>
        </div>
      </Layout>
    );
  }

  const modelStatusConfig = {
    optimal: { color: "text-emerald-600", bg: "bg-emerald-50", label: "Optimal" },
    good: { color: "text-sky-600", bg: "bg-sky-50", label: "Good" },
    degraded: { color: "text-amber-600", bg: "bg-amber-50", label: "Degraded" },
    needs_retraining: { color: "text-red-600", bg: "bg-red-50", label: "Needs Retraining" },
  };

  const statusCfg = modelStatusConfig[data?.modelStatus as keyof typeof modelStatusConfig] ?? modelStatusConfig.good;

  return (
    <Layout role="ai-control">
      <div className="flex items-center gap-2 mb-5">
        <div className="flex items-center gap-2 bg-violet-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-full uppercase tracking-widest">
          <Brain className="w-3 h-3" />
          AI Control Center
        </div>
        <div className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full ml-auto ${statusCfg.bg} ${statusCfg.color}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current inline-block" />
          Model Status: {statusCfg.label}
        </div>
        <span className="text-[11px] font-mono text-muted-foreground">Live · Refreshing every 30s</span>
      </div>

      <PageHeader title="AI Engine Control Center" subtitle="Monitor all 9 AI engines — confidence, drift, latency, retraining status, and system health in real time." />

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard title="Total AI Decisions" value={data?.totalDecisions?.toLocaleString()} sub={`${data?.decisionsLast24h} in last 24h`} icon={Brain} iconBg="bg-violet-100" iconColor="text-violet-600" />
        <KpiCard title="Avg Confidence" value={`${data?.avgConfidence}%`} sub={data?.modelStatus === "optimal" ? "Above threshold" : "Monitor closely"} icon={TrendingUp} iconBg={data?.avgConfidence >= 85 ? "bg-emerald-100" : "bg-amber-100"} iconColor={data?.avgConfidence >= 85 ? "text-emerald-600" : "text-amber-600"} />
        <KpiCard title="Low Confidence Flags" value={data?.lowConfidenceCount} sub="Escalated to human review" icon={AlertTriangle} iconBg={data?.lowConfidenceCount > 0 ? "bg-amber-100" : "bg-secondary"} iconColor={data?.lowConfidenceCount > 0 ? "text-amber-600" : "text-muted-foreground"} />
        <KpiCard title="Audit Records" value={data?.auditRecords?.toLocaleString()} sub="Immutable audit trail" icon={Shield} iconBg="bg-primary/10" iconColor="text-primary" />
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* Confidence History */}
        <Card className="col-span-8">
          <CardHeader>
            <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-violet-600" /><CardTitle>AI Confidence — 12-Month Trend</CardTitle></div>
            <Badge variant={data?.avgConfidence >= 85 ? "success" : "warning"}>{data?.avgConfidence}% avg</Badge>
          </CardHeader>
          <CardBody>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.confidenceHistory} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11 }} />
                  <YAxis domain={[60, 100]} axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11 }} />
                  <RechartsTooltip contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: 12 }} formatter={(v: any) => [`${v}%`, "Confidence"]} />
                  <Line type="monotone" dataKey="confidence" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="decisions" stroke="#007AFF" strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        {/* System Health */}
        <Card className="col-span-4">
          <CardHeader><div className="flex items-center gap-2"><Cpu className="w-4 h-4 text-primary" /><CardTitle>System Health</CardTitle></div></CardHeader>
          <CardBody className="space-y-3">
            {[
              { label: "CPU Usage", value: `${data?.systemHealth?.cpu}%`, status: (data?.systemHealth?.cpu ?? 0) > 80 ? "critical" : "active" },
              { label: "Memory Usage", value: `${data?.systemHealth?.memory}%`, status: (data?.systemHealth?.memory ?? 0) > 85 ? "critical" : "active" },
              { label: "Event Bus Lag", value: `${data?.systemHealth?.eventBusLag}ms`, status: "active" },
              { label: "DB Connections", value: data?.systemHealth?.dbConnections, status: "active" },
              { label: "System Uptime", value: data?.systemHealth?.uptime, status: "active" },
              { label: "Last Retraining", value: data?.systemHealth?.lastRetraining, status: "active" },
              { label: "Next Review", value: data?.systemHealth?.nextScheduledReview, status: "active" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">{item.value}</span>
                  <div className={`w-1.5 h-1.5 rounded-full ${item.status === "critical" ? "bg-red-500" : "bg-emerald-500"}`} />
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        {/* 9 AI Engines */}
        <Card className="col-span-12">
          <CardHeader>
            <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /><CardTitle>9 Active AI Engines</CardTitle></div>
            <Badge variant="outline">{data?.engines?.filter((e: any) => e.status === "operational").length ?? 0} / {data?.engines?.length ?? 0} operational</Badge>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-3 gap-3">
              {data?.engines?.map((engine: any, i: number) => {
                const cfg = ENGINE_STATUS_CONFIG[engine.status as keyof typeof ENGINE_STATUS_CONFIG] ?? ENGINE_STATUS_CONFIG.operational;
                return (
                  <div key={i} className={`flex items-start gap-3 p-4 ${cfg.bg} border ${cfg.border} rounded-2xl`}>
                    <div className={`w-2 h-2 rounded-full ${cfg.dot} mt-1 shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-bold text-foreground">{engine.name}</p>
                        <span className="text-[10px] font-mono text-muted-foreground">{engine.version}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Accuracy</p>
                          <p className="text-sm font-bold text-foreground">{engine.accuracy}%</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Requests</p>
                          <p className="text-sm font-bold text-foreground">{engine.requests?.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Latency</p>
                          <p className="text-sm font-bold text-foreground">{engine.avgLatencyMs}ms</p>
                        </div>
                      </div>
                      <div className="mt-2 bg-white/60 rounded-full h-1.5 overflow-hidden">
                        <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${engine.accuracy}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>

        {/* Event Types */}
        <Card className="col-span-6">
          <CardHeader><div className="flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /><CardTitle>Event Bus Activity</CardTitle></div><Badge variant="default">{data?.totalEvents} events</Badge></CardHeader>
          <CardBody>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.eventTypes?.slice(0, 8)} layout="vertical" margin={{ top: 0, right: 20, left: 180, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="type" type="category" axisLine={false} tickLine={false} tick={{ fill: "#374151", fontSize: 10, fontWeight: 500 }} width={175} />
                  <RechartsTooltip contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: 12 }} />
                  <Bar dataKey="count" fill="#7c3aed" radius={[0, 6, 6, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        {/* Urgency Breakdown */}
        <Card className="col-span-6">
          <CardHeader><div className="flex items-center gap-2"><Clock className="w-4 h-4 text-amber-500" /><CardTitle>Decision Urgency Breakdown</CardTitle></div></CardHeader>
          <CardBody className="space-y-3">
            {[
              { label: "Immediate", key: "immediate", color: "bg-red-500", textColor: "text-red-700", bg: "bg-red-50" },
              { label: "Urgent", key: "urgent", color: "bg-amber-500", textColor: "text-amber-700", bg: "bg-amber-50" },
              { label: "Soon", key: "soon", color: "bg-sky-500", textColor: "text-sky-700", bg: "bg-sky-50" },
              { label: "Routine", key: "routine", color: "bg-emerald-500", textColor: "text-emerald-700", bg: "bg-emerald-50" },
            ].map((item) => {
              const val = data?.urgencyBreakdown?.[item.key] ?? 0;
              const total = data?.totalDecisions || 1;
              const pct = Math.round((val / total) * 100);
              return (
                <div key={item.key} className={`flex items-center gap-3 px-4 py-3 ${item.bg} rounded-2xl`}>
                  <div className={`w-2.5 h-2.5 rounded-full ${item.color} shrink-0`} />
                  <span className={`text-sm font-semibold ${item.textColor} flex-1`}>{item.label}</span>
                  <span className="text-sm font-bold text-foreground tabular-nums">{val}</span>
                  <div className="w-20 bg-white/60 rounded-full h-1.5">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className={`text-xs font-bold ${item.textColor} w-8 text-right`}>{pct}%</span>
                </div>
              );
            })}
          </CardBody>
        </Card>
      </div>
    </Layout>
  );
}
