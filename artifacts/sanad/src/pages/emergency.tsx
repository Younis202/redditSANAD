import React, { useState, useEffect } from "react";
import {
  Search, AlertTriangle, FileWarning,
  PhoneCall, Activity, Clock, Zap,
  ShieldAlert, Ban, Eye, UserCheck, Wrench,
  PauseCircle, Brain, Timer, Bell,
  ChevronDown, ChevronUp, CheckCircle2, Radio,
  Fingerprint, Heart, Droplet, User, BookOpen,
  ChevronRight, RefreshCw, ListChecks, Wifi, WifiOff, Database,
  Siren, AlertOctagon, Target, Building, Users, Star, TrendingUp, Globe
} from "lucide-react";
import { Layout } from "@/components/layout";
import { Card, CardHeader, CardTitle, CardBody, StatusDot, KpiCard, Badge } from "@/components/shared";
import { useEmergencyLookup } from "@workspace/api-client-react";
import { useSseAlerts } from "@/hooks/use-sse-alerts";

/* ── Design tokens ─────────────────────────────────── */
const T = {
  surface:     "#f9f9fe",
  surfaceLow:  "#f3f3f8",
  surfaceCard: "#ffffff",
  primary:     "#00418f",
  primaryCont: "#0058bc",
  secondary:   "#b6171e",
  onSurface:   "#1a1c1f",
  onSurfaceV:  "#424753",
  outline:     "rgba(194,198,213,0.18)",
  glow: (hex: string, a = 0.12) => `${hex}${Math.round(a * 255).toString(16).padStart(2, "0")}`,
};

/* ── Milky glass helpers ───────────────────────────── */
const glass = (opacity = 0.82, blur = 20) =>
  `rgba(255,255,255,${opacity})`;
const glassStyle = (opacity = 0.82, blur = 20): React.CSSProperties => ({
  background: `rgba(255,255,255,${opacity})`,
  backdropFilter: `blur(${blur}px)`,
  WebkitBackdropFilter: `blur(${blur}px)`,
});
const ambientShadow: React.CSSProperties = {
  boxShadow: "0 10px 40px rgba(26,28,31,0.04)",
};
const cardStyle: React.CSSProperties = {
  ...glassStyle(0.90),
  ...ambientShadow,
  borderRadius: 28,
  border: `1.5px solid rgba(194,198,213,0.18)`,
};
const primaryGradient = "linear-gradient(135deg, #0058bc 0%, #0070eb 100%)";
const emergencyGradient = "linear-gradient(135deg, #b6171e 0%, #dc2626 100%)";

/* ── Types ─────────────────────────────────────────── */
type ClinicalAction = {
  action: "DO_NOT_GIVE" | "MONITOR" | "URGENT_REVIEW" | "ALERT_FAMILY" | "PREPARE_EQUIPMENT" | "HOLD_MEDICATION";
  priority: "immediate" | "urgent" | "standard";
  description: string;
  reason: string;
};

const ACTION_CFG: Record<ClinicalAction["action"], { icon: React.ElementType; label: string; accent: string; bg: string }> = {
  DO_NOT_GIVE:       { icon: Ban,         label: "Do Not Give",    accent: "#b6171e", bg: "rgba(182,23,30,0.08)"   },
  HOLD_MEDICATION:   { icon: PauseCircle, label: "Hold Med",       accent: "#c2410c", bg: "rgba(194,65,12,0.08)"   },
  URGENT_REVIEW:     { icon: Brain,       label: "Urgent Review",  accent: "#6d28d9", bg: "rgba(109,40,217,0.08)"  },
  ALERT_FAMILY:      { icon: PhoneCall,   label: "Alert Family",   accent: "#0058bc", bg: "rgba(0,88,188,0.08)"    },
  MONITOR:           { icon: Eye,         label: "Monitor",        accent: "#b45309", bg: "rgba(180,83,9,0.08)"    },
  PREPARE_EQUIPMENT: { icon: Wrench,      label: "Prepare Equip",  accent: "#0369a1", bg: "rgba(3,105,161,0.08)"   },
};

const ACTION_PROTOCOL: Record<ClinicalAction["action"], { ref: string; org: string; color: string }> = {
  DO_NOT_GIVE:       { ref: "ACLS Allergy/Adverse Drug Reaction Protocol 2020", org: "AHA/ACLS",   color: "#b6171e" },
  HOLD_MEDICATION:   { ref: "MOH Medication Safety Protocol 2024 · §3.2",       org: "MOH",        color: "#c2410c" },
  URGENT_REVIEW:     { ref: "SRCA Emergency Triage Protocol · ESI Level 1–2",   org: "SRCA/MOH",   color: "#6d28d9" },
  ALERT_FAMILY:      { ref: "MOH Consent & Next-of-Kin Notification Protocol",  org: "MOH",        color: "#0058bc" },
  MONITOR:           { ref: "ACLS Monitoring & Surveillance Protocol 2020",      org: "AHA/ACLS",   color: "#b45309" },
  PREPARE_EQUIPMENT: { ref: "ACLS Equipment Readiness Checklist 2020 · §5.1",   org: "AHA/ACLS",   color: "#0369a1" },
};

const EMERGENCY_PROTOCOLS = [
  {
    code: "ACLS-CA",
    title: "Cardiac Arrest — Shockable Rhythm (VF/pVT)",
    org: "AHA ACLS 2020",
    color: "#b6171e",
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
    color: "#c2410c",
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
    color: "#6d28d9",
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
    color: "#0369a1",
    steps: [
      "Door-to-CT within 25 minutes. Non-contrast CT head to exclude hemorrhage",
      "IV tPA (Alteplase 0.9 mg/kg, max 90 mg) if within 4.5 h of last known well — door-to-needle < 60 min",
      "Blood glucose target: 140–180 mg/dL during acute phase",
      "Mechanical thrombectomy if large vessel occlusion — last known well ≤ 24 h",
      "Aspirin 325 mg if tPA not given. DVT prophylaxis after 24 h",
    ],
  },
];

const RISK_CFG: Record<string, { label: string; textColor: string; bgGradient: string; pillBg: string; sla: string }> = {
  critical: { label: "CRITICAL",  textColor: "#b6171e", bgGradient: "linear-gradient(135deg,rgba(182,23,30,0.12),rgba(220,38,38,0.07))", pillBg: "rgba(182,23,30,0.10)", sla: "≤ 3 min"  },
  high:     { label: "HIGH",      textColor: "#c2410c", bgGradient: "linear-gradient(135deg,rgba(194,65,12,0.10),rgba(234,88,12,0.06))", pillBg: "rgba(194,65,12,0.10)", sla: "≤ 30 min" },
  moderate: { label: "MODERATE",  textColor: "#b45309", bgGradient: "linear-gradient(135deg,rgba(180,83,9,0.09),rgba(202,138,4,0.05))",  pillBg: "rgba(180,83,9,0.10)",  sla: "≤ 2 hrs"  },
  low:      { label: "LOW",       textColor: "#047857", bgGradient: "linear-gradient(135deg,rgba(4,120,87,0.09),rgba(5,150,105,0.05))",   pillBg: "rgba(4,120,87,0.10)",  sla: "≤ 4 hrs"  },
};

/* ── Sub-components ────────────────────────────────── */
function SLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: T.onSurfaceV, marginBottom: 6 }}>
      {children}
    </p>
  );
}

function GlassChip({ children, color = T.onSurfaceV, bg = "rgba(26,28,31,0.06)" }: { children: React.ReactNode; color?: string; bg?: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 700, color, background: bg, borderRadius: 999, padding: "3px 10px", letterSpacing: "0.04em" }}>
      {children}
    </span>
  );
}

/* ── Main Component ────────────────────────────────── */
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

  return (
    <Layout role="emergency">

      {/* ════════════════════════════════════════
          VITALITY BLUR — atmospheric background blobs
      ════════════════════════════════════════ */}
      <div aria-hidden style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -60, width: 480, height: 480, borderRadius: "50%", background: `rgba(0,88,188,0.07)`, filter: "blur(100px)" }} />
        <div style={{ position: "absolute", bottom: -100, left: -80, width: 400, height: 400, borderRadius: "50%", background: `rgba(182,23,30,0.06)`, filter: "blur(100px)" }} />
        <div style={{ position: "absolute", top: "40%", left: "35%", width: 300, height: 300, borderRadius: "50%", background: `rgba(0,65,143,0.04)`, filter: "blur(80px)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>

      {/* ════════════════════════════════════════
          OFFLINE BANNER
      ════════════════════════════════════════ */}
      {!isOnline && !offlineDismissed && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 60,
          display: "flex", alignItems: "center", gap: 12, padding: "10px 20px",
          background: "rgba(255,255,255,0.88)", backdropFilter: "blur(20px)",
          borderBottom: `1.5px solid rgba(182,23,30,0.18)`,
          boxShadow: "0 4px 20px rgba(182,23,30,0.08)",
        }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(182,23,30,0.10)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <WifiOff style={{ width: 14, height: 14, color: "#b6171e" }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 800, color: "#b6171e", margin: 0 }}>Offline Mode — Emergency Data Cached</p>
            <p style={{ fontSize: 10, color: T.onSurfaceV, margin: 0 }}>Last sync: {now.toLocaleTimeString("en-SA")} · Patient records loaded from local cache</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <GlassChip color={T.onSurfaceV}><Database style={{ width: 10, height: 10 }} /> Cache: OK</GlassChip>
            <button onClick={() => setOfflineDismissed(true)} style={{ background: "none", border: "none", color: T.onSurfaceV, fontSize: 18, cursor: "pointer", lineHeight: 1, padding: "0 4px" }}>×</button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          COMMAND HEADER — iOS milky glass
      ════════════════════════════════════════ */}
      <div style={{ ...cardStyle, marginBottom: 20, overflow: "hidden", background: "rgba(255,255,255,0.88)" }}>

        {/* Top accent stripe */}
        <div style={{ height: 3, background: "linear-gradient(90deg, #00418f 0%, #0058bc 40%, #b6171e 100%)", opacity: 0.85 }} />

        <div style={{ padding: "22px 28px 24px" }}>

          {/* Brand row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 16, flexShrink: 0,
                background: "linear-gradient(135deg, rgba(182,23,30,0.12), rgba(182,23,30,0.06))",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <ShieldAlert style={{ width: 22, height: 22, color: "#b6171e" }} />
              </div>
              <div>
                <h1 style={{ fontSize: 17, fontWeight: 800, color: T.onSurface, margin: 0, lineHeight: 1.2, letterSpacing: "-0.02em" }}>
                  National Emergency Response System
                </h1>
                <p style={{ fontSize: 10, color: T.onSurfaceV, margin: "3px 0 0", letterSpacing: "0.05em" }}>
                  SANAD · SRCA · MOH · AI-Powered Clinical Intelligence
                </p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {/* Live clock */}
              <div style={{
                padding: "6px 14px", borderRadius: 999, fontFamily: "monospace",
                fontSize: 13, fontWeight: 700, color: T.onSurface,
                background: T.surfaceLow, letterSpacing: "0.06em",
              }}>
                {now.toLocaleTimeString("en-SA", { hour12: false })}
              </div>
              {/* Online badge */}
              <div style={{
                display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999,
                background: isOnline ? "rgba(4,120,87,0.08)" : "rgba(182,23,30,0.08)",
              }}>
                {isOnline
                  ? <Wifi style={{ width: 12, height: 12, color: "#047857" }} />
                  : <WifiOff style={{ width: 12, height: 12, color: "#b6171e" }} />}
                <span style={{ fontSize: 11, fontWeight: 700, color: isOnline ? "#047857" : "#b6171e" }}>
                  {isOnline ? "Online" : "Offline"}
                </span>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: isOnline ? "#059669" : "#b6171e", flexShrink: 0 }} />
              </div>
            </div>
          </div>

          {/* Status chips */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 999,
              background: "rgba(182,23,30,0.09)", fontSize: 10, fontWeight: 800, color: "#b6171e",
              letterSpacing: "0.08em", textTransform: "uppercase",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#b6171e", animation: "pulse 1.5s infinite" }} />
              Emergency Mode Active
            </div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 999,
              background: sseConnected ? "rgba(4,120,87,0.08)" : T.surfaceLow,
              fontSize: 10, fontWeight: 700, color: sseConnected ? "#047857" : T.onSurfaceV,
            }}>
              <Radio style={{ width: 11, height: 11 }} />
              {sseConnected ? "9 AI Engines · Live" : "Connecting..."}
            </div>
            {sseUnread > 0 && (
              <button onClick={() => setAlertsOpen(p => !p)} style={{
                display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 999,
                background: "rgba(182,23,30,0.09)", fontSize: 10, fontWeight: 800, color: "#b6171e",
                border: "none", cursor: "pointer",
              }}>
                <Bell style={{ width: 11, height: 11 }} />
                {sseUnread} unread alert{sseUnread > 1 ? "s" : ""}
              </button>
            )}
            {patient && (
              <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: T.onSurfaceV, fontFamily: "monospace" }}>
                <RefreshCw style={{ width: 10, height: 10 }} />
                Retrieved {now.toLocaleTimeString("en-SA", { hour: "2-digit", minute: "2-digit" })} · Confidence 97%
              </span>
            )}
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearch}>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1, position: "relative" }}>
                <Fingerprint style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", width: 20, height: 20, color: "rgba(182,23,30,0.55)", pointerEvents: "none" }} />
                <input
                  autoFocus
                  value={nationalId}
                  onChange={e => setNationalId(e.target.value)}
                  placeholder="Enter National ID — instant AI patient record retrieval..."
                  style={{
                    width: "100%", height: 52, paddingLeft: 48, paddingRight: 16,
                    borderRadius: 18, border: "none", outline: "none",
                    background: T.surfaceLow, fontSize: 13, fontFamily: "monospace",
                    color: T.onSurface, boxSizing: "border-box",
                    boxShadow: nationalId ? `0 0 0 2px rgba(0,88,188,0.25)` : "none",
                    transition: "box-shadow 0.2s",
                  }}
                />
              </div>
              <button type="submit" style={{
                height: 52, padding: "0 28px", borderRadius: 18, border: "none",
                background: primaryGradient, color: "#fff", fontWeight: 800,
                fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                flexShrink: 0, letterSpacing: "-0.01em",
              }}>
                <Search style={{ width: 15, height: 15 }} />
                Lookup
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: T.onSurfaceV, textTransform: "uppercase", letterSpacing: "0.1em" }}>Quick Demo:</span>
              {["1000000001", "1000000003", "1000000005"].map(id => (
                <button key={id} type="button"
                  onClick={() => { setNationalId(id); setSubmittedId(id); }}
                  style={{
                    fontFamily: "monospace", fontSize: 11, fontWeight: 700,
                    padding: "4px 12px", borderRadius: 999, background: T.surfaceLow,
                    color: T.onSurfaceV, border: "none", cursor: "pointer",
                    transition: "background 0.15s",
                  }}>
                  {id}
                </button>
              ))}
            </div>
          </form>
        </div>
      </div>

      {/* ════════════════════════════════════════
          FLOATING LIVE ALERTS
      ════════════════════════════════════════ */}
      {sseAlerts.length > 0 && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 50, width: 360,
          borderRadius: 24, overflow: "hidden",
          ...glassStyle(0.92),
          boxShadow: "0 20px 60px rgba(26,28,31,0.14), 0 0 0 1.5px rgba(194,198,213,0.22)",
        }}>
          <button onClick={() => setAlertsOpen(p => !p)} style={{
            width: "100%", display: "flex", alignItems: "center", gap: 10,
            padding: "12px 16px", background: "rgba(182,23,30,0.08)",
            borderBottom: "1.5px solid rgba(182,23,30,0.12)", border: "none", cursor: "pointer", textAlign: "left",
          }}>
            <span style={{ position: "relative", display: "flex", width: 8, height: 8, flexShrink: 0 }}>
              <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#b6171e", opacity: 0.5, animation: "ping 1.5s infinite" }} />
              <span style={{ position: "relative", width: 8, height: 8, borderRadius: "50%", background: "#b6171e" }} />
            </span>
            <span style={{ fontWeight: 800, fontSize: 13, color: T.onSurface, flex: 1 }}>Live Alerts</span>
            {sseUnread > 0 && (
              <span style={{ background: "#b6171e", color: "#fff", fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999 }}>{sseUnread}</span>
            )}
            <button onClick={e => { e.stopPropagation(); clearSseAlerts(); }}
              style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 8, background: T.surfaceLow, color: T.onSurfaceV, border: "none", cursor: "pointer" }}>
              Clear
            </button>
            {alertsOpen ? <ChevronDown style={{ width: 14, height: 14, color: T.onSurfaceV }} /> : <ChevronUp style={{ width: 14, height: 14, color: T.onSurfaceV }} />}
          </button>
          {alertsOpen && (
            <div style={{ maxHeight: 280, overflowY: "auto" }}>
              {sseAlerts.map((alert, idx) => (
                <div key={alert.id} style={{
                  display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px",
                  borderBottom: idx < sseAlerts.length - 1 ? `1.5px solid rgba(194,198,213,0.12)` : "none",
                  opacity: alert.read ? 0.35 : 1,
                }}>
                  <span style={{
                    marginTop: 6, width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                    background: alert.severity === "critical" ? "#b6171e" : alert.severity === "high" ? "#f59e0b" : "#0369a1",
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: T.onSurface, margin: 0, lineHeight: 1.3 }}>{alert.title}</p>
                    <p style={{ fontSize: 11, color: T.onSurfaceV, margin: "2px 0 0" }}>{alert.patientName}{alert.result ? ` · ${alert.result}` : ""}</p>
                  </div>
                  {!alert.read && (
                    <button
                      onClick={() => { if (alert.nationalId) { setNationalId(alert.nationalId); setSubmittedId(alert.nationalId); } markSseRead(alert.id); }}
                      style={{ fontSize: 10, fontWeight: 800, color: "#fff", padding: "4px 10px", borderRadius: 10, background: "#b6171e", border: "none", cursor: "pointer", flexShrink: 0 }}>
                      Load
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════
          LOADING STATE
      ════════════════════════════════════════ */}
      {isLoading && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: 20, background: "rgba(182,23,30,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", border: "2.5px solid rgba(182,23,30,0.15)", borderTopColor: "#b6171e", animation: "spin 0.8s linear infinite" }} />
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontWeight: 800, color: T.onSurface, margin: "0 0 4px", fontSize: 15 }}>Retrieving patient record...</p>
            <p style={{ fontSize: 13, color: T.onSurfaceV, margin: 0 }}>Querying 9 AI engines across 450+ hospitals</p>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          ERROR STATE
      ════════════════════════════════════════ */}
      {isError && !isLoading && (
        <div style={{
          display: "flex", alignItems: "center", gap: 16, padding: 20, borderRadius: 20,
          background: "rgba(182,23,30,0.06)", border: "1.5px solid rgba(182,23,30,0.14)",
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(182,23,30,0.10)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <AlertTriangle style={{ width: 20, height: 20, color: "#b6171e" }} />
          </div>
          <div>
            <p style={{ fontWeight: 800, color: "#b6171e", margin: "0 0 3px", fontSize: 14 }}>Patient Not Found</p>
            <p style={{ fontSize: 12, color: T.onSurfaceV, margin: 0 }}>No record for <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{submittedId}</span>. Verify the ID and retry.</p>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          EMPTY STATE — System Ready
      ════════════════════════════════════════ */}
      {!submittedId && !isLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* KPI Strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
            {[
              { title: "AI Decision Speed",    value: "< 1s",   sub: "Average patient lookup time",  icon: Timer,    color: "#047857", bg: "rgba(4,120,87,0.08)" },
              { title: "Clinical Confidence",  value: "97%",    sub: "Cross-validated AI accuracy",  icon: Brain,    color: "#6d28d9", bg: "rgba(109,40,217,0.08)" },
              { title: "AI Engines Active",    value: "9 Live", sub: "Real-time inference ready",    icon: Activity, color: "#0058bc", bg: "rgba(0,88,188,0.08)" },
              { title: "Connected Facilities", value: "450+",   sub: "Hospitals in SANAD network",   icon: Building, color: "#b45309", bg: "rgba(180,83,9,0.08)" },
            ].map((k) => {
              const Icon = k.icon;
              return (
                <div key={k.title} style={{ ...cardStyle, padding: 22 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 13, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                    <Icon style={{ width: 18, height: 18, color: k.color }} />
                  </div>
                  <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", color: T.onSurfaceV, margin: "0 0 6px" }}>{k.title}</p>
                  <p style={{ fontSize: 36, fontWeight: 900, color: T.onSurface, margin: "0 0 4px", lineHeight: 1, letterSpacing: "-0.03em" }}>{k.value}</p>
                  <p style={{ fontSize: 11, color: T.onSurfaceV, margin: 0 }}>{k.sub}</p>
                </div>
              );
            })}
          </div>

          {/* Emergency Protocols — On Standby */}
          <div style={{ ...cardStyle, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: `1.5px solid rgba(194,198,213,0.14)` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ListChecks style={{ width: 16, height: 16, color: "#b6171e" }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: T.onSurface }}>Emergency Protocols — On Standby</span>
              </div>
              <GlassChip color="#b6171e" bg="rgba(182,23,30,0.08)">SRCA · MOH · AHA/ACLS</GlassChip>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 0 }}>
              {EMERGENCY_PROTOCOLS.map((p, i) => (
                <div key={p.code} style={{
                  display: "flex", alignItems: "center", gap: 16, padding: "18px 24px",
                  borderBottom: i < 2 ? `1.5px solid rgba(194,198,213,0.10)` : "none",
                  borderRight: i % 2 === 0 ? `1.5px solid rgba(194,198,213,0.10)` : "none",
                  background: "transparent", transition: "background 0.15s",
                }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: `${p.color}12`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 9, fontWeight: 900, fontFamily: "monospace", color: p.color }}>{p.code.split("-")[0]}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: T.onSurface, margin: "0 0 3px", lineHeight: 1.3 }}>{p.title}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 10, fontFamily: "monospace", fontWeight: 700, color: p.color }}>{p.code}</span>
                      <span style={{ width: 3, height: 3, borderRadius: "50%", background: T.onSurfaceV, opacity: 0.3 }} />
                      <span style={{ fontSize: 10, color: T.onSurfaceV }}>{p.org}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#059669" }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#047857" }}>Ready</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* National Stats Row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>

            {/* Active Emergencies */}
            <div style={{ ...cardStyle, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1.5px solid rgba(194,198,213,0.12)` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <Siren style={{ width: 15, height: 15, color: "#b6171e" }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: T.onSurface }}>Active Emergencies</span>
                </div>
                <GlassChip color="#b6171e" bg="rgba(182,23,30,0.08)"><span style={{ width: 5, height: 5, borderRadius: "50%", background: "#b6171e", display: "inline-block" }} /> LIVE</GlassChip>
              </div>
              <div style={{ padding: "8px 0" }}>
                {[
                  { label: "Cardiac Events", count: 3,  region: "Riyadh, Makkah",    color: "#b6171e" },
                  { label: "Trauma / RTA",   count: 7,  region: "Eastern Province",  color: "#c2410c" },
                  { label: "Stroke Code",    count: 2,  region: "Madinah",           color: "#b6171e" },
                  { label: "Sepsis Alert",   count: 4,  region: "Jizan, Asir",       color: "#0369a1" },
                ].map((e, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px" }}>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: T.onSurface, margin: 0 }}>{e.label}</p>
                      <p style={{ fontSize: 10, color: T.onSurfaceV, margin: 0 }}>{e.region}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 20, fontWeight: 900, color: e.color, lineHeight: 1 }}>{e.count}</span>
                      <GlassChip color={e.color} bg={`${e.color}10`}>Active</GlassChip>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* System Performance */}
            <div style={{ ...cardStyle, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "16px 20px", borderBottom: `1.5px solid rgba(194,198,213,0.12)` }}>
                <Activity style={{ width: 15, height: 15, color: "#0058bc" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: T.onSurface }}>System Performance</span>
              </div>
              <div style={{ padding: "8px 0" }}>
                {[
                  { label: "Patient Lookups Today",  value: "48,204",    color: "#0058bc" },
                  { label: "AI Decisions Generated", value: "192K",      color: "#0058bc" },
                  { label: "Avg Response Time",       value: "0.8s",      color: "#047857" },
                  { label: "Critical Alerts Sent",   value: "143",       color: "#b6171e" },
                  { label: "Offline Cache Hits",      value: "2,841",     color: T.onSurface },
                  { label: "SSE Connections",         value: "4,204 live",color: T.onSurface },
                ].map((m, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 20px" }}>
                    <p style={{ fontSize: 11, color: T.onSurfaceV, margin: 0 }}>{m.label}</p>
                    <p style={{ fontSize: 12, fontWeight: 800, color: m.color, margin: 0 }}>{m.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Regional Coverage */}
            <div style={{ ...cardStyle, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "16px 20px", borderBottom: `1.5px solid rgba(194,198,213,0.12)` }}>
                <Globe style={{ width: 15, height: 15, color: "#0058bc" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: T.onSurface }}>Regional Coverage</span>
              </div>
              <div style={{ padding: "12px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { region: "Riyadh",           hospitals: 84, coverage: 96, color: "#059669" },
                  { region: "Makkah",           hospitals: 71, coverage: 89, color: "#059669" },
                  { region: "Eastern Province", hospitals: 62, coverage: 92, color: "#059669" },
                  { region: "Madinah",          hospitals: 48, coverage: 81, color: "#d97706" },
                  { region: "Asir",             hospitals: 39, coverage: 74, color: "#b6171e" },
                ].map((r, i) => (
                  <div key={i}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: T.onSurface }}>{r.region}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 10, color: T.onSurfaceV }}>{r.hospitals} hosp.</span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: r.color }}>{r.coverage}%</span>
                      </div>
                    </div>
                    <div style={{ height: 5, background: T.surfaceLow, borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${r.coverage}%`, background: r.color, borderRadius: 999, transition: "width 0.8s ease" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          PATIENT RECORD — Command Center
      ════════════════════════════════════════ */}
      {patient && !isLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* ── LIFE-CRITICAL TRIAGE BANNER ── */}
          <div style={{
            borderRadius: 28, overflow: "hidden",
            background: riskCfg.bgGradient,
            border: `1.5px solid rgba(194,198,213,0.18)`,
            boxShadow: "0 10px 40px rgba(26,28,31,0.06)",
          }}>
            <div style={{ display: "flex", alignItems: "stretch" }}>

              {/* Blood Type */}
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                padding: "24px 32px", borderRight: `1.5px solid rgba(194,198,213,0.16)`, flexShrink: 0,
              }}>
                <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", color: T.onSurfaceV, margin: "0 0 6px" }}>Blood Type</p>
                <p style={{ fontSize: 56, fontWeight: 900, color: "#b6171e", lineHeight: 1, margin: 0, letterSpacing: "-0.04em" }}>{patient.bloodType}</p>
              </div>

              {/* Known Allergies */}
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "24px 24px", borderRight: `1.5px solid rgba(194,198,213,0.16)`, flexShrink: 0, minWidth: 180 }}>
                <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", color: T.onSurfaceV, margin: "0 0 10px" }}>Known Allergies</p>
                {allergies.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {allergies.map((a, i) => (
                      <span key={i} style={{
                        fontSize: 11, fontWeight: 800, color: "#fff", padding: "4px 12px", borderRadius: 999,
                        background: "#b6171e",
                      }}>{a}</span>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#047857" }}>None on record</span>
                )}
              </div>

              {/* Priority Action */}
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "24px 24px", flex: 1, minWidth: 0, borderRight: `1.5px solid rgba(194,198,213,0.16)` }}>
                <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", color: T.onSurfaceV, margin: "0 0 8px" }}>Priority Action</p>
                <p style={{ fontSize: 14, fontWeight: 800, color: T.onSurface, margin: "0 0 5px", lineHeight: 1.4 }}>
                  {immediate.length > 0 ? immediate[0].description : actions?.[0]?.description ?? "Standard monitoring protocol active"}
                </p>
                {immediate.length > 0 && (
                  <p style={{ fontSize: 11, color: "#b6171e", margin: 0, fontWeight: 600 }}>{immediate[0].reason}</p>
                )}
              </div>

              {/* Risk Level + SLA */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 28px", flexShrink: 0, textAlign: "center" }}>
                <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", color: T.onSurfaceV, margin: "0 0 6px" }}>Risk Level</p>
                <p style={{ fontSize: 26, fontWeight: 900, color: riskCfg.textColor, margin: "0 0 8px", letterSpacing: "0.04em" }}>{riskCfg.label}</p>
                <div style={{ padding: "4px 14px", borderRadius: 999, background: riskCfg.pillBg }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: riskCfg.textColor, margin: 0, fontFamily: "monospace" }}>{riskCfg.sla}</p>
                </div>
                {(patient as any).riskScore !== undefined && (
                  <p style={{ fontSize: 10, color: T.onSurfaceV, margin: "6px 0 0" }}>AI Score: <span style={{ fontWeight: 800, color: T.onSurface }}>{(patient as any).riskScore}/100</span></p>
                )}
              </div>
            </div>
          </div>

          {/* ── ALLERGY ALERT BANNER ── */}
          {allergies.length > 0 && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: 16, padding: "18px 22px", borderRadius: 22,
              background: "linear-gradient(135deg, rgba(182,23,30,0.11), rgba(182,23,30,0.06))",
              border: "1.5px solid rgba(182,23,30,0.18)",
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 13, background: "rgba(182,23,30,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <AlertTriangle style={{ width: 18, height: 18, color: "#b6171e" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#b6171e", margin: "0 0 4px" }}>Critical Medical Alert</p>
                <p style={{ fontSize: 16, fontWeight: 900, color: "#b6171e", margin: "0 0 5px" }}>
                  {allergies.length === 1 ? `${allergies[0]} Allergy` : `${allergies.length} Known Allergies`}
                </p>
                <p style={{ fontSize: 12, color: T.onSurfaceV, margin: 0, lineHeight: 1.5 }}>
                  {allergies.length === 1
                    ? `Do NOT administer ${allergies[0]} or related compounds. Use alternative medications only.`
                    : `Do NOT administer: ${allergies.join(", ")}. Verify full allergy history before any medication.`}
                </p>
              </div>
            </div>
          )}

          {allergies.length === 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 20px", borderRadius: 16, background: "rgba(4,120,87,0.07)", border: "1.5px solid rgba(4,120,87,0.14)" }}>
              <CheckCircle2 style={{ width: 18, height: 18, color: "#047857", flexShrink: 0 }} />
              <p style={{ fontSize: 13, fontWeight: 700, color: "#047857", margin: 0 }}>No Known Allergies — Safe to administer standard medications</p>
            </div>
          )}

          {/* ── 2-COLUMN COMMAND CENTER ── */}
          <div style={{ display: "grid", gridTemplateColumns: "5fr 7fr", gap: 14 }}>

            {/* LEFT: Patient Identity + Contact + Medications + Conditions + Alerts */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Patient Identity */}
              <div style={{ ...cardStyle }}>
                <div style={{ padding: "20px 22px 14px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: 17, flexShrink: 0, fontWeight: 900, fontSize: 18, color: "#fff",
                      background: primaryGradient, display: "flex", alignItems: "center", justifyContent: "center", letterSpacing: "-0.02em",
                    }}>
                      {(patient.fullName as string).split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h2 style={{ fontSize: 18, fontWeight: 900, color: T.onSurface, margin: "0 0 2px", letterSpacing: "-0.02em" }}>{patient.fullName}</h2>
                      <p style={{ fontSize: 10, fontFamily: "monospace", color: T.onSurfaceV, margin: "0 0 8px" }}>NID · {patient.nationalId}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <GlassChip color={riskCfg.textColor} bg={riskCfg.pillBg}>{riskCfg.label}</GlassChip>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#059669" }} />
                        <span style={{ fontSize: 10, color: "#047857", fontWeight: 700 }}>Live record</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                    {[
                      { label: "Blood", value: patient.bloodType, bg: "rgba(182,23,30,0.09)", color: "#b6171e" },
                      { label: "Age",   value: patient.age ?? "—",  bg: T.surfaceLow,           color: T.onSurface },
                      { label: "Sex",   value: patient.gender,       bg: T.surfaceLow,           color: T.onSurface },
                    ].map(s => (
                      <div key={s.label} style={{ borderRadius: 14, padding: "12px 10px", textAlign: "center", background: s.bg }}>
                        <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: T.onSurfaceV, margin: "0 0 4px" }}>{s.label}</p>
                        <p style={{ fontSize: 20, fontWeight: 900, color: s.color, margin: 0, lineHeight: 1 }}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div style={{ ...cardStyle, padding: "18px 22px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
                  <PhoneCall style={{ width: 14, height: 14, color: "#0058bc" }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: T.onSurface }}>Emergency Contact</span>
                </div>
                {patient.emergencyContact ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: T.onSurface, margin: "0 0 2px" }}>{patient.emergencyContact}</p>
                      <p style={{ fontSize: 16, fontWeight: 900, color: "#0058bc", fontFamily: "monospace", margin: 0, letterSpacing: "-0.01em" }}>{patient.emergencyPhone}</p>
                    </div>
                    <button style={{
                      display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 14,
                      background: primaryGradient, color: "#fff", border: "none", cursor: "pointer",
                      fontSize: 12, fontWeight: 800, flexShrink: 0,
                    }}>
                      <PhoneCall style={{ width: 13, height: 13 }} /> Call Now
                    </button>
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: T.onSurfaceV }}>Not on record</p>
                )}
              </div>

              {/* Active Medications */}
              <div style={{ ...cardStyle, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px", borderBottom: `1.5px solid rgba(194,198,213,0.12)` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <Droplet style={{ width: 14, height: 14, color: "#b45309" }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.onSurface }}>Active Medications</span>
                  </div>
                  <GlassChip>{patient.currentMedications.length}</GlassChip>
                </div>
                <div>
                  {patient.currentMedications.length > 0
                    ? patient.currentMedications.map((med: string, i: number) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 22px", borderBottom: i < patient.currentMedications.length - 1 ? `1.5px solid rgba(194,198,213,0.08)` : "none" }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: T.onSurfaceV, fontFamily: "monospace", width: 18, flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: T.onSurface }}>{med}</span>
                      </div>
                    ))
                    : <div style={{ padding: "16px 22px", fontSize: 13, color: T.onSurfaceV }}>No active medications on record</div>
                  }
                </div>
              </div>

              {/* Chronic Conditions */}
              <div style={{ ...cardStyle, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px", borderBottom: `1.5px solid rgba(194,198,213,0.12)` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <Heart style={{ width: 14, height: 14, color: "#b6171e" }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.onSurface }}>Chronic Conditions</span>
                  </div>
                  <GlassChip>{chronicConds.length}</GlassChip>
                </div>
                <div>
                  {chronicConds.length > 0
                    ? chronicConds.map((c: string, i: number) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 22px", borderBottom: i < chronicConds.length - 1 ? `1.5px solid rgba(194,198,213,0.08)` : "none" }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#b6171e", flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: T.onSurface }}>{c}</span>
                      </div>
                    ))
                    : <div style={{ padding: "16px 22px", fontSize: 13, color: T.onSurfaceV }}>No chronic conditions on record</div>
                  }
                </div>
              </div>

              {/* System Alerts */}
              {patient.criticalAlerts.length > 0 && (
                <div style={{ ...cardStyle, overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px", borderBottom: `1.5px solid rgba(182,23,30,0.14)`, background: "rgba(182,23,30,0.04)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <AlertTriangle style={{ width: 14, height: 14, color: "#b6171e" }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: T.onSurface }}>System Alerts</span>
                    </div>
                    <GlassChip color="#b6171e" bg="rgba(182,23,30,0.09)">{patient.criticalAlerts.length}</GlassChip>
                  </div>
                  <div>
                    {patient.criticalAlerts.map((alert: string, i: number) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 22px", borderBottom: i < patient.criticalAlerts.length - 1 ? `1.5px solid rgba(194,198,213,0.08)` : "none", borderLeft: "3px solid #b6171e" }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#b6171e", flexShrink: 0, animation: "pulse 1.5s infinite" }} />
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#b6171e", margin: 0 }}>{alert}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT: Immediate Actions + AI Intelligence + Drug Interactions + Guidance */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* IMMEDIATE ACTIONS */}
              {immediate.length > 0 && (
                <div style={{ ...cardStyle, overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px", background: "rgba(182,23,30,0.04)", borderBottom: `1.5px solid rgba(182,23,30,0.14)` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <ShieldAlert style={{ width: 15, height: 15, color: "#b6171e" }} />
                      <span style={{ fontSize: 13, fontWeight: 800, color: T.onSurface }}>Immediate Actions Required</span>
                    </div>
                    <GlassChip color="#b6171e" bg="rgba(182,23,30,0.09)"><Clock style={{ width: 10, height: 10 }} /> Act within 3 min</GlassChip>
                  </div>
                  <div>
                    {immediate.map((action, i) => {
                      const cfg = ACTION_CFG[action.action];
                      const proto = ACTION_PROTOCOL[action.action];
                      const Icon = cfg.icon;
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "16px 22px", borderBottom: i < immediate.length - 1 ? `1.5px solid rgba(194,198,213,0.10)` : "none", borderLeft: `3px solid ${cfg.accent}` }}>
                          <div style={{ width: 38, height: 38, borderRadius: 13, background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Icon style={{ width: 16, height: 16, color: cfg.accent }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                              <span style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: cfg.accent }}>{cfg.label}</span>
                              <GlassChip color={cfg.accent} bg={cfg.bg}>IMMEDIATE</GlassChip>
                            </div>
                            <p style={{ fontSize: 13, fontWeight: 800, color: T.onSurface, margin: "0 0 3px" }}>{action.description}</p>
                            <p style={{ fontSize: 11, color: T.onSurfaceV, margin: "0 0 7px" }}>{action.reason}</p>
                            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                              <GlassChip color={proto.color} bg={`${proto.color}10`}><BookOpen style={{ width: 9, height: 9 }} /> {proto.org}</GlassChip>
                              <span style={{ fontSize: 9, color: T.onSurfaceV }}>{proto.ref}</span>
                            </div>
                          </div>
                          <span style={{ fontSize: 28, fontWeight: 900, color: `${cfg.accent}30`, lineHeight: 1, flexShrink: 0, fontFamily: "monospace" }}>{String(i + 1).padStart(2, "0")}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* AI TRIAGE INTELLIGENCE */}
              {(riskFactors.length > 0 || aiRecommendations.length > 0) && (
                <div style={{ ...cardStyle, overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px", borderBottom: `1.5px solid rgba(194,198,213,0.12)` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Brain style={{ width: 15, height: 15, color: "#6d28d9" }} />
                      <span style={{ fontSize: 13, fontWeight: 800, color: T.onSurface }}>AI Triage Intelligence</span>
                    </div>
                    <GlassChip color="#6d28d9" bg="rgba(109,40,217,0.08)">{riskFactors.length} factors analysed</GlassChip>
                  </div>
                  <div style={{ padding: "16px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
                    {riskFactors.length > 0 && (
                      <div>
                        <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", color: T.onSurfaceV, margin: "0 0 12px" }}>Why this risk score?</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {riskFactors.map((f, i) => {
                            const impactColor = f.impact === "high" ? "#b6171e" : f.impact === "moderate" ? "#d97706" : "#0369a1";
                            const barW = f.impact === "high" ? "100%" : f.impact === "moderate" ? "66%" : "33%";
                            return (
                              <div key={i} style={{ background: T.surfaceLow, borderRadius: 16, padding: "12px 14px" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: T.onSurface }}>{f.factor}</span>
                                  <GlassChip color={impactColor} bg={`${impactColor}10`}>{f.impact}</GlassChip>
                                </div>
                                <div style={{ height: 4, background: "rgba(194,198,213,0.3)", borderRadius: 999, overflow: "hidden", marginBottom: 5 }}>
                                  <div style={{ height: "100%", width: barW, background: impactColor, borderRadius: 999 }} />
                                </div>
                                <p style={{ fontSize: 11, color: T.onSurfaceV, margin: 0, lineHeight: 1.4 }}>{f.description}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {aiRecommendations.length > 0 && (
                      <div>
                        <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", color: T.onSurfaceV, margin: "0 0 12px" }}>AI Recommendations</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {aiRecommendations.map((rec, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "11px 14px", background: "rgba(109,40,217,0.05)", borderRadius: 14, borderLeft: "3px solid rgba(109,40,217,0.35)" }}>
                              <Brain style={{ width: 13, height: 13, color: "#6d28d9", marginTop: 1, flexShrink: 0 }} />
                              <p style={{ fontSize: 12, color: T.onSurface, margin: 0, lineHeight: 1.5 }}>{rec}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* DRUG INTERACTIONS */}
              {drugInteractions.length > 0 && (
                <div style={{ ...cardStyle, overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px", borderBottom: `1.5px solid rgba(194,198,213,0.12)` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <AlertOctagon style={{ width: 15, height: 15, color: "#c2410c" }} />
                      <span style={{ fontSize: 13, fontWeight: 800, color: T.onSurface }}>Drug Interactions</span>
                    </div>
                    <GlassChip color="#c2410c" bg="rgba(194,65,12,0.08)">{drugInteractions.length} flagged</GlassChip>
                  </div>
                  <div>
                    {drugInteractions.map((d, i) => {
                      const sevColor = d.severity === "critical" ? "#b6171e" : d.severity === "major" ? "#c2410c" : "#d97706";
                      return (
                        <div key={i} style={{ padding: "14px 22px", borderBottom: i < drugInteractions.length - 1 ? `1.5px solid rgba(194,198,213,0.08)` : "none", borderLeft: `3px solid ${sevColor}` }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: T.onSurface }}>{d.conflictingDrug}</span>
                            <GlassChip color={sevColor} bg={`${sevColor}10`}>{d.severity}</GlassChip>
                          </div>
                          <p style={{ fontSize: 11, color: T.onSurfaceV, margin: "0 0 5px", lineHeight: 1.4 }}>{d.description}</p>
                          <p style={{ fontSize: 11, fontWeight: 700, color: sevColor, margin: 0 }}>{d.recommendation}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* GUIDANCE ACTIONS */}
              {guidance.length > 0 && (
                <div style={{ ...cardStyle, overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 22px", borderBottom: `1.5px solid rgba(194,198,213,0.12)` }}>
                    <UserCheck style={{ width: 15, height: 15, color: "#0058bc" }} />
                    <span style={{ fontSize: 13, fontWeight: 800, color: T.onSurface }}>Clinical Guidance</span>
                  </div>
                  <div>
                    {guidance.map((action, i) => {
                      const cfg = ACTION_CFG[action.action];
                      const proto = ACTION_PROTOCOL[action.action];
                      const Icon = cfg.icon;
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 22px", borderBottom: i < guidance.length - 1 ? `1.5px solid rgba(194,198,213,0.08)` : "none" }}>
                          <div style={{ width: 34, height: 34, borderRadius: 11, background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Icon style={{ width: 14, height: 14, color: cfg.accent }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                              <span style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.09em", color: cfg.accent }}>{cfg.label}</span>
                            </div>
                            <p style={{ fontSize: 12, fontWeight: 700, color: T.onSurface, margin: "0 0 2px" }}>{action.description}</p>
                            <p style={{ fontSize: 11, color: T.onSurfaceV, margin: 0 }}>{action.reason}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── CLINICAL PROTOCOLS ── */}
          <div style={{ ...cardStyle, overflow: "hidden" }}>
            <button onClick={() => setProtocolsOpen(p => !p)} style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "18px 24px", background: "none", border: "none", cursor: "pointer",
              borderBottom: protocolsOpen ? `1.5px solid rgba(194,198,213,0.12)` : "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <div style={{ width: 36, height: 36, borderRadius: 12, background: "rgba(182,23,30,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ListChecks style={{ width: 16, height: 16, color: "#b6171e" }} />
                </div>
                <div style={{ textAlign: "left" }}>
                  <p style={{ fontSize: 14, fontWeight: 800, color: T.onSurface, margin: 0 }}>Emergency Clinical Protocols</p>
                  <p style={{ fontSize: 10, color: T.onSurfaceV, margin: 0 }}>ACLS · MOH · SRCA — Evidence-based clinical decision support</p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {activeProtocolCode && (
                  <GlassChip color="#b6171e" bg="rgba(182,23,30,0.09)">
                    <Timer style={{ width: 10, height: 10 }} />
                    {fmtElapsed(elapsedSeconds)} active
                  </GlassChip>
                )}
                {protocolsOpen ? <ChevronUp style={{ width: 16, height: 16, color: T.onSurfaceV }} /> : <ChevronDown style={{ width: 16, height: 16, color: T.onSurfaceV }} />}
              </div>
            </button>

            {protocolsOpen && (
              <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
                {EMERGENCY_PROTOCOLS.map(protocol => {
                  const isActive = activeProtocolCode === protocol.code;
                  const donePct = protocol.steps.length > 0 ? Math.round(([...completedSteps].filter(k => k.startsWith(`${protocol.code}-`)).length / protocol.steps.length) * 100) : 0;
                  return (
                    <div key={protocol.code} style={{
                      borderRadius: 20, overflow: "hidden",
                      background: isActive ? `${protocol.color}07` : T.surfaceLow,
                      border: isActive ? `1.5px solid ${protocol.color}35` : "1.5px solid rgba(194,198,213,0.14)",
                      boxShadow: isActive ? `0 4px 20px ${protocol.color}12` : "none",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: `1.5px solid ${protocol.color}25`, background: `${protocol.color}08` }}>
                        <span style={{ fontSize: 9, fontWeight: 900, fontFamily: "monospace", padding: "3px 9px", borderRadius: 8, color: "#fff", background: protocol.color }}>{protocol.code}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 800, color: T.onSurface, margin: 0, lineHeight: 1.3 }}>{protocol.title}</p>
                          <p style={{ fontSize: 10, color: T.onSurfaceV, margin: "2px 0 0", display: "flex", alignItems: "center", gap: 4 }}>
                            <BookOpen style={{ width: 10, height: 10 }} /> {protocol.org}
                          </p>
                        </div>
                        {isActive ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                            <span style={{ fontSize: 13, fontWeight: 900, fontFamily: "monospace", color: protocol.color }}>{fmtElapsed(elapsedSeconds)}</span>
                            <span style={{ fontSize: 11, fontWeight: 800, color: protocol.color }}>{donePct}%</span>
                            <button onClick={deactivateProtocol} style={{ fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 9, background: "rgba(26,28,31,0.07)", color: T.onSurfaceV, border: "none", cursor: "pointer" }}>End</button>
                          </div>
                        ) : (
                          <button onClick={() => activateProtocol(protocol.code)} disabled={!!activeProtocolCode}
                            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800, padding: "7px 14px", borderRadius: 12, color: "#fff", background: protocol.color, border: "none", cursor: "pointer", flexShrink: 0, opacity: !!activeProtocolCode ? 0.35 : 1 }}>
                            <Zap style={{ width: 12, height: 12 }} /> Activate
                          </button>
                        )}
                      </div>
                      <div>
                        {protocol.steps.map((step, si) => {
                          const stepKey = `${protocol.code}-${si}`;
                          const done = completedSteps.has(stepKey);
                          return (
                            <div key={si}
                              onClick={isActive ? () => toggleStep(stepKey) : undefined}
                              style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "11px 18px", cursor: isActive ? "pointer" : "default", borderBottom: si < protocol.steps.length - 1 ? "1.5px solid rgba(194,198,213,0.08)" : "none", background: done ? `${protocol.color}04` : "transparent", transition: "background 0.15s" }}>
                              {isActive ? (
                                <div style={{
                                  width: 20, height: 20, borderRadius: "50%", border: `2px solid ${done ? protocol.color : `${protocol.color}40`}`,
                                  background: done ? protocol.color : "transparent", flexShrink: 0, marginTop: 1,
                                  display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s",
                                }}>
                                  {done && <CheckCircle2 style={{ width: 12, height: 12, color: "#fff" }} />}
                                </div>
                              ) : (
                                <span style={{ width: 20, height: 20, borderRadius: "50%", border: `1.5px solid ${protocol.color}40`, color: protocol.color, fontSize: 9, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{si + 1}</span>
                              )}
                              <p style={{ fontSize: 12, lineHeight: 1.55, color: done ? T.onSurfaceV : T.onSurface, textDecoration: done ? "line-through" : "none", margin: 0, flex: 1 }}>{step}</p>
                              {done && <CheckCircle2 style={{ width: 13, height: 13, color: "#059669", flexShrink: 0, marginTop: 2 }} />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                <p style={{ fontSize: 9, color: T.onSurfaceV, textAlign: "right", margin: 0, opacity: 0.5 }}>
                  Protocols verified against MOH Saudi Arabia 2024 clinical guidelines. For reference only — clinical judgment applies.
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      </div>
    </Layout>
  );
}
