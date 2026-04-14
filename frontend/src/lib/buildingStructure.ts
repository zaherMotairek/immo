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

export const IMMEUBLE_CARNET_COUNT_HINT =
  'Nombre de places pour numéroter les appartements (1…N). Le rez-de-chaussée (étage 0) ne concerne pas ce carnet : entrepôt et commerce au RDC utilisent leur propre numéro saisi à la création.';

export const IMMEUBLE_FLOORS_HINT =
  'Indiquez combien d’étages il y a au-dessus du sol (ex. 10). Si vous cochez « inclure le rez-de-chaussée », l’immeuble a en tout 11 niveaux : l’étage 0 = rez-de-chaussée, puis les étages 1 à 10. Au RDC, seuls entrepôt et commerce sont prévus à la création d’unité. Si vous décochez le RDC : pas de niveau 0, seulement les étages 1 à 10.';

export const IMMEUBLE_RDC_CHECKBOX_HINT =
  'Si coché : étage 0 = rez-de-chaussée dans les listes, en plus des étages 1…N saisis au-dessus. Le carnet « appartements » compte uniquement les appartements ; le RDC est pour entrepôt / commerce.';
