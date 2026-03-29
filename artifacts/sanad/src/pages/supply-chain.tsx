import React, { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardHeader, CardTitle, CardBody, Badge, PageHeader, KpiCard } from "@/components/shared";
import {
  Package, AlertTriangle, TrendingUp, Brain, Truck, Zap, CheckCircle2,
  BarChart2, Globe, AlertCircle, ArrowUpRight, Clock, RefreshCw,
  MapPin, ShoppingCart, Calendar, ChevronRight, TrendingDown
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

const STATUS_CFG: Record<string, { bg: string; border: string; text: string; badge: any; dot: string }> = {
  critical: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", badge: "destructive" as const, dot: "bg-red-500 animate-pulse" },
  low: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", badge: "warning" as const, dot: "bg-amber-500" },
  adequate: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", badge: "success" as const, dot: "bg-emerald-500" },
  High: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", badge: "success" as const, dot: "bg-emerald-500" },
  Medium: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", badge: "warning" as const, dot: "bg-amber-500" },
  Low: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", badge: "destructive" as const, dot: "bg-red-500" },
};

const SHORTAGE_PREDICTIONS = [
  { drug: "Warfarin 5mg", day30: 850, day60: 320, day90: 0, current: 1200, min: 2000 },
  { drug: "Amiodarone 200mg", day30: 540, day60: 180, day90: 0, current: 850, min: 1500 },
  { drug: "Insulin Glargine", day30: 1900, day60: 1200, day90: 600, current: 2400, min: 2000 },
  { drug: "Amlodipine 5mg", day30: 5800, day60: 5200, day90: 4600, current: 6200, min: 3000 },
  { drug: "Metformin 500mg", day30: 11200, day60: 10100, day90: 9100, current: 12400, min: 5000 },
];

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

type ViewTab = "inventory" | "predictions" | "distribution" | "reorder";

export default function SupplyChainPortal() {
  const [activeTab, setActiveTab] = useState<ViewTab>("inventory");
  const [reorderResults, setReorderResults] = useState<Record<string, any>>({});

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
        <div className="flex items-center justify-center gap-3 py-20 text-muted-foreground">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-lime-600" />
          <span className="text-sm font-medium">Loading inventory data...</span>
        </div>
      </Layout>
    );
  }

  const TABS: { id: ViewTab; label: string; icon: React.ElementType }[] = [
    { id: "inventory", label: "Inventory Status", icon: Package },
    { id: "predictions", label: "AI Shortage Predictions", icon: Brain },
    { id: "distribution", label: "Regional Distribution", icon: Globe },
    { id: "reorder", label: "Purchase Orders", icon: ShoppingCart },
  ];

  const criticals = data?.summary?.criticalShortages ?? 0;

  return (
    <Layout role="supply-chain">
      {/* Priority Strip */}
      {criticals > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-red-600 text-white rounded-2xl mb-5">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <p className="text-xs font-bold uppercase tracking-widest">
            {criticals} CRITICAL SHORTAGE{criticals > 1 ? "S" : ""} —{" "}
            {data?.criticalAlerts?.map((a: any) => a.drug).join(" · ")}
          </p>
          <button onClick={() => setActiveTab("reorder")} className="ml-auto text-[11px] font-bold bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors">
            Issue Purchase Orders →
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 mb-5">
        <div className="flex items-center gap-2 bg-lime-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-full uppercase tracking-widest">
          <Package className="w-3 h-3" />
          Supply Chain
        </div>
        <div className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full ${criticals > 0 ? "text-red-600 bg-red-50" : "text-emerald-600 bg-emerald-50"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${criticals > 0 ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`} />
          {criticals > 0 ? `${criticals} Critical Shortages` : "No Critical Shortages"}
        </div>
        <div className="ml-auto font-mono text-[11px] text-muted-foreground bg-secondary border border-border px-3 py-1.5 rounded-full">
          Inventory Value: SAR {data?.summary?.totalInventoryValue?.toLocaleString()}
        </div>
      </div>

      <PageHeader
        title="National Drug Supply Chain"
        subtitle="Real-time inventory · AI shortage prediction · Regional distribution optimization · Procurement management"
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard title="Total Drug Lines" value={data?.summary?.totalDrugs} sub="Tracked nationally" icon={Package} iconBg="bg-lime-100" iconColor="text-lime-700" />
        <KpiCard
          title="Critical Shortages" value={data?.summary?.criticalShortages}
          sub={`${data?.summary?.reorderAlerts} reorder alerts active`}
          icon={AlertTriangle} iconBg={criticals > 0 ? "bg-red-100" : "bg-emerald-100"} iconColor={criticals > 0 ? "text-red-600" : "text-emerald-600"}
        />
        <KpiCard title="Adequate Stock" value={data?.summary?.adequate} sub="Lines fully stocked" icon={CheckCircle2} iconBg="bg-emerald-100" iconColor="text-emerald-600" />
        <KpiCard title="Inventory Value" value={`SAR ${data?.summary?.totalInventoryValue?.toLocaleString()}`} sub="Current stock value" icon={BarChart2} iconBg="bg-primary/10" iconColor="text-primary" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-5">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                activeTab === tab.id ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3 h-3" />
              {tab.label}
              {tab.id === "reorder" && criticals > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                  {criticals}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── INVENTORY ─── */}
      {activeTab === "inventory" && (
        <div className="space-y-4">
          <div className="grid grid-cols-12 gap-5">
            <Card className="col-span-8">
              <CardHeader><Package className="w-4 h-4 text-lime-700" /><CardTitle>Drug Inventory — All Lines</CardTitle></CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-secondary/50 border-b border-border">
                      {["Drug", "Category", "Stock", "Min Required", "Days Remaining", "Status"].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data?.inventory?.map((item: any, i: number) => {
                      const cfg = STATUS_CFG[item.status] ?? STATUS_CFG.adequate;
                      return (
                        <tr key={i} className={`${item.status === "critical" ? "bg-red-50/30" : ""} hover:bg-secondary/20`}>
                          <td className="px-4 py-3">
                            <p className="text-sm font-semibold text-foreground">{item.drugName}</p>
                            <p className="text-[10px] text-muted-foreground">{item.supplier}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs bg-secondary border border-border px-2 py-0.5 rounded-full">{item.category}</span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-bold text-foreground">{item.stock.toLocaleString()}</p>
                            <p className="text-[10px] text-muted-foreground">{item.unit}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs text-muted-foreground">{item.minStock.toLocaleString()}</p>
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
                      <div key={i} className={`px-3.5 py-3 ${cfg.bg} border ${cfg.border} rounded-2xl`}>
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
                <CardHeader><TrendingUp className="w-4 h-4 text-lime-700" /><CardTitle>6-Month Consumption</CardTitle></CardHeader>
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
          <div className="flex items-start gap-4 px-5 py-4 bg-violet-50 border border-violet-200 rounded-2xl">
            <Brain className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-violet-800">AI Supply Forecasting Engine v2.1</p>
              <p className="text-xs text-violet-600 mt-0.5">
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
                <div key={i} className="flex items-start gap-4 px-4 py-3.5 bg-violet-50 border border-violet-100 rounded-2xl">
                  <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
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
                  <BarChart data={SHORTAGE_PREDICTIONS} layout="vertical" margin={{ top: 0, right: 30, left: 140, bottom: 0 }}>
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
                <div key={idx} className={`px-4 py-3.5 ${cfg.bg} border ${cfg.border} rounded-2xl`}>
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
                    className={`mt-3 w-full text-xs font-semibold py-1.5 rounded-xl transition-colors ${reorderResults[item.drugName] ? "bg-emerald-100 text-emerald-700" : "bg-red-600 hover:bg-red-700 text-white"}`}
                  >
                    {reorderResults[item.drugName] ? `✓ Order Placed: ${reorderResults[item.drugName]?.orderId}` : "Issue Emergency Order"}
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
          <div className="flex items-center gap-3 px-4 py-3 bg-sky-50 border border-sky-200 rounded-2xl">
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
                  <div key={i} className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl border ${r.gap < 0 ? "bg-red-50 border-red-100" : "bg-emerald-50 border-emerald-100"}`}>
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
                <div key={i} className={`flex items-start gap-4 px-4 py-3.5 rounded-2xl border ${rec.priority === "high" ? "bg-amber-50 border-amber-200" : "bg-sky-50 border-sky-200"}`}>
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
                    <div key={i} className="flex items-center gap-4 px-5 py-4 bg-red-50/30">
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
                          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors ${item.status === "critical" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-amber-100 hover:bg-amber-200 text-amber-800"}`}
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
    </Layout>
  );
}
