/**
 * Style commun des PDF ImmoPilot : charte « premium » (en-têtes, tableaux corporate, pied de page).
 */

export const IMMO_PDF = {
  ink: '#0f172a',
  /** Bleu nuit — titres, en-têtes de tableau */
  primary: '#0f2847',
  accent: '#1d4ed8',
  /** Accent doré discret — filets, repères */
  accentGold: '#b8860b',
  accentLine: '#d4a84b',
  muted: '#64748b',
  subtle: '#94a3b8',
  border: '#e2e8f0',
  borderStrong: '#cbd5e1',
  /** @deprecated préférer tableHeaderBg pour en-têtes de colonnes */
  headerBg: '#f1f5f9',
  tableHeaderBg: '#0f2847',
  tableHeaderInk: '#f8fafc',
  zebra: '#ffffff',
  zebraAlt: '#f1f5f9',
  white: '#ffffff',
  cardBg: '#f8fafc',
  instructionBg: '#f0f9ff',
  instructionBorder: '#7dd3fc',
} as const;

export const TAGLINE = 'ImmoPilot - Gestion immobilière';

/**
 * Montants FCFA pour PDFKit (Helvetica) : chiffres groupés par espaces ASCII + « FCFA ».
 * Évite Intl / locale (U+202F, espaces insécables) qui se rendent souvent comme « / » dans les PDF.
 */
export function formatFcfaPdf(n: number): string {
  const r = Math.round(Math.abs(Number(n)));
  const s = r.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${s} FCFA`;
}

/**
 * Helvetica (PDFKit) ne gère pas bien les tirets / flèches Unicode :
 * ils deviennent illisibles. Remplace par de l’ASCII sûr.
 */
export function pdfSafeText(s: string): string {
  return String(s ?? '')
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-') // tirets
    .replace(/[\u2022\u00B7\u2027\u2219]/g, '-') // puces / points médians
    .replace(/[\u2190-\u21FF\u27F0-\u27FF]/g, '-') // flèches
    .replace(/\u2026/g, '...')
    .replace(/[\u00A0\u202F\u2007\u2009]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Date calendaire (UTC) → jj/mm/aaaa pour PDF. */
export function formatDatePdfFr(d: Date | string | null | undefined): string {
  if (d == null || d === '') return '-';
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return '-';
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

/** Coupe une cellule PDF sans caractère Unicode problématique. */
export function truncPdfCell(s: string, maxChars: number): string {
  const t = pdfSafeText(s);
  return t.length <= maxChars ? t : `${t.slice(0, Math.max(0, maxChars - 3))}...`;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

export function drawTopBanner(
  doc: any,
  margin: number,
  contentW: number,
  options: { eyebrow: string; title: string; subtitle?: string },
) {
  let y = doc.y;
  doc.rect(margin, y, contentW, 2).fill(IMMO_PDF.accentLine);
  y += 2;
  doc.rect(margin, y, contentW, 5).fill(IMMO_PDF.primary);
  y += 5 + 20;
  doc.fillColor(IMMO_PDF.muted).font('Helvetica').fontSize(7.5).text(pdfSafeText(options.eyebrow).toUpperCase(), margin, y, {
    characterSpacing: 1.2,
    width: contentW,
  });
  y = doc.y + 6;
  doc.fillColor(IMMO_PDF.ink).font('Helvetica-Bold').fontSize(20).text(pdfSafeText(options.title), margin, y, { width: contentW });
  y = doc.y + 8;
  if (options.subtitle) {
    doc
      .fillColor(IMMO_PDF.muted)
      .font('Helvetica')
      .fontSize(10)
      .text(pdfSafeText(options.subtitle), margin, y, { width: contentW, lineGap: 3 });
    y = doc.y + 10;
  } else {
    y += 8;
  }
  doc.moveTo(margin, y).lineTo(margin + contentW, y).lineWidth(0.85).strokeColor(IMMO_PDF.borderStrong).stroke();
  y += 2;
  doc.moveTo(margin, y).lineTo(margin + Math.min(contentW * 0.42, 220), y).lineWidth(1.35).strokeColor(IMMO_PDF.accentGold).stroke();
  doc.y = y + 16;
}

export function drawSectionHeading(doc: any, margin: number, contentW: number, title: string, number?: string) {
  doc.moveDown(0.35);
  const label = number ? `${number}    ${title}` : title;
  const y0 = doc.y;
  const barH = 22;
  doc.save();
  doc.roundedRect(margin, y0, 3, barH, 0.5).fill(IMMO_PDF.accentGold);
  doc.restore();
  const textX = margin + 12;
  doc.fillColor(IMMO_PDF.primary).font('Helvetica-Bold').fontSize(12).text(label, textX, y0 + 3, { width: contentW - 12 });
  const y1 = doc.y;
  doc
    .moveTo(textX, y1 + 5)
    .lineTo(textX + Math.min(130, contentW * 0.2), y1 + 5)
    .lineWidth(1.1)
    .strokeColor(IMMO_PDF.accentLine)
    .stroke();
  doc.y = y1 + 16;
}

/** Libellé discret + texte (champ de fiche). */
export function drawField(doc: any, margin: number, contentW: number, label: string, value: string) {
  doc.fillColor(IMMO_PDF.subtle).font('Helvetica-Bold').fontSize(7).text(pdfSafeText(label).toUpperCase(), margin, doc.y, {
    characterSpacing: 0.65,
    width: contentW,
  });
  doc.moveDown(0.15);
  doc
    .fillColor(IMMO_PDF.ink)
    .font('Helvetica')
    .fontSize(10.5)
    .text(pdfSafeText(value || '-') || '-', margin, doc.y, { width: contentW, lineGap: 2 });
  doc.moveDown(0.65);
}

export function drawFooter(doc: any, margin: number, contentW: number, pageHeight: number) {
  const ts = new Date().toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });
  const yLine = pageHeight - 40;
  doc.moveTo(margin, yLine).lineTo(margin + contentW, yLine).lineWidth(0.7).strokeColor(IMMO_PDF.border).stroke();
  doc.fontSize(8).fillColor(IMMO_PDF.muted).font('Helvetica-Bold').text(TAGLINE, margin, yLine + 7, {
    width: contentW,
    align: 'center',
  });
  doc
    .font('Helvetica')
    .fontSize(7)
    .fillColor(IMMO_PDF.subtle)
    .text(`Document généré le ${ts}`, margin, yLine + 7 + 12, { width: contentW, align: 'center' });
}

const ROW_H = 22;
const HEADER_H = 24;

export function drawZebraTable(
  doc: any,
  margin: number,
  contentW: number,
  pageTop: number,
  pageBottom: number,
  colFracs: number[],
  headers: string[],
  rows: string[][],
  startY: number,
): number {
  const n = colFracs.length;
  const sum = colFracs.reduce((a, b) => a + b, 0);
  const w = colFracs.map((c) => (c / sum) * contentW);

  let y = startY;

  const drawHeaderRow = () => {
    doc.rect(margin, y, contentW, HEADER_H).fill(IMMO_PDF.tableHeaderBg);
    let x = margin;
    doc.fillColor(IMMO_PDF.tableHeaderInk).font('Helvetica-Bold').fontSize(8);
    for (let i = 0; i < n; i++) {
      doc.text(pdfSafeText(String(headers[i] ?? '')), x + 6, y + 7, {
        width: (w[i] as number) - 12,
        height: HEADER_H - 10,
        ellipsis: true,
        lineGap: 0,
      });
      x += w[i] as number;
    }
    doc
      .moveTo(margin, y + HEADER_H)
      .lineTo(margin + contentW, y + HEADER_H)
      .strokeColor(IMMO_PDF.primary)
      .lineWidth(0.35)
      .stroke();
    y += HEADER_H;
  };

  drawHeaderRow();
  doc.font('Helvetica').fontSize(8.5).fillColor(IMMO_PDF.ink);

  let rowIdx = 0;
  for (const row of rows) {
    if (y + ROW_H > pageBottom) {
      doc.addPage();
      y = pageTop;
      drawHeaderRow();
      doc.font('Helvetica').fontSize(8.5).fillColor(IMMO_PDF.ink);
    }
    const bg = rowIdx % 2 === 0 ? IMMO_PDF.zebra : IMMO_PDF.zebraAlt;
    doc.rect(margin, y, contentW, ROW_H).fill(bg);
    let x = margin;
    const cells = row.length >= n ? row : [...row, ...Array(n - row.length).fill('—')];
    for (let i = 0; i < n; i++) {
      const txt = pdfSafeText(String(cells[i] ?? '-')) || '-';
      doc.fillColor(IMMO_PDF.ink).text(txt, x + 6, y + 5, {
        width: (w[i] as number) - 12,
        height: ROW_H - 8,
        ellipsis: true,
        lineGap: 0,
      });
      x += w[i] as number;
    }
    doc
      .moveTo(margin, y + ROW_H)
      .lineTo(margin + contentW, y + ROW_H)
      .strokeColor(IMMO_PDF.border)
      .lineWidth(0.2)
      .stroke();
    y += ROW_H;
    rowIdx += 1;
  }

  doc.y = y + 10;
  return y;
}

/** Colonnes égales (listes synthétiques). */
export function drawZebraTableEqualCols(
  doc: any,
  margin: number,
  contentW: number,
  pageTop: number,
  pageBottom: number,
  headers: string[],
  rows: string[][],
  startY: number,
): number {
  const n = headers.length;
  const fr = Array(n).fill(1 / n);
  return drawZebraTable(doc, margin, contentW, pageTop, pageBottom, fr, headers, rows, startY);
}

export function drawScheduleTable(
  doc: any,
  margin: number,
  contentW: number,
  pageTop: number,
  pageBottom: number,
  schedule: Array<{
    periodYear: number;
    periodMonth: number;
    dueDate: string;
    amountDue: number;
    amountPaid: number | null;
    statusFr: string;
  }>,
  fmtMoney: (n: number) => string,
  startY: number,
): number {
  const headers = ['Période', 'Échéance', 'Montant dû', 'Montant payé', 'Statut'];
  const colFracs = [0.14, 0.18, 0.2, 0.2, 0.22];
  const rows = schedule.map((p) => [
    `${p.periodYear}-${String(p.periodMonth).padStart(2, '0')}`,
    p.dueDate,
    fmtMoney(p.amountDue),
    p.amountPaid != null ? fmtMoney(p.amountPaid) : '—',
    p.statusFr,
  ]);
  return drawZebraTable(doc, margin, contentW, pageTop, pageBottom, colFracs, headers, rows, startY);
}

/** Encadré d’instructions (feuille terrain et bureau). */
export function drawWorksheetInstructionBox(doc: any, margin: number, contentW: number) {
  const lines = [
    '• Côté terrain (agent) : cochez la case « Perçu » lorsque le loyer a été encaissé ou réglé sur place.',
    '• Côté bureau (collaborateur) : reportez ensuite les paiements dans le menu Paiements d’ImmoPilot (ce document est une aide — la référence reste l’application).',
    '• Utilisez la colonne « Notes » pour relances, date de versement, nº de reçu, ou tout message pour la personne qui saisira au bureau.',
  ];
  const pad = 12;
  doc.font('Helvetica').fontSize(9).fillColor(IMMO_PDF.ink);
  let blockH = 8;
  for (const line of lines) {
    blockH += doc.heightOfString(line, { width: contentW - 2 * pad }) + 4;
  }
  blockH += pad;
  const y0 = doc.y;
  doc.save();
  doc.roundedRect(margin, y0, contentW, blockH, 6).fill(IMMO_PDF.instructionBg).stroke(IMMO_PDF.instructionBorder);
  doc.rect(margin, y0, 4, blockH).fill(IMMO_PDF.accentGold);
  doc.restore();
  let yy = y0 + pad;
  for (const line of lines) {
    doc.font('Helvetica').fontSize(9).fillColor(IMMO_PDF.ink).text(line, margin + pad + 2, yy, { width: contentW - 2 * pad - 2, lineGap: 2 });
    yy = doc.y + 2;
  }
  doc.y = y0 + blockH + 12;
}

export function drawDashboardKpiSummary(
  doc: any,
  margin: number,
  contentW: number,
  kpis: {
    buildings: number;
    units: number;
    tenants: number;
    expectedMonthlyRent: number;
    collectedThisMonth: number;
    depositsCollectedThisMonth: number;
    overdueCount: number;
    overdueAmount: number;
  },
  fcfa: (n: number) => string,
) {
  const y0 = doc.y;
  const h = 62;
  doc.save();
  doc.roundedRect(margin, y0, contentW, h, 5).fill(IMMO_PDF.cardBg).stroke(IMMO_PDF.borderStrong);
  doc.restore();
  doc
    .fillColor(IMMO_PDF.primary)
    .font('Helvetica-Bold')
    .fontSize(10.5)
    .text('Synthèse automatique du tableau de bord', margin + 14, y0 + 10, { width: contentW - 28 });
  doc
    .moveTo(margin + 14, y0 + 24)
    .lineTo(margin + Math.min(160, contentW * 0.28), y0 + 24)
    .lineWidth(1.1)
    .strokeColor(IMMO_PDF.accentGold)
    .stroke();
  doc.fillColor(IMMO_PDF.ink).font('Helvetica').fontSize(9);
  const colW = (contentW - 28) / 2;
  const y1 = y0 + 32;
  doc.text(`Patrimoine : ${kpis.buildings} bien(s) · ${kpis.units} unité(s) · ${kpis.tenants} locataire(s)`, margin + 14, y1, {
    width: colW,
  });
  doc.text(`Loyer mensuel attendu (baux actifs) : ${fcfa(kpis.expectedMonthlyRent)}`, margin + 14 + colW, y1, { width: colW });
  doc.text(`Encaissements loyers (mois) : ${fcfa(kpis.collectedThisMonth)}`, margin + 14, y1 + 14, { width: colW });
  doc.text(`Cautions encaissées ce mois : ${fcfa(kpis.depositsCollectedThisMonth)}`, margin + 14 + colW, y1 + 14, { width: colW });
  doc.text(`Point impayés : ${kpis.overdueCount} ligne(s) · Reste estimé ${fcfa(kpis.overdueAmount)}`, margin + 14, y1 + 28, {
    width: contentW - 28,
  });
  doc.y = y0 + h + 12;
}

function drawCheckbox(doc: any, x: number, y: number, size = 11) {
  doc
    .roundedRect(x, y, size, size, 1.5)
    .strokeColor(IMMO_PDF.primary)
    .lineWidth(0.55)
    .stroke();
}

export type WorksheetAlertRow = {
  tenant: string;
  place: string;
  period: string;
  dueDate: string;
  remaining: string;
};

/** Tableau impayés avec cases à cocher + colonne notes (grand format pour écriture). */
export function drawWorksheetImpayesTable(
  doc: any,
  margin: number,
  contentW: number,
  pageTop: number,
  pageBottom: number,
  startY: number,
  rows: WorksheetAlertRow[],
): number {
  const GAP = 4;
  const CB_COL = 26;
  const HEADER_H = 24;
  const ROW_H = 30;
  const innerText = contentW - CB_COL - 6 * GAP;
  const w = [
    CB_COL,
    innerText * 0.2,
    innerText * 0.26,
    innerText * 0.11,
    innerText * 0.11,
    innerText * 0.13,
    innerText * 0.19,
  ];

  const headers = [
    'Perçu\n(papier)',
    'Locataire',
    'Bien et local',
    'Période',
    'Échéance',
    'Reste dû',
    'Notes et suite à donner',
  ];

  const colX = (i: number) => {
    let x = margin;
    for (let j = 0; j < i; j++) x += w[j]! + GAP;
    return x;
  };

  const drawHeader = (y: number) => {
    doc.save();
    doc.rect(margin, y, contentW, HEADER_H).fill(IMMO_PDF.tableHeaderBg);
    doc.restore();
    doc.fillColor(IMMO_PDF.tableHeaderInk).font('Helvetica-Bold').fontSize(7);
    headers.forEach((h, i) => {
      doc.text(h, colX(i) + 3, y + 4, { width: w[i]! - 6, lineGap: 1 });
    });
    doc.strokeColor(IMMO_PDF.primary).lineWidth(0.5).moveTo(margin, y + HEADER_H).lineTo(margin + contentW, y + HEADER_H).stroke();
    return y + HEADER_H;
  };

  let y = startY;
  y = drawHeader(y);

  if (rows.length === 0) {
    doc.font('Helvetica').fontSize(9).fillColor(IMMO_PDF.muted).text('Aucun impayé ni retard à suivre pour le moment. ✓', margin, y + 6, {
      width: contentW,
    });
    doc.y = y + 22;
    return y + 22;
  }

  doc.font('Helvetica').fontSize(8.5).fillColor(IMMO_PDF.ink);

  let idx = 0;
  for (const r of rows) {
    if (y + ROW_H > pageBottom) {
      doc.addPage();
      y = pageTop;
      y = drawHeader(y);
      doc.font('Helvetica').fontSize(8.5).fillColor(IMMO_PDF.ink);
    }
    const bg = idx % 2 === 0 ? IMMO_PDF.zebra : IMMO_PDF.zebraAlt;
    doc.save();
    doc.rect(margin, y, contentW, ROW_H).fill(bg);
    doc.restore();

    drawCheckbox(doc, colX(0) + 6, y + (ROW_H - 11) / 2, 11);

    const cells = [r.tenant, r.place, r.period, r.dueDate, r.remaining, ''];
    cells.forEach((text, i) => {
      const ci = i + 1;
      doc.fillColor(IMMO_PDF.ink).text(text || '—', colX(ci) + 3, y + 7, { width: w[ci]! - 6, lineGap: 0 });
    });

    doc
      .strokeColor(IMMO_PDF.border)
      .lineWidth(0.2)
      .moveTo(margin, y + ROW_H)
      .lineTo(margin + contentW, y + ROW_H)
      .stroke();
    y += ROW_H;
    idx += 1;
  }

  doc.y = y + 8;
  return y;
}

/** Légende sous le tableau (flux : évite le chevauchement avec le dernier tableau). */
export function drawWorksheetLegend(doc: any, margin: number, contentW: number) {
  doc.moveDown(0.45);
  const y0 = doc.y;
  const legendH = doc.heightOfString(
    'Les cases à cocher servent au suivi sur papier uniquement. Pour la comptabilité et le juridique, la saisie dans ImmoPilot fait foi.',
    { width: contentW - 24 },
  );
  doc.save();
  doc.roundedRect(margin, y0, contentW, legendH + 14, 4).fill(IMMO_PDF.cardBg).stroke(IMMO_PDF.border);
  doc.restore();
  doc
    .fontSize(7)
    .fillColor(IMMO_PDF.muted)
    .font('Helvetica-Oblique')
    .text(
      'Les cases à cocher servent au suivi sur papier uniquement. Pour la comptabilité et le juridique, la saisie dans ImmoPilot fait foi.',
      margin + 12,
      y0 + 7,
      { width: contentW - 24, align: 'center' },
    );
  doc.y = y0 + legendH + 22;
}

/** Encadré d’instructions — liste Paiements (terrain et bureau). */
export function drawPaymentsWorksheetInstructionBox(doc: any, margin: number, contentW: number) {
  const lines = [
    '• Côté terrain (agent) : cochez « Perçu » lorsque l’encaissement est constaté (espèces, mobile money, chèque reçu…).',
    '• Côté bureau : reportez ensuite dans le menu Paiements (date, montant, mode) — ce PDF reprend les filtres de l’écran (mois, bien, impayés, etc.).',
    '• Colonne « Notes » : relance, engagement de date, numéro de quittance, ou message pour la personne qui mettra à jour l’application.',
  ];
  const pad = 12;
  doc.font('Helvetica').fontSize(9).fillColor(IMMO_PDF.ink);
  let blockH = 8;
  for (const line of lines) {
    blockH += doc.heightOfString(line, { width: contentW - 2 * pad }) + 4;
  }
  blockH += pad;
  const y0 = doc.y;
  doc.save();
  doc.roundedRect(margin, y0, contentW, blockH, 6).fill(IMMO_PDF.instructionBg).stroke(IMMO_PDF.instructionBorder);
  doc.rect(margin, y0, 4, blockH).fill(IMMO_PDF.accentGold);
  doc.restore();
  let yy = y0 + pad;
  for (const line of lines) {
    doc.font('Helvetica').fontSize(9).fillColor(IMMO_PDF.ink).text(line, margin + pad + 2, yy, { width: contentW - 2 * pad - 2, lineGap: 2 });
    yy = doc.y + 2;
  }
  doc.y = y0 + blockH + 12;
}

export function drawPaymentsListKpiSummary(
  doc: any,
  margin: number,
  contentW: number,
  kpis: {
    filterLabel: string;
    lineCount: number;
    matchTotal: number;
    truncated: boolean;
    totalDue: number;
    totalPaid: number;
    totalRemain: number;
  },
  fcfa: (n: number) => string,
) {
  const y0 = doc.y;
  const h = kpis.truncated ? 78 : 62;
  doc.save();
  doc.roundedRect(margin, y0, contentW, h, 5).fill(IMMO_PDF.cardBg).stroke(IMMO_PDF.borderStrong);
  doc.restore();
  doc
    .fillColor(IMMO_PDF.primary)
    .font('Helvetica-Bold')
    .fontSize(10.5)
    .text('Synthèse (selon les filtres de la liste)', margin + 14, y0 + 10, { width: contentW - 28 });
  doc
    .moveTo(margin + 14, y0 + 24)
    .lineTo(margin + Math.min(175, contentW * 0.32), y0 + 24)
    .lineWidth(1.1)
    .strokeColor(IMMO_PDF.accentGold)
    .stroke();
  doc.fillColor(IMMO_PDF.muted).font('Helvetica').fontSize(8).text(kpis.filterLabel, margin + 14, y0 + 28, { width: contentW - 28 });
  doc.fillColor(IMMO_PDF.ink).font('Helvetica').fontSize(9);
  const colW = (contentW - 28) / 2;
  const y1 = y0 + 42;
  const ligneTxt = kpis.truncated
    ? `${kpis.lineCount} ligne(s) dans ce PDF (sur ${kpis.matchTotal} au total — affinez les filtres pour raccourcir)`
    : `${kpis.lineCount} échéance(s) listée(s)`;
  doc.text(ligneTxt, margin + 14, y1, { width: contentW - 28 });
  doc.text(`Somme dues (lignes PDF) : ${fcfa(kpis.totalDue)}`, margin + 14, y1 + 14, { width: colW });
  doc.text(`Déjà encaissé : ${fcfa(kpis.totalPaid)}`, margin + 14 + colW, y1 + 14, { width: colW });
  doc.text(`Reste global (lignes PDF) : ${fcfa(kpis.totalRemain)}`, margin + 14, y1 + 28, { width: contentW - 28 });
  doc.y = y0 + h + 12;
}

export type PaymentsWorksheetRow = {
  tenant: string;
  place: string;
  period: string;
  dueDate: string;
  status: string;
  remaining: string;
};

/** Liste d’échéances avec case « perçu », statut et notes (A4 paysage). */
export function drawPaymentsListWorksheetTable(
  doc: any,
  margin: number,
  contentW: number,
  pageTop: number,
  pageBottom: number,
  startY: number,
  rows: PaymentsWorksheetRow[],
): number {
  const GAP = 3;
  const CB_COL = 24;
  const HEADER_H = 26;
  const ROW_H = 28;
  const innerText = contentW - CB_COL - 7 * GAP;
  const w = [
    CB_COL,
    innerText * 0.17,
    innerText * 0.2,
    innerText * 0.09,
    innerText * 0.1,
    innerText * 0.1,
    innerText * 0.12,
    innerText * 0.22,
  ];

  const headers = [
    'Perçu\n(papier)',
    'Locataire',
    'Bien et local',
    'Période',
    'Échéance',
    'Statut',
    'Reste dû',
    'Notes',
  ];

  const colX = (i: number) => {
    let x = margin;
    for (let j = 0; j < i; j++) x += w[j]! + GAP;
    return x;
  };

  const drawHeader = (y: number) => {
    doc.save();
    doc.rect(margin, y, contentW, HEADER_H).fill(IMMO_PDF.tableHeaderBg);
    doc.restore();
    doc.fillColor(IMMO_PDF.tableHeaderInk).font('Helvetica-Bold').fontSize(6.5);
    headers.forEach((h, i) => {
      doc.text(h, colX(i) + 2, y + 3, { width: w[i]! - 4, lineGap: 0.5 });
    });
    doc.strokeColor(IMMO_PDF.primary).lineWidth(0.5).moveTo(margin, y + HEADER_H).lineTo(margin + contentW, y + HEADER_H).stroke();
    return y + HEADER_H;
  };

  let y = startY;
  y = drawHeader(y);

  if (rows.length === 0) {
    doc.font('Helvetica').fontSize(9).fillColor(IMMO_PDF.muted).text('Aucune échéance ne correspond aux filtres sélectionnés.', margin, y + 6, {
      width: contentW,
    });
    doc.y = y + 22;
    return y + 22;
  }

  doc.font('Helvetica').fontSize(7.5).fillColor(IMMO_PDF.ink);

  let idx = 0;
  for (const r of rows) {
    if (y + ROW_H > pageBottom) {
      doc.addPage();
      y = pageTop;
      y = drawHeader(y);
      doc.font('Helvetica').fontSize(7.5).fillColor(IMMO_PDF.ink);
    }
    const bg = idx % 2 === 0 ? IMMO_PDF.zebra : IMMO_PDF.zebraAlt;
    doc.save();
    doc.rect(margin, y, contentW, ROW_H).fill(bg);
    doc.restore();

    drawCheckbox(doc, colX(0) + 5, y + (ROW_H - 11) / 2, 11);

    const cells = [r.tenant, r.place, r.period, r.dueDate, r.status, r.remaining, ''];
    cells.forEach((text, i) => {
      const ci = i + 1;
      doc.fillColor(IMMO_PDF.ink).text(text || '—', colX(ci) + 2, y + 7, { width: w[ci]! - 4, lineGap: 0 });
    });

    doc
      .strokeColor(IMMO_PDF.border)
      .lineWidth(0.2)
      .moveTo(margin, y + ROW_H)
      .lineTo(margin + contentW, y + ROW_H)
      .stroke();
    y += ROW_H;
    idx += 1;
  }

  doc.y = y + 8;
  return y;
}

/** Encadré d’instructions — liste Biens (visite terrain et mise à jour des fiches). */
export function drawBuildingsWorksheetInstructionBox(doc: any, margin: number, contentW: number) {
  const lines = [
    '• Côté terrain (gestionnaire) : cochez la case lorsque le passage ou le contrôle sur site est fait (état des lieux, travaux, occupation…).',
    '• Côté bureau : mettez à jour les Biens ou unités dans ImmoPilot si vous constatez des changements (nom, lots, adresse, notes).',
    '• Colonne « Notes » : anomalies, date de prochaine visite, contact gardien, ou message pour la personne qui saisira au bureau.',
  ];
  const pad = 12;
  doc.font('Helvetica').fontSize(9).fillColor(IMMO_PDF.ink);
  let blockH = 8;
  for (const line of lines) {
    blockH += doc.heightOfString(line, { width: contentW - 2 * pad }) + 4;
  }
  blockH += pad;
  const y0 = doc.y;
  doc.save();
  doc.roundedRect(margin, y0, contentW, blockH, 6).fill(IMMO_PDF.instructionBg).stroke(IMMO_PDF.instructionBorder);
  doc.rect(margin, y0, 4, blockH).fill(IMMO_PDF.accentGold);
  doc.restore();
  let yy = y0 + pad;
  for (const line of lines) {
    doc.font('Helvetica').fontSize(9).fillColor(IMMO_PDF.ink).text(line, margin + pad + 2, yy, { width: contentW - 2 * pad - 2, lineGap: 2 });
    yy = doc.y + 2;
  }
  doc.y = y0 + blockH + 12;
}

export function drawBuildingsListKpiSummary(
  doc: any,
  margin: number,
  contentW: number,
  kpis: {
    filterLabel: string;
    lineCount: number;
    matchTotal: number;
    truncated: boolean;
    totalUnits: number;
  },
) {
  const y0 = doc.y;
  const h = kpis.truncated ? 72 : 58;
  doc.save();
  doc.roundedRect(margin, y0, contentW, h, 5).fill(IMMO_PDF.cardBg).stroke(IMMO_PDF.borderStrong);
  doc.restore();
  doc
    .fillColor(IMMO_PDF.primary)
    .font('Helvetica-Bold')
    .fontSize(10.5)
    .text('Synthèse (selon les filtres de la liste Biens)', margin + 14, y0 + 10, { width: contentW - 28 });
  doc
    .moveTo(margin + 14, y0 + 24)
    .lineTo(margin + Math.min(200, contentW * 0.36), y0 + 24)
    .lineWidth(1.1)
    .strokeColor(IMMO_PDF.accentGold)
    .stroke();
  doc.fillColor(IMMO_PDF.muted).font('Helvetica').fontSize(8).text(kpis.filterLabel, margin + 14, y0 + 28, { width: contentW - 28 });
  doc.fillColor(IMMO_PDF.ink).font('Helvetica').fontSize(9);
  const y1 = y0 + 42;
  const ligneTxt = kpis.truncated
    ? `${kpis.lineCount} bien(s) dans ce PDF (sur ${kpis.matchTotal} au total — affinez recherche ou filtre genre)`
    : `${kpis.lineCount} bien(s) listé(s)`;
  doc.text(ligneTxt, margin + 14, y1, { width: contentW - 28 });
  doc.text(`Unités (locaux) comptées sur ces lignes : ${kpis.totalUnits}`, margin + 14, y1 + 14, { width: contentW - 28 });
  doc.y = y0 + h + 12;
}

export type BuildingsWorksheetRow = {
  name: string;
  place: string;
  structureLabel: string;
  unitCount: string;
};

/** Liste de biens avec case « contrôle » et notes (A4 paysage). */
export function drawBuildingsListWorksheetTable(
  doc: any,
  margin: number,
  contentW: number,
  pageTop: number,
  pageBottom: number,
  startY: number,
  rows: BuildingsWorksheetRow[],
): number {
  const GAP = 3;
  const CB_COL = 24;
  const HEADER_H = 26;
  const ROW_H = 28;
  const innerText = contentW - CB_COL - 5 * GAP;
  const w = [
    CB_COL,
    innerText * 0.26,
    innerText * 0.3,
    innerText * 0.18,
    innerText * 0.1,
    innerText * 0.16,
  ];

  const headers = [
    'Fait\n(papier)',
    'Nom du bien',
    'Lieu',
    'Type (structure)',
    'Unités',
    'Notes',
  ];

  const colX = (i: number) => {
    let x = margin;
    for (let j = 0; j < i; j++) x += w[j]! + GAP;
    return x;
  };

  const drawHeader = (y: number) => {
    doc.save();
    doc.rect(margin, y, contentW, HEADER_H).fill(IMMO_PDF.tableHeaderBg);
    doc.restore();
    doc.fillColor(IMMO_PDF.tableHeaderInk).font('Helvetica-Bold').fontSize(6.5);
    headers.forEach((h, i) => {
      doc.text(h, colX(i) + 2, y + 3, { width: w[i]! - 4, lineGap: 0.5 });
    });
    doc.strokeColor(IMMO_PDF.primary).lineWidth(0.5).moveTo(margin, y + HEADER_H).lineTo(margin + contentW, y + HEADER_H).stroke();
    return y + HEADER_H;
  };

  let y = startY;
  y = drawHeader(y);

  if (rows.length === 0) {
    doc.font('Helvetica').fontSize(9).fillColor(IMMO_PDF.muted).text('Aucun bien ne correspond aux filtres ou à la recherche.', margin, y + 6, {
      width: contentW,
    });
    doc.y = y + 22;
    return y + 22;
  }

  doc.font('Helvetica').fontSize(7.5).fillColor(IMMO_PDF.ink);

  let idx = 0;
  for (const r of rows) {
    if (y + ROW_H > pageBottom) {
      doc.addPage();
      y = pageTop;
      y = drawHeader(y);
      doc.font('Helvetica').fontSize(7.5).fillColor(IMMO_PDF.ink);
    }
    const bg = idx % 2 === 0 ? IMMO_PDF.zebra : IMMO_PDF.zebraAlt;
    doc.save();
    doc.rect(margin, y, contentW, ROW_H).fill(bg);
    doc.restore();

    drawCheckbox(doc, colX(0) + 5, y + (ROW_H - 11) / 2, 11);

    const cells = [r.name, r.place, r.structureLabel, r.unitCount, ''];
    cells.forEach((text, i) => {
      const ci = i + 1;
      doc.fillColor(IMMO_PDF.ink).text(text || '—', colX(ci) + 2, y + 7, { width: w[ci]! - 4, lineGap: 0 });
    });

    doc
      .strokeColor(IMMO_PDF.border)
      .lineWidth(0.2)
      .moveTo(margin, y + ROW_H)
      .lineTo(margin + contentW, y + ROW_H)
      .stroke();
    y += ROW_H;
    idx += 1;
  }

  doc.y = y + 8;
  return y;
}
