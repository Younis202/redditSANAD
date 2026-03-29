import { Router } from "express";
import { db } from "@workspace/db";
import { patientsTable, visitsTable } from "@workspace/db/schema";
import { desc, gte } from "drizzle-orm";

const router = Router();

const HOSPITAL_NAME = "King Fahd Medical City";

router.get("/overview", async (req, res) => {
  const allPatients = await db.select().from(patientsTable);
  const recentVisits = await db.select().from(visitsTable).orderBy(desc(visitsTable.visitDate)).limit(500);

  const today = new Date();
  const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const recentAdmissions = recentVisits.filter(v =>
    new Date(v.visitDate) >= last30Days &&
    (v.visitType === "inpatient" || v.visitType === "emergency")
  );

  const emergencyVisits = recentAdmissions.filter(v => v.visitType === "emergency");
  const inpatientVisits = recentAdmissions.filter(v => v.visitType === "inpatient");

  const totalBeds = { icu: 45, general: 320, emergency: 80, pediatric: 60, maternity: 40, surgical: 90 };
  const occupiedBeds = {
    icu: Math.min(totalBeds.icu, Math.round(inpatientVisits.length * 0.15) + 18),
    general: Math.min(totalBeds.general, Math.round(inpatientVisits.length * 0.6) + 95),
    emergency: Math.min(totalBeds.emergency, emergencyVisits.length + 12),
    pediatric: Math.min(totalBeds.pediatric, Math.round(inpatientVisits.length * 0.12) + 8),
    maternity: Math.min(totalBeds.maternity, 22),
    surgical: Math.min(totalBeds.surgical, Math.round(inpatientVisits.length * 0.13) + 30),
  };

  const bedStatus = Object.entries(totalBeds).map(([unit, total]) => {
    const occupied = occupiedBeds[unit as keyof typeof occupiedBeds];
    const available = total - occupied;
    const occupancyPct = Math.round((occupied / total) * 100);
    return {
      unit: unit.charAt(0).toUpperCase() + unit.slice(1).replace("_", " "),
      unitKey: unit,
      total,
      occupied,
      available,
      occupancyPct,
      status: occupancyPct >= 90 ? "critical" : occupancyPct >= 75 ? "high" : occupancyPct >= 50 ? "moderate" : "low",
    };
  });

  const priorityQueue = allPatients
    .filter(p => (p.riskScore ?? 0) >= 50)
    .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0))
    .slice(0, 15)
    .map(p => {
      const patientVisits = recentVisits.filter(v => v.patientId === p.id);
      const lastVisit = patientVisits[0];
      return {
        id: p.id,
        name: p.fullName,
        nationalId: p.nationalId,
        age: new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear(),
        riskScore: p.riskScore ?? 0,
        riskLevel: (p.riskScore ?? 0) >= 70 ? "high" : (p.riskScore ?? 0) >= 40 ? "moderate" : "low",
        chronicConditions: p.chronicConditions ?? [],
        lastVisit: lastVisit ? {
          date: lastVisit.visitDate,
          type: lastVisit.visitType,
          department: lastVisit.department,
        } : null,
        suggestedWard: (p.riskScore ?? 0) >= 80 ? "ICU" : (p.riskScore ?? 0) >= 65 ? "Emergency" : "General",
        priority: (p.riskScore ?? 0) >= 80 ? "immediate" : (p.riskScore ?? 0) >= 65 ? "urgent" : "soon",
      };
    });

  const staffKPIs = {
    doctors: 124,
    nurses: 486,
    specialists: 67,
    available: 89,
    onDuty: 312,
    doctorPatientRatio: `1:${Math.round(allPatients.length / 124)}`,
    nursePatientRatio: `1:${Math.round(allPatients.length / 486)}`,
  };

  const aiCapacityInsights = [
    `ICU occupancy at ${bedStatus.find(b => b.unitKey === "icu")?.occupancyPct}% — ${bedStatus.find(b => b.unitKey === "icu")?.available} beds available. ${bedStatus.find(b => b.unitKey === "icu")!.occupancyPct >= 80 ? "Consider activating surge protocol." : "Within normal operational range."}`,
    `${priorityQueue.filter(p => p.priority === "immediate").length} high-risk patients flagged for immediate clinical review in the next 24 hours.`,
    `Emergency department running at ${bedStatus.find(b => b.unitKey === "emergency")?.occupancyPct}% capacity. ${emergencyVisits.length} emergency admissions in last 30 days.`,
    `AI recommends pre-emptive discharge planning for ${inpatientVisits.length > 20 ? "top 10" : "top 5"} longest-stay patients to free general ward capacity.`,
  ];

  const icuAlerts = priorityQueue
    .filter(p => p.priority === "immediate" || p.suggestedWard === "ICU")
    .slice(0, 6)
    .map(p => ({
      patientId: p.id,
      name: p.name,
      nationalId: p.nationalId,
      riskScore: p.riskScore,
      conditions: p.chronicConditions.slice(0, 2),
      alertType: p.riskScore >= 90 ? "Immediate Transfer Required" : "ICU Review Pending",
      severity: p.riskScore >= 90 ? "critical" : "high",
      timeWindow: p.riskScore >= 90 ? "≤ 15 min" : "≤ 2 hours",
    }));

  const orSchedule = [
    { id: "OR-001", patient: "Patient #1000000003", procedure: "Coronary Bypass Graft", surgeon: "Dr. Al-Rashidi", room: "OR-3", scheduledTime: "08:00", status: "in_progress", estimatedDuration: "4h 30m" },
    { id: "OR-002", patient: "Patient #1000000007", procedure: "Knee Arthroplasty", surgeon: "Dr. Al-Zahrani", room: "OR-1", scheduledTime: "10:30", status: "scheduled", estimatedDuration: "2h 15m" },
    { id: "OR-003", patient: "Patient #1000000012", procedure: "Cholecystectomy", surgeon: "Dr. Al-Ghamdi", room: "OR-2", scheduledTime: "13:00", status: "scheduled", estimatedDuration: "1h 45m" },
    { id: "OR-004", patient: "Patient #1000000019", procedure: "Appendectomy (Emergency)", surgeon: "Dr. Al-Harbi", room: "OR-4", scheduledTime: "14:30", status: "emergency", estimatedDuration: "1h 00m" },
    { id: "OR-005", patient: "Patient #1000000025", procedure: "Hip Replacement", surgeon: "Dr. Al-Otaibi", room: "OR-1", scheduledTime: "16:00", status: "scheduled", estimatedDuration: "3h 00m" },
  ];

  const readmissionRisks = priorityQueue.slice(0, 5).map(p => ({
    patientId: p.id,
    name: p.name,
    nationalId: p.nationalId,
    readmissionRisk: Math.min(95, Math.round(p.riskScore * 0.85 + Math.random() * 10)),
    lastDischarge: p.lastVisit?.date ?? "N/A",
    primaryReason: p.chronicConditions[0] ?? "General",
    recommendedAction: p.riskScore >= 80 ? "Schedule follow-up within 48h" : "Outpatient follow-up in 1 week",
  }));

  res.json({
    hospitalName: HOSPITAL_NAME,
    bedStatus,
    totalBeds: Object.values(totalBeds).reduce((a, b) => a + b, 0),
    totalOccupied: Object.values(occupiedBeds).reduce((a, b) => a + b, 0),
    overallOccupancy: Math.round((Object.values(occupiedBeds).reduce((a, b) => a + b, 0) / Object.values(totalBeds).reduce((a, b) => a + b, 0)) * 100),
    priorityQueue,
    staffKPIs,
    aiCapacityInsights,
    icuAlerts,
    orSchedule,
    readmissionRisks,
    admissionsToday: recentAdmissions.filter(v => new Date(v.visitDate).toDateString() === today.toDateString()).length,
    dischargesToday: 8,
    avgLengthOfStay: 4.2,
    pendingSurgeries: orSchedule.length,
  });
});

export default router;
