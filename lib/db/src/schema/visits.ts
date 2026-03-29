import { pgTable, serial, integer, text, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { patientsTable } from "./patients";

export const visitsTable = pgTable("visits", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patientsTable.id),
  visitDate: date("visit_date").notNull(),
  hospital: text("hospital").notNull(),
  department: text("department").notNull(),
  doctor: text("doctor").notNull(),
  diagnosis: text("diagnosis").notNull(),
  notes: text("notes"),
  visitType: text("visit_type", { enum: ["emergency", "outpatient", "inpatient", "follow-up"] }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVisitSchema = createInsertSchema(visitsTable).omit({ id: true, createdAt: true });
export type InsertVisit = z.infer<typeof insertVisitSchema>;
export type Visit = typeof visitsTable.$inferSelect;
