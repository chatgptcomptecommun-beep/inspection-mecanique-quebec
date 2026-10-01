import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { checklist } from "../data/checklist";
import { globalResult, includedItemIds, pdfFilename } from "./inspection";
import { api } from "./api";
import type { Inspection, InspectionPhoto, MechanicProfile, ResultState } from "../types";

export type PdfModel = "detailed" | "summary";

const labels: Record<ResultState, string> = {
  ok: "Conforme", watch: "À surveiller", repair: "Réparation requise",
  unchecked: "Non vérifié", na: "Sans objet",
};

const photoToJpeg = async (blob: Blob) => {
  const bitmap = await createImageBitmap(blob);
  const ratio = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
  canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.82);
};

const loadPhotos = async (inspection: Inspection, photos: InspectionPhoto[]) =>
  Promise.all(photos.map(async (photo) => {
    try {
      return { photo, data: await photoToJpeg(await api.photoBlob(inspection.id, photo.key)) };
    } catch {
      return { photo, data: "" };
    }
  }));

export async function exportInspectionPdf(
  inspection: Inspection,
  profile: MechanicProfile,
  model: PdfModel,
) {
  const doc = new jsPDF({ format: "letter", unit: "mm" });
  const included = new Set(includedItemIds(inspection, model));
  const loadedPhotos = await loadPhotos(
    inspection,
    (inspection.photos ?? []).filter((photo) => included.has(photo.itemId)),
  );

  doc.setFillColor(19, 63, 58);
  doc.rect(0, 0, 216, 30, "F");
  doc.setTextColor(255);
  doc.setFontSize(20);
  doc.text(profile.company || "Rapport d’inspection mécanique", 14, 14);
  doc.setFontSize(9);
  doc.text(`${profile.firstName} ${profile.lastName} • ${profile.email}`, 14, 22);
  doc.setTextColor(25);
  doc.setFontSize(13);
  doc.text(`Rapport ${model === "summary" ? "résumé" : "détaillé"} — ${inspection.reportNumber}`, 14, 40);
  doc.setFontSize(9);
  doc.text(`Inspection : ${new Date(inspection.date).toLocaleString("fr-CA")}  |  Statut : ${inspection.status === "completed" ? "Terminée" : "Brouillon"}`, 14, 47);
  doc.text(`Client : ${inspection.client.firstName} ${inspection.client.lastName}${inspection.client.phone ? ` • ${inspection.client.phone}` : ""}`, 14, 54);
  doc.text(`Véhicule : ${inspection.vehicle.year} ${inspection.vehicle.make} ${inspection.vehicle.model} • Plaque ${inspection.vehicle.plate} • ${inspection.vehicle.mileage.toLocaleString("fr-CA")} km`, 14, 61);
  doc.text(`NIV : ${inspection.vehicle.vin}`, 14, 68);
  doc.setFontSize(11);
  doc.text(`Résultat global : ${labels[globalResult(inspection.results)]}`, 14, 77);

  let y = 84;
  for (const section of checklist) {
    const sectionItems = section.items.filter((item) => included.has(item.id));
    if (!sectionItems.length) continue;
    autoTable(doc, {
      startY: y,
      head: [[section.title, "État", "Mesure", "Remarque"]],
      body: sectionItems.map((item) => {
        const result = inspection.results[item.id];
        return [item.label, result ? labels[result.state] : "Non renseigné", result?.measurement ? `${result.measurement} ${item.measurement ?? ""}` : "", result?.note ?? ""];
      }),
      theme: "grid",
      headStyles: { fillColor: [19, 63, 58] },
      styles: { fontSize: 7, cellPadding: 1.5 },
      columnStyles: { 0: { cellWidth: 53 }, 1: { cellWidth: 34 }, 2: { cellWidth: 25 }, 3: { cellWidth: 76 } },
      margin: { left: 14, right: 14 },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;
  }

  if (model === "summary" && included.size === 0) {
    doc.setFontSize(10);
    doc.text("Aucune réparation requise et aucun élément à surveiller.", 14, y);
    y += 10;
  }

  if (loadedPhotos.length) {
    if (y > 235) { doc.addPage(); y = 18; }
    doc.setFontSize(14);
    doc.setTextColor(19, 63, 58);
    doc.text("Photos des éléments inspectés", 14, y);
    y += 8;
    const allItems = checklist.flatMap((section) => section.items);
    for (const { photo, data } of loadedPhotos) {
      if (y > 220) { doc.addPage(); y = 18; }
      const item = allItems.find((entry) => entry.id === photo.itemId);
      const result = inspection.results[photo.itemId];
      doc.setTextColor(25);
      doc.setFontSize(10);
      doc.text(item?.label ?? "Élément inspecté", 14, y);
      doc.setFontSize(8);
      doc.text(result ? labels[result.state] : "Non renseigné", 14, y + 5);
      if (data) doc.addImage(data, "JPEG", 14, y + 9, 78, 55, undefined, "FAST");
      else doc.text("Photo indisponible lors de l’export.", 14, y + 14);
      y += 72;
    }
  }

  if (inspection.recommendations) {
    if (y > 240) { doc.addPage(); y = 18; }
    doc.setFontSize(11);
    doc.setTextColor(25);
    doc.text("Recommandations", 14, y);
    doc.setFontSize(8);
    doc.text(doc.splitTextToSize(inspection.recommendations, 185), 14, y + 6);
  }

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFontSize(7);
    doc.setTextColor(90);
    doc.text("Ce rapport d’inspection ne constitue pas un certificat officiel de vérification mécanique de la SAAQ.", 14, 272);
    doc.text(`Page ${page}/${pages}`, 195, 272, { align: "right" });
  }
  doc.save(pdfFilename(inspection, model));
}
