import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { checklist } from "../data/checklist";
import { globalResult, pdfFilename } from "./inspection";
import type { Inspection, MechanicProfile, ResultState } from "../types";
const labels: Record<ResultState, string> = {
  ok: "Conforme",
  watch: "À surveiller",
  repair: "Réparation requise",
  unchecked: "Non vérifié",
  na: "Sans objet",
};
export function exportInspectionPdf(i: Inspection, p: MechanicProfile) {
  const doc = new jsPDF({ format: "letter", unit: "mm" });
  doc.setFillColor(19, 63, 58);
  doc.rect(0, 0, 216, 30, "F");
  doc.setTextColor(255);
  doc.setFontSize(20);
  doc.text(p.company || "Rapport d’inspection mécanique", 14, 14);
  doc.setFontSize(9);
  doc.text(`${p.firstName} ${p.lastName} • ${p.email}`, 14, 22);
  doc.setTextColor(25);
  doc.setFontSize(13);
  doc.text(`Rapport ${i.reportNumber}`, 14, 40);
  doc.setFontSize(9);
  doc.text(
    `Inspection : ${new Date(i.date).toLocaleString("fr-CA")}  |  Statut : ${i.status === "completed" ? "Terminée" : "Brouillon"}`,
    14,
    47,
  );
  doc.text(
    `Client : ${i.client.firstName} ${i.client.lastName}${i.client.phone ? ` • ${i.client.phone}` : ""}`,
    14,
    54,
  );
  doc.text(
    `Véhicule : ${i.vehicle.year} ${i.vehicle.make} ${i.vehicle.model} • Plaque ${i.vehicle.plate} • ${i.vehicle.mileage.toLocaleString("fr-CA")} km`,
    14,
    61,
  );
  doc.text(`NIV : ${i.vehicle.vin}`, 14, 68);
  const overall = globalResult(i.results);
  doc.setFontSize(11);
  doc.text(`Résultat global : ${labels[overall]}`, 14, 77);
  let y = 84;
  for (const section of checklist) {
    const rows = section.items.map((item) => {
      const r = i.results[item.id];
      return [
        item.label,
        r ? labels[r.state] : "Non renseigné",
        r?.measurement ? `${r.measurement} ${item.measurement ?? ""}` : "",
        r?.note ?? "",
      ];
    });
    autoTable(doc, {
      startY: y,
      head: [[section.title, "État", "Mesure", "Remarque"]],
      body: rows,
      theme: "grid",
      headStyles: { fillColor: [19, 63, 58] },
      styles: { fontSize: 7, cellPadding: 1.5 },
      columnStyles: {
        0: { cellWidth: 53 },
        1: { cellWidth: 34 },
        2: { cellWidth: 25 },
        3: { cellWidth: 76 },
      },
      margin: { left: 14, right: 14 },
    });
    y =
      (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
        .finalY + 7;
  }
  if (i.recommendations) {
    doc.setFontSize(11);
    doc.text("Recommandations", 14, y);
    doc.setFontSize(8);
    doc.text(doc.splitTextToSize(i.recommendations, 185), 14, y + 6);
  }
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFontSize(7);
    doc.setTextColor(90);
    doc.text(
      "Ce rapport d’inspection ne constitue pas un certificat officiel de vérification mécanique de la SAAQ.",
      14,
      272,
    );
    doc.text(`Page ${page}/${pages}`, 195, 272, { align: "right" });
  }
  doc.save(pdfFilename(i));
}
