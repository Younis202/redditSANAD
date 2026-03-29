import { Router } from "express";
import { db } from "@workspace/db";
import { patientsTable, labResultsTable, eventsTable, auditLogTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();

function interpretLabResult(testName: string, result: string, unit: string, status: string): {
  significance: string;
  riskImpact: number;
  trend: string;
  action: string;
  confidence: number;
} {
  const val = parseFloat(result);
  const name = testName.toLowerCase();

  if (status === "critical") {
    return {
      significance: `Critical ${testName} value requires immediate clinical attention. This result falls outside safe physiological limits.`,
      riskImpact: 25,
      trend: "CRITICAL FLAG",
      action: "Immediate physician notification required. Do not delay.",
      confidence: 0.97,
    };
  }

  if (name.includes("hba1c") || name.includes("hemoglobin a1c")) {
    if (val >= 6.5) return { significance: "HbA1c ≥6.5% confirms diabetes diagnosis. Long-term glycemic control is poor.", riskImpact: 20, trend: "DIABETIC RANGE", action: "Initiate or intensify antidiabetic therapy. Schedule endocrinology referral.", confidence: 0.95 };
    if (val >= 5.7) return { significance: "Pre-diabetic range. Risk of progression to Type 2 Diabetes within 5 years.", riskImpact: 12, trend: "PRE-DIABETIC", action: "Lifestyle modification counseling. Repeat in 3 months.", confidence: 0.92 };
    return { significance: "HbA1c within normal range. Glycemic control is satisfactory.", riskImpact: 0, trend: "NORMAL", action: "Continue current management. Annual screening.", confidence: 0.94 };
  }

  if (name.includes("creatinine")) {
    if (val > 1.2 && unit?.toLowerCase().includes("mg")) return { significance: "Elevated creatinine suggests impaired renal filtration (GFR likely reduced).", riskImpact: 18, trend: "RENAL STRESS", action: "Calculate eGFR. Consider nephrology referral. Review nephrotoxic medications.", confidence: 0.91 };
    return { significance: "Renal function within acceptable limits.", riskImpact: 2, trend: "NORMAL", action: "Routine monitoring. Annual renal panel.", confidence: 0.93 };
  }

  if (name.includes("cholesterol") && !name.includes("hdl") && !name.includes("ldl")) {
    if (val > 200) return { significance: "Elevated total cholesterol. Cardiovascular risk is significantly increased.", riskImpact: 15, trend: "HIGH", action: "Initiate statin therapy discussion. Dietary modification. Repeat in 6 weeks.", confidence: 0.90 };
    return { significance: "Total cholesterol within target range.", riskImpact: 1, trend: "NORMAL", action: "Maintain heart-healthy diet. Annual lipid panel.", confidence: 0.92 };
  }

  if (name.includes("ldl")) {
    if (val > 130) return { significance: "LDL above optimal. Atherogenic risk elevated — plaque formation accelerated.", riskImpact: 16, trend: "ELEVATED", action: "Statin therapy strongly recommended. Target LDL <100 mg/dL.", confidence: 0.93 };
    return { significance: "LDL within optimal range.", riskImpact: 0, trend: "OPTIMAL", action: "Continue current lipid management.", confidence: 0.92 };
  }

  if (name.includes("glucose") || name.includes("blood sugar")) {
    if (val > 200) return { significance: "Severely elevated blood glucose consistent with hyperglycemic crisis.", riskImpact: 22, trend: "HYPERGLYCEMIC", action: "Immediate insulin management. Assess for DKA. Hydration.", confidence: 0.96 };
    if (val > 126) return { significance: "Fasting glucose consistent with diabetes mellitus diagnosis.", riskImpact: 18, trend: "DIABETIC RANGE", action: "Confirm with repeat fasting glucose or HbA1c. Start antidiabetic treatment.", confidence: 0.94 };
    if (val > 100) return { significance: "Impaired fasting glucose. Pre-diabetic metabolic state.", riskImpact: 10, trend: "PRE-DIABETIC", action: "Lifestyle intervention. Repeat glucose testing in 3 months.", confidence: 0.91 };
    return { significance: "Fasting glucose within normal physiological range.", riskImpact: 0, trend: "NORMAL", action: "Continue dietary management. Annual screening.", confidence: 0.93 };
  }

  if (name.includes("hemoglobin") || name.includes("haemoglobin")) {
    if (val < 8) return { significance: "Severe anemia. Tissue oxygenation critically compromised.", riskImpact: 20, trend: "SEVERE ANEMIA", action: "Urgent hematology consult. Consider transfusion.", confidence: 0.95 };
    if (val < 12) return { significance: "Mild-moderate anemia. Fatigue, reduced capacity expected.", riskImpact: 12, trend: "ANEMIA", action: "Iron studies, B12, folate levels. Treat underlying cause.", confidence: 0.91 };
    return { significance: "Hemoglobin within normal range. No anemia detected.", riskImpact: 0, trend: "NORMAL", action: "Routine follow-up.", confidence: 0.93 };
  }

  if (status === "abnormal") {
    return {
      significance: `${testName} is outside the normal reference range. Clinical context required for interpretation.`,
      riskImpact: 8,
      trend: "ABNORMAL",
      action: "Physician review recommended. Correlate with clinical presentation.",
      confidence: 0.85,
    };
  }

  return {
    significance: `${testName} within normal limits. No immediate clinical concern.`,
    riskImpact: 0,
    trend: "NORMAL",
    action: "Routine follow-up as per standard care guidelines.",
    confidence: 0.92,
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
  const labs = await db
    .select()
    .from(labResultsTable)
    .where(eq(labResultsTable.patientId, patient.id))
    .orderBy(desc(labResultsTable.testDate));

  const labsWithInterpretation = labs.map(lab => ({
    ...lab,
    interpretation: interpretLabResult(lab.testName, lab.result, lab.unit ?? "", lab.status),
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
    labs: labsWithInterpretation,
    summary: {
      total: labs.length,
      critical: labs.filter(l => l.status === "critical").length,
      abnormal: labs.filter(l => l.status === "abnormal").length,
      normal: labs.filter(l => l.status === "normal").length,
    },
  });
});

router.post("/result", async (req, res) => {
  const { patientId, testName, result, unit, referenceRange, status, hospital, notes } = req.body;

  if (!patientId || !testName || !result || !status) {
    return res.status(400).json({ error: "patientId, testName, result, and status are required" });
  }

  const [newResult] = await db.insert(labResultsTable).values({
    patientId,
    testName,
    result,
    unit: unit ?? "",
    referenceRange: referenceRange ?? "",
    status,
    hospital: hospital ?? "SANAD Lab Network",
    notes: notes ?? "",
    testDate: new Date().toISOString().split("T")[0]!,
  }).returning();

  const interpretation = interpretLabResult(testName, result, unit ?? "", status);

  await db.insert(eventsTable).values({
    eventType: "LAB_RESULT_RECEIVED",
    patientId,
    payload: JSON.stringify({ testName, result, unit, status, interpretation }),
    source: "lab_portal",
    processedBy: "AI Lab Interpreter v2.0",
  }).catch(() => {});

  if (status === "critical" || status === "abnormal") {
    const { alertsTable: alerts } = await import("@workspace/db/schema");
    const severity = status === "critical" ? "critical" : "warning";
    const title = status === "critical"
      ? `CRITICAL LAB: ${testName} requires immediate action`
      : `Abnormal Lab Result: ${testName} outside normal range`;
    const message = `${testName} = ${result} ${unit ?? ""}. ${interpretation.significance} Action: ${interpretation.action}`;
    await db.insert(alerts).values({ patientId, alertType: "lab_critical", severity, title, message }).catch(() => {});
  }

  await db.insert(auditLogTable).values({
    who: "Lab Technician (Lab Portal)",
    whoRole: "lab_technician",
    what: `LAB_RESULT_UPLOADED: ${testName} = ${result} ${unit} (${status.toUpperCase()})`,
    patientId,
    confidence: interpretation.confidence,
  }).catch(() => {});

  res.json({
    result: newResult,
    interpretation,
    event: "LAB_RESULT_RECEIVED",
    aiAnalysis: {
      status,
      significance: interpretation.significance,
      riskImpact: interpretation.riskImpact,
      action: interpretation.action,
      confidence: interpretation.confidence,
    },
  });
});

export default router;
