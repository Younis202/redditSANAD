import React from "react";
import { Layout } from "@/components/layout";
import { Card, CardHeader, CardTitle, CardBody, Badge, PageHeader, KpiCard } from "@/components/shared";
import { Package, AlertTriangle, TrendingUp, Brain, Truck, Zap, CheckCircle2, X, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";

async function fetchInventory() {
  const res = await fetch("/api/supply-chain/inventory");
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

const STATUS_CONFIG = {
  critical: { color: "text-red-700", bg: "bg-red-50", border: "border-red-300", badge: "destructive" as const, icon: X },
  low: { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", badge: "warning" as const, icon: AlertTriangle },
  adequate: { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", badge: "success" as const, icon: CheckCircle2 },
};

const CATEGORY_COLORS: Record<string, string> = {
  "Antidiabetic": "#007AFF",
  "Antihypertensive": "#22c55e",
  "Anticoagulant": "#ef4444",
  "Statin": "#f59e0b",
  "Antiarrhythmic": "#8b5cf6",
  "Insulin": "#ec4899",
  "Bronchodilator": "#06b6d4",
  "PPI": "#64748b",
  "Beta-Blocker": "#0d9488",
  "Antiplatelet": "#84cc16",
};

export default function SupplyChainPortal() {
  const { data, isLoading } = useQuery({ queryKey: ["supply-chain"], queryFn: fetchInventory, refetchInterval: 60000 });

  if (isLoading) {
    return (
      <Layout role="supply-chain">
        <div className="flex items-center justify-center gap-3 py-20 text-muted-foreground">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500" />
          <span className="text-sm font-medium">Loading inventory data...</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout role="supply-chain">
      <div className="flex items-center gap-2 mb-5">
        <div className="flex items-center gap-2 bg-orange-600 text-white text-xs font-bold px-3.5 py-1.5 rounded-full uppercase tracking-widest">
          <Package className="w-3 h-3" />
          Supply Chain Intelligence
        </div>
        {(data?.summary?.criticalShortages ?? 0) > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-full ml-auto animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            {data.summary.criticalShortages} Critical Shortage{data.summary.criticalShortages > 1 ? "s" : ""}
          </div>
        )}
      </div>

      <PageHeader title="Drug Supply Chain & Inventory Management" subtitle="Real-time drug availability, AI shortage prediction, reorder automation, and distribution center management." />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard title="Total Drug SKUs" value={data?.summary?.totalDrugs} sub="Tracked medications" icon={Package} iconBg="bg-orange-100" iconColor="text-orange-600" />
        <KpiCard title="Critical Shortages" value={data?.summary?.criticalShortages} sub="Immediate reorder required" icon={AlertTriangle} iconBg={data?.summary?.criticalShortages > 0 ? "bg-red-100" : "bg-secondary"} iconColor={data?.summary?.criticalShortages > 0 ? "text-red-600" : "text-muted-foreground"} />
        <KpiCard title="Reorder Alerts" value={data?.summary?.reorderAlerts} sub="AI-triggered reorders" icon={TrendingUp} iconBg="bg-amber-100" iconColor="text-amber-600" />
        <KpiCard title="Inventory Value" value={`SAR ${(data?.summary?.totalInventoryValue / 1000).toFixed(0)}K`} sub="Total stock value" icon={CheckCircle2} iconBg="bg-emerald-100" iconColor="text-emerald-600" />
      </div>

      {/* Critical Alerts */}
      {data?.criticalAlerts?.length > 0 && (
        <Card className="mb-5 border-red-300">
          <CardHeader>
            <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-600" /><CardTitle className="text-red-700">Critical Shortage Alerts — Immediate Action Required</CardTitle></div>
            <Badge variant="destructive">{data.criticalAlerts.length} critical</Badge>
          </CardHeader>
          <CardBody className="space-y-3">
            {data.criticalAlerts.map((alert: any, i: number) => (
              <div key={i} className="flex items-start gap-4 p-4 bg-red-50 border border-red-200 rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                  <X className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-red-800">{alert.drug}</p>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-red-600">Current: <strong>{alert.currentStock.toLocaleString()}</strong> units</span>
                    <span className="text-xs text-red-600">Required: <strong>{alert.minRequired.toLocaleString()}</strong> units</span>
                    <span className="text-xs text-red-600 font-bold">Deficit: {alert.deficit.toLocaleString()} units</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold text-muted-foreground">{alert.supplier}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Clock className="w-3 h-3 text-amber-500" />
                    <span className="text-xs text-amber-600 font-semibold">{alert.leadTimeDays}-day lead time</span>
                  </div>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-12 gap-5">
        {/* AI Predictions */}
        <Card className="col-span-5">
          <CardHeader>
            <div className="flex items-center gap-2"><Brain className="w-4 h-4 text-violet-600" /><CardTitle>AI Supply Predictions</CardTitle></div>
          </CardHeader>
          <CardBody className="space-y-3">
            {data?.aiPredictions?.map((pred: any, i: number) => (
              <div key={i} className="p-4 bg-violet-50 border border-violet-200 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-3.5 h-3.5 text-violet-600" />
                  <p className="text-xs font-bold text-violet-700">{pred.confidence}% confidence</p>
                </div>
                <p className="text-sm font-semibold text-foreground mb-1.5">{pred.prediction}</p>
                <div className="flex items-start gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">{pred.action}</p>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        {/* Distribution Centers */}
        <Card className="col-span-7">
          <CardHeader>
            <div className="flex items-center gap-2"><Truck className="w-4 h-4 text-primary" /><CardTitle>Distribution Centers</CardTitle></div>
          </CardHeader>
          <CardBody className="space-y-3">
            {data?.distributionCenters?.map((dc: any, i: number) => {
              const stockCfg = dc.stock === "Low" ? STATUS_CONFIG.low : dc.stock === "High" ? STATUS_CONFIG.adequate : { color: "text-sky-700", bg: "bg-sky-50", border: "border-sky-200", badge: "info" as const, icon: TrendingUp };
              return (
                <div key={i} className={`flex items-center gap-4 p-4 ${stockCfg.bg} border ${stockCfg.border} rounded-2xl`}>
                  <Truck className={`w-4 h-4 ${stockCfg.color} shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">{dc.name}</p>
                    <p className="text-xs text-muted-foreground">Capacity: {dc.capacity} · Next delivery: {dc.nextDelivery}</p>
                  </div>
                  <Badge variant={stockCfg.badge}>{dc.stock} Stock</Badge>
                </div>
              );
            })}
          </CardBody>
        </Card>

        {/* Inventory Table */}
        <Card className="col-span-12">
          <CardHeader>
            <div className="flex items-center gap-2"><Package className="w-4 h-4 text-orange-600" /><CardTitle>Full Inventory Status</CardTitle></div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600"><span className="w-2 h-2 rounded-full bg-emerald-500" />Adequate: {data?.summary?.adequate}</span>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600"><span className="w-2 h-2 rounded-full bg-amber-500" />Low: {data?.summary?.lowStock}</span>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-red-600"><span className="w-2 h-2 rounded-full bg-red-500" />Critical: {data?.summary?.criticalShortages}</span>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <div className="divide-y divide-border">
              <div className="grid grid-cols-7 gap-4 px-5 py-2.5 bg-secondary/50 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                <div className="col-span-2">Drug Name</div>
                <div>Category</div>
                <div>Stock</div>
                <div>Min Required</div>
                <div>Days of Supply</div>
                <div>Status</div>
              </div>
              {data?.inventory?.map((item: any, i: number) => {
                const cfg = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.adequate;
                const StatusIcon = cfg.icon;
                return (
                  <div key={i} className={`grid grid-cols-7 gap-4 px-5 py-3.5 items-center hover:bg-secondary/20 transition-colors ${item.status === "critical" ? "bg-red-50/50" : ""}`}>
                    <div className="col-span-2">
                      <p className="text-sm font-semibold text-foreground">{item.drugName}</p>
                      <p className="text-xs text-muted-foreground">{item.supplier}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white" style={{ background: CATEGORY_COLORS[item.category] ?? "#64748b" }}>{item.category}</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{item.stock.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{item.unit}</p>
                    </div>
                    <div className="text-sm text-muted-foreground">{item.minStock.toLocaleString()}</div>
                    <div>
                      <p className={`text-sm font-bold ${item.daysOfStock <= 7 ? "text-red-600" : item.daysOfStock <= 14 ? "text-amber-600" : "text-foreground"}`}>{item.daysOfStock} days</p>
                      {item.projectedStockoutDays !== null && (
                        <p className="text-[10px] text-red-500 font-semibold">Stockout in {item.projectedStockoutDays}d</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusIcon className={`w-4 h-4 ${cfg.color} shrink-0`} />
                      <Badge variant={cfg.badge}>{item.status}</Badge>
                      {item.reorderNeeded && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">Reorder</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      </div>
    </Layout>
  );
}
