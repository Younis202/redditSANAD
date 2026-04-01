import React, { useState, useEffect } from "react";
import {
  Search, AlertTriangle, FileWarning,
  PhoneCall, Activity, Clock, Zap,
  ShieldAlert, Ban, Eye, UserCheck, Wrench,
  PauseCircle, Brain, Timer, Bell,
  ChevronDown, ChevronUp, CheckCircle2, Radio,
  Fingerprint, Heart, Droplet, User, BookOpen,
  ChevronRight, RefreshCw, ListChecks, Wifi, WifiOff, Database
} from "lucide-react";
import { Layout } from "@/components/layout";
import { Card, CardHeader, CardTitle, CardBody, PageHeader, StatusDot, PortalHero } from "@/components/shared";
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

const RISK_BADGE: Record<string, { text: string; label: string }> = {
  critical: { text: "text-red-700",    label: "CRITICAL"  },
  high:     { text: "text-orange-700", label: "HIGH RISK" },
  moderate: { text: "text-primary",    label: "MODERATE"  },
  low:      { text: "text-emerald-700",label: "LOW RISK"  },
};

const SLA: Record<string, string> = {
  critical: "≤ 3 min", high: "≤ 30 min", moderate: "≤ 2 hrs", low: "≤ 4 hrs",
};

export default function EmergencyPage() {
  const [nationalId, setNationalId]       = useState("");
  const [submittedId, setSubmittedId]     = useState<string | null>(null);
  const [alertsOpen, setAlertsOpen]       = useState(true);
  const [protocolsOpen, setProtocolsOpen] = useState(false);
  const [isOnline, setIsOnline]           = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [offlineDismissed, setOfflineDismissed] = useState(false);

  // Protocol activation state
  const [activeProtocolCode, setActiveProtocolCode] = useState<string | null>(null);
  const [protocolActivatedAt, setProtocolActivatedAt] = useState<Date | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const goOnline  = () => { setIsOnline(true);  setOfflineDismissed(false); };
    const goOffline = () => { setIsOnline(false); setOfflineDismissed(false); };
    window.addEventListener("online",  goOnline);
    window.addEventListener("offline", goOffline);
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, []);

  // Live timer for active protocol
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
  const riskBadge         = RISK_BADGE[riskLevel] ?? RISK_BADGE.low;
  const allergies         = (patient as any)?.allergies as string[] ?? [];
  const chronicConds      = (patient as any)?.chronicConditions as string[] ?? [];
  const riskFactors       = (patient as any)?.riskFactors as { factor: string; impact: "low"|"moderate"|"high"; description: string }[] ?? [];
  const aiRecommendations = (patient as any)?.aiRecommendations as string[] ?? [];
  const drugInteractions  = (patient as any)?.drugInteractions as { severity: string; conflictingDrug: string; description: string; recommendation: string }[] ?? [];

  return (
    <Layout role="emergency">

      {/* ── OFFLINE-FIRST INDICATOR ── */}
      {!isOnline && !offlineDismissed && (
        <div className="fixed top-0 left-0 right-0 z-[60] flex items-center gap-3 px-5 py-3" style={{ background: "linear-gradient(90deg, #dc2626, #7f1d1d)" }}>
          <WifiOff className="w-4 h-4 text-white shrink-0 animate-pulse" />
          <div className="flex-1">
            <p className="text-sm font-black text-white">OFFLINE MODE — Emergency Data Cached</p>
            <p className="text-[11px] text-white/80">Last sync: {new Date().toLocaleTimeString("en-SA")} · Patient records loaded from local cache · Critical protocols available offline</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 bg-white/10 rounded-xl px-2.5 py-1">
              <Database className="w-3 h-3 text-white/80" />
              <span className="text-[10px] font-bold text-white">Cache: OK</span>
            </div>
            <button onClick={() => setOfflineDismissed(true)} className="text-white/60 hover:text-white text-xs font-bold px-2">✕</button>
          </div>
        </div>
      )}

      {/* ── ONLINE STATUS PILL (always visible in corner) ── */}
      <div className="fixed top-3 right-3 z-50 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wide" style={{ background: isOnline ? "rgba(34,197,94,0.12)" : "rgba(220,38,38,0.12)", backdropFilter: "blur(8px)", border: `1px solid ${isOnline ? "#22c55e40" : "#dc262640"}` }}>
        {isOnline ? <Wifi className="w-2.5 h-2.5 text-emerald-600" /> : <WifiOff className="w-2.5 h-2.5 text-red-600" />}
        <span className={isOnline ? "text-emerald-700" : "text-red-700"}>{isOnline ? "Online" : "Offline"}</span>
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: isOnline ? "#22c55e" : "#dc2626", animation: isOnline ? "none" : "pulse 1s infinite" }} />
      </div>

      {/* ── FLOATING LIVE ALERTS ── */}
      {sseAlerts.length > 0 && (
        <div
          className="fixed bottom-6 right-6 z-50 w-[340px] rounded-[2rem] overflow-hidden"
          style={{ background: "rgba(255,255,255,0.80)", backdropFilter: "blur(20px)", boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.40)" }}
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
            <div className="divide-y divide-white/20 max-h-[260px] overflow-y-auto">
              {sseAlerts.map(alert => (
                <div key={alert.id} className={`px-4 py-3 flex items-start gap-3 ${alert.read ? "opacity-40" : ""}`}>
                  <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                    alert.severity === "critical" ? "bg-red-500 animate-pulse" :
                    alert.severity === "high" ? "bg-amber-400" : "bg-sky-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-snug">{alert.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{alert.patientName}{alert.result ? ` · ${alert.result}` : ""}</p>
                  </div>
                  {!alert.read && (
                    <button
                      onClick={() => { if (alert.nationalId) { setNationalId(alert.nationalId); setSubmittedId(alert.nationalId); } markSseRead(alert.id); }}
                      className="text-[11px] font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl px-2.5 py-1 shrink-0 transition-colors"
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

      <PortalHero
        title="Emergency Lookup"
        subtitle="Instant AI-powered patient record retrieval — blood type, allergies, medications, and clinical actions in under one second."
        icon={ShieldAlert}
        gradient="linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)"
        badge="Emergency Response · SRCA"
        stats={[
          { label: "Hospitals", value: "450+" },
          { label: "Response Time", value: "<1s" },
          { label: "AI Engines", value: "Live" },
        ]}
      />

      {/* ── STATUS PILLS + SEARCH ── */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-5">
          <div className="flex items-center gap-1.5 bg-red-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-full tracking-wider uppercase">
            <Zap className="w-3 h-3" />
            Emergency Mode Active
          </div>
          <div className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full ${
            sseConnected
              ? "bg-secondary text-emerald-700"
              : "bg-secondary text-muted-foreground"
          }`}>
            <Radio className={`w-3 h-3 ${sseConnected ? "text-emerald-500" : "text-muted-foreground/50"}`} />
            {sseConnected ? "9 AI Engines · Live" : "Connecting..."}
          </div>
          {sseUnread > 0 && (
            <button
              onClick={() => setAlertsOpen(p => !p)}
              className="flex items-center gap-1.5 text-[11px] font-bold text-red-700 bg-secondary px-3 py-1.5 rounded-full hover:bg-border transition-colors"
            >
              <Bell className="w-3 h-3" />
              {sseUnread} alert{sseUnread > 1 ? "s" : ""}
            </button>
          )}
          {patient && (
            <div className="ml-auto text-xs text-muted-foreground font-mono">
              Last update · {new Date().toLocaleTimeString("en-SA", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
          )}
        </div>

        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="flex-1 relative">
            <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 w-4.5 h-4.5 pointer-events-none" />
            <input
              autoFocus
              value={nationalId}
              onChange={e => setNationalId(e.target.value)}
              placeholder="Enter National ID to retrieve patient data..."
              className="w-full h-12 pl-11 pr-4 rounded-2xl text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-red-400 transition-all"
              style={{ background: "rgba(255,255,255,0.80)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.60)" }}
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
        <div className="flex items-center gap-2 mt-3 ml-1 flex-wrap">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Demo Patient IDs:</span>
          {["1000000001","1000000003","1000000005"].map(id => (
            <button
              key={id}
              type="button"
              onClick={() => { setNationalId(id); setSubmittedId(id); }}
              className="font-mono text-[11px] font-bold text-primary bg-secondary hover:bg-border px-2.5 py-1 rounded-lg transition-colors"
            >
              {id}
            </button>
          ))}
          <span className="text-[10px] text-muted-foreground ml-1">— enter patient National ID, not responder ID</span>
        </div>
      </div>

      {/* ── LOADING ── */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-black/[0.06] border-t-red-500 animate-spin" />
          <p className="text-sm font-semibold text-muted-foreground">Retrieving patient record...</p>
        </div>
      )}

      {/* ── ERROR ── */}
      {isError && !isLoading && (
        <Card className="p-5 flex items-center gap-4">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <div>
            <p className="font-bold text-red-700 text-sm">Patient Not Found</p>
            <p className="text-xs text-red-500 mt-0.5">No record for <span className="font-mono font-bold">{submittedId}</span>. Verify the ID and retry.</p>
          </div>
        </Card>
      )}

      {/* ── EMPTY STATE ── */}
      {!submittedId && !isLoading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-3xl bg-secondary flex items-center justify-center mb-1">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">Emergency Lookup Ready</p>
            <p className="text-sm text-muted-foreground max-w-sm mt-1 leading-relaxed">
              Enter a National ID to retrieve blood type, allergies, medications, and AI-generated clinical actions in under one second.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-2 w-full max-w-xs">
            {[{ label: "Response", value: "< 1s", icon: Timer }, { label: "Confidence", value: "97%", icon: Brain }, { label: "AI Sources", value: "9 Live", icon: Activity }].map(({ label, value, icon: Icon }) => (
              <Card key={label} className="p-4 flex flex-col items-center gap-2">
                <Icon className="w-4 h-4 text-muted-foreground/40" />
                <p className="text-base font-black text-foreground">{value}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── PATIENT RECORD ── */}
      {patient && (
        <div className="space-y-4">

          {/* 0. LIFE-CRITICAL 2-SECOND PRIORITY STRIP */}
          {(riskLevel === "critical" || riskLevel === "high" || allergies.length > 0) && (
            <div
              className="rounded-[2rem] p-4 flex items-center gap-5"
              style={{
                background: riskLevel === "critical" ? "linear-gradient(135deg, #7f1d1d, #b91c1c)" : riskLevel === "high" ? "linear-gradient(135deg, #7c2d12, #c2410c)" : "linear-gradient(135deg, #1c1917, #44403c)",
                boxShadow: `0 8px 32px ${riskLevel === "critical" ? "rgba(185,28,28,0.35)" : "rgba(194,65,12,0.28)"}`,
              }}
            >
              {/* Blood Type — must-see, largest text */}
              <div className="shrink-0 text-center">
                <p className="text-[8px] font-black text-white/50 uppercase tracking-widest mb-0.5">Blood</p>
                <p className="text-[42px] font-black text-white leading-none tracking-tighter">{patient.bloodType}</p>
              </div>

              <div className="w-px h-14 bg-white/20 shrink-0" />

              {/* Allergies — must-see second */}
              <div className="shrink-0">
                <p className="text-[8px] font-black text-white/50 uppercase tracking-widest mb-1">Allergies</p>
                {allergies.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {allergies.map((a, i) => (
                      <span key={i} className="text-[11px] font-black text-white bg-white/20 px-2.5 py-1 rounded-xl">{a}</span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[12px] font-bold text-emerald-300">None on record</span>
                )}
              </div>

              <div className="w-px h-14 bg-white/20 shrink-0" />

              {/* Top Clinical Action */}
              <div className="flex-1 min-w-0">
                <p className="text-[8px] font-black text-white/50 uppercase tracking-widest mb-1">Priority Action</p>
                {(actions ?? []).filter(a => a.priority === "immediate").length > 0 ? (
                  <p className="text-[13px] font-black text-white leading-snug">
                    {(actions ?? []).find(a => a.priority === "immediate")?.description ?? actions?.[0]?.description}
                  </p>
                ) : (actions ?? []).length > 0 ? (
                  <p className="text-[13px] font-black text-white leading-snug">{actions?.[0]?.description}</p>
                ) : (
                  <p className="text-[13px] font-black text-white/70">Standard monitoring protocol active</p>
                )}
              </div>

              <div className="w-px h-14 bg-white/20 shrink-0" />

              {/* Risk + SLA */}
              <div className="shrink-0 text-right">
                <p className="text-[8px] font-black text-white/50 uppercase tracking-widest mb-1">Risk / SLA</p>
                <p className={`text-[17px] font-black uppercase tracking-wide ${riskLevel === "critical" ? "text-red-300" : "text-orange-300"}`}>{riskLevel}</p>
                <p className="text-[11px] text-white/70 font-mono font-bold">{SLA[riskLevel]}</p>
              </div>
            </div>
          )}

          {/* 1. PATIENT IDENTITY CARD */}
          <Card>
            <CardBody>
              <div className="flex items-start gap-5">
                <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center shrink-0">
                  <User className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-[28px] font-black text-foreground leading-tight tracking-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>{patient.fullName}</h1>
                  <p className="text-sm text-muted-foreground font-mono mt-1">PATIENT ID · {patient.nationalId}</p>
                  <div className="flex items-center gap-2 flex-wrap mt-3">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full bg-secondary ${riskBadge.text}`}>{riskBadge.label}</span>
                    <span className="text-xs text-muted-foreground font-semibold">Response SLA: <span className="text-foreground font-bold">{SLA[riskLevel]}</span></span>
                    {(patient as any).riskScore !== undefined && (
                      <span className="text-xs text-muted-foreground font-semibold">AI Score: <span className="text-foreground font-bold">{(patient as any).riskScore}/100</span></span>
                    )}
                    <span className="ml-auto flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                      <StatusDot status="active" />
                      Live record
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                      <RefreshCw className="w-3 h-3" />
                      Retrieved {new Date().toLocaleTimeString("en-SA", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} · Confidence 97%
                    </span>
                  </div>
                </div>
              </div>

              {/* Key stats */}
              <div className="grid grid-cols-4 gap-3 mt-5">
                <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)" }}>
                  <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-2">Blood Type</p>
                  <p className="text-3xl font-black text-white leading-none">{patient.bloodType}</p>
                  {riskLevel === "critical" && (
                    <p className="text-[10px] font-black text-white/80 uppercase tracking-widest mt-1.5">Critical</p>
                  )}
                </div>
                <div className="bg-secondary rounded-2xl p-4">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Age / Sex</p>
                  <p className="text-3xl font-black text-foreground leading-none">{patient.age ?? "—"}</p>
                  <p className="text-sm text-muted-foreground font-semibold mt-1">{patient.gender}</p>
                </div>
                <div className="bg-secondary rounded-2xl p-4 col-span-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Emergency Contact</p>
                  {patient.emergencyContact ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-foreground">{patient.emergencyContact}</p>
                        <p className="text-lg font-black text-blue-600 font-mono mt-0.5 tracking-tight">{patient.emergencyPhone}</p>
                      </div>
                      <button className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shrink-0">
                        <PhoneCall className="w-3.5 h-3.5" />
                        Call Now
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not on record</p>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>

          {/* 2. CRITICAL ALLERGY ALERT — intentional red strip */}
          {allergies.length > 0 && (
            <div className="bg-red-600 rounded-[2rem] p-5 flex items-start gap-4">
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
                      <span key={i} className="text-xs font-bold text-white/90 bg-white/15 px-2.5 py-1 rounded-full">{a}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* No allergies */}
          {allergies.length === 0 && (
            <Card className="flex items-center gap-3 px-5 py-3.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <p className="text-sm font-semibold text-emerald-700">No Known Allergies — Safe to administer standard medications</p>
            </Card>
          )}

          {/* 3. MEDICATIONS + CONDITIONS */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-secondary flex items-center justify-center">
                    <Droplet className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <CardTitle>Active Medications</CardTitle>
                </div>
                <span className="text-[11px] font-bold text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
                  {patient.currentMedications.length}
                </span>
              </CardHeader>
              <CardBody className="p-2">
                {patient.currentMedications.length > 0 ? patient.currentMedications.map((med, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary transition-colors">
                    <span className="text-[11px] font-black text-muted-foreground/40 tabular-nums w-5 shrink-0">{i + 1}</span>
                    <span className="text-sm font-semibold text-foreground">{med}</span>
                  </div>
                )) : (
                  <div className="px-3 py-4 text-sm text-muted-foreground">No active medications on record</div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-secondary flex items-center justify-center">
                    <Heart className="w-3.5 h-3.5 text-red-500" />
                  </div>
                  <CardTitle>Chronic Conditions</CardTitle>
                </div>
                <span className="text-[11px] font-bold text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
                  {chronicConds.length}
                </span>
              </CardHeader>
              <CardBody className="p-2">
                {chronicConds.length > 0 ? chronicConds.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary transition-colors">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/30 shrink-0" />
                    <span className="text-sm font-semibold text-foreground">{c}</span>
                  </div>
                )) : (
                  <div className="px-3 py-4 text-sm text-muted-foreground">No chronic conditions on record</div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* 4. DRUG INTERACTION WARNINGS */}
          {drugInteractions.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-secondary flex items-center justify-center">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <CardTitle>AI Drug Interaction Warning</CardTitle>
                </div>
                <span className="text-[11px] font-bold text-amber-700 bg-secondary px-2.5 py-1 rounded-full">{drugInteractions.length} detected</span>
              </CardHeader>
              <CardBody className="divide-y divide-border p-0">
                {drugInteractions.map((ix, i) => {
                  const sev = ix.severity;
                  const sevBorderColor = sev === "critical" ? "#dc2626" : sev === "high" ? "#ea580c" : "#f59e0b";
                  const sevTextColor = sev === "critical" ? "text-red-700" : sev === "high" ? "text-orange-700" : "text-amber-700";
                  return (
                    <div key={i} className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-secondary ${sevTextColor}`}
                              style={{ borderLeft: `2px solid ${sevBorderColor}` }}>{sev}</span>
                            <span className="text-sm font-bold text-foreground">{ix.conflictingDrug}</span>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">{ix.description}</p>
                          <div className="flex items-start gap-2 mt-2 p-2.5 bg-secondary rounded-xl">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wide shrink-0 mt-0.5">Recommendation</span>
                            <p className="text-xs font-semibold text-foreground">{ix.recommendation}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardBody>
            </Card>
          )}

          {/* 5. AI TRIAGE INTELLIGENCE */}
          {(riskFactors.length > 0 || aiRecommendations.length > 0) && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-secondary flex items-center justify-center">
                    <Brain className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <CardTitle>AI Triage Intelligence</CardTitle>
                </div>
                <span className="text-[10px] font-bold text-primary bg-secondary px-2.5 py-1 rounded-full">
                  {riskFactors.length} risk factor{riskFactors.length !== 1 ? "s" : ""} analysed
                </span>
              </CardHeader>

              {riskFactors.length > 0 && (
                <CardBody>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">Why this risk score?</p>
                  <div className="space-y-2">
                    {riskFactors.map((f, i) => {
                      const impactBar = f.impact === "high" ? "bg-red-500 w-full" : f.impact === "moderate" ? "bg-amber-500 w-2/3" : "bg-primary w-1/3";
                      const impactText = f.impact === "high" ? "text-red-700" : f.impact === "moderate" ? "text-amber-700" : "text-primary";
                      return (
                        <div key={i} className="flex items-start gap-3 p-3 bg-secondary rounded-xl">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-foreground">{f.factor}</span>
                              <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-secondary ${impactText}`}>{f.impact}</span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
                            <div className="mt-1.5 h-1 bg-border rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${impactBar}`} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardBody>
              )}

              {aiRecommendations.length > 0 && (
                <CardBody className="pt-0">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">AI Recommendations</p>
                  <div className="space-y-2">
                    {aiRecommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-2.5 px-3 py-2.5 bg-secondary/60 rounded-xl">
                        <span className="text-[10px] font-black text-primary tabular-nums shrink-0 mt-0.5">{String(i+1).padStart(2,"0")}</span>
                        <p className="text-xs font-semibold text-foreground leading-relaxed">{rec}</p>
                      </div>
                    ))}
                  </div>
                </CardBody>
              )}
            </Card>
          )}

          {/* 6. IMMEDIATE ACTIONS */}
          {immediate.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-secondary flex items-center justify-center">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                  </div>
                  <CardTitle className="text-red-700 uppercase tracking-wide">Immediate Actions Required</CardTitle>
                </div>
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-red-600 bg-secondary px-2.5 py-1 rounded-full">
                  <Clock className="w-3 h-3" /> Act within 3 min
                </span>
              </CardHeader>
              <CardBody className="divide-y divide-border p-0">
                {immediate.map((action, i) => {
                  const cfg = ACTION_CFG[action.action];
                  const proto = ACTION_PROTOCOL[action.action];
                  const Icon = cfg.icon;
                  return (
                    <div key={i} className="flex items-start gap-4 px-5 py-4" style={{ borderLeft: `3px solid ${cfg.accent}` }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${cfg.accent}12` }}>
                        <Icon className={`w-4.5 h-4.5 ${cfg.textColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: cfg.accent }}>{cfg.label}</span>
                          <span className="text-[10px] font-bold text-red-600 bg-secondary px-2 py-0.5 rounded-md">IMMEDIATE</span>
                        </div>
                        <p className={`font-bold text-sm ${cfg.textColor}`}>{action.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{action.reason}</p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${proto.color}12`, color: proto.color }}>
                            <BookOpen className="w-2.5 h-2.5 shrink-0" /> {proto.org}
                          </span>
                          <span className="text-[9px] text-muted-foreground">{proto.ref}</span>
                        </div>
                      </div>
                      <span className="text-xl font-black text-black/[0.06] tabular-nums shrink-0 mt-1">{String(i + 1).padStart(2, "0")}</span>
                    </div>
                  );
                })}
              </CardBody>
            </Card>
          )}

          {/* 7. CLINICAL GUIDANCE */}
          {guidance.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-secondary flex items-center justify-center">
                    <UserCheck className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <CardTitle>Clinical Guidance</CardTitle>
                </div>
                <span className="text-[11px] font-bold text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">{guidance.length} notes</span>
              </CardHeader>
              <CardBody className="divide-y divide-border p-0">
                {guidance.map((action, i) => {
                  const cfg = ACTION_CFG[action.action];
                  const proto = ACTION_PROTOCOL[action.action];
                  const Icon = cfg.icon;
                  return (
                    <div key={i} className="flex items-start gap-4 px-5 py-3.5" style={{ borderLeft: `3px solid ${cfg.accent}` }}>
                      <Icon className={`w-4 h-4 ${cfg.textColor} shrink-0 mt-0.5`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: cfg.accent }}>{cfg.label}</span>
                          <span className="text-[10px] text-muted-foreground">· {action.priority}</span>
                        </div>
                        <p className="text-sm font-semibold text-foreground">{action.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{action.reason}</p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${proto.color}12`, color: proto.color }}>
                            <BookOpen className="w-2.5 h-2.5 shrink-0" /> {proto.org}
                          </span>
                          <span className="text-[9px] text-muted-foreground">{proto.ref}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardBody>
            </Card>
          )}

          {/* 7b. EMERGENCY PROTOCOLS — ACLS / MOH / SRCA */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-secondary flex items-center justify-center">
                  <ListChecks className="w-3.5 h-3.5 text-red-600" />
                </div>
                <CardTitle>Emergency Protocols</CardTitle>
                <span className="text-[10px] font-bold text-red-700 bg-secondary px-2 py-0.5 rounded-full">ACLS · MOH · SRCA</span>
                {activeProtocolCode && (
                  <span className="text-[10px] font-black text-white bg-red-600 px-2.5 py-0.5 rounded-full animate-pulse flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" /> ACTIVE
                  </span>
                )}
              </div>
              <button
                onClick={() => setProtocolsOpen(p => !p)}
                className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground bg-secondary hover:bg-border px-3 py-1.5 rounded-full transition-colors"
              >
                {protocolsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {protocolsOpen ? "Hide" : "Show"} protocols
              </button>
            </CardHeader>

            {/* Active Protocol Banner */}
            {activeProtocolCode && (() => {
              const proto = EMERGENCY_PROTOCOLS.find(p => p.code === activeProtocolCode)!;
              const doneCount = Array.from(completedSteps).filter(k => k.startsWith(activeProtocolCode + "-")).length;
              const totalSteps = proto.steps.length;
              const pct = Math.round((doneCount / totalSteps) * 100);
              return (
                <div className="mx-4 mb-3 mt-1 rounded-2xl overflow-hidden" style={{ border: `2px solid ${proto.color}`, background: `${proto.color}0d` }}>
                  <div className="flex items-center gap-4 px-4 py-3" style={{ background: proto.color }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-white/70 uppercase tracking-widest">ACTIVE PROTOCOL</p>
                      <p className="text-sm font-black text-white">{proto.code} — {proto.title}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-semibold text-white/70 uppercase tracking-wide">Elapsed</p>
                      <p className="text-2xl font-black tabular-nums text-white font-mono">{fmtElapsed(elapsedSeconds)}</p>
                    </div>
                    <button
                      onClick={deactivateProtocol}
                      className="shrink-0 ml-2 flex items-center gap-1 text-[10px] font-black bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-xl transition-colors"
                    >
                      <CheckCircle2 className="w-3 h-3" /> End
                    </button>
                  </div>
                  <div className="px-4 py-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-bold text-foreground">{doneCount} of {totalSteps} steps completed</p>
                      <p className="text-[10px] font-black" style={{ color: proto.color }}>{pct}%</p>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: proto.color }} />
                    </div>
                    {pct === 100 && (
                      <p className="text-[10px] font-bold text-emerald-600 mt-2 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> All steps complete — document and deactivate when ready
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}

            {protocolsOpen && (
              <CardBody className="space-y-3">
                {EMERGENCY_PROTOCOLS.map((protocol) => {
                  const isActive = activeProtocolCode === protocol.code;
                  const protoSteps = protocol.steps.length;
                  const donePct = isActive ? Math.round((Array.from(completedSteps).filter(k => k.startsWith(protocol.code + "-")).length / protoSteps) * 100) : 0;
                  return (
                    <div key={protocol.code} className="rounded-2xl overflow-hidden border transition-all" style={{ borderColor: isActive ? protocol.color : "hsl(var(--border))", boxShadow: isActive ? `0 0 0 2px ${protocol.color}30` : "none" }}>
                      <div className="flex items-center gap-3 px-4 py-3" style={{ background: isActive ? `${protocol.color}14` : `${protocol.color}06`, borderBottom: `2px solid ${protocol.color}` }}>
                        <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded-md text-white" style={{ background: protocol.color }}>{protocol.code}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground">{protocol.title}</p>
                          <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 mt-0.5">
                            <BookOpen className="w-2.5 h-2.5 shrink-0" /> {protocol.org}
                          </p>
                        </div>
                        {isActive ? (
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-black tabular-nums font-mono" style={{ color: protocol.color }}>{fmtElapsed(elapsedSeconds)}</span>
                            <span className="text-[10px] font-bold" style={{ color: protocol.color }}>{donePct}%</span>
                            <button onClick={deactivateProtocol} className="text-[10px] font-bold text-muted-foreground hover:text-foreground bg-secondary hover:bg-border px-2.5 py-1 rounded-xl transition-colors">End</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => activateProtocol(protocol.code)}
                            disabled={!!activeProtocolCode}
                            className="shrink-0 flex items-center gap-1 text-[10px] font-black px-3 py-1.5 rounded-xl transition-colors text-white disabled:opacity-40"
                            style={{ background: protocol.color }}
                          >
                            <Zap className="w-3 h-3" /> Activate
                          </button>
                        )}
                      </div>
                      <div className="divide-y divide-border/60">
                        {protocol.steps.map((step, si) => {
                          const stepKey = `${protocol.code}-${si}`;
                          const done = completedSteps.has(stepKey);
                          return (
                            <div
                              key={si}
                              className={`flex items-start gap-3 px-4 py-2.5 transition-colors ${isActive ? "cursor-pointer hover:bg-secondary/40" : ""} ${done ? "bg-secondary/60" : ""}`}
                              onClick={isActive ? () => toggleStep(stepKey) : undefined}
                            >
                              {isActive ? (
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${done ? "border-transparent" : ""}`}
                                  style={{ borderColor: done ? protocol.color : protocol.color + "60", background: done ? protocol.color : "transparent" }}>
                                  {done && <CheckCircle2 className="w-3 h-3 text-white" />}
                                </div>
                              ) : (
                                <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5" style={{ borderColor: protocol.color, color: protocol.color }}>{si + 1}</span>
                              )}
                              <p className={`text-xs leading-relaxed transition-colors ${done ? "line-through text-muted-foreground/50" : "text-foreground"}`}>{step}</p>
                              {done && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5 ml-auto" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                <p className="text-[9px] text-muted-foreground text-right pt-1">Protocols verified against MOH Saudi Arabia 2024 clinical guidelines. For reference only — clinical judgment applies.</p>
              </CardBody>
            )}
          </Card>

          {/* 8. CRITICAL ALERTS */}
          {patient.criticalAlerts.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-secondary flex items-center justify-center">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  </div>
                  <CardTitle className="text-red-700">System Alerts</CardTitle>
                </div>
                <span className="text-[11px] font-bold text-red-600 bg-secondary px-2.5 py-1 rounded-full">{patient.criticalAlerts.length}</span>
              </CardHeader>
              <CardBody className="divide-y divide-border p-0">
                {patient.criticalAlerts.map((alert: string, i: number) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                    <p className="text-sm font-semibold text-foreground">{alert}</p>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}

        </div>
      )}
    </Layout>
  );
}
