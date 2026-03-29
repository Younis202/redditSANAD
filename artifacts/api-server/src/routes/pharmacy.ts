import { Router } from "express";
import { db } from "@workspace/db";
import { patientsTable, medicationsTable, eventsTable, auditLogTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

const INSURANCE_PROVIDERS = ["Tawuniya", "Bupa Arabia", "MedGulf", "AXA Cooperative", "Al-Rajhi Takaful"];

function checkInsuranceEligibility(drugName: string, conditions: string[]): {
  eligible: boolean;
  provider: string;
  copay: number;
  coveragePercent: number;
  preAuthRequired: boolean;
  notes: string;
} {
  const drug = drugName.toLowerCase();
  const provider = INSURANCE_PROVIDERS[Math.floor(Math.random() * INSURANCE_PROVIDERS.length)]!;

  const isChronicRelated = conditions.some(c =>
    c.toLowerCase().includes("diabetes") ||
    c.toLowerCase().includes("hypertension") ||
    c.toLowerCase().includes("heart")
  );

  if (drug.includes("insulin") || drug.includes("metformin") || drug.includes("glipizide")) {
    return { eligible: true, provider, copay: 5, coveragePercent: 90, preAuthRequired: false, notes: "Antidiabetic medications covered under chronic disease benefit." };
  }
  if (drug.includes("amlodipine") || drug.includes("lisinopril") || drug.includes("atenolol") || drug.includes("ramipril")) {
    return { eligible: true, provider, copay: 10, coveragePercent: 85, preAuthRequired: false, notes: "Antihypertensive therapy covered under chronic disease benefit." };
  }
  if (drug.includes("statin") || drug.includes("atorvastatin") || drug.includes("rosuvastatin")) {
    return { eligible: true, provider, copay: 15, coveragePercent: 80, preAuthRequired: false, notes: "Lipid-lowering agents covered under preventive benefit." };
  }
  if (drug.includes("warfarin") || drug.includes("rivaroxaban") || drug.includes("apixaban")) {
    return { eligible: true, provider, copay: 20, coveragePercent: 75, preAuthRequired: true, notes: "Anticoagulants require prior authorization due to monitoring requirements." };
  }

  return {
    eligible: isChronicRelated,
    provider,
    copay: isChronicRelated ? 20 : 50,
    coveragePercent: isChronicRelated ? 70 : 30,
    preAuthRequired: !isChronicRelated,
    notes: isChronicRelated
      ? "Coverage applies under chronic disease management program."
      : "This medication may require pre-authorization. Contact provider.",
  };
}

function aiDispenseCheck(drugName: string, patient: { allergies: string[] | null; medications: { drugName: string; isActive: boolean }[] }): {
  safe: boolean;
  warnings: string[];
  allergyConflict: boolean;
  interactionConflict: boolean;
  confidenceScore: number;
} {
  const warnings: string[] = [];
  let allergyConflict = false;
  let interactionConflict = false;
  const drug = drugName.toLowerCase();

  for (const allergy of patient.allergies ?? []) {
    const allergyL = allergy.toLowerCase();
    if (
      (allergyL.includes("penicillin") && (drug.includes("amoxicillin") || drug.includes("ampicillin") || drug.includes("penicillin"))) ||
      (allergyL.includes("sulfa") && drug.includes("sulfamethoxazole")) ||
      (allergyL.includes("aspirin") || allergyL.includes("nsaid")) && (drug.includes("ibuprofen") || drug.includes("naproxen") || drug.includes("aspirin"))
    ) {
      allergyConflict = true;
      warnings.push(`⚠️ ALLERGY CONFLICT: Patient is allergic to ${allergy} — ${drugName} is contraindicated.`);
    }
  }

  const activeMeds = patient.medications.filter(m => m.isActive).map(m => m.drugName.toLowerCase());

  if (activeMeds.some(m => m.includes("warfarin")) && (drug.includes("aspirin") || drug.includes("ibuprofen") || drug.includes("naproxen"))) {
    interactionConflict = true;
    warnings.push("⚠️ DRUG INTERACTION: NSAIDs + Warfarin → significantly elevated bleeding risk.");
  }
  if (activeMeds.some(m => m.includes("metformin")) && drug.includes("contrast") ) {
    interactionConflict = true;
    warnings.push("⚠️ DRUG INTERACTION: Metformin + Contrast media → risk of lactic acidosis.");
  }
  if (activeMeds.some(m => m.includes("lithium")) && (drug.includes("ibuprofen") || drug.includes("naproxen"))) {
    interactionConflict = true;
    warnings.push("⚠️ DRUG INTERACTION: NSAIDs + Lithium → increased lithium toxicity risk.");
  }
  if (activeMeds.some(m => m.includes("ssri") || m.includes("fluoxetine") || m.includes("sertraline")) && drug.includes("tramadol")) {
    interactionConflict = true;
    warnings.push("⚠️ DRUG INTERACTION: SSRI + Tramadol → serotonin syndrome risk.");
  }

  const safe = !allergyConflict && !interactionConflict;
  if (safe && warnings.length === 0) {
    warnings.push("✅ No contraindications detected. Safe to dispense per AI analysis.");
  }

  return {
    safe,
    warnings,
    allergyConflict,
    interactionConflict,
    confidenceScore: allergyConflict ? 0.98 : interactionConflict ? 0.94 : 0.92,
  };
}

router.get("/patient/:nationalId", async (req, res) => {
  const { nationalId } = req.params;
  const patients = await db
    .select()
    .from(patientsTable)
    .where(eq(patientsTable.nationalId, nationalId))
    .limit(1);

  if (!patients.length) {
    return res.status(404).json({ error: "Patient not found" });
  }

  const patient = patients[0]!;
  const medications = await db
    .select()
    .from(medicationsTable)
    .where(eq(medicationsTable.patientId, patient.id))
    .orderBy(desc(medicationsTable.startDate));

  const activeMeds = medications.filter(m => m.isActive);

  const prescriptionsWithCheck = activeMeds.map(med => ({
    ...med,
    dispenseCheck: aiDispenseCheck(med.drugName, {
      allergies: patient.allergies,
      medications,
    }),
    insurance: checkInsuranceEligibility(med.drugName, patient.chronicConditions ?? []),
  }));

  res.json({
    patient: {
      id: patient.id,
      name: patient.fullName,
      nationalId: patient.nationalId,
      age: new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear(),
      bloodType: patient.bloodType,
      allergies: patient.allergies,
      chronicConditions: patient.chronicConditions,
      riskScore: patient.riskScore,
      
    },
    prescriptions: prescriptionsWithCheck,
    allMedications: medications,
    summary: {
      active: activeMeds.length,
      total: medications.length,
      interactions: prescriptionsWithCheck.filter(p => !p.dispenseCheck.safe).length,
      insuranceCovered: prescriptionsWithCheck.filter(p => p.insurance.eligible).length,
    },
  });
});

router.post("/dispense/:medicationId", async (req, res) => {
  const { medicationId } = req.params;
  const { pharmacistName, notes } = req.body;

  const meds = await db.select().from(medicationsTable).where(eq(medicationsTable.id, parseInt(medicationId))).limit(1);
  if (!meds.length) return res.status(404).json({ error: "Prescription not found" });

  const med = meds[0]!;

  const patients = await db.select().from(patientsTable).where(eq(patientsTable.id, med.patientId)).limit(1);
  if (!patients.length) return res.status(404).json({ error: "Patient not found" });

  const patient = patients[0]!;
  const allMeds = await db.select().from(medicationsTable).where(eq(medicationsTable.patientId, med.patientId));
  const dispenseCheck = aiDispenseCheck(med.drugName, { allergies: patient.allergies, medications: allMeds });
  const insurance = checkInsuranceEligibility(med.drugName, patient.chronicConditions ?? []);

  await db.insert(eventsTable).values({
    eventType: "DRUG_DISPENSED",
    patientId: med.patientId,
    payload: JSON.stringify({ drugName: med.drugName, dosage: med.dosage, frequency: med.frequency, pharmacist: pharmacistName }),
    source: "pharmacy_portal",
    processedBy: "AI Pharmacy Guard v1.5",
  }).catch(() => {});

  await db.insert(auditLogTable).values({
    who: pharmacistName ?? "Pharmacist (Pharmacy Portal)",
    whoRole: "pharmacist",
    what: `DRUG_DISPENSED: ${med.drugName} ${med.dosage} — ${dispenseCheck.safe ? "CLEARED" : "WARNING OVERRIDDEN"}`,
    patientId: med.patientId,
    confidence: dispenseCheck.confidenceScore,
  }).catch(() => {});

  res.json({
    dispensed: true,
    medication: med,
    dispenseCheck,
    insurance,
    event: "DRUG_DISPENSED",
    auditId: Date.now(),
  });
});

export default router;
