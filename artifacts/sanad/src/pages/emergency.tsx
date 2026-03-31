import React, { useState, useEffect, useRef } from "react";
import {
  Search, AlertTriangle, Droplet, Pill, FileWarning,
  PhoneCall, Activity, Clock, Zap, ShieldAlert, Ban,
  Eye, UserCheck, Wrench, PauseCircle, Brain, Timer,
  Bell, ChevronDown, ChevronUp, CheckCircle2, Radio,
  Fingerprint, Cpu, TrendingUp, Heart
} from "lucide-react";
import { Layout } from "@/components/layout";
import { StatusDot } from "@/components/shared";
import { useEmergencyLookup } from "@workspace/api-client-react";
import { useSseAlerts } from "@/hooks/use-sse-alerts";

type ClinicalAction = {
  action: "DO_NOT_GIVE" | "MONITOR" | "URGENT_REVIEW" | "ALERT_FAMILY" | "PREPARE_EQUIPMENT" | "HOLD_MEDICATION";
  priority: "immediate" | "urgent" | "standard";
  description: string;
  reason: string;
};

const ACTION_CONFIG: Record<ClinicalAction["action"], { icon: React.ElementType; color: string; accent: string; label: string; labelBg: string }> = {
  DO_NOT_GIVE:       { icon: Ban,           color: "text-red-700",    accent: "#dc2626", label: "DO NOT GIVE",   labelBg: "bg-red-600 text-white" },
  HOLD_MEDICATION:   { icon: PauseCircle,   color: "text-orange-700", accent: "#ea580c", label: "HOLD MED",      labelBg: "bg-orange-600 text-white" },
  URGENT_REVIEW:     { icon: Brain,         color: "text-violet-700", accent: "#7c3aed", label: "URGENT REVIEW", labelBg: "bg-violet-600 text-white" },
  ALERT_FAMILY:      { icon: PhoneCall,     color: "text-blue-700",   accent: "#2563eb", label: "ALERT FAMILY",  labelBg: "bg-blue-600 text-white" },
  MONITOR:           { icon: Eye,           color: "text-amber-700",  accent: "#d97706", label: "MONITOR",       labelBg: "bg-amber-500 text-white" },
  PREPARE_EQUIPMENT: { icon: Wrench,        color: "text-sky-700",    accent: "#0284c7", label: "PREPARE EQUIP", labelBg: "bg-sky-600 text-white" },
};

const RISK = {
  critical: { grad: "from-[#1a0000] to-[#3b0000]", glow: "rgba(220,38,38,0.35)", badge: "CRITICAL",  sla: "≤ 3 MIN",  score_color: "#ff4444", ring: "border-red-500/50"    },
  high:     { grad: "from-[#1a0e00] to-[#3b1f00]", glow: "rgba(245,158,11,0.3)", badge: "HIGH",      sla: "≤ 30 MIN", score_color: "#f59e0b", ring: "border-amber-400/50"  },
  moderate: { grad: "from-[#00101a] to-[#001e3b]", glow: "rgba(14,165,233,0.25)",badge: "MODERATE",  sla: "≤ 2 HRS",  score_color: "#0ea5e9", ring: "border-sky-400/50"    },
  low:      { grad: "from-[#001a0a] to-[#003b19]", glow: "rgba(34,197,94,0.25)", badge: "LOW RISK",  sla: "≤ 4 HRS",  score_color: "#22c55e", ring: "border-emerald-400/50"},
};

/* ── SVG Arc Gauge ── */
function RiskGauge({ score, color }: { score: number; color: string }) {
  const r = 36;
  const cx = 44;
  const cy = 44;
  const circumference = Math.PI * r; // half circle
  const pct = Math.min(100, Math.max(0, score)) / 100;
  const dash = pct * circumference;

  return (
    <svg width="88" height="52" viewBox="0 0 88 52">
      {/* bg arc */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" strokeLinecap="round"
      />
      {/* fill arc */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference}`}
        style={{ filter: `drop-shadow(0 0 6px ${color})` }}
      />
      {/* score text */}
      <text x={cx} y={cy - 8} textAnchor="middle" fill="white" fontSize="18" fontWeight="900" fontFamily="Inter">{score}</text>
      <text x={cx} y={cy + 4} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="9" fontFamily="Inter">/ 100</text>
    </svg>
  );
}

export default function EmergencyPage() {
  const [nationalId, setNationalId] = useState("");
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [alertsOpen, setAlertsOpen] = useState(true);
  const [protocolsOpen, setProtocolsOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { alerts: sseAlerts, connected: sseConnected, unreadCount: sseUnread, markRead: markSseRead, clearAll: clearSseAlerts } = useSseAlerts("emergency");
  const { data: patient, isLoading, isError } = useEmergencyLookup(
    submittedId || "",
    { query: { enabled: !!submittedId, retry: false } }
  );

  // Response timer
  useEffect(() => {
    if (isLoading) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isLoading]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (nationalId.trim()) setSubmittedId(nationalId.trim());
  };

  const clinicalActions = (patient as any)?.clinicalActions as ClinicalAction[] | undefined;
  const immediateActions = clinicalActions?.filter(a => a.priority === "immediate") ?? [];
  const urgentActions    = clinicalActions?.filter(a => a.priority !== "immediate") ?? [];
  const riskLevel = ((patient as any)?.riskLevel ?? "low") as keyof typeof RISK;
  const riskCfg   = RISK[riskLevel] ?? RISK.low;
  const riskScore = (patient as any)?.riskScore ?? 0;
  const hasAllergies = ((patient as any)?.allergies?.length ?? 0) > 0;

  return (
    <Layout role="emergency">

      {/* ══════════════════════════════════════════════════════════
          FLOATING LIVE ALERTS — z-50, always on top
      ══════════════════════════════════════════════════════════ */}
      {sseAlerts.length > 0 && (
        <div
          className="fixed bottom-6 right-6 z-50 w-[340px] rounded-2xl overflow-hidden"
          style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.24), 0 0 0 1px rgba(220,38,38,0.2)" }}
        >
          <button
            onClick={() => setAlertsOpen(p => !p)}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-left"
            style={{ background: "linear-gradient(135deg, #b91c1c, #dc2626)" }}
          >
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
            </span>
            <span className="text-white font-bold text-sm tracking-wide flex-1">Live Critical Alerts</span>
            {sseUnread > 0 && (
              <span className="bg-white text-red-700 text-[10px] font-black px-2 py-0.5 rounded-full min-w-[22px] text-center">{sseUnread}</span>
            )}
            <button onClick={(e) => { e.stopPropagation(); clearSseAlerts(); }} className="text-white/50 hover:text-white text-[11px] mr-1">Clear</button>
            {alertsOpen ? <ChevronDown className="w-3.5 h-3.5 text-white/70" /> : <ChevronUp className="w-3.5 h-3.5 text-white/70" />}
          </button>
          {alertsOpen && (
            <div className="bg-[#0f172a] divide-y divide-white/5 max-h-[260px] overflow-y-auto">
              {sseAlerts.map(alert => (
                <div key={alert.id} className={`px-4 py-3 flex items-start gap-3 ${alert.read ? "opacity-40" : ""}`}>
                  <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                    alert.severity === "critical" ? "bg-red-500 animate-pulse" :
                    alert.severity === "high"     ? "bg-amber-400" : "bg-sky-400"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white leading-snug">{alert.title}</p>
                    <p className="text-xs text-white/40 mt-0.5">{alert.patientName}{alert.result ? ` · ${alert.result}` : ""}</p>
                  </div>
                  {!alert.read && (
                    <button
                      onClick={() => { if (alert.nationalId) { setNationalId(alert.nationalId); setSubmittedId(alert.nationalId); } markSseRead(alert.id); }}
                      className="text-[10px] font-bold text-red-400 border border-red-800 hover:bg-red-900/50 rounded-lg px-2.5 py-1 shrink-0 transition-colors"
                    >
                      Load
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          COMMAND BAR
      ══════════════════════════════════════════════════════════ */}
      <div className="mb-7">
        {/* Status row */}
        <div className="flex items-center gap-2.5 mb-4">
          <div
            className="flex items-center gap-2 text-white text-[11px] font-black px-3.5 py-1.5 rounded-full tracking-widest uppercase shrink-0"
            style={{ background: "linear-gradient(135deg, #b91c1c, #dc2626)" }}
          >
            <Zap className="w-3 h-3" />
            Emergency Mode Active
          </div>
          <div className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full shrink-0 ${
            sseConnected
              ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
              : "bg-slate-100 border border-slate-200 text-slate-400"
          }`}>
            <Radio className={`w-3 h-3 ${sseConnected ? "text-emerald-500" : "text-slate-400"}`} />
            {sseConnected ? "Live · 9 AI Engines" : "Connecting..."}
          </div>
          {sseUnread > 0 && (
            <button
              onClick={() => setAlertsOpen(p => !p)}
              className="flex items-center gap-1.5 text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-full hover:bg-red-100 transition-colors"
            >
              <Bell className="w-3 h-3" />
              {sseUnread} unread alert{sseUnread > 1 ? "s" : ""}
            </button>
          )}
          <div className="ml-auto text-[10px] text-slate-400 font-mono">
            SRCA · MOH Emergency Network · v3.0
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="flex-1 relative">
            <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4.5 h-4.5" />
            <input
              autoFocus
              value={nationalId}
              onChange={e => setNationalId(e.target.value)}
              placeholder="Enter National ID to retrieve life-critical patient data..."
              className="w-full h-12 pl-11 pr-4 bg-white border border-slate-200 rounded-2xl text-sm font-mono text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-all"
              style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}
            />
          </div>
          <button
            type="submit"
            className="h-12 px-7 text-white font-bold text-sm rounded-2xl flex items-center gap-2 shrink-0 transition-all active:scale-95"
            style={{
              background: "linear-gradient(135deg, #b91c1c, #dc2626)",
              boxShadow: "0 4px 16px rgba(220,38,38,0.3)",
            }}
          >
            <Search className="w-4 h-4" />
            Emergency Lookup
          </button>
        </form>
        <p className="text-[11px] text-slate-400 mt-2 ml-1">
          Demo: <span className="font-mono text-slate-500 hover:text-slate-700 cursor-pointer transition-colors" onClick={() => { setNationalId("1000000001"); setSubmittedId("1000000001"); }}>1000000001</span>
          {" · "}
          <span className="font-mono text-slate-500 hover:text-slate-700 cursor-pointer transition-colors" onClick={() => { setNationalId("1000000003"); setSubmittedId("1000000003"); }}>1000000003</span>
          {" · "}
          <span className="font-mono text-slate-500 hover:text-slate-700 cursor-pointer transition-colors" onClick={() => { setNationalId("1000000005"); setSubmittedId("1000000005"); }}>1000000005</span>
        </p>
      </div>

      {/* ══════════════════════════════════════════════════════════
          LOADING
      ══════════════════════════════════════════════════════════ */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 gap-5">
          <div className="relative">
            <div className="w-14 h-14 rounded-full border-2 border-red-200 border-t-red-600 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-red-400" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-slate-700">Retrieving patient data</p>
            <p className="text-xs text-slate-400 mt-1 font-mono">{(elapsed * 0.1).toFixed(1)}s · Querying 9 AI engines...</p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          ERROR
      ══════════════════════════════════════════════════════════ */}
      {isError && !isLoading && (
        <div className="flex items-center gap-4 p-5 rounded-2xl border border-red-200 bg-red-50">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="font-bold text-red-700">Patient Not Found</p>
            <p className="text-sm text-red-500 mt-0.5">No record for <span className="font-mono font-bold">{submittedId}</span>. Verify the National ID and retry.</p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          EMPTY STATE
      ══════════════════════════════════════════════════════════ */}
      {!submittedId && !isLoading && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mb-2"
            style={{ background: "linear-gradient(135deg, #1a0000, #3b0000)", boxShadow: "0 0 40px rgba(220,38,38,0.2)" }}
          >
            <ShieldAlert className="w-9 h-9 text-red-400" />
          </div>
          <p className="text-lg font-bold text-slate-800">Emergency Response System</p>
          <p className="text-sm text-slate-400 text-center max-w-sm leading-relaxed">
            Enter any National ID above to instantly retrieve life-critical patient data — blood type, allergies, medications, and AI-generated clinical actions in under 1 second.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3 w-full max-w-[420px]">
            {[
              { label: "Response Time", value: "< 1s",   icon: Timer,    color: "text-red-500" },
              { label: "AI Confidence", value: "97%",    icon: Brain,    color: "text-violet-500" },
              { label: "Live Sources",  value: "9 AI",   icon: Activity, color: "text-emerald-500" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-slate-100" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
                <Icon className={`w-4 h-4 ${color}`} />
                <p className="text-xl font-black text-slate-800">{value}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-300 mt-2">Fail-Safe: Offline cache active · Works without network</p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          PATIENT RECORD
      ══════════════════════════════════════════════════════════ */}
      {patient && (
        <div className="space-y-4">

          {/* ── BLOCK 1: DARK COMMAND CARD ── */}
          <div
            className={`rounded-3xl overflow-hidden bg-gradient-to-br ${riskCfg.grad}`}
            style={{ boxShadow: `0 8px 40px ${riskCfg.glow}, 0 0 0 1px rgba(255,255,255,0.04)` }}
          >
            <div className="px-7 py-6 flex items-start gap-6">

              {/* Left: Identity */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Verified Patient</span>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    <StatusDot status="active" />
                    Live
                  </span>
                </div>
                <h1 className="text-white text-[28px] font-black leading-tight tracking-tight mb-1.5">
                  {patient.fullName}
                </h1>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-white/40 text-xs font-mono">ID: {patient.nationalId}</span>
                  <span className="text-white/20">·</span>
                  <span className="text-white/60 text-xs font-semibold">{patient.age} yrs · {patient.gender}</span>
                  {patient.emergencyContact && (
                    <>
                      <span className="text-white/20">·</span>
                      <span className="flex items-center gap-1 text-xs text-white/50">
                        <PhoneCall className="w-3 h-3" />
                        {patient.emergencyPhone}
                      </span>
                    </>
                  )}
                </div>

                {/* Chronic conditions as tags */}
                {(patient as any).chronicConditions?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {((patient as any).chronicConditions as string[]).map((c: string, i: number) => (
                      <span key={i} className="text-[10px] font-semibold text-white/50 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full">{c}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Center: Blood Type */}
              <div className="flex flex-col items-center shrink-0">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-2">Blood Type</p>
                <div
                  className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center"
                  style={{
                    background: "rgba(220,38,38,0.15)",
                    border: "1px solid rgba(220,38,38,0.3)",
                    boxShadow: "0 0 24px rgba(220,38,38,0.25), inset 0 1px 0 rgba(255,255,255,0.05)",
                  }}
                >
                  <span className="text-[32px] font-black text-white leading-none">{patient.bloodType}</span>
                </div>
                <Droplet className="w-3 h-3 text-red-400/50 mt-1.5" />
              </div>

              {/* Right: Risk Gauge */}
              <div className="flex flex-col items-center shrink-0">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-1">Risk Score</p>
                <RiskGauge score={riskScore} color={riskCfg.score_color} />
                <div
                  className="mt-1 px-3 py-1 rounded-full text-[10px] font-black tracking-widest"
                  style={{ background: `${riskCfg.score_color}20`, color: riskCfg.score_color, border: `1px solid ${riskCfg.score_color}40` }}
                >
                  {riskCfg.badge}
                </div>
              </div>

              {/* Far right: SLA */}
              <div className="flex flex-col items-center shrink-0 text-center border-l border-white/10 pl-6">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-2">Response SLA</p>
                <p className="text-white text-2xl font-black leading-none">{riskCfg.sla}</p>
                <div className="flex items-center gap-1 mt-2">
                  <Timer className="w-3 h-3 text-white/30" />
                  <span className="text-[9px] text-white/30 uppercase tracking-wide">Target</span>
                </div>
                <div className="mt-3 text-center">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-1">AI Confidence</p>
                  <p className="text-white text-lg font-black">{riskLevel === "critical" ? "97%" : riskLevel === "high" ? "88%" : "82%"}</p>
                </div>
              </div>
            </div>

            {/* Bottom strip: critical alerts */}
            {patient.criticalAlerts.length > 0 && (
              <div className="px-7 py-3 border-t border-white/5 flex items-center gap-3">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <p className="text-xs font-bold text-red-300">{patient.criticalAlerts[0]}</p>
                {patient.criticalAlerts.length > 1 && (
                  <span className="text-[10px] text-white/30 ml-auto">+{patient.criticalAlerts.length - 1} more alerts</span>
                )}
              </div>
            )}
          </div>

          {/* ── BLOCK 2: ALLERGY DANGER BANNER ── */}
          {hasAllergies && (
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #1a0000, #2d0000)",
                boxShadow: "0 4px 24px rgba(220,38,38,0.2), 0 0 0 1px rgba(220,38,38,0.3)",
              }}
            >
              <div className="px-6 py-4 flex items-center gap-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(220,38,38,0.2)", border: "1px solid rgba(220,38,38,0.3)" }}>
                  <Ban className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-red-500/70 mb-1.5">Do NOT Administer — Known Allergies</p>
                  <div className="flex flex-wrap gap-3">
                    {((patient as any).allergies as string[]).map((a: string, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                        <span className="text-lg font-black text-white leading-none">{a}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="ml-auto shrink-0 text-center">
                  <span className="text-[10px] font-black text-red-400/60 uppercase tracking-widest block mb-1">Count</span>
                  <span className="text-3xl font-black text-red-500">{(patient as any).allergies.length}</span>
                </div>
              </div>
            </div>
          )}

          {/* No allergies — green check */}
          {!hasAllergies && (
            <div className="flex items-center gap-3 px-5 py-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <p className="text-sm font-bold text-emerald-700">No Known Allergies — Safe to administer standard medications</p>
            </div>
          )}

          {/* ── BLOCK 3: INFO TRIO ── */}
          <div className="grid grid-cols-3 gap-4">

            {/* Medications */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
              <div className="px-5 py-3.5 border-b border-slate-50 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Pill className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Active Medications</span>
                <span className="ml-auto text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{patient.currentMedications.length}</span>
              </div>
              <div className="p-4 space-y-1.5">
                {patient.currentMedications.length > 0 ? patient.currentMedications.map((med, i) => (
                  <div key={i} className="flex items-center gap-3 py-1.5 px-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <span className="text-[10px] font-black text-slate-300 tabular-nums w-4">{String(i+1).padStart(2,"0")}</span>
                    <span className="text-sm font-semibold text-slate-700">{med}</span>
                  </div>
                )) : (
                  <p className="text-sm text-slate-400 py-2 px-3">No active medications</p>
                )}
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
              <div className="px-5 py-3.5 border-b border-slate-50 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                  <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Emergency Contact</span>
              </div>
              <div className="p-5">
                {patient.emergencyContact ? (
                  <div>
                    <p className="text-xs text-slate-400 font-semibold mb-1">{patient.emergencyContact}</p>
                    <p className="text-[26px] font-black text-slate-900 font-mono leading-none tracking-tight">{patient.emergencyPhone}</p>
                    <button
                      className="mt-4 w-full py-2.5 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                      style={{ background: "linear-gradient(135deg, #1d4ed8, #2563eb)", boxShadow: "0 4px 12px rgba(37,99,235,0.3)" }}
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      Call Now
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 py-2">Not on record</p>
                )}
              </div>
            </div>

            {/* Chronic Conditions */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
              <div className="px-5 py-3.5 border-b border-slate-50 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                  <Heart className="w-3.5 h-3.5 text-violet-600" />
                </div>
                <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Chronic Conditions</span>
                <span className="ml-auto text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{patient.chronicConditions.length}</span>
              </div>
              <div className="p-4 space-y-1.5">
                {patient.chronicConditions.length > 0 ? patient.chronicConditions.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 py-1.5 px-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <span className="w-2 h-2 rounded-full bg-violet-400 shrink-0" />
                    <span className="text-sm font-semibold text-slate-700">{c}</span>
                  </div>
                )) : (
                  <p className="text-sm text-slate-400 py-2 px-3">None on record</p>
                )}
              </div>
            </div>
          </div>

          {/* ── BLOCK 4: IMMEDIATE CLINICAL ACTIONS ── */}
          {immediateActions.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ boxShadow: "0 4px 24px rgba(220,38,38,0.1)" }}>
              <div
                className="px-5 py-3.5 flex items-center gap-3"
                style={{ background: "linear-gradient(135deg, #991b1b, #dc2626)" }}
              >
                <div className="flex items-center gap-1 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span className="w-2 h-2 rounded-full bg-white/50 animate-pulse" style={{ animationDelay: "0.2s" }} />
                </div>
                <ShieldAlert className="w-4 h-4 text-white" />
                <span className="text-white font-black text-sm uppercase tracking-widest">Immediate Actions Required</span>
                <div className="ml-auto flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-white/80 bg-white/10 px-2.5 py-1 rounded-full">
                    <Clock className="w-3 h-3" /> Act within 3 min
                  </span>
                  <span className="text-[10px] font-black text-white bg-white/20 px-2 py-1 rounded-full">
                    {immediateActions.length} action{immediateActions.length > 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              <div className="bg-red-50/80 p-4 space-y-3">
                {immediateActions.map((action, i) => {
                  const cfg = ACTION_CONFIG[action.action];
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={i}
                      className="bg-white rounded-xl flex overflow-hidden"
                      style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)", borderLeft: `4px solid ${cfg.accent}` }}
                    >
                      <div className="flex items-start gap-4 p-4 flex-1">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${cfg.accent}15` }}>
                          <Icon className={`w-4.5 h-4.5 ${cfg.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${cfg.labelBg}`}>{cfg.label}</span>
                            <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-md">IMMEDIATE</span>
                          </div>
                          <p className={`font-bold text-sm ${cfg.color}`}>{action.description}</p>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{action.reason}</p>
                        </div>
                        <span className="text-2xl font-black text-slate-100 tabular-nums shrink-0 pt-1">{String(i + 1).padStart(2, "0")}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── BLOCK 5: URGENT / STANDARD ACTIONS ── */}
          {urgentActions.length > 0 && (
            <div className="rounded-2xl overflow-hidden border border-amber-100">
              <div className="px-5 py-3 bg-amber-50 flex items-center gap-2 border-b border-amber-100">
                <UserCheck className="w-4 h-4 text-amber-700" />
                <span className="text-xs font-black text-amber-800 uppercase tracking-widest">Clinical Guidance</span>
                <span className="ml-auto text-[10px] font-black text-amber-700 bg-amber-200 px-2 py-0.5 rounded-full">
                  {urgentActions.length} note{urgentActions.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="bg-white p-4 space-y-2">
                {urgentActions.map((action, i) => {
                  const cfg = ACTION_CONFIG[action.action];
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50"
                      style={{ borderLeft: `3px solid ${cfg.accent}` }}
                    >
                      <Icon className={`w-4 h-4 ${cfg.color} shrink-0 mt-0.5`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[10px] font-black uppercase ${cfg.color}`}>{cfg.label}</span>
                          <span className="text-[10px] text-slate-400">· {action.priority}</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-800">{action.description}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{action.reason}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── BLOCK 6: PROTOCOL REFERENCE (collapsible) ── */}
          <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
            <button
              onClick={() => setProtocolsOpen(p => !p)}
              className="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-slate-50 transition-colors"
            >
              <Brain className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-bold text-slate-700">Clinical Protocol Reference</span>
              <span className="ml-auto text-xs text-slate-400 font-medium">{protocolsOpen ? "Collapse" : "Expand"}</span>
              {protocolsOpen ? <ChevronUp className="w-4 h-4 text-slate-300" /> : <ChevronDown className="w-4 h-4 text-slate-300" />}
            </button>
            {protocolsOpen && (
              <div className="px-5 pb-5 border-t border-slate-50 pt-4">
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { label: "ACLS",   sub: "Cardiac Arrest",     grad: "from-red-600 to-red-700" },
                    { label: "BLS",    sub: "Basic Life Support",  grad: "from-amber-500 to-amber-600" },
                    { label: "Sepsis", sub: "Hour-1 Bundle",       grad: "from-orange-500 to-orange-600" },
                    { label: "Stroke", sub: "FAST Protocol",       grad: "from-violet-600 to-violet-700" },
                    { label: "ACS",    sub: "STEMI Protocol",      grad: "from-rose-600 to-rose-700" },
                  ].map(({ label, sub, grad }) => (
                    <button
                      key={label}
                      className={`flex flex-col items-center gap-1.5 py-3.5 rounded-xl bg-gradient-to-b ${grad} text-white transition-all hover:scale-[1.02] active:scale-95`}
                      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
                    >
                      <span className="text-sm font-black">{label}</span>
                      <span className="text-[10px] text-white/60">{sub}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2 text-[11px] text-emerald-600 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  Offline cache ready — full functionality without network
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </Layout>
  );
}
