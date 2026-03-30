import type { Response } from "express";

interface SseClient {
  id: string;
  role: string;
  res: Response;
}

const clients: Map<string, SseClient> = new Map();

export function registerSseClient(id: string, role: string, res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const client: SseClient = { id, role, res };
  clients.set(id, client);

  const heartbeat = setInterval(() => {
    try {
      res.write(": heartbeat\n\n");
    } catch {
      clearInterval(heartbeat);
      clients.delete(id);
    }
  }, 25000);

  res.on("close", () => {
    clearInterval(heartbeat);
    clients.delete(id);
  });
}

export function broadcastToRole(
  role: string,
  event: string,
  data: Record<string, unknown>
) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients.values()) {
    if (client.role === role || client.role === "admin") {
      try {
        client.res.write(payload);
      } catch {
        clients.delete(client.id);
      }
    }
  }
}

export function broadcastToAll(event: string, data: Record<string, unknown>) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients.values()) {
    try {
      client.res.write(payload);
    } catch {
      clients.delete(client.id);
    }
  }
}

export function getConnectedCount(): number {
  return clients.size;
}
