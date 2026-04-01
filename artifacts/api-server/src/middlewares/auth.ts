import type { Request, Response, NextFunction } from "express";

const VALID_ROLES = new Set([
  "emergency",
  "doctor",
  "citizen",
  "admin",
  "lab",
  "pharmacy",
  "hospital",
  "insurance",
  "ai-control",
  "research",
  "family",
  "supply-chain",
]);

const ROLE_PERMISSIONS: Record<string, string[]> = {
  emergency:      ["/api/emergency", "/api/patients", "/api/ai", "/api/alerts"],
  doctor:         ["/api/patients", "/api/ai", "/api/lab", "/api/lab-results", "/api/medications", "/api/visits", "/api/alerts", "/api/appointments"],
  citizen:        ["/api/patients", "/api/lab-results", "/api/medications", "/api/visits", "/api/appointments", "/api/alerts"],
  admin:          ["/api/admin", "/api/patients", "/api/ai", "/api/ai-control", "/api/alerts", "/api/lab", "/api/medications", "/api/visits"],
  lab:            ["/api/lab", "/api/patients", "/api/lab-results", "/api/alerts"],
  pharmacy:       ["/api/pharmacy", "/api/patients", "/api/medications", "/api/supply-chain", "/api/alerts"],
  hospital:       ["/api/hospital", "/api/patients", "/api/visits", "/api/appointments", "/api/alerts"],
  insurance:      ["/api/insurance", "/api/patients", "/api/medications", "/api/alerts"],
  "ai-control":   ["/api/ai-control", "/api/ai", "/api/admin", "/api/alerts"],
  research:       ["/api/research", "/api/admin", "/api/alerts"],
  family:         ["/api/family", "/api/patients", "/api/alerts"],
  "supply-chain": ["/api/supply-chain", "/api/medications", "/api/alerts"],
};

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.path === "/healthz" || req.path === "/health" || req.path === "/" || req.path.startsWith("/events/stream")) {
    return next();
  }

  const role = (req.headers["x-user-role"] as string | undefined) ?? (req.query["role"] as string | undefined);

  if (!role || !VALID_ROLES.has(role)) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Valid X-User-Role header required",
    });
  }

  const allowedPaths = ROLE_PERMISSIONS[role] ?? [];
  const requestPath = `/api${req.path}`;

  const isAllowed = allowedPaths.some(p => requestPath.startsWith(p));

  if (!isAllowed) {
    return res.status(403).json({
      error: "Forbidden",
      message: `Role '${role}' is not authorized to access this resource`,
    });
  }

  next();
}
