import React, { useState } from "react";
import {
  Search, AlertTriangle, FileWarning,
  PhoneCall, Activity, Clock, Zap,
  ShieldAlert, Ban, Eye, UserCheck, Wrench,
  PauseCircle, Brain, Timer, Bell,
  ChevronDown, ChevronUp, CheckCircle2, Radio,
  Fingerprint, Heart, Droplet, User
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
                      </div>
                    </div>
                  );
                })}
              </CardBody>
            </Card>
          )}

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
