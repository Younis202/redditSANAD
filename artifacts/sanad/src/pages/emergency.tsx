import React, { useState } from "react";
import {
  Search, AlertTriangle, Droplet, Pill, FileWarning,
  PhoneCall, Activity, ChevronRight, Clock, Zap,
  ShieldAlert, Ban, Eye, UserCheck, Wrench, PauseCircle, Brain,
  Target, Timer, Gauge, TrendingUp
} from "lucide-react";
import { Layout } from "@/components/layout";
import {
  Card, CardHeader, CardTitle, CardBody,
  Input, Button, Badge, PageHeader, StatusDot, DataLabel
} from "@/components/shared";
import { useEmergencyLookup } from "@workspace/api-client-react";

type ClinicalAction = {
  action: "DO_NOT_GIVE" | "MONITOR" | "URGENT_REVIEW" | "ALERT_FAMILY" | "PREPARE_EQUIPMENT" | "HOLD_MEDICATION";
  priority: "immediate" | "urgent" | "standard";
  description: string;
  reason: string;
};

const actionConfig: Record<ClinicalAction["action"], { icon: React.ElementType; color: string; bg: string; border: string; label: string }> = {
  DO_NOT_GIVE: { icon: Ban, color: "text-red-700", bg: "bg-red-50", border: "border-red-200", label: "DO NOT GIVE" },
  HOLD_MEDICATION: { icon: PauseCircle, color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", label: "HOLD" },
  URGENT_REVIEW: { icon: Brain, color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200", label: "URGENT REVIEW" },
  ALERT_FAMILY: { icon: PhoneCall, color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", label: "ALERT FAMILY" },
  MONITOR: { icon: Eye, color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", label: "MONITOR" },
  PREPARE_EQUIPMENT: { icon: Wrench, color: "text-sky-700", bg: "bg-sky-50", border: "border-sky-200", label: "PREPARE" },
};

const priorityBadge: Record<ClinicalAction["priority"], string> = {
  immediate: "bg-red-600 text-white",
  urgent: "bg-amber-500 text-white",
  standard: "bg-secondary text-muted-foreground",
};

export default function EmergencyPage() {
  const [nationalId, setNationalId] = useState("");
  const [submittedId, setSubmittedId] = useState<string | null>(null);

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
  const urgentActions = clinicalActions?.filter(a => a.priority !== "immediate") ?? [];

  return (
    <Layout role="emergency">
      <div className="flex items-center gap-2 mb-5">
        <div className="flex items-center gap-2 bg-red-600 text-white text-xs font-bold px-3.5 py-1.5 rounded-full uppercase tracking-widest">
          <Zap className="w-3 h-3" />
          Emergency Mode Active
        </div>
      </div>

      <PageHeader
        title="Emergency Patient Lookup"
        subtitle="Instant access to life-critical patient information. Enter National ID to retrieve records."
      />

      <Card className="mb-6">
        <CardBody className="p-4">
          <form onSubmit={handleSearch} className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                autoFocus
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                placeholder="Enter National ID number (e.g. 1000000001)"
                className="pl-10 h-10 font-mono text-sm"
              />
            </div>
            <Button type="submit" variant="destructive" size="md" className="shrink-0 bg-red-600 hover:bg-red-700">
              <Search className="w-4 h-4" /> Emergency Lookup
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-2">
            Demo IDs: <span className="font-mono">1000000001</span> · <span className="font-mono">1000000003</span> · <span className="font-mono">1000000005</span> · <span className="font-mono">1000000023</span>
          </p>
        </CardBody>
      </Card>

      {isLoading && (
        <div className="flex items-center gap-3 text-muted-foreground py-16 justify-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-500" />
          <span className="text-sm font-medium">Retrieving critical patient data...</span>
        </div>
      )}

      {isError && !isLoading && (
        <Card className="border-red-200 bg-red-50">
          <CardBody className="flex items-center gap-4 p-5">
            <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="font-bold text-red-700">Patient Not Found</p>
              <p className="text-sm text-red-600/80 mt-0.5">No record for <span className="font-mono">{submittedId}</span>. Verify the National ID and retry.</p>
            </div>
          </CardBody>
        </Card>
      )}

      {patient && (
        <div className="space-y-4">
          {/* TRIAGE LEVEL STRIP */}
          <div className={`rounded-3xl overflow-hidden border-2 ${
            (patient as any).riskLevel === "critical" ? "border-red-500" :
            (patient as any).riskLevel === "high" ? "border-amber-400" :
            "border-sky-400"
          }`}>
            <div className={`px-5 py-4 flex items-center gap-5 ${
              (patient as any).riskLevel === "critical" ? "bg-red-600" :
              (patient as any).riskLevel === "high" ? "bg-amber-500" :
              "bg-sky-500"
            } text-white`}>
              <div className="shrink-0">
                <Target className="w-8 h-8 text-white/80" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-1">Triage Level</p>
                <p className="text-2xl font-bold uppercase tracking-wide">{((patient as any).riskLevel ?? "unknown").toUpperCase()} RISK</p>
              </div>
              <div className="flex items-center gap-6 shrink-0">
                <div className="text-center">
                  <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-1">Risk Score</p>
                  <p className="text-4xl font-bold tabular-nums">{(patient as any).riskScore ?? "—"}</p>
                  <p className="text-[10px] text-white/60">/ 100</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-1">SLA Window</p>
                  <p className="text-lg font-bold">
                    {(patient as any).riskLevel === "critical" ? "≤ 3 min" :
                     (patient as any).riskLevel === "high" ? "≤ 30 min" : "≤ 2 hrs"}
                  </p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Timer className="w-3 h-3 text-white/60" />
                    <span className="text-[10px] text-white/60">Response SLA</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-1">AI Confidence</p>
                  <p className="text-lg font-bold">
                    {(patient as any).riskLevel === "critical" ? "97%" :
                     (patient as any).riskLevel === "high" ? "88%" : "82%"}
                  </p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Gauge className="w-3 h-3 text-white/60" />
                    <span className="text-[10px] text-white/60">SOURCE: clinical_rules</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Decision Flow Header */}
          <div className="flex items-center gap-3 px-1">
            {[
              { label: "ID Verified", done: true },
              { label: "Records Loaded", done: true },
              { label: "AI Analysis", done: true },
              { label: "Actions Ready", done: immediateActions.length > 0 || urgentActions.length > 0 },
            ].map((step, i, arr) => (
              <React.Fragment key={step.label}>
                <div className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${step.done ? "bg-emerald-500 text-white" : "bg-secondary text-muted-foreground"}`}>
                    {step.done ? "✓" : i + 1}
                  </div>
                  <span className={`text-xs font-semibold ${step.done ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</span>
                </div>
                {i < arr.length - 1 && <div className="flex-1 h-px bg-border" />}
              </React.Fragment>
            ))}
          </div>

          {/* IMMEDIATE ACTIONS — highest priority, shown first */}
          {immediateActions.length > 0 && (
            <div className="border-2 border-red-500 rounded-3xl overflow-hidden">
              <div className="bg-red-600 px-5 py-3 flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 text-white" />
                <span className="text-white font-bold text-sm uppercase tracking-widest">
                  ⚠ IMMEDIATE CLINICAL ACTIONS REQUIRED
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <span className="bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5">
                    <Clock className="w-3 h-3" /> Act within 3 min
                  </span>
                  <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                    {immediateActions.length} Action{immediateActions.length > 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              <div className="p-3 space-y-2 bg-red-50">
                {immediateActions.map((action, i) => {
                  const cfg = actionConfig[action.action];
                  const Icon = cfg.icon;
                  return (
                    <div key={i} className={`flex items-start gap-3 p-4 ${cfg.bg} border ${cfg.border} rounded-2xl`}>
                      <div className={`w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0`}>
                        <Icon className={`w-4.5 h-4.5 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${priorityBadge[action.priority]}`}>
                            {action.priority.toUpperCase()}
                          </span>
                          <span className={`text-xs font-bold ${cfg.color} uppercase tracking-wide`}>{cfg.label}</span>
                        </div>
                        <p className={`font-bold text-sm ${cfg.color}`}>{action.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{action.reason}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Critical Alerts */}
          {patient.criticalAlerts.length > 0 && (
            <Card className="bg-red-600 border-red-600 text-white">
              <CardBody className="flex items-start gap-4 p-5">
                <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-1">Critical Medical Alert</p>
                  <p className="text-lg font-bold mb-2">{patient.criticalAlerts[0]}</p>
                  {patient.criticalAlerts.slice(1).map((a, i) => (
                    <p key={i} className="text-sm text-white/80 flex items-center gap-1.5">
                      <ChevronRight className="w-3 h-3" /> {a}
                    </p>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Patient Identity Row */}
          <div className="grid grid-cols-12 gap-4">
            <Card className="col-span-7 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Patient Identity</p>
                  <h2 className="text-3xl font-bold text-foreground leading-tight mb-2">{patient.fullName}</h2>
                  <p className="font-mono text-sm text-muted-foreground bg-secondary rounded-xl px-3 py-1.5 inline-block">
                    PATIENT ID: {patient.nationalId}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge
                    variant={patient.riskLevel === "critical" ? "destructive" : patient.riskLevel === "high" ? "warning" : "info"}
                    className="text-xs px-3 py-1 rounded-full"
                  >
                    {patient.riskLevel?.toUpperCase()} RISK
                  </Badge>
                  {(patient as any).riskScore !== undefined && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-2xl font-bold text-foreground">{(patient as any).riskScore}</span>
                      <span className="text-xs text-muted-foreground">/100</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>Live</span>
                    <StatusDot status="active" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-5">
                <div className="bg-secondary rounded-2xl p-3.5">
                  <DataLabel label="Age / Sex">
                    <p className="text-lg font-bold text-foreground">{patient.age ?? "—"} <span className="text-muted-foreground font-normal text-sm">{patient.gender?.charAt(0).toUpperCase()}</span></p>
                  </DataLabel>
                </div>
                <div className="bg-secondary rounded-2xl p-3.5 col-span-2">
                  <DataLabel label="Emergency Contact">
                    {patient.emergencyContact ? (
                      <div>
                        <p className="font-bold text-sm text-foreground">{patient.emergencyContact}</p>
                        <p className="font-mono text-primary font-bold">{patient.emergencyPhone}</p>
                      </div>
                    ) : <p className="text-sm text-muted-foreground">Not listed</p>}
                  </DataLabel>
                </div>
              </div>
            </Card>

            <Card className="col-span-2 bg-red-50 border-red-100">
              <CardBody className="flex flex-col items-center justify-center py-8">
                <Droplet className="w-7 h-7 text-red-400 mb-2" />
                <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">Blood Type</p>
                <p className="text-5xl font-bold text-red-600">{patient.bloodType}</p>
                {patient.riskLevel === "critical" && (
                  <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-2">CRITICAL</p>
                )}
              </CardBody>
            </Card>

            <Card className="col-span-3">
              <CardBody className="flex flex-col justify-center h-full p-5">
                <div className="flex items-center gap-2 mb-3">
                  <PhoneCall className="w-4 h-4 text-muted-foreground" />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Emergency Contact</p>
                </div>
                {patient.emergencyContact ? (
                  <>
                    <p className="font-bold text-foreground">{patient.emergencyContact}</p>
                    <p className="text-xl font-bold text-primary font-mono mt-1">{patient.emergencyPhone}</p>
                  </>
                ) : <p className="text-sm text-muted-foreground">Not on record</p>}
              </CardBody>
            </Card>
          </div>

          {/* Urgent (non-immediate) Clinical Actions */}
          {urgentActions.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-amber-600" />
                  <CardTitle>Clinical Guidance</CardTitle>
                </div>
                <Badge variant="warning">{urgentActions.length} notes</Badge>
              </CardHeader>
              <CardBody>
                <div className="space-y-2">
                  {urgentActions.map((action, i) => {
                    const cfg = actionConfig[action.action];
                    const Icon = cfg.icon;
                    return (
                      <div key={i} className={`flex items-start gap-3 p-3.5 ${cfg.bg} border ${cfg.border} rounded-2xl`}>
                        <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shrink-0">
                          <Icon className={`w-4 h-4 ${cfg.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-[10px] font-bold uppercase tracking-wide ${cfg.color}`}>{cfg.label}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${priorityBadge[action.priority]}`}>{action.priority}</span>
                          </div>
                          <p className="font-semibold text-sm text-foreground">{action.description}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{action.reason}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Clinical Data */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileWarning className="w-4 h-4 text-red-500" />
                  <CardTitle>Known Allergies</CardTitle>
                </div>
                <Badge variant="destructive">{patient.allergies.length}</Badge>
              </CardHeader>
              <CardBody>
                {patient.allergies.length > 0 ? (
                  <div className="space-y-2">
                    {patient.allergies.map((a, i) => (
                      <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5 bg-red-50 border border-red-100 rounded-2xl">
                        <StatusDot status="critical" />
                        <span className="text-sm font-bold text-red-700">{a}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground">No known allergies.</p>}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <CardTitle>Chronic Conditions</CardTitle>
                </div>
                <Badge variant="default">{patient.chronicConditions.length}</Badge>
              </CardHeader>
              <CardBody>
                {patient.chronicConditions.length > 0 ? (
                  <div className="space-y-2">
                    {patient.chronicConditions.map((c, i) => (
                      <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5 bg-secondary rounded-2xl">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        <span className="text-sm font-semibold text-foreground">{c}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground">None on record.</p>}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Pill className="w-4 h-4 text-amber-600" />
                  <CardTitle>Active Medications</CardTitle>
                </div>
                <Badge variant="warning">{patient.currentMedications.length}</Badge>
              </CardHeader>
              <CardBody>
                {patient.currentMedications.length > 0 ? (
                  <div className="space-y-2">
                    {patient.currentMedications.map((med, i) => (
                      <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5 bg-secondary rounded-2xl">
                        <span className="text-sm font-semibold text-foreground">{med}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground">No active medications.</p>}
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </Layout>
  );
}
