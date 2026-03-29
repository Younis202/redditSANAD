import { pgTable, serial, integer, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { patientsTable } from "./patients";

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(),
  patientId: integer("patient_id").references(() => patientsTable.id),
  payload: jsonb("payload").notNull(),
  processedAt: timestamp("processed_at").defaultNow(),
  aiDecisionId: integer("ai_decision_id"),
  source: text("source").default("system"),
});

export type Event = typeof eventsTable.$inferSelect;
