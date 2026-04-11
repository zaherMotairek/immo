/** Aligné sur l’enum Prisma `BuildingStructureKind`. */
export const BUILDING_STRUCTURE = {
  IMMEUBLE: 'IMMEUBLE',
  TERRAIN_LOTS: 'TERRAIN_LOTS',
  MONO_LOT: 'MONO_LOT',
} as const;

export type BuildingStructureValue = (typeof BUILDING_STRUCTURE)[keyof typeof BUILDING_STRUCTURE];

/** Immeuble ou terrain parcelé : plusieurs unités et plusieurs baux possibles sur le même bien. */
export function isMultiLotStructure(k?: string | null): boolean {
  return k === 'IMMEUBLE' || k === 'TERRAIN_LOTS';
}

export const BUILDING_STRUCTURE_OPTIONS: {
  value: BuildingStructureValue;
  label: string;
  /** Titre court pour les cartes de choix à la création du bien. */
  cardTitle: string;
  /** Sous-titre court sous la carte. */
  cardHint: string;
  description: string;
}[] = [
  {
    value: 'IMMEUBLE',
    label: 'Immeuble ou bâtiment multi-lots',
    cardTitle: 'Immeuble',
    cardHint: 'Plusieurs étages, plusieurs locaux / baux',
    description:
      'Plusieurs unités distinctes et donc plusieurs baux possibles (ex. plusieurs appartements ou locaux dans le même bâtiment). Un seul bien dans la liste.',
  },
  {
    value: 'TERRAIN_LOTS',
    label: 'Terrain multi-lots',
    cardTitle: 'Terrain parcelé',
    cardHint: 'Découpé en plusieurs lots / emplacements',
    description:
      'Un même terrain cadastral découpé en plusieurs lots loués séparément : plusieurs unités (parcelles, emplacements…), plusieurs locataires et plusieurs baux.',
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
