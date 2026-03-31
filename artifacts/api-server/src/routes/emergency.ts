import { Router } from "express";
import { db } from "@workspace/db";
import { patientsTable, medicationsTable, alertsTable, labResultsTable, visitsTable, eventsTable, auditLogTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { calculateRiskScore, generateClinicalActions, checkDrugInteractions } from "../lib/ai-engine.js";
import { broadcastToRole } from "../lib/sse.js";

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

  // Cross-check all medication pairs for drug interactions
  const medNames = activeMeds.map(m => m.drugName);
  const allInteractions: ReturnType<typeof checkDrugInteractions> = [];
  for (let i = 0; i < medNames.length; i++) {
    const drug = medNames[i]!;
    const others = medNames.filter((_, idx) => idx !== i);
    const found = checkDrugInteractions(drug, others);
    for (const interaction of found) {
      const already = allInteractions.some(
        ex => ex.conflictingDrug === drug || ex.conflictingDrug === interaction.conflictingDrug
      );
      if (!already) allInteractions.push(interaction);
    }
  }

  const age = new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear();

  await db.insert(eventsTable).values({
    eventType: "EMERGENCY_ACCESS",
    patientId: p.id,
    payload: { nationalId, riskScore: riskData.riskScore, riskLevel: riskData.riskLevel, scannedAt: new Date().toISOString() },
    source: "emergency_portal",
  }).catch(() => {});

  await db.insert(auditLogTable).values({
    who: "Emergency Responder",
    whoRole: "emergency",
    what: `EMERGENCY_SCAN: Patient ${p.fullName} (ID: ${nationalId}) — Risk ${riskData.riskScore}/100 ${riskData.riskLevel.toUpperCase()}`,
    patientId: p.id,
  }).catch(() => {});

  if (riskData.riskLevel === "critical" || riskData.riskLevel === "high") {
    broadcastToRole("doctor", "risk_escalation", {
      patientId: p.id,
      patientName: p.fullName,
      nationalId: p.nationalId,
      riskScore: riskData.riskScore,
      riskLevel: riskData.riskLevel,
      urgency: riskData.riskLevel === "critical" ? "immediate" : "urgent",
      primaryAction: clinicalActions[0]?.description ?? "Immediate clinical assessment required",
      title: `🚑 Emergency Scan: ${p.fullName} — ${riskData.riskLevel.toUpperCase()} (${riskData.riskScore}/100)`,
      severity: riskData.riskLevel === "critical" ? "critical" : "high",
      timestamp: new Date().toISOString(),
    });
  }

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
    riskFactors: riskData.factors,
    aiRecommendations: riskData.recommendations,
    drugInteractions: allInteractions,
    criticalAlerts,
    clinicalActions,
  });
});

export default router;
