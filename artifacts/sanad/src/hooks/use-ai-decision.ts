import { useQuery } from "@tanstack/react-query";

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
  type: string;
  severity: "low" | "moderate" | "high";
  description: string;
  recommendation: string;
}

export interface AiDecisionResult {
  patientId: number;
  decisionId?: number;
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  urgency: "routine" | "soon" | "urgent" | "immediate";
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

async function fetchDecision(patientId: number): Promise<AiDecisionResult> {
  const res = await fetch(`/api/ai/decision/${patientId}`);
  if (!res.ok) throw new Error("Failed to fetch AI decision");
  return res.json();
}

async function fetchEvents(patientId: number) {
  const res = await fetch(`/api/ai/events/${patientId}`);
  if (!res.ok) throw new Error("Failed to fetch events");
  return res.json();
}

async function fetchAudit(patientId: number) {
  const res = await fetch(`/api/ai/audit/${patientId}`);
  if (!res.ok) throw new Error("Failed to fetch audit log");
  return res.json();
}

async function fetchIntelligence() {
  const res = await fetch(`/api/admin/intelligence`);
  if (!res.ok) throw new Error("Failed to fetch intelligence");
  return res.json();
}

export function useAiDecision(patientId: number, options?: { enabled?: boolean }) {
  return useQuery<AiDecisionResult>({
    queryKey: ["ai-decision", patientId],
    queryFn: () => fetchDecision(patientId),
    enabled: options?.enabled !== false && patientId > 0,
    staleTime: 60 * 1000,
  });
}

export function useAiEvents(patientId: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["ai-events", patientId],
    queryFn: () => fetchEvents(patientId),
    enabled: options?.enabled !== false && patientId > 0,
    staleTime: 30 * 1000,
  });
}

export function useAuditLog(patientId: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["audit-log", patientId],
    queryFn: () => fetchAudit(patientId),
    enabled: options?.enabled !== false && patientId > 0,
    staleTime: 30 * 1000,
  });
}

export function useNationalIntelligence() {
  return useQuery({
    queryKey: ["national-intelligence"],
    queryFn: fetchIntelligence,
    staleTime: 60 * 1000,
  });
}
