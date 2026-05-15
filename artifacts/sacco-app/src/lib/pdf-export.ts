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
  accountNumber?: string | null;
  profilePictureUrl?: string | null;
}

interface MemberLedger {
  member: { id: number; name: string; phone: string; idNumber: string; joinDate: string; createdAt: string };
  entries: LedgerEntry[];
  currentBalance: number;
  totalCredits: number;
  totalDebits: number;
}

// ── Color palette — BMM brand ────────────────────────────────────────────────
const NAVY           = [15,  37,  87]  as [number, number, number];
const GOLD           = [201, 161, 68]  as [number, number, number];
const GOLD_LIGHT     = [253, 245, 220] as [number, number, number];
const BURGUNDY       = [176, 48,  96]  as [number, number, number];
const BURGUNDY_LIGHT = [251, 235, 242] as [number, number, number];
const GREEN          = [22,  163, 74]  as [number, number, number];
const RED            = [220, 38,  38]  as [number, number, number];
const DARK           = [15,  23,  42]  as [number, number, number];
const MUTED          = [100, 116, 139] as [number, number, number];
const LIGHT_GRAY     = [241, 245, 249] as [number, number, number];
const WHITE          = [255, 255, 255] as [number, number, number];
const GREEN_LIGHT    = [220, 252, 231] as [number, number, number];
const RED_LIGHT      = [254, 226, 226] as [number, number, number];

function formatUsh(amount: number): string {
  return `USh ${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)}`;
}

function formatShortDate(dateString: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(dateString));
}

function formatDateOnly(dateString: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric", month: "short", day: "numeric",
  }).format(new Date(dateString));
}

/** Fetch an image URL and render it as a circular PNG data-URL via canvas. */
async function loadCircularImage(url: string, diameter: number): Promise<string | null> {
  try {
    const res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);

    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload  = () => resolve();
      img.onerror = () => reject(new Error("img load failed"));
      img.crossOrigin = "anonymous";
      img.src = objUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width  = diameter;
    canvas.height = diameter;
    const ctx = canvas.getContext("2d")!;

    // Burgundy border ring
    ctx.beginPath();
    ctx.arc(diameter / 2, diameter / 2, diameter / 2, 0, Math.PI * 2);
    ctx.fillStyle = "#B03060";
    ctx.fill();

    // Clip inner circle (leaves 3px burgundy border)
    const inner = diameter / 2 - 3;
    ctx.beginPath();
    ctx.arc(diameter / 2, diameter / 2, inner, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, (diameter / 2) - inner, (diameter / 2) - inner, inner * 2, inner * 2);

    URL.revokeObjectURL(objUrl);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

/**
 * Load the official BMMFS logo at high resolution for use in jsPDF.
 * Renders the full-colour logo onto a white canvas so it prints crisply.
 */
async function renderLogoDataUrl(size: number): Promise<string | null> {
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload  = () => resolve();
      img.onerror = () => reject(new Error("logo load failed"));
      img.src = "/logo.png";
    });
    const canvas = document.createElement("canvas");
    canvas.width  = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", 0.95);
  } catch {
    return null;
  }
}

export async function exportMemberStatementPDF(
  profile: MemberProfile,
  ledger: MemberLedger,
): Promise<void> {
  const doc   = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;

  // ── Load assets (parallel) ────────────────────────────────────────────────
  let photoDataUrl: string | null = null;
  if (profile.profilePictureUrl) {
    photoDataUrl = await loadCircularImage(profile.profilePictureUrl, 200);
  }
  const logoDataUrl = await renderLogoDataUrl(500);

  // ── Compute statement period ─────────────────────────────────────────────────
  const dates    = ledger.entries.map((e) => new Date(e.createdAt).getTime());
  const earliest = dates.length ? new Date(Math.min(...dates)) : null;
  const latest   = dates.length ? new Date(Math.max(...dates)) : null;
  const periodStr =
    earliest && latest
      ? `${formatDateOnly(earliest.toISOString())} – ${formatDateOnly(latest.toISOString())}`
      : "No transactions";

  // ═══════════════════════════════════════════════════════════════════════════
  //  HEADER BAR — white background, burgundy accent stripe
  // ═══════════════════════════════════════════════════════════════════════════
  const photoSize = 24;
  const photoPad  = 5;
  const headerH   = photoSize + photoPad * 2;  // 34mm

  // White header background
  doc.setFillColor(...WHITE);
  doc.rect(0, 0, pageW, headerH, "F");

  // Burgundy accent stripe at bottom of header
  doc.setFillColor(...BURGUNDY);
  doc.rect(0, headerH - 1.5, pageW, 1.5, "F");

  // Light separator line
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.2);
  doc.line(0, headerH, pageW, headerH);

  // ── Photo area — right column ─────────────────────────────────────────────
  const photoX = pageW - margin - photoSize;
  const photoY = photoPad;

  if (photoDataUrl) {
    doc.addImage(photoDataUrl, "PNG", photoX, photoY, photoSize, photoSize);
  } else {
    // Fallback: burgundy ring + light fill + initials
    doc.setFillColor(...BURGUNDY);
    doc.circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2, "F");
    doc.setFillColor(251, 235, 242);
    doc.circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2 - 1.2, "F");
    const initials = profile.name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...BURGUNDY);
    doc.text(initials, photoX + photoSize / 2, photoY + photoSize / 2 + 3.5, { align: "center" });
  }

  // ── Left column: logo + company name ─────────────────────────────────────
  const logoPad  = 2;
  const logoMm   = headerH - logoPad * 2;   // 30mm
  const textX    = margin + logoMm + 4;
  const textMaxW = photoX - textX - 6;

  // Logo on white: clean rounded card with subtle border
  if (logoDataUrl) {
    doc.setFillColor(248, 248, 248);
    doc.setDrawColor(235, 235, 235);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin - 0.8, logoPad - 0.8, logoMm + 1.6, logoMm + 1.6, 2, 2, "FD");
    doc.addImage(logoDataUrl, "JPEG", margin, logoPad, logoMm, logoMm);
  } else {
    doc.setFillColor(...BURGUNDY);
    doc.circle(margin + logoMm / 2, logoPad + logoMm / 2, logoMm / 2, "F");
    doc.setFillColor(251, 235, 242);
    doc.circle(margin + logoMm / 2, logoPad + logoMm / 2, logoMm / 2 - 2, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...BURGUNDY);
    doc.text("BMM", margin + logoMm / 2, logoPad + logoMm / 2 + 3.5, { align: "center" });
  }

  // Company name in navy (dark on white)
  const textCY = logoPad + logoMm / 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text("BASH M. MONEY FINANCIAL SERVICES LTD", textX, textCY - 2, { maxWidth: textMaxW });

  // Subtitle in burgundy
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...BURGUNDY);
  doc.text("Member Account Statement", textX, textCY + 5, { maxWidth: textMaxW });

  let y = headerH + 4;

  // ═══════════════════════════════════════════════════════════════════════════
  //  MEMBER INFO BOX
  // ═══════════════════════════════════════════════════════════════════════════
  const infoH = 34;
  doc.setFillColor(...LIGHT_GRAY);
  doc.roundedRect(margin, y, pageW - margin * 2, infoH, 3, 3, "F");

  // Burgundy left accent bar
  doc.setFillColor(...BURGUNDY);
  doc.roundedRect(margin, y, 3, infoH, 1.5, 1.5, "F");

  const infoX = margin + 7;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  doc.text(profile.name, infoX, y + 9);

  if (profile.accountNumber) {
    doc.setFont("courier", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...GOLD);
    doc.text(profile.accountNumber, infoX, y + 16);
  }

  const r2y  = y + 23;
  const col1 = infoX;
  const col2 = pageW / 2 - 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text("Statement Period:", col1, r2y);
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.text(periodStr, col1 + 31, r2y);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  doc.text("Phone:", col2, r2y);
  doc.setTextColor(...DARK);
  doc.text(profile.phone, col2 + 14, r2y);

  const r3y = y + 29;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text("Account Status:", col1, r3y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GREEN);
  doc.text("Active", col1 + 30, r3y);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  doc.text("ID No.:", col2, r3y);
  doc.setTextColor(...DARK);
  doc.text(profile.idNumber, col2 + 14, r3y);

  y += infoH + 5;

  // ═══════════════════════════════════════════════════════════════════════════
  //  SUMMARY CARDS — 3 columns
  // ═══════════════════════════════════════════════════════════════════════════
  const cardW = (pageW - margin * 2 - 8) / 3;
  const cardH = 18;
  const cards = [
    { label: "Total Savings",    value: formatUsh(profile.totalSavings),    color: GREEN,    bg: GREEN_LIGHT    },
    { label: "Outstanding Loan", value: formatUsh(profile.outstandingLoan), color: RED,      bg: RED_LIGHT      },
    { label: "Net Balance",      value: formatUsh(profile.currentBalance),  color: profile.currentBalance >= 0 ? GREEN : RED, bg: profile.currentBalance >= 0 ? GREEN_LIGHT : RED_LIGHT },
  ];

  cards.forEach((card, i) => {
    const cx = margin + i * (cardW + 4);
    doc.setFillColor(...card.bg);
    doc.roundedRect(cx, y, cardW, cardH, 2, 2, "F");
    // Top color bar
    doc.setFillColor(...card.color);
    doc.roundedRect(cx, y, cardW, 2.5, 0.5, 0.5, "F");
    doc.rect(cx, y + 1.5, cardW, 1, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text(card.label.toUpperCase(), cx + 4, y + 8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...card.color);
    doc.text(card.value, cx + 4, y + 15);
  });

  y += cardH + 5;

  // ═══════════════════════════════════════════════════════════════════════════
  //  TRANSACTION LEDGER TABLE
  // ═══════════════════════════════════════════════════════════════════════════
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...BURGUNDY);
  doc.text("Transaction Ledger", margin, y);

  const entryCount = ledger.entries.length;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(`${entryCount} transaction${entryCount !== 1 ? "s" : ""}`, pageW - margin, y, { align: "right" });
  y += 4;

  const rows = ledger.entries.map((entry) => [
    formatShortDate(entry.createdAt),
    entry.transactionRef,
    formatTransactionType(entry.type),
    entry.direction === "credit" ? formatUsh(entry.amount) : "",
    entry.direction === "debit"  ? formatUsh(entry.amount) : "",
    formatUsh(entry.runningBalance),
    entry.notes ?? "",
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Date & Time", "Ref No.", "Type", "Credit (USh)", "Debit (USh)", "Balance (USh)", "Notes"]],
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
      fillColor: BURGUNDY,
      textColor: WHITE,
      fontStyle: "bold",
      fontSize: 7.5,
    },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 24 },
      2: { cellWidth: 26 },
      3: { cellWidth: 22, halign: "right" },
      4: { cellWidth: 22, halign: "right" },
      5: { cellWidth: 24, halign: "right", fontStyle: "bold" },
      6: { cellWidth: "auto", textColor: MUTED as [number, number, number] },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didParseCell(data) {
      if (data.section === "body") {
        const entry = ledger.entries[data.row.index];
        if (!entry) return;
        if (data.column.index === 3 && entry.direction === "credit") data.cell.styles.textColor = GREEN;
        if (data.column.index === 4 && entry.direction === "debit")  data.cell.styles.textColor = RED;
        if (data.column.index === 5) data.cell.styles.textColor = entry.runningBalance >= 0 ? GREEN : RED;
      }
    },
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  TOTALS — 3 clean cards
  // ═══════════════════════════════════════════════════════════════════════════
  const tableBottom = (doc as any).lastAutoTable.finalY;
  const totalsY     = tableBottom + 5;
  const totalsH     = 18;
  const totalsCardW = (pageW - margin * 2 - 8) / 3;

  const totals = [
    { label: "Total Credits",   value: formatUsh(ledger.totalCredits),  color: GREEN, bg: GREEN_LIGHT },
    { label: "Total Debits",    value: formatUsh(ledger.totalDebits),   color: RED,   bg: RED_LIGHT   },
    { label: "Closing Balance", value: formatUsh(ledger.currentBalance), color: ledger.currentBalance >= 0 ? GREEN : RED, bg: ledger.currentBalance >= 0 ? GREEN_LIGHT : RED_LIGHT },
  ];

  if (totalsY + totalsH + 20 > pageH - 16) doc.addPage();
  const finalTotalsY = (totalsY + totalsH + 20 > pageH - 16) ? 14 : totalsY;

  totals.forEach((t, i) => {
    const tx = margin + i * (totalsCardW + 4);
    doc.setFillColor(...t.bg);
    doc.roundedRect(tx, finalTotalsY, totalsCardW, totalsH, 2, 2, "F");
    doc.setFillColor(...t.color);
    doc.roundedRect(tx, finalTotalsY, totalsCardW, 1.5, 0.5, 0.5, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text(t.label.toUpperCase(), tx + 5, finalTotalsY + 7);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...t.color);
    doc.text(t.value, tx + 5, finalTotalsY + 15);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  PAGE FOOTER — all pages
  // ═══════════════════════════════════════════════════════════════════════════
  const genDate  = `Report generated on: ${formatShortDate(new Date().toISOString())}`;
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const ph = doc.internal.pageSize.getHeight();

    // Gold divider
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.5);
    doc.line(margin, ph - 18, pageW - margin, ph - 18);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...BURGUNDY);
    doc.text("Bash M. Money And Financial Services Ltd", margin, ph - 13);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text(genDate, pageW / 2, ph - 13, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text(`Page ${i} of ${totalPages}`, pageW - margin, ph - 13, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(...MUTED);
    doc.text("Confidential — For the named member only. Do not distribute.", margin, ph - 8);
    doc.text("Support: Tel: +256 754 143594 / +256 782 547022", pageW - margin, ph - 8, { align: "right" });

    // Authorized Signature — last page only
    if (i === totalPages) {
      const sigX1    = pageW / 2 + 10;
      const sigX2    = pageW - margin;
      const sigLineY = ph - 30;

      doc.setDrawColor(...BURGUNDY);
      doc.setLineWidth(0.4);
      doc.line(sigX1, sigLineY, sigX2, sigLineY);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...BURGUNDY);
      doc.text("Authorized Signature", (sigX1 + sigX2) / 2, sigLineY + 4, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(...MUTED);
      doc.text("Bash M. Money And Financial Services Ltd", (sigX1 + sigX2) / 2, sigLineY + 8, { align: "center" });
    }
  }

  const safeName = profile.name.replace(/\s+/g, "_").toLowerCase();
  const date = new Date().toISOString().split("T")[0];
  doc.save(`BashM_Statement_${safeName}_${date}.pdf`);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CONSOLIDATED FINANCIAL REPORT PDF
// ═══════════════════════════════════════════════════════════════════════════════

interface ReportTxRow {
  id: number;
  transactionRef: string;
  memberName: string;
  accountNumber: string;
  type: string;
  direction: "credit" | "debit";
  amount: number;
  createdAt: string;
}

interface ReportSummaryData {
  totalDeposits: number;
  totalWithdrawals: number;
  netCashFlow: number;
}

interface ReportData {
  from: string;
  to: string;
  transactions: ReportTxRow[];
  summary: ReportSummaryData;
}

export async function exportReportPDF(
  data: ReportData,
  periodLabel: string,
  adminName: string,
  adminPhotoUrl: string | null,
  adminEmployeeId?: string | null,
): Promise<void> {
  const doc   = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Load assets
  let adminPhotoDataUrl: string | null = null;
  if (adminPhotoUrl) {
    adminPhotoDataUrl = await loadCircularImage(adminPhotoUrl, 200);
  }
  const logoDataUrl = await renderLogoDataUrl(500);

  // ── HEADER — white background, burgundy stripe ──────────────────────────────
  const photoSize = 22;
  const photoPad  = 5;
  const headerH   = photoSize + photoPad * 2;  // 32mm

  // White header background
  doc.setFillColor(...WHITE);
  doc.rect(0, 0, pageW, headerH, "F");

  // Burgundy accent stripe at bottom
  doc.setFillColor(...BURGUNDY);
  doc.rect(0, headerH - 1.5, pageW, 1.5, "F");

  // Light separator
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.2);
  doc.line(0, headerH, pageW, headerH);

  // ── Right column: admin name + employee ID + photo ─────────────────────────
  const photoX        = pageW - margin - photoSize;
  const photoY        = photoPad;
  const nameGap       = 4;
  const nameRightEdge = photoX - nameGap;

  if (adminPhotoDataUrl) {
    doc.addImage(adminPhotoDataUrl, "PNG", photoX, photoY, photoSize, photoSize);
  } else {
    // Fallback: burgundy ring
    doc.setFillColor(...BURGUNDY);
    doc.circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2, "F");
    doc.setFillColor(251, 235, 242);
    doc.circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2 - 1.2, "F");
    const initials = adminName.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...BURGUNDY);
    doc.text(initials, photoX + photoSize / 2, photoY + photoSize / 2 + 3, { align: "center" });
  }

  // Admin name — navy on white, right-aligned
  const nameCenterY = photoY + photoSize / 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  doc.text(adminName, nameRightEdge, nameCenterY - 1.5, { align: "right", maxWidth: 48 });

  const empIdLabel = adminEmployeeId ? adminEmployeeId : "Administrator";
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text(empIdLabel, nameRightEdge, nameCenterY + 4.5, { align: "right", maxWidth: 48 });

  // ── Left column: logo + company name ─────────────────────────────────────
  const logoPad  = 2;
  const logoMm   = headerH - logoPad * 2;
  const textX    = margin + logoMm + 4;
  const textMaxW = nameRightEdge - 48 - textX - 4;

  // Color logo on white background
  if (logoDataUrl) {
    doc.setFillColor(248, 248, 248);
    doc.setDrawColor(235, 235, 235);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin - 0.8, logoPad - 0.8, logoMm + 1.6, logoMm + 1.6, 2, 2, "FD");
    doc.addImage(logoDataUrl, "JPEG", margin, logoPad, logoMm, logoMm);
  } else {
    doc.setFillColor(...BURGUNDY);
    doc.circle(margin + logoMm / 2, logoPad + logoMm / 2, logoMm / 2, "F");
    doc.setFillColor(251, 235, 242);
    doc.circle(margin + logoMm / 2, logoPad + logoMm / 2, logoMm / 2 - 2, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...BURGUNDY);
    doc.text("BMM", margin + logoMm / 2, logoPad + logoMm / 2 + 3, { align: "center" });
  }

  // Company name in navy (dark on white)
  const textCY = logoPad + logoMm / 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text("BASH M. MONEY FINANCIAL SERVICES LTD", textX, textCY - 2, { maxWidth: textMaxW });

  // Subtitle in burgundy
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...BURGUNDY);
  doc.text("Financial Transaction Report", textX, textCY + 5, { maxWidth: textMaxW });

  let y = headerH + 6;

  // ── REPORT TITLE BLOCK ─────────────────────────────────────────────────────
  // Soft gold-tinted card, burgundy title text
  doc.setFillColor(...GOLD_LIGHT);
  doc.roundedRect(margin, y, pageW - margin * 2, 20, 2, 2, "F");
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, pageW - margin * 2, 20, 2, 2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...BURGUNDY);
  doc.text("CONSOLIDATED TRANSACTIONS REPORT", pageW / 2, y + 7, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(`Period: ${periodLabel}`, pageW / 2, y + 13.5, { align: "center" });

  doc.setFontSize(7);
  doc.text(
    `Generated: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}  |  Prepared by: ${adminName}`,
    pageW / 2, y + 18, { align: "center" },
  );

  y += 26;

  // ── SUMMARY CARDS ──────────────────────────────────────────────────────────
  const cardW = (pageW - margin * 2 - 6) / 3;
  const cardH = 22;
  const cardY = y;

  const cards = [
    { label: "Total Deposits",    value: data.summary.totalDeposits,   color: GREEN,    bgLight: GREEN_LIGHT    },
    { label: "Total Withdrawals", value: data.summary.totalWithdrawals, color: RED,      bgLight: RED_LIGHT      },
    { label: "Net Cash Flow",     value: data.summary.netCashFlow,      color: BURGUNDY, bgLight: BURGUNDY_LIGHT },
  ];

  cards.forEach(({ label: cl, value, color, bgLight }, idx) => {
    const cx = margin + idx * (cardW + 3);
    doc.setFillColor(...bgLight);
    doc.roundedRect(cx, cardY, cardW, cardH, 2, 2, "F");
    doc.setDrawColor(...(color as [number, number, number]));
    doc.setLineWidth(0.4);
    doc.roundedRect(cx, cardY, cardW, cardH, 2, 2, "S");

    // Top color bar
    doc.setFillColor(...(color as [number, number, number]));
    doc.roundedRect(cx, cardY, cardW, 4, 2, 2, "F");
    doc.rect(cx, cardY + 2, cardW, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(...(color as [number, number, number]));
    doc.text(cl.toUpperCase(), cx + cardW / 2, cardY + 9.5, { align: "center" });

    const sign = cl === "Net Cash Flow" && value < 0 ? "-" : cl === "Net Cash Flow" && value >= 0 ? "+" : "";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text(`${sign}${formatUsh(Math.abs(value))}`, cx + cardW / 2, cardY + 17, { align: "center", maxWidth: cardW - 4 });
  });

  y += cardH + 7;

  // ── TRANSACTION TABLE ──────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...BURGUNDY);
  doc.text("Transaction Details", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(`${data.transactions.length} record${data.transactions.length !== 1 ? "s" : ""}`, pageW - margin, y, { align: "right" });

  y += 4;

  const tableRows = data.transactions.map((tx) => [
    formatShortDate(tx.createdAt),
    tx.memberName,
    tx.accountNumber,
    formatTransactionType(tx.type),
    (tx.direction === "credit" ? "+" : "-") + formatUsh(tx.amount),
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Date & Time", "Member Name", "Account No.", "Type", "Amount"]],
    body: tableRows,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 7.5,
      cellPadding: 3,
      font: "helvetica",
      textColor: DARK,
      lineColor: [220, 225, 235],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: BURGUNDY,
      textColor: WHITE,
      fontStyle: "bold",
      fontSize: 7,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 42 },
      2: { cellWidth: 32, textColor: [152, 110, 20], fontStyle: "bold" },
      3: { cellWidth: 36 },
      4: { halign: "right", fontStyle: "bold" },
    },
    didParseCell(hookData) {
      if (hookData.section === "body" && hookData.column.index === 4) {
        const raw = tableRows[hookData.row.index]?.[4] ?? "";
        hookData.cell.styles.textColor = raw.startsWith("+") ? GREEN : RED;
      }
    },
  });

  // ── FOOTER on each page + signature on last ────────────────────────────────
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const ph = doc.internal.pageSize.getHeight();

    // Gold divider
    doc.setFillColor(...GOLD);
    doc.rect(margin, ph - 14, pageW - margin * 2, 0.5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...BURGUNDY);
    doc.text("BASH M. MONEY FINANCIAL SERVICES LTD — Secured & Encrypted", margin, ph - 9);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text(`Page ${i} of ${totalPages}`, pageW - margin, ph - 9, { align: "right" });

    // Authorized signature — last page only
    if (i === totalPages) {
      const sigX1    = pageW / 2 + 10;
      const sigX2    = pageW - margin;
      const sigLineY = ph - 30;

      doc.setDrawColor(...BURGUNDY);
      doc.setLineWidth(0.4);
      doc.line(sigX1, sigLineY, sigX2, sigLineY);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...BURGUNDY);
      doc.text("Authorized Signature", (sigX1 + sigX2) / 2, sigLineY + 4, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(...MUTED);
      doc.text(adminName, (sigX1 + sigX2) / 2, sigLineY + 8.5, { align: "center" });
      doc.text("Bash M. Money And Financial Services Ltd", (sigX1 + sigX2) / 2, sigLineY + 12.5, { align: "center" });
    }
  }

  const date = new Date().toISOString().split("T")[0];
  doc.save(`BashM_Report_${date}.pdf`);
}
