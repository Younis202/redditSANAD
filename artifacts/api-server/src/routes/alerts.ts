import { Router } from "express";
import { db } from "@workspace/db";
import { alertsTable, patientsTable } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  const patientId = parseInt(req.query["patientId"] as string);
  if (isNaN(patientId)) {
    res.status(400).json({ error: "INVALID_PARAM", message: "patientId is required" });
    return;
  }

  const alerts = await db
    .select()
    .from(alertsTable)
    .where(eq(alertsTable.patientId, patientId))
    .orderBy(desc(alertsTable.createdAt));

  res.json({ alerts });
});

router.get("/system", async (req, res) => {
  const limit = Math.min(parseInt(req.query["limit"] as string) || 20, 50);

  const alerts = await db
    .select({
      id: alertsTable.id,
      alertType: alertsTable.alertType,
      severity: alertsTable.severity,
      title: alertsTable.title,
      message: alertsTable.message,
      isRead: alertsTable.isRead,
      createdAt: alertsTable.createdAt,
      patientId: alertsTable.patientId,
      patientName: patientsTable.fullName,
      patientNationalId: patientsTable.nationalId,
    })
    .from(alertsTable)
    .leftJoin(patientsTable, eq(alertsTable.patientId, patientsTable.id))
    .orderBy(desc(alertsTable.createdAt))
    .limit(limit);

  const unreadResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(alertsTable)
    .where(eq(alertsTable.isRead, false));

  res.json({
    alerts,
    unreadCount: Number(unreadResult[0]?.count ?? 0),
  });
});

router.patch("/:id/read", async (req, res) => {
  const alertId = parseInt(req.params["id"]!);
  if (isNaN(alertId)) {
    res.status(400).json({ error: "INVALID_PARAM", message: "Invalid alert ID" });
    return;
  }

  await db
    .update(alertsTable)
    .set({ isRead: true })
    .where(eq(alertsTable.id, alertId));

  res.json({ success: true });
});

router.patch("/read-all", async (_req, res) => {
  await db
    .update(alertsTable)
    .set({ isRead: true });

  res.json({ success: true });
});

export default router;
