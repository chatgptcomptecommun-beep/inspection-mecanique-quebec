import type { Inspection, ItemResult, ResultState } from "../types";
import { checklist } from "../data/checklist";
export const normalizeVin = (vin: string) =>
  vin.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "");
export const isValidVin = (vin: string) => normalizeVin(vin).length === 17;
export const normalizePlate = (plate: string) =>
  plate.toUpperCase().replace(/[^A-Z0-9]/g, "");
export const generateReportNumber = (
  now = new Date(),
  random = crypto.getRandomValues(new Uint32Array(1))[0],
) =>
  `IM-${now.getFullYear()}-${random.toString(36).toUpperCase().padStart(7, "0").slice(-7)}`;
export const pdfFilename = (
  inspection: Pick<Inspection, "date" | "reportNumber" | "vehicle">,
) => {
  const date = inspection.date.slice(0, 10);
  const vehicle =
    normalizePlate(inspection.vehicle.plate) ||
    normalizeVin(inspection.vehicle.vin).slice(-6) ||
    "VEHICULE";
  return `inspection-${vehicle}-${date}-${inspection.reportNumber}.pdf`.toLowerCase();
};
export const missingCritical = (results: Record<string, ItemResult>) =>
  checklist
    .flatMap((s) => s.items)
    .filter((i) => i.critical && !results[i.id]?.state)
    .map((i) => i.label);
export const globalResult = (
  results: Record<string, ItemResult>,
): ResultState => {
  const states = Object.values(results).map((r) => r.state);
  if (states.includes("repair")) return "repair";
  if (states.includes("watch")) return "watch";
  return "ok";
};
export const duplicateInspection = (
  source: Inspection,
  now = new Date(),
): Inspection => ({
  ...source,
  id: crypto.randomUUID(),
  reportNumber: generateReportNumber(now),
  status: "draft",
  date: now.toISOString().slice(0, 16),
  results: {},
  recommendations: "",
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
});
