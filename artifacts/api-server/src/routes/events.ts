import { Router } from "express";
import { registerSseClient, getConnectedCount } from "../lib/sse.js";
import { randomUUID } from "crypto";

const router = Router();

router.get("/stream", (req, res) => {
  const roleHeader = req.headers["x-user-role"] as string | undefined;
  const roleQuery = req.query["role"] as string | undefined;
  const role = roleHeader ?? roleQuery ?? "anonymous";
  const clientId = randomUUID();
  registerSseClient(clientId, role, res);
});

router.get("/status", (_req, res) => {
  res.json({ connected: getConnectedCount() });
});

export default router;
