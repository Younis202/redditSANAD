export type Urgency = "routine" | "soon" | "urgent" | "immediate";
export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface WhyFactor {
  factor: string;
  impact: "low" | "moderate" | "high" | "critical";
  contribution: number;
  description: string;
}

export interface DigitalTwinProjection {
  timeframe: string;
  predictedConditions: string[];
  riskTrajectory: "improving" | "stable" | "worsening" | "rapidly_worsening";
  projectedRiskScore: number;
  keyDrivers: string[];
  interventionWindow: string;
}

export interface BehavioralFlag {
  type: "non_compliant" | "missed_appointments" | "polypharmacy_risk" | "frequent_ed" | "lifestyle_risk";
  severity: "low" | "moderate" | "high";
  description: string;
  recommendation: string;
}

export interface AiDecisionResult {
  riskScore: number;
  riskLevel: RiskLevel;
  urgency: Urgency;
  primaryAction: string;
  timeWindow: string;
  whyFactors: WhyFactor[];
  confidence: number;
  source: string;
  recommendations: string[];
  digitalTwin: DigitalTwinProjection;
  behavioralFlags: BehavioralFlag[];
  slaDeadline: string;
  explainability: {
    summary: string;
    clinicalBasis: string[];
    uncertaintyNote: string | null;
  };
}

export interface DecisionInput {
  patient: {
    dateOfBirth: string;
    chronicConditions: string[] | null;
    allergies: string[] | null;
    riskScore: number;
  };
  medications: Array<{ drugName: string; isActive: boolean; startDate?: string | null }>;
  labResults: Array<{ testName: string; result: string; status: string; testDate: string; unit?: string | null }>;
  visits: Array<{ visitDate: string; visitType: string; diagnosis?: string | null }>;
}

function getAge(dob: string): number {
  return new Date().getFullYear() - new Date(dob).getFullYear();
}

const ARABIC_TO_ENGLISH: Record<string, string> = {
  "السكري من النوع الثاني": "type 2 diabetes",
  "السكري من النوع الأول": "type 1 diabetes",
  "السكري": "diabetes",
  "ارتفاع ضغط الدم": "hypertension",
  "أمراض القلب التاجية": "coronary artery disease",
  "فشل القلب": "heart failure",
  "قصور القلب": "heart failure",
  "الفشل الكلوي المزمن": "chronic kidney disease",
  "مرض الكلى المزمن": "chronic kidney disease",
  "ckd": "ckd",
  "مرض الانسداد الرئوي المزمن": "copd",
  "الربو": "asthma",
  "قصور الغدة الدرقية": "hypothyroidism",
  "فرط نشاط الغدة الدرقية": "hyperthyroidism",
  "السرطان": "cancer",
  "الرجفان الأذيني": "atrial fibrillation",
  "السكتة الدماغية": "stroke",
  "تشمع الكبد": "cirrhosis",
  "الاكتئاب": "depression",
  "نقص صفيحات الدم": "thrombocytopenia",
};

function normalizeName(name: string): string {
  const lower = name.toLowerCase().trim();
  return ARABIC_TO_ENGLISH[name.trim()] ?? ARABIC_TO_ENGLISH[lower] ?? lower;
}

export function runDecisionEngine(input: DecisionInput): AiDecisionResult {
  const { patient, medications, labResults, visits } = input;
  const age = getAge(patient.dateOfBirth);
  const conditions = (patient.chronicConditions ?? []).map(normalizeName);
  const activeMeds = medications.filter(m => m.isActive);
  const criticalLabs = labResults.filter(l => l.status === "critical");
  const abnormalLabs = labResults.filter(l => l.status !== "normal");

  const now = new Date();
  const threeMonthsAgo = new Date(now); threeMonthsAgo.setMonth(now.getMonth() - 3);
  const sixMonthsAgo = new Date(now); sixMonthsAgo.setMonth(now.getMonth() - 6);

  const recentVisits = visits.filter(v => new Date(v.visitDate) >= threeMonthsAgo);
  const recentEmergencies = visits.filter(v =>
    new Date(v.visitDate) >= sixMonthsAgo &&
    (v.visitType === "emergency" || v.visitType === "inpatient")
  );

  const labsByName: Record<string, typeof labResults> = {};
  for (const lab of [...labResults].sort((a, b) => new Date(b.testDate).getTime() - new Date(a.testDate).getTime())) {
    const key = normalizeName(lab.testName);
    if (!labsByName[key]) labsByName[key] = [];
    labsByName[key].push(lab);
  }

  const whyFactors: WhyFactor[] = [];
  let score = patient.riskScore;
  let confidencePoints = 0;
  let totalConfidenceWeight = 0;

  const addFactor = (factor: string, impact: WhyFactor["impact"], contribution: number, description: string, confidence: number) => {
    whyFactors.push({ factor, impact, contribution, description });
    confidencePoints += confidence;
    totalConfidenceWeight += 1;
  };

  if (age >= 75) {
    addFactor("Advanced Age (75+)", "high", 25, `Patient is ${age} years old — significantly elevated baseline risk.`, 0.95);
  } else if (age >= 60) {
    addFactor("Senior Age (60+)", "moderate", 15, `Patient is ${age} years old — moderate age-related risk.`, 0.9);
  }

  const highRiskConditions = ["heart failure", "coronary artery disease", "chronic kidney disease", "ckd", "copd", "cancer", "cirrhosis", "atrial fibrillation"];
  const moderateRiskConditions = ["hypertension", "type 2 diabetes", "type 1 diabetes", "diabetes", "hypothyroidism", "asthma", "stroke", "depression"];

  for (const cond of conditions) {
    if (highRiskConditions.some(h => cond.includes(h))) {
      addFactor(`High-Risk Condition: ${patient.chronicConditions?.find(c => normalizeName(c) === cond) ?? cond}`, "high", 20, `${cond} is a primary driver of clinical risk requiring specialist management.`, 0.92);
    } else if (moderateRiskConditions.some(m => cond.includes(m))) {
      addFactor(`Condition: ${patient.chronicConditions?.find(c => normalizeName(c) === cond) ?? cond}`, "moderate", 10, `${cond} requires active management and regular monitoring.`, 0.85);
    }
  }

  if (activeMeds.length >= 5) {
    addFactor("Polypharmacy (≥5 drugs)", "high", 20, `Patient on ${activeMeds.length} concurrent medications — elevated drug interaction and adverse event risk.`, 0.88);
  } else if (activeMeds.length >= 3) {
    addFactor("Multiple Medications", "moderate", 10, `${activeMeds.length} active medications require periodic reconciliation review.`, 0.82);
  }

  if (criticalLabs.length > 0) {
    addFactor(`Critical Lab Values (${criticalLabs.length})`, "critical", 30, `${criticalLabs.map(l => l.testName).join(", ")} in critical range — immediate clinical attention required.`, 0.97);
  } else if (abnormalLabs.length >= 3) {
    addFactor(`Multiple Abnormal Labs (${abnormalLabs.length})`, "high", 20, `${abnormalLabs.length} abnormal results indicating unresolved pathology.`, 0.88);
  } else if (abnormalLabs.length > 0) {
    addFactor(`Abnormal Lab Results (${abnormalLabs.length})`, "moderate", 10, `${abnormalLabs.length} lab results outside normal range.`, 0.8);
  }

  if (recentVisits.length >= 3) {
    addFactor("Escalating Admission Pattern", "high", 15, `${recentVisits.length} visits in last 3 months — suggests disease instability or inadequate outpatient control.`, 0.86);
  } else if (recentEmergencies.length >= 2) {
    addFactor("Recurrent Emergency Visits", "moderate", 12, `${recentEmergencies.length} emergency presentations in 6 months.`, 0.8);
  }

  const hba1cLabs = labsByName["hba1c"] ?? labsByName["glycated hemoglobin"] ?? [];
  if (conditions.some(c => c.includes("diabetes")) && hba1cLabs.length > 0) {
    const hba1cVal = parseFloat(hba1cLabs[0]?.result ?? "0");
    if (hba1cVal > 8.5) {
      addFactor("Uncontrolled Diabetes (HbA1c > 8.5%)", "critical", 25, `HbA1c of ${hba1cVal}% indicates poor glycemic control with high complication risk.`, 0.95);
    } else if (hba1cVal > 7.5) {
      addFactor("Suboptimal Glycemic Control (HbA1c > 7.5%)", "high", 15, `HbA1c of ${hba1cVal}% — diabetes management needs optimization.`, 0.9);
    }
  }

  const creatinineLabs = labsByName["creatinine"] ?? labsByName["serum creatinine"] ?? [];
  if ((conditions.some(c => c.includes("kidney") || c.includes("ckd") || c.includes("renal"))) && creatinineLabs.length > 0) {
    const creatVals = creatinineLabs.slice(0, 3).map(l => parseFloat(l.result)).filter(v => !isNaN(v));
    if (creatVals.length >= 2 && creatVals[0]! > creatVals[creatVals.length - 1]!) {
      const rise = ((creatVals[0]! - creatVals[creatVals.length - 1]!) / (creatVals[creatVals.length - 1]! || 1)) * 100;
      if (rise > 20) {
        addFactor("Rising Creatinine — CKD Progression", "high", 18, `Creatinine rose ${Math.round(rise)}% — indicates accelerating kidney function decline.`, 0.9);
      }
    }
  }

  if ((patient.allergies?.length ?? 0) >= 3) {
    addFactor("Multiple Drug Allergies", "moderate", 8, `${patient.allergies?.length} documented allergies — prescribing window is narrow.`, 0.82);
  }

  const finalScore = Math.min(100, score);
  const riskLevel: RiskLevel =
    finalScore >= 70 ? "critical" :
    finalScore >= 50 ? "high" :
    finalScore >= 25 ? "medium" : "low";

  let urgency: Urgency;
  let primaryAction: string;
  let timeWindow: string;
  let slaDeadline: string;

  if (criticalLabs.length > 0 || finalScore >= 80) {
    urgency = "immediate";
    primaryAction = criticalLabs.length > 0
      ? `CRITICAL LAB ALERT: ${criticalLabs[0]?.testName} — Immediate physician review required`
      : "CRITICAL RISK: Immediate specialist referral and urgent care escalation required";
    timeWindow = "Act within 3 hours";
    slaDeadline = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
  } else if (finalScore >= 60 || recentEmergencies.length >= 2) {
    urgency = "urgent";
    primaryAction = "URGENT: Specialist referral within 24–48 hours. Optimize current treatment plan.";
    timeWindow = "Within 24–48 hours";
    slaDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  } else if (finalScore >= 35 || abnormalLabs.length >= 2) {
    urgency = "soon";
    primaryAction = "Schedule specialist consultation within 2 weeks. Review medications and lab trends.";
    timeWindow = "Within 2 weeks";
    slaDeadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  } else {
    urgency = "routine";
    primaryAction = "Continue routine monitoring. Annual preventive screening recommended.";
    timeWindow = "Next routine appointment";
    slaDeadline = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  }

  const recommendations: string[] = [];
  if (criticalLabs.length > 0) recommendations.push(`Urgent review of ${criticalLabs.map(l => l.testName).join(", ")} — initiate treatment protocol`);
  if (activeMeds.length >= 5) recommendations.push("Medication reconciliation — consider deprescribing under specialist review");
  if (conditions.some(c => c.includes("diabetes"))) recommendations.push("Glycemic optimization — target HbA1c < 7%. Consider endocrinology referral if > 8%");
  if (conditions.some(c => c.includes("kidney") || c.includes("ckd"))) recommendations.push("Nephrology referral — avoid nephrotoxins, strict BP control (target < 130/80)");
  if (conditions.some(c => c.includes("heart failure"))) recommendations.push("Daily weight monitoring, fluid restriction < 1.5L/day, cardiology follow-up within 2 weeks");
  if (recentEmergencies.length >= 2) recommendations.push("Care coordination review — transitional care program to prevent further emergency admissions");
  if (recommendations.length === 0) recommendations.push("Continue routine monitoring and preventive care schedule");

  const digitalTwin = buildDigitalTwin(patient, conditions, labsByName, finalScore, riskLevel, activeMeds.length);
  const behavioralFlags = detectBehavioralFlags(visits, activeMeds, patient, recentEmergencies);

  const rawConfidence = totalConfidenceWeight > 0 ? confidencePoints / totalConfidenceWeight : 0.65;
  const confidence = Math.min(0.97, Math.max(0.5, rawConfidence));

  const uncertaintyNote = confidence < 0.7
    ? "Low confidence — limited clinical data available. Human review strongly recommended."
    : confidence < 0.8
    ? "Moderate confidence — some data gaps present. Clinical correlation advised."
    : null;

  const clinicalBasis: string[] = [];
  if (whyFactors.some(f => f.impact === "critical" || f.impact === "high")) clinicalBasis.push("Clinical risk stratification based on multi-factor scoring");
  if (hba1cLabs.length > 0) clinicalBasis.push("HbA1c trend analysis — diabetic guideline thresholds (ADA 2024)");
  if (creatinineLabs.length >= 2) clinicalBasis.push("Renal function trajectory — KDIGO progression criteria");
  if (activeMeds.length >= 3) clinicalBasis.push("Polypharmacy assessment — Beers Criteria & STOPP/START");
  if (clinicalBasis.length === 0) clinicalBasis.push("General population health risk scoring");

  return {
    riskScore: finalScore,
    riskLevel,
    urgency,
    primaryAction,
    timeWindow,
    whyFactors: whyFactors.slice(0, 6),
    confidence,
    source: "clinical_rules_v3",
    recommendations,
    digitalTwin,
    behavioralFlags,
    slaDeadline,
    explainability: {
      summary: `Patient has ${riskLevel} risk (score: ${finalScore}/100) based on ${whyFactors.length} identified clinical factors. Urgency: ${urgency.toUpperCase()}.`,
      clinicalBasis,
      uncertaintyNote,
    },
  };
}

function buildDigitalTwin(
  patient: DecisionInput["patient"],
  conditions: string[],
  labsByName: Record<string, Array<{ testName: string; result: string; status: string; testDate: string; unit?: string | null }>>,
  currentScore: number,
  riskLevel: RiskLevel,
  medCount: number
): DigitalTwinProjection {
  const predictedConditions: string[] = [];
  const keyDrivers: string[] = [];

  const hba1cLabs = labsByName["hba1c"] ?? [];
  const hba1cVal = hba1cLabs.length > 0 ? parseFloat(hba1cLabs[0]?.result ?? "0") : 0;

  if (conditions.some(c => c.includes("diabetes")) && hba1cVal > 7.5) {
    predictedConditions.push("Diabetic nephropathy risk within 18 months if HbA1c remains uncontrolled");
    predictedConditions.push("Cardiovascular event risk elevated 2–3× above baseline");
    keyDrivers.push("Uncontrolled HbA1c");
  }

  const creatinineLabs = labsByName["creatinine"] ?? labsByName["serum creatinine"] ?? [];
  if (conditions.some(c => c.includes("kidney") || c.includes("ckd")) && creatinineLabs.length >= 2) {
    const vals = creatinineLabs.slice(0, 2).map(l => parseFloat(l.result)).filter(v => !isNaN(v));
    if (vals.length === 2 && vals[0]! > vals[1]!) {
      predictedConditions.push("CKD progression to Stage 4 within 12 months at current trajectory");
      keyDrivers.push("Rising creatinine trend");
    }
  }

  if (conditions.some(c => c.includes("hypertension")) && conditions.some(c => c.includes("diabetes"))) {
    predictedConditions.push("Accelerated cardiovascular risk — combined hypertension + diabetes");
    keyDrivers.push("Metabolic syndrome pattern");
  }

  if (medCount >= 5) {
    predictedConditions.push("Increased adverse drug event probability — requires medication review");
    keyDrivers.push("Polypharmacy burden");
  }

  let trajectory: DigitalTwinProjection["riskTrajectory"] = "stable";
  let projectedScore = currentScore;

  if (predictedConditions.length >= 3) {
    trajectory = "rapidly_worsening";
    projectedScore = Math.min(100, currentScore + 20);
  } else if (predictedConditions.length >= 2) {
    trajectory = "worsening";
    projectedScore = Math.min(100, currentScore + 10);
  } else if (predictedConditions.length === 0 && currentScore < 30) {
    trajectory = "improving";
    projectedScore = Math.max(0, currentScore - 5);
  }

  let interventionWindow = "Intervention in next 12 months could prevent predicted deterioration";
  if (trajectory === "rapidly_worsening") interventionWindow = "CRITICAL: Intervention window is 3–6 months before irreversible damage";
  else if (trajectory === "worsening") interventionWindow = "Intervention in next 6–12 months strongly recommended";
  else if (trajectory === "improving") interventionWindow = "Continue current management — trajectory is positive";

  return {
    timeframe: "12-month projection",
    predictedConditions: predictedConditions.slice(0, 3),
    riskTrajectory: trajectory,
    projectedRiskScore: projectedScore,
    keyDrivers: keyDrivers.slice(0, 3),
    interventionWindow,
  };
}

function detectBehavioralFlags(
  visits: DecisionInput["visits"],
  activeMeds: DecisionInput["medications"],
  patient: DecisionInput["patient"],
  recentEmergencies: DecisionInput["visits"]
): BehavioralFlag[] {
  const flags: BehavioralFlag[] = [];
  const now = new Date();
  const sixMonthsAgo = new Date(now); sixMonthsAgo.setMonth(now.getMonth() - 6);

  if (visits.length > 0) {
    const lastVisit = new Date(visits[0]?.visitDate ?? now);
    const daysSince = (now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24);
    const conditions = patient.chronicConditions ?? [];
    if (daysSince > 180 && conditions.length > 0) {
      flags.push({
        type: "missed_appointments",
        severity: "high",
        description: `No recorded visit in ${Math.round(daysSince / 30)} months despite ${conditions.length} chronic conditions.`,
        recommendation: "Outreach nurse visit or telehealth consultation recommended within 2 weeks.",
      });
    }
  }

  if (activeMeds.length >= 5) {
    flags.push({
      type: "polypharmacy_risk",
      severity: "high",
      description: `Patient on ${activeMeds.length} concurrent medications — adherence and interaction risk elevated.`,
      recommendation: "Pharmacy review and medication adherence assessment. Consider blister packs.",
    });
  }

  if (recentEmergencies.length >= 3) {
    flags.push({
      type: "frequent_ed",
      severity: "high",
      description: `${recentEmergencies.length} emergency department visits in 6 months — pattern suggests poor disease management.`,
      recommendation: "Assign care coordinator. Enroll in chronic disease management program.",
    });
  } else if (recentEmergencies.length >= 2) {
    flags.push({
      type: "frequent_ed",
      severity: "moderate",
      description: `${recentEmergencies.length} emergency visits in 6 months.`,
      recommendation: "Review outpatient management plan. Ensure follow-up appointments are booked.",
    });
  }

  return flags;
}
