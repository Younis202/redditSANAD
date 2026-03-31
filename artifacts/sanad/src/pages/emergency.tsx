import React, { useState } from "react";
import {
  Search, AlertTriangle, Pill, FileWarning,
  PhoneCall, Activity, Clock, Zap,
  ShieldAlert, Ban, Eye, UserCheck, Wrench,
  PauseCircle, Brain, Timer, Bell,
  ChevronDown, ChevronUp, CheckCircle2, Radio,
  Fingerprint, Heart, Droplet, User
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

const ACTION_CFG: Record<ClinicalAction["action"], { icon: React.ElementType; label: string; accent: string; textColor: string }> = {
  DO_NOT_GIVE:       { icon: Ban,          label: "Do Not Give",   accent: "#dc2626", textColor: "text-red-700"    },
  HOLD_MEDICATION:   { icon: PauseCircle,  label: "Hold Med",      accent: "#ea580c", textColor: "text-orange-700" },
  URGENT_REVIEW:     { icon: Brain,        label: "Urgent Review", accent: "#7c3aed", textColor: "text-violet-700" },
  ALERT_FAMILY:      { icon: PhoneCall,    label: "Alert Family",  accent: "#2563eb", textColor: "text-blue-700"   },
  MONITOR:           { icon: Eye,          label: "Monitor",       accent: "#d97706", textColor: "text-amber-700"  },
  PREPARE_EQUIPMENT: { icon: Wrench,       label: "Prepare Equip", accent: "#0284c7", textColor: "text-sky-700"    },
};

const RISK_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: "bg-red-100",    text: "text-red-700",    label: "CRITICAL"  },
  high:     { bg: "bg-orange-100", text: "text-orange-700", label: "HIGH RISK" },
  moderate: { bg: "bg-blue-100",   text: "text-blue-700",   label: "MODERATE"  },
  low:      { bg: "bg-green-100",  text: "text-green-700",  label: "LOW RISK"  },
};

const SLA: Record<string, string> = {
  critical: "≤ 3 min", high: "≤ 30 min", moderate: "≤ 2 hrs", low: "≤ 4 hrs",
};

export default function EmergencyPage() {
  const [nationalId, setNationalId]     = useState("");
  const [submittedId, setSubmittedId]   = useState<string | null>(null);
  const [alertsOpen, setAlertsOpen]     = useState(true);
  const [protocolsOpen, setProtocolsOpen] = useState(false);

  const { alerts: sseAlerts, connected: sseConnected, unreadCount: sseUnread,
          markRead: markSseRead, clearAll: clearSseAlerts } = useSseAlerts("emergency");

  const { data: patient, isLoading, isError } = useEmergencyLookup(
    submittedId || "",
    { query: { enabled: !!submittedId, retry: false } }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (nationalId.trim()) setSubmittedId(nationalId.trim());
  };

  const actions        = (patient as any)?.clinicalActions as ClinicalAction[] | undefined;
  const immediate      = actions?.filter(a => a.priority === "immediate") ?? [];
  const guidance       = actions?.filter(a => a.priority !== "immediate") ?? [];
  const riskLevel      = (patient as any)?.riskLevel ?? "low";
  const riskBadge      = RISK_BADGE[riskLevel] ?? RISK_BADGE.low;
  const allergies      = (patient as any)?.allergies as string[] ?? [];
  const chronicConds   = (patient as any)?.chronicConditions as string[] ?? [];

  return (
    <Layout role="emergency">

      {/* ── FLOATING LIVE ALERTS — z-50, always above all content ── */}
      {sseAlerts.length > 0 && (
        <div
          className="fixed bottom-6 right-6 z-50 w-[340px] rounded-2xl overflow-hidden bg-white"
          style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)" }}
        >
          <button
            onClick={() => setAlertsOpen(p => !p)}
            className="w-full flex items-center gap-2.5 px-4 py-3 bg-red-600 text-white text-left"
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
            </span>
            <span className="font-bold text-sm flex-1">Live Alerts</span>
            {sseUnread > 0 && (
              <span className="bg-white text-red-700 text-[10px] font-black px-2 py-0.5 rounded-full">{sseUnread}</span>
            )}
            <button onClick={e => { e.stopPropagation(); clearSseAlerts(); }} className="text-white/60 hover:text-white text-xs font-medium mr-1">Clear</button>
            {alertsOpen ? <ChevronDown className="w-3.5 h-3.5 text-white/80" /> : <ChevronUp className="w-3.5 h-3.5 text-white/80" />}
          </button>
          {alertsOpen && (
            <div className="divide-y divide-slate-100 max-h-[260px] overflow-y-auto">
              {sseAlerts.map(alert => (
                <div key={alert.id} className={`px-4 py-3 flex items-start gap-3 ${alert.read ? "opacity-40" : ""}`}>
                  <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                    alert.severity === "critical" ? "bg-red-500 animate-pulse" :
                    alert.severity === "high" ? "bg-amber-400" : "bg-sky-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 leading-snug">{alert.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{alert.patientName}{alert.result ? ` · ${alert.result}` : ""}</p>
                  </div>
                  {!alert.read && (
                    <button
                      onClick={() => { if (alert.nationalId) { setNationalId(alert.nationalId); setSubmittedId(alert.nationalId); } markSseRead(alert.id); }}
                      className="text-[11px] font-bold text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-lg px-2.5 py-1 shrink-0 transition-colors"
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

      {/* ── SEARCH BLOCK ── */}
      <div className="mb-8">

        {/* Status pills */}
        <div className="flex items-center gap-2 mb-5">
          <div className="flex items-center gap-1.5 bg-red-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-full tracking-wider uppercase">
            <Zap className="w-3 h-3" />
            Emergency Mode Active
          </div>
          <div className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border ${
            sseConnected ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-100 border-slate-200 text-slate-400"}`}>
            <Radio className={`w-3 h-3 ${sseConnected ? "text-emerald-500" : "text-slate-300"}`} />
            {sseConnected ? "9 AI Engines · Live" : "Connecting..."}
          </div>
          {sseUnread > 0 && (
            <button
              onClick={() => setAlertsOpen(p => !p)}
              className="flex items-center gap-1.5 text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-full hover:bg-red-100 transition-colors"
            >
              <Bell className="w-3 h-3" />
              {sseUnread} alert{sseUnread > 1 ? "s" : ""}
            </button>
          )}
          {patient && (
            <div className="ml-auto text-xs text-slate-400 font-mono">
              Last update · {new Date().toLocaleTimeString("en-SA", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
          )}
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="flex-1 relative">
            <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4.5 h-4.5 pointer-events-none" />
            <input
              autoFocus
              value={nationalId}
              onChange={e => setNationalId(e.target.value)}
              placeholder="Enter National ID to retrieve patient data..."
              className="w-full h-12 pl-11 pr-4 bg-white border border-slate-200 rounded-2xl text-sm font-mono text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-all"
            />
          </div>
          <button
            type="submit"
            className="h-12 px-7 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-2xl flex items-center gap-2 shrink-0 transition-colors"
          >
            <Search className="w-4 h-4" />
            Lookup
          </button>
        </form>
        <p className="text-xs text-slate-400 mt-2 ml-1">
          Demo IDs: {["1000000001","1000000003","1000000005"].map(id => (
            <span
              key={id}
              className="font-mono text-blue-500 hover:text-blue-700 cursor-pointer transition-colors"
              onClick={() => { setNationalId(id); setSubmittedId(id); }}
            >
              {id}{" "}
            </span>
          ))}
        </p>
      </div>

      {/* ── LOADING ── */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-slate-200 border-t-red-500 animate-spin" />
          <p className="text-sm font-semibold text-slate-500">Retrieving patient record...</p>
        </div>
      )}

      {/* ── ERROR ── */}
      {isError && !isLoading && (
        <div className="flex items-center gap-4 p-5 bg-red-50 border border-red-200 rounded-2xl">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <div>
            <p className="font-bold text-red-700 text-sm">Patient Not Found</p>
            <p className="text-xs text-red-500 mt-0.5">No record for <span className="font-mono font-bold">{submittedId}</span>. Verify the ID and retry.</p>
          </div>
        </div>
      )}

      {/* ── EMPTY STATE ── */}
      {!submittedId && !isLoading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-3xl bg-red-50 border border-red-100 flex items-center justify-center mb-1">
            <ShieldAlert className="w-8 h-8 text-red-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-800">Emergency Lookup Ready</p>
            <p className="text-sm text-slate-400 max-w-sm mt-1 leading-relaxed">
              Enter a National ID to retrieve blood type, allergies, medications, and AI-generated clinical actions in under one second.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-2 w-full max-w-xs">
            {[{ label: "Response", value: "< 1s", icon: Timer }, { label: "Confidence", value: "97%", icon: Brain }, { label: "AI Sources", value: "9 Live", icon: Activity }].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-col items-center gap-2">
                <Icon className="w-4 h-4 text-slate-300" />
                <p className="text-base font-black text-slate-800">{value}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PATIENT RECORD ── */}
      {patient && (
        <div className="space-y-4">

          {/* ── 1. PATIENT IDENTITY CARD ── */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
            <div className="flex items-start gap-5">

              {/* Avatar placeholder */}
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
                <User className="w-8 h-8 text-slate-300" />
              </div>

              {/* Name + ID */}
              <div className="flex-1 min-w-0">
                <h1 className="text-[28px] font-black text-slate-900 leading-tight tracking-tight">{patient.fullName}</h1>
                <p className="text-sm text-slate-400 font-mono mt-1">PATIENT ID · {patient.nationalId}</p>
                <div className="flex items-center gap-2 flex-wrap mt-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${riskBadge.bg} ${riskBadge.text}`}>{riskBadge.label}</span>
                  <span className="text-xs text-slate-400 font-semibold">Response SLA: <span className="text-slate-700 font-bold">{SLA[riskLevel]}</span></span>
                  {(patient as any).riskScore !== undefined && (
                    <span className="text-xs text-slate-400 font-semibold">AI Score: <span className="text-slate-700 font-bold">{(patient as any).riskScore}/100</span></span>
                  )}
                  <span className="ml-auto flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                    <StatusDot status="active" />
                    Live record
                  </span>
                </div>
              </div>
            </div>

            {/* Key stats strip */}
            <div className="grid grid-cols-4 gap-3 mt-5">
              {/* Blood Type */}
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-2">Blood Type</p>
                <p className="text-3xl font-black text-red-600 leading-none">{patient.bloodType}</p>
                {riskLevel === "critical" && (
                  <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-1.5">Critical</p>
                )}
              </div>

              {/* Age / Sex */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Age / Sex</p>
                <p className="text-3xl font-black text-slate-800 leading-none">{patient.age ?? "—"}</p>
                <p className="text-sm text-slate-500 font-semibold mt-1">{patient.gender}</p>
              </div>

              {/* Emergency Contact */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 col-span-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Emergency Contact</p>
                {patient.emergencyContact ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{patient.emergencyContact}</p>
                      <p className="text-lg font-black text-blue-600 font-mono mt-0.5 tracking-tight">{patient.emergencyPhone}</p>
                    </div>
                    <button className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shrink-0">
                      <PhoneCall className="w-3.5 h-3.5" />
                      Call Now
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Not on record</p>
                )}
              </div>
            </div>
          </div>

          {/* ── 2. CRITICAL MEDICAL ALERT (Allergy) ── */}
          {allergies.length > 0 && (
            <div className="bg-red-600 rounded-2xl p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1">Critical Medical Alert</p>
                <p className="text-lg font-black text-white leading-snug">
                  {allergies.length === 1 ? `${allergies[0]} Allergy` : `${allergies.length} Known Allergies`}
                </p>
                <p className="text-sm text-white/80 mt-1 leading-relaxed">
                  {allergies.length === 1
                    ? `Administer alternative medications only. Do NOT give ${allergies[0]} or related compounds.`
                    : `Do NOT administer: ${allergies.join(", ")}. Check full history before any medication.`}
                </p>
                {allergies.length > 1 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {allergies.map((a, i) => (
                      <span key={i} className="text-xs font-bold text-white/90 bg-white/15 border border-white/20 px-2.5 py-1 rounded-full">{a}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* No allergies */}
          {allergies.length === 0 && (
            <div className="flex items-center gap-3 px-5 py-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <p className="text-sm font-semibold text-emerald-700">No Known Allergies — Safe to administer standard medications</p>
            </div>
          )}

          {/* ── 3. CLINICAL DATA — Medications + Conditions ── */}
          <div className="grid grid-cols-2 gap-4">

            {/* Active Medications */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
              <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Pill className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-bold text-slate-800">Active Medications</span>
                </div>
                <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                  {patient.currentMedications.length}
                </span>
              </div>
              <div className="p-2">
                {patient.currentMedications.length > 0 ? patient.currentMedications.map((med, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                    <span className="text-[11px] font-black text-slate-300 tabular-nums w-5 shrink-0">{i + 1}</span>
                    <span className="text-sm font-semibold text-slate-700">{med}</span>
                  </div>
                )) : (
                  <div className="px-3 py-4 text-sm text-slate-400">No active medications on record</div>
                )}
              </div>
            </div>

            {/* Chronic Conditions */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
              <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-bold text-slate-800">Chronic Conditions</span>
                </div>
                <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                  {chronicConds.length}
                </span>
              </div>
              <div className="p-2">
                {chronicConds.length > 0 ? chronicConds.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                    <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                    <span className="text-sm font-semibold text-slate-700">{c}</span>
                  </div>
                )) : (
                  <div className="px-3 py-4 text-sm text-slate-400">No chronic conditions on record</div>
                )}
              </div>
            </div>
          </div>

          {/* ── 4. IMMEDIATE ACTIONS ── */}
          {immediate.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
              <div className="px-5 py-4 border-b border-red-50 bg-red-50 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                <span className="text-sm font-black text-red-700 uppercase tracking-wide">Immediate Actions Required</span>
                <span className="ml-auto flex items-center gap-1.5 text-[11px] font-bold text-red-600 bg-white border border-red-200 px-2.5 py-1 rounded-full">
                  <Clock className="w-3 h-3" /> Act within 3 min
                </span>
              </div>
              <div className="divide-y divide-slate-50">
                {immediate.map((action, i) => {
                  const cfg = ACTION_CFG[action.action];
                  const Icon = cfg.icon;
                  return (
                    <div key={i} className="flex items-start gap-4 px-5 py-4" style={{ borderLeft: `3px solid ${cfg.accent}` }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${cfg.accent}12` }}>
                        <Icon className={`w-4.5 h-4.5 ${cfg.textColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: cfg.accent }}>{cfg.label}</span>
                          <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">IMMEDIATE</span>
                        </div>
                        <p className={`font-bold text-sm ${cfg.textColor}`}>{action.description}</p>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{action.reason}</p>
                      </div>
                      <span className="text-xl font-black text-slate-100 tabular-nums shrink-0 mt-1">{String(i + 1).padStart(2, "0")}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── 5. CLINICAL GUIDANCE ── */}
          {guidance.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
              <div className="px-5 py-4 border-b border-slate-50 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-bold text-slate-800">Clinical Guidance</span>
                <span className="ml-auto text-[11px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">{guidance.length} notes</span>
              </div>
              <div className="divide-y divide-slate-50">
                {guidance.map((action, i) => {
                  const cfg = ACTION_CFG[action.action];
                  const Icon = cfg.icon;
                  return (
                    <div key={i} className="flex items-start gap-4 px-5 py-3.5" style={{ borderLeft: `3px solid ${cfg.accent}` }}>
                      <Icon className={`w-4 h-4 ${cfg.textColor} shrink-0 mt-0.5`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: cfg.accent }}>{cfg.label}</span>
                          <span className="text-[10px] text-slate-400">· {action.priority}</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-800">{action.description}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{action.reason}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── 6. CRITICAL ALERTS ── */}
          {patient.criticalAlerts.length > 0 && (
            <div className="bg-white rounded-2xl border border-red-100 overflow-hidden" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
              <div className="px-5 py-4 border-b border-red-50 bg-red-50 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-bold text-red-700">System Alerts</span>
              </div>
              <div className="divide-y divide-slate-50">
                {patient.criticalAlerts.map((alert, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-pulse" />
                    <p className="text-sm font-semibold text-slate-800">{alert}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 7. PROTOCOL REFERENCE — collapsible ── */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
            <button
              onClick={() => setProtocolsOpen(p => !p)}
              className="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-slate-50 transition-colors"
            >
              <Brain className="w-4 h-4 text-slate-300" />
              <span className="text-sm font-semibold text-slate-600">Clinical Protocol Reference</span>
              <span className="ml-auto text-xs text-slate-400">{protocolsOpen ? "Collapse" : "Expand"}</span>
              {protocolsOpen ? <ChevronUp className="w-4 h-4 text-slate-300" /> : <ChevronDown className="w-4 h-4 text-slate-300" />}
            </button>
            {protocolsOpen && (
              <div className="px-5 pb-5 border-t border-slate-50 pt-4 grid grid-cols-5 gap-2">
                {[
                  { label: "ACLS",   sub: "Cardiac Arrest",    color: "text-red-600",    bg: "bg-red-50",    border: "border-red-200" },
                  { label: "BLS",    sub: "Basic Life Support", color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200" },
                  { label: "Sepsis", sub: "Hour-1 Bundle",     color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
                  { label: "Stroke", sub: "FAST Protocol",     color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200" },
                  { label: "ACS",    sub: "STEMI Protocol",    color: "text-rose-700",   bg: "bg-rose-50",   border: "border-rose-200" },
                ].map(({ label, sub, color, bg, border }) => (
                  <button key={label} className={`flex flex-col items-center gap-1 py-3.5 rounded-xl border ${bg} ${border} hover:opacity-80 transition-opacity`}>
                    <span className={`text-sm font-black ${color}`}>{label}</span>
                    <span className="text-[10px] text-slate-400">{sub}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </Layout>
  );
}
