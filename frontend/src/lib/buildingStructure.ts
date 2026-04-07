/** Aligné sur l’enum Prisma `BuildingStructureKind`. */
export const BUILDING_STRUCTURE = {
  IMMEUBLE: 'IMMEUBLE',
  MONO_LOT: 'MONO_LOT',
} as const;

export type BuildingStructureValue = (typeof BUILDING_STRUCTURE)[keyof typeof BUILDING_STRUCTURE];

export const BUILDING_STRUCTURE_OPTIONS: {
  value: BuildingStructureValue;
  label: string;
  description: string;
}[] = [
  {
    value: 'IMMEUBLE',
    label: 'Immeuble ou bâtiment multi-lots',
    description:
      'Plusieurs unités distinctes et donc plusieurs baux possibles (ex. 13 étages → 13 unités). Un seul bien « immeuble » dans la liste.',
  },
  {
    value: 'MONO_LOT',
    label: 'Un seul lot louable',
    description:
      'Villa, entrepôt loué en bloc, bureau entier, terrain unique… Une seule unité sur cette fiche, un seul bail pour ce bien.',
  },
];
