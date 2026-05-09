import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatTransactionType } from "./format";

interface LedgerEntry {
  id: number;
  transactionRef: string;
  type: string;
  amount: number;
  direction: "credit" | "debit";
  notes?: string;
  runningBalance: number;
  createdAt: string;
}

interface MemberProfile {
  id: number;
  name: string;
  phone: string;
  idNumber: string;
  joinDate: string;
  createdAt: string;
  totalSavings: number;
  outstandingLoan: number;
  currentBalance: number;
}

interface MemberLedger {
  member: { id: number; name: string; phone: string; idNumber: string; joinDate: string; createdAt: string };
  entries: LedgerEntry[];
  currentBalance: number;
  totalCredits: number;
  totalDebits: number;
}

function formatUsh(amount: number): string {
  return `USh ${new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)}`;
}

function formatShortDate(dateString: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

const GREEN = [22, 163, 74] as [number, number, number];
const RED = [220, 38, 38] as [number, number, number];
const DARK = [15, 23, 42] as [number, number, number];
const MUTED = [100, 116, 139] as [number, number, number];
const LIGHT_GRAY = [241, 245, 249] as [number, number, number];
const WHITE = [255, 255, 255] as [number, number, number];
const GREEN_LIGHT = [220, 252, 231] as [number, number, number];
const RED_LIGHT = [254, 226, 226] as [number, number, number];

export function exportMemberStatementPDF(profile: MemberProfile, ledger: MemberLedger): void {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;

  // ── Header bar ──────────────────────────────────────────────────────────────
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, pageW, 22, "F");

  // Logo circle
  doc.setFillColor(...WHITE);
  doc.circle(margin + 6, 11, 6, "F");
  doc.setFillColor(...GREEN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...GREEN);
  doc.text("S", margin + 4, 13.5);

  // Title
  doc.setTextColor(...WHITE);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Bash M. Money And Financial Services Ltd", margin + 14, 10);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Member Account Statement", margin + 14, 16);

  // Generated date (right side)
  const genDate = `Generated: ${formatShortDate(new Date().toISOString())}`;
  doc.setFontSize(7.5);
  doc.setTextColor(220, 252, 231);
  doc.text(genDate, pageW - margin, 14, { align: "right" });

  let y = 30;

  // ── Member Info Box ──────────────────────────────────────────────────────────
  doc.setFillColor(...LIGHT_GRAY);
  doc.roundedRect(margin, y, pageW - margin * 2, 28, 3, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...DARK);
  doc.text(profile.name, margin + 5, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);

  const col1 = margin + 5;
  const col2 = pageW / 2 + 5;

  doc.text(`Member ID:`, col1, y + 15);
  doc.setTextColor(...DARK);
  doc.text(profile.idNumber, col1 + 22, y + 15);

  doc.setTextColor(...MUTED);
  doc.text(`Phone:`, col2, y + 15);
  doc.setTextColor(...DARK);
  doc.text(profile.phone, col2 + 15, y + 15);

  doc.setTextColor(...MUTED);
  doc.text(`Member Since:`, col1, y + 21);
  doc.setTextColor(...DARK);
  doc.text(formatShortDate(profile.joinDate), col1 + 28, y + 21);

  y += 34;

  // ── Summary Cards (3 columns) ────────────────────────────────────────────────
  const cardW = (pageW - margin * 2 - 8) / 3;
  const cards = [
    { label: "Total Savings", value: formatUsh(profile.totalSavings), color: GREEN, bg: GREEN_LIGHT },
    { label: "Outstanding Loan", value: formatUsh(profile.outstandingLoan), color: RED, bg: RED_LIGHT },
    { label: "Net Balance", value: formatUsh(profile.currentBalance), color: profile.currentBalance >= 0 ? GREEN : RED, bg: profile.currentBalance >= 0 ? GREEN_LIGHT : RED_LIGHT },
  ];

  cards.forEach((card, i) => {
    const x = margin + i * (cardW + 4);
    doc.setFillColor(...card.bg);
    doc.roundedRect(x, y, cardW, 18, 2, 2, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(card.label.toUpperCase(), x + 4, y + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...card.color);
    doc.text(card.value, x + 4, y + 14);
  });

  y += 24;

  // ── Section title ────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text("Transaction Ledger", margin, y);

  const entryCount = ledger.entries.length;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(`${entryCount} transaction${entryCount !== 1 ? "s" : ""}`, pageW - margin, y, { align: "right" });

  y += 5;

  // ── Ledger Table ─────────────────────────────────────────────────────────────
  const rows = ledger.entries.map((entry) => [
    formatShortDate(entry.createdAt),
    entry.transactionRef,
    formatTransactionType(entry.type),
    entry.direction === "credit" ? formatUsh(entry.amount) : "",
    entry.direction === "debit" ? formatUsh(entry.amount) : "",
    formatUsh(entry.runningBalance),
    entry.notes ?? "",
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Date & Time", "Ref No.", "Type", "Credit", "Debit", "Balance", "Notes"]],
    body: rows,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      textColor: DARK,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: DARK,
      textColor: WHITE,
      fontStyle: "bold",
      fontSize: 7.5,
    },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 26 },
      2: { cellWidth: 28 },
      3: { cellWidth: 22, halign: "right" },
      4: { cellWidth: 22, halign: "right" },
      5: { cellWidth: 22, halign: "right", fontStyle: "bold" },
      6: { cellWidth: "auto", textColor: MUTED as [number, number, number] },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didParseCell(data) {
      if (data.section === "body") {
        const entry = ledger.entries[data.row.index];
        if (!entry) return;
        // Credit column
        if (data.column.index === 3 && entry.direction === "credit") {
          data.cell.styles.textColor = GREEN;
        }
        // Debit column
        if (data.column.index === 4 && entry.direction === "debit") {
          data.cell.styles.textColor = RED;
        }
        // Balance column
        if (data.column.index === 5) {
          data.cell.styles.textColor = entry.runningBalance >= 0 ? GREEN : RED;
        }
      }
    },
  });

  // ── Footer summary row ───────────────────────────────────────────────────────
  const finalY = (doc as any).lastAutoTable.finalY + 6;

  doc.setFillColor(...LIGHT_GRAY);
  doc.rect(margin, finalY, pageW - margin * 2, 10, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...DARK);
  doc.text("Totals", margin + 4, finalY + 6.5);

  doc.setTextColor(...GREEN);
  doc.text(`Total Credits: ${formatUsh(ledger.totalCredits)}`, margin + 55, finalY + 6.5);

  doc.setTextColor(...RED);
  doc.text(`Total Debits: ${formatUsh(ledger.totalDebits)}`, margin + 110, finalY + 6.5);

  doc.setTextColor(ledger.currentBalance >= 0 ? GREEN[0] : RED[0], ledger.currentBalance >= 0 ? GREEN[1] : RED[1], ledger.currentBalance >= 0 ? GREEN[2] : RED[2]);
  doc.text(`Closing Balance: ${formatUsh(ledger.currentBalance)}`, pageW - margin, finalY + 6.5, { align: "right" });

  // ── Page footer ──────────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageH - 12, pageW - margin, pageH - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text("Bash M. Money And Financial Services Ltd — Confidential Member Statement", margin, pageH - 7);
    doc.text(`Page ${i} of ${pageCount}`, pageW - margin, pageH - 7, { align: "right" });
  }

  // ── Save ─────────────────────────────────────────────────────────────────────
  const safeName = profile.name.replace(/\s+/g, "_").toLowerCase();
  const date = new Date().toISOString().split("T")[0];
  doc.save(`BashM_Statement_${safeName}_${date}.pdf`);
}
