import { Router } from "express";
import { db } from "@workspace/db";
import { patientsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

const HOSPITALS = [
  "King Fahd Medical City — Riyadh",
  "King Abdulaziz Medical City — Jeddah",
  "King Khalid University Hospital — Riyadh",
  "Prince Sultan Military Medical City",
  "King Faisal Specialist Hospital & Research Centre",
  "Al-Noor Specialist Hospital — Makkah",
  "Maternity & Children Hospital — Dammam",
  "Aseer Central Hospital — Abha",
];

const DEPARTMENTS = {
  "Cardiology": ["Echocardiogram", "Stress Test", "Cardiac Catheterization Review", "Heart Failure Clinic", "Arrhythmia Clinic"],
  "Endocrinology": ["Diabetes Management", "Thyroid Evaluation", "Adrenal Workup", "HbA1c Review", "Metabolic Syndrome Clinic"],
  "Nephrology": ["CKD Monitoring", "Dialysis Assessment", "Renal Function Review", "Hypertension Clinic"],
  "Pulmonology": ["Spirometry", "COPD Management", "Asthma Review", "Sleep Apnea Evaluation"],
  "Neurology": ["Stroke Prevention", "Headache Clinic", "Epilepsy Management", "Memory Assessment"],
  "Orthopedics": ["Joint Pain Evaluation", "Post-op Follow-up", "Physiotherapy Referral", "Spine Clinic"],
  "Gastroenterology": ["Colonoscopy", "Liver Function Review", "IBD Management", "Nutritional Counseling"],
  "Oncology": ["Chemotherapy Consultation", "Cancer Screening", "Radiation Review", "Palliative Care"],
  "General Medicine": ["Annual Health Check", "Chronic Disease Review", "Preventive Care", "Health Promotion"],
  "Pediatrics": ["Child Health", "Vaccination", "Growth Assessment", "Developmental Screening"],
};

const inMemoryAppointments: any[] = [];
let nextId = 1000;

function getAvailableSlots(date: string, hospital: string, department: string): string[] {
  const bookedSlots = inMemoryAppointments
    .filter(a => a.date === date && a.hospital === hospital && a.department === department)
    .map(a => a.time);
  const allSlots = ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00"];
  return allSlots.filter(s => !bookedSlots.includes(s));
}

router.get("/slots", async (req, res) => {
  const { date, hospital, department } = req.query as Record<string, string>;
  if (!date || !hospital || !department) {
    return res.status(400).json({ error: "date, hospital, and department required" });
  }
  const slots = getAvailableSlots(date, hospital, department);
  res.json({ slots, hospital, department, date });
});

router.get("/patient/:patientId", async (req, res) => {
  const patientId = parseInt(req.params["patientId"]!);
  const appointments = inMemoryAppointments
    .filter(a => a.patientId === patientId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ appointments });
});

router.post("/", async (req, res) => {
  const { patientId, hospital, department, service, date, time, notes } = req.body;

  if (!patientId || !hospital || !department || !date || !time) {
    return res.status(400).json({ error: "patientId, hospital, department, date and time are required" });
  }

  const patient = await db.select().from(patientsTable).where(eq(patientsTable.id, patientId)).limit(1);
  if (patient.length === 0) {
    return res.status(404).json({ error: "Patient not found" });
  }

  const slots = getAvailableSlots(date, hospital, department);
  if (!slots.includes(time)) {
    return res.status(409).json({ error: "This time slot is already booked" });
  }

  const appointment = {
    id: nextId++,
    patientId,
    patientName: patient[0]!.fullName,
    patientNationalId: patient[0]!.nationalId,
    hospital,
    department,
    service: service || department,
    date,
    time,
    notes: notes || null,
    status: "confirmed",
    referenceNo: `APT-${new Date().getFullYear()}-${nextId.toString().padStart(5, "0")}`,
    createdAt: new Date().toISOString(),
    aiReminders: [
      `Bring your National ID and insurance card to ${hospital}`,
      department === "Cardiology" ? "Avoid caffeine and heavy meals 4 hours before your appointment" :
      department === "Endocrinology" ? "Fast for 8 hours before your appointment for accurate blood sugar readings" :
      department === "Nephrology" ? "Bring a list of all current medications — kidney function affected by many drugs" :
      "Bring your complete medical history and recent lab results",
      "Arrive 15 minutes early for registration",
      `Contact ${hospital} at least 24 hours in advance if you need to reschedule`,
    ],
  };

  inMemoryAppointments.push(appointment);
  res.status(201).json({ appointment, success: true });
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params["id"]!);
  const idx = inMemoryAppointments.findIndex(a => a.id === id);
  if (idx === -1) return res.status(404).json({ error: "Appointment not found" });
  inMemoryAppointments[idx]!.status = "cancelled";
  res.json({ success: true });
});

router.get("/hospitals", (_req, res) => {
  res.json({ hospitals: HOSPITALS });
});

router.get("/departments", (_req, res) => {
  res.json({ departments: Object.keys(DEPARTMENTS), services: DEPARTMENTS });
});

export default router;
