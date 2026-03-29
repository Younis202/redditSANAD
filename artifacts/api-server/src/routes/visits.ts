import { Router } from "express";
import { db } from "@workspace/db";
import { visitsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  const patientId = parseInt(req.query["patientId"] as string);
  if (isNaN(patientId)) {
    res.status(400).json({ error: "INVALID_PARAM", message: "patientId is required" });
    return;
  }

  const visits = await db
    .select()
    .from(visitsTable)
    .where(eq(visitsTable.patientId, patientId))
    .orderBy(desc(visitsTable.visitDate));

  res.json({ visits });
});

router.post("/", async (req, res) => {
  const body = req.body;
  const [visit] = await db
    .insert(visitsTable)
    .values({
      patientId: body.patientId,
      visitDate: body.visitDate,
      hospital: body.hospital,
      department: body.department,
      doctor: body.doctor,
      diagnosis: body.diagnosis,
      notes: body.notes,
      visitType: body.visitType,
    })
    .returning();

  res.status(201).json(visit);
});

export default router;
