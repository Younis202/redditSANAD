import React, { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardHeader, CardTitle, CardBody, Input, Button, Badge, DataLabel } from "@/components/shared";
import {
  Users, Search, Heart, AlertTriangle, Shield, Dna, CalendarDays, Activity,
  User, X, ChevronRight, TrendingUp, Brain, Zap, CheckCircle2, Clock, Info, Bell
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSseAlerts } from "@/hooks/use-sse-alerts";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, BarChart, Bar, Cell, Legend
} from "recharts";

async function fetchFamilyData(nationalId: string) {
  const res = await fetch(`/api/family/patient/${nationalId}`);
  if (!res.ok) throw new Error("Not found");
  return res.json();
}

const RISK_CONFIG = {
  high: { color: "text-red-600", bg: "bg-secondary", borderColor: "#ef4444", badge: "destructive" as const, dot: "bg-red-500", bar: "#ef4444" },
  medium: { color: "text-amber-600", bg: "bg-secondary", borderColor: "#f59e0b", badge: "warning" as const, dot: "bg-amber-500", bar: "#f59e0b" },
  low: { color: "text-emerald-600", bg: "bg-secondary", borderColor: "#22c55e", badge: "success" as const, dot: "bg-emerald-500", bar: "#22c55e" },
};

const STATUS_CONFIG = {
  "high-risk": { bg: "bg-secondary", borderColor: "#ef4444", text: "text-red-600", ringColor: "ring-red-400", dotColor: "bg-red-500" },
  "moderate": { bg: "bg-secondary", borderColor: "#f59e0b", text: "text-amber-600", ringColor: "ring-amber-400", dotColor: "bg-amber-500" },
  "healthy": { bg: "bg-secondary", borderColor: "#22c55e", text: "text-emerald-600", ringColor: "ring-emerald-400", dotColor: "bg-emerald-500" },
};

function FamilyMemberCard({ member, isPatient = false }: { member: any; isPatient?: boolean }) {
  const statusCfg = STATUS_CONFIG[member.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG["healthy"];
  const riskColor = member.riskScore >= 70 ? "text-red-600" : member.riskScore >= 40 ? "text-amber-600" : "text-emerald-600";
  const riskBorderColor = member.riskScore >= 70 ? "#ef4444" : member.riskScore >= 40 ? "#f59e0b" : "#22c55e";

  return (
    <div className={`relative p-4 rounded-2xl transition-all ${isPatient ? "bg-primary/5 ring-2 ring-primary/30" : `${statusCfg.bg}`}`}>
      {isPatient && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-bold bg-primary text-white px-2.5 py-0.5 rounded-full whitespace-nowrap uppercase tracking-widest">
          INDEX PATIENT
        </div>
      )}
      <div className="flex items-start gap-2.5 mb-2.5">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isPatient ? "bg-primary/20" : statusCfg.bg}`}>
          <User className={`w-4 h-4 ${isPatient ? "text-primary" : statusCfg.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{member.fullName}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-muted-foreground">{member.relationship ?? "Patient"}</span>
            <span className="text-[10px] text-muted-foreground">·</span>
            <span className="text-[10px] text-muted-foreground">Age {member.age}</span>
            <span className="text-[10px] text-muted-foreground">·</span>
            <span className="text-[10px] font-bold text-red-500">{member.bloodType}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-secondary" style={{ borderLeft: `3px solid ${riskBorderColor}` }}>
        <div>
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">AI Risk</p>
          <p className={`text-xl font-bold ${riskColor}`}>{member.riskScore}</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Conditions</p>
          <p className="text-sm font-bold text-foreground">{member.chronicConditions?.length ?? 0}</p>
        </div>
      </div>
      {member.sharedConditions?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          <span className="text-[9px] font-bold text-muted-foreground w-full mb-0.5">SHARED:</span>
          {member.sharedConditions.map((c: string, i: number) => (
            <span key={i} className="text-[9px] font-bold bg-secondary text-red-600 px-1.5 py-0.5 rounded-full">{c}</span>
          ))}
        </div>
      )}
      {member.chronicConditions?.length > 0 && !member.sharedConditions?.length && (
        <div className="mt-2 flex flex-wrap gap-1">
          {member.chronicConditions.slice(0, 2).map((c: string, i: number) => (
            <span key={i} className="text-[9px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full">{c}</span>
          ))}
          {member.chronicConditions.length > 2 && <span className="text-[9px] text-muted-foreground">+{member.chronicConditions.length - 2}</span>}
        </div>
      )}
    </div>
  );
}

type TabId = "tree" | "genetics" | "burden" | "screening";

export default function FamilyPortal() {
  const [searchId, setSearchId] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("tree");
  const [expandedRisk, setExpandedRisk] = useState<number | null>(null);
  const [showSsePanel, setShowSsePanel] = useState(false);
  const { alerts: sseAlerts, unreadCount: sseUnread, markRead: markSseRead, clearAll: clearSseAlerts } = useSseAlerts("family");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["family-data", nationalId],
    queryFn: () => fetchFamilyData(nationalId),
    enabled: !!nationalId,
    retry: false,
  });

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "tree", label: "Family Tree", icon: <Users className="w-3.5 h-3.5" /> },
    { id: "genetics", label: "Genetic Risks", icon: <Dna className="w-3.5 h-3.5" /> },
    { id: "burden", label: "Condition Burden", icon: <Activity className="w-3.5 h-3.5" /> },
    { id: "screening", label: "Screening Plan", icon: <Shield className="w-3.5 h-3.5" /> },
  ];

  return (
    <Layout role="family">
      {/* ══════════════════════════════════════════════════
          FAMILY HEALTH INTELLIGENCE HEADER
      ══════════════════════════════════════════════════ */}
      <div className="rounded-3xl overflow-hidden mb-6"
        style={{ background: "linear-gradient(135deg, #0a0108 0%, #1a0818 50%, #090006 100%)", boxShadow: "0 0 60px rgba(219,39,119,0.10)" }}>
        <div className="h-1" style={{ background: "linear-gradient(90deg, #831843, #db2777, #f472b6, #db2777, #831843)" }} />

        <div className="px-6 py-5">
          {/* Identity + Search */}
          <div className="flex items-start justify-between gap-6 mb-5">
            <div className="flex items-center gap-4 shrink-0">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(219,39,119,0.22)", border: "1px solid rgba(219,39,119,0.35)" }}>
                <Heart className="w-6 h-6 text-pink-400" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white leading-tight">Family Health & Genetic Risk</h1>
                <p className="text-[11px] text-white/40 mt-0.5">Hereditary disease mapping · Genetic risk cascade · Family-wide screening coordination</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end">
              <button onClick={() => setShowSsePanel(p => !p)}
                className="relative flex items-center justify-center w-8 h-8 rounded-xl transition-all hover:opacity-80 shrink-0"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}>
                <Bell className="w-3.5 h-3.5 text-white/50" />
                {sseUnread > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-pink-500 text-white text-[9px] font-black flex items-center justify-center border border-[#0a0108]">
                    {sseUnread > 9 ? "9+" : sseUnread}
                  </span>
                )}
              </button>
              <form onSubmit={(e) => { e.preventDefault(); if (searchId.trim()) { setNationalId(searchId.trim()); setActiveTab("tree"); } }}
                className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "rgba(219,39,119,0.50)" }} />
                  <input
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value)}
                    placeholder="National ID — load family health profile..."
                    className="w-full h-10 pl-9 pr-4 rounded-xl text-sm font-mono text-white placeholder:text-white/25 focus:outline-none"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: searchId ? "1.5px solid rgba(219,39,119,0.55)" : "1px solid rgba(255,255,255,0.10)",
                    }}
                  />
                </div>
                <button type="submit"
                  className="h-10 px-5 rounded-xl font-black text-sm text-white shrink-0"
                  style={{ background: "linear-gradient(135deg, #db2777, #9d174d)", boxShadow: "0 2px 12px rgba(219,39,119,0.25)" }}>
                  Load
                </button>
              </form>
            </div>
          </div>

          {/* 5 KPI Glow Cards */}
          <div className="grid grid-cols-5 gap-3 mb-5">
            {[
              {
                label: "Family Members",
                value: data ? String(data.summary?.totalMembers ?? data.members?.length ?? "—") : "—",
                sub: data ? `${data.summary?.highRiskMembers ?? 0} high-risk` : "Pending load",
                accent: "#db2777",
                glow: "radial-gradient(ellipse at 20% 50%, rgba(219,39,119,0.18) 0%, transparent 70%)",
              },
              {
                label: "Shared Conditions",
                value: data ? String(data.sharedConditions?.length ?? data.summary?.sharedConditionsCount ?? "—") : "—",
                sub: data ? "Hereditary links" : "Pending load",
                accent: "#f472b6",
                glow: "radial-gradient(ellipse at 20% 50%, rgba(244,114,182,0.15) 0%, transparent 70%)",
              },
              {
                label: "Family Risk Score",
                value: data ? String(data.familyRiskScore ?? "—") : "—",
                sub: data ? (data.summary?.overallFamilyRisk ?? "Assessed") : "Pending load",
                accent: data?.summary?.overallFamilyRisk === "HIGH" ? "#ef4444" : data?.summary?.overallFamilyRisk === "MODERATE" ? "#f59e0b" : "#22c55e",
                glow: `radial-gradient(ellipse at 20% 50%, ${data?.summary?.overallFamilyRisk === "HIGH" ? "rgba(239,68,68,0.18)" : "rgba(219,39,119,0.15)"} 0%, transparent 70%)`,
              },
              {
                label: "Genetic Risk Factors",
                value: data ? String(data.geneticRisks?.length ?? "—") : "—",
                sub: data ? `${data.geneticRisks?.filter((r: any) => r.riskLevel === "high").length ?? 0} high-penetrance` : "Pending load",
                accent: "#a855f7",
                glow: "radial-gradient(ellipse at 20% 50%, rgba(168,85,247,0.15) 0%, transparent 70%)",
              },
              {
                label: "Heritability Score",
                value: data ? String(data.heritabilityScore ?? "—") : "—",
                sub: data ? "/100" : "Pending load",
                accent: data?.heritabilityScore >= 70 ? "#ef4444" : data?.heritabilityScore >= 40 ? "#f59e0b" : "#22c55e",
                glow: "radial-gradient(ellipse at 20% 50%, rgba(219,39,119,0.12) 0%, transparent 70%)",
              },
            ].map((kpi, i) => (
              <div key={i} className="relative overflow-hidden rounded-2xl px-4 py-3"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="absolute inset-0 pointer-events-none" style={{ background: kpi.glow }} />
                <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1.5 relative">{kpi.label}</p>
                <p className="text-2xl font-black tabular-nums relative" style={{ color: kpi.accent }}>{kpi.value}</p>
                <p className="text-[10px] text-white/35 mt-0.5 relative">{kpi.sub}</p>
              </div>
            ))}
          </div>

          {/* Demo IDs */}
          {!data && !nationalId && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-white/25 uppercase tracking-wider">Demo:</span>
              {["1000000001","1000000003","1000000005"].map(id => (
                <button key={id} type="button"
                  onClick={() => { setSearchId(id); setNationalId(id); setActiveTab("tree"); }}
                  className="font-mono text-[11px] font-bold px-3 py-1 rounded-lg transition-all hover:text-pink-300"
                  style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  {id}
                </button>
              ))}
            </div>
          )}

          {/* Tab bar (only when data) */}
          {data && (
            <div className="flex gap-1.5">
              {tabs.map(t => {
                const isActive = activeTab === t.id;
                return (
                  <button key={t.id} onClick={() => setActiveTab(t.id)}
                    className="flex items-center gap-1.5 text-xs font-black px-4 py-2 rounded-xl transition-all"
                    style={{
                      background: isActive ? "rgba(219,39,119,0.30)" : "rgba(255,255,255,0.04)",
                      border:     isActive ? "1px solid rgba(219,39,119,0.50)" : "1px solid rgba(255,255,255,0.07)",
                      color:      isActive ? "white" : "rgba(255,255,255,0.35)",
                    }}>
                    {t.icon}{t.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* SSE Family Alert Panel — Dark cinematic pink */}
      {showSsePanel && sseAlerts.length > 0 && (
        <div className="mb-5 rounded-3xl overflow-hidden"
          style={{ background: "linear-gradient(135deg, #0a0108 0%, #1a0814 100%)", border: "1px solid rgba(219,39,119,0.18)" }}>
          <div className="flex items-center justify-between px-5 py-3"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(219,39,119,0.06)" }}>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
              <span className="font-black text-sm text-white">Live Family Health Alerts</span>
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full"
                style={{ background: "rgba(239,68,68,0.15)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.25)" }}>
                {sseUnread} new
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={clearSseAlerts} className="text-[11px] font-bold hover:text-white transition-colors" style={{ color: "rgba(255,255,255,0.35)" }}>Clear all</button>
              <button onClick={() => setShowSsePanel(false)} style={{ color: "rgba(255,255,255,0.35)" }} className="hover:text-white transition-colors"><X className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
            {sseAlerts.map((alert, idx) => (
              <div key={alert.id} className={`px-5 py-3 flex items-start gap-3 hover:bg-white/[0.02] transition-colors ${alert.read ? "opacity-50" : ""}`}
                style={{ borderBottom: idx < sseAlerts.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                <Heart className={`mt-0.5 w-4 h-4 shrink-0 ${alert.severity === "critical" ? "text-red-400" : "text-pink-400"}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-white">{alert.title}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                    Patient: {alert.patientName} · ID: {alert.nationalId}
                  </p>
                  {alert.recommendation && <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{alert.recommendation}</p>}
                  <p className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>{new Date(alert.timestamp).toLocaleTimeString()}</p>
                </div>
                <button
                  onClick={() => { setSearchId(alert.nationalId ?? ""); setNationalId(alert.nationalId ?? ""); markSseRead(alert.id); }}
                  className="text-[10px] font-black px-3 py-1.5 rounded-xl shrink-0 transition-all hover:opacity-90"
                  style={{ background: "rgba(219,39,119,0.20)", color: "#f9a8d4", border: "1px solid rgba(219,39,119,0.30)" }}>
                  Load Family
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!nationalId && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center rounded-3xl" style={{ border: "1px solid rgba(219,39,119,0.10)" }}>
          <Heart className="w-10 h-10 text-pink-400/30" />
          <p className="font-bold text-foreground">Enter a National ID above to load the family health profile</p>
          <p className="text-sm text-muted-foreground">Genetic risk analysis · family tree · hereditary condition mapping</p>
        </div>
      )}
      {isLoading && (
        <div className="flex items-center gap-3 py-16 text-muted-foreground justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-pink-500" />
          <span className="text-sm">Loading family health data...</span>
        </div>
      )}
      {isError && nationalId && (
        <Card className="bg-secondary" style={{ borderLeft: "3px solid #ef4444" }}>
          <CardBody className="flex items-center gap-3 p-4">
            <X className="w-4 h-4 text-red-500" />
            <p className="text-sm text-red-700">Patient not found for <span className="font-mono">{nationalId}</span></p>
          </CardBody>
        </Card>
      )}

      {data && (
        <div className="space-y-5">
          {/* Alert banner strip */}
          {data.familyRiskAlert && (
            <div className="flex items-center gap-4 px-5 py-3 rounded-2xl"
              style={{
                background: data.summary.overallFamilyRisk === "HIGH" ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.08)",
                border: `1px solid ${data.summary.overallFamilyRisk === "HIGH" ? "rgba(239,68,68,0.20)" : "rgba(245,158,11,0.20)"}`,
              }}>
              <AlertTriangle className={`w-4 h-4 shrink-0 ${data.summary.overallFamilyRisk === "HIGH" ? "text-red-500" : "text-amber-500"}`} />
              <p className="text-sm font-bold text-foreground flex-1">{data.familyRiskAlert}</p>
              <div className="flex items-center gap-4 shrink-0 text-[10px]">
                <span className="text-muted-foreground">{data.summary.totalMembers} members mapped</span>
                <span className="font-bold text-red-500">{data.summary.highRiskMembers} high-risk</span>
                <span className="text-muted-foreground">{data.summary.sharedConditionsCount} shared conditions</span>
              </div>
            </div>
          )}

          {/* ─── FAMILY TREE TAB ─── */}
          {activeTab === "tree" && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2"><Users className="w-4 h-4 text-pink-600" /><CardTitle>Family Tree — Risk Map</CardTitle></div>
                <p className="text-xs text-muted-foreground ml-auto">Colors indicate AI Risk Score</p>
              </CardHeader>
              <CardBody>
                {/* ── SVG Clinical Pedigree Diagram ── */}
                {(() => {
                  const parents: any[] = data.parents ?? [];
                  const siblings: any[] = data.siblings ?? [];
                  const children: any[] = data.children ?? [];
                  const gen2 = [{ ...data.patient, relationship: "Index Patient", isPatient: true }, ...siblings];

                  const nodeR = 22;
                  const colW = 90;
                  const rowH = 90;
                  const topPad = 36;
                  const leftPad = 30;

                  const getColor = (m: any) => m.riskScore >= 70 ? "#ef4444" : m.riskScore >= 40 ? "#f59e0b" : "#22c55e";

                  const maxPerRow = Math.max(parents.length, gen2.length, children.length);
                  const svgW = Math.max(maxPerRow * colW + leftPad * 2, 300);
                  const svgH = topPad + (children.length > 0 ? 3 : 2) * rowH + 20;

                  const centerX = (list: any[], idx: number) => leftPad + (svgW - leftPad * 2) / Math.max(list.length, 1) * (idx + 0.5);
                  const p1Y = topPad + nodeR;
                  const p2Y = topPad + rowH + nodeR;
                  const p3Y = topPad + 2 * rowH + nodeR;

                  return (
                    <div className="mb-5 overflow-x-auto">
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">Clinical Pedigree Diagram</p>
                      <svg width={svgW} height={svgH} className="block mx-auto">
                        {/* Connector: Parents to Gen2 midpoint */}
                        {parents.length > 0 && (
                          <>
                            {parents.map((_, i) => (
                              <line key={i} x1={centerX(parents, i)} y1={p1Y + nodeR} x2={centerX(parents, i)} y2={p1Y + rowH * 0.4} stroke="#e2e8f0" strokeWidth={1.5} />
                            ))}
                            {parents.length >= 2 && (
                              <line x1={centerX(parents, 0)} y1={p1Y + rowH * 0.4} x2={centerX(parents, parents.length - 1)} y2={p1Y + rowH * 0.4} stroke="#e2e8f0" strokeWidth={1.5} />
                            )}
                            {/* Down to index patient */}
                            <line x1={centerX(parents, Math.floor((parents.length - 1) / 2)) + (parents.length % 2 === 0 ? colW / 4 : 0)} y1={p1Y + rowH * 0.4} x2={centerX(gen2, 0)} y2={p2Y - nodeR} stroke="#e2e8f0" strokeWidth={1.5} />
                          </>
                        )}
                        {/* Connector: Gen2 to Children */}
                        {children.length > 0 && (
                          <>
                            <line x1={centerX(gen2, 0)} y1={p2Y + nodeR} x2={centerX(gen2, 0)} y2={p2Y + rowH * 0.4} stroke="#e2e8f0" strokeWidth={1.5} />
                            {children.length >= 2 && (
                              <line x1={centerX(children, 0)} y1={p2Y + rowH * 0.4} x2={centerX(children, children.length - 1)} y2={p2Y + rowH * 0.4} stroke="#e2e8f0" strokeWidth={1.5} />
                            )}
                            {children.map((_, i) => (
                              <line key={i} x1={centerX(children, i)} y1={p2Y + rowH * 0.4} x2={centerX(children, i)} y2={p3Y - nodeR} stroke="#e2e8f0" strokeWidth={1.5} />
                            ))}
                          </>
                        )}

                        {/* Generation 1: Parents */}
                        {parents.map((m: any, i: number) => {
                          const cx = centerX(parents, i); const cy = p1Y;
                          const col = getColor(m);
                          return (
                            <g key={m.id}>
                              <circle cx={cx} cy={cy} r={nodeR} fill={col} fillOpacity={0.15} stroke={col} strokeWidth={2} />
                              <text x={cx} y={cy - 2} textAnchor="middle" fill={col} fontSize={9} fontWeight="bold">{Math.round(m.riskScore)}</text>
                              <text x={cx} y={cy + 9} textAnchor="middle" fill={col} fontSize={7}>risk</text>
                              <text x={cx} y={cy + nodeR + 12} textAnchor="middle" fill="#64748b" fontSize={8} fontWeight="bold">{m.fullName?.split(" ")[0]}</text>
                              <text x={cx} y={cy + nodeR + 22} textAnchor="middle" fill="#94a3b8" fontSize={7}>{m.relationship ?? "Parent"} · {m.age}y</text>
                            </g>
                          );
                        })}

                        {/* Generation 2: Index Patient + Siblings */}
                        {gen2.map((m: any, i: number) => {
                          const cx = centerX(gen2, i); const cy = p2Y;
                          const col = getColor(m);
                          const isP = !!m.isPatient;
                          return (
                            <g key={m.id ?? i}>
                              {isP && <circle cx={cx} cy={cy} r={nodeR + 5} fill="none" stroke="#007AFF" strokeWidth={2} strokeDasharray="4 2" />}
                              <circle cx={cx} cy={cy} r={nodeR} fill={col} fillOpacity={isP ? 0.25 : 0.12} stroke={col} strokeWidth={isP ? 2.5 : 2} />
                              <text x={cx} y={cy - 2} textAnchor="middle" fill={col} fontSize={9} fontWeight="bold">{Math.round(m.riskScore)}</text>
                              <text x={cx} y={cy + 9} textAnchor="middle" fill={col} fontSize={7}>risk</text>
                              <text x={cx} y={cy + nodeR + 14} textAnchor="middle" fill={isP ? "#007AFF" : "#64748b"} fontSize={8} fontWeight="bold">{m.fullName?.split(" ")[0]}</text>
                              <text x={cx} y={cy + nodeR + 24} textAnchor="middle" fill="#94a3b8" fontSize={7}>{isP ? "Index" : m.relationship} · {m.age}y</text>
                            </g>
                          );
                        })}

                        {/* Generation 3: Children */}
                        {children.map((m: any, i: number) => {
                          const cx = centerX(children, i); const cy = p3Y;
                          const col = getColor(m);
                          return (
                            <g key={m.id}>
                              <circle cx={cx} cy={cy} r={nodeR} fill={col} fillOpacity={0.12} stroke={col} strokeWidth={2} />
                              <text x={cx} y={cy - 2} textAnchor="middle" fill={col} fontSize={9} fontWeight="bold">{Math.round(m.riskScore)}</text>
                              <text x={cx} y={cy + 9} textAnchor="middle" fill={col} fontSize={7}>risk</text>
                              <text x={cx} y={cy + nodeR + 14} textAnchor="middle" fill="#64748b" fontSize={8} fontWeight="bold">{m.fullName?.split(" ")[0]}</text>
                              <text x={cx} y={cy + nodeR + 24} textAnchor="middle" fill="#94a3b8" fontSize={7}>{m.relationship} · {m.age}y</text>
                            </g>
                          );
                        })}

                        {/* Legend */}
                        {[{ c: "#ef4444", l: "High Risk ≥70" }, { c: "#f59e0b", l: "Moderate 40-69" }, { c: "#22c55e", l: "Low Risk <40" }].map((leg, li) => (
                          <g key={li}>
                            <circle cx={leftPad + li * 100} cy={svgH - 10} r={5} fill={leg.c} fillOpacity={0.3} stroke={leg.c} strokeWidth={1.5} />
                            <text x={leftPad + li * 100 + 9} y={svgH - 6} fill="#94a3b8" fontSize={7}>{leg.l}</text>
                          </g>
                        ))}
                      </svg>
                    </div>
                  );
                })()}

                <div className="space-y-6">
                  {/* Parents */}
                  {data.parents?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <span className="w-4 h-0.5 bg-border inline-block" /> Parents (P1)
                      </p>
                      <div className={`grid gap-4 ${data.parents.length === 1 ? "grid-cols-1 max-w-xs mx-auto" : "grid-cols-2"}`}>
                        {data.parents.map((m: any) => <FamilyMemberCard key={m.id} member={m} />)}
                      </div>
                    </div>
                  )}

                  {/* Connector line */}
                  {data.parents?.length > 0 && (
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-6 w-px bg-border" />
                      <div className="w-24 h-px bg-border" />
                      <div className="h-6 w-px bg-border" />
                    </div>
                  )}

                  {/* INDEX PATIENT + Siblings */}
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <span className="w-4 h-0.5 bg-border inline-block" /> Index Patient + Siblings (P2)
                    </p>
                    <div className={`grid gap-4 ${(data.siblings?.length + 1) <= 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                      <FamilyMemberCard member={{ ...data.patient, relationship: "Index Patient" }} isPatient />
                      {data.siblings?.map((m: any) => <FamilyMemberCard key={m.id} member={m} />)}
                    </div>
                  </div>

                  {/* Children */}
                  {data.children?.length > 0 && (
                    <>
                      <div className="flex items-center justify-center">
                        <div className="h-6 w-px bg-border" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                          <span className="w-4 h-0.5 bg-border inline-block" /> Children (P3)
                        </p>
                        <div className={`grid gap-4 ${data.children.length <= 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                          {data.children.map((m: any) => <FamilyMemberCard key={m.id} member={m} />)}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Risk Trend */}
                  {data.familyRiskTrend?.length > 0 && (
                    <div className="pt-4 border-t border-border">
                      <p className="text-xs font-bold text-muted-foreground mb-3 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-primary" /> 5-Year Family Risk Trajectory
                      </p>
                      <div className="h-36">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={data.familyRiskTrend} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11 }} domain={[0, 100]} />
                            <RechartsTooltip contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: 12 }} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Line type="monotone" dataKey="familyRisk" name="Family Risk" stroke="#ef4444" strokeWidth={2} dot={{ r: 4, fill: "#ef4444" }} />
                            <Line type="monotone" dataKey="patientRisk" name="Patient Risk" stroke="#db2777" strokeWidth={2} dot={{ r: 4, fill: "#db2777" }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          )}

          {/* ─── GENETIC RISKS TAB ─── */}
          {activeTab === "genetics" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Dna className="w-4 h-4 text-violet-600" />
                <p className="text-sm font-bold text-foreground">{data.geneticRisks?.length} Hereditary Risk Factors Identified</p>
                <Badge variant={data.geneticRisks?.filter((r: any) => r.riskLevel === "high").length > 0 ? "destructive" : "success"} className="ml-auto">
                  {data.geneticRisks?.filter((r: any) => r.riskLevel === "high").length} high-penetrance
                </Badge>
              </div>
              {data.geneticRisks?.map((risk: any, i: number) => {
                const cfg = RISK_CONFIG[risk.riskLevel as keyof typeof RISK_CONFIG] ?? RISK_CONFIG.low;
                const isExpanded = expandedRisk === i;
                return (
                  <Card key={i} className="overflow-hidden">
                    <div className={`${cfg.bg} px-5 py-4`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${cfg.dot}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`text-sm font-bold ${cfg.color}`}>{risk.condition}</p>
                            {risk.icdCode && <span className="font-mono text-[10px] bg-secondary px-1.5 py-0.5 rounded-lg text-muted-foreground border border-border">{risk.icdCode}</span>}
                            <Badge variant={cfg.badge} className="text-[10px] ml-auto shrink-0">{risk.riskLevel} penetrance</Badge>
                          </div>
                          {risk.gene && <p className="text-[11px] text-muted-foreground mt-0.5"><span className="font-semibold text-foreground">Genes:</span> {risk.gene}</p>}
                          <div className="flex items-center gap-4 mt-1.5">
                            <span className="text-[11px] text-muted-foreground"><span className="font-semibold text-foreground">Inheritance:</span> {risk.inheritanceType}</span>
                            <span className="text-[11px] text-muted-foreground"><span className="font-semibold text-foreground">Transmission:</span> {Math.round(risk.transmissionProb * 100)}%</span>
                          </div>
                        </div>
                        <button onClick={() => setExpandedRisk(isExpanded ? null : i)}
                          className="text-[10px] font-black px-2.5 py-1 rounded-xl shrink-0 transition-all hover:opacity-90"
                          style={{ background: "rgba(219,39,119,0.12)", color: "#f9a8d4", border: "1px solid rgba(219,39,119,0.20)" }}>
                          {isExpanded ? "Less" : "Details"}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <CardBody className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-secondary rounded-2xl p-3">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Inheritance Pattern</p>
                            <p className="text-xs text-foreground">{risk.inheritancePattern}</p>
                          </div>
                          <div className="bg-secondary rounded-2xl p-3">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Penetrance</p>
                            <p className="text-xs text-foreground">{risk.penetrance}</p>
                          </div>
                        </div>
                        <div className="bg-secondary rounded-2xl p-3">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Transmission Probability</p>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden border border-border">
                              <div className={`h-full rounded-full ${risk.riskLevel === "high" ? "bg-red-500" : risk.riskLevel === "medium" ? "bg-amber-500" : "bg-emerald-500"}`}
                                style={{ width: `${risk.transmissionProb * 100}%` }} />
                            </div>
                            <span className={`text-sm font-bold shrink-0 ${risk.riskLevel === "high" ? "text-red-500" : risk.riskLevel === "medium" ? "text-amber-500" : "text-emerald-500"}`}>
                              {Math.round(risk.transmissionProb * 100)}%
                            </span>
                          </div>
                        </div>
                        {risk.affectedRelatives?.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">At-Risk Relatives</p>
                            <div className="flex flex-wrap gap-1.5">
                              {risk.affectedRelatives.map((r: string, ri: number) => (
                                <span key={ri} className="text-xs font-semibold bg-secondary px-2.5 py-1 rounded-xl">{r}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-secondary border border-border">
                          <ChevronRight className={`w-4 h-4 shrink-0 mt-0.5 ${cfg.color}`} />
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Clinical Recommendation</p>
                            <p className="text-xs font-semibold text-foreground">{risk.recommendation}</p>
                          </div>
                        </div>
                      </CardBody>
                    )}

                    {!isExpanded && (
                      <div className="px-5 pb-4">
                        <div className="flex items-start gap-2 mt-2">
                          <ChevronRight className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${cfg.color}`} />
                          <p className="text-xs text-muted-foreground">{risk.recommendation}</p>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {/* ─── CONDITION BURDEN TAB ─── */}
          {activeTab === "burden" && (
            <div className="space-y-5">
              <div className="grid grid-cols-12 gap-5">
                <Card className="col-span-7">
                  <CardHeader>
                    <div className="flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /><CardTitle>Condition Burden Across Family</CardTitle></div>
                    <p className="text-xs text-muted-foreground">Family load = % of members affected</p>
                  </CardHeader>
                  <CardBody>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.conditionBurden} layout="vertical" margin={{ top: 0, right: 60, bottom: 0, left: 0 }}>
                          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 10 }} domain={[0, 100]} />
                          <YAxis type="category" dataKey="condition" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} width={170} />
                          <RechartsTooltip contentStyle={{ borderRadius: "12px", fontSize: 11 }} formatter={(v: any, n: string) => [n === "familyLoad" ? `${v}%` : v, n === "familyLoad" ? "Family Load" : "Count"]} />
                          <Bar dataKey="familyLoad" name="Family Load %" radius={[0, 6, 6, 0]} barSize={16}>
                            {data.conditionBurden?.map((_: any, i: number) => (
                              <Cell key={i} fill={i === 0 ? "#ef4444" : i === 1 ? "#f97316" : i <= 3 ? "#f59e0b" : "#007AFF"} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardBody>
                </Card>

                <Card className="col-span-5">
                  <CardHeader>
                    <div className="flex items-center gap-2"><Brain className="w-4 h-4 text-violet-600" /><CardTitle>Condition Details</CardTitle></div>
                  </CardHeader>
                  <CardBody className="space-y-2.5">
                    {data.conditionBurden?.slice(0, 6).map((c: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-secondary rounded-2xl">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${i === 0 ? "bg-red-500" : i === 1 ? "bg-orange-500" : i <= 3 ? "bg-amber-500" : "bg-blue-500"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{c.condition}</p>
                          <p className="text-[10px] text-muted-foreground">{c.penetrance}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-foreground">{c.count}</p>
                          <p className="text-[10px] text-muted-foreground">{c.familyLoad}%</p>
                        </div>
                      </div>
                    ))}
                  </CardBody>
                </Card>
              </div>

              {/* Family Risk Trajectory */}
              {data.familyRiskTrend?.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /><CardTitle>5-Year Family Risk Trajectory</CardTitle></div>
                    <Badge variant="outline">AI Projection · 2025–2029</Badge>
                  </CardHeader>
                  <CardBody>
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.familyRiskTrend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11 }} domain={[0, 100]} />
                          <RechartsTooltip contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: 12 }} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Line type="monotone" dataKey="familyRisk" name="Family Aggregate Risk" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 5, fill: "#ef4444" }} />
                          <Line type="monotone" dataKey="patientRisk" name="Patient Risk" stroke="#db2777" strokeWidth={2.5} dot={{ r: 5, fill: "#db2777" }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-3 p-3.5 bg-secondary rounded-2xl flex items-start gap-2.5" style={{ borderLeft: "3px solid #f59e0b" }}>
                      <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-foreground">AI projection based on current chronic condition trajectory, age-related risk accumulation, and hereditary penetrance rates. Assumes no major lifestyle or therapeutic intervention.</p>
                    </div>
                  </CardBody>
                </Card>
              )}
            </div>
          )}

          {/* ─── SCREENING PLAN TAB ─── */}
          {activeTab === "screening" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                <p className="text-sm font-bold text-foreground">Family-Wide Screening Protocol</p>
                <Badge variant="success" className="ml-auto">{data.screeningRecommendations?.length} active recommendations</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {data.screeningRecommendations?.map((rec: any, i: number) => {
                  const priBorderColor = rec.priority === "high" ? "#ef4444" : rec.priority === "medium" ? "#0ea5e9" : undefined;
                  const priIcon = rec.priority === "high" ? <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" /> : rec.priority === "medium" ? <Clock className="w-4 h-4 text-sky-500 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
                  return (
                    <div key={i} className="p-4 rounded-3xl bg-secondary"
                      style={priBorderColor ? { borderLeft: `3px solid ${priBorderColor}` } : {}}>
                      <div className="flex items-start gap-3 mb-3">
                        {priIcon}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground">{rec.test}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{rec.for}</p>
                        </div>
                        <Badge variant={rec.priority === "high" ? "destructive" : rec.priority === "medium" ? "info" : "success"} className="text-[10px] shrink-0">{rec.priority}</Badge>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground">{rec.frequency}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-secondary rounded-full text-muted-foreground ml-auto border border-border">Due: {rec.dueIn}</span>
                      </div>
                      {rec.members?.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Applies to</p>
                          <div className="flex flex-wrap gap-1">
                            {rec.members.slice(0, 3).map((m: string, mi: number) => (
                              <div key={mi} className="flex items-center gap-1 bg-secondary border border-border px-2 py-0.5 rounded-xl">
                                <User className="w-2.5 h-2.5 text-muted-foreground" />
                                <span className="text-[10px] font-medium text-foreground">{m.split(" ")[0]}</span>
                              </div>
                            ))}
                            {rec.members.length > 3 && <span className="text-[10px] text-muted-foreground self-center">+{rec.members.length - 3}</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Family member conditions full list */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2"><Users className="w-4 h-4 text-primary" /><CardTitle>Family Members — Full Health Summary</CardTitle></div>
                </CardHeader>
                <CardBody className="p-0">
                  <div className="divide-y divide-border">
                    {[{ ...data.patient, relationship: "Index Patient (You)" }, ...(data.familyMembers ?? [])].map((m: any, i: number) => {
                      const riskColor = m.riskScore >= 70 ? "text-red-600" : m.riskScore >= 40 ? "text-amber-600" : "text-emerald-600";
                      return (
                        <div key={i} className="flex items-center gap-4 px-5 py-3.5 hover:bg-secondary/30 transition-colors">
                          <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-foreground">{m.fullName}</p>
                              {i === 0 && <Badge variant="outline" className="text-[9px]">Index</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">{m.relationship} · Age {m.age} · {m.gender} · {m.bloodType}</p>
                          </div>
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {m.chronicConditions?.slice(0, 3).map((c: string, ci: number) => (
                              <span key={ci} className="text-[9px] font-semibold bg-secondary px-1.5 py-0.5 rounded-full text-muted-foreground">{c}</span>
                            ))}
                            {m.chronicConditions?.length > 3 && <span className="text-[9px] text-muted-foreground self-center">+{m.chronicConditions.length - 3}</span>}
                            {m.chronicConditions?.length === 0 && <span className="text-[9px] text-emerald-600 font-semibold">No chronic conditions</span>}
                          </div>
                          <div className={`flex items-center justify-center w-12 h-10 rounded-xl text-sm font-bold shrink-0 ${riskColor}`}>
                            {m.riskScore}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardBody>
              </Card>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
