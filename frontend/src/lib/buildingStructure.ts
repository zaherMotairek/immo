export const BUILDING_STRUCTURE = {
  IMMEUBLE: 'IMMEUBLE',
  TERRAIN_LOTS: 'TERRAIN_LOTS',
  MONO_LOT: 'MONO_LOT',
} as const;

export type BuildingStructureValue = (typeof BUILDING_STRUCTURE)[keyof typeof BUILDING_STRUCTURE];

export function isMultiLotStructure(k?: string | null): boolean {
  return k === 'IMMEUBLE' || k === 'TERRAIN_LOTS';
}

export const BUILDING_STRUCTURE_OPTIONS: {
  value: BuildingStructureValue;
  label: string;
  cardTitle: string;
  cardHint: string;
  description: string;
}[] = [
  {
    value: 'IMMEUBLE',
    label: 'Immeuble ou bâtiment multi locataires',
    cardTitle: 'Immeuble',
    cardHint: 'Plusieurs étages, plusieurs locaux / baux',
    description:
      'Plusieurs unités distinctes et donc plusieurs baux possibles (ex. plusieurs appartements ou locaux dans le même bâtiment). Un seul bien dans la liste.',
  },
  {
    value: 'TERRAIN_LOTS',
    label: 'Terrain avec plusieurs locataires',
    cardTitle: 'Terrain avec plusieurs locataires',
    cardHint: 'Plusieurs unités (lots) louées séparément',
    description:
      'Un terrain découpé en plusieurs lots : une unité (parcelle, emplacement…) par lot, donc plusieurs locataires et plusieurs baux sur ce même bien.',
  },
  {
    value: 'MONO_LOT',
    label: 'Un seul lot louable',
    cardTitle: 'Un seul lot',
    cardHint: 'Villa, hangar entier, parcelle unique…',
    description:
      'Villa, entrepôt loué en bloc, bureau entier, ou parcelle unique sans découpe : une seule unité sur cette fiche, un seul bail pour ce bien.',
  },
];

/** Combien de logements d’habitation peuvent recevoir un numéro sur ce bien (1…N), tous étages confondus. */
export const IMMEUBLE_LOGEMENT_TOTAL_HINT =
  'Indiquez combien de logements d’habitation vous voulez pouvoir numéroter sur ce bien (1…N). Les entrepôts / commerces au RDC ont leur propre numéro de local (récapitulatif dans cette section).';

/** Même nombre de logements sur chaque étage ≥ 1 ; le total est calculé (étages × ce nombre + logements au RDC si inclus). */
export const IMMEUBLE_LOGEMENTS_PAR_ETAGE_HINT =
  'Sur chaque étage au-dessus du sol (1, 2, 3…), le même nombre d’appartements / logements. Ex. 5 étages et 2 par étage → 10 logements sur les étages. Si le rez-de-chaussée est inclus, ajoutez le nombre d’unités d’habitation au RDC : le total général est la somme.';

export const IMMEUBLE_FLOORS_HINT =
  'Indiquez combien d’étages il y a au-dessus du sol (ex. 10). Si vous cochez « inclure le rez-de-chaussée », l’immeuble a en tout 11 niveaux : l’étage 0 = rez-de-chaussée, puis les étages 1 à 10. Au RDC, seuls entrepôt et commerce sont prévus à la création d’unité. Si vous décochez le RDC : pas de niveau 0, seulement les étages 1 à 10.';

export const IMMEUBLE_RDC_CHECKBOX_HINT =
  'Si coché : étage 0 = rez-de-chaussée. Indiquez combien d’unités d’habitation au RDC (champ dédié ci-dessous). Si 0 : au RDC seuls entrepôt et commerce à la création d’unité.';

export const IMMEUBLE_REZ_APARTMENTS_HINT =
  'Nombre maximum d’unités d’habitation au rez-de-chaussée (étage 0). Ne peut pas dépasser le total des logements déclaré ci-dessus. Mettez 0 si au RDC il n’y a que des locaux entrepôt / commerce.';
