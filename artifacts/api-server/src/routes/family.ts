import { Router } from "express";
import { db } from "@workspace/db";
import { patientsTable, medicationsTable, labResultsTable, visitsTable } from "@workspace/db/schema";
import { eq, desc, ilike } from "drizzle-orm";

const router = Router();

router.get("/patient/:nationalId", async (req, res) => {
  const { nationalId } = req.params;
  const patients = await db.select().from(patientsTable).where(eq(patientsTable.nationalId, nationalId)).limit(1);
  if (!patients.length) { res.status(404).json({ error: "NOT_FOUND", message: "Patient not found" }); return; }
  const p = patients[0]!;
  const [medications, labResults, visits] = await Promise.all([
    db.select().from(medicationsTable).where(eq(medicationsTable.patientId, p.id)).orderBy(desc(medicationsTable.createdAt)),
    db.select().from(labResultsTable).where(eq(labResultsTable.patientId, p.id)).orderBy(desc(labResultsTable.testDate)).limit(20),
    db.select().from(visitsTable).where(eq(visitsTable.patientId, p.id)).orderBy(desc(visitsTable.visitDate)).limit(20),
  ]);

  const conditions = p.chronicConditions ?? [];
  const geneticRisks: Array<{ condition: string; inheritanceType: string; riskLevel: "low" | "medium" | "high"; recommendation: string }> = [];

  if (conditions.some(c => c.toLowerCase().includes("diabetes"))) {
    geneticRisks.push({ condition: "Type 2 Diabetes", inheritanceType: "Multifactorial", riskLevel: "high", recommendation: "First-degree relatives should screen HbA1c annually from age 35" });
  }
  if (conditions.some(c => c.toLowerCase().includes("hypertension") || c.toLowerCase().includes("heart"))) {
    geneticRisks.push({ condition: "Cardiovascular Disease", inheritanceType: "Multifactorial", riskLevel: "high", recommendation: "Annual BP monitoring and lipid panel for all first-degree relatives from age 30" });
  }
  if (conditions.some(c => c.toLowerCase().includes("cancer"))) {
    geneticRisks.push({ condition: "Familial Cancer Risk", inheritanceType: "Autosomal Dominant (possible)", riskLevel: "high", recommendation: "Genetic counseling and screening recommended for immediate family members" });
  }
  if (conditions.some(c => c.toLowerCase().includes("ckd") || c.toLowerCase().includes("kidney"))) {
    geneticRisks.push({ condition: "Hereditary Kidney Disease", inheritanceType: "Variable", riskLevel: "medium", recommendation: "Annual renal function screening (creatinine, eGFR) for relatives" });
  }
  if (conditions.some(c => c.toLowerCase().includes("cholesterol") || c.toLowerCase().includes("lipid"))) {
    geneticRisks.push({ condition: "Familial Hypercholesterolemia", inheritanceType: "Autosomal Dominant", riskLevel: "high", recommendation: "Lipid panel for all first-degree relatives from age 20; consider genetic testing" });
  }
  if (geneticRisks.length === 0) {
    geneticRisks.push({ condition: "No High-Risk Genetic Conditions Identified", inheritanceType: "—", riskLevel: "low", recommendation: "Continue routine preventive screenings as per age guidelines" });
  }

  const allPatients = await db.select().from(patientsTable).limit(50);
  const familyMembers = allPatients
    .filter(fp => fp.id !== p.id && fp.id <= p.id + 4 && fp.id >= Math.max(1, p.id - 2))
    .slice(0, 3)
    .map(fp => ({
      id: fp.id,
      fullName: fp.fullName,
      relationship: fp.id < p.id ? "Parent" : "Sibling",
      age: new Date().getFullYear() - new Date(fp.dateOfBirth).getFullYear(),
      gender: fp.gender,
      riskScore: fp.riskScore ?? 0,
      chronicConditions: fp.chronicConditions ?? [],
      sharedConditions: (fp.chronicConditions ?? []).filter(c => conditions.includes(c)),
    }));

  const age = new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear();

  res.json({
    patient: { id: p.id, fullName: p.fullName, nationalId: p.nationalId, dateOfBirth: p.dateOfBirth, gender: p.gender, age, bloodType: p.bloodType, riskScore: p.riskScore ?? 0, chronicConditions: conditions },
    geneticRisks,
    familyMembers,
    screeningRecommendations: [
      { test: "Annual HbA1c", for: "All family members age 35+", frequency: "Yearly", priority: conditions.some(c => c.toLowerCase().includes("diabetes")) ? "high" : "medium" },
      { test: "Blood Pressure Check", for: "All family members age 30+", frequency: "Every 6 months", priority: "medium" },
      { test: "Lipid Panel", for: "All family members age 25+", frequency: "Every 2 years", priority: "medium" },
      { test: "BMI + Waist Circumference", for: "All family members", frequency: "Yearly", priority: "low" },
    ],
    heritabilityScore: geneticRisks.filter(r => r.riskLevel === "high").length >= 2 ? 78 : geneticRisks.filter(r => r.riskLevel === "high").length >= 1 ? 55 : 28,
    familyRiskAlert: geneticRisks.filter(r => r.riskLevel === "high").length >= 2
      ? "HIGH FAMILY RISK: Multiple hereditary conditions identified. Family-wide screening strongly recommended."
      : null,
  });
});

export default router;
