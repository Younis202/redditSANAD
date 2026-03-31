import { Router } from "express";
import { db } from "@workspace/db";
import { labResultsTable, alertsTable, patientsTable, medicationsTable, visitsTable, eventsTable, auditLogTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { runDecisionEngine } from "../lib/decision-engine.js";
import { broadcastToRole } from "../lib/sse.js";

const router = Router();

router.get("/", async (req, res) => {
  const patientId = parseInt(req.query["patientId"] as string);
  if (isNaN(patientId)) {
    res.status(400).json({ error: "INVALID_PARAM", message: "patientId is required" });
    return;
  }

  const labResults = await db
    .select()
    .from(labResultsTable)
    .where(eq(labResultsTable.patientId, patientId))
    .orderBy(desc(labResultsTable.testDate));

  res.json({ labResults });
});

router.post("/", async (req, res) => {
  const body = req.body;
  const [labResult] = await db
    .insert(labResultsTable)
    .values({
      patientId: body.patientId,
      testName: body.testName,
      testDate: body.testDate,
      result: body.result,
      unit: body.unit,
      referenceRange: body.referenceRange,
      status: body.status,
      hospital: body.hospital,
      notes: body.notes,
    })
    .returning();

  if (body.status === "critical") {
    await db.insert(alertsTable).values({
      patientId: body.patientId,
      alertType: "critical-lab",
      severity: "critical",
      title: `Critical Lab Result: ${body.testName}`,
      message: `Critical result: ${body.result} ${body.unit || ""}. Reference: ${body.referenceRange || "N/A"}`,
      isRead: false,
    });
  }

  if (body.status === "critical" || body.status === "abnormal") {
    try {
      const [patient] = await db
        .select()
        .from(patientsTable)
        .where(eq(patientsTable.id, body.patientId))
        .limit(1);

      if (patient) {
        const [medications, allLabs, visits] = await Promise.all([
          db.select().from(medicationsTable).where(eq(medicationsTable.patientId, body.patientId)),
          db.select().from(labResultsTable).where(eq(labResultsTable.patientId, body.patientId)).orderBy(desc(labResultsTable.testDate)).limit(20),
          db.select().from(visitsTable).where(eq(visitsTable.patientId, body.patientId)).orderBy(desc(visitsTable.visitDate)).limit(20),
        ]);

        const decision = runDecisionEngine({
          patient: {
            dateOfBirth: patient.dateOfBirth,
            chronicConditions: patient.chronicConditions,
            allergies: patient.allergies,
            riskScore: patient.riskScore ?? 0,
          },
          medications: medications.map(m => ({ drugName: m.drugName, isActive: m.isActive ?? false, startDate: m.startDate })),
          labResults: allLabs.map(l => ({ testName: l.testName, result: l.result, status: l.status, testDate: l.testDate, unit: l.unit })),
          visits: visits.map(v => ({ visitDate: v.visitDate, visitType: v.visitType, diagnosis: v.diagnosis })),
        });

        await db.insert(eventsTable).values({
          eventType: "LAB_TRIGGERED_AI_DECISION",
          patientId: body.patientId,
          payload: {
            trigger: `${body.status.toUpperCase()} lab: ${body.testName} = ${body.result} ${body.unit || ""}`,
            urgency: decision.urgency,
            riskScore: decision.riskScore,
            riskLevel: decision.riskLevel,
            primaryAction: decision.primaryAction,
          },
          source: "lab_auto_trigger",
        });

        await db.insert(auditLogTable).values({
          who: "Lab Auto-Trigger AI",
          whoRole: "ai_system",
          what: `AUTO_AI: ${body.status.toUpperCase()} ${body.testName}=${body.result} → Urgency=${decision.urgency.toUpperCase()} · Risk=${decision.riskScore}/100`,
          patientId: body.patientId,
          details: { trigger: body.testName, labStatus: body.status, urgency: decision.urgency, riskScore: decision.riskScore },
          confidence: decision.confidence,
        });

        if (decision.urgency === "immediate" || decision.urgency === "urgent") {
          broadcastToRole("doctor", "critical_lab_ai_alert", {
            patientId: body.patientId,
            patientName: patient.fullName,
            nationalId: patient.nationalId,
            testName: body.testName,
            result: `${body.result} ${body.unit || ""}`,
            labStatus: body.status,
            urgency: decision.urgency,
            riskScore: decision.riskScore,
            riskLevel: decision.riskLevel,
            primaryAction: decision.primaryAction,
            timeWindow: decision.timeWindow,
            title: `${body.status === "critical" ? "CRITICAL LAB" : "ABNORMAL LAB"}: ${body.testName} — ${patient.fullName}`,
            severity: body.status === "critical" ? "critical" : "high",
            action: decision.primaryAction,
            timestamp: new Date().toISOString(),
          });

          broadcastToRole("pharmacy", "critical_lab_ai_alert", {
            patientId: body.patientId,
            patientName: patient.fullName,
            nationalId: patient.nationalId,
            testName: body.testName,
            result: `${body.result} ${body.unit || ""}`,
            labStatus: body.status,
            urgency: decision.urgency,
            title: `Lab Alert: ${body.testName} — ${patient.fullName}`,
            severity: body.status === "critical" ? "critical" : "high",
            action: "Review active medications for contraindications",
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch {
    }
  }

  res.status(201).json(labResult);
});

export default router;
