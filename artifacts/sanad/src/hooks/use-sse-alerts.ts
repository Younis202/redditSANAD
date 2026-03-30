import { useState, useEffect, useRef, useCallback } from "react";

export type SseAlertType = "lab_alert" | "drug_interaction_alert" | "risk_escalation";

export interface SseAlert {
  id: string;
  type: SseAlertType;
  patientId: number;
  patientName: string;
  nationalId: string;
  title: string;
  severity: "critical" | "warning" | "high" | "moderate";
  timestamp: string;
  read: boolean;
  testName?: string;
  result?: string;
  status?: "critical" | "abnormal";
  significance?: string;
  action?: string;
  drugName?: string;
  conflictingDrug?: string;
  description?: string;
  recommendation?: string;
}

export type LabAlert = SseAlert;

export function useSseAlerts(role: string) {
  const [alerts, setAlerts] = useState<SseAlert[]>([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!role) return;

    const addAlert = (type: SseAlertType, data: Record<string, any>) => {
      const alert: SseAlert = {
        ...data,
        type,
        id: `${Date.now()}-${Math.random()}`,
        read: false,
      } as SseAlert;
      setAlerts(prev => [alert, ...prev].slice(0, 50));
    };

    const connect = () => {
      const es = new EventSource(`/api/events/stream?role=${encodeURIComponent(role)}`);
      esRef.current = es;

      es.onopen = () => setConnected(true);

      es.addEventListener("lab_alert", (e: MessageEvent) => {
        try { addAlert("lab_alert", JSON.parse(e.data)); } catch {}
      });

      es.addEventListener("drug_interaction_alert", (e: MessageEvent) => {
        try { addAlert("drug_interaction_alert", JSON.parse(e.data)); } catch {}
      });

      es.addEventListener("risk_escalation", (e: MessageEvent) => {
        try { addAlert("risk_escalation", JSON.parse(e.data)); } catch {}
      });

      es.onerror = () => {
        setConnected(false);
        es.close();
        setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      esRef.current?.close();
      setConnected(false);
    };
  }, [role]);

  const markRead = useCallback((id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
  }, []);

  const clearAll = useCallback(() => setAlerts([]), []);

  const unreadCount = alerts.filter(a => !a.read).length;

  return { alerts, connected, unreadCount, markRead, clearAll };
}
