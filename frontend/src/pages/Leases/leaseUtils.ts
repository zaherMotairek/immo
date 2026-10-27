import type { TableSortDir } from '@/lib/tableSort';
import type { BuildingOpt, LeaseRow, LeaseSortKey } from './types';

export function compareLeaseRows(a: LeaseRow, b: LeaseRow, key: LeaseSortKey, dir: TableSortDir): number {
  const sign = dir === 'asc' ? 1 : -1;
  let c = 0;
  switch (key) {
    case 'building':
      c = a.unit.building.name.localeCompare(b.unit.building.name, 'fr', { sensitivity: 'base' });
      if (c === 0) {
        c = `${a.unit.building.commune ?? ''} ${a.unit.building.city}`.localeCompare(
          `${b.unit.building.commune ?? ''} ${b.unit.building.city}`,
          'fr',
          { sensitivity: 'base' },
        );
      }
      break;
    case 'unit':
      c = a.unit.label.localeCompare(b.unit.label, 'fr', { numeric: true });
      if (c === 0) c = a.unit.kind.localeCompare(b.unit.kind);
      break;
    case 'tenant':
      c = `${a.tenant.lastName} ${a.tenant.firstName}`.localeCompare(
        `${b.tenant.lastName} ${b.tenant.firstName}`,
        'fr',
        { sensitivity: 'base' },
      );
      break;
    case 'rent':
      c = Number(a.monthlyRent) - Number(b.monthlyRent);
      break;
    case 'start':
      c = a.startDate.localeCompare(b.startDate);
      if (c === 0 && a.endDate && b.endDate) c = a.endDate.localeCompare(b.endDate);
      break;
    case 'status': {
      const av = a.active ? 1 : 0;
      const bv = b.active ? 1 : 0;
      c = av - bv;
      if (c === 0) c = a.startDate.localeCompare(b.startDate);
      break;
    }
    default:
      c = 0;
  }
  return c * sign;
}

/** Libellé dans la liste « Bien » : nom + type + nombre d’unités (aperçu avant choix du lot). */
export function formatBuildingChoiceLabel(b: BuildingOpt) {
  const n = b.units?.length ?? 0;
  const unitsFr = n === 0 ? 'aucune unité' : `${n} unité${n !== 1 ? 's' : ''}`;
  const tag =
    b.structureKind === 'IMMEUBLE'
      ? 'Immeuble'
      : b.structureKind === 'TERRAIN_LOTS'
        ? 'Terrain avec plusieurs locataires'
        : b.structureKind === 'MONO_LOT'
          ? 'Mono-lot'
          : null;
  return tag ? `${b.name} — ${tag} · ${unitsFr}` : `${b.name} — ${unitsFr}`;
}

export function splitFullName(input: string): { firstName: string; lastName: string } {
  const s = input.trim().replace(/\s+/g, ' ');
  if (!s) return { firstName: '', lastName: '' };
  const parts = s.split(' ');
  if (parts.length === 1) return { firstName: parts[0], lastName: '-' };
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] };
}

/** Surbrillance temporaire d'une ligne (retour depuis une fiche). */
export function leaseRowFlashClass(active: boolean) {
  return active
    ? 'ring-2 ring-inset ring-brand-500/90 bg-brand-50/90 shadow-[0_0_0_1px_rgba(59,130,246,0.35)] dark:bg-brand-950/45 dark:ring-brand-400/80'
    : '';
}

/** Aligné sur le backend : fin de bail = même jour, un an après le début. */
export function computeLeaseEndPreviewFr(startDate: string): string | null {
  if (!startDate?.trim()) return null;
  const parts = startDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const [yy, mm, dd] = parts;
  const nextY = yy + 1;
  const lastDay = new Date(nextY, mm, 0).getDate();
  const dayClamped = Math.min(dd, lastDay);
  const d = new Date(nextY, mm - 1, dayClamped);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Aide indicative (étages / lots déclarés) affichée à côté du champ « Bien ». */
export function buildIndicatifHint(selectedBuilding: BuildingOpt | undefined): string {
  if (!selectedBuilding) return '';
  const nUnits = selectedBuilding.units.length;
  const unitsTxt = `${nUnits} unité${nUnits !== 1 ? 's' : ''} enregistrée${nUnits !== 1 ? 's' : ''}`;
  if (
    selectedBuilding.structureKind === 'IMMEUBLE' &&
    (selectedBuilding.floorCount != null || selectedBuilding.apartmentCount != null)
  ) {
    const floors =
      selectedBuilding.floorCount != null
        ? `${selectedBuilding.floorCount} étage${selectedBuilding.floorCount !== 1 ? 's' : ''}`
        : 'étages non renseignés';
    const apts =
      selectedBuilding.apartmentCount != null
        ? `${selectedBuilding.apartmentCount} appartement${selectedBuilding.apartmentCount !== 1 ? 's' : ''} déclarés`
        : 'appartements non renseignés';
    return `Indicatif immeuble : ${floors} · ${apts} · ${unitsTxt}.`;
  }
  if (selectedBuilding.structureKind === 'TERRAIN_LOTS') {
    const lots =
      selectedBuilding.terrainLotCount != null
        ? `${selectedBuilding.terrainLotCount} lot${selectedBuilding.terrainLotCount !== 1 ? 's' : ''} déclaré${selectedBuilding.terrainLotCount !== 1 ? 's' : ''}`
        : 'lots non renseignés';
    return `Indicatif terrain : ${lots} · ${unitsTxt}.`;
  }
  return '';
}
