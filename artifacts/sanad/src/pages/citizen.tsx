import React, { useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import {
  Card, CardHeader, CardTitle, CardBody,
  Input, Button, PageHeader, Badge, StatusDot, Tabs, DataLabel, Select
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
  ShieldCheck, HeartHandshake, BarChart2
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
}): { score: number; grade: "A" | "B" | "C" | "D" | "F"; label: string; color: string; bg: string; summary: string } {
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
  const criticalLabs = labs.filter(l => l.status === "critical").length;
  const abnormalLabs = labs.filter(l => l.status === "abnormal").length;
  score -= criticalLabs * 15;
  score -= abnormalLabs * 7;

  const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const recentEmergency = (patient.visits || []).filter(v => v.visitType === "emergency" && new Date(v.visitDate) >= sixMonthsAgo).length;
  score -= recentEmergency * 8;

  score = Math.max(0, Math.min(100, score));

  let grade: "A" | "B" | "C" | "D" | "F";
  let label: string;
  let color: string;
  let bg: string;
  let summary: string;

  if (score >= 85) {
    grade = "A"; label = "Excellent"; color = "text-emerald-600"; bg = "bg-emerald-50";
    summary = "Your health indicators are in great shape. Keep up your healthy habits!";
  } else if (score >= 70) {
    grade = "B"; label = "Good"; color = "text-sky-600"; bg = "bg-sky-50";
    summary = "Your health is generally good. A few areas could benefit from attention.";
  } else if (score >= 55) {
    grade = "C"; label = "Fair"; color = "text-amber-600"; bg = "bg-amber-50";
    summary = "Some health factors need monitoring. Follow your doctor's recommendations.";
  } else if (score >= 40) {
    grade = "D"; label = "Needs Attention"; color = "text-orange-600"; bg = "bg-orange-50";
    summary = "Multiple health concerns detected. Regular medical follow-up is important.";
  } else {
    grade = "F"; label = "High Risk"; color = "text-red-600"; bg = "bg-red-50";
    summary = "Significant health risks identified. Please see your doctor as soon as possible.";
  }

  return { score, grade, label, color, bg, summary };
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

  if (criticalLabs.length > 0) {
    recs.push({
      icon: ShieldAlert,
      title: "Critical Lab Results Require Attention",
      description: `${criticalLabs.length} lab result(s) are in the critical range: ${criticalLabs.map(l => l.testName).join(", ")}. Contact your doctor immediately.`,
      priority: "high",
      category: "Urgent",
    });
  }

  if (abnormalLabs.length > 0 && criticalLabs.length === 0) {
    recs.push({
      icon: FlaskConical,
      title: "Follow Up on Abnormal Lab Results",
      description: `${abnormalLabs.length} test(s) showed abnormal results. Schedule a follow-up appointment to review these with your doctor.`,
      priority: "medium",
      category: "Lab Results",
    });
  }

  if (conditions.some(c => c.includes("diabetes") || c.includes("type 1") || c.includes("type 2"))) {
    recs.push({
      icon: Activity,
      title: "Monitor Blood Sugar Daily",
      description: "Check your fasting blood glucose every morning and after meals. Target HbA1c below 7%. Avoid sugary foods and refined carbohydrates.",
      priority: "high",
      category: "Diabetes Management",
    });
    recs.push({
      icon: Stethoscope,
      title: "Annual Diabetic Screening",
      description: "Get annual eye exam, kidney function tests (creatinine, microalbumin), and foot examination to detect complications early.",
      priority: "medium",
      category: "Preventive Care",
    });
  }

  if (conditions.some(c => c.includes("hypertension") || c.includes("blood pressure"))) {
    recs.push({
      icon: Heart,
      title: "Monitor Blood Pressure Regularly",
      description: "Check your blood pressure at least twice a week. Target: below 130/80 mmHg. Reduce salt intake and avoid stress.",
      priority: "high",
      category: "Cardiovascular",
    });
  }

  if (conditions.some(c => c.includes("heart"))) {
    recs.push({
      icon: Heart,
      title: "Cardiac Monitoring",
      description: "Avoid strenuous activity without medical clearance. Know the warning signs: chest pain, shortness of breath, or sudden dizziness require emergency care.",
      priority: "high",
      category: "Cardiovascular",
    });
  }

  if (conditions.some(c => c.includes("ckd") || c.includes("kidney") || c.includes("renal"))) {
    recs.push({
      icon: FlaskConical,
      title: "Protect Your Kidneys",
      description: "Stay well hydrated. Avoid NSAIDs (ibuprofen, naproxen). Limit protein and potassium intake as advised. Check creatinine & eGFR every 3 months.",
      priority: "high",
      category: "Kidney Health",
    });
  }

  if (conditions.some(c => c.includes("asthma") || c.includes("copd"))) {
    recs.push({
      icon: Activity,
      title: "Respiratory Health",
      description: "Always carry your rescue inhaler. Avoid smoke, dust, and strong odors. Get annual flu vaccine. Track your peak flow readings.",
      priority: "medium",
      category: "Respiratory",
    });
  }

  const activeMeds = (patient.medications || []).filter(m => m.isActive);
  if (activeMeds.length >= 3) {
    recs.push({
      icon: Pill,
      title: "Medication Adherence",
      description: `You are on ${activeMeds.length} medications. Set daily reminders and never skip doses without consulting your doctor. Bring your medication list to every appointment.`,
      priority: "medium",
      category: "Medications",
    });
  }

  const lastVisitDate = patient.visits?.[0]?.visitDate;
  const daysSinceVisit = lastVisitDate
    ? Math.floor((Date.now() - new Date(lastVisitDate).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  if (daysSinceVisit > 180 && conditions.length > 0) {
    recs.push({
      icon: CalendarDays,
      title: "Schedule a Routine Check-up",
      description: `It has been ${Math.round(daysSinceVisit / 30)} months since your last recorded visit. Regular check-ups are essential for managing your conditions.`,
      priority: "medium",
      category: "Preventive Care",
    });
  }

  if (age >= 50) {
    recs.push({
      icon: Stethoscope,
      title: "Age-Appropriate Screenings",
      description: age >= 65
        ? "At your age, annual screenings for colon cancer, osteoporosis, and cardiovascular disease are recommended. Discuss vaccination schedules with your doctor."
        : "Consider screenings for colorectal cancer (colonoscopy), blood pressure, cholesterol, and diabetes if not already monitored.",
      priority: "medium",
      category: "Preventive Care",
    });
  }

  recs.push({
    icon: Lightbulb,
    title: "Healthy Lifestyle Habits",
    description: "Walk 30 minutes daily, maintain a balanced diet rich in vegetables and whole grains, limit sodium to < 2g/day, sleep 7-8 hours, and manage stress through mindfulness.",
    priority: "low",
    category: "Lifestyle",
  });

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
    onSuccess: (res) => {
      setBooked(res.appointment);
      setTime("");
      setNotes("");
      setBookingError("");
      refetchApts();
    },
    onError: (e: any) => setBookingError(e.message),
  });

  const services = deptData?.services?.[department] ?? [];
  const [service, setService] = useState("");
  const slots = slotsData?.slots ?? [];

  const handleBook = () => {
    if (!hospital || !department || !date || !time) return;
    setBookingError("");
    bookMutation.mutate({ patientId, hospital, department, service: service || department, date, time, notes });
  };

  const myAppointments = myApts?.appointments ?? [];

  return (
    <div className="p-5 space-y-5">
      {/* Upcoming Appointments */}
      {myAppointments.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
            <CalendarDays className="w-3.5 h-3.5" /> My Appointments
          </p>
          <div className="space-y-2">
            {myAppointments.map((apt: any) => (
              <div key={apt.id} className={`flex items-start gap-4 p-4 rounded-2xl border ${apt.status === "confirmed" ? "bg-emerald-50 border-emerald-200" : "bg-secondary border-border"}`}>
                <div className="w-10 h-10 rounded-xl bg-white flex flex-col items-center justify-center shrink-0 border border-border">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase">{new Date(apt.date).toLocaleString("en", { month: "short" })}</p>
                  <p className="text-lg font-bold text-foreground leading-none">{new Date(apt.date).getDate()}</p>
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
        <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300">
          <div className="flex items-start gap-3 mb-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-emerald-800">Appointment Confirmed!</p>
              <p className="text-xs text-emerald-700 mt-0.5">Reference: <span className="font-mono font-bold">{booked.referenceNo}</span></p>
            </div>
            <button onClick={() => setBooked(null)} className="ml-auto text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-white/70 rounded-xl p-2.5 text-center">
              <p className="text-[9px] text-muted-foreground">Date</p>
              <p className="text-xs font-bold text-foreground">{booked.date}</p>
            </div>
            <div className="bg-white/70 rounded-xl p-2.5 text-center">
              <p className="text-[9px] text-muted-foreground">Time</p>
              <p className="text-xs font-bold text-foreground">{booked.time}</p>
            </div>
            <div className="bg-white/70 rounded-xl p-2.5 text-center">
              <p className="text-[9px] text-muted-foreground">Department</p>
              <p className="text-xs font-bold text-foreground">{booked.department}</p>
            </div>
          </div>
          {booked.aiReminders && (
            <div className="space-y-1.5">
              {booked.aiReminders.map((r: string, i: number) => (
                <div key={i} className="flex items-start gap-2 px-3 py-1.5 bg-white/50 rounded-xl">
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
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
          <Stethoscope className="w-3.5 h-3.5" /> Book New Appointment
        </p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">Hospital *</p>
            <select
              className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              value={hospital}
              onChange={e => { setHospital(e.target.value); setTime(""); }}
            >
              <option value="">Select hospital...</option>
              {hospData?.hospitals?.map((h: string) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">Department *</p>
            <select
              className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              value={department}
              onChange={e => { setDepartment(e.target.value); setService(""); setTime(""); }}
            >
              <option value="">Select department...</option>
              {deptData?.departments?.map((d: string) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          {services.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">Service</p>
              <select
                className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                value={service}
                onChange={e => setService(e.target.value)}
              >
                <option value="">General consultation...</option>
                {services.map((s: string) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">Date *</p>
            <Input
              type="date"
              value={date}
              min={today}
              onChange={e => { setDate(e.target.value); setTime(""); }}
            />
          </div>
        </div>

        {/* Time Slots */}
        {hospital && department && date && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Available Time Slots *</p>
            {slots.length === 0 ? (
              <p className="text-sm text-muted-foreground bg-secondary px-4 py-3 rounded-xl">No available slots for this date. Please try another date.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {slots.map((s: string) => (
                  <button
                    key={s}
                    onClick={() => setTime(s)}
                    className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all border ${
                      time === s
                        ? "bg-primary text-white border-primary"
                        : "bg-background border-border text-foreground hover:border-primary hover:text-primary"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mb-4">
          <p className="text-xs font-semibold text-muted-foreground mb-1.5">Notes (optional)</p>
          <Input
            placeholder="Any specific concerns or reason for visit..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        {bookingError && (
          <div className="mb-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
            {bookingError}
          </div>
        )}

        <Button
          onClick={handleBook}
          disabled={!hospital || !department || !date || !time || bookMutation.isPending}
          className="w-full"
        >
          <CalendarDays className="w-4 h-4" />
          {bookMutation.isPending ? "Booking appointment..." : "Confirm Appointment"}
        </Button>
      </div>
    </div>
  );
}

export default function CitizenPortal() {
  const [loginId, setLoginId] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState("health-score");

  const { data: patient, isLoading } = useGetPatientByNationalId(
    loginId,
    { query: { enabled: isLoggedIn, retry: false } }
  );

  const { data: aiDecision } = useAiDecision(
    (patient as any)?.id || 0,
    { enabled: !!patient }
  );

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginId.trim()) setIsLoggedIn(true);
  };

  const healthScore = useMemo(() => {
    if (!patient) return null;
    return computeHealthScore(patient);
  }, [patient]);

  const recommendations = useMemo(() => {
    if (!patient) return [];
    return generateRecommendations(patient);
  }, [patient]);

  if (!isLoggedIn) {
    return (
      <Layout role="citizen">
        <div className="max-w-md mx-auto mt-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-3xl bg-amber-100 flex items-center justify-center mx-auto mb-5">
              <Lock className="w-7 h-7 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Citizen Health Portal</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Secure access to your national health records, AI health score, and personalised recommendations.
            </p>
          </div>
          <Card className="rounded-3xl">
            <CardBody className="p-7">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">National ID</label>
                  <Input
                    value={loginId}
                    onChange={e => setLoginId(e.target.value)}
                    placeholder="Enter your 10-digit National ID"
                    className="font-mono text-sm h-11 rounded-2xl"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground mt-2">Demo IDs: 1000000001 · 1000000004 · 1000000010</p>
                </div>
                <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-white" size="lg">
                  <Lock className="w-4 h-4" /> Secure Login
                </Button>
              </form>
            </CardBody>
          </Card>
          <p className="text-center text-xs text-muted-foreground mt-5 leading-relaxed">
            Your data is protected under Saudi National Data Policy<br />and HIPAA-compliant security standards.
          </p>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout role="citizen">
        <div className="flex items-center gap-3 py-20 justify-center text-muted-foreground">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-500" />
          <span className="text-sm">Loading your health records...</span>
        </div>
      </Layout>
    );
  }

  if (!patient) {
    return (
      <Layout role="citizen">
        <Card className="rounded-3xl">
          <CardBody className="py-16 text-center">
            <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-bold text-foreground mb-1">No Records Found</p>
            <p className="text-sm text-muted-foreground mb-4">National ID <span className="font-mono">{loginId}</span> was not found.</p>
            <Button variant="outline" size="sm" onClick={() => { setIsLoggedIn(false); setLoginId(""); }}>Try Again</Button>
          </CardBody>
        </Card>
      </Layout>
    );
  }

  const activeMeds = patient.medications?.filter(m => m.isActive) ?? [];
  const labResults = patient.labResults ?? [];
  const abnormal = labResults.filter(l => l.status !== "normal").length;
  const criticalCount = labResults.filter(l => l.status === "critical").length;
  const highPriorityRecs = recommendations.filter(r => r.priority === "high").length;

  const priorityColors = {
    high: { bg: "bg-red-50", border: "border-red-100", badge: "destructive" as const, dot: "bg-red-500" },
    medium: { bg: "bg-amber-50", border: "border-amber-100", badge: "warning" as const, dot: "bg-amber-500" },
    low: { bg: "bg-secondary", border: "border-border", badge: "outline" as const, dot: "bg-muted-foreground" },
  };

  return (
    <Layout role="citizen">
      <PageHeader
        title={`My Health — ${patient.fullName.split(" ")[0]}`}
        subtitle="Your personal AI health score, recommendations, and complete national health record."
        action={
          <Button variant="outline" size="sm" onClick={() => { setIsLoggedIn(false); setLoginId(""); }}>
            Sign Out
          </Button>
        }
      />

      {criticalCount > 0 && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl">
          <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-sm font-semibold text-red-700">
            <strong>{criticalCount} critical lab result{criticalCount > 1 ? "s" : ""}</strong> — please contact your doctor as soon as possible.
          </p>
          <Badge variant="destructive" className="ml-auto shrink-0">Urgent</Badge>
        </div>
      )}

      {/* Identity + Score Row */}
      <div className="grid grid-cols-12 gap-4 mb-5">
        <Card className="col-span-7">
          <CardBody className="flex items-center gap-4 p-5">
            <div className="w-14 h-14 rounded-3xl bg-amber-100 flex items-center justify-center shrink-0">
              <User className="w-7 h-7 text-amber-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground mb-1.5">{patient.fullName}</h2>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono bg-secondary text-xs px-2.5 py-1 rounded-xl">{patient.nationalId}</span>
                <span className="text-xs text-muted-foreground">DOB: {format(new Date(patient.dateOfBirth), "dd MMM yyyy")}</span>
                <span className="text-xs text-muted-foreground">· {patient.gender}</span>
                <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full">Blood: {patient.bloodType}</span>
              </div>
            </div>
            {patient.allergies?.length > 0 && (
              <Badge variant="destructive">{patient.allergies.length} Allerg{patient.allergies.length > 1 ? "ies" : "y"}</Badge>
            )}
          </CardBody>
        </Card>

        {healthScore && (
          <Card className={`col-span-3 ${healthScore.bg} border-${healthScore.bg.replace("bg-", "border-")}`}>
            <CardBody className="flex flex-col items-center justify-center py-5 text-center">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">AI Health Score</p>
              <div className="relative w-24 h-24 mb-2">
                <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E5E7EB" strokeWidth="2.5" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke={healthScore.score >= 85 ? "#22c55e" : healthScore.score >= 70 ? "#38bdf8" : healthScore.score >= 55 ? "#f59e0b" : healthScore.score >= 40 ? "#f97316" : "#ef4444"}
                    strokeWidth="2.5"
                    strokeDasharray={`${healthScore.score} 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-2xl font-bold tabular-nums ${healthScore.color}`}>{healthScore.score}</span>
                  <span className="text-[10px] text-muted-foreground">/100</span>
                </div>
              </div>
              <Badge
                variant={healthScore.grade === "A" ? "success" : healthScore.grade === "B" ? "info" : healthScore.grade === "C" ? "warning" : "destructive"}
                className="text-xs"
              >
                Grade {healthScore.grade} — {healthScore.label}
              </Badge>
            </CardBody>
          </Card>
        )}

        <Card className="col-span-2">
          <CardBody className="flex flex-col gap-3 justify-center h-full py-5 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Pill className="w-3.5 h-3.5 text-amber-500" /> Active Meds</div>
              <span className="font-bold text-foreground">{activeMeds.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><FlaskConical className="w-3.5 h-3.5 text-sky-500" /> Lab Results</div>
              <span className="font-bold text-foreground">{labResults.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Bell className="w-3.5 h-3.5 text-red-500" /> Abnormal</div>
              <span className={`font-bold ${abnormal > 0 ? "text-amber-600" : "text-foreground"}`}>{abnormal}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Lightbulb className="w-3.5 h-3.5 text-violet-500" /> AI Tips</div>
              <span className={`font-bold ${highPriorityRecs > 0 ? "text-red-600" : "text-foreground"}`}>{recommendations.length}</span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* AI Risk Awareness Panel — always visible when AI decision is available */}
      {aiDecision && (() => {
        const urgency = aiDecision.urgency;
        const bannerStyle =
          urgency === "immediate" ? "bg-red-600" :
          urgency === "urgent"    ? "bg-amber-500" :
          urgency === "soon"      ? "bg-sky-500"   : "bg-emerald-600";
        const urgencyLabel =
          urgency === "immediate" ? "Immediate Action Required" :
          urgency === "urgent"    ? "Urgent Health Alert" :
          urgency === "soon"      ? "Attention Recommended" : "Health Status — Normal";
        const IconEl = urgency === "immediate" || urgency === "urgent" ? ShieldAlert : Brain;
        const pulseClass = urgency === "immediate" ? "animate-pulse" : "";
        return (
          <div className={`mb-4 rounded-2xl p-4 flex items-start gap-4 ${bannerStyle} text-white ${pulseClass}`}>
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <IconEl className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-0.5">
                AI Risk Assessment · {urgencyLabel}
              </p>
              <p className="font-bold text-sm text-white mb-1">{aiDecision.primaryAction}</p>
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-xs text-white/80 font-semibold">{aiDecision.timeWindow}</p>
                <span className="text-white/60 text-[10px]">·</span>
                <p className="text-xs text-white/80 font-semibold">
                  Confidence: {Math.round(aiDecision.confidence * 100)}%
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] text-white/60">AI Risk Score</p>
              <p className="text-3xl font-bold tabular-nums">
                {aiDecision.riskScore}<span className="text-base text-white/60">/100</span>
              </p>
              <p className="text-[10px] text-white/70 mt-0.5 uppercase tracking-wide font-bold">
                {aiDecision.riskLevel} risk
              </p>
            </div>
          </div>
        );
      })()}

      {/* Tabs */}
      <Card>
        <Tabs
          tabs={[
            { id: "health-score", label: "Health Score & AI Tips" },
            { id: "digital-twin", label: "AI Health Forecast" },
            { id: "appointments", label: "Book Appointment" },
            { id: "journey", label: "Health Journey" },
            { id: "summary", label: "Health Summary" },
            { id: "medications", label: "Prescriptions", count: activeMeds.length },
            { id: "labs", label: "Lab Results", count: labResults.length },
            { id: "visits", label: "Visit History", count: patient.visits?.length ?? 0 },
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === "digital-twin" && (
          <div className="p-5">
            {!aiDecision ? (
              <div className="py-12 text-center">
                <Brain className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-bold text-foreground mb-1">Loading Your Health Forecast</p>
                <p className="text-sm text-muted-foreground">The AI is analyzing your health data...</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Overall Health Trajectory */}
                <div className={`rounded-3xl p-5 ${
                  aiDecision.digitalTwin?.riskTrajectory === "rapidly_worsening" ? "bg-red-600 text-white" :
                  aiDecision.digitalTwin?.riskTrajectory === "worsening" ? "bg-amber-500 text-white" :
                  aiDecision.digitalTwin?.riskTrajectory === "improving" ? "bg-emerald-500 text-white" :
                  "bg-sky-500 text-white"
                }`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-2">Your Health Forecast (12 months)</p>
                      <p className="text-xl font-bold leading-snug">
                        {aiDecision.digitalTwin?.riskTrajectory === "rapidly_worsening" ? "Urgent attention needed" :
                         aiDecision.digitalTwin?.riskTrajectory === "worsening" ? "Health is declining — take action" :
                         aiDecision.digitalTwin?.riskTrajectory === "improving" ? "Great news! Health is improving" :
                         "Health is stable"}
                      </p>
                      <p className="text-sm text-white/80 mt-1.5">{aiDecision.explainability?.summary}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-white/70 uppercase tracking-widest">Predicted Risk</p>
                      <p className="text-5xl font-bold tabular-nums">{aiDecision.digitalTwin?.projectedRiskScore ?? "—"}</p>
                      <p className="text-[10px] text-white/60">/ 100</p>
                    </div>
                  </div>
                  {aiDecision.digitalTwin?.interventionWindow && (
                    <div className="mt-3 px-3 py-2 bg-white/20 rounded-xl">
                      <p className="text-xs font-semibold text-white">{aiDecision.digitalTwin.interventionWindow}</p>
                    </div>
                  )}
                </div>

                {/* Predicted Conditions */}
                {aiDecision.digitalTwin?.predictedConditions && aiDecision.digitalTwin.predictedConditions.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Conditions to Watch Out For
                    </p>
                    <div className="space-y-2">
                      {aiDecision.digitalTwin.predictedConditions.map((c, i) => (
                        <div key={i} className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                          <ArrowUpRight className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <p className="text-sm text-foreground">{c}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Key Drivers */}
                {aiDecision.digitalTwin?.keyDrivers && aiDecision.digitalTwin.keyDrivers.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Activity className="w-3.5 h-3.5 text-primary" /> Key Health Drivers
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {aiDecision.digitalTwin.keyDrivers.map((driver, i) => (
                        <div key={i} className="flex items-start gap-2.5 px-3.5 py-3 bg-secondary border border-border rounded-xl">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                          <p className="text-xs text-foreground">{driver}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {aiDecision.recommendations && aiDecision.recommendations.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Lightbulb className="w-3.5 h-3.5 text-primary" /> Personalized Recommendations
                    </p>
                    <div className="space-y-2">
                      {aiDecision.recommendations.map((rec, i) => (
                        <div key={i} className="flex items-start gap-2.5 px-4 py-3 bg-primary/5 border border-primary/15 rounded-xl">
                          <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                          <p className="text-xs text-foreground">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Disclaimer */}
                <div className="px-4 py-3.5 bg-secondary border border-border rounded-2xl">
                  <p className="text-[10px] text-muted-foreground flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    This AI forecast is based on your current health records and is intended for informational purposes only. Always consult your doctor before making any health decisions.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "health-score" && healthScore && (
          <div className="p-5 space-y-5">
            {/* Score interpretation */}
            <div className={`flex items-start gap-4 p-5 ${healthScore.bg} border border-border rounded-2xl`}>
              <div className="flex-shrink-0">
                <div className="relative w-20 h-20">
                  <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E5E7EB" strokeWidth="2.5" />
                    <circle
                      cx="18" cy="18" r="15.9" fill="none"
                      stroke={healthScore.score >= 85 ? "#22c55e" : healthScore.score >= 70 ? "#38bdf8" : healthScore.score >= 55 ? "#f59e0b" : healthScore.score >= 40 ? "#f97316" : "#ef4444"}
                      strokeWidth="2.5"
                      strokeDasharray={`${healthScore.score} 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-xl font-bold tabular-nums ${healthScore.color}`}>{healthScore.score}</span>
                    <span className="text-[9px] text-muted-foreground">/100</span>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className={`text-2xl font-bold ${healthScore.color}`}>{healthScore.label}</h3>
                  <Badge variant={healthScore.grade === "A" ? "success" : healthScore.grade === "B" ? "info" : healthScore.grade === "C" ? "warning" : "destructive"}>
                    Grade {healthScore.grade}
                  </Badge>
                </div>
                <p className="text-sm text-foreground font-medium leading-relaxed">{healthScore.summary}</p>
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Based on your live medical data</span>
                  <span className="flex items-center gap-1.5"><Info className="w-3.5 h-3.5" /> AI-powered analysis</span>
                </div>
              </div>
            </div>

            {/* Score Factors */}
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                <Star className="w-3.5 h-3.5" /> Score Breakdown
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Chronic Conditions", value: patient.chronicConditions?.length ?? 0, max: 5, good: 0, icon: Activity },
                  { label: "Active Medications", value: activeMeds.length, max: 8, good: 2, icon: Pill },
                  { label: "Abnormal Labs", value: abnormal, max: 5, good: 0, icon: FlaskConical },
                  { label: "Recent Visits", value: patient.visits?.length ?? 0, max: 10, good: 1, icon: CalendarDays },
                ].map((item) => {
                  const pct = Math.max(5, 100 - (item.value / item.max) * 100);
                  const isGood = item.value <= item.good;
                  return (
                    <div key={item.label} className="flex items-center gap-3 px-4 py-3 bg-secondary rounded-2xl">
                      <item.icon className={`w-4 h-4 shrink-0 ${isGood ? "text-emerald-500" : item.value >= item.max * 0.7 ? "text-red-500" : "text-amber-500"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{item.label}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 bg-background rounded-full h-1.5">
                            <div
                              className={`h-full rounded-full ${isGood ? "bg-emerald-500" : item.value >= item.max * 0.7 ? "bg-red-500" : "bg-amber-500"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground tabular-nums">{item.value}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Recommendations */}
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                <Lightbulb className="w-3.5 h-3.5" /> Personalised Health Recommendations
              </p>
              <div className="space-y-2.5">
                {recommendations.map((rec, i) => {
                  const cfg = priorityColors[rec.priority];
                  const Icon = rec.icon;
                  return (
                    <div key={i} className={`flex items-start gap-3.5 p-4 ${cfg.bg} border ${cfg.border} rounded-2xl`}>
                      <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-sm text-foreground">{rec.title}</p>
                          <Badge variant={cfg.badge} className="text-[10px] shrink-0">{rec.category}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{rec.description}</p>
                      </div>
                      {rec.priority === "high" && (
                        <div className={`w-2 h-2 rounded-full ${cfg.dot} shrink-0 mt-1.5`} />
                      )}
                    </div>
                  );
                })}
                {recommendations.length === 0 && (
                  <div className="flex items-center gap-3 px-4 py-5 bg-emerald-50 border border-emerald-100 rounded-2xl">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <p className="text-sm font-semibold text-emerald-700">No urgent recommendations. Continue your healthy routine!</p>
                  </div>
                )}
              </div>
            </div>

            {/* ─── Achievement Badges ─── */}
            {(() => {
              const conditions = (patient.chronicConditions ?? []).map((c: string) => c.toLowerCase());
              const hasActiveMeds = activeMeds.length > 0;
              const hasLabs = (patient.labResults ?? []).length > 0;
              const hasVisit = (patient.visits ?? []).length > 0;
              const goodScore = healthScore.score >= 70;
              const achievements: Array<{ icon: React.ElementType; iconColor: string; iconBg: string; title: string; desc: string; earned: boolean; color: string }> = [
                { icon: Pill,           iconColor: "text-violet-600", iconBg: "bg-violet-100", title: "Medication Adherent", desc: "Active prescriptions tracked in SANAD", earned: hasActiveMeds, color: "bg-violet-50 border-violet-200" },
                { icon: FlaskConical,   iconColor: "text-sky-600",    iconBg: "bg-sky-100",    title: "Lab Tracker",         desc: "Lab results on record and monitored",  earned: hasLabs,         color: "bg-sky-50 border-sky-200" },
                { icon: Building2,      iconColor: "text-teal-600",   iconBg: "bg-teal-100",   title: "Health Checkup",      desc: "Clinical visit recorded this year",     earned: hasVisit,        color: "bg-teal-50 border-teal-200" },
                { icon: ShieldCheck,    iconColor: "text-emerald-600",iconBg: "bg-emerald-100",title: "Health Warrior",      desc: "Health score ≥ 70 / Good standing",     earned: goodScore,       color: "bg-emerald-50 border-emerald-200" },
                { icon: HeartHandshake, iconColor: "text-indigo-600", iconBg: "bg-indigo-100", title: "Chronic Manager",     desc: "Managing chronic conditions with AI",   earned: conditions.length > 0, color: "bg-indigo-50 border-indigo-200" },
                { icon: BarChart2,      iconColor: "text-amber-600",  iconBg: "bg-amber-100",  title: "SANAD Connected",     desc: "National health record fully linked",   earned: true,            color: "bg-amber-50 border-amber-200" },
              ];
              return (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Star className="w-3.5 h-3.5 text-amber-500" /> Health Achievements · الإنجازات الصحية
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {achievements.map((a, i) => {
                      const AIcon = a.icon;
                      return (
                      <div key={i} className={`relative flex items-start gap-2.5 p-3 rounded-2xl border ${a.earned ? a.color : "bg-secondary border-border opacity-50"}`}>
                        <div className={`w-7 h-7 rounded-[9px] flex items-center justify-center shrink-0 ${a.earned ? a.iconBg : "bg-secondary"}`}>
                          <AIcon className={`w-3.5 h-3.5 ${a.earned ? a.iconColor : "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-bold text-foreground leading-snug">{a.title}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{a.desc}</p>
                        </div>
                        {a.earned && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          </div>
                        )}
                        {!a.earned && (
                          <div className="absolute top-2 right-2">
                            <Lock className="w-3 h-3 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* ─── Active Health Challenges ─── */}
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-primary" /> Active Health Challenges · التحديات الصحية النشطة
              </p>
              <div className="space-y-2">
                {[
                  { title: "30-Day Medication Streak", desc: "Take all medications on schedule for 30 days", progress: 73, unit: "days", target: 30, color: "bg-violet-500", bg: "bg-violet-50 border-violet-200" },
                  { title: "7-Day Walking Challenge", desc: "Walk 30 minutes daily — Heart health boost", progress: 57, unit: "days", target: 7, color: "bg-emerald-500", bg: "bg-emerald-50 border-emerald-200" },
                  { title: "Annual Checkup Reminder", desc: "Book your comprehensive annual health screening", progress: 100, unit: "%", target: 100, color: "bg-sky-500", bg: "bg-sky-50 border-sky-200" },
                ].map((c, i) => (
                  <div key={i} className={`p-3.5 rounded-2xl border ${c.bg}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-[12px] font-bold text-foreground">{c.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{c.desc}</p>
                      </div>
                      <span className="text-sm font-black tabular-nums text-foreground ml-3 shrink-0">{c.progress}{c.unit === "%" ? "%" : `/${c.target}d`}</span>
                    </div>
                    <div className="w-full bg-white/70 rounded-full h-2">
                      <div className={`h-full rounded-full ${c.color} transition-all`} style={{ width: `${Math.min(100, (c.progress / c.target) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ─── Smart Preventive Reminders ─── */}
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-red-500" /> Smart Preventive Reminders · التذكيرات الوقائية
              </p>
              <div className="space-y-2">
                {[
                  { title: "Annual HbA1c Test Due", desc: "Last test was 3 months ago · Schedule now at King Faisal Specialist", daysLeft: 14, urgent: true },
                  { title: "Blood Pressure Check", desc: "Weekly self-monitoring recommended — Log to SANAD app", daysLeft: 2, urgent: true },
                  { title: "Ophthalmology Screening", desc: "Diabetic retinopathy annual exam · مستشفى الملك فيصل التخصصي", daysLeft: 45, urgent: false },
                  { title: "Medication Refill", desc: "Metformin 500mg prescription expires in 18 days", daysLeft: 18, urgent: false },
                ].map((r, i) => (
                  <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-2xl border ${r.urgent ? "bg-red-50 border-red-200" : "bg-secondary border-border"}`}>
                    <Bell className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${r.urgent ? "text-red-500" : "text-muted-foreground"}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-[12px] font-bold ${r.urgent ? "text-red-700" : "text-foreground"}`}>{r.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{r.desc}</p>
                    </div>
                    <span className={`text-[9px] font-black px-2 py-1 rounded-full shrink-0 ${r.daysLeft <= 7 ? "bg-red-600 text-white" : r.daysLeft <= 30 ? "bg-amber-500 text-white" : "bg-secondary text-muted-foreground border border-border"}`}>
                      {r.daysLeft}d
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {activeTab === "appointments" && (
          <AppointmentBooking patientId={(patient as any).id} />
        )}

        {activeTab === "journey" && (
          <div className="p-5 space-y-5">
            {/* Header */}
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl text-white">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <Network className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold">Your Integrated Health Journey</p>
                <p className="text-xs text-white/80">All your health events across every SANAD portal — in one timeline</p>
              </div>
              <div className="ml-auto text-right shrink-0">
                <p className="text-2xl font-bold">{(patient.visits?.length ?? 0) + (patient.labResults?.length ?? 0) + (patient.medications?.length ?? 0)}</p>
                <p className="text-[10px] text-white/70">total health events</p>
              </div>
            </div>

            {/* Cross-Portal Stats */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Doctor Visits", value: patient.visits?.length ?? 0, icon: Stethoscope, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
                { label: "Lab Tests", value: patient.labResults?.length ?? 0, icon: FlaskConical, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200" },
                { label: "Prescriptions", value: patient.medications?.length ?? 0, icon: Pill, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
                { label: "Insurance Claims", value: Math.floor((patient.medications?.length ?? 2) * 1.4), icon: Shield, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className={`rounded-2xl border p-4 ${item.bg} ${item.border} text-center`}>
                    <div className={`w-8 h-8 rounded-xl bg-white mx-auto mb-2 flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${item.color}`} />
                    </div>
                    <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{item.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Integrated Timeline */}
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> Chronological Health Timeline
              </p>
              <div className="space-y-0">
                {[
                  ...(patient.visits ?? []).map((v: any) => ({ type: "visit", date: v.visitDate, title: `${v.visitType} — ${v.department}`, detail: v.diagnosis, sub: v.hospital, icon: Stethoscope, color: "bg-blue-600", badge: "info" as const, portal: "DOCTOR" })),
                  ...(patient.labResults ?? []).map((l: any) => ({ type: "lab", date: l.testDate, title: l.testName, detail: `Result: ${l.result} ${l.unit ?? ""}`, sub: `Reference: ${l.referenceRange ?? "—"}`, icon: FlaskConical, color: l.status === "critical" ? "bg-rose-600" : l.status === "abnormal" ? "bg-amber-600" : "bg-emerald-600", badge: (l.status === "critical" ? "destructive" : l.status === "abnormal" ? "warning" : "success") as any, portal: "LAB" })),
                  ...(patient.medications ?? []).map((m: any) => ({ type: "med", date: m.startDate ?? new Date().toISOString(), title: `Prescribed: ${m.drugName}`, detail: `${m.dosage} · ${m.frequency}`, sub: `By ${m.prescribedBy} · ${m.hospital}`, icon: Pill, color: "bg-purple-600", badge: m.isActive ? "success" as const : "outline" as const, portal: "PHARMACY" })),
                  { type: "insurance", date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), title: "Insurance Claim — Approved", detail: "Annual diabetes management package · SAR 4,800", sub: "Bupa Arabia · Coverage 80% · Copay SAR 960", icon: Shield, color: "bg-emerald-600", badge: "success" as const, portal: "INSURANCE" },
                  { type: "insurance", date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), title: "Pre-Auth AUTO-APPROVED — Insulin Glargine", detail: "Clinical necessity score: 94/100 · ADA guideline aligned", sub: "Approved in 2.8 seconds · SAR 85 copay", icon: CheckCircle2, color: "bg-emerald-600", badge: "success" as const, portal: "INSURANCE" },
                  { type: "ai", date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), title: "AI Risk Score Updated — 78/100", detail: "HbA1c 9.2% → Risk trajectory: WORSENING. LACE+ score: 14/19", sub: "Cascaded to: Doctor · Insurance · Supply Chain · Family", icon: Brain, color: "bg-rose-600", badge: "destructive" as const, portal: "AI ENGINE" },
                  { type: "family", date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), title: "Family Genetic Risk Cascade Triggered", detail: "2 family members flagged for DM Type 2 predisposition (73%, 68%)", sub: "Screening letters sent · Annual HbA1c recommended", icon: Users, color: "bg-sky-600", badge: "info" as const, portal: "FAMILY" },
                  { type: "supply", date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), title: "Drug Supply Alert — Insulin Stock LOW", detail: "Insulin Glargine 300U: 2,100 units at Al-Riyadh hub. Procurement order raised.", sub: "ETA +500 units in 3 days · No disruption to your prescription", icon: Truck, color: "bg-amber-600", badge: "warning" as const, portal: "SUPPLY" },
                ]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((event, i, arr) => {
                    const Icon = event.icon;
                    const isLast = i === arr.length - 1;
                    return (
                      <div key={i} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-white shrink-0 ${event.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          {!isLast && <div className="w-0.5 flex-1 bg-border my-1 min-h-[16px]" />}
                        </div>
                        <div className="pb-4 flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className="text-xs font-bold text-foreground">{event.title}</span>
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md text-white ${event.color} shrink-0`}>{event.portal}</span>
                            <Badge variant={event.badge} className="text-[9px] shrink-0">{event.badge === "success" ? "OK" : event.badge === "destructive" ? "CRITICAL" : event.badge === "warning" ? "FLAG" : "INFO"}</Badge>
                            <span className="ml-auto text-[9px] font-mono text-muted-foreground shrink-0">
                              {format(new Date(event.date), "dd MMM yyyy")}
                            </span>
                          </div>
                          <p className="text-[11px] text-foreground/80">{event.detail}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{event.sub}</p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* AI Journey Summary */}
            <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-2xl">
              <p className="text-[10px] font-bold text-purple-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Brain className="w-3.5 h-3.5" /> AI Journey Intelligence Summary
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Portals Involved", value: "7 / 12", sub: "Doctor, Lab, Insurance, Supply, Family, Research, AI Engine", color: "text-purple-700" },
                  { label: "Cascade Events", value: "14", sub: "Cross-portal triggers from your health data", color: "text-blue-700" },
                  { label: "SAR Saved (AI)", value: "SAR 12,400", sub: "Fraud prevention + supply optimization + early detection", color: "text-emerald-700" },
                ].map((item, i) => (
                  <div key={i} className="bg-white rounded-xl px-4 py-3 border border-purple-100">
                    <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
                    <p className="text-[10px] font-semibold text-foreground mt-0.5">{item.label}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{item.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "summary" && (
          <div className="grid grid-cols-2 divide-x divide-border">
            <div className="p-5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                <Activity className="w-3.5 h-3.5" /> Chronic Conditions
              </p>
              {patient.chronicConditions?.length > 0 ? (
                <div className="space-y-2">
                  {patient.chronicConditions.map((c, i) => (
                    <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5 bg-secondary rounded-2xl">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      <span className="text-sm font-semibold">{c}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">No chronic conditions on record.</p>}
            </div>
            <div className="p-5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-red-500" /> Documented Allergies
              </p>
              {patient.allergies?.length > 0 ? (
                <div className="space-y-2">
                  {patient.allergies.map((a, i) => (
                    <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5 bg-red-50 border border-red-100 rounded-2xl">
                      <StatusDot status="critical" />
                      <span className="text-sm font-bold text-red-700">{a}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">No known allergies.</p>}
            </div>
          </div>
        )}

        {activeTab === "medications" && (
          <table className="w-full data-table">
            <thead><tr>
              <th>Drug Name</th><th>Dosage</th><th>Frequency</th><th>Prescribed By</th><th>Facility</th><th>Status</th>
            </tr></thead>
            <tbody>
              {patient.medications?.map(med => (
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
        )}

        {activeTab === "labs" && (
          <table className="w-full data-table">
            <thead><tr>
              <th>Test Name</th><th>Result</th><th>Reference Range</th><th>Date</th><th>Status</th>
            </tr></thead>
            <tbody>
              {labResults.map(lab => (
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
        )}

        {activeTab === "visits" && (
          <table className="w-full data-table">
            <thead><tr>
              <th>Hospital</th><th>Department</th><th>Visit Type</th><th>Diagnosis</th><th>Date</th>
            </tr></thead>
            <tbody>
              {patient.visits?.map(visit => (
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
        )}
      </Card>
    </Layout>
  );
}
