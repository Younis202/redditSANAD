import { pgTable, serial, integer, text, timestamp, jsonb, real } from "drizzle-orm/pg-core";

export const auditLogTable = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  who: text("who").notNull(),
  whoRole: text("who_role").notNull(),
  what: text("what").notNull(),
  patientId: integer("patient_id"),
  details: jsonb("details"),
  aiDecisionId: integer("ai_decision_id"),
  confidence: real("confidence"),
  hash: text("hash"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AuditLog = typeof auditLogTable.$inferSelect;
