import React, { useState, useEffect } from "react";
import {
  Search, AlertTriangle, FileWarning,
  PhoneCall, Activity, Clock, Zap,
  ShieldAlert, Ban, Eye, UserCheck, Wrench,
  PauseCircle, Brain, Timer, Bell,
  ChevronDown, ChevronUp, CheckCircle2, Radio,
  Fingerprint, Heart, Droplet, User, BookOpen,
  ChevronRight, RefreshCw, ListChecks, Wifi, WifiOff, Database,
  Siren, AlertOctagon, Target
} from "lucide-react";
import { Layout } from "@/components/layout";
import { Card, CardHeader, CardTitle, CardBody, StatusDot } from "@/components/shared";
import { useEmergencyLookup } from "@workspace/api-client-react";
import { useSseAlerts } from "@/hooks/use-sse-alerts";

type ClinicalAction = {
  action: "DO_NOT_GIVE" | "MONITOR" | "URGENT_REVIEW" | "ALERT_FAMILY" | "PREPARE_EQUIPMENT" | "HOLD_MEDICATION";
  priority: "immediate" | "urgent" | "standard";
  description: string;
  reason: string;
};

const ACTION_CFG: Record<ClinicalAction["action"], { icon: React.ElementType; label: string; accent: string; bg: string }> = {
  DO_NOT_GIVE:       { icon: Ban,         label: "Do Not Give",    accent: "#dc2626", bg: "rgba(220,38,38,0.12)"   },
  HOLD_MEDICATION:   { icon: PauseCircle, label: "Hold Med",       accent: "#ea580c", bg: "rgba(234,88,12,0.12)"   },
  URGENT_REVIEW:     { icon: Brain,       label: "Urgent Review",  accent: "#7c3aed", bg: "rgba(124,58,237,0.12)"  },
  ALERT_FAMILY:      { icon: PhoneCall,   label: "Alert Family",   accent: "#2563eb", bg: "rgba(37,99,235,0.12)"   },
  MONITOR:           { icon: Eye,         label: "Monitor",        accent: "#d97706", bg: "rgba(217,119,6,0.12)"   },
  PREPARE_EQUIPMENT: { icon: Wrench,      label: "Prepare Equip",  accent: "#0284c7", bg: "rgba(2,132,199,0.12)"   },
};

const ACTION_PROTOCOL: Record<ClinicalAction["action"], { ref: string; org: string; color: string }> = {
  DO_NOT_GIVE:       { ref: "ACLS Allergy/Adverse Drug Reaction Protocol 2020", org: "AHA/ACLS",   color: "#dc2626" },
  HOLD_MEDICATION:   { ref: "MOH Medication Safety Protocol 2024 · §3.2",       org: "MOH",        color: "#ea580c" },
  URGENT_REVIEW:     { ref: "SRCA Emergency Triage Protocol · ESI Level 1–2",   org: "SRCA/MOH",   color: "#7c3aed" },
  ALERT_FAMILY:      { ref: "MOH Consent & Next-of-Kin Notification Protocol",  org: "MOH",        color: "#2563eb" },
  MONITOR:           { ref: "ACLS Monitoring & Surveillance Protocol 2020",      org: "AHA/ACLS",   color: "#d97706" },
  PREPARE_EQUIPMENT: { ref: "ACLS Equipment Readiness Checklist 2020 · §5.1",   org: "AHA/ACLS",   color: "#0284c7" },
};

const EMERGENCY_PROTOCOLS = [
  {
    code: "ACLS-CA",
    title: "Cardiac Arrest — Shockable Rhythm (VF/pVT)",
    org: "AHA ACLS 2020",
    color: "#dc2626",
    steps: [
      "High-quality CPR — rate 100–120 bpm, depth ≥ 5 cm. Minimize interruptions",
      "Defibrillate immediately: 200 J biphasic. Resume CPR 2 min before rhythm check",
      "IV/IO access → Epinephrine 1 mg q3–5 min after 2nd shock",
      "Amiodarone 300 mg IV/IO (1st dose) or Lidocaine 1–1.5 mg/kg after 3rd shock",
      "Treat reversible causes: 5H5T (Hypovolemia, Hypoxia, H⁺, Hypo/Hyperkalemia, Hypothermia; Tamponade, Tension PTX, Thrombosis, Toxins)",
    ],
  },
  {
    code: "ACLS-ACS",
    title: "Acute Coronary Syndrome (STEMI/NSTEMI)",
    org: "ACC/AHA 2021",
    color: "#f97316",
    steps: [
      "MONA protocol: Morphine 2–4 mg IV, O₂ if SpO₂ < 90%, Nitroglycerin SL, Aspirin 325 mg PO",
      "12-lead ECG within 10 minutes. Activate cath lab for STEMI (door-to-balloon < 90 min)",
      "Dual antiplatelet: Aspirin + P2Y12 inhibitor (Ticagrelor 180 mg or Clopidogrel 600 mg)",
      "Anticoagulation: UFH 60 U/kg IV bolus (max 4,000 U), then 12 U/kg/hr infusion",
      "Beta-blocker if no contraindication. Avoid in cardiogenic shock / acute decompensation",
    ],
  },
  {
    code: "MOH-SEP",
    title: "Sepsis — qSOFA ≥ 2 or Suspected Infection",
    org: "MOH Sepsis Bundle 2024 · Surviving Sepsis 2021",
    color: "#7c3aed",
    steps: [
      "Obtain blood cultures (×2) before first antibiotic dose",
      "Broad-spectrum IV antibiotics within 1 hour of recognition",
      "30 mL/kg crystalloid IV within 3 hours for hypoperfusion or lactate ≥ 4 mmol/L",
      "Reassess fluid responsiveness every 30 min. Target MAP ≥ 65 mmHg",
      "Norepinephrine if MAP < 65 mmHg despite adequate fluid resuscitation",
    ],
  },
  {
    code: "MOH-STROKE",
    title: "Acute Ischemic Stroke — Code Stroke",
    org: "MOH Stroke Protocol 2024 · AHA/ASA 2019",
    color: "#0284c7",
    steps: [
      "Door-to-CT within 25 minutes. Non-contrast CT head to exclude hemorrhage",
      "IV tPA (Alteplase 0.9 mg/kg, max 90 mg) if within 4.5 h of last known well — door-to-needle < 60 min",
      "Blood glucose target: 140–180 mg/dL during acute phase",
      "Mechanical thrombectomy if large vessel occlusion — last known well ≤ 24 h",
      "Aspirin 325 mg if tPA not given. DVT prophylaxis after 24 h",
    ],
  },
];

const RISK_CFG: Record<string, { label: string; color: string; bg: string; glow: string; sla: string }> = {
  critical: { label: "CRITICAL",   color: "#fca5a5", bg: "rgba(220,38,38,0.90)",  glow: "rgba(220,38,38,0.40)", sla: "≤ 3 min"  },
  high:     { label: "HIGH RISK",  color: "#fed7aa", bg: "rgba(234,88,12,0.80)",  glow: "rgba(234,88,12,0.35)", sla: "≤ 30 min" },
  moderate: { label: "MODERATE",   color: "#fde68a", bg: "rgba(202,138,4,0.70)",  glow: "rgba(202,138,4,0.30)", sla: "≤ 2 hrs"  },
  low:      { label: "LOW RISK",   color: "#6ee7b7", bg: "rgba(5,150,105,0.70)",  glow: "rgba(5,150,105,0.25)", sla: "≤ 4 hrs"  },
};

/* ────────────────────────────────────────── */
export default function EmergencyPage() {
  const [nationalId, setNationalId]       = useState("");
  const [submittedId, setSubmittedId]     = useState<string | null>(null);
  const [alertsOpen, setAlertsOpen]       = useState(true);
  const [protocolsOpen, setProtocolsOpen] = useState(false);
  const [isOnline, setIsOnline]           = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [offlineDismissed, setOfflineDismissed] = useState(false);
  const [activeProtocolCode, setActiveProtocolCode]   = useState<string | null>(null);
  const [protocolActivatedAt, setProtocolActivatedAt] = useState<Date | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const goOnline  = () => { setIsOnline(true);  setOfflineDismissed(false); };
    const goOffline = () => { setIsOnline(false); setOfflineDismissed(false); };
    window.addEventListener("online",  goOnline);
    window.addEventListener("offline", goOffline);
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!protocolActivatedAt) { setElapsedSeconds(0); return; }
    const id = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - protocolActivatedAt.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [protocolActivatedAt]);

  function fmtElapsed(sec: number) {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function activateProtocol(code: string) {
    setActiveProtocolCode(code);
    setProtocolActivatedAt(new Date());
    setCompletedSteps(new Set());
    setProtocolsOpen(true);
  }

  function deactivateProtocol() {
    setActiveProtocolCode(null);
    setProtocolActivatedAt(null);
    setCompletedSteps(new Set());
    setElapsedSeconds(0);
  }

  function toggleStep(key: string) {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

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

  const actions           = (patient as any)?.clinicalActions as ClinicalAction[] | undefined;
  const immediate         = actions?.filter(a => a.priority === "immediate") ?? [];
  const guidance          = actions?.filter(a => a.priority !== "immediate") ?? [];
  const riskLevel         = (patient as any)?.riskLevel ?? "low";
  const riskCfg           = RISK_CFG[riskLevel] ?? RISK_CFG.low;
  const allergies         = (patient as any)?.allergies as string[] ?? [];
  const chronicConds      = (patient as any)?.chronicConditions as string[] ?? [];
  const riskFactors       = (patient as any)?.riskFactors as { factor: string; impact: "low"|"moderate"|"high"; description: string }[] ?? [];
  const aiRecommendations = (patient as any)?.aiRecommendations as string[] ?? [];
  const drugInteractions  = (patient as any)?.drugInteractions as { severity: string; conflictingDrug: string; description: string; recommendation: string }[] ?? [];

  /* ── shared dark-panel style ── */
  const darkPanel = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    backdropFilter: "blur(12px)",
  };

  return (
    <Layout role="emergency">

      {/* ══════════════════════════════════════════════════
          OFFLINE BANNER
      ══════════════════════════════════════════════════ */}
      {!isOnline && !offlineDismissed && (
        <div className="fixed top-0 left-0 right-0 z-[60] flex items-center gap-3 px-5 py-3"
          style={{ background: "linear-gradient(90deg, #7f1d1d, #dc2626)" }}>
          <WifiOff className="w-4 h-4 text-white shrink-0 animate-pulse" />
          <div className="flex-1">
            <p className="text-sm font-black text-white">OFFLINE MODE — Emergency Data Cached</p>
            <p className="text-[11px] text-white/80">Last sync: {now.toLocaleTimeString("en-SA")} · Patient records loaded from local cache · Critical protocols available offline</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl" style={{ background: "rgba(255,255,255,0.12)" }}>
              <Database className="w-3 h-3 text-white/80" />
              <span className="text-[10px] font-bold text-white">Cache: OK</span>
            </div>
            <button onClick={() => setOfflineDismissed(true)} className="text-white/60 hover:text-white font-bold px-2">✕</button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          COMMAND HEADER — dark war room
      ══════════════════════════════════════════════════ */}
      <div className="rounded-3xl overflow-hidden mb-6" style={{ background: "linear-gradient(135deg, #0a0a0f 0%, #1a0505 50%, #0a0a0f 100%)", boxShadow: "0 0 60px rgba(220,38,38,0.12)" }}>
        {/* Top crimson accent */}
        <div className="h-1" style={{ background: "linear-gradient(90deg, #7f1d1d, #dc2626, #ef4444, #dc2626, #7f1d1d)" }} />

        <div className="px-6 py-5">
          {/* Header row */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "rgba(220,38,38,0.20)", border: "1px solid rgba(220,38,38,0.30)" }}>
                <ShieldAlert className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white leading-tight tracking-tight">National Emergency Response System</h1>
                <p className="text-[11px] text-white/40 mt-0.5">SANAD · SRCA · MOH · AI-Powered Clinical Intelligence</p>
              </div>
            </div>

            {/* Status row right */}
            <div className="flex items-center gap-2">
              {/* Live clock */}
              <div className="px-3 py-1.5 rounded-xl font-mono text-sm font-black text-white/60" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
                {now.toLocaleTimeString("en-SA", { hour12: false })}
              </div>
              {/* Online indicator */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: isOnline ? "rgba(34,197,94,0.10)" : "rgba(220,38,38,0.10)", border: `1px solid ${isOnline ? "rgba(34,197,94,0.20)" : "rgba(220,38,38,0.20)"}` }}>
                {isOnline ? <Wifi className="w-3 h-3 text-emerald-400" /> : <WifiOff className="w-3 h-3 text-red-400" />}
                <span className="text-[10px] font-black text-white/60">{isOnline ? "Online" : "Offline"}</span>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: isOnline ? "#22c55e" : "#dc2626", animation: !isOnline ? "pulse 1s infinite" : "none" }} />
              </div>
            </div>
          </div>

          {/* Status strip */}
          <div className="flex items-center gap-2 mb-5">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white" style={{ background: "rgba(220,38,38,0.30)", border: "1px solid rgba(220,38,38,0.40)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              Emergency Mode Active
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold" style={{ background: sseConnected ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.06)", border: sseConnected ? "1px solid rgba(34,197,94,0.20)" : "1px solid rgba(255,255,255,0.08)", color: sseConnected ? "#86efac" : "rgba(255,255,255,0.35)" }}>
              <Radio className="w-3 h-3" />
              {sseConnected ? "9 AI Engines · Live" : "Connecting..."}
            </div>
            {sseUnread > 0 && (
              <button onClick={() => setAlertsOpen(p => !p)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black text-red-300 animate-pulse"
                style={{ background: "rgba(220,38,38,0.20)", border: "1px solid rgba(220,38,38,0.35)" }}>
                <Bell className="w-3 h-3" />
                {sseUnread} alert{sseUnread > 1 ? "s" : ""} unread
              </button>
            )}
            {patient && (
              <span className="ml-auto text-[10px] font-mono text-white/30 flex items-center gap-1">
                <RefreshCw className="w-2.5 h-2.5" />
                Retrieved {now.toLocaleTimeString("en-SA", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} · Confidence 97%
              </span>
            )}
          </div>

          {/* SEARCH COMMAND INPUT */}
          <form onSubmit={handleSearch}>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none" style={{ color: "rgba(220,38,38,0.60)" }} />
                <input
                  autoFocus
                  value={nationalId}
                  onChange={e => setNationalId(e.target.value)}
                  placeholder="Enter National ID — instant AI patient record retrieval..."
                  className="w-full h-14 pl-12 pr-4 rounded-2xl text-sm font-mono text-white placeholder:text-white/20 focus:outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: nationalId ? "1.5px solid rgba(220,38,38,0.60)" : "1px solid rgba(255,255,255,0.10)",
                    boxShadow: nationalId ? "0 0 20px rgba(220,38,38,0.15)" : "none",
                  }}
                />
              </div>
              <button
                type="submit"
                className="h-14 px-8 rounded-2xl flex items-center gap-2.5 font-black text-sm text-white transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #dc2626, #991b1b)", boxShadow: "0 4px 20px rgba(220,38,38,0.35)" }}
              >
                <Search className="w-4 h-4" />
                Lookup
              </button>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Quick Demo:</span>
              {["1000000001","1000000003","1000000005"].map(id => (
                <button key={id} type="button"
                  onClick={() => { setNationalId(id); setSubmittedId(id); }}
                  className="font-mono text-[11px] font-bold px-3 py-1 rounded-lg transition-all hover:text-red-300"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.40)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  {id}
                </button>
              ))}
            </div>
          </form>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          FLOATING LIVE ALERTS
      ══════════════════════════════════════════════════ */}
      {sseAlerts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] rounded-3xl overflow-hidden"
          style={{ background: "rgba(10,10,15,0.92)", backdropFilter: "blur(24px)", boxShadow: "0 20px 60px rgba(0,0,0,0.40), 0 0 0 1px rgba(220,38,38,0.20)" }}>
          <button onClick={() => setAlertsOpen(p => !p)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left"
            style={{ background: "rgba(220,38,38,0.25)", borderBottom: "1px solid rgba(220,38,38,0.20)" }}>
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-400" />
            </span>
            <span className="font-black text-sm text-white flex-1">Live Alerts</span>
            {sseUnread > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{sseUnread}</span>
            )}
            <button onClick={e => { e.stopPropagation(); clearSseAlerts(); }}
              className="text-[11px] font-bold px-2 py-0.5 rounded-lg transition-all"
              style={{ color: "rgba(255,255,255,0.40)", background: "rgba(255,255,255,0.06)" }}>
              Clear
            </button>
            {alertsOpen ? <ChevronDown className="w-3.5 h-3.5 text-white/50" /> : <ChevronUp className="w-3.5 h-3.5 text-white/50" />}
          </button>
          {alertsOpen && (
            <div className="divide-y max-h-[280px] overflow-y-auto" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              {sseAlerts.map(alert => (
                <div key={alert.id} className={`px-4 py-3 flex items-start gap-3 ${alert.read ? "opacity-30" : ""}`}>
                  <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                    alert.severity === "critical" ? "bg-red-400 animate-pulse" :
                    alert.severity === "high" ? "bg-amber-400" : "bg-sky-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white leading-snug">{alert.title}</p>
                    <p className="text-xs text-white/40 mt-0.5">{alert.patientName}{alert.result ? ` · ${alert.result}` : ""}</p>
                  </div>
                  {!alert.read && (
                    <button
                      onClick={() => { if (alert.nationalId) { setNationalId(alert.nationalId); setSubmittedId(alert.nationalId); } markSseRead(alert.id); }}
                      className="text-[10px] font-black text-white px-3 py-1 rounded-xl shrink-0 transition-all"
                      style={{ background: "rgba(220,38,38,0.40)", border: "1px solid rgba(220,38,38,0.30)" }}>
                      Load
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          LOADING
      ══════════════════════════════════════════════════ */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-24 gap-5">
          <div className="w-14 h-14 rounded-3xl flex items-center justify-center" style={{ background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.25)" }}>
            <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-red-500 animate-spin" />
          </div>
          <div className="text-center">
            <p className="font-black text-foreground mb-1">Retrieving patient record...</p>
            <p className="text-sm text-muted-foreground">Querying 9 AI engines across 450+ hospitals</p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          ERROR
      ══════════════════════════════════════════════════ */}
      {isError && !isLoading && (
        <div className="flex items-center gap-4 p-5 rounded-2xl" style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.20)" }}>
          <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
          <div>
            <p className="font-black text-red-700">Patient Not Found</p>
            <p className="text-sm text-muted-foreground mt-0.5">No record for <span className="font-mono font-bold">{submittedId}</span>. Verify the ID and retry.</p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          EMPTY STATE — system ready
      ══════════════════════════════════════════════════ */}
      {!submittedId && !isLoading && (
        <div className="space-y-6">
          {/* System readiness grid */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "AI Response", value: "< 1s", sub: "Average lookup", icon: Timer, color: "#22c55e" },
              { label: "AI Confidence", value: "97%", sub: "Clinical accuracy", icon: Brain, color: "#38bdf8" },
              { label: "AI Engines", value: "9 Live", sub: "All systems nominal", icon: Activity, color: "#a78bfa" },
              { label: "Hospitals", value: "450+", sub: "Connected facilities", icon: Target, color: "#fb923c" },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="rounded-2xl p-5 text-center" style={darkPanel}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: `${s.color}15`, border: `1px solid ${s.color}25` }}>
                    <Icon className="w-5 h-5" style={{ color: s.color }} />
                  </div>
                  <p className="text-2xl font-black text-foreground">{s.value}</p>
                  <p className="text-[11px] font-bold text-muted-foreground mt-0.5">{s.label}</p>
                  <p className="text-[9px] text-muted-foreground/60 mt-0.5">{s.sub}</p>
                </div>
              );
            })}
          </div>

          {/* Available protocols */}
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
              <ListChecks className="w-3.5 h-3.5 text-red-500" /> Emergency Protocols On Standby
            </p>
            <div className="grid grid-cols-2 gap-3">
              {EMERGENCY_PROTOCOLS.map((p) => (
                <div key={p.code} className="flex items-center gap-3 p-4 rounded-2xl" style={darkPanel}>
                  <div className="w-2 h-10 rounded-full shrink-0" style={{ background: p.color }} />
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-black text-white/30 font-mono">{p.code}</span>
                    </div>
                    <p className="text-sm font-bold text-foreground">{p.title}</p>
                    <p className="text-[10px] text-muted-foreground">{p.org}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          PATIENT RECORD — 2-COLUMN COMMAND CENTER
      ══════════════════════════════════════════════════ */}
      {patient && !isLoading && (
        <div className="space-y-4">

          {/* ── LIFE-CRITICAL 2-SECOND BANNER ── */}
          <div className="rounded-3xl overflow-hidden" style={{
            background: riskLevel === "critical" || riskLevel === "high"
              ? `linear-gradient(135deg, ${riskCfg.bg} 0%, rgba(10,10,15,0.95) 100%)`
              : "linear-gradient(135deg, rgba(5,150,105,0.20) 0%, rgba(10,10,15,0.95) 100%)",
            boxShadow: `0 8px 40px ${riskCfg.glow}`,
            border: `1px solid ${riskLevel === "critical" ? "rgba(220,38,38,0.40)" : riskLevel === "high" ? "rgba(234,88,12,0.35)" : "rgba(255,255,255,0.08)"}`,
          }}>
            <div className="flex items-stretch divide-x" style={{ borderColor: "rgba(255,255,255,0.10)" }}>
              {/* Blood type — always largest, always first */}
              <div className="flex flex-col items-center justify-center px-7 py-5 shrink-0 text-center">
                <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Blood Type</p>
                <p className="font-black leading-none text-white" style={{ fontSize: "52px", lineHeight: 1, textShadow: "0 0 30px rgba(255,255,255,0.20)" }}>{patient.bloodType}</p>
              </div>

              {/* Allergies */}
              <div className="flex flex-col justify-center px-6 py-5 shrink-0">
                <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-2">Known Allergies</p>
                {allergies.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {allergies.map((a, i) => (
                      <span key={i} className="text-xs font-black text-white px-2.5 py-1 rounded-xl"
                        style={{ background: "rgba(220,38,38,0.35)", border: "1px solid rgba(220,38,38,0.40)" }}>{a}</span>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm font-bold" style={{ color: "#86efac" }}>None on record</span>
                )}
              </div>

              {/* Priority action — take most space */}
              <div className="flex flex-col justify-center px-6 py-5 flex-1 min-w-0">
                <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-2">Priority Action</p>
                <p className="text-sm font-black text-white leading-snug">
                  {immediate.length > 0
                    ? immediate[0].description
                    : actions?.[0]?.description ?? "Standard monitoring protocol active"}
                </p>
                {immediate.length > 0 && (
                  <p className="text-[10px] text-red-300 mt-1 font-semibold">{immediate[0].reason}</p>
                )}
              </div>

              {/* Risk + SLA */}
              <div className="flex flex-col items-center justify-center px-6 py-5 shrink-0 text-center">
                <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1.5">Risk Level</p>
                <p className="text-2xl font-black uppercase tracking-wide" style={{ color: riskCfg.color }}>{riskLevel}</p>
                <div className="mt-1.5 px-2.5 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <p className="text-[10px] font-black font-mono text-white/60">{riskCfg.sla}</p>
                </div>
                {(patient as any).riskScore !== undefined && (
                  <p className="text-[10px] text-white/40 mt-1">AI Score: <span className="font-black text-white/60">{(patient as any).riskScore}/100</span></p>
                )}
              </div>
            </div>
          </div>

          {/* ── ALLERGY FULL ALERT (if allergies exist) ── */}
          {allergies.length > 0 && (
            <div className="flex items-start gap-4 p-5 rounded-3xl" style={{ background: "linear-gradient(135deg, rgba(185,28,28,0.90), rgba(127,29,29,0.85))", boxShadow: "0 4px 24px rgba(185,28,28,0.30)" }}>
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.15)" }}>
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black uppercase tracking-widest text-white/60 mb-1">Critical Medical Alert</p>
                <p className="text-lg font-black text-white">{allergies.length === 1 ? `${allergies[0]} Allergy` : `${allergies.length} Known Allergies`}</p>
                <p className="text-sm text-white/80 mt-1 leading-relaxed">
                  {allergies.length === 1
                    ? `Do NOT administer ${allergies[0]} or related compounds. Use alternative medications only.`
                    : `Do NOT administer: ${allergies.join(", ")}. Verify full allergy history before any medication.`}
                </p>
              </div>
            </div>
          )}

          {allergies.length === 0 && (
            <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl" style={{ background: "rgba(5,150,105,0.10)", border: "1px solid rgba(5,150,105,0.20)" }}>
              <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: "#22c55e" }} />
              <p className="text-sm font-bold" style={{ color: "#86efac" }}>No Known Allergies — Safe to administer standard medications</p>
            </div>
          )}

          {/* ── 2-COLUMN COMMAND CENTER ── */}
          <div className="grid grid-cols-12 gap-4">

            {/* ── LEFT COLUMN: Identity + Contact + Conditions ── */}
            <div className="col-span-5 space-y-4">

              {/* Patient Identity */}
              <div className="rounded-2xl p-5" style={darkPanel}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 font-black text-xl text-white" style={{ background: "linear-gradient(135deg, rgba(220,38,38,0.30), rgba(127,29,29,0.30))", border: "1px solid rgba(220,38,38,0.20)" }}>
                    {(patient.fullName as string).split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-black text-foreground leading-tight">{patient.fullName}</h2>
                    <p className="text-[10px] font-mono text-muted-foreground mt-0.5">NID · {patient.nationalId}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full text-white" style={{ background: riskCfg.bg }}>{riskCfg.label}</span>
                      <StatusDot status="active" />
                      <span className="text-[10px] text-emerald-600 font-semibold">Live record</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Blood Type", value: patient.bloodType, style: { background: "linear-gradient(135deg, #dc2626, #7f1d1d)" }, textClass: "text-white" },
                    { label: "Age", value: String(patient.age ?? "—"), style: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }, textClass: "text-foreground" },
                    { label: "Gender", value: patient.gender, style: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }, textClass: "text-foreground" },
                  ].map((item, i) => (
                    <div key={i} className="rounded-xl p-3 text-center" style={item.style}>
                      <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: i === 0 ? "rgba(255,255,255,0.60)" : "rgba(0,0,0,0.40)" }}>{item.label}</p>
                      <p className={`text-xl font-black ${item.textClass}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="rounded-2xl p-4" style={darkPanel}>
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <PhoneCall className="w-3 h-3 text-blue-500" /> Emergency Contact
                </p>
                {patient.emergencyContact ? (
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-foreground">{patient.emergencyContact}</p>
                      <p className="text-lg font-black text-blue-400 font-mono tracking-tight">{patient.emergencyPhone}</p>
                    </div>
                    <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white shrink-0 transition-all hover:opacity-90"
                      style={{ background: "linear-gradient(135deg, #1d4ed8, #1e40af)" }}>
                      <PhoneCall className="w-3.5 h-3.5" />
                      Call Now
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Not on record</p>
                )}
              </div>

              {/* Active Medications */}
              <div className="rounded-2xl overflow-hidden" style={darkPanel}>
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center gap-2">
                    <Droplet className="w-4 h-4 text-amber-500" />
                    <p className="text-sm font-black text-foreground">Active Medications</p>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white/60" style={{ background: "rgba(255,255,255,0.06)" }}>
                    {patient.currentMedications.length}
                  </span>
                </div>
                <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                  {patient.currentMedications.length > 0
                    ? patient.currentMedications.map((med: string, i: number) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors">
                        <span className="text-[10px] font-black text-white/20 tabular-nums w-4 shrink-0">{i + 1}</span>
                        <span className="text-sm font-semibold text-foreground">{med}</span>
                      </div>
                    ))
                    : <div className="px-4 py-4 text-sm text-muted-foreground">No active medications on record</div>
                  }
                </div>
              </div>

              {/* Chronic Conditions */}
              <div className="rounded-2xl overflow-hidden" style={darkPanel}>
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-500" />
                    <p className="text-sm font-black text-foreground">Chronic Conditions</p>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white/60" style={{ background: "rgba(255,255,255,0.06)" }}>
                    {chronicConds.length}
                  </span>
                </div>
                <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                  {chronicConds.length > 0
                    ? chronicConds.map((c: string, i: number) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "rgba(220,38,38,0.60)" }} />
                        <span className="text-sm font-semibold text-foreground">{c}</span>
                      </div>
                    ))
                    : <div className="px-4 py-4 text-sm text-muted-foreground">No chronic conditions on record</div>
                  }
                </div>
              </div>

              {/* System Alerts */}
              {patient.criticalAlerts.length > 0 && (
                <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.20)" }}>
                  <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid rgba(220,38,38,0.15)" }}>
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <p className="text-sm font-black text-red-700">System Alerts</p>
                    <span className="ml-auto text-[10px] font-black text-red-500">{patient.criticalAlerts.length}</span>
                  </div>
                  {patient.criticalAlerts.map((alert: string, i: number) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid rgba(220,38,38,0.08)" }}>
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                      <p className="text-sm font-semibold text-red-700">{alert}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── RIGHT COLUMN: Actions + AI Intelligence ── */}
            <div className="col-span-7 space-y-4">

              {/* IMMEDIATE ACTIONS — red urgency box */}
              {immediate.length > 0 && (
                <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(220,38,38,0.08)", border: "1.5px solid rgba(220,38,38,0.30)" }}>
                  <div className="flex items-center gap-3 px-5 py-3" style={{ background: "rgba(220,38,38,0.20)", borderBottom: "1px solid rgba(220,38,38,0.20)" }}>
                    <ShieldAlert className="w-4 h-4 text-red-400" />
                    <p className="text-sm font-black text-red-300 uppercase tracking-wide">Immediate Actions Required</p>
                    <span className="ml-auto flex items-center gap-1.5 text-[10px] font-black text-red-300 px-2.5 py-1 rounded-full" style={{ background: "rgba(220,38,38,0.30)" }}>
                      <Clock className="w-3 h-3" /> Act within 3 min
                    </span>
                  </div>
                  <div className="divide-y" style={{ borderColor: "rgba(220,38,38,0.10)" }}>
                    {immediate.map((action, i) => {
                      const cfg = ACTION_CFG[action.action];
                      const proto = ACTION_PROTOCOL[action.action];
                      const Icon = cfg.icon;
                      return (
                        <div key={i} className="flex items-start gap-4 px-5 py-4" style={{ borderLeft: `3px solid ${cfg.accent}` }}>
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: cfg.bg }}>
                            <Icon className="w-4 h-4" style={{ color: cfg.accent }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: cfg.accent }}>{cfg.label}</span>
                              <span className="text-[9px] font-black text-white px-2 py-0.5 rounded-md" style={{ background: "rgba(220,38,38,0.40)" }}>IMMEDIATE</span>
                            </div>
                            <p className="font-bold text-sm text-foreground">{action.description}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{action.reason}</p>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${proto.color}15`, color: proto.color }}>
                                <BookOpen className="w-2.5 h-2.5 shrink-0" /> {proto.org}
                              </span>
                              <span className="text-[9px] text-muted-foreground">{proto.ref}</span>
                            </div>
                          </div>
                          <span className="text-2xl font-black text-white/[0.06] tabular-nums shrink-0">{String(i + 1).padStart(2, "0")}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* AI TRIAGE INTELLIGENCE */}
              {(riskFactors.length > 0 || aiRecommendations.length > 0) && (
                <div className="rounded-2xl overflow-hidden" style={darkPanel}>
                  <div className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <Brain className="w-4 h-4 text-violet-400" />
                    <p className="text-sm font-black text-foreground">AI Triage Intelligence</p>
                    <span className="ml-auto text-[10px] font-bold text-violet-400 px-2.5 py-1 rounded-full" style={{ background: "rgba(124,58,237,0.12)" }}>
                      {riskFactors.length} factor{riskFactors.length !== 1 ? "s" : ""} analysed
                    </span>
                  </div>

                  {riskFactors.length > 0 && (
                    <div className="px-5 py-4">
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-3">Why this risk score?</p>
                      <div className="space-y-2">
                        {riskFactors.map((f, i) => {
                          const impactColor = f.impact === "high" ? "#ef4444" : f.impact === "moderate" ? "#f59e0b" : "#007AFF";
                          const barW = f.impact === "high" ? "100%" : f.impact === "moderate" ? "66%" : "33%";
                          return (
                            <div key={i} className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold text-foreground">{f.factor}</span>
                                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md" style={{ background: `${impactColor}18`, color: impactColor }}>{f.impact}</span>
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
                              <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                                <div className="h-full rounded-full transition-all" style={{ width: barW, background: impactColor }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {aiRecommendations.length > 0 && (
                    <div className="px-5 pb-4">
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-3">AI Recommendations</p>
                      <div className="space-y-1.5">
                        {aiRecommendations.map((rec, i) => (
                          <div key={i} className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                            <span className="text-[10px] font-black text-violet-400 tabular-nums shrink-0 mt-0.5 font-mono">{String(i + 1).padStart(2, "0")}</span>
                            <p className="text-xs font-semibold text-foreground leading-relaxed">{rec}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* DRUG INTERACTIONS */}
              {drugInteractions.length > 0 && (
                <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(217,119,6,0.06)", border: "1px solid rgba(217,119,6,0.20)" }}>
                  <div className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: "1px solid rgba(217,119,6,0.12)" }}>
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <p className="text-sm font-black text-foreground">AI Drug Interaction Warning</p>
                    <span className="ml-auto text-[10px] font-bold text-amber-600 px-2.5 py-1 rounded-full" style={{ background: "rgba(217,119,6,0.12)" }}>
                      {drugInteractions.length} detected
                    </span>
                  </div>
                  <div className="divide-y" style={{ borderColor: "rgba(217,119,6,0.08)" }}>
                    {drugInteractions.map((ix, i) => {
                      const sev = ix.severity;
                      const sevColor = sev === "critical" ? "#dc2626" : sev === "high" ? "#ea580c" : "#f59e0b";
                      return (
                        <div key={i} className="px-5 py-4" style={{ borderLeft: `3px solid ${sevColor}` }}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full" style={{ background: `${sevColor}18`, color: sevColor }}>{sev}</span>
                            <span className="text-sm font-bold text-foreground">{ix.conflictingDrug}</span>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">{ix.description}</p>
                          <div className="flex items-start gap-2 mt-2 p-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wide shrink-0 mt-0.5">Rec</span>
                            <p className="text-xs font-semibold text-foreground">{ix.recommendation}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* CLINICAL GUIDANCE */}
              {guidance.length > 0 && (
                <div className="rounded-2xl overflow-hidden" style={darkPanel}>
                  <div className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <UserCheck className="w-4 h-4 text-amber-500" />
                    <p className="text-sm font-black text-foreground">Clinical Guidance</p>
                    <span className="ml-auto text-[10px] font-bold text-muted-foreground px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>{guidance.length} notes</span>
                  </div>
                  <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                    {guidance.map((action, i) => {
                      const cfg = ACTION_CFG[action.action];
                      const proto = ACTION_PROTOCOL[action.action];
                      const Icon = cfg.icon;
                      return (
                        <div key={i} className="flex items-start gap-4 px-5 py-3.5" style={{ borderLeft: `3px solid ${cfg.accent}` }}>
                          <Icon className="w-4 h-4 shrink-0 mt-0.5" style={{ color: cfg.accent }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: cfg.accent }}>{cfg.label}</span>
                              <span className="text-[10px] text-muted-foreground">· {action.priority}</span>
                            </div>
                            <p className="text-sm font-semibold text-foreground">{action.description}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{action.reason}</p>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${proto.color}12`, color: proto.color }}>
                                <BookOpen className="w-2.5 h-2.5" /> {proto.org}
                              </span>
                              <span className="text-[9px] text-muted-foreground">{proto.ref}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── EMERGENCY PROTOCOLS — full width ── */}
          <div className="rounded-2xl overflow-hidden" style={darkPanel}>
            <div className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <ListChecks className="w-4 h-4 text-red-500" />
              <p className="text-sm font-black text-foreground">Emergency Protocols</p>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: "rgba(220,38,38,0.15)", color: "#fca5a5" }}>ACLS · MOH · SRCA</span>
              {activeProtocolCode && (
                <span className="text-[10px] font-black text-white px-2.5 py-0.5 rounded-full animate-pulse flex items-center gap-1" style={{ background: "rgba(220,38,38,0.50)" }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" /> ACTIVE
                </span>
              )}
              <button onClick={() => setProtocolsOpen(p => !p)}
                className="ml-auto flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full transition-colors"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.50)" }}>
                {protocolsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {protocolsOpen ? "Hide" : "Show"} protocols
              </button>
            </div>

            {/* Active Protocol Banner */}
            {activeProtocolCode && (() => {
              const proto = EMERGENCY_PROTOCOLS.find(p => p.code === activeProtocolCode)!;
              const doneCount = Array.from(completedSteps).filter(k => k.startsWith(activeProtocolCode + "-")).length;
              const pct = Math.round((doneCount / proto.steps.length) * 100);
              return (
                <div className="mx-4 my-3 rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${proto.color}50` }}>
                  <div className="flex items-center gap-4 px-4 py-3" style={{ background: proto.color }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black text-white/70 uppercase tracking-widest">Active Protocol</p>
                      <p className="text-sm font-black text-white">{proto.code} — {proto.title}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[9px] text-white/70 uppercase tracking-widest">Elapsed</p>
                      <p className="text-2xl font-black tabular-nums text-white font-mono">{fmtElapsed(elapsedSeconds)}</p>
                    </div>
                    <button onClick={deactivateProtocol}
                      className="shrink-0 flex items-center gap-1 text-[10px] font-black px-3 py-1.5 rounded-xl transition-all"
                      style={{ background: "rgba(255,255,255,0.20)" }}>
                      <CheckCircle2 className="w-3 h-3 text-white" />
                      <span className="text-white">End</span>
                    </button>
                  </div>
                  <div className="px-4 py-2.5" style={{ background: `${proto.color}0d` }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-bold text-foreground">{doneCount} of {proto.steps.length} steps completed</p>
                      <p className="text-[10px] font-black" style={{ color: proto.color }}>{pct}%</p>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: proto.color }} />
                    </div>
                    {pct === 100 && (
                      <p className="text-[10px] font-bold text-emerald-400 mt-2 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> All steps complete — document and deactivate when ready
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}

            {protocolsOpen && (
              <div className="px-4 pb-4 space-y-3 mt-1">
                <div className="grid grid-cols-2 gap-3">
                  {EMERGENCY_PROTOCOLS.map((protocol) => {
                    const isActive = activeProtocolCode === protocol.code;
                    const doneCount = Array.from(completedSteps).filter(k => k.startsWith(protocol.code + "-")).length;
                    const donePct = isActive ? Math.round((doneCount / protocol.steps.length) * 100) : 0;
                    return (
                      <div key={protocol.code} className="rounded-2xl overflow-hidden" style={{
                        border: isActive ? `1.5px solid ${protocol.color}60` : "1px solid rgba(255,255,255,0.06)",
                        boxShadow: isActive ? `0 0 20px ${protocol.color}20` : "none",
                      }}>
                        <div className="flex items-center gap-3 px-4 py-3" style={{ background: isActive ? `${protocol.color}18` : `${protocol.color}08`, borderBottom: `1.5px solid ${protocol.color}40` }}>
                          <span className="text-[9px] font-black font-mono px-2 py-0.5 rounded-lg text-white" style={{ background: protocol.color }}>{protocol.code}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-foreground leading-snug">{protocol.title}</p>
                            <p className="text-[9px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <BookOpen className="w-2.5 h-2.5" /> {protocol.org}
                            </p>
                          </div>
                          {isActive ? (
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] font-black tabular-nums font-mono" style={{ color: protocol.color }}>{fmtElapsed(elapsedSeconds)}</span>
                              <span className="text-[10px] font-bold" style={{ color: protocol.color }}>{donePct}%</span>
                              <button onClick={deactivateProtocol} className="text-[10px] font-bold px-2 py-0.5 rounded-lg" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.50)" }}>End</button>
                            </div>
                          ) : (
                            <button onClick={() => activateProtocol(protocol.code)} disabled={!!activeProtocolCode}
                              className="shrink-0 flex items-center gap-1 text-[10px] font-black px-3 py-1.5 rounded-xl text-white disabled:opacity-30 transition-all"
                              style={{ background: protocol.color }}>
                              <Zap className="w-3 h-3" /> Activate
                            </button>
                          )}
                        </div>
                        <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                          {protocol.steps.map((step, si) => {
                            const stepKey = `${protocol.code}-${si}`;
                            const done = completedSteps.has(stepKey);
                            return (
                              <div key={si}
                                className={`flex items-start gap-3 px-4 py-2.5 transition-colors ${isActive ? "cursor-pointer hover:bg-white/[0.02]" : ""} ${done ? "bg-white/[0.02]" : ""}`}
                                onClick={isActive ? () => toggleStep(stepKey) : undefined}
                              >
                                {isActive ? (
                                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all"
                                    style={{ borderColor: done ? protocol.color : `${protocol.color}50`, background: done ? protocol.color : "transparent" }}>
                                    {done && <CheckCircle2 className="w-3 h-3 text-white" />}
                                  </div>
                                ) : (
                                  <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5"
                                    style={{ borderColor: `${protocol.color}50`, color: protocol.color }}>{si + 1}</span>
                                )}
                                <p className={`text-xs leading-relaxed ${done ? "line-through text-muted-foreground/40" : "text-foreground"}`}>{step}</p>
                                {done && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 ml-auto" style={{ color: "#22c55e" }} />}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[9px] text-muted-foreground/50 text-right">Protocols verified against MOH Saudi Arabia 2024 clinical guidelines. For reference only — clinical judgment applies.</p>
              </div>
            )}
          </div>

        </div>
      )}
    </Layout>
  );
}
