import React, { useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import {
  Card, CardHeader, CardTitle, CardBody,
  Input, Button, Badge, PageHeader, DataLabel, PortalHero, Sheet
} from "@/components/shared";
import {
  Pill, Search, AlertTriangle, CheckCircle2, Shield, ShieldAlert,
  Brain, CreditCard, Zap, Clock, X, BookOpen, FlaskConical, Bell,
  Package, AlertCircle
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSseAlerts } from "@/hooks/use-sse-alerts";

async function fetchPharmacyPatient(nationalId: string) {
  const res = await fetch(`/api/pharmacy/patient/${nationalId}`);
  if (!res.ok) throw new Error("Patient not found");
  return res.json();
}

async function fetchSupplyInventory() {
  const res = await fetch("/api/supply-chain/inventory");
  if (!res.ok) throw new Error("Failed to fetch inventory");
  return res.json();
}

async function dispenseMed(medicationId: number, pharmacistName: string) {
  const res = await fetch(`/api/pharmacy/dispense/${medicationId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pharmacistName }),
  });
  if (!res.ok) throw new Error("Failed to dispense");
  return res.json();
}

const DRUG_CATEGORIES: Record<string, { category: string; severity: "safe" | "moderate" | "high" | "critical"; label: string; contraindications: string[] }> = {
  metformin: { category: "B", severity: "safe", label: "Safe in most patients", contraindications: ["eGFR < 30"] },
  amlodipine: { category: "C", severity: "moderate", label: "Use with caution", contraindications: ["Severe aortic stenosis"] },
  atorvastatin: { category: "X", severity: "high", label: "Contraindicated in pregnancy", contraindications: ["Pregnancy", "Active liver disease"] },
  aspirin: { category: "D", severity: "moderate", label: "Avoid in 3rd trimester", contraindications: ["Bleeding disorders", "3rd trimester pregnancy"] },
  lisinopril: { category: "D", severity: "high", label: "Avoid in pregnancy/CKD", contraindications: ["Pregnancy", "Bilateral renal artery stenosis"] },
  warfarin: { category: "X", severity: "critical", label: "Critical monitoring required", contraindications: ["Pregnancy", "Active bleeding", "Recent surgery"] },
  metoprolol: { category: "C", severity: "moderate", label: "Monitor heart rate & BP", contraindications: ["Severe bradycardia", "Cardiogenic shock"] },
  omeprazole: { category: "C", severity: "safe", label: "Generally well tolerated", contraindications: [] },
  sitagliptin: { category: "B", severity: "safe", label: "Safe with dose adjustment", contraindications: ["eGFR < 30 (dose reduce)"] },
  insulin: { category: "B", severity: "safe", label: "Safe — monitor glucose", contraindications: ["Hypoglycemia"] },
  furosemide: { category: "C", severity: "moderate", label: "Monitor electrolytes", contraindications: ["Anuria", "Sulfonamide allergy"] },
  clopidogrel: { category: "B", severity: "moderate", label: "Risk of bleeding", contraindications: ["Active bleeding", "Liver disease"] },
  ramipril: { category: "D", severity: "high", label: "Avoid in pregnancy", contraindications: ["Pregnancy", "Hyperkalemia"] },
  glimepiride: { category: "C", severity: "moderate", label: "Monitor for hypoglycemia", contraindications: ["Type 1 DM", "Sulfonamide allergy"] },
  allopurinol: { category: "C", severity: "moderate", label: "Adjust for renal impairment", contraindications: ["Acute gout attack", "Azathioprine co-use"] },
};

function getDrugCategory(drugName: string) {
  const key = drugName.toLowerCase().split(" ")[0] ?? "";
  return DRUG_CATEGORIES[key] ?? null;
}

function getStockStatus(inventory: any[] | undefined, drugName: string): { status: string; daysOfStock: number; stock: number; unit: string } | null {
  if (!inventory) return null;
  const key = drugName.split(" ")[0]?.toLowerCase() ?? "";
  const match = inventory.find((item: any) => {
    const itemKey = item.drugName.split(" ")[0]?.toLowerCase() ?? "";
    return itemKey === key || item.drugName.toLowerCase().includes(key) || drugName.toLowerCase().includes(itemKey);
  });
  if (!match) return null;
  return { status: match.status, daysOfStock: match.daysOfStock, stock: match.stock, unit: match.unit };
}

export default function PharmacyPortal() {
  const [searchId, setSearchId] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [dispensing, setDispensing] = useState<number | null>(null);
  const [dispensedResults, setDispensedResults] = useState<Record<number, any>>({});
  const [clinicalRefSheet, setClinicalRefSheet] = useState<{ presc: any; check: any } | null>(null);
  const [showSsePanel, setShowSsePanel] = useState(true);
  const { alerts: sseAlerts, connected: sseConnected, unreadCount: sseUnread, markRead: markSseRead, clearAll: clearSseAlerts } = useSseAlerts("pharmacy");

  const qc = useQueryClient();

  const { data: supplyData } = useQuery({
    queryKey: ["supply-inventory-pharmacy"],
    queryFn: fetchSupplyInventory,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["pharmacy-patient", nationalId],
    queryFn: () => fetchPharmacyPatient(nationalId),
    enabled: !!nationalId,
    retry: false,
  });

  const dispenseMutation = useMutation({
    mutationFn: ({ id }: { id: number }) => dispenseMed(id, "Pharmacist Hassan Al-Ghamdi"),
    onSuccess: (result, { id }) => {
      setDispensedResults(prev => ({ ...prev, [id]: result }));
      setDispensing(null);
      qc.invalidateQueries({ queryKey: ["pharmacy-patient", nationalId] });
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchId.trim()) setNationalId(searchId.trim());
  };

  return (
    <Layout role="pharmacy">
      <PortalHero
        title="Pharmacy Portal"
        subtitle="Prescription dispensing · AI drug safety · Insurance verification · Real-time interaction alerts"
        icon={Pill}
        gradient="linear-gradient(135deg, #9333ea 0%, #581c87 100%)"
        badge="Clinical Pharmacy · MOH"
        stats={[
          { label: "Drugs Monitored", value: "15K+" },
          { label: "Safety Checks / Day", value: "47K+" },
          { label: "Interaction Engine", value: "Live" },
        ]}
        action={
          <button
            onClick={() => setShowSsePanel(p => !p)}
            className="relative flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full"
            style={{ background: "rgba(255,255,255,0.18)", color: sseUnread > 0 ? "white" : "rgba(255,255,255,0.70)" }}
          >
            <Bell className="w-3.5 h-3.5" />
            {sseUnread > 0 ? `${sseUnread} Alert${sseUnread > 1 ? "s" : ""}` : "Live Alerts"}
            <span className={`w-1.5 h-1.5 rounded-full ${sseConnected ? "bg-emerald-300" : "bg-amber-400 animate-pulse"}`} />
            {sseUnread > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-400 text-white text-[9px] font-bold flex items-center justify-center">
                {sseUnread > 9 ? "9+" : sseUnread}
              </span>
            )}
          </button>
        }
      />

      {/* SSE Drug Interaction Alert Panel */}
      {showSsePanel && sseAlerts.length > 0 && (
        <Card className="mb-5 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-secondary rounded-t-[2rem]" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="font-bold text-sm text-foreground">Live Drug Safety Alerts</span>
              <Badge variant="warning" className="text-[10px]">{sseUnread} new</Badge>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={clearSseAlerts} className="text-[11px] text-muted-foreground hover:text-foreground font-medium">Clear all</button>
              <button onClick={() => setShowSsePanel(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="divide-y divide-border max-h-56 overflow-y-auto">
            {sseAlerts.map(alert => (
              <div key={alert.id} className={`px-4 py-3 flex items-start gap-3 ${alert.read ? "opacity-60" : ""}`}>
                <ShieldAlert className={`mt-0.5 w-4 h-4 shrink-0 ${alert.severity === "critical" ? "text-red-500" : "text-amber-500"}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-foreground">{alert.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Patient: {alert.patientName}
                    {alert.drugName && alert.conflictingDrug ? ` · ${alert.drugName} ↔ ${alert.conflictingDrug}` : ""}
                  </p>
                  {alert.recommendation && <p className="text-xs text-muted-foreground mt-0.5">{alert.recommendation}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">{new Date(alert.timestamp).toLocaleTimeString()}</p>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => { setSearchId(alert.nationalId ?? ""); setNationalId(alert.nationalId ?? ""); markSseRead(alert.id); }}
                    className="text-[10px] font-semibold text-foreground bg-secondary hover:bg-secondary/80 rounded-lg px-2 py-1 transition-colors"
                  >
                    Load Patient
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Search */}
      <Card className="mb-5">
        <CardBody>
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Patient National ID"
                value={searchId}
                onChange={e => setSearchId(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit" disabled={!searchId.trim()}>
              <Search className="w-4 h-4" /> Retrieve Prescriptions
            </Button>
          </form>
        </CardBody>
      </Card>

      {isLoading && (
        <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600" />
          <span className="text-sm font-medium">Loading prescriptions...</span>
        </div>
      )}

      {error && (
        <Card>
          <CardBody className="py-10 text-center">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
            <p className="font-bold text-foreground">Patient Not Found</p>
            <p className="text-sm text-muted-foreground mt-1">No records for National ID: {nationalId}</p>
          </CardBody>
        </Card>
      )}

      {data && (
        <div className="space-y-4">
          {/* Patient Card */}
          <Card className="overflow-hidden">
            {data.patient.allergies?.length > 0 && (
              <div className="bg-red-600 text-white px-5 py-2.5 flex items-center gap-2.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <p className="text-xs font-bold uppercase tracking-widest">KNOWN ALLERGIES: {data.patient.allergies.join(", ")}</p>
              </div>
            )}
            {data.summary.interactions > 0 && (
              <div className="bg-secondary px-5 py-2 flex items-center gap-2" style={{ borderLeft: "3px solid #f59e0b" }}>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <p className="text-xs font-bold text-amber-800 uppercase tracking-widest">
                  {data.summary.interactions} DRUG INTERACTION{data.summary.interactions > 1 ? "S" : ""} DETECTED
                </p>
              </div>
            )}
            <CardBody className="flex items-start justify-between gap-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Patient Record</p>
                <p className="text-2xl font-bold text-foreground">{data.patient.name}</p>
                <div className="flex items-center gap-2.5 mt-2 flex-wrap">
                  <span className="font-mono bg-secondary text-xs px-2.5 py-1 rounded-xl">{data.patient.nationalId}</span>
                  <span className="text-xs text-muted-foreground">Age {data.patient.age}</span>
                  <span className="text-xs font-bold text-red-600 bg-secondary px-2.5 py-1 rounded-full">Blood: {data.patient.bloodType}</span>
                </div>
                {data.patient.chronicConditions?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {data.patient.chronicConditions.map((c: string) => (
                      <span key={c} className="text-[10px] font-bold bg-secondary px-2 py-0.5 rounded-full">{c}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-5 shrink-0">
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Active Rx</p>
                  <p className="text-3xl font-bold tabular-nums text-foreground">{data.summary.active}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Interactions</p>
                  <p className={`text-3xl font-bold tabular-nums ${data.summary.interactions > 0 ? "text-amber-600" : "text-foreground"}`}>{data.summary.interactions}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Insured</p>
                  <p className="text-3xl font-bold tabular-nums text-foreground">{data.summary.insuranceCovered}</p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Prescriptions */}
          <Card>
            <CardHeader>
              <Pill className="w-4 h-4 text-purple-600" />
              <CardTitle>Active Prescriptions</CardTitle>
              <Badge variant="outline" className="ml-auto">{data.prescriptions.length} prescriptions</Badge>
            </CardHeader>
            <div className="divide-y divide-border">
              {data.prescriptions.length === 0 ? (
                <div className="py-12 text-center">
                  <Pill className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="font-bold text-foreground">No active prescriptions</p>
                </div>
              ) : (
                data.prescriptions.map((presc: any) => {
                  const dispensedResult = dispensedResults[presc.id];
                  const isDispensed = !!dispensedResult;
                  const check = presc.dispenseCheck;
                  const ins = presc.insurance;
                  const stock = getStockStatus(supplyData?.inventory, presc.drugName);

                  const drugCat = getDrugCategory(presc.drugName);
                  return (
                    <div key={presc.id} className="p-5"
                      style={!check.safe ? { borderLeft: "3px solid #ef4444" } : {}}>
                      {/* ─── SFDA / FDA Drug Classification Panel ─── */}
                      {drugCat && (
                        <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl mb-3 text-xs bg-secondary"
                          style={{ borderLeft: `3px solid ${drugCat.severity === "critical" ? "#ef4444" : drugCat.severity === "high" ? "#f97316" : drugCat.severity === "moderate" ? "#f59e0b" : "#22c55e"}` }}>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ${
                            drugCat.severity === "critical" ? "bg-red-600 text-white" :
                            drugCat.severity === "high" ? "bg-orange-500 text-white" :
                            drugCat.severity === "moderate" ? "bg-amber-500 text-white" :
                            "bg-emerald-600 text-white"
                          }`}>{drugCat.category}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground">FDA Category {drugCat.category}</span>
                              <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full bg-secondary ${
                                drugCat.severity === "critical" ? "text-red-600" :
                                drugCat.severity === "high" ? "text-orange-600" :
                                drugCat.severity === "moderate" ? "text-amber-600" :
                                "text-emerald-600"
                              }`}>{drugCat.severity}</span>
                            </div>
                            <p className="text-muted-foreground text-[10px] mt-0.5">{drugCat.label}</p>
                          </div>
                          {drugCat.contraindications.length > 0 && (
                            <div className="shrink-0 text-right">
                              <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Contraindicated</p>
                              <div className="flex flex-wrap gap-1 justify-end">
                                {drugCat.contraindications.slice(0, 2).map((c, j) => (
                                  <span key={j} className="text-[8px] font-bold bg-white px-1.5 py-0.5 rounded text-foreground">{c}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-base text-foreground">{presc.drugName}</p>
                            {!check.safe && <Badge variant="destructive" className="text-[9px]">CONFLICT</Badge>}
                            {check.safe && <Badge variant="success" className="text-[9px]">SAFE</Badge>}
                            {isDispensed && <Badge variant="info" className="text-[9px]">DISPENSED</Badge>}
                            {stock && (
                              <span className={`flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-secondary ${
                                stock.status === "critical" ? "text-red-600" :
                                stock.status === "low" ? "text-amber-600" :
                                "text-emerald-600"
                              }`}>
                                <Package className="w-2.5 h-2.5" />
                                {stock.status === "critical" ? `CRITICAL — ${stock.daysOfStock}d left` :
                                 stock.status === "low" ? `LOW — ${stock.daysOfStock}d left` :
                                 `In Stock · ${stock.daysOfStock}d`}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="font-mono font-bold text-foreground">{presc.dosage}</span>
                            <span>·</span>
                            <span>{presc.frequency}</span>
                            <span>·</span>
                            <span>Rx by {presc.prescribedBy}</span>
                            <span>·</span>
                            <span>{presc.hospital}</span>
                          </div>
                        </div>
                        {!isDispensed ? (
                          <Button
                            onClick={() => {
                              setDispensing(presc.id);
                              dispenseMutation.mutate({ id: presc.id });
                            }}
                            disabled={!check.safe || dispenseMutation.isPending}
                            variant={check.safe ? "default" : "outline"}
                            className={check.safe ? "" : "border-red-300 text-red-600"}
                          >
                            <Zap className="w-3.5 h-3.5" />
                            {dispensing === presc.id ? "Dispensing..." : check.safe ? "Dispense" : "Override & Dispense"}
                          </Button>
                        ) : (
                          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                            <CheckCircle2 className="w-4 h-4" />
                            Dispensed
                          </div>
                        )}
                      </div>

                      {/* AI Safety Check */}
                      <div className="px-3.5 py-3 rounded-2xl mb-2 bg-secondary"
                        style={{ borderLeft: `3px solid ${!check.safe ? "#ef4444" : "#22c55e"}` }}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <Brain className="w-3.5 h-3.5 text-violet-600" />
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">AI Dispense Safety Check</p>
                          <span className="text-[10px] font-mono text-muted-foreground ml-auto">Confidence: {Math.round(check.confidenceScore * 100)}%</span>
                        </div>
                        {check.warnings.map((w: string, i: number) => (
                          <p key={i} className="text-xs font-semibold text-foreground mb-1">{w}</p>
                        ))}

                        {/* Detailed Clinical References → opens Sheet */}
                        {check.detailedWarnings && check.detailedWarnings.length > 0 && (
                          <div className="mt-2">
                            <button
                              onClick={() => setClinicalRefSheet({ presc, check })}
                              className="flex items-center gap-1.5 text-[10px] font-bold text-primary hover:opacity-70 transition-opacity"
                            >
                              <BookOpen className="w-3 h-3" />
                              View {check.detailedWarnings.length} Clinical Reference{check.detailedWarnings.length !== 1 ? "s" : ""}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Insurance */}
                      <div className="flex items-center gap-4 px-3.5 py-2.5 bg-secondary rounded-2xl">
                        <CreditCard className="w-3.5 h-3.5 text-primary shrink-0" />
                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Insurance · {ins.provider}</p>
                          <p className="text-xs text-foreground">{ins.notes}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 text-xs">
                          <div className="text-center">
                            <p className="text-[10px] text-muted-foreground">Coverage</p>
                            <p className="font-bold text-foreground">{ins.eligible ? `${ins.coveragePercent}%` : "Not Covered"}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] text-muted-foreground">Copay</p>
                            <p className="font-bold text-foreground">SAR {ins.copay}</p>
                          </div>
                          {ins.preAuthRequired && (
                            <Badge variant="warning" className="text-[9px]">Pre-Auth Req.</Badge>
                          )}
                          <Badge variant={ins.eligible ? "success" : "destructive"} className="text-[9px]">
                            {ins.eligible ? "Eligible" : "Not Eligible"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      )}

      {!nationalId && !isLoading && (
        <Card>
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-3xl bg-secondary flex items-center justify-center mx-auto mb-5">
              <Pill className="w-8 h-8 text-primary" />
            </div>
            <p className="text-xl font-bold text-foreground mb-2">Pharmacy Portal</p>
            <p className="text-sm text-muted-foreground max-w-sm">Enter a patient's National ID to view active prescriptions and dispense medications with AI safety verification.</p>
          </div>
        </Card>
      )}

      {/* Clinical References Sheet */}
      <Sheet
        open={!!clinicalRefSheet}
        onClose={() => setClinicalRefSheet(null)}
        title="Clinical Drug Safety References"
        subtitle={clinicalRefSheet ? `${clinicalRefSheet.presc.drugName} · ${clinicalRefSheet.check.detailedWarnings.length} interaction${clinicalRefSheet.check.detailedWarnings.length !== 1 ? "s" : ""}` : ""}
        width="max-w-2xl"
      >
        {clinicalRefSheet && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4 text-primary" />
              <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest">AI Safety Check</span>
              <span className="text-[12px] font-mono text-muted-foreground ml-auto">Confidence: {Math.round(clinicalRefSheet.check.confidenceScore * 100)}%</span>
            </div>
            {clinicalRefSheet.check.detailedWarnings.map((dw: any, wi: number) => (
              <div key={wi} className="rounded-[1.25rem] bg-secondary p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-red-500 shrink-0" />
                    <p className="text-[13px] font-bold text-foreground">{dw.text}</p>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    dw.severity === "critical" ? "bg-red-600 text-white" :
                    dw.severity === "high" ? "bg-secondary border border-border text-red-600" :
                    dw.severity === "moderate" ? "bg-secondary border border-border text-amber-600" :
                    "bg-secondary border border-border text-foreground"
                  }`}>{dw.severity?.toUpperCase()}</span>
                </div>
                <div className="space-y-1.5 text-[12px] text-muted-foreground">
                  <p><span className="font-semibold text-foreground">Mechanism: </span>{dw.mechanism}</p>
                  <p><span className="font-semibold text-foreground">Clinical basis: </span>{dw.clinicalBasis}</p>
                  <div className="flex items-start gap-1.5 mt-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="font-semibold text-foreground">{dw.recommendation}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(dw.source ? dw.source.split(" · ") : dw.sources ?? []).map((src: string, si: number) => (
                      <span key={si} className="text-[10px] font-mono bg-white text-primary border border-black/[0.06] px-2 py-0.5 rounded-lg">{src}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Sheet>
    </Layout>
  );
}
