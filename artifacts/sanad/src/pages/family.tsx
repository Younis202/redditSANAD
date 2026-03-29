import React, { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardHeader, CardTitle, CardBody, Input, Button, Badge, PageHeader, DataLabel, StatusDot } from "@/components/shared";
import { Users, Search, Heart, AlertTriangle, Shield, Dna, CalendarDays, Activity, User, X, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

async function fetchFamilyData(nationalId: string) {
  const res = await fetch(`/api/family/patient/${nationalId}`);
  if (!res.ok) throw new Error("Not found");
  return res.json();
}

const RISK_LEVEL_CONFIG = {
  high: { color: "text-red-700", bg: "bg-red-50", border: "border-red-200", badge: "destructive" as const },
  medium: { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", badge: "warning" as const },
  low: { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", badge: "success" as const },
};

export default function FamilyPortal() {
  const [searchId, setSearchId] = useState("");
  const [nationalId, setNationalId] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["family-data", nationalId],
    queryFn: () => fetchFamilyData(nationalId),
    enabled: !!nationalId,
    retry: false,
  });

  return (
    <Layout role="family">
      <div className="flex items-center gap-2 mb-5">
        <div className="flex items-center gap-2 bg-pink-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-full uppercase tracking-widest">
          <Users className="w-3 h-3" />
          Family Health Portal
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-violet-600 bg-violet-50 px-3 py-1.5 rounded-full ml-auto">
          <Dna className="w-3 h-3" />
          Genetic Risk Intelligence Active
        </div>
      </div>

      <div className="flex items-start justify-between mb-6">
        <PageHeader title="Family Health & Genetic Risk Portal" subtitle="Map familial disease inheritance, shared genetic risks, and coordinate family-wide preventive screening." />
        <form onSubmit={(e) => { e.preventDefault(); if (searchId.trim()) setNationalId(searchId.trim()); }} className="flex items-center gap-2 shrink-0 ml-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input placeholder="National ID..." className="pl-9 w-52" value={searchId} onChange={(e) => setSearchId(e.target.value)} />
          </div>
          <Button type="submit" size="md">Load Family Profile</Button>
        </form>
      </div>

      {!nationalId && (
        <Card>
          <CardBody className="py-16 text-center">
            <div className="w-16 h-16 rounded-3xl bg-pink-50 flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7 text-pink-500" />
            </div>
            <p className="font-bold text-foreground mb-1">No Family Profile Selected</p>
            <p className="text-sm text-muted-foreground mb-2">Enter a National ID to load genetic risk and family health data.</p>
            <p className="text-xs text-muted-foreground font-mono bg-secondary inline-block px-3 py-1.5 rounded-xl">Demo: 1000000001 · 1000000003 · 1000000005</p>
          </CardBody>
        </Card>
      )}

      {isLoading && <div className="flex items-center gap-3 py-16 text-muted-foreground justify-center"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-pink-500" /><span className="text-sm">Loading family health data...</span></div>}
      {isError && nationalId && (
        <Card className="border-red-200 bg-red-50">
          <CardBody className="flex items-center gap-3 p-4">
            <X className="w-4 h-4 text-red-500" />
            <p className="text-sm text-red-700">Patient not found for <span className="font-mono">{nationalId}</span></p>
          </CardBody>
        </Card>
      )}

      {data && (
        <div className="space-y-5">
          {/* Family Risk Alert */}
          {data.familyRiskAlert && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border-2 border-red-300 rounded-3xl">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm font-bold text-red-800">{data.familyRiskAlert}</p>
            </div>
          )}

          {/* Patient Banner */}
          <Card>
            <CardBody className="p-0">
              <div className="flex items-stretch divide-x divide-border">
                <div className="flex-1 p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-pink-50 flex items-center justify-center shrink-0">
                    <User className="w-6 h-6 text-pink-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{data.patient?.fullName}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-xs bg-secondary px-2.5 py-1 rounded-xl">{data.patient?.nationalId}</span>
                      <span className="text-xs text-muted-foreground">Age {data.patient?.age} · {data.patient?.gender}</span>
                      <span className="text-xs font-bold text-red-600">{data.patient?.bloodType}</span>
                    </div>
                  </div>
                </div>
                <div className={`px-6 py-4 flex flex-col items-center justify-center min-w-[130px] ${data.heritabilityScore >= 70 ? "bg-red-50" : data.heritabilityScore >= 50 ? "bg-amber-50" : "bg-emerald-50"}`}>
                  <DataLabel label="Heritability Score">
                    <p className={`text-3xl font-bold ${data.heritabilityScore >= 70 ? "text-red-600" : data.heritabilityScore >= 50 ? "text-amber-600" : "text-emerald-600"}`}>{data.heritabilityScore}</p>
                  </DataLabel>
                  <p className="text-xs text-muted-foreground mt-1">out of 100</p>
                </div>
                <div className="px-6 py-4 flex flex-col items-center justify-center min-w-[130px]">
                  <DataLabel label="AI Risk Score">
                    <p className="text-3xl font-bold text-foreground">{data.patient?.riskScore}</p>
                  </DataLabel>
                  <p className="text-xs text-muted-foreground mt-1">/ 100</p>
                </div>
                <div className="px-6 py-4 flex flex-col items-center justify-center min-w-[130px]">
                  <DataLabel label="Conditions">
                    <p className="text-2xl font-bold text-foreground">{data.patient?.chronicConditions?.length}</p>
                  </DataLabel>
                  <p className="text-xs text-muted-foreground mt-1">chronic conditions</p>
                </div>
              </div>
            </CardBody>
          </Card>

          <div className="grid grid-cols-12 gap-5">
            {/* Genetic Risks */}
            <Card className="col-span-7">
              <CardHeader>
                <div className="flex items-center gap-2"><Dna className="w-4 h-4 text-violet-600" /><CardTitle>Genetic Risk Analysis</CardTitle></div>
                <Badge variant={data.geneticRisks?.filter((r: any) => r.riskLevel === "high").length > 0 ? "destructive" : "success"}>
                  {data.geneticRisks?.filter((r: any) => r.riskLevel === "high").length} high-risk factors
                </Badge>
              </CardHeader>
              <CardBody className="space-y-3">
                {data.geneticRisks?.map((risk: any, i: number) => {
                  const cfg = RISK_LEVEL_CONFIG[risk.riskLevel as keyof typeof RISK_LEVEL_CONFIG] ?? RISK_LEVEL_CONFIG.low;
                  return (
                    <div key={i} className={`p-4 ${cfg.bg} border ${cfg.border} rounded-2xl`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Heart className={`w-4 h-4 ${cfg.color} shrink-0`} />
                        <p className={`text-sm font-bold ${cfg.color}`}>{risk.condition}</p>
                        <Badge variant={cfg.badge} className="ml-auto shrink-0">{risk.riskLevel}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1.5"><span className="font-semibold text-foreground">Inheritance:</span> {risk.inheritanceType}</p>
                      <div className="flex items-start gap-2">
                        <ChevronRight className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                        <p className="text-xs text-foreground">{risk.recommendation}</p>
                      </div>
                    </div>
                  );
                })}
              </CardBody>
            </Card>

            {/* Family Members */}
            <Card className="col-span-5">
              <CardHeader>
                <div className="flex items-center gap-2"><Users className="w-4 h-4 text-primary" /><CardTitle>Family Members</CardTitle></div>
                <Badge variant="default">{data.familyMembers?.length} linked</Badge>
              </CardHeader>
              <CardBody className="space-y-3">
                {data.familyMembers?.length > 0 ? data.familyMembers.map((member: any, i: number) => (
                  <div key={i} className="p-3.5 bg-secondary rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{member.fullName}</p>
                        <p className="text-xs text-muted-foreground">{member.relationship} · Age {member.age}</p>
                      </div>
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${member.riskScore >= 70 ? "bg-red-100 text-red-700" : member.riskScore >= 40 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                        {member.riskScore}
                      </div>
                    </div>
                    {member.sharedConditions?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mr-1">Shared:</span>
                        {member.sharedConditions.map((c: string, j: number) => (
                          <span key={j} className="text-[10px] font-semibold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">{c}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )) : <p className="text-sm text-muted-foreground">No linked family members found in this system.</p>}
              </CardBody>
            </Card>

            {/* Screening Recommendations */}
            <Card className="col-span-12">
              <CardHeader>
                <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-600" /><CardTitle>Family-Wide Screening Recommendations</CardTitle></div>
                <Badge variant="success">{data.screeningRecommendations?.length} tests recommended</Badge>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-2 gap-3">
                  {data.screeningRecommendations?.map((rec: any, i: number) => (
                    <div key={i} className={`flex items-start gap-3 p-4 rounded-2xl border ${rec.priority === "high" ? "bg-amber-50 border-amber-200" : rec.priority === "medium" ? "bg-sky-50 border-sky-200" : "bg-secondary border-border"}`}>
                      <CalendarDays className={`w-4 h-4 shrink-0 mt-0.5 ${rec.priority === "high" ? "text-amber-600" : rec.priority === "medium" ? "text-sky-600" : "text-muted-foreground"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground">{rec.test}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{rec.for}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] font-semibold bg-white/60 border border-border px-2 py-0.5 rounded-full text-muted-foreground">{rec.frequency}</span>
                          <Badge variant={rec.priority === "high" ? "warning" : rec.priority === "medium" ? "info" : "outline"} className="text-[10px]">{rec.priority}</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </Layout>
  );
}
