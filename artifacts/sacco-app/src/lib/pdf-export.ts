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
const NAVY       = [15,  37,  87]  as [number, number, number];
const GOLD       = [201, 161, 68]  as [number, number, number];
const GOLD_LIGHT = [253, 245, 220] as [number, number, number];
const GREEN      = [22,  163, 74]  as [number, number, number];
const RED        = [220, 38,  38]  as [number, number, number];
const DARK       = [15,  23,  42]  as [number, number, number];
const MUTED      = [100, 116, 139] as [number, number, number];
const LIGHT_GRAY = [241, 245, 249] as [number, number, number];
const WHITE      = [255, 255, 255] as [number, number, number];
const GREEN_LIGHT = [220, 252, 231] as [number, number, number];
const RED_LIGHT   = [254, 226, 226] as [number, number, number];

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

    // Gold border ring
    ctx.beginPath();
    ctx.arc(diameter / 2, diameter / 2, diameter / 2, 0, Math.PI * 2);
    ctx.fillStyle = "#c9a144";
    ctx.fill();

    // Clip inner circle (leaves 3px gold border)
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

export async function exportMemberStatementPDF(
  profile: MemberProfile,
  ledger: MemberLedger,
): Promise<void> {
  const doc  = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;

  // ── Load member photo (async, before drawing) ───────────────────────────────
  let photoDataUrl: string | null = null;
  if (profile.profilePictureUrl) {
    photoDataUrl = await loadCircularImage(profile.profilePictureUrl, 200);
  }

  // ── Compute statement period ─────────────────────────────────────────────────
  const dates    = ledger.entries.map((e) => new Date(e.createdAt).getTime());
  const earliest = dates.length ? new Date(Math.min(...dates)) : null;
  const latest   = dates.length ? new Date(Math.max(...dates)) : null;
  const periodStr =
    earliest && latest
      ? `${formatDateOnly(earliest.toISOString())} – ${formatDateOnly(latest.toISOString())}`
      : "No transactions";

  // ═══════════════════════════════════════════════════════════════════════════
  //  HEADER BAR — navy background, full width
  // ═══════════════════════════════════════════════════════════════════════════
  const headerH = 30;
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, headerH, "F");

  // Gold accent stripe at bottom of header
  doc.setFillColor(...GOLD);
  doc.rect(0, headerH - 2, pageW, 2, "F");

  // BMM badge (left)
  const badgeX = margin;
  const badgeY = 6;
  doc.setFillColor(...GOLD);
  doc.roundedRect(badgeX, badgeY, 14, 9, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...NAVY);
  doc.text("BMM", badgeX + 7, badgeY + 6, { align: "center" });

  // Company name (left, next to badge)
  const textX = badgeX + 17;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...WHITE);
  doc.text("BASH M. MONEY FINANCIAL SERVICES LTD", textX, badgeY + 5.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(220, 210, 170); // warm cream
  doc.text("Member Account Statement", textX, badgeY + 12);

  // Generated date (right side of header, below photo space)
  const genDate = `Generated: ${formatShortDate(new Date().toISOString())}`;
  doc.setFontSize(6.5);
  doc.setTextColor(180, 190, 210);
  doc.text(genDate, pageW - margin, headerH - 5, { align: "right" });

  // ── Member photo (top-right, overlapping header/info box) ───────────────────
  const photoSize = 22; // mm in PDF
  const photoX    = pageW - margin - photoSize;
  const photoY    = 4;

  if (photoDataUrl) {
    doc.addImage(photoDataUrl, "PNG", photoX, photoY, photoSize, photoSize);
  } else {
    // Fallback: initials circle with gold border
    doc.setFillColor(...GOLD);
    doc.circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2, "F");
    doc.setFillColor(...NAVY);
    doc.circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2 - 1, "F");
    const initials = profile.name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...GOLD);
    doc.text(initials, photoX + photoSize / 2, photoY + photoSize / 2 + 3.5, { align: "center" });
  }

  let y = headerH + 4;

  // ═══════════════════════════════════════════════════════════════════════════
  //  MEMBER INFO BOX
  // ═══════════════════════════════════════════════════════════════════════════
  const infoH = 34;
  doc.setFillColor(...LIGHT_GRAY);
  doc.roundedRect(margin, y, pageW - margin * 2, infoH, 3, 3, "F");

  // Gold left accent bar
  doc.setFillColor(...GOLD);
  doc.roundedRect(margin, y, 3, infoH, 1.5, 1.5, "F");

  const infoX = margin + 7;

  // Member name — large
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  doc.text(profile.name, infoX, y + 9);

  // Account number — gold, monospace feel
  if (profile.accountNumber) {
    doc.setFont("courier", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...GOLD);
    doc.text(profile.accountNumber, infoX, y + 16);
  }

  // Row 2 — metadata
  const r2y   = y + 23;
  const col1  = infoX;
  const col2  = pageW / 2 - 4;

  // Statement Period (spanning)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text("Statement Period:", col1, r2y);
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.text(periodStr, col1 + 31, r2y);

  // Phone
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  doc.text("Phone:", col2, r2y);
  doc.setTextColor(...DARK);
  doc.text(profile.phone, col2 + 14, r2y);

  // Row 3 — Member since & ID
  const r3y = y + 29;
  doc.setTextColor(...MUTED);
  doc.text("Member Since:", col1, r3y);
  doc.setTextColor(...DARK);
  doc.text(formatDateOnly(profile.joinDate), col1 + 27, r3y);

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
    { label: "Total Savings",     value: formatUsh(profile.totalSavings),     color: GREEN, bg: GREEN_LIGHT },
    { label: "Outstanding Loan",  value: formatUsh(profile.outstandingLoan),  color: RED,   bg: RED_LIGHT   },
    { label: "Net Balance",       value: formatUsh(profile.currentBalance),   color: profile.currentBalance >= 0 ? GREEN : RED, bg: profile.currentBalance >= 0 ? GREEN_LIGHT : RED_LIGHT },
  ];

  cards.forEach((card, i) => {
    const cx = margin + i * (cardW + 4);
    doc.setFillColor(...card.bg);
    doc.roundedRect(cx, y, cardW, cardH, 2, 2, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text(card.label.toUpperCase(), cx + 4, y + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...card.color);
    doc.text(card.value, cx + 4, y + 14);
  });

  y += cardH + 5;

  // ═══════════════════════════════════════════════════════════════════════════
  //  TRANSACTION LEDGER TABLE
  // ═══════════════════════════════════════════════════════════════════════════
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...NAVY);
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
      fillColor: NAVY,
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
  //  TOTALS — 3 clean cards (no overlapping text)
  // ═══════════════════════════════════════════════════════════════════════════
  const tableBottom = (doc as any).lastAutoTable.finalY;
  const totalsY     = tableBottom + 5;
  const totalsH     = 18;
  const totalsCardW = (pageW - margin * 2 - 8) / 3;

  const totals = [
    { label: "Total Credits",   value: formatUsh(ledger.totalCredits),   color: GREEN, bg: GREEN_LIGHT },
    { label: "Total Debits",    value: formatUsh(ledger.totalDebits),     color: RED,   bg: RED_LIGHT   },
    { label: "Closing Balance", value: formatUsh(ledger.currentBalance),  color: ledger.currentBalance >= 0 ? GREEN : RED, bg: ledger.currentBalance >= 0 ? GREEN_LIGHT : RED_LIGHT },
  ];

  // Check if there's room on this page; if not, add a page
  if (totalsY + totalsH + 20 > pageH - 16) {
    doc.addPage();
  }

  const finalTotalsY = (totalsY + totalsH + 20 > pageH - 16) ? 14 : totalsY;

  totals.forEach((t, i) => {
    const tx = margin + i * (totalsCardW + 4);
    doc.setFillColor(...t.bg);
    doc.roundedRect(tx, finalTotalsY, totalsCardW, totalsH, 2, 2, "F");
    // Colored top border
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
  //  OFFICIAL STATEMENT NOTICE
  // ═══════════════════════════════════════════════════════════════════════════
  const noticeY = finalTotalsY + totalsH + 6;
  const noticeH = 9;
  doc.setFillColor(...GOLD_LIGHT);
  doc.roundedRect(margin, noticeY, pageW - margin * 2, noticeH, 2, 2, "F");
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, noticeY, pageW - margin * 2, noticeH, 2, 2, "S");
  doc.setFont("helvetica", "bolditalic");
  doc.setFontSize(7.5);
  doc.setTextColor(...NAVY);
  doc.text(
    "This is an official document of Bash M. Money And Financial Services Ltd.",
    pageW / 2,
    noticeY + 6,
    { align: "center" },
  );

  // ═══════════════════════════════════════════════════════════════════════════
  //  PAGE FOOTER — all pages
  // ═══════════════════════════════════════════════════════════════════════════
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const ph = doc.internal.pageSize.getHeight();

    // Thin gold line
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.5);
    doc.line(margin, ph - 13, pageW - margin, ph - 13);

    // Left: official tagline
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...NAVY);
    doc.text("Bash M. Money And Financial Services Ltd", margin, ph - 8);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text("— Confidential Member Statement", margin + 67, ph - 8);

    // Right: page number
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text(`Page ${i} of ${totalPages}`, pageW - margin, ph - 8, { align: "right" });
  }

  // ── Save ─────────────────────────────────────────────────────────────────────
  const safeName = profile.name.replace(/\s+/g, "_").toLowerCase();
  const date = new Date().toISOString().split("T")[0];
  doc.save(`BashM_Statement_${safeName}_${date}.pdf`);
}
