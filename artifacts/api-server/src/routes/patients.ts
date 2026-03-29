import { Router } from "express";
import { db } from "@workspace/db";
import { patientsTable, medicationsTable, visitsTable, labResultsTable, alertsTable } from "@workspace/db/schema";
import { eq, ilike, or, desc } from "drizzle-orm";
import { calculateRiskScore } from "../lib/ai-engine.js";

const router = Router();

router.get("/", async (req, res) => {
  const search = req.query["search"] as string | undefined;
  const page = parseInt((req.query["page"] as string) || "1");
  const limit = parseInt((req.query["limit"] as string) || "20");
  const offset = (page - 1) * limit;

  let patients;
  if (search) {
    patients = await db
      .select()
      .from(patientsTable)
      .where(
        or(
          ilike(patientsTable.fullName, `%${search}%`),
          ilike(patientsTable.nationalId, `%${search}%`)
        )
      )
      .orderBy(desc(patientsTable.createdAt))
      .limit(limit)
      .offset(offset);
  } else {
    patients = await db
      .select()
      .from(patientsTable)
      .orderBy(desc(patientsTable.createdAt))
      .limit(limit)
      .offset(offset);
  }

  res.json({ patients, total: patients.length, page, limit });
});

router.get("/national/:nationalId", async (req, res) => {
  const { nationalId } = req.params;
  const patient = await db
    .select()
    .from(patientsTable)
    .where(eq(patientsTable.nationalId, nationalId))
    .limit(1);

  if (!patient.length) {
    res.status(404).json({ error: "NOT_FOUND", message: "Patient not found" });
    return;
  }

  const p = patient[0]!;
  const [medications, visits, labResults, alerts] = await Promise.all([
    db.select().from(medicationsTable).where(eq(medicationsTable.patientId, p.id)).orderBy(desc(medicationsTable.createdAt)),
    db.select().from(visitsTable).where(eq(visitsTable.patientId, p.id)).orderBy(desc(visitsTable.visitDate)),
    db.select().from(labResultsTable).where(eq(labResultsTable.patientId, p.id)).orderBy(desc(labResultsTable.testDate)),
    db.select().from(alertsTable).where(eq(alertsTable.patientId, p.id)).orderBy(desc(alertsTable.createdAt)),
  ]);

  const abnormalLabs = labResults.filter(l => l.status !== "normal").length;
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const recentVisits = visits.filter(v => new Date(v.visitDate) >= oneYearAgo).length;

  const riskData = calculateRiskScore({
    dateOfBirth: p.dateOfBirth,
    chronicConditions: p.chronicConditions,
    allergies: p.allergies,
    medicationCount: medications.filter(m => m.isActive).length,
    recentAbnormalLabs: abnormalLabs,
    visitFrequency: recentVisits,
  });

  res.json({
    ...p,
    medications,
    visits,
    labResults,
    alerts,
    riskScore: riskData.riskScore,
  });
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params["id"]!);
  const patient = await db.select().from(patientsTable).where(eq(patientsTable.id, id)).limit(1);

  if (!patient.length) {
    res.status(404).json({ error: "NOT_FOUND", message: "Patient not found" });
    return;
  }

  const p = patient[0]!;
  const [medications, visits, labResults, alerts] = await Promise.all([
    db.select().from(medicationsTable).where(eq(medicationsTable.patientId, p.id)).orderBy(desc(medicationsTable.createdAt)),
    db.select().from(visitsTable).where(eq(visitsTable.patientId, p.id)).orderBy(desc(visitsTable.visitDate)),
    db.select().from(labResultsTable).where(eq(labResultsTable.patientId, p.id)).orderBy(desc(labResultsTable.testDate)),
    db.select().from(alertsTable).where(eq(alertsTable.patientId, p.id)).orderBy(desc(alertsTable.createdAt)),
  ]);

  const abnormalLabs = labResults.filter(l => l.status !== "normal").length;
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const recentVisits = visits.filter(v => new Date(v.visitDate) >= oneYearAgo).length;

  const riskData = calculateRiskScore({
    dateOfBirth: p.dateOfBirth,
    chronicConditions: p.chronicConditions,
    allergies: p.allergies,
    medicationCount: medications.filter(m => m.isActive).length,
    recentAbnormalLabs: abnormalLabs,
    visitFrequency: recentVisits,
  });

  res.json({
    ...p,
    medications,
    visits,
    labResults,
    alerts,
    riskScore: riskData.riskScore,
  });
});

router.post("/", async (req, res) => {
  const body = req.body;
  const [patient] = await db
    .insert(patientsTable)
    .values({
      nationalId: body.nationalId,
      fullName: body.fullName,
      dateOfBirth: body.dateOfBirth,
      gender: body.gender,
      bloodType: body.bloodType,
      phone: body.phone,
      emergencyContact: body.emergencyContact,
      emergencyPhone: body.emergencyPhone,
      chronicConditions: body.chronicConditions || [],
      allergies: body.allergies || [],
    })
    .returning();

  res.status(201).json(patient);
});

export default router;
