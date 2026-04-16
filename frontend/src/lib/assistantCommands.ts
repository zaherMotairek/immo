/**
 * Prototype « assistant » : analyse de texte sans appel LLM (motifs français).
 * À retirer si l’expérimentation n’est pas conservée.
 */

import type { PaymentAssistantCommand } from './assistantPaymentActions';

export type ParsedAssistantCommand =
  | { kind: 'help' }
  | { kind: 'navigate'; path: string }
  | PaymentAssistantCommand
  | { kind: 'tenant'; firstName: string; lastName: string; phone?: string }
  | { kind: 'building'; name: string; units: number; mode: 'multi' }
  | { kind: 'building'; name: string; mode: 'single' }
  | { kind: 'none' };

/** Montant FCFA entier (espaces / séparateurs milliers tolérés). */
export function parseFcfaAmount(raw: string): number | null {
  const s = raw.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.round(n);
}

function tryParsePayment(t: string): ParsedAssistantCommand | null {
  const prepay = t.match(/^(?:payer|paye|payez)\s+(\d{1,2})\s+mois\s+pour\s+(.+?)\s*$/i);
  if (prepay) {
    const months = parseInt(prepay[1], 10);
    const tenantQuery = prepay[2].trim();
    if (tenantQuery.length >= 2 && months >= 1 && months <= 12) {
      return { kind: 'prepayMonths', tenantQuery, months };
    }
  }

  const partial = t.match(/^(?:payer|paye|payez)\s+partiel\s+([\d\s.]+)\s+pour\s+(.+)$/i);
  if (partial) {
    const amount = parseFcfaAmount(partial[1]);
    let rest = partial[2].trim();
    let thisMonthOnly = false;
    if (/(?:ce\s+mois|du\s+mois|de\s+ce\s+mois)\s*$/i.test(rest)) {
      thisMonthOnly = true;
      rest = rest.replace(/\s*(?:ce\s+mois|du\s+mois|de\s+ce\s+mois)\s*$/i, '').trim();
    }
    if (amount != null && rest.length >= 2) {
      return { kind: 'payPartial', tenantQuery: rest, amountFcfa: amount, thisMonthOnly };
    }
  }

  const full = t.match(/^(?:payer|paye|payez)\s+pour\s+(.+?)\s*$/i);
  if (full) {
    const tenantQuery = full[1].trim();
    if (tenantQuery.length >= 2) {
      return { kind: 'payFull', tenantQuery };
    }
  }

  return null;
}

/** Libellés pour les messages (navigation). */
export const NAV_ROUTE_LABELS: Record<string, string> = {
  '/': 'Tableau de bord',
  '/biens': 'Biens',
  '/locataires': 'Locataires',
  '/baux': 'Baux',
  '/locations': 'Locations',
  '/paiements': 'Paiements',
  '/cautions': 'Cautions',
  '/charges': 'Charges',
  '/exports': 'Export / import',
};

const NAV_VERB =
  '(?:montrez?|monrez|affichez?|affiche|voir|ouvrez?|ouvre|liste|aller\\s+sur|accédez?\\s+à|ouvrir|afficher)';

function navPatterns(noun: string): RegExp[] {
  const short = new RegExp(`^(?:les\\s+|la\\s+|le\\s+)?${noun}\\s*$`, 'i');
  const long = new RegExp(
    `^${NAV_VERB}\\s+(?:moi\\s+)?(?:les\\s+|la\\s+|le\\s+)?(?:page\\s+)?(?:des\\s+|du\\s+|de\\s+l[''])?${noun}\\s*$`,
    'i',
  );
  const voirMes = new RegExp(`^voir\\s+(?:mes\\s+)?${noun}\\s*$`, 'i');
  return [short, long, voirMes];
}

function tryParseNavigation(t: string): ParsedAssistantCommand | null {
  const routes: Array<{ path: string; patterns: RegExp[] }> = [
    {
      path: '/',
      patterns: [
        /^(?:le\s+)?tableau\s+de\s+bord\s*$/i,
        /^accueil\s*$/i,
        /^dashboard\s*$/i,
        /^home\s*$/i,
        new RegExp(
          `^${NAV_VERB}\\s+(?:moi\\s+)?(?:le\\s+)?(?:page\\s+)?(?:du\\s+)?tableau\\s+de\\s+bord\\s*$`,
          'i',
        ),
      ],
    },
    { path: '/biens', patterns: [...navPatterns('biens?')] },
    { path: '/locataires', patterns: [...navPatterns('locataires?')] },
    { path: '/baux', patterns: [...navPatterns('baux')] },
    {
      path: '/locations',
      patterns: [
        ...navPatterns('locations?'),
        /^(?:voir|liste)\s+(?:mes\s+)?locations?\s*$/i,
      ],
    },
    {
      path: '/paiements',
      patterns: [
        ...navPatterns('paiements?'),
        ...navPatterns('échéances?'),
        ...navPatterns('echeances?'),
        ...navPatterns('loyers?'),
      ],
    },
    { path: '/cautions', patterns: [...navPatterns('cautions?'), ...navPatterns('dépôts?'), ...navPatterns('depots?')] },
    { path: '/charges', patterns: [...navPatterns('charges?'), ...navPatterns('dépenses?'), ...navPatterns('depenses?')] },
    {
      path: '/exports',
      patterns: [...navPatterns('exports?'), /^export\s*$/i, /^import\s*$/i, /export\s*\/\s*import/i],
    },
  ];

  for (const { path, patterns } of routes) {
    if (patterns.some((p) => p.test(t))) {
      return { kind: 'navigate', path };
    }
  }
  return null;
}

function stripTrailingPhone(rest: string): { namePart: string; phone?: string } {
  let s = rest.trim();
  const endPhone = s.match(/\s(\+?\d[\d\s.-]{8,22})$/);
  if (endPhone) {
    const phone = endPhone[1].replace(/[\s.-]/g, '');
    s = s.slice(0, -endPhone[0].length).trim();
    return { namePart: s, phone };
  }
  const telInline = s.match(
    /(?:tel[.:]?\s*|téléphone\s*|mobile\s*)(\+?[\d\s.-]{8,22})/i,
  );
  if (telInline) {
    const phone = telInline[1].replace(/[\s.-]/g, '');
    s = s.replace(telInline[0], '').trim();
    return { namePart: s, phone };
  }
  return { namePart: s };
}

export function parseAssistantCommand(raw: string): ParsedAssistantCommand {
  const t = raw.trim();
  if (!t) return { kind: 'none' };

  if (/^(aide|help|exemples?|\?)$/i.test(t)) {
    return { kind: 'help' };
  }

  const pay = tryParsePayment(t);
  if (pay) return pay;

  const nav = tryParseNavigation(t);
  if (nav) return nav;

  const multiBien = t.match(
    /(?:cr[ée]e[rz]?|ajoute)\s+(?:un\s+)?bien\s+(.+?)\s+avec\s+(\d+)\s*unit(?:és|e)?s?/i,
  );
  if (multiBien) {
    const name = multiBien[1].trim();
    const units = parseInt(multiBien[2], 10);
    if (name.length >= 1 && Number.isFinite(units) && units >= 1 && units <= 500) {
      return { kind: 'building', name, units, mode: 'multi' };
    }
  }

  const singleBien = t.match(/(?:cr[ée]e[rz]?|ajoute)\s+(?:un\s+)?bien\s+(.+)/i);
  if (singleBien) {
    const inner = singleBien[1].trim();
    if (!/^locataire\b/i.test(inner) && inner.length >= 2) {
      const withoutUnits = inner.replace(/\s+avec\s+\d+\s*unit(?:és|e)?s?\s*$/i, '').trim();
      if (withoutUnits.length >= 2) {
        return { kind: 'building', name: withoutUnits, mode: 'single' };
      }
    }
  }

  const locPatterns = [
    /(?:cr[ée]e[rz]?|nouveau|ajoute)\s+(?:un\s+)?locataire\s+(.+)/i,
    /^locataire\s*:\s*(.+)/i,
  ];
  for (const re of locPatterns) {
    const m = t.match(re);
    if (!m) continue;
    const { namePart, phone } = stripTrailingPhone(m[1]);
    const parts = namePart.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return {
        kind: 'tenant',
        firstName: parts[0],
        lastName: parts.slice(1).join(' '),
        phone,
      };
    }
  }

  return { kind: 'none' };
}

export const ASSISTANT_HELP_FR = `Exemples (prototype, sans vrai modèle IA) :

Navigation (ouvrir une page) :
• Tableau de bord / accueil / montrez le tableau de bord
• Les biens / voir les locataires / ouvrez les baux / les locations
• Paiements / échéances / cautions / charges / export–import

Paiements (échéances loyer) :
• Payer pour Jean Dupont — solde la prochaine échéance impayée de ce locataire
• Payer partiel 100000 pour Marie Kouassi ce mois — versement partiel sur l’échéance du mois en cours
• Payer 4 mois pour Amadou Koné — marque les 4 prochains mois impayés (prépaiement)

Création :
• Crée un locataire Amadou Koné +225 07 00 00 00 00
• Nouveau locataire Fatou Diallo tel 0102030405
• Crée un bien Résidence Les Palmiers avec 7 unités
• Ajoute un bien Villa B

Ville / commune par défaut : Abidjan, Cocody.`;
