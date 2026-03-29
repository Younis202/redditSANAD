import { Router } from "express";
import { db } from "@workspace/db";
import { patientsTable, medicationsTable, visitsTable, alertsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/patient/:nationalId", async (req, res) => {
  const { nationalId } = req.params;
  const patients = await db.select().from(patientsTable).where(eq(patientsTable.nationalId, nationalId)).limit(1);
  if (!patients.length) { res.status(404).json({ error: "NOT_FOUND", message: "Patient not found" }); return; }
  const p = patients[0]!;
  const [medications, visits, alerts] = await Promise.all([
    db.select().from(medicationsTable).where(eq(medicationsTable.patientId, p.id)).orderBy(desc(medicationsTable.createdAt)),
    db.select().from(visitsTable).where(eq(visitsTable.patientId, p.id)).orderBy(desc(visitsTable.visitDate)).limit(20),
    db.select().from(alertsTable).where(eq(alertsTable.patientId, p.id)).limit(10),
  ]);
  const activeMeds = medications.filter(m => m.isActive);
  const riskScore = p.riskScore ?? 0;
  const fraudFlags: string[] = [];
  if (visits.length >= 8) fraudFlags.push("High visit frequency — pattern review recommended");
  if (activeMeds.length >= 7) fraudFlags.push("Unusual polypharmacy — pharmacy audit triggered");
  const fraudRisk = fraudFlags.length > 0 ? "medium" : riskScore >= 70 ? "low" : "low";
  const baseMonthly = 250;
  const riskMultiplier = riskScore >= 70 ? 2.8 : riskScore >= 50 ? 2.1 : riskScore >= 25 ? 1.5 : 1.0;
  const monthlyPremium = Math.round(baseMonthly * riskMultiplier);
  const claims = visits.slice(0, 10).map((v, i) => ({
    claimId: `CLM-2025-${String(p.id).padStart(3, "0")}${String(i + 1).padStart(2, "0")}`,
    date: v.visitDate,
    type: v.visitType === "emergency" ? "Emergency" : v.visitType === "inpatient" ? "Inpatient" : "Outpatient",
    hospital: v.hospital,
    diagnosis: v.diagnosis ?? "General consultation",
    estimatedCost: v.visitType === "emergency" ? 3200 : v.visitType === "inpatient" ? 8500 : 450,
    status: i === 0 ? "pending" : i === 1 ? "under_review" : "approved",
    aiVerified: i > 1,
  }));
  res.json({
    patient: { id: p.id, fullName: p.fullName, nationalId: p.nationalId, dateOfBirth: p.dateOfBirth, gender: p.gender },
    riskScore,
    fraudRisk,
    fraudFlags,
    monthlyPremium,
    riskMultiplier,
    claims,
    activeMeds: activeMeds.length,
    totalClaims: claims.length,
    totalClaimValue: claims.reduce((sum, c) => sum + c.estimatedCost, 0),
    coverageStatus: "active",
    insurancePlan: riskScore >= 70 ? "Comprehensive Plus" : riskScore >= 40 ? "Standard Care" : "Basic Health",
  });
});

router.get("/dashboard", async (req, res) => {
  const [allPatients, allVisits] = await Promise.all([
    db.select().from(patientsTable),
    db.select().from(visitsTable).orderBy(desc(visitsTable.visitDate)).limit(200),
  ]);
  const totalClaims = allVisits.length;
  const pendingClaims = Math.round(totalClaims * 0.12);
  const approvedClaims = Math.round(totalClaims * 0.76);
  const rejectedClaims = Math.round(totalClaims * 0.08);
  const fraudSuspected = Math.round(totalClaims * 0.04);
  const emergencyVisits = allVisits.filter(v => v.visitType === "emergency").length;
  const inpatientVisits = allVisits.filter(v => v.visitType === "inpatient").length;
  const outpatientVisits = allVisits.filter(v => v.visitType === "outpatient").length;
  const totalPayout = emergencyVisits * 3200 + inpatientVisits * 8500 + outpatientVisits * 450;
  const highRiskPatients = allPatients.filter(p => (p.riskScore ?? 0) >= 70).length;
  const criticalPatients = allPatients.filter(p => (p.riskScore ?? 0) >= 85).length;
  res.json({
    totalPolicies: allPatients.length,
    activePolicies: allPatients.length,
    totalClaims,
    pendingClaims,
    approvedClaims,
    rejectedClaims,
    fraudSuspected,
    totalPayout,
    avgClaimValue: totalClaims > 0 ? Math.round(totalPayout / totalClaims) : 0,
    fraudRate: totalClaims > 0 ? ((fraudSuspected / totalClaims) * 100).toFixed(1) : "0",
    approvalRate: totalClaims > 0 ? ((approvedClaims / totalClaims) * 100).toFixed(1) : "0",
    claimsByType: [
      { type: "Emergency", count: emergencyVisits, avgCost: 3200, color: "#ef4444" },
      { type: "Inpatient", count: inpatientVisits, avgCost: 8500, color: "#f97316" },
      { type: "Outpatient", count: outpatientVisits, avgCost: 450, color: "#007AFF" },
    ],
    highRiskPolicies: highRiskPatients,
    criticalPolicies: criticalPatients,
    riskPricingAlerts: [
      { region: "Riyadh", avgRisk: 58, trend: "rising", action: "Increase premiums 15% for high-risk cohort" },
      { region: "Eastern Province", avgRisk: 52, trend: "stable", action: "Maintain current pricing tier" },
      { region: "Makkah", avgRisk: 61, trend: "rising", action: "Flag for quarterly actuarial review" },
    ],
    fraudAlerts: [
      { type: "Duplicate Claims", count: Math.round(fraudSuspected * 0.4), severity: "high" },
      { type: "Unusual Visit Pattern", count: Math.round(fraudSuspected * 0.35), severity: "medium" },
      { type: "Prescription Anomaly", count: Math.round(fraudSuspected * 0.25), severity: "medium" },
    ],
  });
});

export default router;
