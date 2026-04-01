import React, { useState } from "react";
import { Layout } from "@/components/layout";
import { Sheet } from "@/components/shared";
import {
  Pill, Search, AlertTriangle, CheckCircle2, ShieldAlert,
  Brain, CreditCard, Zap, X, BookOpen, FlaskConical, Bell,
  Package, Radio, ChevronDown, ChevronUp, Shield, Syringe,
  BadgeCheck, AlertOctagon, Info
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

const DRUG_CATEGORIES: Record<string, { category: string; severity: "safe"|"moderate"|"high"|"critical"; label: string; contraindications: string[] }> = {
  metformin:    { category: "B", severity: "safe",     label: "Safe in most patients",              contraindications: ["eGFR < 30"] },
  amlodipine:   { category: "C", severity: "moderate", label: "Use with caution",                   contraindications: ["Severe aortic stenosis"] },
  atorvastatin: { category: "X", severity: "high",     label: "Contraindicated in pregnancy",       contraindications: ["Pregnancy", "Active liver disease"] },
  aspirin:      { category: "D", severity: "moderate", label: "Avoid in 3rd trimester",             contraindications: ["Bleeding disorders", "3rd trimester pregnancy"] },
  lisinopril:   { category: "D", severity: "high",     label: "Avoid in pregnancy/CKD",             contraindications: ["Pregnancy", "Bilateral renal artery stenosis"] },
  warfarin:     { category: "X", severity: "critical", label: "Critical monitoring required",       contraindications: ["Pregnancy", "Active bleeding", "Recent surgery"] },
  metoprolol:   { category: "C", severity: "moderate", label: "Monitor heart rate & BP",            contraindications: ["Severe bradycardia", "Cardiogenic shock"] },
  omeprazole:   { category: "C", severity: "safe",     label: "Generally well tolerated",           contraindications: [] },
  sitagliptin:  { category: "B", severity: "safe",     label: "Safe with dose adjustment",          contraindications: ["eGFR < 30 (dose reduce)"] },
  insulin:      { category: "B", severity: "safe",     label: "Safe — monitor glucose",             contraindications: ["Hypoglycemia"] },
  furosemide:   { category: "C", severity: "moderate", label: "Monitor electrolytes",               contraindications: ["Anuria", "Sulfonamide allergy"] },
  clopidogrel:  { category: "B", severity: "moderate", label: "Risk of bleeding",                   contraindications: ["Active bleeding", "Liver disease"] },
  ramipril:     { category: "D", severity: "high",     label: "Avoid in pregnancy",                 contraindications: ["Pregnancy", "Hyperkalemia"] },
  glimepiride:  { category: "C", severity: "moderate", label: "Monitor for hypoglycemia",           contraindications: ["Type 1 DM", "Sulfonamide allergy"] },
  allopurinol:  { category: "C", severity: "moderate", label: "Adjust for renal impairment",       contraindications: ["Acute gout attack", "Azathioprine co-use"] },
};

const DRUG_SEV_COLOR: Record<string, string> = {
  safe: "#16a34a", moderate: "#d97706", high: "#ea580c", critical: "#dc2626"
};

function getDrugCategory(drugName: string) {
  const key = drugName.toLowerCase().split(" ")[0] ?? "";
  return DRUG_CATEGORIES[key] ?? null;
}

function getStockStatus(inventory: any[] | undefined, drugName: string) {
  if (!inventory) return null;
  const key = drugName.split(" ")[0]?.toLowerCase() ?? "";
  const match = inventory.find((item: any) => {
    const itemKey = item.drugName.split(" ")[0]?.toLowerCase() ?? "";
    return itemKey === key || item.drugName.toLowerCase().includes(key) || drugName.toLowerCase().includes(itemKey);
  });
  if (!match) return null;
  return { status: match.status, daysOfStock: match.daysOfStock, stock: match.stock, unit: match.unit };
}

/* ═══════════════════════════════════════════════════════════ */
export default function PharmacyPortal() {
  const [searchId, setSearchId]       = useState("");
  const [nationalId, setNationalId]   = useState("");
  const [dispensing, setDispensing]   = useState<number | null>(null);
  const [dispensedResults, setDispensedResults] = useState<Record<number, any>>({});
  const [clinicalRefSheet, setClinicalRefSheet] = useState<{ presc: any; check: any } | null>(null);
  const [alertsOpen, setAlertsOpen]   = useState(true);

  const { alerts: sseAlerts, connected: sseConnected, unreadCount: sseUnread,
          markRead: markSseRead, clearAll: clearSseAlerts } = useSseAlerts("pharmacy");

  const qc = useQueryClient();

  const { data: supplyData } = useQuery({
    queryKey: ["supply-inventory-pharmacy"],
    queryFn: fetchSupplyInventory,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["pharmacy-patient", nationalId],
    queryFn:  () => fetchPharmacyPatient(nationalId),
    enabled:  !!nationalId,
    retry:    false,
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

      {/* ══════════════════════════════════════════════════
          FLOATING SSE ALERTS PANEL
      ══════════════════════════════════════════════════ */}
      {sseAlerts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] rounded-3xl overflow-hidden"
          style={{ background: "rgba(20,8,36,0.94)", backdropFilter: "blur(24px)", boxShadow: "0 20px 60px rgba(0,0,0,0.40), 0 0 0 1px rgba(147,51,234,0.25)" }}>
          <button onClick={() => setAlertsOpen(p => !p)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left"
            style={{ background: "rgba(147,51,234,0.22)", borderBottom: "1px solid rgba(147,51,234,0.20)" }}>
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-400" />
            </span>
            <span className="font-black text-sm text-white flex-1">Live Drug Safety Alerts</span>
            {sseUnread > 0 && (
              <span className="text-[10px] font-black text-white px-2 py-0.5 rounded-full" style={{ background: "rgba(234,88,12,0.60)" }}>{sseUnread}</span>
            )}
            <button onClick={e => { e.stopPropagation(); clearSseAlerts(); }}
              className="text-[11px] font-bold px-2 py-0.5 rounded-lg"
              style={{ color: "rgba(255,255,255,0.40)", background: "rgba(255,255,255,0.06)" }}>
              Clear
            </button>
            {alertsOpen ? <ChevronDown className="w-3.5 h-3.5 text-white/40" /> : <ChevronUp className="w-3.5 h-3.5 text-white/40" />}
          </button>
          {alertsOpen && (
            <div className="divide-y max-h-72 overflow-y-auto" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              {sseAlerts.map(alert => (
                <div key={alert.id} className={`px-4 py-3 flex items-start gap-3 ${alert.read ? "opacity-30" : ""}`}>
                  <ShieldAlert className={`mt-0.5 w-4 h-4 shrink-0 ${alert.severity === "critical" ? "text-red-400" : "text-amber-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white leading-snug">{alert.title}</p>
                    <p className="text-xs text-white/40 mt-0.5">
                      {alert.patientName}
                      {(alert as any).drugName && (alert as any).conflictingDrug ? ` · ${(alert as any).drugName} ↔ ${(alert as any).conflictingDrug}` : ""}
                    </p>
                    {(alert as any).recommendation && (
                      <p className="text-[10px] text-white/30 mt-0.5">{(alert as any).recommendation}</p>
                    )}
                  </div>
                  {!alert.read && (
                    <button onClick={() => { setSearchId(alert.nationalId ?? ""); setNationalId(alert.nationalId ?? ""); markSseRead(alert.id); }}
                      className="text-[10px] font-black text-white px-2.5 py-1 rounded-xl shrink-0"
                      style={{ background: "rgba(147,51,234,0.35)", border: "1px solid rgba(147,51,234,0.30)" }}>
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
          PHARMACY INTELLIGENCE HEADER
      ══════════════════════════════════════════════════ */}
      <div className="rounded-3xl overflow-hidden mb-6"
        style={{ background: "linear-gradient(135deg, #0d0618 0%, #1a0b2e 50%, #0f0520 100%)", boxShadow: "0 0 60px rgba(147,51,234,0.12)" }}>
        <div className="h-1" style={{ background: "linear-gradient(90deg, #581c87, #9333ea, #a855f7, #9333ea, #581c87)" }} />

        <div className="px-6 py-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(147,51,234,0.22)", border: "1px solid rgba(147,51,234,0.30)" }}>
                <Pill className="w-6 h-6 text-violet-400" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white leading-tight">Clinical Pharmacy Intelligence</h1>
                <p className="text-[11px] text-white/40 mt-0.5">AI Drug Safety · Interaction Engine · Insurance · MOH Formulary</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                style={{ background: sseConnected ? "rgba(34,197,94,0.10)" : "rgba(255,255,255,0.05)", border: sseConnected ? "1px solid rgba(34,197,94,0.20)" : "1px solid rgba(255,255,255,0.08)" }}>
                <Radio className="w-3 h-3" style={{ color: sseConnected ? "#86efac" : "rgba(255,255,255,0.30)" }} />
                <span className="text-[10px] font-black" style={{ color: sseConnected ? "#86efac" : "rgba(255,255,255,0.30)" }}>
                  {sseConnected ? "Interaction Engine · Live" : "Connecting..."}
                </span>
              </div>
              {sseUnread > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl animate-pulse"
                  style={{ background: "rgba(234,88,12,0.20)", border: "1px solid rgba(234,88,12,0.30)" }}>
                  <Bell className="w-3 h-3 text-orange-400" />
                  <span className="text-[10px] font-black text-orange-300">{sseUnread} drug alerts</span>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: "Drugs Monitored", value: "15K+",  sub: "MOH national formulary" },
              { label: "Safety Checks / Day", value: "47K+", sub: "AI-verified in real time" },
              { label: "Interaction Engine", value: "Live", sub: "9 clinical AI models" },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl px-4 py-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-xl font-black text-white">{s.value}</p>
                <p className="text-[10px] font-bold text-white/60 mt-0.5">{s.label}</p>
                <p className="text-[9px] text-white/30 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Pill className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "rgba(147,51,234,0.50)" }} />
              <input
                autoFocus
                value={searchId}
                onChange={e => setSearchId(e.target.value)}
                placeholder="Patient National ID — retrieve prescriptions with AI drug safety analysis..."
                className="w-full h-13 pl-11 pr-4 py-3.5 rounded-2xl text-sm font-mono text-white placeholder:text-white/20 focus:outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: searchId ? "1.5px solid rgba(147,51,234,0.55)" : "1px solid rgba(255,255,255,0.10)",
                  boxShadow: searchId ? "0 0 20px rgba(147,51,234,0.15)" : "none",
                }}
              />
            </div>
            <button type="submit"
              className="h-13 px-7 py-3.5 rounded-2xl flex items-center gap-2.5 font-black text-sm text-white transition-all hover:opacity-90 shrink-0"
              style={{ background: "linear-gradient(135deg, #9333ea, #7c3aed)", boxShadow: "0 4px 20px rgba(147,51,234,0.30)" }}>
              <Search className="w-4 h-4" /> Retrieve
            </button>
          </form>

          <div className="flex items-center gap-2 mt-3">
            <span className="text-[10px] font-bold text-white/25 uppercase tracking-wider">Demo:</span>
            {["1000000001","1000000003","1000000005"].map(id => (
              <button key={id} type="button"
                onClick={() => { setSearchId(id); setNationalId(id); }}
                className="font-mono text-[11px] font-bold px-3 py-1 rounded-lg transition-all hover:text-violet-300"
                style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {id}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── LOADING ── */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-14 h-14 rounded-3xl flex items-center justify-center" style={{ background: "rgba(147,51,234,0.12)", border: "1px solid rgba(147,51,234,0.20)" }}>
            <div className="w-6 h-6 rounded-full border-2 border-violet-200/20 border-t-violet-400 animate-spin" />
          </div>
          <p className="font-black text-foreground">Loading prescriptions...</p>
          <p className="text-sm text-muted-foreground">Running AI safety checks across MOH formulary</p>
        </div>
      )}

      {/* ── ERROR ── */}
      {error && !isLoading && (
        <div className="flex items-center gap-4 p-5 rounded-2xl" style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)" }}>
          <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
          <div>
            <p className="font-black text-red-700">Patient Not Found</p>
            <p className="text-sm text-muted-foreground mt-0.5">No pharmacy records for <span className="font-mono font-bold">{nationalId}</span></p>
          </div>
        </div>
      )}

      {/* ── EMPTY STATE ── */}
      {!nationalId && !isLoading && (
        <div className="space-y-5">
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, rgba(147,51,234,0.15), rgba(124,58,237,0.10))", border: "1px solid rgba(147,51,234,0.20)" }}>
              <Pill className="w-10 h-10 text-violet-500" />
            </div>
            <div>
              <p className="text-xl font-black text-foreground">Clinical Pharmacy Portal</p>
              <p className="text-sm text-muted-foreground max-w-sm mt-1 leading-relaxed">
                Enter a patient National ID to view prescriptions, run AI safety checks, and dispense medications with insurance verification.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Shield,     title: "AI Drug Safety",     desc: "Every dispense verified against 15K+ interactions",  color: "#9333ea" },
              { icon: CreditCard, title: "Insurance Live",     desc: "Real-time MOH insurance verification and copay",     color: "#0ea5e9" },
              { icon: Package,    title: "Live Inventory",     desc: "Stock levels and expiry from MOH supply network",    color: "#f97316" },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="p-5 rounded-2xl" style={{ background: "rgba(147,51,234,0.04)", border: "1px solid rgba(147,51,234,0.10)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${f.color}15`, border: `1px solid ${f.color}20` }}>
                    <Icon className="w-5 h-5" style={{ color: f.color }} />
                  </div>
                  <p className="text-sm font-black text-foreground mb-1">{f.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          PATIENT DATA
      ══════════════════════════════════════════════════ */}
      {data && !isLoading && (
        <div className="space-y-5">

          {/* ── PATIENT BANNER ── */}
          <div className="rounded-3xl overflow-hidden" style={{ border: "1px solid rgba(147,51,234,0.18)", background: "linear-gradient(135deg, rgba(147,51,234,0.06) 0%, rgba(124,58,237,0.03) 100%)" }}>
            {/* Allergy strip */}
            {data.patient.allergies?.length > 0 && (
              <div className="flex items-center gap-2.5 px-5 py-2.5" style={{ background: "linear-gradient(90deg, #b91c1c, #dc2626)" }}>
                <AlertTriangle className="w-3.5 h-3.5 text-white shrink-0" />
                <p className="text-xs font-black uppercase tracking-widest text-white">Known Allergies: {data.patient.allergies.join(", ")}</p>
              </div>
            )}
            {/* Interaction warning */}
            {data.summary.interactions > 0 && (
              <div className="flex items-center gap-2.5 px-5 py-2" style={{ background: "rgba(245,158,11,0.12)", borderBottom: "1px solid rgba(245,158,11,0.15)", borderLeft: "4px solid #f59e0b" }}>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <p className="text-xs font-black text-amber-800 uppercase tracking-widest">
                  {data.summary.interactions} Drug Interaction{data.summary.interactions > 1 ? "s" : ""} Detected — Review Before Dispensing
                </p>
              </div>
            )}

            <div className="flex items-center justify-between gap-6 px-6 py-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl text-white shrink-0"
                  style={{ background: "linear-gradient(135deg, rgba(147,51,234,0.30), rgba(88,28,135,0.25))", border: "1px solid rgba(147,51,234,0.25)" }}>
                  {String(data.patient.name).split(" ").map((n: string) => n[0]).slice(0,2).join("")}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Patient Record</p>
                  <p className="text-2xl font-black text-foreground">{data.patient.name}</p>
                  <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                    <span className="font-mono text-xs px-2.5 py-0.5 rounded-xl text-muted-foreground" style={{ background: "rgba(147,51,234,0.08)", border: "1px solid rgba(147,51,234,0.15)" }}>{data.patient.nationalId}</span>
                    <span className="text-xs text-muted-foreground">Age {data.patient.age}</span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full" style={{ background: "rgba(220,38,38,0.10)", color: "#dc2626", border: "1px solid rgba(220,38,38,0.18)" }}>Blood: {data.patient.bloodType}</span>
                  </div>
                  {data.patient.chronicConditions?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {data.patient.chronicConditions.map((c: string) => (
                        <span key={c} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{c}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-6 shrink-0">
                {[
                  { label: "Active Rx",     value: String(data.summary.active),                           color: "#9333ea" },
                  { label: "Interactions",  value: String(data.summary.interactions),                    color: data.summary.interactions > 0 ? "#d97706" : "#22c55e" },
                  { label: "Insured",       value: String(data.summary.insuranceCovered),                color: "#0ea5e9" },
                ].map((s, i) => (
                  <div key={i} className="text-center">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1">{s.label}</p>
                    <p className="text-3xl font-black tabular-nums" style={{ color: s.color }}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── PRESCRIPTIONS ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Pill className="w-3.5 h-3.5 text-violet-500" /> Active Prescriptions
              </p>
              <span className="text-[10px] font-bold text-muted-foreground px-2.5 py-1 rounded-full bg-secondary">{data.prescriptions.length} prescriptions</span>
            </div>

            {data.prescriptions.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-3 text-center rounded-3xl" style={{ border: "1px solid rgba(147,51,234,0.10)" }}>
                <Pill className="w-10 h-10 text-muted-foreground/30" />
                <p className="font-bold text-foreground">No active prescriptions</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.prescriptions.map((presc: any) => {
                  const dispensedResult = dispensedResults[presc.id];
                  const isDispensed     = !!dispensedResult;
                  const check           = presc.dispenseCheck;
                  const ins             = presc.insurance;
                  const stock           = getStockStatus(supplyData?.inventory, presc.drugName);
                  const drugCat         = getDrugCategory(presc.drugName);
                  const isSafe          = check.safe;
                  const accentColor     = isSafe ? "#9333ea" : "#dc2626";
                  const stockColor      = stock?.status === "critical" ? "#dc2626" : stock?.status === "low" ? "#d97706" : "#16a34a";

                  return (
                    <div key={presc.id} className="rounded-3xl overflow-hidden" style={{
                      border: `1px solid ${isSafe ? "rgba(147,51,234,0.18)" : "rgba(220,38,38,0.25)"}`,
                      borderLeft: `4px solid ${accentColor}`,
                      background: isSafe ? "rgba(147,51,234,0.03)" : "rgba(220,38,38,0.04)",
                    }}>

                      {/* ── Prescription Header ── */}
                      <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                        <div className="flex-1 min-w-0">
                          {/* Drug name + status badges */}
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <p className="text-xl font-black text-foreground">{presc.drugName}</p>
                            {/* Safe / conflict badge */}
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full text-white"
                              style={{ background: isSafe ? "#16a34a" : "#dc2626" }}>
                              {isSafe ? <BadgeCheck className="w-2.5 h-2.5" /> : <AlertOctagon className="w-2.5 h-2.5" />}
                              {isSafe ? "SAFE" : "CONFLICT"}
                            </span>
                            {/* Dispensed badge */}
                            {isDispensed && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full text-white bg-sky-600">
                                <CheckCircle2 className="w-2.5 h-2.5" /> DISPENSED
                              </span>
                            )}
                            {/* Stock badge */}
                            {stock && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: `${stockColor}12`, color: stockColor, border: `1px solid ${stockColor}25` }}>
                                <Package className="w-2.5 h-2.5" />
                                {stock.status === "critical" ? `CRITICAL — ${stock.daysOfStock}d left` :
                                 stock.status === "low"      ? `LOW — ${stock.daysOfStock}d left`      : `In Stock · ${stock.daysOfStock}d`}
                              </span>
                            )}
                          </div>
                          {/* Dosage row */}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            <span className="font-black text-foreground font-mono">{presc.dosage}</span>
                            <span>·</span>
                            <span>{presc.frequency}</span>
                            <span>·</span>
                            <span className="flex items-center gap-1"><Syringe className="w-3 h-3" /> {presc.prescribedBy}</span>
                            <span>·</span>
                            <span>{presc.hospital}</span>
                          </div>
                        </div>

                        {/* Dispense button */}
                        <div className="shrink-0">
                          {!isDispensed ? (
                            <button
                              onClick={() => { setDispensing(presc.id); dispenseMutation.mutate({ id: presc.id }); }}
                              disabled={dispenseMutation.isPending}
                              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm text-white transition-all hover:opacity-90 disabled:opacity-50"
                              style={{
                                background: isSafe
                                  ? "linear-gradient(135deg, #9333ea, #7c3aed)"
                                  : "linear-gradient(135deg, #dc2626, #9b1c1c)",
                                boxShadow: `0 4px 16px ${isSafe ? "rgba(147,51,234,0.30)" : "rgba(220,38,38,0.30)"}`,
                              }}>
                              <Zap className="w-3.5 h-3.5" />
                              {dispensing === presc.id ? "Dispensing..." : isSafe ? "Dispense" : "Override & Dispense"}
                            </button>
                          ) : (
                            <div className="flex items-center gap-2 text-sm font-black text-emerald-600">
                              <CheckCircle2 className="w-5 h-5" />
                              Dispensed
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ── FDA Drug Classification ── */}
                      {drugCat && (
                        <div className="px-5 py-3 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)", background: "rgba(0,0,0,0.02)" }}>
                          {/* Category badge */}
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-base text-white shrink-0"
                            style={{ background: DRUG_SEV_COLOR[drugCat.severity] }}>
                            {drugCat.category}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-foreground">FDA Category {drugCat.category}</span>
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full"
                                style={{ background: `${DRUG_SEV_COLOR[drugCat.severity]}15`, color: DRUG_SEV_COLOR[drugCat.severity] }}>
                                {drugCat.severity}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{drugCat.label}</p>
                          </div>
                          {drugCat.contraindications.length > 0 && (
                            <div className="shrink-0 flex items-center gap-1.5">
                              <span className="text-[9px] font-bold text-muted-foreground uppercase">Contraindicated:</span>
                              {drugCat.contraindications.slice(0, 2).map((c, j) => (
                                <span key={j} className="text-[9px] font-bold px-1.5 py-0.5 rounded-lg text-foreground bg-secondary">{c}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── AI Safety Check ── */}
                      <div className="px-5 py-3" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)", background: isSafe ? "rgba(34,197,94,0.04)" : "rgba(220,38,38,0.05)" }}>
                        <div className="flex items-center gap-2 mb-2">
                          <Brain className="w-3.5 h-3.5 text-violet-500" />
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">AI Dispense Safety Check</p>
                          <span className="text-[9px] font-mono text-muted-foreground ml-auto">Confidence: {Math.round(check.confidenceScore * 100)}%</span>
                          {isSafe
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            : <AlertOctagon className="w-4 h-4 text-red-500 animate-pulse" />
                          }
                        </div>
                        <div className="space-y-1">
                          {check.warnings.map((w: string, i: number) => (
                            <p key={i} className="text-xs font-semibold text-foreground">{w}</p>
                          ))}
                        </div>
                        {check.detailedWarnings?.length > 0 && (
                          <button
                            onClick={() => setClinicalRefSheet({ presc, check })}
                            className="mt-2 flex items-center gap-1.5 text-[10px] font-bold transition-opacity hover:opacity-70"
                            style={{ color: "#9333ea" }}>
                            <BookOpen className="w-3 h-3" />
                            View {check.detailedWarnings.length} Clinical Reference{check.detailedWarnings.length !== 1 ? "s" : ""}
                          </button>
                        )}
                      </div>

                      {/* ── Insurance ── */}
                      <div className="flex items-center gap-4 px-5 py-3">
                        <CreditCard className="w-4 h-4 text-sky-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Insurance · {ins.provider}</p>
                          <p className="text-xs text-foreground">{ins.notes}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 text-xs">
                          <div className="text-center">
                            <p className="text-[9px] text-muted-foreground">Coverage</p>
                            <p className="font-black text-foreground">{ins.eligible ? `${ins.coveragePercent}%` : "Not Covered"}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[9px] text-muted-foreground">Copay</p>
                            <p className="font-black text-foreground">SAR {ins.copay}</p>
                          </div>
                          {ins.preAuthRequired && (
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full text-amber-700" style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.20)" }}>Pre-Auth Req.</span>
                          )}
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-full text-white"
                            style={{ background: ins.eligible ? "#16a34a" : "#dc2626" }}>
                            {ins.eligible ? "Eligible" : "Not Eligible"}
                          </span>
                        </div>
                      </div>

                      {/* Dispense success result */}
                      {dispensedResult && (
                        <div className="px-5 py-3 flex items-center gap-3" style={{ borderTop: "1px solid rgba(34,197,94,0.15)", background: "rgba(34,197,94,0.06)" }}>
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-emerald-700">Dispensed successfully by {dispensedResult.dispensedBy}</p>
                            <p className="text-[10px] text-emerald-600">{dispensedResult.message ?? "Patient counselled on usage and side effects"}</p>
                          </div>
                          {dispensedResult.auditRef && (
                            <span className="text-[9px] font-mono text-emerald-600/60">Audit #{dispensedResult.auditRef}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          CLINICAL REFERENCES SHEET
      ══════════════════════════════════════════════════ */}
      <Sheet
        open={!!clinicalRefSheet}
        onClose={() => setClinicalRefSheet(null)}
        title="Clinical Drug Safety References"
        subtitle={clinicalRefSheet ? `${clinicalRefSheet.presc.drugName} · ${clinicalRefSheet.check.detailedWarnings.length} interaction${clinicalRefSheet.check.detailedWarnings.length !== 1 ? "s" : ""}` : ""}
        width="max-w-2xl"
      >
        {clinicalRefSheet && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-secondary">
              <Brain className="w-4 h-4 text-violet-600" />
              <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">AI Safety Check</span>
              <span className="text-xs font-mono text-muted-foreground ml-auto">Confidence: {Math.round(clinicalRefSheet.check.confidenceScore * 100)}%</span>
            </div>
            {clinicalRefSheet.check.detailedWarnings.map((dw: any, wi: number) => {
              const sevColor = dw.severity === "critical" ? "#dc2626" : dw.severity === "high" ? "#ea580c" : dw.severity === "moderate" ? "#d97706" : "#6b7280";
              return (
                <div key={wi} className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${sevColor}20`, borderLeft: `3px solid ${sevColor}` }}>
                  <div className="flex items-start justify-between gap-2 px-4 py-3" style={{ background: `${sevColor}08`, borderBottom: `1px solid ${sevColor}12` }}>
                    <div className="flex items-center gap-2">
                      <FlaskConical className="w-4 h-4 text-red-500 shrink-0" />
                      <p className="text-sm font-black text-foreground">{dw.text}</p>
                    </div>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full text-white shrink-0" style={{ background: sevColor }}>
                      {dw.severity?.toUpperCase()}
                    </span>
                  </div>
                  <div className="px-4 py-3 space-y-2 text-xs text-muted-foreground">
                    <p><span className="font-semibold text-foreground">Mechanism: </span>{dw.mechanism}</p>
                    <p><span className="font-semibold text-foreground">Clinical basis: </span>{dw.clinicalBasis}</p>
                    <div className="flex items-start gap-1.5 pt-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <p className="font-semibold text-foreground">{dw.recommendation}</p>
                    </div>
                    {(dw.source || dw.sources?.length > 0) && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(dw.source ? dw.source.split(" · ") : dw.sources ?? []).map((src: string, si: number) => (
                          <span key={si} className="text-[9px] font-mono bg-background text-primary border border-border px-2 py-0.5 rounded-lg">{src}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Sheet>
    </Layout>
  );
}
