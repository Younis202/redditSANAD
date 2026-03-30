import { useState, useEffect, useRef, useCallback } from "react";

export interface LabAlert {
  id: string;
  patientId: number;
  patientName: string;
  nationalId: string;
  testName: string;
  result: string;
  status: "critical" | "abnormal";
  severity: "critical" | "warning";
  title: string;
  significance: string;
  action: string;
  timestamp: string;
  read: boolean;
}

export function useSseAlerts(role: string) {
  const [alerts, setAlerts] = useState<LabAlert[]>([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!role) return;

    const connect = () => {
      const es = new EventSource(`/api/events/stream?role=${encodeURIComponent(role)}`);
      esRef.current = es;

      es.onopen = () => setConnected(true);

      es.addEventListener("lab_alert", (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data) as Omit<LabAlert, "id" | "read">;
          const alert: LabAlert = {
            ...data,
            id: `${Date.now()}-${Math.random()}`,
            read: false,
          };
          setAlerts(prev => [alert, ...prev].slice(0, 50));
        } catch {
        }
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
