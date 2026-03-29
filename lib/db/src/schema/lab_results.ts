import { pgTable, serial, integer, text, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { patientsTable } from "./patients";

export const labResultsTable = pgTable("lab_results", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patientsTable.id),
  testName: text("test_name").notNull(),
  testDate: date("test_date").notNull(),
  result: text("result").notNull(),
  unit: text("unit"),
  referenceRange: text("reference_range"),
  status: text("status", { enum: ["normal", "abnormal", "critical"] }).notNull(),
  hospital: text("hospital").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLabResultSchema = createInsertSchema(labResultsTable).omit({ id: true, createdAt: true });
export type InsertLabResult = z.infer<typeof insertLabResultSchema>;
export type LabResult = typeof labResultsTable.$inferSelect;
