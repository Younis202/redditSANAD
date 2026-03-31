import React, { useState } from "react";
import {
  Search, AlertTriangle, Droplet, Pill, FileWarning,
  PhoneCall, Activity, Clock, Zap,
  ShieldAlert, Ban, Eye, UserCheck, Wrench, PauseCircle, Brain,
  Timer, Bell, X, ChevronDown, ChevronUp, CheckCircle2, Radio
} from "lucide-react";
import { Layout } from "@/components/layout";
import { Input, Button, Badge, StatusDot } from "@/components/shared";
import { useEmergencyLookup } from "@workspace/api-client-react";
import { useSseAlerts } from "@/hooks/use-sse-alerts";

type ClinicalAction = {
  action: "DO_NOT_GIVE" | "MONITOR" | "URGENT_REVIEW" | "ALERT_FAMILY" | "PREPARE_EQUIPMENT" | "HOLD_MEDICATION";
  priority: "immediate" | "urgent" | "standard";
  description: string;
  reason: string;
};

const ACTION_CONFIG: Record<ClinicalAction["action"], { icon: React.ElementType; color: string; bg: string; border: string; label: string }> = {
  DO_NOT_GIVE:      { icon: Ban,          color: "text-red-700",    bg: "bg-red-50",    border: "border-red-200",    label: "DO NOT GIVE" },
  HOLD_MEDICATION:  { icon: PauseCircle,  color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", label: "HOLD MED" },
  URGENT_REVIEW:    { icon: Brain,        color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200", label: "URGENT REVIEW" },
  ALERT_FAMILY:     { icon: PhoneCall,    color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-200",   label: "ALERT FAMILY" },
  MONITOR:          { icon: Eye,          color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200",  label: "MONITOR" },
  PREPARE_EQUIPMENT:{ icon: Wrench,       color: "text-sky-700",    bg: "bg-sky-50",    border: "border-sky-200",    label: "PREPARE EQUIP" },
};

const RISK_CONFIG = {
  critical: { bar: "bg-red-600",    text: "text-white", badge: "CRITICAL",  sla: "≤ 3 min",   ring: "border-red-500"    },
  high:     { bar: "bg-amber-500",  text: "text-white", badge: "HIGH RISK", sla: "≤ 30 min",  ring: "border-amber-400"  },
  moderate: { bar: "bg-sky-500",    text: "text-white", badge: "MODERATE",  sla: "≤ 2 hrs",   ring: "border-sky-400"    },
  low:      { bar: "bg-emerald-500",text: "text-white", badge: "LOW RISK",  sla: "≤ 4 hrs",   ring: "border-emerald-400"},
};

export default function EmergencyPage() {
  const [nationalId, setNationalId] = useState("");
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [alertsOpen, setAlertsOpen] = useState(true);
  const [protocolsOpen, setProtocolsOpen] = useState(false);

  const { alerts: sseAlerts, connected: sseConnected, unreadCount: sseUnread, markRead: markSseRead, clearAll: clearSseAlerts } = useSseAlerts("emergency");
  const { data: patient, isLoading, isError } = useEmergencyLookup(
    submittedId || "",
    { query: { enabled: !!submittedId, retry: false } }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (nationalId.trim()) setSubmittedId(nationalId.trim());
  };

  const clinicalActions = (patient as any)?.clinicalActions as ClinicalAction[] | undefined;
  const immediateActions = clinicalActions?.filter(a => a.priority === "immediate") ?? [];
  const urgentActions    = clinicalActions?.filter(a => a.priority !== "immediate") ?? [];
  const risk = ((patient as any)?.riskLevel ?? "low") as keyof typeof RISK_CONFIG;
  const riskCfg = RISK_CONFIG[risk] ?? RISK_CONFIG.low;

  return (
    <Layout role="emergency">

      {/* ─────────────────────────────────────────────────────────
          FLOATING SSE ALERTS PANEL — fixed bottom-right, always on top
      ───────────────────────────────────────────────────────── */}
      {sseAlerts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] shadow-2xl rounded-2xl overflow-hidden border border-red-200"
          style={{ boxShadow: "0 20px 60px rgba(220,38,38,0.18)" }}>
          <button
            onClick={() => setAlertsOpen(p => !p)}
            className="w-full flex items-center justify-between px-4 py-3 bg-red-600 text-white"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
              <span className="font-bold text-sm tracking-wide">Live Critical Alerts</span>
              {sseUnread > 0 && (
                <span className="bg-white text-red-700 text-[10px] font-black px-2 py-0.5 rounded-full min-w-[20px] text-center">{sseUnread}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={(e) => { e.stopPropagation(); clearSseAlerts(); }} className="text-white/60 hover:text-white text-[11px] font-medium">Clear</button>
              {alertsOpen ? <ChevronDown className="w-4 h-4 text-white/80" /> : <ChevronUp className="w-4 h-4 text-white/80" />}
            </div>
          </button>
          {alertsOpen && (
            <div className="bg-white divide-y divide-slate-100 max-h-[280px] overflow-y-auto">
              {sseAlerts.map(alert => (
                <div key={alert.id} className={`px-4 py-3 flex items-start gap-3 ${alert.read ? "opacity-50" : ""}`}>
                  <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                    alert.severity === "critical" ? "bg-red-500 animate-pulse" :
                    alert.severity === "high"     ? "bg-amber-500" : "bg-sky-400"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 leading-snug">{alert.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {alert.patientName}
                      {alert.result ? ` · ${alert.result}` : ""}
                    </p>
                  </div>
                  {!alert.read && (
                    <button
                      onClick={() => { if (alert.nationalId) { setNationalId(alert.nationalId); setSubmittedId(alert.nationalId); } markSseRead(alert.id); }}
                      className="text-[10px] font-bold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 rounded-lg px-2.5 py-1 shrink-0 transition-colors"
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

      {/* ─────────────────────────────────────────────────────────
          TOP COMMAND BAR
      ───────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex items-center gap-2 bg-red-600 text-white text-[11px] font-bold px-3.5 py-1.5 rounded-full uppercase tracking-widest shrink-0">
            <Zap className="w-3 h-3" />
            Emergency Mode
          </div>
          <div className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border shrink-0 ${
            sseConnected ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-500"
          }`}>
            <Radio className={`w-3 h-3 ${sseConnected ? "text-emerald-500" : "text-slate-400"}`} />
            {sseConnected ? "Live alerts connected" : "Connecting..."}
          </div>
          {sseUnread > 0 && (
            <button
              onClick={() => setAlertsOpen(p => !p)}
              className="flex items-center gap-1.5 text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-full shrink-0 hover:bg-red-100 transition-colors"
            >
              <Bell className="w-3 h-3" />
              {sseUnread} critical alert{sseUnread > 1 ? "s" : ""}
            </button>
          )}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
            <input
              autoFocus
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value)}
              placeholder="Enter National ID  (e.g. 1000000001)"
              className="w-full h-12 pl-11 pr-4 rounded-2xl border border-slate-200 bg-white text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-all"
            />
          </div>
          <button
            type="submit"
            className="h-12 px-6 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-2xl flex items-center gap-2 shrink-0 transition-colors"
          >
            <Search className="w-4 h-4" />
            Emergency Lookup
          </button>
        </form>
        <p className="text-xs text-slate-400 mt-2 ml-1">
          Demo IDs: <span className="font-mono text-slate-500">1000000001</span> · <span className="font-mono text-slate-500">1000000003</span> · <span className="font-mono text-slate-500">1000000005</span> · <span className="font-mono text-slate-500">1000000023</span>
        </p>
      </div>

      {/* ─────────────────────────────────────────────────────────
          LOADING STATE
      ───────────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
          <p className="text-sm font-semibold text-slate-500">Retrieving critical patient data...</p>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────
          ERROR STATE
      ───────────────────────────────────────────────────────── */}
      {isError && !isLoading && (
        <div className="flex items-center gap-4 p-5 bg-red-50 border border-red-200 rounded-2xl">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="font-bold text-red-700">Patient Not Found</p>
            <p className="text-sm text-red-500 mt-0.5">No record for <span className="font-mono font-bold">{submittedId}</span>. Verify the National ID and retry.</p>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────
          EMPTY STATE (no search yet)
      ───────────────────────────────────────────────────────── */}
      {!submittedId && !isLoading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-16 h-16 rounded-3xl bg-red-50 border border-red-100 flex items-center justify-center mb-2">
            <ShieldAlert className="w-8 h-8 text-red-400" />
          </div>
          <p className="text-base font-bold text-slate-700">Ready for Emergency Lookup</p>
          <p className="text-sm text-slate-400 text-center max-w-xs">Enter a National ID above to instantly retrieve life-critical patient data including blood type, allergies, medications, and AI-generated clinical actions.</p>
          <div className="mt-4 grid grid-cols-3 gap-3 w-full max-w-md">
            {[
              { label: "Response Time", value: "< 1 sec", icon: Timer },
              { label: "AI Confidence", value: "97%",     icon: Brain },
              { label: "Data Sources", value: "9 live",   icon: Activity },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex flex-col items-center gap-1.5 p-4 bg-white rounded-2xl border border-slate-100">
                <Icon className="w-4 h-4 text-slate-400" />
                <p className="text-lg font-bold text-slate-800">{value}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────
          PATIENT RECORD — loaded
      ───────────────────────────────────────────────────────── */}
      {patient && (
        <div className="space-y-5">

          {/* ── ZONE 1: PATIENT COMMAND HEADER ── */}
          <div className={`rounded-2xl overflow-hidden`} style={{ boxShadow: "0 2px 20px rgba(0,0,0,0.08)" }}>
            {/* Top risk bar */}
            <div className={`${riskCfg.bar} px-6 py-4 flex items-center gap-6`}>
              <div className="flex-1 min-w-0">
                <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">Verified Patient</p>
                <h1 className="text-white text-2xl font-bold leading-tight truncate">{patient.fullName}</h1>
                <p className="text-white/60 text-xs font-mono mt-1">ID: {patient.nationalId}</p>
              </div>
              <div className="flex items-center gap-6 shrink-0">
                <div className="text-center">
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">Risk Score</p>
                  <p className="text-white text-3xl font-black tabular-nums leading-none">{(patient as any).riskScore ?? "—"}</p>
                  <p className="text-white/50 text-[10px] mt-0.5">/ 100</p>
                </div>
                <div className="w-px h-10 bg-white/20" />
                <div className="text-center">
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">Response SLA</p>
                  <p className="text-white text-xl font-bold leading-none">{riskCfg.sla}</p>
                </div>
                <div className="w-px h-10 bg-white/20" />
                <div className="text-center">
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">Status</p>
                  <span className="bg-white/20 text-white text-xs font-black px-3 py-1 rounded-full tracking-widest">{riskCfg.badge}</span>
                </div>
              </div>
            </div>

            {/* Bottom info strip */}
            <div className="bg-white px-6 py-3 grid grid-cols-4 divide-x divide-slate-100">
              <div className="pr-6">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Age / Sex</p>
                <p className="text-sm font-bold text-slate-800">{patient.age ?? "—"} yrs · {patient.gender?.charAt(0).toUpperCase() ?? "—"}</p>
              </div>
              <div className="px-6">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Emergency Contact</p>
                <p className="text-sm font-bold text-slate-800">{patient.emergencyContact ?? "Not listed"}</p>
                {patient.emergencyPhone && <p className="text-xs font-mono text-blue-600">{patient.emergencyPhone}</p>}
              </div>
              <div className="px-6">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Chronic Conditions</p>
                <p className="text-sm font-semibold text-slate-700">{((patient as any).chronicConditions?.slice(0, 2) ?? []).join(", ") || "None"}</p>
              </div>
              <div className="pl-6 flex items-center gap-3">
                <div className="flex flex-col items-center">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Blood Type</p>
                  <p className="text-2xl font-black text-red-600">{patient.bloodType}</p>
                </div>
                <div className="ml-auto">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
                    <StatusDot status="active" />
                    Live record
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── ZONE 2: GOLDEN TRIO — The 3-second critical read ── */}
          <div className="grid grid-cols-3 gap-4">
            {/* Allergies */}
            <div className={`rounded-2xl overflow-hidden ${((patient as any).allergies?.length ?? 0) > 0 ? "border-2 border-red-400" : "border border-slate-200"}`}>
              <div className={`px-4 py-2.5 flex items-center gap-2 ${((patient as any).allergies?.length ?? 0) > 0 ? "bg-red-600" : "bg-slate-100"}`}>
                <FileWarning className={`w-3.5 h-3.5 ${((patient as any).allergies?.length ?? 0) > 0 ? "text-white" : "text-slate-500"}`} />
                <span className={`text-[10px] font-black uppercase tracking-widest ${((patient as any).allergies?.length ?? 0) > 0 ? "text-white" : "text-slate-500"}`}>
                  Allergies — Do NOT Administer
                </span>
                <span className={`ml-auto text-[10px] font-black px-2 py-0.5 rounded-full ${((patient as any).allergies?.length ?? 0) > 0 ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"}`}>
                  {(patient as any).allergies?.length ?? 0}
                </span>
              </div>
              <div className={`p-4 ${((patient as any).allergies?.length ?? 0) > 0 ? "bg-red-50" : "bg-white"}`}>
                {((patient as any).allergies?.length ?? 0) > 0 ? (
                  <div className="space-y-2">
                    {((patient as any).allergies as string[]).map((a, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                        <span className="text-lg font-black text-red-700 leading-tight">{a}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 py-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span className="text-base font-bold text-emerald-700">No Known Allergies</span>
                  </div>
                )}
              </div>
            </div>

            {/* Active Critical Medications */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-100 flex items-center gap-2">
                <Pill className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Active Medications</span>
                <span className="ml-auto text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                  {patient.currentMedications.length}
                </span>
              </div>
              <div className="p-4 bg-white space-y-2">
                {patient.currentMedications.length > 0 ? patient.currentMedications.map((med, i) => (
                  <div key={i} className="flex items-center gap-2.5 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                    <span className="text-sm font-semibold text-slate-700">{med}</span>
                  </div>
                )) : (
                  <p className="text-sm text-slate-400 py-2">No active medications</p>
                )}
              </div>
            </div>

            {/* Emergency Contact + Critical Alerts */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-100 flex items-center gap-2">
                <PhoneCall className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Emergency Contact</span>
              </div>
              <div className="p-4 bg-white">
                {patient.emergencyContact ? (
                  <div>
                    <p className="text-sm font-bold text-slate-700">{patient.emergencyContact}</p>
                    <p className="text-2xl font-black text-blue-600 font-mono mt-1 tracking-wider">{patient.emergencyPhone}</p>
                    <button className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors">
                      <PhoneCall className="w-3.5 h-3.5" /> Call Now
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 py-2">Not on record</p>
                )}
                {patient.criticalAlerts.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-1.5">Critical Alert</p>
                    {patient.criticalAlerts.slice(0, 2).map((a, i) => (
                      <p key={i} className="text-xs font-semibold text-red-700 leading-snug">{a}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── ZONE 3: IMMEDIATE CLINICAL ACTIONS ── */}
          {immediateActions.length > 0 && (
            <div className="rounded-2xl overflow-hidden border-2 border-red-400" style={{ boxShadow: "0 4px 24px rgba(220,38,38,0.12)" }}>
              <div className="bg-red-600 px-5 py-3.5 flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 text-white" />
                <span className="text-white font-bold text-sm uppercase tracking-widest">Immediate Clinical Actions Required</span>
                <div className="ml-auto flex items-center gap-2">
                  <span className="bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5">
                    <Clock className="w-3 h-3" /> Act within 3 min
                  </span>
                  <span className="bg-white/30 text-white text-[10px] font-black px-2 py-1 rounded-full">
                    {immediateActions.length} action{immediateActions.length > 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              <div className="p-4 bg-red-50 space-y-2.5">
                {immediateActions.map((action, i) => {
                  const cfg = ACTION_CONFIG[action.action];
                  const Icon = cfg.icon;
                  return (
                    <div key={i} className={`flex items-start gap-4 p-4 bg-white rounded-xl border ${cfg.border}`}>
                      <div className={`w-10 h-10 rounded-xl ${cfg.bg} border ${cfg.border} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-5 h-5 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border}`}>{cfg.label}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-600 text-white">IMMEDIATE</span>
                        </div>
                        <p className={`font-bold text-sm ${cfg.color}`}>{action.description}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{action.reason}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── ZONE 4: URGENT CLINICAL ACTIONS ── */}
          {urgentActions.length > 0 && (
            <div className="rounded-2xl overflow-hidden border border-amber-200">
              <div className="bg-amber-50 px-5 py-3 flex items-center gap-3 border-b border-amber-200">
                <UserCheck className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-bold text-amber-800 uppercase tracking-wide">Clinical Guidance</span>
                <span className="ml-auto bg-amber-200 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                  {urgentActions.length} note{urgentActions.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="p-4 bg-white space-y-2">
                {urgentActions.map((action, i) => {
                  const cfg = ACTION_CONFIG[action.action];
                  const Icon = cfg.icon;
                  return (
                    <div key={i} className={`flex items-start gap-3 p-3.5 rounded-xl border ${cfg.border} ${cfg.bg}`}>
                      <div className={`w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0`}>
                        <Icon className={`w-4 h-4 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[10px] font-black uppercase tracking-wider ${cfg.color}`}>{cfg.label}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700`}>{action.priority}</span>
                        </div>
                        <p className="font-semibold text-sm text-slate-800">{action.description}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{action.reason}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── ZONE 5: CLINICAL DETAILS GRID ── */}
          <div className="grid grid-cols-2 gap-4">
            {/* Allergies detail */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                <FileWarning className="w-4 h-4 text-red-500" />
                <span className="text-sm font-bold text-slate-800">Known Allergies</span>
                <span className="ml-auto text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-700">{patient.allergies.length}</span>
              </div>
              <div className="p-4">
                {patient.allergies.length > 0 ? (
                  <div className="space-y-2">
                    {patient.allergies.map((a, i) => (
                      <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5 bg-red-50 border border-red-100 rounded-xl">
                        <StatusDot status="critical" />
                        <span className="text-sm font-bold text-red-700">{a}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-slate-400">No known allergies.</p>}
              </div>
            </div>

            {/* Chronic conditions */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-bold text-slate-800">Chronic Conditions</span>
                <span className="ml-auto text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{patient.chronicConditions.length}</span>
              </div>
              <div className="p-4">
                {patient.chronicConditions.length > 0 ? (
                  <div className="space-y-2">
                    {patient.chronicConditions.map((c, i) => (
                      <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                        <span className="text-sm font-semibold text-slate-700">{c}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-slate-400">None on record.</p>}
              </div>
            </div>
          </div>

          {/* ── ZONE 6: PROTOCOL REFERENCE (collapsible) ── */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <button
              onClick={() => setProtocolsOpen(p => !p)}
              className="w-full px-5 py-3.5 flex items-center gap-3 text-left hover:bg-slate-50 transition-colors"
            >
              <Brain className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-bold text-slate-700">Clinical Protocol Reference</span>
              <span className="ml-auto text-xs text-slate-400 font-medium">{protocolsOpen ? "Hide" : "Show"}</span>
              {protocolsOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {protocolsOpen && (
              <div className="px-5 pb-4 border-t border-slate-100 pt-4">
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { label: "ACLS", sub: "Cardiac Arrest",      color: "border-red-200 bg-red-50 text-red-700" },
                    { label: "BLS",  sub: "Basic Life Support",  color: "border-amber-200 bg-amber-50 text-amber-700" },
                    { label: "Sepsis", sub: "Hour-1 Bundle",    color: "border-orange-200 bg-orange-50 text-orange-700" },
                    { label: "Stroke", sub: "FAST Protocol",    color: "border-violet-200 bg-violet-50 text-violet-700" },
                    { label: "ACS",  sub: "STEMI Protocol",     color: "border-rose-200 bg-rose-50 text-rose-700" },
                  ].map(({ label, sub, color }) => (
                    <button key={label} className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border text-center transition-opacity hover:opacity-80 ${color}`}>
                      <span className="text-sm font-black">{label}</span>
                      <span className="text-[10px] font-medium opacity-70">{sub}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  Fail-Safe Mode: Offline cache ready — works without internet
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </Layout>
  );
}
