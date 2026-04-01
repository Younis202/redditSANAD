import React, { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardHeader, CardTitle, CardBody, Badge } from "@/components/shared";
import {
  Package, AlertTriangle, TrendingUp, Brain, Truck, Zap, CheckCircle2,
  BarChart2, Globe, AlertCircle, ArrowUpRight, Clock, RefreshCw,
  MapPin, ShoppingCart, Calendar, ChevronRight, TrendingDown, Bell, X
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSseAlerts } from "@/hooks/use-sse-alerts";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, Legend, ReferenceLine
} from "recharts";

async function fetchInventory() {
  const res = await fetch("/api/supply-chain/inventory");
  if (!res.ok) throw new Error("Failed");
  return res.json();
}
async function submitReorder(body: Record<string, any>) {
  const res = await fetch("/api/supply-chain/reorder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

const STATUS_CFG: Record<string, { bg: string; borderColor?: string; text: string; badge: any; dot: string }> = {
  critical: { bg: "bg-secondary", borderColor: "#ef4444", text: "text-red-600", badge: "destructive" as const, dot: "bg-red-500 animate-pulse" },
  low: { bg: "bg-secondary", borderColor: "#f59e0b", text: "text-amber-600", badge: "warning" as const, dot: "bg-amber-500" },
  adequate: { bg: "bg-secondary", borderColor: "#22c55e", text: "text-emerald-600", badge: "success" as const, dot: "bg-emerald-500" },
  High: { bg: "bg-secondary", borderColor: "#22c55e", text: "text-emerald-600", badge: "success" as const, dot: "bg-emerald-500" },
  Medium: { bg: "bg-secondary", borderColor: "#f59e0b", text: "text-amber-600", badge: "warning" as const, dot: "bg-amber-500" },
  Low: { bg: "bg-secondary", borderColor: "#ef4444", text: "text-red-600", badge: "destructive" as const, dot: "bg-red-500" },
};

type ShortagePrediction = { drug: string; day30: number; day60: number; day90: number; current: number; min: number };

const REGIONAL_DISTRIBUTION = [
  { region: "Riyadh", stock: 78, demand: 92, gap: -14, color: "#ef4444" },
  { region: "Jeddah", stock: 65, demand: 71, gap: -6, color: "#f59e0b" },
  { region: "Eastern Province", stock: 42, demand: 58, gap: -16, color: "#ef4444" },
  { region: "Madinah", stock: 83, demand: 61, gap: 22, color: "#10b981" },
  { region: "Makkah", stock: 71, demand: 75, gap: -4, color: "#f59e0b" },
  { region: "Asir", stock: 55, demand: 48, gap: 7, color: "#10b981" },
  { region: "Qassim", stock: 67, demand: 59, gap: 8, color: "#10b981" },
  { region: "Tabuk", stock: 44, demand: 52, gap: -8, color: "#f59e0b" },
];

const CONSUMPTION_TREND = [
  { month: "Jul", metformin: 7800, insulin: 2400, lisinopril: 4900, atorvastatin: 5600 },
  { month: "Aug", metformin: 8100, insulin: 2550, lisinopril: 5100, atorvastatin: 5750 },
  { month: "Sep", metformin: 8300, insulin: 2600, lisinopril: 5200, atorvastatin: 5900 },
  { month: "Oct", metformin: 8400, insulin: 2700, lisinopril: 5300, atorvastatin: 6000 },
  { month: "Nov", metformin: 8500, insulin: 2750, lisinopril: 5450, atorvastatin: 6100 },
  { month: "Dec", metformin: 8500, insulin: 2800, lisinopril: 5500, atorvastatin: 6200 },
];

type ViewTab = "inventory" | "predictions" | "distribution" | "reorder" | "seasonal";

export default function SupplyChainPortal() {
  const [activeTab, setActiveTab] = useState<ViewTab>("inventory");
  const [reorderResults, setReorderResults] = useState<Record<string, any>>({});
  const [showSsePanel, setShowSsePanel] = useState(false);

  const { alerts: sseAlerts, unreadCount: sseUnread, markRead: markSseRead, clearAll: clearSseAlerts } = useSseAlerts("supply-chain");

  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["supply-inventory"], queryFn: fetchInventory, refetchInterval: 60000 });

  const reorderMutation = useMutation({
    mutationFn: (body: Record<string, any>) => submitReorder(body),
    onSuccess: (result, body) => {
      setReorderResults(prev => ({ ...prev, [body.drugName]: result }));
      qc.invalidateQueries({ queryKey: ["supply-inventory"] });
    },
  });

  if (isLoading) {
    return (
      <Layout role="supply-chain">
        <div className="flex flex-col items-center justify-center gap-4 py-32">
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center"
            style={{ background: "rgba(234,88,12,0.10)", border: "1px solid rgba(234,88,12,0.20)" }}>
            <Truck className="w-7 h-7 text-orange-400 animate-pulse" />
          </div>
          <p className="text-sm font-bold text-muted-foreground">Loading national inventory data...</p>
        </div>
      </Layout>
    );
  }

  const TABS: { id: ViewTab; label: string; icon: React.ElementType }[] = [
    { id: "inventory", label: "Inventory Status", icon: Package },
    { id: "predictions", label: "AI Shortage Predictions", icon: Brain },
    { id: "distribution", label: "Regional Distribution", icon: Globe },
    { id: "reorder", label: "Purchase Orders", icon: ShoppingCart },
    { id: "seasonal", label: "Ramadan & Hajj Planner", icon: Calendar },
  ];

  const criticals = data?.summary?.criticalShortages ?? 0;

  return (
    <Layout role="supply-chain">

      {/* ══════════════════════════════════════════════════════════════════
          SUPPLY CHAIN INTELLIGENCE COMMAND CENTER HEADER
      ══════════════════════════════════════════════════════════════════ */}
      <div className="rounded-3xl overflow-hidden mb-6"
        style={{
          background: "linear-gradient(135deg, #080400 0%, #140a00 45%, #0a0600 100%)",
          boxShadow: "0 0 0 1px rgba(234,88,12,0.12), 0 8px 40px rgba(0,0,0,0.55), 0 0 80px rgba(234,88,12,0.06)"
        }}>

        {/* Top accent strip */}
        <div className="h-[3px]" style={{ background: "linear-gradient(90deg, transparent, #7c2d12 10%, #ea580c 30%, #f59e0b 50%, #ea580c 70%, #7c2d12 90%, transparent)" }} />

        {/* Critical shortage banner */}
        {criticals > 0 && (
          <div className="flex items-center gap-3 px-6 py-2.5"
            style={{ background: "linear-gradient(90deg, rgba(220,38,38,0.22) 0%, rgba(220,38,38,0.10) 100%)", borderBottom: "1px solid rgba(220,38,38,0.22)" }}>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
            <p className="text-[11px] font-black text-red-300 uppercase tracking-wider">
              ⚠ {criticals} CRITICAL SHORTAGE{criticals > 1 ? "S" : ""} —{" "}
              <span className="normal-case font-semibold text-red-200/80">{data?.criticalAlerts?.map((a: any) => a.drug).join(" · ")}</span>
            </p>
            <button onClick={() => setActiveTab("reorder")}
              className="ml-auto text-[10px] font-black px-3 py-1 rounded-full transition-all hover:opacity-80"
              style={{ background: "rgba(220,38,38,0.30)", color: "#fca5a5", border: "1px solid rgba(220,38,38,0.40)" }}>
              Issue Emergency Orders →
            </button>
          </div>
        )}

        <div className="px-6 py-5">
          {/* Identity row */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: "linear-gradient(135deg, rgba(234,88,12,0.28) 0%, rgba(217,119,6,0.14) 100%)", border: "1px solid rgba(234,88,12,0.40)" }}>
                  <Truck className="w-7 h-7 text-orange-400" />
                </div>
                {criticals > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 border-2 flex items-center justify-center text-[9px] font-black text-white"
                    style={{ borderColor: "#080400" }}>
                    {criticals}
                  </span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-black text-white leading-none">National Drug Supply Chain</h1>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest"
                    style={{ background: "rgba(234,88,12,0.18)", color: "#fb923c", border: "1px solid rgba(234,88,12,0.30)" }}>
                    MOH Logistics
                  </span>
                </div>
                <p className="text-[11px] text-white/35 leading-relaxed">
                  Real-time inventory · AI shortage prediction · Regional distribution · Procurement management
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                style={criticals > 0
                  ? { background: "rgba(220,38,38,0.10)", border: "1px solid rgba(220,38,38,0.20)" }
                  : { background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)" }}>
                <span className={`w-1.5 h-1.5 rounded-full ${criticals > 0 ? "bg-red-400 animate-pulse" : "bg-emerald-400"}`} />
                <span className="text-[10px] font-black" style={{ color: criticals > 0 ? "#fca5a5" : "#86efac" }}>
                  {criticals > 0 ? `${criticals} Critical` : "All Stable"}
                </span>
              </div>
              <button onClick={() => setShowSsePanel(p => !p)}
                className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all hover:opacity-80"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.40)" }}>
                <Bell className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold">Alerts</span>
                {sseUnread > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-500 text-white text-[9px] font-black flex items-center justify-center"
                    style={{ border: "2px solid #080400" }}>
                    {sseUnread > 9 ? "9+" : sseUnread}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* KPI strip — 5 cards */}
          <div className="grid grid-cols-5 gap-3 mb-5">
            {[
              {
                label: "Drug Lines Tracked",
                value: data?.summary?.totalDrugs ?? "—",
                sub: "National formulary",
                icon: Package,
                accent: "#f97316",
                glow: "rgba(249,115,22,0.10)",
              },
              {
                label: "Critical Shortages",
                value: data?.summary?.criticalShortages ?? "—",
                sub: criticals > 0 ? "Immediate action needed" : "All clear",
                icon: AlertTriangle,
                accent: criticals > 0 ? "#ef4444" : "#22c55e",
                glow: criticals > 0 ? "rgba(239,68,68,0.10)" : "rgba(34,197,94,0.06)",
              },
              {
                label: "Low Stock Alerts",
                value: data?.summary?.reorderAlerts ?? "—",
                sub: "Reorder threshold breached",
                icon: AlertCircle,
                accent: "#f59e0b",
                glow: "rgba(245,158,11,0.08)",
              },
              {
                label: "Adequate Stock",
                value: data?.summary?.adequate ?? "—",
                sub: "Lines fully stocked",
                icon: CheckCircle2,
                accent: "#22c55e",
                glow: "rgba(34,197,94,0.07)",
              },
              {
                label: "Inventory Value",
                value: `SAR ${((data?.summary?.totalInventoryValue ?? 0) / 1e6).toFixed(1)}M`,
                sub: "Current national stock value",
                icon: BarChart2,
                accent: "#f59e0b",
                glow: "rgba(245,158,11,0.08)",
              },
            ].map((kpi, i) => {
              const Icon = kpi.icon;
              return (
                <div key={i} className="rounded-2xl p-4 relative overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="absolute inset-0" style={{ background: kpi.glow }} />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: `${kpi.accent}18`, border: `1px solid ${kpi.accent}28` }}>
                        <Icon className="w-3.5 h-3.5" style={{ color: kpi.accent }} />
                      </div>
                      <p className="text-[9px] font-black text-white/35 uppercase tracking-widest leading-tight">{kpi.label}</p>
                    </div>
                    <p className="text-[22px] font-black text-white tabular-nums leading-none mb-1">{kpi.value}</p>
                    <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.28)" }}>{kpi.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tab bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const isAlert = tab.id === "reorder" && criticals > 0;
              const activeAccent = isAlert ? "#ef4444" : "#ea580c";
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap shrink-0"
                  style={{
                    background: isActive
                      ? `linear-gradient(135deg, ${activeAccent}2e, ${activeAccent}18)`
                      : "rgba(255,255,255,0.04)",
                    border: isActive
                      ? `1px solid ${activeAccent}50`
                      : "1px solid rgba(255,255,255,0.07)",
                    color: isActive ? "white" : "rgba(255,255,255,0.30)",
                  }}>
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {isAlert && (
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Live SSE Alert Telemetry Feed ── */}
      {showSsePanel && sseAlerts.length > 0 && (
        <div className="mb-5 rounded-2xl overflow-hidden"
          style={{ background: "linear-gradient(135deg, #0e0700 0%, #1a0d00 100%)", border: "1px solid rgba(234,88,12,0.18)" }}>
          <div className="flex items-center justify-between px-5 py-3"
            style={{ borderBottom: "1px solid rgba(234,88,12,0.12)" }}>
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
              <span className="text-sm font-black text-white">Live Supply Chain Telemetry</span>
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full"
                style={{ background: "rgba(234,88,12,0.20)", color: "#fb923c", border: "1px solid rgba(234,88,12,0.30)" }}>
                {sseUnread} NEW
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={clearSseAlerts} className="text-[11px] font-bold text-white/35 hover:text-white/60 transition-colors">Clear all</button>
              <button onClick={() => setShowSsePanel(false)} className="text-white/30 hover:text-white/60 transition-colors"><X className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="divide-y max-h-56 overflow-y-auto" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            {sseAlerts.map(alert => (
              <div key={alert.id} className={`px-5 py-3 flex items-start gap-3 hover:bg-white/[0.02] transition-colors ${alert.read ? "opacity-50" : ""}`}>
                <AlertTriangle className={`mt-0.5 w-4 h-4 shrink-0 ${alert.severity === "critical" ? "text-red-400" : "text-amber-400"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">{alert.title}</p>
                  {alert.recommendation && <p className="text-[11px] text-white/45 mt-0.5">{alert.recommendation}</p>}
                  <p className="text-[10px] text-white/25 mt-1 font-mono">{new Date(alert.timestamp).toLocaleTimeString()}</p>
                </div>
                <button onClick={() => markSseRead(alert.id)}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg transition-colors shrink-0"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.10)" }}>
                  Mark Read
                </button>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* ─── INVENTORY ─── */}
      {activeTab === "inventory" && (
        <div className="space-y-4">
          <div className="grid grid-cols-12 gap-5">
            <Card className="col-span-8">
              <CardHeader><Package className="w-4 h-4 text-orange-500" /><CardTitle>Drug Inventory — All Lines</CardTitle></CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-secondary/50 border-b border-border">
                      {["Drug", "Category", "Stock", "Monthly Demand", "Days Remaining", "Status"].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data?.inventory?.map((item: any, i: number) => {
                      const cfg = STATUS_CFG[item.status] ?? STATUS_CFG.adequate;
                      return (
                        <tr key={i} className="hover:bg-secondary/20" style={item.status === "critical" ? { borderLeft: "3px solid #ef4444" } : {}}>
                          <td className="px-4 py-3">
                            <p className="text-sm font-semibold text-foreground">{item.drugName}</p>
                            <p className="text-[10px] text-muted-foreground">{item.supplier}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">{item.category}</span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-bold text-foreground">{item.stock.toLocaleString()}</p>
                            <p className="text-[10px] text-muted-foreground">{item.unit}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs font-bold text-foreground">{item.avgMonthlyDemand?.toLocaleString()}</p>
                            {item.demandAdjusted && item.activePrescriptions > 0 && (
                              <p className="text-[9px] text-emerald-600 font-semibold flex items-center gap-0.5 mt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                                {item.activePrescriptions} active Rx · DB-driven
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-secondary rounded-full h-1.5">
                                <div className={`h-full rounded-full ${item.daysOfStock < 14 ? "bg-red-500" : item.daysOfStock < 30 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min((item.daysOfStock / 90) * 100, 100)}%` }} />
                              </div>
                              <span className={`text-xs font-bold ${item.daysOfStock < 14 ? "text-red-600" : item.daysOfStock < 30 ? "text-amber-600" : "text-foreground"}`}>{item.daysOfStock}d</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={cfg.badge} className="text-[9px]">{item.status}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="col-span-4 space-y-4">
              {/* Distribution Centers */}
              <Card>
                <CardHeader><MapPin className="w-4 h-4 text-primary" /><CardTitle>Distribution Centers</CardTitle></CardHeader>
                <CardBody className="space-y-2.5">
                  {data?.distributionCenters?.map((dc: any, i: number) => {
                    const cfg = STATUS_CFG[dc.stock] ?? STATUS_CFG.adequate;
                    return (
                      <div key={i} className="px-3.5 py-3 bg-secondary rounded-2xl"
                        style={cfg.borderColor ? { borderLeft: `3px solid ${cfg.borderColor}` } : {}}>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-xs font-bold text-foreground">{dc.name}</p>
                          <Badge variant={cfg.badge} className="text-[9px]">{dc.stock}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span>Capacity: <span className="font-bold text-foreground">{dc.capacity}</span></span>
                          <span>·</span>
                          <span>Next delivery: <span className="font-bold text-foreground">{dc.nextDelivery}</span></span>
                        </div>
                      </div>
                    );
                  })}
                </CardBody>
              </Card>

              {/* Consumption Trend */}
              <Card>
                <CardHeader><TrendingUp className="w-4 h-4 text-orange-500" /><CardTitle>6-Month Consumption</CardTitle></CardHeader>
                <CardBody>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={CONSUMPTION_TREND} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 10 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 9 }} />
                        <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: 11 }} />
                        <Line type="monotone" dataKey="metformin" stroke="#007AFF" strokeWidth={2} dot={false} name="Metformin" />
                        <Line type="monotone" dataKey="insulin" stroke="#ef4444" strokeWidth={2} dot={false} name="Insulin" />
                        <Line type="monotone" dataKey="lisinopril" stroke="#10b981" strokeWidth={2} dot={false} name="Lisinopril" />
                        <Line type="monotone" dataKey="atorvastatin" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Atorvastatin" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ─── AI SHORTAGE PREDICTIONS ─── */}
      {activeTab === "predictions" && (
        <div className="space-y-5">
          <div className="flex items-start gap-4 px-5 py-4 bg-secondary rounded-2xl" style={{ borderLeft: "3px solid #8b5cf6" }}>
            <Brain className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">AI Supply Forecasting Engine v2.1</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Machine learning demand prediction using 24-month historical consumption, prescription trends, disease prevalence, and seasonal patterns.
                Predictions recalculated daily at 02:00 AST.
              </p>
            </div>
            <Badge variant="info">Updated Today</Badge>
          </div>

          {/* AI Predictions from backend */}
          <Card>
            <CardHeader><Brain className="w-4 h-4 text-violet-600" /><CardTitle>AI Demand Predictions</CardTitle></CardHeader>
            <CardBody className="space-y-3">
              {data?.aiPredictions?.map((pred: any, i: number) => (
                <div key={i} className="flex items-start gap-4 px-4 py-3.5 bg-secondary rounded-2xl" style={{ borderLeft: "3px solid #8b5cf6" }}>
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Brain className="w-4 h-4 text-violet-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{pred.prediction}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      <ChevronRight className="w-3 h-3 text-primary shrink-0" />
                      {pred.action}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-violet-700">{pred.confidence}%</p>
                    <p className="text-[10px] text-muted-foreground">confidence</p>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>

          {/* 30/60/90 Day Forecast */}
          <Card>
            <CardHeader><Calendar className="w-4 h-4 text-primary" /><CardTitle>30/60/90-Day Stock Forecast</CardTitle><span className="ml-auto text-[11px] text-muted-foreground">Units remaining</span></CardHeader>
            <CardBody>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={(data?.shortagePredictions ?? []) as ShortagePrediction[]} layout="vertical" margin={{ top: 0, right: 30, left: 140, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11 }} />
                    <YAxis dataKey="drug" type="category" axisLine={false} tickLine={false} tick={{ fill: "#374151", fontSize: 10, fontWeight: 500 }} width={135} />
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: 12 }} />
                    <Legend />
                    <Bar dataKey="current" fill="#10b981" radius={[0, 4, 4, 0]} barSize={10} name="Now" />
                    <Bar dataKey="day30" fill="#007AFF" radius={[0, 4, 4, 0]} barSize={10} name="30 Days" />
                    <Bar dataKey="day60" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={10} name="60 Days" />
                    <Bar dataKey="day90" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={10} name="90 Days" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>

          {/* Critical shortages countdown */}
          <div className="grid grid-cols-2 gap-4">
            {data?.inventory?.filter((i: any) => i.status !== "adequate").map((item: any, idx: number) => {
              const cfg = STATUS_CFG[item.status] ?? STATUS_CFG.adequate;
              return (
                <div key={idx} className="px-4 py-3.5 bg-secondary rounded-2xl"
                  style={cfg.borderColor ? { borderLeft: `3px solid ${cfg.borderColor}` } : {}}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0`} />
                        <p className="text-xs font-bold text-foreground">{item.drugName}</p>
                        <Badge variant={cfg.badge} className="text-[9px]">{item.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Stock: {item.stock.toLocaleString()} {item.unit} · Min: {item.minStock.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Supplier: {item.supplier} · Lead time: {item.leadTimeDays}d</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-2xl font-bold ${item.daysOfStock < 14 ? "text-red-600" : "text-amber-600"}`}>{item.daysOfStock}d</p>
                      <p className="text-[10px] text-muted-foreground">stock left</p>
                    </div>
                  </div>
                  <button
                    onClick={() => reorderMutation.mutate({ drugName: item.drugName, quantity: item.avgMonthlyDemand * 3, supplier: item.supplier, requestedBy: "Ibrahim Al-Dosari" })}
                    disabled={reorderMutation.isPending || !!reorderResults[item.drugName]}
                    className={`mt-3 w-full text-xs font-semibold py-1.5 rounded-xl transition-colors ${reorderResults[item.drugName] ? "bg-secondary text-emerald-700" : "bg-red-600 hover:bg-red-700 text-white"}`}
                  >
                    {reorderResults[item.drugName] ? `Order Placed: ${reorderResults[item.drugName]?.orderId}` : "Issue Emergency Order"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── REGIONAL DISTRIBUTION ─── */}
      {activeTab === "distribution" && (
        <div className="space-y-5">
          <div className="flex items-center gap-3 px-4 py-3 bg-secondary rounded-2xl" style={{ borderLeft: "3px solid #0ea5e9" }}>
            <Globe className="w-4 h-4 text-sky-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-foreground">National Drug Distribution Optimization</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">AI redistribution model identifies supply-demand gaps per region — redistribution recommendations updated every 6 hours</p>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-5">
            <Card className="col-span-7">
              <CardHeader><Globe className="w-4 h-4 text-primary" /><CardTitle>Regional Stock vs. Demand (%)</CardTitle></CardHeader>
              <CardBody>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={REGIONAL_DISTRIBUTION} margin={{ top: 5, right: 15, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="region" axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 10 }} />
                      <YAxis domain={[0, 120]} axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11 }} unit="%" />
                      <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: 12 }} />
                      <Legend />
                      <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1.5} label={{ value: "100% demand", fill: "#ef4444", fontSize: 9 }} />
                      <Bar dataKey="stock" fill="#10b981" radius={[4, 4, 0, 0]} barSize={22} name="Stock Level %" />
                      <Bar dataKey="demand" fill="#007AFF" radius={[4, 4, 0, 0]} barSize={22} name="Demand %" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardBody>
            </Card>

            <Card className="col-span-5">
              <CardHeader><MapPin className="w-4 h-4 text-primary" /><CardTitle>Gap Analysis by Region</CardTitle></CardHeader>
              <CardBody className="space-y-2.5">
                {REGIONAL_DISTRIBUTION.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-secondary"
                    style={r.gap < 0 ? { borderLeft: "3px solid #ef4444" } : { borderLeft: "3px solid #22c55e" }}>
                    <MapPin className={`w-3.5 h-3.5 shrink-0 ${r.gap < 0 ? "text-red-500" : "text-emerald-500"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground">{r.region}</p>
                      <p className="text-[10px] text-muted-foreground">Stock {r.stock}% · Demand {r.demand}%</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold ${r.gap < 0 ? "text-red-600" : "text-emerald-600"}`}>
                        {r.gap > 0 ? "+" : ""}{r.gap}%
                      </p>
                      <p className={`text-[9px] font-bold ${r.gap < 0 ? "text-red-500" : "text-emerald-500"}`}>
                        {r.gap < 0 ? "DEFICIT" : "SURPLUS"}
                      </p>
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>
          </div>

          {/* AI Redistribution Recommendations */}
          <Card>
            <CardHeader><Brain className="w-4 h-4 text-violet-600" /><CardTitle>AI Redistribution Recommendations</CardTitle><Badge variant="info">Auto-generated</Badge></CardHeader>
            <CardBody className="space-y-3">
              {[
                { from: "Madinah", to: "Riyadh", drug: "Metformin 500mg", quantity: 2000, reason: "Madinah surplus 22% — Riyadh deficit 14% — redistribution optimizes national coverage", priority: "high" },
                { from: "Qassim", to: "Eastern Province", drug: "Amlodipine 5mg", quantity: 800, reason: "Qassim surplus 8% — Eastern Province deficit 16% — 2-day internal transfer feasible", priority: "high" },
                { from: "Asir", to: "Tabuk", drug: "Lisinopril 10mg", quantity: 500, reason: "Asir surplus 7% — Tabuk deficit 8% — Tabuk growing patient population trend", priority: "medium" },
              ].map((rec, i) => (
                <div key={i} className="flex items-start gap-4 px-4 py-3.5 rounded-2xl bg-secondary"
                  style={rec.priority === "high" ? { borderLeft: "3px solid #f59e0b" } : { borderLeft: "3px solid #0ea5e9" }}>
                  <Truck className={`w-4 h-4 shrink-0 mt-0.5 ${rec.priority === "high" ? "text-amber-600" : "text-sky-600"}`} />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground">{rec.drug}: {rec.from} → {rec.to}</p>
                    <p className="text-xs font-semibold text-foreground">{rec.quantity.toLocaleString()} units</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{rec.reason}</p>
                  </div>
                  <Badge variant={rec.priority === "high" ? "warning" : "info"} className="shrink-0 text-[9px]">{rec.priority}</Badge>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      )}

      {/* ─── PURCHASE ORDERS ─── */}
      {activeTab === "reorder" && (
        <div className="space-y-5">
          {/* Critical alerts */}
          {data?.criticalAlerts?.length > 0 && (
            <Card>
              <CardHeader><AlertTriangle className="w-4 h-4 text-red-600" /><CardTitle>Emergency Purchase Orders Required</CardTitle><Badge variant="destructive">{data.criticalAlerts.length} critical</Badge></CardHeader>
              <div className="divide-y divide-border">
                {data.criticalAlerts.map((alert: any, i: number) => {
                  const result = reorderResults[alert.drug];
                  return (
                    <div key={i} className="flex items-center gap-4 px-5 py-4" style={{ borderLeft: "3px solid #ef4444" }}>
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground">{alert.drug}</p>
                        <p className="text-xs text-muted-foreground">
                          Current: {alert.currentStock.toLocaleString()} · Required: {alert.minRequired.toLocaleString()} · Deficit: <span className="font-bold text-red-600">{alert.deficit.toLocaleString()}</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Supplier: {alert.supplier} · Lead time: {alert.leadTimeDays} days</p>
                      </div>
                      {result ? (
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-emerald-600 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Order Placed</p>
                          <p className="font-mono text-[10px] text-muted-foreground">{result.orderId}</p>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            const drug = data.inventory?.find((d: any) => d.drugName === alert.drug);
                            reorderMutation.mutate({ drugName: alert.drug, quantity: (drug?.avgMonthlyDemand ?? alert.minRequired) * 3, supplier: alert.supplier, requestedBy: "Ibrahim Al-Dosari" });
                          }}
                          disabled={reorderMutation.isPending}
                          className="flex items-center gap-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-xl transition-colors shrink-0"
                        >
                          <ShoppingCart className="w-3 h-3" />
                          Issue Order
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* All reorder alerts */}
          <Card>
            <CardHeader><ShoppingCart className="w-4 h-4 text-primary" /><CardTitle>All Reorder Recommendations</CardTitle><Badge variant="warning">{data?.summary?.reorderAlerts} items</Badge></CardHeader>
            <div className="divide-y divide-border">
              {data?.inventory?.filter((i: any) => i.reorderNeeded).map((item: any, idx: number) => {
                const cfg = STATUS_CFG[item.status] ?? STATUS_CFG.low;
                const result = reorderResults[item.drugName];
                return (
                  <div key={idx} className="flex items-center gap-4 px-5 py-4">
                    <div className={`w-2 h-2 rounded-full ${cfg.dot} shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{item.drugName}</p>
                      <p className="text-xs text-muted-foreground">{item.category} · {item.daysOfStock} days stock · SAR {(item.avgMonthlyDemand * item.price * 3).toFixed(0)} estimated order value</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-xs font-bold text-foreground">{item.stock.toLocaleString()} / {item.minStock.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">Current / Min</p>
                      </div>
                      <Badge variant={cfg.badge} className="text-[9px]">{item.status}</Badge>
                      {result ? (
                        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{result.orderId}</span>
                      ) : (
                        <button
                          onClick={() => reorderMutation.mutate({ drugName: item.drugName, quantity: item.avgMonthlyDemand * 3, supplier: item.supplier, requestedBy: "Ibrahim Al-Dosari" })}
                          disabled={reorderMutation.isPending}
                          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors ${item.status === "critical" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-secondary hover:bg-border text-amber-700"}`}
                        >
                          <ShoppingCart className="w-3 h-3" />
                          Order
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ─── RAMADAN & HAJJ SEASONAL SURGE PLANNER ─── */}
      {activeTab === "seasonal" && (
        <div className="space-y-5">
          <div className="flex items-start gap-4 p-5 bg-secondary rounded-3xl" style={{ borderLeft: "4px solid #22c55e" }}>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <Calendar className="w-6 h-6 text-emerald-700" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-bold text-foreground text-sm">Saudi Seasonal Demand Intelligence Engine</p>
                <Badge variant="success" className="text-[10px]">Active Planning Mode</Badge>
              </div>
              <p className="text-xs text-muted-foreground">AI-powered demand forecasting for Ramadan fasting health impacts and Hajj pilgrimage medical operations. Covers 2.5M+ Hajj pilgrims and demand shifts for 34M Saudi patients during fasting months. Generates pre-emptive procurement orders 8 weeks before each event.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* ── RAMADAN ── */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="text-[15px] font-bold text-emerald-700">☽</span>
                  </div>
                  <div>
                    <CardTitle>Ramadan Surge Plan 1446H</CardTitle>
                    <p className="text-[11px] text-muted-foreground">1 Mar – 30 Mar 2025 · 30 days</p>
                  </div>
                </div>
                <Badge variant="warning" className="text-[10px] ml-auto">Procurement Window: NOW</Badge>
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-secondary rounded-2xl text-center" style={{ borderLeft: "3px solid #22c55e" }}>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">DM Patients Fasting</p>
                    <p className="text-2xl font-bold text-emerald-700">4.8M</p>
                    <p className="text-[10px] text-muted-foreground">+31% medication events</p>
                  </div>
                  <div className="p-3 bg-secondary rounded-2xl text-center" style={{ borderLeft: "3px solid #f59e0b" }}>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Hypoglycemia Risk ↑</p>
                    <p className="text-2xl font-bold text-amber-700">+178%</p>
                    <p className="text-[10px] text-muted-foreground">vs. non-Ramadan baseline</p>
                  </div>
                  <div className="p-3 bg-secondary rounded-2xl text-center" style={{ borderLeft: "3px solid #ef4444" }}>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">ER Visits Expected</p>
                    <p className="text-2xl font-bold text-red-700">+24K</p>
                    <p className="text-[10px] text-muted-foreground">Primarily DKA + dehydration</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5"><AlertTriangle className="w-3 h-3 text-amber-500" /> Critical Drug Demand Adjustments</p>
                  {[
                    { drug: "Insulin Glargine (Long-acting)", surge: "+42%", reason: "Modified dosing schedule for fasting — all DM T1 patients", qty: "840,000 vials", action: "Order Now" },
                    { drug: "Glucagon Emergency Kit", surge: "+89%", reason: "Severe hypoglycemia rescue — highest Ramadan risk", qty: "180,000 kits", action: "URGENT ORDER" },
                    { drug: "Oral Rehydration Salts (ORS)", surge: "+220%", reason: "Dehydration from prolonged fasting in heat", qty: "4,200,000 sachets", action: "Order Now" },
                    { drug: "Metformin IR → ER Switch", surge: "+67%", reason: "Fasting patients switched to once-daily ER formulation", qty: "1,100,000 tablets", action: "Order Now" },
                    { drug: "SGLT2 Inhibitors (Empagliflozin)", surge: "+34%", reason: "DKA risk — patients may need dose hold protocols", qty: "320,000 tablets", action: "Monitor" },
                    { drug: "IV Dextrose 5% / 10%", surge: "+156%", reason: "Hospital ER treatment of hypoglycemia episodes", qty: "240,000 L", action: "URGENT ORDER" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-secondary rounded-2xl">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground">{item.drug}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{item.reason}</p>
                        <p className="text-[10px] font-semibold text-primary mt-0.5">Procurement: {item.qty}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-bold ${item.surge.startsWith("+1") || item.surge.startsWith("+2") ? "text-red-600" : "text-amber-600"}`}>{item.surge}</p>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full bg-secondary ${item.action === "URGENT ORDER" ? "text-red-700" : item.action === "Monitor" ? "text-amber-700" : "text-emerald-700"}`}>{item.action}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3.5 bg-secondary rounded-2xl" style={{ borderLeft: "3px solid #22c55e" }}>
                  <p className="text-[10px] font-bold text-foreground mb-2 flex items-center gap-1.5"><Brain className="w-3 h-3" /> AI Medication Timing Protocol Recommendation</p>
                  <p className="text-xs text-muted-foreground">SANAD AI recommends auto-generating "Ramadan Medication Guide" for all DM + HTN patients in app. Notify 2 weeks before Ramadan with personalized dosing schedule adjustment. Expected: 34% reduction in Ramadan hypoglycemia admissions.</p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button className="flex items-center gap-1.5 text-[11px] font-bold text-foreground bg-secondary hover:bg-border px-3 py-1.5 rounded-full transition-colors">
                    <ShoppingCart className="w-3 h-3" /> Generate All Ramadan Orders
                  </button>
                  <button className="flex items-center gap-1.5 text-[11px] font-bold text-foreground bg-secondary hover:bg-border px-3 py-1.5 rounded-full transition-colors">
                    <Brain className="w-3 h-3" /> Export Ramadan Protocol
                  </button>
                </div>
              </CardBody>
            </Card>

            {/* ── HAJJ ── */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-amber-700" />
                  </div>
                  <div>
                    <CardTitle>Hajj Medical Stockpile 1446H</CardTitle>
                    <p className="text-[11px] text-muted-foreground">4 Jun – 9 Jun 2025 · 2.5M Pilgrims</p>
                  </div>
                </div>
                <Badge variant="destructive" className="text-[10px] ml-auto">Pre-order Deadline: 30 Days</Badge>
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-secondary rounded-2xl text-center" style={{ borderLeft: "3px solid #f59e0b" }}>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Pilgrims Expected</p>
                    <p className="text-2xl font-bold text-amber-700">2.5M</p>
                    <p className="text-[10px] text-muted-foreground">from 160+ countries</p>
                  </div>
                  <div className="p-3 bg-secondary rounded-2xl text-center" style={{ borderLeft: "3px solid #ef4444" }}>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Heat Stroke Risk</p>
                    <p className="text-2xl font-bold text-red-700">48°C</p>
                    <p className="text-[10px] text-muted-foreground">Peak Makkah temp June</p>
                  </div>
                  <div className="p-3 bg-secondary rounded-2xl text-center" style={{ borderLeft: "3px solid #8b5cf6" }}>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Medical Facilities</p>
                    <p className="text-2xl font-bold text-violet-700">147</p>
                    <p className="text-[10px] text-muted-foreground">Hajj clinics + field units</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5"><AlertTriangle className="w-3 h-3 text-red-500" /> Hajj Strategic Medical Stockpile</p>
                  {[
                    { drug: "Meningococcal ACWY Vaccine", qty: "3,200,000 doses", risk: "Meningococcal meningitis — mandatory WHO requirement", status: "CONFIRMED", progress: 94 },
                    { drug: "IV Crystalloids (NS + RL 1L bags)", qty: "1,800,000 L", risk: "Heat stroke / severe dehydration management", status: "80% ORDERED", progress: 80 },
                    { drug: "Cooling Gel Blankets", qty: "48,000 units", risk: "Exertional heat stroke — field cooling in Mina/Arafat", status: "ORDER NOW", progress: 12 },
                    { drug: "Morphine + Fentanyl (PCA)", qty: "180,000 doses", risk: "Crush injuries (Jamarat) + fracture management", status: "IN TRANSIT", progress: 65 },
                    { drug: "Oral Rehydration Salts", qty: "8,400,000 sachets", risk: "Gastroenteritis + dehydration — mass distribution", status: "CONFIRMED", progress: 100 },
                    { drug: "Ciprofloxacin 500mg", qty: "2,100,000 tablets", risk: "Traveler's diarrhea + respiratory infections", status: "60% ORDERED", progress: 60 },
                    { drug: "Salbutamol Inhalers", qty: "320,000 units", risk: "Asthma exacerbation in dust/heat environment", status: "ORDER NOW", progress: 25 },
                    { drug: "Blood Glucose Test Strips", qty: "4,200,000 strips", risk: "DM management in 847K diabetic pilgrims", status: "IN TRANSIT", progress: 72 },
                  ].map((item, i) => {
                    const progColor = item.progress >= 90 ? "bg-emerald-500" : item.progress >= 60 ? "bg-amber-500" : "bg-red-500";
                    const statusColor = item.status === "CONFIRMED" ? "text-emerald-700 bg-secondary" : item.status.includes("ORDER NOW") ? "text-red-700 bg-secondary" : item.status.includes("ORDERED") ? "text-amber-700 bg-secondary" : "text-sky-700 bg-secondary";
                    return (
                      <div key={i} className="p-3 bg-secondary rounded-2xl">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-foreground">{item.drug}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{item.risk}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${statusColor}`}>{item.status}</span>
                            <p className="text-[10px] font-semibold text-primary mt-1">{item.qty}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${progColor}`} style={{ width: `${item.progress}%` }} />
                          </div>
                          <span className="text-[10px] font-bold text-muted-foreground shrink-0">{item.progress}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 bg-secondary rounded-2xl" style={{ borderLeft: "3px solid #f59e0b" }}>
                    <p className="text-[10px] font-bold text-foreground mb-2 flex items-center gap-1.5"><Zap className="w-3 h-3" /> Hajj AI Command Center</p>
                    <p className="text-xs text-muted-foreground">Real-time pilgrim health monitoring via wearable integration. AI predicts heat stroke events 45 min in advance based on heat index + activity pattern + hydration markers.</p>
                  </div>
                  <div className="p-3.5 bg-secondary rounded-2xl" style={{ borderLeft: "3px solid #ef4444" }}>
                    <p className="text-[10px] font-bold text-foreground mb-2 flex items-center gap-1.5"><AlertTriangle className="w-3 h-3" /> Critical Gaps (Act Now)</p>
                    <div className="space-y-1">
                      {["Cooling Gel Blankets — Only 12% ordered", "Salbutamol Inhalers — 25% ordered", "Ciprofloxacin — 60% ordered"].map((g, i) => (
                        <p key={i} className="text-[10px] text-red-700 font-semibold flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />{g}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button className="flex items-center gap-1.5 text-[11px] font-bold text-foreground bg-secondary hover:bg-border px-3 py-1.5 rounded-full transition-colors">
                    <ShoppingCart className="w-3 h-3" /> Generate Gap Orders
                  </button>
                  <button className="flex items-center gap-1.5 text-[11px] font-bold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-full transition-colors">
                    <AlertTriangle className="w-3 h-3" /> Escalate to MOH
                  </button>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Seasonal Demand Forecast Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /><CardTitle>12-Month Seasonal Demand Forecast — Critical Drugs</CardTitle></div>
              <Badge variant="info" className="text-[10px]">Ramadan + Hajj surge periods highlighted</Badge>
            </CardHeader>
            <CardBody>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[
                    { month: "Jan", insulin: 8200, ors: 4100, glucagon: 1200 },
                    { month: "Feb", insulin: 8400, ors: 4200, glucagon: 1250 },
                    { month: "Mar", insulin: 11800, ors: 13200, glucagon: 2270 },
                    { month: "Apr", insulin: 8600, ors: 4500, glucagon: 1300 },
                    { month: "May", insulin: 8700, ors: 4600, glucagon: 1320 },
                    { month: "Jun", insulin: 9800, ors: 18400, glucagon: 1500 },
                    { month: "Jul", insulin: 9900, ors: 7200, glucagon: 1550 },
                    { month: "Aug", insulin: 9100, ors: 4900, glucagon: 1380 },
                    { month: "Sep", insulin: 9200, ors: 5100, glucagon: 1400 },
                    { month: "Oct", insulin: 9300, ors: 5200, glucagon: 1420 },
                    { month: "Nov", insulin: 9400, ors: 5300, glucagon: 1450 },
                    { month: "Dec", insulin: 9500, ors: 5400, glucagon: 1470 },
                  ]} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                    <defs>
                      <linearGradient id="gInsulin" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#007AFF" stopOpacity={0.15} /><stop offset="95%" stopColor="#007AFF" stopOpacity={0} /></linearGradient>
                      <linearGradient id="gOrs" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.15} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                      <linearGradient id="gGlucagon" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} /><stop offset="95%" stopColor="#f59e0b" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <ReferenceLine x="Mar" stroke="#22c55e" strokeDasharray="4 2" label={{ value: "Ramadan", position: "top", fontSize: 10, fill: "#22c55e" }} />
                    <ReferenceLine x="Jun" stroke="#f59e0b" strokeDasharray="4 2" label={{ value: "Hajj Season", position: "top", fontSize: 10, fill: "#f59e0b" }} />
                    <Area type="monotone" dataKey="insulin" name="Insulin (000 vials)" stroke="#007AFF" fill="url(#gInsulin)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="ors" name="ORS (000 sachets)" stroke="#10b981" fill="url(#gOrs)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="glucagon" name="Glucagon Kits" stroke="#f59e0b" fill="url(#gGlucagon)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </Layout>
  );
}
