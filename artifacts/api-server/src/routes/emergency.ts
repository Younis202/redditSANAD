import { Router } from "express";
import { db } from "@workspace/db";
import { patientsTable, medicationsTable, alertsTable, labResultsTable, visitsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { calculateRiskScore, generateClinicalActions } from "../lib/ai-engine.js";

const router = Router();

router.get("/:nationalId", async (req, res) => {
  const { nationalId } = req.params;

  const patient = await db
    .select()
    .from(patientsTable)
    .where(eq(patientsTable.nationalId, nationalId))
    .limit(1);

  if (!patient.length) {
    res.status(404).json({ error: "NOT_FOUND", message: "Patient not found in system" });
    return;
  }

  const p = patient[0]!;

  const [medications, alerts, labResults, visits] = await Promise.all([
    db.select().from(medicationsTable).where(eq(medicationsTable.patientId, p.id)),
    db.select().from(alertsTable).where(eq(alertsTable.patientId, p.id)),
    db.select().from(labResultsTable).where(eq(labResultsTable.patientId, p.id)).orderBy(desc(labResultsTable.testDate)).limit(10),
    db.select().from(visitsTable).where(eq(visitsTable.patientId, p.id)).orderBy(desc(visitsTable.visitDate)).limit(20),
  ]);

  const activeMeds = medications.filter(m => m.isActive);
  const criticalAlerts = alerts
    .filter(a => a.severity === "critical" || a.severity === "high")
    .map(a => a.message);

  const abnormalLabs = labResults.filter(l => l.status !== "normal").length;
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const recentVisitCount = visits.filter(v => new Date(v.visitDate) >= oneYearAgo).length;

  const riskData = calculateRiskScore({
    dateOfBirth: p.dateOfBirth,
    chronicConditions: p.chronicConditions,
    allergies: p.allergies,
    medicationCount: activeMeds.length,
    recentAbnormalLabs: abnormalLabs,
    visitFrequency: recentVisitCount,
  });

  const clinicalActions = generateClinicalActions(
    p.allergies,
    activeMeds.map(m => m.drugName),
    riskData.riskLevel,
    p.chronicConditions
  );

  const age = new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear();

  res.json({
    id: p.id,
    nationalId: p.nationalId,
    fullName: p.fullName,
    age,
    gender: p.gender,
    bloodType: p.bloodType,
    allergies: p.allergies || [],
    chronicConditions: p.chronicConditions || [],
    currentMedications: activeMeds.map(m => `${m.drugName} ${m.dosage ?? ""}`.trim()),
    emergencyContact: p.emergencyContact || "",
    emergencyPhone: p.emergencyPhone || "",
    riskLevel: riskData.riskLevel,
    riskScore: riskData.riskScore,
    criticalAlerts,
    clinicalActions,
  });
});

export default router;
