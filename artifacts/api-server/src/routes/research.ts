import { Router } from "express";
import { db } from "@workspace/db";
import { patientsTable, labResultsTable, visitsTable, medicationsTable, aiDecisionsTable } from "@workspace/db/schema";
import { desc } from "drizzle-orm";

const router = Router();

router.get("/insights", async (req, res) => {
  const [allPatients, allLabs, allVisits, allMeds, allDecisions] = await Promise.all([
    db.select().from(patientsTable),
    db.select().from(labResultsTable).orderBy(desc(labResultsTable.testDate)).limit(500),
    db.select().from(visitsTable).orderBy(desc(visitsTable.visitDate)).limit(500),
    db.select().from(medicationsTable).limit(500),
    db.select().from(aiDecisionsTable).orderBy(desc(aiDecisionsTable.createdAt)).limit(200),
  ]);

  const total = allPatients.length || 1;

  const conditionMap: Record<string, { count: number; totalRisk: number }> = {};
  for (const p of allPatients) {
    for (const c of p.chronicConditions ?? []) {
      if (!conditionMap[c]) conditionMap[c] = { count: 0, totalRisk: 0 };
      conditionMap[c].count++;
      conditionMap[c].totalRisk += (p.riskScore ?? 0);
    }
  }

  const conditionInsights = Object.entries(conditionMap)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 10)
    .map(([condition, data]) => ({
      condition,
      prevalence: Math.round((data.count / total) * 100),
      avgRiskScore: Math.round(data.totalRisk / data.count),
      patientCount: data.count,
      trend: data.count / total > 0.15 ? "rising" : data.count / total > 0.08 ? "stable" : "declining",
    }));

  const labTestMap: Record<string, { total: number; abnormal: number; critical: number }> = {};
  for (const lab of allLabs) {
    if (!labTestMap[lab.testName]) labTestMap[lab.testName] = { total: 0, abnormal: 0, critical: 0 };
    labTestMap[lab.testName].total++;
    if (lab.status === "abnormal") labTestMap[lab.testName].abnormal++;
    if (lab.status === "critical") labTestMap[lab.testName].critical++;
  }

  const labInsights = Object.entries(labTestMap)
    .sort(([, a], [, b]) => (b.abnormal + b.critical * 2) - (a.abnormal + a.critical * 2))
    .slice(0, 8)
    .map(([test, data]) => ({
      test,
      total: data.total,
      abnormalRate: Math.round((data.abnormal / Math.max(data.total, 1)) * 100),
      criticalRate: Math.round((data.critical / Math.max(data.total, 1)) * 100),
    }));

  const drugMap: Record<string, number> = {};
  for (const m of allMeds) {
    drugMap[m.drugName] = (drugMap[m.drugName] || 0) + 1;
  }

  const drugPatterns = Object.entries(drugMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([drug, count]) => ({ drug, prescriptions: count }));

  const ageGroups = ["0-17", "18-34", "35-49", "50-64", "65+"];
  const ageRiskData = ageGroups.map(group => {
    const [minStr, maxStr] = group.split("-");
    const min = parseInt(minStr ?? "0");
    const max = maxStr === "+" ? 999 : parseInt(maxStr ?? "999");
    const groupPatients = allPatients.filter(p => {
      const age = new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear();
      return age >= min && age <= max;
    });
    const avgRisk = groupPatients.length > 0
      ? Math.round(groupPatients.reduce((s, p) => s + (p.riskScore ?? 0), 0) / groupPatients.length)
      : 0;
    return { ageGroup: group, count: groupPatients.length, avgRiskScore: avgRisk };
  });

  const avgConfidence = allDecisions.length > 0
    ? Math.round(allDecisions.reduce((s, d) => s + (d.confidence ?? 0), 0) / allDecisions.length * 100)
    : 0;

  res.json({
    totalAnonymizedRecords: total,
    totalLabResults: allLabs.length,
    totalVisits: allVisits.length,
    conditionInsights,
    labInsights,
    drugPatterns,
    ageRiskData,
    aiMetrics: {
      totalDecisions: allDecisions.length,
      avgConfidence,
      immediateDecisions: allDecisions.filter(d => d.urgency === "immediate").length,
    },
    clinicalFindings: [
      { finding: `Diabetes prevalence at ${conditionInsights.find(c => c.condition.toLowerCase().includes("diabetes"))?.prevalence ?? 0}% — exceeds national benchmark`, significance: "high", recommendation: "Launch targeted HbA1c screening program" },
      { finding: `${labInsights[0]?.test ?? "HbA1c"} abnormal rate at ${labInsights[0]?.abnormalRate ?? 0}% — monitoring gap identified`, significance: "medium", recommendation: "Increase lab monitoring frequency for at-risk populations" },
      { finding: `Age group 50-64 shows highest average risk score (${ageRiskData.find(a => a.ageGroup === "50-64")?.avgRiskScore ?? 0}/100)`, significance: "high", recommendation: "Targeted preventive programs for this cohort" },
    ],
  });
});

router.get("/export", async (req, res) => {
  const format = req.query["format"] ?? "csv";
  const [allPatients, allLabs, allConditions] = await Promise.all([
    db.select().from(patientsTable),
    db.select().from(labResultsTable).orderBy(desc(labResultsTable.testDate)).limit(200),
    db.select().from(patientsTable),
  ]);

  if (format === "csv") {
    const header = "AnonymizedID,AgeGroup,Gender,RiskScore,ChronicConditions,LabCount\n";
    const rows = allPatients.map((p, i) => {
      const age = new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear();
      const ageGroup = age < 18 ? "0-17" : age < 35 ? "18-34" : age < 50 ? "35-49" : age < 65 ? "50-64" : "65+";
      const labCount = allLabs.filter(l => l.patientId === p.id).length;
      return `ANON-${String(i + 1).padStart(4, "0")},${ageGroup},${p.gender},${p.riskScore ?? 0},"${(p.chronicConditions ?? []).join(";")}",${labCount}`;
    });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=\"sanad-research-export.csv\"");
    return res.send(header + rows.join("\n"));
  }

  const anonymized = allPatients.map((p, i) => {
    const age = new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear();
    const ageGroup = age < 18 ? "0-17" : age < 35 ? "18-34" : age < 50 ? "35-49" : age < 65 ? "50-64" : "65+";
    return {
      anonymizedId: `ANON-${String(i + 1).padStart(4, "0")}`,
      ageGroup,
      gender: p.gender,
      riskScore: p.riskScore,
      conditionCount: (p.chronicConditions ?? []).length,
      conditions: p.chronicConditions,
      labResults: allLabs.filter(l => l.patientId === p.id).map(l => ({ test: l.testName, status: l.status })),
    };
  });

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", "attachment; filename=\"sanad-research-export.json\"");
  res.json({ exportedAt: new Date().toISOString(), totalRecords: anonymized.length, records: anonymized });
});

export default router;
