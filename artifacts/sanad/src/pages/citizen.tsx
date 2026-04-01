import React, { useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import {
  Card, CardHeader, CardTitle, CardBody,
  Input, Button, Badge, StatusDot
} from "@/components/shared";
import { useGetPatientByNationalId } from "@workspace/api-client-react";
import { useAiDecision } from "@/hooks/use-ai-decision";
import { useQuery, useMutation } from "@tanstack/react-query";

async function fetchDepartments() {
  const res = await fetch("/api/appointments/departments");
  if (!res.ok) throw new Error("Failed");
  return res.json() as Promise<{ departments: string[]; services: Record<string, string[]> }>;
}
async function fetchHospitals() {
  const res = await fetch("/api/appointments/hospitals");
  if (!res.ok) throw new Error("Failed");
  return res.json() as Promise<{ hospitals: string[] }>;
}
async function fetchSlots(date: string, hospital: string, department: string) {
  const p = new URLSearchParams({ date, hospital, department });
  const res = await fetch(`/api/appointments/slots?${p}`);
  if (!res.ok) throw new Error("Failed");
  return res.json() as Promise<{ slots: string[] }>;
}
async function fetchPatientAppointments(patientId: number) {
  const res = await fetch(`/api/appointments/patient/${patientId}`);
  if (!res.ok) throw new Error("Failed");
  return res.json() as Promise<{ appointments: any[] }>;
}
async function bookAppointment(payload: object) {
  const res = await fetch("/api/appointments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed to book"); }
  return res.json();
}

import {
  Bell, FileText, Activity, Pill, FlaskConical, User, Lock, CalendarDays,
  AlertCircle, Heart, TrendingUp, TrendingDown, CheckCircle2, ShieldAlert,
  Lightbulb, Star, ArrowRight, Stethoscope, Minus, Info, Brain, ArrowUpRight,
  Building2, Clock, X, MapPin, Sparkles, Users, Network, Shield, Truck,
  ShieldCheck, HeartHandshake, BarChart2, LogOut, ChevronRight
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, ReferenceLine
} from "recharts";
import { format } from "date-fns";

function computeHealthScore(patient: {
  dateOfBirth: string;
  chronicConditions?: string[] | null;
  allergies?: string[] | null;
  medications?: Array<{ isActive: boolean }> | null;
  labResults?: Array<{ status: string }> | null;
  visits?: Array<{ visitDate: string; visitType: string }> | null;
}): { score: number; grade: "A" | "B" | "C" | "D" | "F"; label: string; color: string; arcColor: string; summary: string } {
  let score = 100;
  const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear();
  if (age >= 75) score -= 20;
  else if (age >= 60) score -= 10;
  else if (age >= 45) score -= 5;

  const conditions = patient.chronicConditions || [];
  const highRisk = ["heart failure", "coronary artery disease", "chronic kidney disease", "ckd", "cancer", "copd", "cirrhosis"];
  const modRisk = ["hypertension", "diabetes", "atrial fibrillation", "stroke", "depression"];
  for (const c of conditions) {
    const cl = c.toLowerCase();
    if (highRisk.some(h => cl.includes(h))) score -= 18;
    else if (modRisk.some(m => cl.includes(m))) score -= 10;
    else score -= 5;
  }

  const activeMeds = (patient.medications || []).filter(m => m.isActive).length;
  if (activeMeds >= 5) score -= 15;
  else if (activeMeds >= 3) score -= 7;

  const labs = patient.labResults || [];
  score -= labs.filter(l => l.status === "critical").length * 15;
  score -= labs.filter(l => l.status === "abnormal").length * 7;

  const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  score -= (patient.visits || []).filter(v => v.visitType === "emergency" && new Date(v.visitDate) >= sixMonthsAgo).length * 8;
  score = Math.max(0, Math.min(100, score));

  if (score >= 85) return { score, grade: "A", label: "Excellent", color: "#22c55e", arcColor: "#22c55e", summary: "Your health indicators are in great shape. Keep up your healthy habits!" };
  if (score >= 70) return { score, grade: "B", label: "Good", color: "#38bdf8", arcColor: "#38bdf8", summary: "Your health is generally good. A few areas could benefit from attention." };
  if (score >= 55) return { score, grade: "C", label: "Fair", color: "#eab308", arcColor: "#eab308", summary: "Some health factors need monitoring. Follow your doctor's recommendations." };
  if (score >= 40) return { score, grade: "D", label: "Needs Attention", color: "#f97316", arcColor: "#f97316", summary: "Multiple health concerns detected. Regular medical follow-up is important." };
  return { score, grade: "F", label: "High Risk", color: "#ef4444", arcColor: "#ef4444", summary: "Significant health risks identified. Please see your doctor as soon as possible." };
}

function generateRecommendations(patient: {
  dateOfBirth: string;
  chronicConditions?: string[] | null;
  labResults?: Array<{ testName: string; status: string; result: string; unit?: string | null }> | null;
  medications?: Array<{ isActive: boolean; drugName: string }> | null;
  visits?: Array<{ visitDate: string }> | null;
}): Array<{ icon: React.ElementType; title: string; description: string; priority: "high" | "medium" | "low"; category: string }> {
  const recs: Array<{ icon: React.ElementType; title: string; description: string; priority: "high" | "medium" | "low"; category: string }> = [];
  const conditions = (patient.chronicConditions || []).map(c => c.toLowerCase());
  const criticalLabs = (patient.labResults || []).filter(l => l.status === "critical");
  const abnormalLabs = (patient.labResults || []).filter(l => l.status === "abnormal");
  const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear();
  const allLabs = patient.labResults || [];
  const hba1cLab = allLabs.find(l => l.testName.toLowerCase().includes("hba1c") || l.testName.toLowerCase().includes("glycated"));
  const glucoseLab = allLabs.find(l => l.testName.toLowerCase().includes("glucose") && !l.testName.toLowerCase().includes("hba1c"));
  const creatinineLab = allLabs.find(l => l.testName.toLowerCase().includes("creatinine"));
  const hemoglobinLab = allLabs.find(l => l.testName.toLowerCase().includes("hemoglobin") || l.testName.toLowerCase().includes("hgb"));

  if (criticalLabs.length > 0) recs.push({ icon: ShieldAlert, title: "Critical Lab Results Require Attention", description: `${criticalLabs.length} lab result(s) are in the critical range: ${criticalLabs.map(l => l.testName).join(", ")}. Contact your doctor immediately.`, priority: "high", category: "Urgent" });
  if (abnormalLabs.length > 0 && criticalLabs.length === 0) recs.push({ icon: FlaskConical, title: "Follow Up on Abnormal Lab Results", description: `${abnormalLabs.length} test(s) showed abnormal results. Schedule a follow-up appointment to review these with your doctor.`, priority: "medium", category: "Lab Results" });

  if (conditions.some(c => c.includes("diabetes") || c.includes("type 1") || c.includes("type 2"))) {
    const hba1cValue = hba1cLab ? parseFloat(hba1cLab.result) : null;
    const glucoseValue = glucoseLab ? parseFloat(glucoseLab.result) : null;
    const hba1cStatus = hba1cValue !== null
      ? hba1cValue > 9 ? `Your HbA1c is ${hba1cValue}% — significantly above target. Urgent review needed.`
      : hba1cValue > 8 ? `Your HbA1c is ${hba1cValue}% — above 8%. Your doctor may need to adjust your medications.`
      : hba1cValue > 7 ? `Your HbA1c is ${hba1cValue}% — slightly above the 7% target. Reduce refined carbohydrates and increase activity.`
      : `Your HbA1c is ${hba1cValue}% — within target. Keep up the excellent work.`
      : "Check your fasting blood glucose every morning and after meals. Target HbA1c below 7%.";
    recs.push({ icon: Activity, title: hba1cValue !== null && hba1cValue > 8 ? "HbA1c Above Target — Action Required" : "Monitor Blood Sugar Daily", description: `${hba1cStatus}${glucoseValue !== null ? ` Latest glucose: ${glucoseValue} ${glucoseLab?.unit ?? "mmol/L"}.` : ""} Avoid sugary foods and refined carbohydrates.`, priority: hba1cValue !== null && hba1cValue > 8 ? "high" : "medium", category: "Diabetes Management" });
    recs.push({ icon: Stethoscope, title: "Annual Diabetic Screening", description: `Get annual eye exam (diabetic retinopathy), kidney function tests (creatinine${creatinineLab ? ` — current: ${creatinineLab.result} ${creatinineLab.unit ?? ""}` : ""}), and foot examination to detect complications early.`, priority: "medium", category: "Preventive Care" });
  }

  if (conditions.some(c => c.includes("hypertension") || c.includes("blood pressure"))) recs.push({ icon: Heart, title: "Monitor Blood Pressure Regularly", description: "Check your blood pressure at least twice a week. Target: below 130/80 mmHg (ESC/ESH 2023). Reduce salt to < 5 g/day, increase potassium-rich foods, and manage stress.", priority: "high", category: "Cardiovascular" });
  if (conditions.some(c => c.includes("heart"))) recs.push({ icon: Heart, title: "Cardiac Monitoring", description: "Avoid strenuous activity without medical clearance. Know the warning signs: chest pain, shortness of breath, or sudden dizziness — call 911 immediately. Take all cardiac medications as prescribed.", priority: "high", category: "Cardiovascular" });

  if (conditions.some(c => c.includes("ckd") || c.includes("kidney") || c.includes("renal"))) {
    const creatinineNote = creatinineLab ? ` Your latest creatinine: ${creatinineLab.result} ${creatinineLab.unit ?? "µmol/L"} (${creatinineLab.status === "normal" ? "within range" : "above normal — monitor closely"}).` : "";
    recs.push({ icon: FlaskConical, title: "Protect Your Kidneys", description: `Stay well hydrated (1.5–2 L/day). Avoid NSAIDs (ibuprofen, naproxen).${creatinineNote} Limit protein intake as advised. eGFR check every 3 months (KDIGO 2022).`, priority: "high", category: "Kidney Health" });
  }

  if (conditions.some(c => c.includes("asthma") || c.includes("copd"))) recs.push({ icon: Activity, title: "Respiratory Health", description: "Always carry your rescue inhaler. Avoid smoke, dust, and strong odors. Get annual flu vaccine and pneumococcal vaccine. Track your peak flow readings (GOLD 2024).", priority: "medium", category: "Respiratory" });
  if (hemoglobinLab && hemoglobinLab.status !== "normal") recs.push({ icon: FlaskConical, title: "Low Hemoglobin — Anemia Monitoring", description: `Your hemoglobin is ${hemoglobinLab.result} ${hemoglobinLab.unit ?? "g/dL"} — below normal range. Increase iron-rich foods (red meat, lentils, spinach). Your doctor may prescribe iron supplements.`, priority: hemoglobinLab.status === "critical" ? "high" : "medium", category: "Blood Health" });

  const activeMeds = (patient.medications || []).filter(m => m.isActive);
  if (activeMeds.length >= 3) recs.push({ icon: Pill, title: "Medication Adherence", description: `You are on ${activeMeds.length} medications. Set daily reminders and never skip doses without consulting your doctor. Bring your medication list to every appointment.`, priority: "medium", category: "Medications" });

  const lastVisitDate = patient.visits?.[0]?.visitDate;
  const daysSinceVisit = lastVisitDate ? Math.floor((Date.now() - new Date(lastVisitDate).getTime()) / (1000 * 60 * 60 * 24)) : 999;
  if (daysSinceVisit > 180 && conditions.length > 0) recs.push({ icon: CalendarDays, title: "Schedule a Routine Check-up", description: `It has been ${Math.round(daysSinceVisit / 30)} months since your last recorded visit. Regular check-ups are essential for managing your conditions.`, priority: "medium", category: "Preventive Care" });
  if (age >= 50) recs.push({ icon: Stethoscope, title: "Age-Appropriate Screenings", description: age >= 65 ? "At your age, annual screenings for colon cancer, osteoporosis, and cardiovascular disease are recommended. Discuss vaccination schedules with your doctor." : "Consider screenings for colorectal cancer (colonoscopy), blood pressure, cholesterol, and diabetes if not already monitored.", priority: "medium", category: "Preventive Care" });
  recs.push({ icon: Lightbulb, title: "Healthy Lifestyle Habits", description: "Walk 30 minutes daily, maintain a balanced diet rich in vegetables and whole grains, limit sodium to < 2g/day, sleep 7-8 hours, and manage stress through mindfulness.", priority: "low", category: "Lifestyle" });

  return recs.slice(0, 8);
}

function AppointmentBooking({ patientId }: { patientId: number }) {
  const today = new Date().toISOString().split("T")[0]!;
  const [hospital, setHospital] = useState("");
  const [department, setDepartment] = useState("");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [booked, setBooked] = useState<any>(null);
  const [bookingError, setBookingError] = useState("");

  const { data: hospData } = useQuery({ queryKey: ["apt-hospitals"], queryFn: fetchHospitals });
  const { data: deptData } = useQuery({ queryKey: ["apt-departments"], queryFn: fetchDepartments });
  const { data: slotsData } = useQuery({
    queryKey: ["apt-slots", date, hospital, department],
    queryFn: () => fetchSlots(date, hospital, department),
    enabled: !!(date && hospital && department),
  });
  const { data: myApts, refetch: refetchApts } = useQuery({
    queryKey: ["apt-patient", patientId],
    queryFn: () => fetchPatientAppointments(patientId),
    enabled: !!patientId,
  });

  const bookMutation = useMutation({
    mutationFn: bookAppointment,
    onSuccess: (res) => { setBooked(res.appointment); setTime(""); setNotes(""); setBookingError(""); refetchApts(); },
    onError: (e: any) => setBookingError(e.message),
  });

  const services = deptData?.services?.[department] ?? [];
  const [service, setService] = useState("");
  const slots = slotsData?.slots ?? [];
  const myAppointments = myApts?.appointments ?? [];

  const handleBook = () => {
    if (!hospital || !department || !date || !time) return;
    setBookingError("");
    bookMutation.mutate({ patientId, hospital, department, service: service || department, date, time, notes });
  };

  return (
    <div className="space-y-6">
      {/* My Appointments */}
      {myAppointments.length > 0 && (
        <div>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
            <CalendarDays className="w-3.5 h-3.5 text-teal-600" /> Upcoming Appointments
          </p>
          <div className="space-y-2">
            {myAppointments.map((apt: any) => (
              <div key={apt.id} className="flex items-start gap-4 p-4 rounded-2xl bg-secondary"
                style={apt.status === "confirmed" ? { borderLeft: "3px solid #22c55e" } : {}}>
                <div className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #0d9488, #0891b2)" }}>
                  <p className="text-[8px] font-bold text-white/80 uppercase">{new Date(apt.date).toLocaleString("en", { month: "short" })}</p>
                  <p className="text-lg font-black text-white leading-none">{new Date(apt.date).getDate()}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-bold text-foreground">{apt.department}</p>
                    <Badge variant={apt.status === "confirmed" ? "success" : "outline"} className="text-[9px]">{apt.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{apt.hospital}</p>
                  <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{apt.time} · Ref: {apt.referenceNo}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success Banner */}
      {booked && (
        <div className="p-4 rounded-2xl bg-secondary" style={{ borderLeft: "3px solid #22c55e" }}>
          <div className="flex items-start gap-3 mb-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-foreground">Appointment Confirmed!</p>
              <p className="text-xs text-muted-foreground mt-0.5">Reference: <span className="font-mono font-bold">{booked.referenceNo}</span></p>
            </div>
            <button onClick={() => setBooked(null)} className="ml-auto text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[{ l: "Date", v: booked.date }, { l: "Time", v: booked.time }, { l: "Department", v: booked.department }].map((item, i) => (
              <div key={i} className="bg-secondary rounded-xl p-2.5 text-center">
                <p className="text-[9px] text-muted-foreground">{item.l}</p>
                <p className="text-xs font-bold text-foreground">{item.v}</p>
              </div>
            ))}
          </div>
          {booked.aiReminders && (
            <div className="space-y-1.5">
              {booked.aiReminders.map((r: string, i: number) => (
                <div key={i} className="flex items-start gap-2 px-3 py-1.5 rounded-xl" style={{ background: "rgba(5,150,105,0.08)" }}>
                  <Sparkles className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-emerald-800">{r}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Booking Form */}
      <div>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
          <Stethoscope className="w-3.5 h-3.5 text-teal-600" /> Book New Appointment
        </p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">Hospital *</p>
            <select className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-teal-500" value={hospital} onChange={e => { setHospital(e.target.value); setTime(""); }}>
              <option value="">Select hospital...</option>
              {hospData?.hospitals?.map((h: string) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">Department *</p>
            <select className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-teal-500" value={department} onChange={e => { setDepartment(e.target.value); setService(""); setTime(""); }}>
              <option value="">Select department...</option>
              {deptData?.departments?.map((d: string) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          {services.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">Service</p>
              <select className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-teal-500" value={service} onChange={e => setService(e.target.value)}>
                <option value="">General consultation...</option>
                {services.map((s: string) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">Date *</p>
            <Input type="date" value={date} min={today} onChange={e => { setDate(e.target.value); setTime(""); }} />
          </div>
        </div>

        {hospital && department && date && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Available Time Slots *</p>
            {slots.length === 0 ? (
              <p className="text-sm text-muted-foreground bg-secondary px-4 py-3 rounded-xl">No available slots for this date. Please try another date.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {slots.map((s: string) => (
                  <button key={s} onClick={() => setTime(s)} className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all border ${time === s ? "text-white border-transparent" : "bg-background border-border text-foreground hover:border-teal-500 hover:text-teal-600"}`}
                    style={time === s ? { background: "linear-gradient(135deg, #0d9488, #0891b2)", borderColor: "transparent" } : {}}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mb-4">
          <p className="text-xs font-semibold text-muted-foreground mb-1.5">Notes (optional)</p>
          <Input placeholder="Any specific concerns or reason for visit..." value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        {bookingError && (
          <div className="mb-3 px-4 py-2.5 bg-secondary rounded-xl text-sm text-red-700 font-medium" style={{ borderLeft: "3px solid #ef4444" }}>
            {bookingError}
          </div>
        )}

        <button
          onClick={handleBook}
          disabled={!hospital || !department || !date || !time || bookMutation.isPending}
          className="w-full py-3 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #0d9488, #0891b2)" }}
        >
          <span className="flex items-center justify-center gap-2">
            <CalendarDays className="w-4 h-4" />
            {bookMutation.isPending ? "Booking appointment..." : "Confirm Appointment"}
          </span>
        </button>
      </div>
    </div>
  );
}

const CITIZEN_TABS = [
  { id: "score", label: "Health Score & AI Tips", icon: Star },
  { id: "forecast", label: "AI Forecast", icon: Brain },
  { id: "appointments", label: "Appointments", icon: CalendarDays },
  { id: "journey", label: "Health Journey", icon: Network },
  { id: "summary", label: "Health Summary", icon: FileText },
  { id: "medications", label: "Prescriptions", icon: Pill },
  { id: "labs", label: "Lab Results", icon: FlaskConical },
  { id: "visits", label: "Visit History", icon: Building2 },
] as const;

type CitizenTab = typeof CITIZEN_TABS[number]["id"];

export default function CitizenPortal() {
  const [loginId, setLoginId] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<CitizenTab>("score");

  const { data: patient, isLoading } = useGetPatientByNationalId(loginId, { query: { enabled: isLoggedIn, retry: false } });
  const { data: aiDecision } = useAiDecision((patient as any)?.id || 0, { enabled: !!patient });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginId.trim()) setIsLoggedIn(true);
  };

  const healthScore = useMemo(() => patient ? computeHealthScore(patient) : null, [patient]);
  const recommendations = useMemo(() => patient ? generateRecommendations(patient) : [], [patient]);

  /* ── LOGIN SCREEN ── */
  if (!isLoggedIn) {
    return (
      <Layout role="citizen">
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="w-full max-w-md">
            {/* Logo / Brand */}
            <div className="text-center mb-8">
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-lg"
                style={{ background: "linear-gradient(135deg, #0d9488, #0891b2)" }}
              >
                <Heart className="w-9 h-9 text-white" />
              </div>
              <h1 className="text-3xl font-black text-foreground mb-2">My Health Portal</h1>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                Secure access to your national health records, AI-powered insights, and personalized care recommendations.
              </p>
            </div>

            {/* Login card */}
            <div className="rounded-3xl overflow-hidden shadow-xl" style={{ border: "1px solid rgba(13,148,136,0.15)", boxShadow: "0 20px 60px rgba(13,148,136,0.1)" }}>
              {/* Top accent */}
              <div className="h-1.5" style={{ background: "linear-gradient(90deg, #0d9488, #0891b2, #6366f1)" }} />

              <div className="p-8 bg-background">
                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">National ID Number</label>
                    <Input
                      value={loginId}
                      onChange={e => setLoginId(e.target.value)}
                      placeholder="Enter your 10-digit National ID"
                      className="font-mono text-sm h-12 rounded-2xl"
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-2xl text-white font-bold text-sm transition-all hover:opacity-90 flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg, #0d9488, #0891b2)" }}
                  >
                    <Lock className="w-4 h-4" />
                    Access My Health Records
                  </button>
                </form>

                {/* Demo IDs */}
                <div className="mt-5 pt-5" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">Demo Access</p>
                  <div className="flex gap-2 flex-wrap">
                    {["1000000001", "1000000004", "1000000010"].map(id => (
                      <button key={id} onClick={() => setLoginId(id)}
                        className="font-mono text-xs px-3 py-1.5 rounded-xl bg-secondary hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all">
                        {id}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground mt-6 leading-relaxed">
              Protected under Saudi National Data Policy · PDPL Compliant · End-to-end encrypted
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  /* ── LOADING ── */
  if (isLoading) {
    return (
      <Layout role="citizen">
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0d9488, #0891b2)" }}>
            <Heart className="w-6 h-6 text-white" />
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-500" />
            <span className="text-sm font-medium">Loading your health records...</span>
          </div>
        </div>
      </Layout>
    );
  }

  /* ── NOT FOUND ── */
  if (!patient) {
    return (
      <Layout role="citizen">
        <div className="max-w-md mx-auto mt-10">
          <Card className="rounded-3xl">
            <CardBody className="py-16 text-center">
              <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-bold text-foreground mb-1">No Records Found</p>
              <p className="text-sm text-muted-foreground mb-4">National ID <span className="font-mono">{loginId}</span> was not found.</p>
              <Button variant="outline" size="sm" onClick={() => { setIsLoggedIn(false); setLoginId(""); }}>Try Again</Button>
            </CardBody>
          </Card>
        </div>
      </Layout>
    );
  }

  /* ── COMPUTED VALUES ── */
  const activeMeds = patient.medications?.filter((m: any) => m.isActive) ?? [];
  const labResults = patient.labResults ?? [];
  const abnormal = labResults.filter((l: any) => l.status !== "normal").length;
  const criticalCount = labResults.filter((l: any) => l.status === "critical").length;
  const highPriorityRecs = recommendations.filter(r => r.priority === "high").length;

  const priorityColors = {
    high: { borderColor: "#ef4444", badge: "destructive" as const, dot: "bg-red-500" },
    medium: { borderColor: "#f59e0b", badge: "warning" as const, dot: "bg-amber-500" },
    low: { borderColor: "transparent", badge: "outline" as const, dot: "bg-muted-foreground" },
  };

  const urgency = aiDecision?.urgency;
  const urgencyBorderColor = urgency === "immediate" ? "#dc2626" : urgency === "urgent" ? "#f59e0b" : urgency === "soon" ? "#0ea5e9" : "#22c55e";
  const urgencyScoreColor = urgency === "immediate" ? "#dc2626" : urgency === "urgent" ? "#f59e0b" : urgency === "soon" ? "#0ea5e9" : "#22c55e";
  const urgencyLabel = urgency === "immediate" ? "Immediate Action Required" : urgency === "urgent" ? "Urgent Health Alert" : urgency === "soon" ? "Attention Recommended" : "Health Status — Normal";

  /* ── MAIN PORTAL ── */
  return (
    <Layout role="citizen">

      {/* ── PATIENT COMMAND HEADER ── */}
      <div className="rounded-3xl overflow-hidden mb-5" style={{ background: "linear-gradient(135deg, #042f2e 0%, #0c4a6e 100%)" }}>
        {/* Allergy bar */}
        {(patient.allergies?.length ?? 0) > 0 && (
          <div className="flex items-center gap-2.5 px-6 py-2.5" style={{ background: "rgba(220,38,38,0.85)" }}>
            <AlertCircle className="w-3.5 h-3.5 text-white shrink-0" />
            <p className="text-xs font-black text-white uppercase tracking-widest">Documented Allergies: {patient.allergies!.join(", ")}</p>
          </div>
        )}

        {/* Critical lab banner */}
        {criticalCount > 0 && (
          <div className="flex items-center gap-2.5 px-6 py-2 animate-pulse" style={{ background: "rgba(239,68,68,0.3)" }}>
            <ShieldAlert className="w-3.5 h-3.5 text-red-300 shrink-0" />
            <p className="text-xs font-bold text-red-200">{criticalCount} critical lab result{criticalCount > 1 ? "s" : ""} — contact your doctor as soon as possible</p>
            <Badge variant="destructive" className="ml-auto shrink-0 text-[9px]">Urgent</Badge>
          </div>
        )}

        <div className="px-6 py-5">
          {/* Top row: Patient identity + sign out */}
          <div className="flex items-center gap-4 mb-5">
            {/* Avatar */}
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 font-black text-xl text-white"
              style={{ background: "linear-gradient(135deg, #0d9488, #0891b2)" }}
            >
              {patient.fullName.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black text-white leading-tight">{patient.fullName}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="font-mono text-[10px] text-white/50 bg-white/10 px-2 py-0.5 rounded-lg">{patient.nationalId}</span>
                <span className="text-[11px] text-white/50">DOB: {format(new Date(patient.dateOfBirth), "dd MMM yyyy")}</span>
                <span className="text-[11px] text-white/50">· {patient.gender}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.25)", color: "#fca5a5" }}>
                  Blood: {patient.bloodType}
                </span>
              </div>
            </div>

            <button
              onClick={() => { setIsLoggedIn(false); setLoginId(""); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold transition-all"
              style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-6 gap-2 mb-5">
            {[
              { label: "Health Score", value: healthScore ? `${healthScore.score}/100` : "—", color: healthScore?.arcColor ?? "#6ee7b7" },
              { label: "Active Meds", value: String(activeMeds.length), color: "#7dd3fc" },
              { label: "Lab Results", value: String(labResults.length), color: "#c4b5fd" },
              { label: "Abnormal Labs", value: String(abnormal), color: abnormal > 0 ? "#fca5a5" : "#6ee7b7" },
              { label: "Conditions", value: String(patient.chronicConditions?.length ?? 0), color: "#fcd34d" },
              { label: "AI Insights", value: String(recommendations.length), color: "#86efac" },
            ].map((s, i) => (
              <div key={i} className="text-center px-2 py-2.5 rounded-2xl" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <p className="text-base font-black tabular-nums" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[9px] text-white/40 mt-0.5 font-medium">{s.label}</p>
              </div>
            ))}
          </div>

          {/* AI Risk panel — inline in header */}
          {aiDecision && (
            <div className="flex items-center gap-4 px-4 py-3.5 rounded-2xl mb-5" style={{ background: `rgba(255,255,255,0.06)`, borderLeft: `3px solid ${urgencyBorderColor}` }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${urgencyBorderColor}25` }}>
                {urgency === "immediate" || urgency === "urgent"
                  ? <ShieldAlert className="w-4 h-4" style={{ color: urgencyBorderColor }} />
                  : <Brain className="w-4 h-4" style={{ color: urgencyBorderColor }} />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black uppercase tracking-widest mb-0.5" style={{ color: `${urgencyBorderColor}99` }}>AI Risk Assessment · {urgencyLabel}</p>
                <p className="text-sm font-bold text-white leading-snug">{aiDecision.primaryAction}</p>
                <p className="text-[10px] text-white/40 mt-0.5">{aiDecision.timeWindow} · Confidence: {Math.round(aiDecision.confidence * 100)}%</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[9px] text-white/40">AI Risk Score</p>
                <p className="text-3xl font-black tabular-nums" style={{ color: urgencyScoreColor }}>{aiDecision.riskScore}<span className="text-sm text-white/30">/100</span></p>
                <p className="text-[9px] font-bold uppercase tracking-wide mt-0.5" style={{ color: urgencyScoreColor }}>{aiDecision.riskLevel} risk</p>
              </div>
            </div>
          )}

          {/* Tab navigation */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "16px" }}>
            {CITIZEN_TABS.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              const counts: Partial<Record<CitizenTab, number>> = {
                medications: activeMeds.length,
                labs: labResults.length,
                visits: patient.visits?.length ?? 0,
              };
              const count = counts[tab.id];
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0"
                  style={active
                    ? { background: "rgba(13,148,136,0.30)", color: "#5eead4", border: "1px solid rgba(13,148,136,0.40)" }
                    : { color: "rgba(255,255,255,0.40)", border: "1px solid transparent" }
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {count !== undefined && count > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black" style={{ background: active ? "rgba(13,148,136,0.4)" : "rgba(255,255,255,0.1)", color: active ? "#5eead4" : "rgba(255,255,255,0.5)" }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          TAB: HEALTH SCORE & AI TIPS
      ════════════════════════════════════════════ */}
      {activeTab === "score" && healthScore && (
        <div className="space-y-5">
          {/* Hero Score Ring */}
          <div className="rounded-3xl overflow-hidden" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" }}>
            <div className="flex items-center gap-8 p-7">
              {/* Animated ring */}
              <div className="relative shrink-0" style={{ width: 180, height: 180 }}>
                <svg viewBox="0 0 120 120" width="180" height="180" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                  {/* Grade zones */}
                  {[
                    { color: "rgba(239,68,68,0.18)", offset: 0, len: 31.4 },
                    { color: "rgba(249,115,22,0.18)", offset: -31.4, len: 31.4 },
                    { color: "rgba(234,179,8,0.18)", offset: -62.8, len: 47.1 },
                    { color: "rgba(56,189,248,0.18)", offset: -109.9, len: 56.5 },
                    { color: "rgba(34,197,94,0.18)", offset: -166.4, len: 62.8 },
                  ].map((z, i) => (
                    <circle key={i} cx="60" cy="60" r="50" fill="none" stroke={z.color} strokeWidth="10"
                      strokeDasharray={`${z.len} 283.2`} strokeDashoffset={`${z.offset}`} strokeLinecap="butt" />
                  ))}
                  {/* Progress */}
                  <circle cx="60" cy="60" r="50" fill="none"
                    stroke={healthScore.arcColor} strokeWidth="10"
                    strokeDasharray={`${(healthScore.score / 100) * 314.16} 314.16`}
                    strokeLinecap="round" style={{ transition: "stroke-dasharray 1s ease" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-black tabular-nums text-white">{healthScore.score}</span>
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">/100</span>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-6xl font-black" style={{ color: healthScore.arcColor }}>{healthScore.grade}</span>
                  <div>
                    <p className="text-xl font-black text-white">{healthScore.label}</p>
                    <p className="text-[11px] text-white/50 uppercase tracking-wide font-bold">AI Health Score</p>
                  </div>
                </div>
                <p className="text-sm text-white/70 leading-relaxed mb-5">{healthScore.summary}</p>
                {/* Grade scale */}
                <div className="flex items-center gap-1">
                  {[
                    { g: "F", range: "0–39", c: "#ef4444" },
                    { g: "D", range: "40–54", c: "#f97316" },
                    { g: "C", range: "55–69", c: "#eab308" },
                    { g: "B", range: "70–84", c: "#38bdf8" },
                    { g: "A", range: "85–100", c: "#22c55e" },
                  ].map(z => (
                    <div key={z.g} className={`flex-1 rounded-xl py-2 text-center transition-all ${healthScore.grade === z.g ? "ring-2 ring-white/30" : "opacity-40"}`}
                      style={{ background: `${z.c}20`, border: `1px solid ${z.c}30` }}>
                      <p className="text-xs font-black" style={{ color: z.c }}>{z.g}</p>
                      <p className="text-[8px] text-white/40 font-mono">{z.range}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mini KPI strip */}
            <div className="grid grid-cols-4 divide-x divide-white/10 border-t border-white/10">
              {[
                { label: "Conditions", value: patient.chronicConditions?.length ?? 0, icon: Activity, good: 0 },
                { label: "Active Meds", value: activeMeds.length, icon: Pill, good: 2 },
                { label: "Abnormal Labs", value: abnormal, icon: FlaskConical, good: 0 },
                { label: "AI Insights", value: recommendations.length, icon: Lightbulb, good: 0 },
              ].map(kpi => {
                const isOk = kpi.value <= kpi.good;
                const color = isOk ? "#22c55e" : kpi.value > 3 ? "#ef4444" : "#f59e0b";
                return (
                  <div key={kpi.label} className="flex flex-col items-center py-4 gap-1">
                    <kpi.icon className="w-4 h-4" style={{ color }} />
                    <p className="text-xl font-black tabular-nums" style={{ color }}>{kpi.value}</p>
                    <p className="text-[9px] font-semibold text-white/40 uppercase tracking-wide">{kpi.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Score Breakdown */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" />
                <CardTitle>What Affects Your Score</CardTitle>
              </div>
            </CardHeader>
            <CardBody className="space-y-3">
              {[
                { label: "Chronic Conditions", value: patient.chronicConditions?.length ?? 0, max: 5, good: 0, icon: Activity, tip: "Fewer conditions = higher score" },
                { label: "Active Medications", value: activeMeds.length, max: 8, good: 2, icon: Pill, tip: "Complex polypharmacy impacts score" },
                { label: "Abnormal Lab Results", value: abnormal, max: 5, good: 0, icon: FlaskConical, tip: "Abnormal labs reduce your score" },
                { label: "Recent Emergency Visits", value: (patient.visits ?? []).filter((v: any) => v.visitType === "emergency").length, max: 4, good: 0, icon: CalendarDays, tip: "Emergency visits indicate acute risk" },
              ].map((item) => {
                const isGood = item.value <= item.good;
                const badPct = Math.min(100, (item.value / item.max) * 100);
                const statusColor = isGood ? "#22c55e" : badPct >= 70 ? "#ef4444" : "#f59e0b";
                return (
                  <div key={item.label} className="flex items-center gap-4 px-4 py-3 bg-secondary rounded-2xl">
                    <item.icon className="w-4 h-4 shrink-0" style={{ color: statusColor }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold text-foreground">{item.label}</p>
                        <span className="text-[10px] font-bold tabular-nums" style={{ color: statusColor }}>{item.value}</span>
                      </div>
                      <div className="h-1.5 bg-background rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(4, badPct)}%`, background: statusColor }} />
                      </div>
                      <p className="text-[9px] text-muted-foreground mt-1">{item.tip}</p>
                    </div>
                  </div>
                );
              })}
            </CardBody>
          </Card>

          {/* AI Recommendations */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <CardTitle>Personalised Health Recommendations</CardTitle>
              </div>
              {highPriorityRecs > 0 && <Badge variant="destructive" className="ml-auto text-[10px]">{highPriorityRecs} urgent</Badge>}
            </CardHeader>
            <CardBody className="space-y-2.5">
              {recommendations.map((rec, i) => {
                const cfg = priorityColors[rec.priority];
                const Icon = rec.icon;
                return (
                  <div key={i} className="flex items-start gap-3.5 p-4 bg-secondary rounded-2xl" style={{ borderLeft: `3px solid ${cfg.borderColor}` }}>
                    <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm text-foreground">{rec.title}</p>
                        <Badge variant={cfg.badge} className="text-[9px] shrink-0">{rec.category}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{rec.description}</p>
                    </div>
                    {rec.priority === "high" && <div className={`w-2 h-2 rounded-full ${cfg.dot} shrink-0 mt-1.5 animate-pulse`} />}
                  </div>
                );
              })}
              {recommendations.length === 0 && (
                <div className="flex items-center gap-3 px-4 py-5 bg-secondary rounded-2xl" style={{ borderLeft: "3px solid #22c55e" }}>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <p className="text-sm font-semibold text-foreground">No urgent recommendations. Continue your healthy routine!</p>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Behavior Change Program */}
          {(() => {
            const conditions = (patient.chronicConditions ?? []).map((c: string) => c.toLowerCase());
            const hasDiabetes = conditions.some((c: string) => c.includes("diabet"));
            const hasHypertension = conditions.some((c: string) => c.includes("hypert") || c.includes("blood pressure"));
            const hasCKD = conditions.some((c: string) => c.includes("kidney") || c.includes("ckd") || c.includes("renal"));
            const NUDGES: Array<{
              id: string; icon: React.ElementType; title: string; action: string;
              desc: string; frequency: string; impact: string; impactColor: string; borderColor: string;
              condition: boolean; points: number;
            }> = [
              { id: "steps", icon: Activity, title: "Daily Movement Goal", action: "Walk 8,000 steps today", desc: "Regular walking reduces cardiovascular risk by up to 30%. Even 10-minute walks after meals significantly improve blood sugar control.", frequency: "Daily", impact: "High", impactColor: "#059669", borderColor: "#10b981", condition: true, points: 20 },
              { id: "meds", icon: Pill, title: "Medication Adherence Check", action: `Confirm all ${activeMeds.length} medications taken today`, desc: "Missed doses are the #1 cause of hospitalisation in chronic disease. Set alarms for each medication.", frequency: "Daily", impact: "Critical", impactColor: "#dc2626", borderColor: "#ef4444", condition: activeMeds.length > 0, points: 30 },
              { id: "bp", icon: Heart, title: "Blood Pressure Log", action: "Record your blood pressure reading", desc: "Track BP twice daily (morning + evening) for 7 days to establish your baseline. Target: < 130/80 mmHg.", frequency: "Twice daily", impact: "High", impactColor: "#7c3aed", borderColor: "#8b5cf6", condition: hasHypertension, points: 15 },
              { id: "bgl", icon: FlaskConical, title: "Blood Glucose Monitoring", action: "Check fasting blood sugar before breakfast", desc: "Consistent self-monitoring enables you to see how food, activity, and stress affect your glucose. Target fasting: 4.4–7.2 mmol/L.", frequency: "Daily", impact: "High", impactColor: "#d97706", borderColor: "#f59e0b", condition: hasDiabetes, points: 25 },
              { id: "water", icon: TrendingUp, title: "Hydration & Kidney Health", action: "Drink 2–3 litres of water today", desc: "Adequate hydration protects kidney function and helps maintain GFR. Avoid NSAIDs and high-protein supplements.", frequency: "Daily", impact: "Medium", impactColor: "#0369a1", borderColor: "#0ea5e9", condition: hasCKD, points: 15 },
              { id: "sleep", icon: Clock, title: "Sleep Optimisation", action: "Aim for 7–9 hours sleep tonight", desc: "Poor sleep raises cortisol and blood pressure. Set a consistent bedtime, avoid screens 1 hour before bed.", frequency: "Nightly", impact: "Medium", impactColor: "#4338ca", borderColor: "#6366f1", condition: true, points: 10 },
            ].filter(n => n.condition);

            if (NUDGES.length === 0) return null;

            return (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <CardTitle>Behavior Change Program — Daily Health Actions</CardTitle>
                  </div>
                  <span className="ml-auto text-[10px] font-mono text-muted-foreground">{NUDGES.length} active programs</span>
                </CardHeader>
                <CardBody className="space-y-2.5">
                  {NUDGES.map((n) => {
                    const Icon = n.icon;
                    return (
                      <div key={n.id} className="flex items-start gap-3.5 p-4 rounded-2xl bg-secondary" style={{ borderLeft: `3px solid ${n.borderColor}` }}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${n.borderColor}18` }}>
                          <Icon className="w-4 h-4" style={{ color: n.impactColor }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-bold text-foreground">{n.title}</p>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: n.impactColor }}>{n.impact}</span>
                          </div>
                          <p className="text-[12px] font-bold mb-0.5" style={{ color: n.impactColor }}>→ {n.action}</p>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">{n.desc}</p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[9px] text-muted-foreground">{n.frequency}</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(5,150,105,0.12)", color: "#059669" }}>+{n.points} health pts</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardBody>
              </Card>
            );
          })()}

          {/* Achievements + Challenges */}
          <div className="grid grid-cols-2 gap-5">
            {/* Achievements */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  <CardTitle>Health Achievements</CardTitle>
                </div>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-2 gap-2">
                  {(() => {
                    const conditions = (patient.chronicConditions ?? []).map((c: string) => c.toLowerCase());
                    const achievements: Array<{ icon: React.ElementType; iconColor: string; title: string; desc: string; earned: boolean }> = [
                      { icon: Pill, iconColor: "#007AFF", title: "Medication Adherent", desc: "Active prescriptions tracked", earned: activeMeds.length > 0 },
                      { icon: FlaskConical, iconColor: "#007AFF", title: "Lab Tracker", desc: "Lab results on record", earned: labResults.length > 0 },
                      { icon: Building2, iconColor: "#007AFF", title: "Health Checkup", desc: "Clinical visit recorded", earned: (patient.visits?.length ?? 0) > 0 },
                      { icon: ShieldCheck, iconColor: "#059669", title: "Health Warrior", desc: "Score ≥ 70 · Good standing", earned: (healthScore?.score ?? 0) >= 70 },
                      { icon: HeartHandshake, iconColor: "#007AFF", title: "Chronic Manager", desc: "Managing conditions with AI", earned: conditions.length > 0 },
                      { icon: BarChart2, iconColor: "#d97706", title: "SANAD Connected", desc: "National record fully linked", earned: true },
                    ];
                    return achievements.map((a, i) => {
                      const AIcon = a.icon;
                      return (
                        <div key={i} className={`relative flex items-start gap-2.5 p-3 rounded-2xl bg-secondary ${!a.earned ? "opacity-40" : ""}`}>
                          <div className="w-7 h-7 rounded-[9px] flex items-center justify-center shrink-0 bg-background">
                            <AIcon className="w-3.5 h-3.5" style={{ color: a.earned ? a.iconColor : "#94a3b8" }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-foreground leading-snug">{a.title}</p>
                            <p className="text-[9px] text-muted-foreground mt-0.5">{a.desc}</p>
                          </div>
                          <div className="absolute top-2 right-2">
                            {a.earned ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Lock className="w-3 h-3 text-muted-foreground" />}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </CardBody>
            </Card>

            {/* Challenges + Reminders */}
            <div className="space-y-5">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <CardTitle>Active Health Challenges</CardTitle>
                  </div>
                </CardHeader>
                <CardBody className="space-y-2.5">
                  {[
                    { title: "30-Day Medication Streak", desc: "Take all medications on schedule", progress: 73, target: 30, color: "#007AFF" },
                    { title: "7-Day Walking Challenge", desc: "Walk 30 minutes daily", progress: 57, target: 100, color: "#22c55e" },
                    { title: "Annual Checkup Reminder", desc: "Book comprehensive health screening", progress: 100, target: 100, color: "#6366f1" },
                  ].map((c, i) => (
                    <div key={i} className="p-3.5 rounded-2xl bg-secondary">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[12px] font-bold text-foreground">{c.title}</p>
                        <span className="text-sm font-black tabular-nums text-foreground">{c.progress}%</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mb-2">{c.desc}</p>
                      <div className="w-full bg-background rounded-full h-1.5">
                        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, c.progress)}%`, background: c.color }} />
                      </div>
                    </div>
                  ))}
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-red-500" />
                    <CardTitle>Smart Reminders</CardTitle>
                  </div>
                </CardHeader>
                <CardBody className="space-y-2">
                  {[
                    { title: "Annual HbA1c Test Due", daysLeft: 14, urgent: true },
                    { title: "Blood Pressure Check", daysLeft: 2, urgent: true },
                    { title: "Ophthalmology Screening", daysLeft: 45, urgent: false },
                    { title: "Medication Refill", daysLeft: 18, urgent: false },
                  ].map((r, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-secondary" style={r.urgent ? { borderLeft: "3px solid #ef4444" } : {}}>
                      <Bell className={`w-3.5 h-3.5 shrink-0 ${r.urgent ? "text-red-500" : "text-muted-foreground"}`} />
                      <p className={`text-[11px] font-semibold flex-1 ${r.urgent ? "text-red-700" : "text-foreground"}`}>{r.title}</p>
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full text-white" style={{ background: r.daysLeft <= 7 ? "#dc2626" : r.daysLeft <= 30 ? "#d97706" : "#6b7280" }}>
                        {r.daysLeft}d
                      </span>
                    </div>
                  ))}
                </CardBody>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          TAB: AI FORECAST (DIGITAL TWIN)
      ════════════════════════════════════════════ */}
      {activeTab === "forecast" && (
        <div className="space-y-5">
          {!aiDecision ? (
            <Card>
              <CardBody className="py-16 text-center">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "linear-gradient(135deg, #0d9488, #0891b2)" }}>
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <p className="font-bold text-foreground mb-1">Loading Your Health Forecast</p>
                <p className="text-sm text-muted-foreground">The AI is analyzing your health data...</p>
              </CardBody>
            </Card>
          ) : (
            <>
              {/* Trajectory hero */}
              <div className="rounded-3xl p-6 text-white" style={{
                background: aiDecision.digitalTwin?.riskTrajectory === "rapidly_worsening" ? "linear-gradient(135deg, #7f1d1d, #991b1b)" :
                  aiDecision.digitalTwin?.riskTrajectory === "worsening" ? "linear-gradient(135deg, #78350f, #92400e)" :
                  aiDecision.digitalTwin?.riskTrajectory === "improving" ? "linear-gradient(135deg, #064e3b, #065f46)" :
                  "linear-gradient(135deg, #0c4a6e, #075985)"
              }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-2">Your AI Health Forecast — 12 Months</p>
                    <p className="text-2xl font-black leading-snug mb-2">
                      {aiDecision.digitalTwin?.riskTrajectory === "rapidly_worsening" ? "Urgent attention needed" :
                       aiDecision.digitalTwin?.riskTrajectory === "worsening" ? "Health is declining — take action" :
                       aiDecision.digitalTwin?.riskTrajectory === "improving" ? "Great news! Health is improving" :
                       "Health is stable"}
                    </p>
                    <p className="text-sm text-white/75 leading-relaxed">{aiDecision.explainability?.summary}</p>
                    {aiDecision.digitalTwin?.interventionWindow && (
                      <div className="mt-3 px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.15)" }}>
                        <p className="text-xs font-semibold">{aiDecision.digitalTwin.interventionWindow}</p>
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-white/60 uppercase tracking-widest">Predicted Risk</p>
                    <p className="text-6xl font-black tabular-nums">{aiDecision.digitalTwin?.projectedRiskScore ?? "—"}</p>
                    <p className="text-[10px] text-white/50">/ 100</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                {/* Predicted Conditions */}
                {aiDecision.digitalTwin?.predictedConditions && aiDecision.digitalTwin.predictedConditions.length > 0 && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                        <CardTitle>Conditions to Watch For</CardTitle>
                      </div>
                    </CardHeader>
                    <CardBody className="space-y-2">
                      {aiDecision.digitalTwin.predictedConditions.map((c, i) => (
                        <div key={i} className="flex items-start gap-3 px-4 py-3 bg-secondary rounded-xl">
                          <ArrowUpRight className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <p className="text-sm text-foreground">{c}</p>
                        </div>
                      ))}
                    </CardBody>
                  </Card>
                )}

                {/* Key Drivers */}
                {aiDecision.digitalTwin?.keyDrivers && aiDecision.digitalTwin.keyDrivers.length > 0 && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-primary" />
                        <CardTitle>Key Health Drivers</CardTitle>
                      </div>
                    </CardHeader>
                    <CardBody className="space-y-2">
                      {aiDecision.digitalTwin.keyDrivers.map((driver, i) => (
                        <div key={i} className="flex items-start gap-2.5 px-3.5 py-3 bg-secondary rounded-xl">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                          <p className="text-xs text-foreground">{driver}</p>
                        </div>
                      ))}
                    </CardBody>
                  </Card>
                )}
              </div>

              {/* AI Recommendations */}
              {aiDecision.recommendations && aiDecision.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-primary" />
                      <CardTitle>Personalized Recommendations</CardTitle>
                    </div>
                  </CardHeader>
                  <CardBody className="space-y-2">
                    {aiDecision.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-2.5 px-4 py-3 bg-secondary rounded-xl">
                        <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                        <p className="text-xs text-foreground">{typeof rec === "string" ? rec : (rec as any).text}</p>
                      </div>
                    ))}
                  </CardBody>
                </Card>
              )}

              <div className="px-4 py-3.5 bg-secondary rounded-2xl">
                <p className="text-[10px] text-muted-foreground flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  This AI forecast is based on your current health records and is intended for informational purposes only. Always consult your doctor before making any health decisions.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════
          TAB: APPOINTMENTS
      ════════════════════════════════════════════ */}
      {activeTab === "appointments" && (
        <Card>
          <CardBody className="p-6">
            <AppointmentBooking patientId={(patient as any).id} />
          </CardBody>
        </Card>
      )}

      {/* ════════════════════════════════════════════
          TAB: HEALTH JOURNEY
      ════════════════════════════════════════════ */}
      {activeTab === "journey" && (
        <div className="space-y-5">
          {/* Journey hero */}
          <div className="flex items-center gap-4 p-5 rounded-3xl text-white" style={{ background: "linear-gradient(135deg, #4f46e5, #0891b2)" }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.2)" }}>
              <Network className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-black text-lg">Your Integrated Health Journey</p>
              <p className="text-xs text-white/75">All your health events across every SANAD portal — in one timeline</p>
            </div>
            <div className="ml-auto text-right shrink-0">
              <p className="text-3xl font-black">{(patient.visits?.length ?? 0) + (patient.labResults?.length ?? 0) + (patient.medications?.length ?? 0)}</p>
              <p className="text-[10px] text-white/60">total health events</p>
            </div>
          </div>

          {/* Cross-portal stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Doctor Visits", value: patient.visits?.length ?? 0, icon: Stethoscope, color: "#007AFF" },
              { label: "Lab Tests", value: patient.labResults?.length ?? 0, icon: FlaskConical, color: "#007AFF" },
              { label: "Prescriptions", value: patient.medications?.length ?? 0, icon: Pill, color: "#007AFF" },
              { label: "Insurance Claims", value: Math.floor((patient.medications?.length ?? 2) * 1.4), icon: Shield, color: "#059669" },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="rounded-2xl p-4 bg-secondary text-center">
                  <div className="w-8 h-8 rounded-xl bg-background mx-auto mb-2 flex items-center justify-center">
                    <Icon className="w-4 h-4" style={{ color: item.color }} />
                  </div>
                  <p className="text-2xl font-black" style={{ color: item.color }}>{item.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{item.label}</p>
                </div>
              );
            })}
          </div>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <CardTitle>Chronological Health Timeline</CardTitle>
              </div>
            </CardHeader>
            <CardBody className="space-y-0">
              {[
                ...(patient.visits ?? []).map((v: any) => ({ type: "visit", date: v.visitDate, title: `${v.visitType} — ${v.department}`, detail: v.diagnosis, sub: v.hospital, icon: Stethoscope, color: "#2563eb", badge: "info" as const, portal: "DOCTOR" })),
                ...(patient.labResults ?? []).map((l: any) => ({ type: "lab", date: l.testDate, title: l.testName, detail: `Result: ${l.result} ${l.unit ?? ""}`, sub: `Reference: ${l.referenceRange ?? "—"}`, icon: FlaskConical, color: l.status === "critical" ? "#e11d48" : l.status === "abnormal" ? "#d97706" : "#059669", badge: (l.status === "critical" ? "destructive" : l.status === "abnormal" ? "warning" : "success") as any, portal: "LAB" })),
                ...(patient.medications ?? []).map((m: any) => ({ type: "med", date: m.startDate ?? new Date().toISOString(), title: `Prescribed: ${m.drugName}`, detail: `${m.dosage} · ${m.frequency}`, sub: `By ${m.prescribedBy} · ${m.hospital}`, icon: Pill, color: "#7c3aed", badge: m.isActive ? "success" as const : "outline" as const, portal: "PHARMACY" })),
                { type: "insurance", date: new Date(Date.now() - 15 * 864e5).toISOString(), title: "Insurance Claim — Approved", detail: "Annual diabetes management package · SAR 4,800", sub: "Bupa Arabia · Coverage 80% · Copay SAR 960", icon: Shield, color: "#059669", badge: "success" as const, portal: "INSURANCE" },
                { type: "ai", date: new Date(Date.now() - 7 * 864e5).toISOString(), title: "AI Risk Score Updated — 78/100", detail: "HbA1c 9.2% → Risk trajectory: WORSENING. LACE+ score: 14/19", sub: "Cascaded to: Doctor · Insurance · Supply Chain · Family", icon: Brain, color: "#e11d48", badge: "destructive" as const, portal: "AI ENGINE" },
                { type: "family", date: new Date(Date.now() - 7 * 864e5).toISOString(), title: "Family Genetic Risk Cascade Triggered", detail: "2 family members flagged for DM Type 2 predisposition (73%, 68%)", sub: "Screening letters sent · Annual HbA1c recommended", icon: Users, color: "#0284c7", badge: "info" as const, portal: "FAMILY" },
                { type: "supply", date: new Date(Date.now() - 3 * 864e5).toISOString(), title: "Drug Supply Alert — Insulin Stock LOW", detail: "Insulin Glargine 300U: 2,100 units at Al-Riyadh hub. Procurement order raised.", sub: "ETA +500 units in 3 days · No disruption to your prescription", icon: Truck, color: "#d97706", badge: "warning" as const, portal: "SUPPLY" },
              ]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((event, i, arr) => {
                  const Icon = event.icon;
                  const isLast = i === arr.length - 1;
                  return (
                    <div key={i} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-white shrink-0" style={{ background: event.color }}>
                          <Icon className="w-4 h-4" />
                        </div>
                        {!isLast && <div className="w-0.5 flex-1 bg-border my-1 min-h-[16px]" />}
                      </div>
                      <div className="pb-4 flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-xs font-bold text-foreground">{event.title}</span>
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md text-white shrink-0" style={{ background: event.color }}>{event.portal}</span>
                          <Badge variant={event.badge} className="text-[9px] shrink-0">{event.badge === "success" ? "OK" : event.badge === "destructive" ? "CRITICAL" : event.badge === "warning" ? "FLAG" : "INFO"}</Badge>
                          <span className="ml-auto text-[9px] font-mono text-muted-foreground shrink-0">{format(new Date(event.date), "dd MMM yyyy")}</span>
                        </div>
                        <p className="text-[11px] text-foreground/80">{event.detail}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{event.sub}</p>
                      </div>
                    </div>
                  );
                })}
            </CardBody>
          </Card>

          {/* AI Journey Summary */}
          <div className="p-5 rounded-2xl" style={{ background: "linear-gradient(135deg, rgba(79,70,229,0.08), rgba(8,145,178,0.08))", border: "1px solid rgba(79,70,229,0.12)" }}>
            <p className="text-[10px] font-black text-indigo-800 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Brain className="w-3.5 h-3.5" /> AI Journey Intelligence Summary
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Portals Involved", value: "7 / 12", sub: "Doctor, Lab, Insurance, Supply, Family, Research, AI Engine", color: "text-indigo-700" },
                { label: "Cascade Events", value: "14", sub: "Cross-portal triggers from your health data", color: "text-sky-700" },
                { label: "SAR Saved (AI)", value: "SAR 12,400", sub: "Fraud prevention + supply optimization + early detection", color: "text-emerald-700" },
              ].map((item, i) => (
                <div key={i} className="bg-background rounded-xl px-4 py-3">
                  <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
                  <p className="text-[10px] font-semibold text-foreground mt-0.5">{item.label}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{item.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          TAB: HEALTH SUMMARY
      ════════════════════════════════════════════ */}
      {activeTab === "summary" && (
        <div className="grid grid-cols-2 gap-5">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                <CardTitle>Chronic Conditions</CardTitle>
              </div>
              <Badge variant="default" className="ml-auto">{patient.chronicConditions?.length ?? 0}</Badge>
            </CardHeader>
            <CardBody>
              {patient.chronicConditions?.length > 0 ? (
                <div className="space-y-2">
                  {patient.chronicConditions.map((c: string, i: number) => (
                    <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5 bg-secondary rounded-2xl">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      <span className="text-sm font-semibold">{c}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">No chronic conditions on record.</p>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-red-500" />
                <CardTitle>Documented Allergies</CardTitle>
              </div>
              {(patient.allergies?.length ?? 0) > 0 && <Badge variant="destructive" className="ml-auto">{patient.allergies!.length}</Badge>}
            </CardHeader>
            <CardBody>
              {patient.allergies?.length > 0 ? (
                <div className="space-y-2">
                  {patient.allergies.map((a: string, i: number) => (
                    <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5 bg-secondary rounded-2xl" style={{ borderLeft: "3px solid #ef4444" }}>
                      <StatusDot status="critical" />
                      <span className="text-sm font-bold text-red-700">{a}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">No known allergies on record.</p>}
            </CardBody>
          </Card>
        </div>
      )}

      {/* ════════════════════════════════════════════
          TAB: MEDICATIONS
      ════════════════════════════════════════════ */}
      {activeTab === "medications" && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Pill className="w-4 h-4 text-primary" />
              <CardTitle>Prescriptions</CardTitle>
            </div>
            <Badge variant="default" className="ml-auto">{activeMeds.length} active</Badge>
          </CardHeader>
          <CardBody className="p-0">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>Drug Name</th><th>Dosage</th><th>Frequency</th><th>Prescribed By</th><th>Facility</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {patient.medications?.map((med: any) => (
                  <tr key={med.id}>
                    <td className="font-bold text-foreground">{med.drugName}</td>
                    <td className="font-mono text-sm">{med.dosage}</td>
                    <td className="text-muted-foreground">{med.frequency}</td>
                    <td>{med.prescribedBy}</td>
                    <td className="text-muted-foreground text-xs">{med.hospital}</td>
                    <td><Badge variant={med.isActive ? "success" : "outline"}>{med.isActive ? "Active" : "Completed"}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      {/* ════════════════════════════════════════════
          TAB: LAB RESULTS
      ════════════════════════════════════════════ */}
      {activeTab === "labs" && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-primary" />
              <CardTitle>Lab Results</CardTitle>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {abnormal > 0 && <Badge variant="warning">{abnormal} abnormal</Badge>}
              {criticalCount > 0 && <Badge variant="destructive">{criticalCount} critical</Badge>}
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>Test Name</th><th>Result</th><th>Reference Range</th><th>Date</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {labResults.map((lab: any) => (
                  <tr key={lab.id}>
                    <td className="font-bold text-foreground">{lab.testName}</td>
                    <td className="font-mono font-semibold">{lab.result} <span className="text-muted-foreground font-normal">{lab.unit}</span></td>
                    <td className="text-muted-foreground text-xs font-mono">{lab.referenceRange || "—"}</td>
                    <td className="text-muted-foreground font-mono text-xs">{format(new Date(lab.testDate), "dd MMM yyyy")}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <StatusDot status={lab.status as any} />
                        <Badge variant={lab.status === "normal" ? "success" : lab.status === "abnormal" ? "warning" : "destructive"}>{lab.status}</Badge>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      {/* ════════════════════════════════════════════
          TAB: VISIT HISTORY
      ════════════════════════════════════════════ */}
      {activeTab === "visits" && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <CardTitle>Visit History</CardTitle>
            </div>
            <Badge variant="outline" className="ml-auto">{patient.visits?.length ?? 0} visits</Badge>
          </CardHeader>
          <CardBody className="p-0">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>Hospital</th><th>Department</th><th>Visit Type</th><th>Diagnosis</th><th>Date</th>
                </tr>
              </thead>
              <tbody>
                {patient.visits?.map((visit: any) => (
                  <tr key={visit.id}>
                    <td className="font-bold text-foreground">{visit.hospital}</td>
                    <td>{visit.department}</td>
                    <td><Badge variant="outline">{visit.visitType}</Badge></td>
                    <td className="text-muted-foreground max-w-xs truncate">{visit.diagnosis}</td>
                    <td className="text-muted-foreground font-mono text-xs">{format(new Date(visit.visitDate), "dd MMM yyyy")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}
    </Layout>
  );
}
