import { Router } from "express";
import { db } from "@workspace/db";
import { patientsTable, medicationsTable, labResultsTable, visitsTable, aiDecisionsTable, eventsTable, auditLogTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { checkDrugInteractions, calculateRiskScore, generatePredictions } from "../lib/ai-engine.js";
import { runDecisionEngine } from "../lib/decision-engine.js";

const router = Router();

router.post("/check-interaction", async (req, res) => {
  const { patientId, newDrug } = req.body;

  const medications = await db
    .select()
    .from(medicationsTable)
    .where(eq(medicationsTable.patientId, patientId));

  const activeMedNames = medications.filter(m => m.isActive).map(m => m.drugName);
  const warnings = checkDrugInteractions(newDrug, activeMedNames);

  const safe = !warnings.some(w => w.severity === "critical" || w.severity === "high");

  if (patientId && !safe) {
    await db.insert(eventsTable).values({
      eventType: "DRUG_INTERACTION_DETECTED",
      patientId: Number(patientId),
      payload: { newDrug, warnings: warnings.map(w => ({ drug: w.conflictingDrug, severity: w.severity })) },
      source: "physician_portal",
    });
    await db.insert(auditLogTable).values({
      who: "Physician Portal",
      whoRole: "doctor",
      what: `DRUG_INTERACTION_CHECK: ${newDrug} checked — ${warnings.length} conflict(s) found`,
      patientId: Number(patientId),
      details: { newDrug, conflictsFound: warnings.length, safe },
      confidence: safe ? null : 0.95,
    });
  }

  res.json({ safe, warnings });
});

router.get("/risk-score/:patientId", async (req, res) => {
  const patientId = parseInt(req.params["patientId"]!);

  const [patient] = await db
    .select()
    .from(patientsTable)
    .where(eq(patientsTable.id, patientId))
    .limit(1);

  if (!patient) {
    res.status(404).json({ error: "NOT_FOUND", message: "Patient not found" });
    return;
  }

  const [medications, labResults, visits] = await Promise.all([
    db.select().from(medicationsTable).where(eq(medicationsTable.patientId, patientId)),
    db.select().from(labResultsTable).where(eq(labResultsTable.patientId, patientId)).orderBy(desc(labResultsTable.testDate)).limit(10),
    db.select().from(visitsTable).where(eq(visitsTable.patientId, patientId)),
  ]);

  const abnormalLabs = labResults.filter(l => l.status !== "normal").length;
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const recentVisits = visits.filter(v => new Date(v.visitDate) >= oneYearAgo).length;

  const result = calculateRiskScore({
    dateOfBirth: patient.dateOfBirth,
    chronicConditions: patient.chronicConditions,
    allergies: patient.allergies,
    medicationCount: medications.filter(m => m.isActive).length,
    recentAbnormalLabs: abnormalLabs,
    visitFrequency: recentVisits,
  });

  res.json({
    patientId,
    ...result,
  });
});

router.get("/predictions/:patientId", async (req, res) => {
  const patientId = parseInt(req.params["patientId"]!);

  const [patient] = await db
    .select()
    .from(patientsTable)
    .where(eq(patientsTable.id, patientId))
    .limit(1);

  if (!patient) {
    res.status(404).json({ error: "NOT_FOUND", message: "Patient not found" });
    return;
  }

  const [medications, labResults, visits] = await Promise.all([
    db.select().from(medicationsTable).where(eq(medicationsTable.patientId, patientId)),
    db.select().from(labResultsTable).where(eq(labResultsTable.patientId, patientId)).orderBy(desc(labResultsTable.testDate)).limit(20),
    db.select().from(visitsTable).where(eq(visitsTable.patientId, patientId)).orderBy(desc(visitsTable.visitDate)).limit(20),
  ]);

  const activeMedCount = medications.filter(m => m.isActive).length;

  const predictions = generatePredictions({
    dateOfBirth: patient.dateOfBirth,
    chronicConditions: patient.chronicConditions,
    allergies: patient.allergies,
    medicationCount: activeMedCount,
    labResults: labResults.map(l => ({
      testName: l.testName,
      result: l.result,
      status: l.status as "normal" | "abnormal" | "critical",
      testDate: l.testDate,
    })),
    visits: visits.map(v => ({
      visitDate: v.visitDate,
      visitType: v.visitType,
      diagnosis: v.diagnosis ?? "",
    })),
  });

  res.json({ patientId, predictions });
});

router.get("/decision/:patientId", async (req, res) => {
  const patientId = parseInt(req.params["patientId"]!);

  const [patient] = await db
    .select()
    .from(patientsTable)
    .where(eq(patientsTable.id, patientId))
    .limit(1);

  if (!patient) {
    res.status(404).json({ error: "NOT_FOUND", message: "Patient not found" });
    return;
  }

  const [medications, labResults, visits] = await Promise.all([
    db.select().from(medicationsTable).where(eq(medicationsTable.patientId, patientId)),
    db.select().from(labResultsTable).where(eq(labResultsTable.patientId, patientId)).orderBy(desc(labResultsTable.testDate)).limit(20),
    db.select().from(visitsTable).where(eq(visitsTable.patientId, patientId)).orderBy(desc(visitsTable.visitDate)).limit(20),
  ]);

  const decision = runDecisionEngine({
    patient: {
      dateOfBirth: patient.dateOfBirth,
      chronicConditions: patient.chronicConditions,
      allergies: patient.allergies,
      riskScore: patient.riskScore ?? 0,
    },
    medications: medications.map(m => ({
      drugName: m.drugName,
      isActive: m.isActive ?? false,
      startDate: m.startDate,
    })),
    labResults: labResults.map(l => ({
      testName: l.testName,
      result: l.result,
      status: l.status,
      testDate: l.testDate,
      unit: l.unit,
    })),
    visits: visits.map(v => ({
      visitDate: v.visitDate,
      visitType: v.visitType,
      diagnosis: v.diagnosis,
    })),
  });

  const [saved] = await db.insert(aiDecisionsTable).values({
    patientId,
    riskScore: decision.riskScore,
    riskLevel: decision.riskLevel,
    urgency: decision.urgency,
    primaryAction: decision.primaryAction,
    timeWindow: decision.timeWindow,
    whyFactors: decision.whyFactors,
    confidence: decision.confidence,
    source: decision.source,
    recommendations: decision.recommendations,
    digitalTwinProjection: decision.digitalTwin,
    behavioralFlags: decision.behavioralFlags,
  }).returning();

  await db.insert(eventsTable).values({
    eventType: "AI_DECISION_MADE",
    patientId,
    payload: {
      urgency: decision.urgency,
      riskScore: decision.riskScore,
      riskLevel: decision.riskLevel,
      primaryAction: decision.primaryAction,
      confidence: decision.confidence,
      decisionId: saved?.id,
    },
    aiDecisionId: saved?.id,
    source: "decision_engine_v3",
  });

  await db.insert(auditLogTable).values({
    who: "AI Decision Engine v3",
    whoRole: "ai_system",
    what: `AI_DECISION: Urgency=${decision.urgency.toUpperCase()} · Risk=${decision.riskScore}/100 · Action="${decision.primaryAction.substring(0, 80)}..."`,
    patientId,
    details: {
      decisionId: saved?.id,
      factors: decision.whyFactors.length,
      confidence: decision.confidence,
      urgency: decision.urgency,
    },
    aiDecisionId: saved?.id,
    confidence: decision.confidence,
  });

  res.json({
    patientId,
    decisionId: saved?.id,
    ...decision,
  });
});

router.get("/events/:patientId", async (req, res) => {
  const patientId = parseInt(req.params["patientId"]!);
  const events = await db
    .select()
    .from(eventsTable)
    .where(eq(eventsTable.patientId, patientId))
    .orderBy(desc(eventsTable.processedAt))
    .limit(50);

  res.json({ patientId, events });
});

router.get("/audit/:patientId", async (req, res) => {
  const patientId = parseInt(req.params["patientId"]!);
  const logs = await db
    .select()
    .from(auditLogTable)
    .where(eq(auditLogTable.patientId, patientId))
    .orderBy(desc(auditLogTable.createdAt))
    .limit(30);

  res.json({ patientId, auditLog: logs });
});

export default router;
