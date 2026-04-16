/**
 * Style commun des PDF ImmoPilot : en-têtes, tableaux, pied de page.
 */

export const IMMO_PDF = {
  ink: '#0f172a',
  primary: '#1e3a8a',
  accent: '#1d4ed8',
  muted: '#64748b',
  subtle: '#94a3b8',
  border: '#e2e8f0',
  headerBg: '#f1f5f9',
  zebra: '#f8fafc',
  white: '#ffffff',
} as const;

export const TAGLINE = 'ImmoPilot — Gestion immobilière';

/* eslint-disable @typescript-eslint/no-explicit-any */

export function drawTopBanner(
  doc: any,
  margin: number,
  contentW: number,
  options: { eyebrow: string; title: string; subtitle?: string },
) {
  let y = doc.y;
  doc.rect(margin, y, contentW, 5).fill(IMMO_PDF.primary);
  y += 18;
  doc.fillColor(IMMO_PDF.muted).font('Helvetica').fontSize(8).text(options.eyebrow.toUpperCase(), margin, y, {
    characterSpacing: 0.5,
    width: contentW,
  });
  y = doc.y + 4;
  doc.fillColor(IMMO_PDF.ink).font('Helvetica-Bold').fontSize(17).text(options.title, margin, y, { width: contentW });
  y = doc.y + 6;
  if (options.subtitle) {
    doc.fillColor(IMMO_PDF.muted).font('Helvetica').fontSize(10.5).text(options.subtitle, margin, y, { width: contentW, lineGap: 2 });
    y = doc.y + 8;
  } else {
    y += 10;
  }
  doc.moveTo(margin, y).lineTo(margin + contentW, y).lineWidth(0.9).strokeColor(IMMO_PDF.border).stroke();
  doc.y = y + 14;
}

export function drawSectionHeading(doc: any, margin: number, contentW: number, title: string, number?: string) {
  doc.moveDown(0.35);
  const label = number ? `${number}    ${title}` : title;
  const y0 = doc.y;
  doc.fillColor(IMMO_PDF.primary).font('Helvetica-Bold').fontSize(11.5).text(label, margin, y0, { width: contentW });
  const y1 = doc.y;
  doc
    .moveTo(margin, y1 + 3)
    .lineTo(margin + Math.min(110, contentW * 0.22), y1 + 3)
    .lineWidth(2.5)
    .strokeColor(IMMO_PDF.accent)
    .stroke();
  doc.y = y1 + 14;
}

/** Libellé discret + texte (champ de fiche). */
export function drawField(doc: any, margin: number, contentW: number, label: string, value: string) {
  doc.fillColor(IMMO_PDF.muted).font('Helvetica-Bold').fontSize(7.5).text(label.toUpperCase(), margin, doc.y, {
    characterSpacing: 0.4,
    width: contentW,
  });
  doc.moveDown(0.12);
  doc.fillColor(IMMO_PDF.ink).font('Helvetica').fontSize(10).text(value || '—', margin, doc.y, { width: contentW, lineGap: 1.5 });
  doc.moveDown(0.55);
}

export function drawFooter(doc: any, margin: number, contentW: number, pageHeight: number) {
  const ts = new Date().toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });
  doc
    .fontSize(7)
    .fillColor(IMMO_PDF.subtle)
    .font('Helvetica')
    .text(`${TAGLINE} · Document généré le ${ts}`, margin, pageHeight - 28, {
      width: contentW,
      align: 'center',
    });
}

const ROW_H = 16;
const HEADER_H = 20;

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
    doc.rect(margin, y, contentW, HEADER_H).fill(IMMO_PDF.headerBg);
    let x = margin;
    doc.fillColor(IMMO_PDF.ink).font('Helvetica-Bold').fontSize(8);
    for (let i = 0; i < n; i++) {
      doc.text(String(headers[i] ?? ''), x + 5, y + 6, { width: (w[i] as number) - 10, lineGap: 0 });
      x += w[i] as number;
    }
    doc
      .moveTo(margin, y + HEADER_H)
      .lineTo(margin + contentW, y + HEADER_H)
      .strokeColor(IMMO_PDF.border)
      .lineWidth(0.5)
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
      doc.font('Helvetica').fontSize(8.5);
    }
    const bg = rowIdx % 2 === 0 ? IMMO_PDF.white : IMMO_PDF.zebra;
    doc.rect(margin, y, contentW, ROW_H).fill(bg);
    let x = margin;
    const cells = row.length >= n ? row : [...row, ...Array(n - row.length).fill('—')];
    for (let i = 0; i < n; i++) {
      const txt = String(cells[i] ?? '—').replace(/\s+/g, ' ').trim();
      doc.fillColor(IMMO_PDF.ink).text(txt, x + 5, y + 5, {
        width: (w[i] as number) - 10,
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

/** Encadré d’instructions (feuille terrain / bureau). */
export function drawWorksheetInstructionBox(doc: any, margin: number, contentW: number) {
  const lines = [
    '• Terrain / agent : cochez la case « Perçu » lorsque le loyer a été encaissé ou réglé sur place.',
    '• Bureau / collaborateur : reportez ensuite les paiements dans ImmoPilot › Paiements (ce document est une aide — la référence reste l’application).',
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
  doc.roundedRect(margin, y0, contentW, blockH, 5).fill('#eff6ff').stroke(IMMO_PDF.accent);
  doc.restore();
  let yy = y0 + pad;
  for (const line of lines) {
    doc.font('Helvetica').fontSize(9).fillColor(IMMO_PDF.ink).text(line, margin + pad, yy, { width: contentW - 2 * pad, lineGap: 2 });
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
  const h = 58;
  doc.save();
  doc.roundedRect(margin, y0, contentW, h, 4).fill(IMMO_PDF.zebra).stroke(IMMO_PDF.border);
  doc.restore();
  doc
    .fillColor(IMMO_PDF.primary)
    .font('Helvetica-Bold')
    .fontSize(10)
    .text('Synthèse automatique du tableau de bord', margin + 14, y0 + 8, { width: contentW - 28 });
  doc.fillColor(IMMO_PDF.ink).font('Helvetica').fontSize(9);
  const colW = (contentW - 28) / 2;
  const y1 = y0 + 26;
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
  doc.rect(x, y, size, size).strokeColor(IMMO_PDF.ink).lineWidth(0.65).stroke();
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
    'Bien & local',
    'Période',
    'Échéance',
    'Reste dû',
    'Notes / suite à donner',
  ];

  const colX = (i: number) => {
    let x = margin;
    for (let j = 0; j < i; j++) x += w[j]! + GAP;
    return x;
  };

  const drawHeader = (y: number) => {
    doc.save();
    doc.rect(margin, y, contentW, HEADER_H).fill(IMMO_PDF.headerBg);
    doc.restore();
    doc.fillColor(IMMO_PDF.ink).font('Helvetica-Bold').fontSize(7);
    headers.forEach((h, i) => {
      doc.text(h, colX(i) + 3, y + 4, { width: w[i]! - 6, lineGap: 1 });
    });
    doc.strokeColor(IMMO_PDF.border).lineWidth(0.5).moveTo(margin, y + HEADER_H).lineTo(margin + contentW, y + HEADER_H).stroke();
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
    const bg = idx % 2 === 0 ? IMMO_PDF.white : IMMO_PDF.zebra;
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
  doc.moveDown(0.4);
  doc
    .fontSize(7)
    .fillColor(IMMO_PDF.muted)
    .font('Helvetica-Oblique')
    .text(
      'Les cases à cocher servent au suivi sur papier uniquement. Pour la comptabilité et le juridique, la saisie dans ImmoPilot fait foi.',
      margin,
      doc.y,
      { width: contentW, align: 'center' },
    );
}

/** Encadré d’instructions — liste Paiements (terrain / bureau). */
export function drawPaymentsWorksheetInstructionBox(doc: any, margin: number, contentW: number) {
  const lines = [
    '• Terrain / agent : cochez « Perçu » lorsque l’encaissement est constaté (espèces, mobile money, chèque reçu…).',
    '• Bureau : reportez ensuite dans ImmoPilot › Paiements (date, montant, mode) — ce PDF reflète les filtres de l’écran (mois, bien, impayés…).',
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
  doc.roundedRect(margin, y0, contentW, blockH, 5).fill('#eff6ff').stroke(IMMO_PDF.accent);
  doc.restore();
  let yy = y0 + pad;
  for (const line of lines) {
    doc.font('Helvetica').fontSize(9).fillColor(IMMO_PDF.ink).text(line, margin + pad, yy, { width: contentW - 2 * pad, lineGap: 2 });
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
  const h = kpis.truncated ? 72 : 58;
  doc.save();
  doc.roundedRect(margin, y0, contentW, h, 4).fill(IMMO_PDF.zebra).stroke(IMMO_PDF.border);
  doc.restore();
  doc
    .fillColor(IMMO_PDF.primary)
    .font('Helvetica-Bold')
    .fontSize(10)
    .text('Synthèse (selon les filtres de la liste)', margin + 14, y0 + 8, { width: contentW - 28 });
  doc.fillColor(IMMO_PDF.muted).font('Helvetica').fontSize(8).text(kpis.filterLabel, margin + 14, y0 + 22, { width: contentW - 28 });
  doc.fillColor(IMMO_PDF.ink).font('Helvetica').fontSize(9);
  const colW = (contentW - 28) / 2;
  const y1 = y0 + 36;
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
    'Bien & local',
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
    doc.rect(margin, y, contentW, HEADER_H).fill(IMMO_PDF.headerBg);
    doc.restore();
    doc.fillColor(IMMO_PDF.ink).font('Helvetica-Bold').fontSize(6.5);
    headers.forEach((h, i) => {
      doc.text(h, colX(i) + 2, y + 3, { width: w[i]! - 4, lineGap: 0.5 });
    });
    doc.strokeColor(IMMO_PDF.border).lineWidth(0.5).moveTo(margin, y + HEADER_H).lineTo(margin + contentW, y + HEADER_H).stroke();
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
    const bg = idx % 2 === 0 ? IMMO_PDF.white : IMMO_PDF.zebra;
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
