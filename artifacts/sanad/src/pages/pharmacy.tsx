import React, { useState } from "react";
import { Layout } from "@/components/layout";
import {
  Card, CardHeader, CardTitle, CardBody,
  Input, Button, Badge, PageHeader, DataLabel
} from "@/components/shared";
import {
  Pill, Search, AlertTriangle, CheckCircle2, Shield, ShieldAlert,
  Brain, CreditCard, Zap, Clock, X, BookOpen, ChevronDown, ChevronUp, FlaskConical
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

async function fetchPharmacyPatient(nationalId: string) {
  const res = await fetch(`/api/pharmacy/patient/${nationalId}`);
  if (!res.ok) throw new Error("Patient not found");
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

export default function PharmacyPortal() {
  const [searchId, setSearchId] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [dispensing, setDispensing] = useState<number | null>(null);
  const [dispensedResults, setDispensedResults] = useState<Record<number, any>>({});
  const [expandedWarnings, setExpandedWarnings] = useState<Record<number, boolean>>({});

  const qc = useQueryClient();

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
      <PageHeader
        title="Pharmacy Portal"
        subtitle="Prescription dispensing · AI drug safety · Insurance verification"
      />

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
          {/* Patient + Allergy Strip */}
          <div className={`rounded-3xl p-5 flex items-start justify-between gap-5 ${
            data.summary.interactions > 0 ? "bg-red-600" : "bg-purple-500"
          } text-white`}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-1">Patient Record</p>
              <p className="text-xl font-bold">{data.patient.name}</p>
              <div className="flex items-center gap-4 mt-1.5 text-sm text-white/80">
                <span>ID: {data.patient.nationalId}</span>
                <span>Age: {data.patient.age}</span>
                <span>Blood: {data.patient.bloodType}</span>
              </div>
              {data.patient.chronicConditions?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {data.patient.chronicConditions.map((c: string) => (
                    <span key={c} className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">{c}</span>
                  ))}
                </div>
              )}
              {data.patient.allergies?.length > 0 && (
                <div className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-xl">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <p className="text-xs font-bold">KNOWN ALLERGIES: {data.patient.allergies.join(", ")}</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-5 shrink-0">
              <div className="text-center">
                <p className="text-[10px] text-white/70">Active Rx</p>
                <p className="text-3xl font-bold">{data.summary.active}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-white/70">Interactions</p>
                <p className={`text-3xl font-bold ${data.summary.interactions > 0 ? "text-yellow-300" : ""}`}>{data.summary.interactions}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-white/70">Insured</p>
                <p className="text-3xl font-bold">{data.summary.insuranceCovered}</p>
              </div>
            </div>
          </div>

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

                  return (
                    <div key={presc.id} className={`p-5 ${!check.safe ? "bg-red-50/40" : ""}`}>
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-base text-foreground">{presc.drugName}</p>
                            {!check.safe && <Badge variant="destructive" className="text-[9px]">⚠ CONFLICT</Badge>}
                            {check.safe && <Badge variant="success" className="text-[9px]">✓ SAFE</Badge>}
                            {isDispensed && <Badge variant="info" className="text-[9px]">DISPENSED</Badge>}
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
                      <div className={`px-3.5 py-3 rounded-2xl border mb-2 ${!check.safe ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <Brain className="w-3.5 h-3.5 text-violet-600" />
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">AI Dispense Safety Check</p>
                          <span className="text-[10px] font-mono text-muted-foreground ml-auto">Confidence: {Math.round(check.confidenceScore * 100)}%</span>
                        </div>
                        {check.warnings.map((w: string, i: number) => (
                          <p key={i} className="text-xs font-semibold text-foreground mb-1">{w}</p>
                        ))}

                        {/* Detailed Clinical References */}
                        {check.detailedWarnings && check.detailedWarnings.length > 0 && (
                          <div className="mt-2">
                            <button
                              onClick={() => setExpandedWarnings(prev => ({ ...prev, [presc.id]: !prev[presc.id] }))}
                              className="flex items-center gap-1.5 text-[10px] font-bold text-violet-700 hover:text-violet-900 transition-colors"
                            >
                              <BookOpen className="w-3 h-3" />
                              {expandedWarnings[presc.id] ? "Hide" : "Show"} Clinical References ({check.detailedWarnings.length})
                              {expandedWarnings[presc.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>

                            {expandedWarnings[presc.id] && (
                              <div className="mt-2 space-y-2">
                                {check.detailedWarnings.map((dw: any, wi: number) => (
                                  <div key={wi} className="rounded-xl bg-white/80 border border-red-100 p-3">
                                    <div className="flex items-start justify-between gap-2 mb-1.5">
                                      <div className="flex items-center gap-1.5">
                                        <FlaskConical className="w-3 h-3 text-red-500 shrink-0" />
                                        <p className="text-[11px] font-bold text-foreground">{dw.drugA} ↔ {dw.drugB}</p>
                                      </div>
                                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                        dw.severity === "CONTRAINDICATED" ? "bg-red-600 text-white" :
                                        dw.severity === "MAJOR" ? "bg-red-100 text-red-700" :
                                        dw.severity === "MODERATE" ? "bg-amber-100 text-amber-700" :
                                        "bg-yellow-100 text-yellow-700"
                                      }`}>{dw.severity}</span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground mb-1">
                                      <span className="font-semibold text-foreground">Mechanism: </span>{dw.mechanism}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground mb-1">
                                      <span className="font-semibold text-foreground">Clinical basis: </span>{dw.clinicalBasis}
                                    </p>
                                    <div className="flex items-start gap-1.5 mb-1">
                                      <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                                      <p className="text-[11px] font-semibold text-foreground">{dw.recommendation}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                      {dw.sources?.map((src: string, si: number) => (
                                        <span key={si} className="text-[9px] font-mono bg-violet-50 text-violet-700 border border-violet-100 px-1.5 py-0.5 rounded-md">{src}</span>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Insurance */}
                      <div className="flex items-center gap-4 px-3.5 py-2.5 bg-secondary rounded-2xl border border-border">
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
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-3xl bg-purple-100 flex items-center justify-center mx-auto mb-5">
            <Pill className="w-8 h-8 text-purple-600" />
          </div>
          <p className="text-xl font-bold text-foreground mb-2">Pharmacy Portal</p>
          <p className="text-sm text-muted-foreground max-w-sm">Enter a patient's National ID to view active prescriptions and dispense medications with AI safety verification.</p>
        </div>
      )}
    </Layout>
  );
}
