import { Router } from "express";
import { db } from "@workspace/db";
import { medicationsTable, patientsTable } from "@workspace/db/schema";

const router = Router();

const DRUG_INVENTORY = [
  { drugName: "Metformin 500mg", category: "Antidiabetic", stock: 12400, minStock: 5000, unit: "tablets", supplier: "National Pharma Co.", leadTimeDays: 3, avgMonthlyDemand: 8500, price: 0.15 },
  { drugName: "Metformin 1000mg", category: "Antidiabetic", stock: 8200, minStock: 4000, unit: "tablets", supplier: "National Pharma Co.", leadTimeDays: 3, avgMonthlyDemand: 6000, price: 0.22 },
  { drugName: "Lisinopril 10mg", category: "Antihypertensive", stock: 7800, minStock: 3000, unit: "tablets", supplier: "Gulf Medical Supply", leadTimeDays: 5, avgMonthlyDemand: 5500, price: 0.18 },
  { drugName: "Amlodipine 5mg", category: "Antihypertensive", stock: 6200, minStock: 3000, unit: "tablets", supplier: "Gulf Medical Supply", leadTimeDays: 5, avgMonthlyDemand: 4800, price: 0.25 },
  { drugName: "Warfarin 5mg", category: "Anticoagulant", stock: 1200, minStock: 2000, unit: "tablets", supplier: "MedLine Arabia", leadTimeDays: 7, avgMonthlyDemand: 2100, price: 0.45 },
  { drugName: "Atorvastatin 20mg", category: "Statin", stock: 9100, minStock: 4000, unit: "tablets", supplier: "National Pharma Co.", leadTimeDays: 4, avgMonthlyDemand: 6200, price: 0.32 },
  { drugName: "Amiodarone 200mg", category: "Antiarrhythmic", stock: 850, minStock: 1500, unit: "tablets", supplier: "Specialty Meds KSA", leadTimeDays: 10, avgMonthlyDemand: 1200, price: 1.85 },
  { drugName: "Insulin Glargine", category: "Insulin", stock: 2400, minStock: 2000, unit: "pens", supplier: "Gulf Medical Supply", leadTimeDays: 4, avgMonthlyDemand: 2800, price: 45.00 },
  { drugName: "Salbutamol Inhaler", category: "Bronchodilator", stock: 3100, minStock: 1500, unit: "inhalers", supplier: "Respiratory Care KSA", leadTimeDays: 6, avgMonthlyDemand: 1900, price: 12.50 },
  { drugName: "Omeprazole 20mg", category: "PPI", stock: 11200, minStock: 5000, unit: "tablets", supplier: "National Pharma Co.", leadTimeDays: 3, avgMonthlyDemand: 7800, price: 0.12 },
  { drugName: "Metoprolol 50mg", category: "Beta-Blocker", stock: 5800, minStock: 2500, unit: "tablets", supplier: "Gulf Medical Supply", leadTimeDays: 5, avgMonthlyDemand: 4100, price: 0.28 },
  { drugName: "Aspirin 100mg", category: "Antiplatelet", stock: 18000, minStock: 8000, unit: "tablets", supplier: "National Pharma Co.", leadTimeDays: 2, avgMonthlyDemand: 12000, price: 0.05 },
];

router.get("/inventory", async (req, res) => {
  const [allMeds] = await Promise.all([
    db.select().from(medicationsTable).limit(1000),
  ]);

  const activePrescriptions: Record<string, number> = {};
  for (const m of allMeds.filter(m => m.isActive)) {
    const key = m.drugName.split(" ")[0]?.toLowerCase() ?? "";
    activePrescriptions[key] = (activePrescriptions[key] || 0) + 1;
  }

  const inventory = DRUG_INVENTORY.map(drug => {
    const daysOfStock = Math.round(drug.stock / (drug.avgMonthlyDemand / 30));
    const status = drug.stock < drug.minStock ? "critical" : drug.stock < drug.minStock * 1.5 ? "low" : "adequate";
    const reorderNeeded = drug.stock < drug.minStock * 1.3;
    const projectedStockoutDays = Math.round((drug.stock - drug.minStock) / (drug.avgMonthlyDemand / 30));
    return {
      ...drug,
      daysOfStock,
      status,
      reorderNeeded,
      projectedStockoutDays: status === "critical" ? projectedStockoutDays : null,
      monthlyValue: Math.round(drug.avgMonthlyDemand * drug.price),
    };
  });

  const criticalItems = inventory.filter(i => i.status === "critical");
  const lowItems = inventory.filter(i => i.status === "low");
  const totalInventoryValue = inventory.reduce((s, i) => s + i.stock * i.price, 0);

  res.json({
    inventory,
    summary: {
      totalDrugs: inventory.length,
      criticalShortages: criticalItems.length,
      lowStock: lowItems.length,
      adequate: inventory.filter(i => i.status === "adequate").length,
      totalInventoryValue: Math.round(totalInventoryValue),
      reorderAlerts: inventory.filter(i => i.reorderNeeded).length,
    },
    criticalAlerts: criticalItems.map(d => ({
      drug: d.drugName,
      currentStock: d.stock,
      minRequired: d.minStock,
      deficit: d.minStock - d.stock,
      supplier: d.supplier,
      leadTimeDays: d.leadTimeDays,
      urgentOrder: true,
    })),
    aiPredictions: [
      { prediction: `Insulin demand expected to rise 18% next quarter based on diabetes prevalence trend`, confidence: 82, action: "Increase insulin buffer stock to 6 weeks supply" },
      { prediction: `Warfarin shortage in 12 days at current consumption rate — reorder immediately`, confidence: 94, action: "Issue emergency purchase order to MedLine Arabia" },
      { prediction: `Metformin consumption correlates with regional diabetes screening rollout`, confidence: 77, action: "Pre-position stock in Riyadh and Eastern Province depots" },
    ],
    distributionCenters: [
      { name: "Riyadh Central Depot", stock: "High", capacity: "78%", nextDelivery: "2 days" },
      { name: "Jeddah Regional Hub", stock: "Medium", capacity: "61%", nextDelivery: "4 days" },
      { name: "Eastern Province Store", stock: "Low", capacity: "42%", nextDelivery: "1 day" },
      { name: "Madinah Facility", stock: "High", capacity: "83%", nextDelivery: "6 days" },
    ],
  });
});

const purchaseOrders: { id: string; drug: string; quantity: number; supplier: string; status: string; createdAt: string; estimatedDelivery: string; totalValue: number }[] = [];

router.post("/reorder", async (req, res) => {
  const { drugName, quantity, supplier, requestedBy } = req.body;
  if (!drugName || !quantity) {
    return res.status(400).json({ error: "drugName and quantity are required" });
  }
  const drug = DRUG_INVENTORY.find(d => d.drugName === drugName);
  const orderId = `PO-${Date.now()}`;
  const leadDays = drug?.leadTimeDays ?? 7;
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + leadDays);
  const totalValue = Math.round((drug?.price ?? 1) * quantity);

  const order = {
    id: orderId,
    drug: drugName,
    quantity,
    supplier: supplier ?? drug?.supplier ?? "Unknown Supplier",
    status: "submitted",
    createdAt: new Date().toISOString(),
    estimatedDelivery: deliveryDate.toISOString().split("T")[0]!,
    totalValue,
  };
  purchaseOrders.push(order);

  setTimeout(() => {
    const o = purchaseOrders.find(p => p.id === orderId);
    if (o) o.status = "confirmed";
  }, 5000);

  res.json({ ...order, message: `Purchase order ${orderId} submitted. Estimated delivery in ${leadDays} days.`, requestedBy: requestedBy ?? "Supply Chain Manager" });
});

router.get("/purchase-orders", async (req, res) => {
  res.json({ orders: purchaseOrders.slice().reverse() });
});

export default router;
