import { BUILDING_STRUCTURE_OPTIONS, type BuildingStructureValue } from '@/lib/buildingStructure';
import { immeubleGridLayout, immeubleOnePerFloorMatch } from './buildingUtils';
import type { Building } from './types';

/** Info-bulle du champ « Type » de l'onglet Organisation. */
export function structureTypeHintText(
  b: Building,
  immeubleLocked: boolean,
  structureKindDraft: BuildingStructureValue,
): string {
  if (immeubleLocked) {
    return b.structureKind === 'TERRAIN_LOTS'
      ? 'Ce terrain est en multi locataires : le type ne peut plus être repassé en « un seul lot ».'
      : 'Ce bien est enregistré comme immeuble : le type ne peut plus être repassé en « un seul lot ».';
  }
  return BUILDING_STRUCTURE_OPTIONS.find((o) => o.value === structureKindDraft)?.description ?? '';
}

/** Rappel de structure d'un immeuble (étages, grille, totaux) affiché en info-bulle du formulaire d'unité. */
export function immeubleStructureHintText(b: Building): string {
  const onePerFloor = immeubleOnePerFloorMatch(b)
    ? ' Même nombre d’étages habitables et de logements prévus : 1 logement par étage (répartition par défaut).'
    : '';
  const niveaux =
    b.hasRezDeChaussee === false
      ? `étages 1…${b.floorCount} (sans rez-de-chaussée)`
      : `RDC + étages 1…${b.floorCount}`;
  if (immeubleGridLayout(b) && b.apartmentCount != null && b.apartmentCount > 0) {
    const pf = b.apartmentsPerFloor ?? 0;
    const rez =
      (b.rezApartmentCount ?? 0) > 0
        ? ` Au RDC : jusqu’à ${b.rezApartmentCount} logement(s) d’habitation (numéros 1…${b.rezApartmentCount} sur l’étage 0).`
        : '';
    return `Structure : ${b.floorCount} étage(s) au-dessus du sol, ${niveaux}. Grille : ${pf} logement(s) par étage (étages 1…${b.floorCount}), numéros 1…${pf} sur chaque niveau.${rez} Total logements d’habitation prévus : ${b.apartmentCount}. Les étages complets disparaissent du menu. Entrepôts / commerces : uniquement avec RDC dans la structure.`;
  }
  if (b.apartmentCount != null && b.apartmentCount > 0) {
    const rez =
      (b.rezApartmentCount ?? 0) > 0 ? ` Plafond RDC (habitation) : ${b.rezApartmentCount} unité(s).` : '';
    return `Structure : ${b.floorCount} étage(s) au-dessus du sol, ${niveaux}. Logements prévus sur ce bien : ${b.apartmentCount} numéro(s) (1…${b.apartmentCount}).${rez} Entrepôts / commerces au RDC : numérotation séparée. Numéros déjà pris masqués.${onePerFloor}`;
  }
  return `Structure : ${b.floorCount} étage(s) au-dessus du sol — choisissez l’étage, puis le numéro de logement. Pour une liste 1…N, indiquez combien de logements sur ce bien dans « Organisation du bien ».`;
}

/** Info-bulle « nature du local » selon la structure du bien. */
export function unitKindHintText(b: Building): string {
  if (b.structureKind === 'IMMEUBLE') {
    if (immeubleGridLayout(b)) {
      return `Grille : ${b.apartmentsPerFloor ?? 0} logement(s) par étage (étages 1…${b.floorCount ?? 'N'}), numéros 1…${b.apartmentsPerFloor ?? 0} sur chaque niveau. Total habitation : ${b.apartmentCount ?? '—'}.`;
    }
    return (b.rezApartmentCount ?? 0) > 0
      ? `Logements numérotés 1…${b.apartmentCount ?? 'N'} sur ce bien. Au RDC, jusqu’à ${b.rezApartmentCount} unité(s) d’habitation prévue(s) ; entrepôt et commerce : numéros de locaux séparés.`
      : 'Logements d’habitation : numérotation par étage. À partir de l’étage 1 ; pour le RDC, indiquez d’abord le nombre d’unités d’habitation au rez-de-chaussée dans Organisation. Sans ce plafond au RDC : seuls entrepôt et commerce au rez — numéros distincts.';
  }
  return 'Indiquez si ce lot est un appartement, une maison, un bureau, un entrepôt, un commerce, un terrain, etc. Vous pourrez ajouter d’autres unités avec un autre type sur le même bien.';
}
