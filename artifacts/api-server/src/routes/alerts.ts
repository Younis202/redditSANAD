import { Router } from "express";
import { db } from "@workspace/db";
import { alertsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

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

router.patch("/read-all", async (req, res) => {
  const patientId = parseInt(req.body?.patientId as string);
  if (isNaN(patientId)) {
    res.status(400).json({ error: "INVALID_PARAM", message: "patientId is required" });
    return;
  }

  await db
    .update(alertsTable)
    .set({ isRead: true })
    .where(eq(alertsTable.patientId, patientId));

  res.json({ success: true });
});

export default router;
