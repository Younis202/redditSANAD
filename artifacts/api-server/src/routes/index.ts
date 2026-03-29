import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import patientsRouter from "./patients.js";
import emergencyRouter from "./emergency.js";
import medicationsRouter from "./medications.js";
import visitsRouter from "./visits.js";
import labResultsRouter from "./lab_results.js";
import alertsRouter from "./alerts.js";
import aiRouter from "./ai.js";
import adminRouter from "./admin.js";
import labRouter from "./lab.js";
import pharmacyRouter from "./pharmacy.js";
import hospitalRouter from "./hospital.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/patients", patientsRouter);
router.use("/emergency", emergencyRouter);
router.use("/medications", medicationsRouter);
router.use("/visits", visitsRouter);
router.use("/lab-results", labResultsRouter);
router.use("/alerts", alertsRouter);
router.use("/ai", aiRouter);
router.use("/admin", adminRouter);
router.use("/lab", labRouter);
router.use("/pharmacy", pharmacyRouter);
router.use("/hospital", hospitalRouter);

export default router;
