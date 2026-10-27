import type { BuildingStructureValue } from '@/lib/buildingStructure';

export type BuildingRow = {
  id: string;
  name: string;
  city: string;
  commune?: string | null;
  postalCode: string | null;
  structureKind?: BuildingStructureValue;
  floorCount?: number | null;
  apartmentCount?: number | null;
  apartmentsPerFloor?: number | null;
  terrainLotCount?: number | null;
  _count: { units: number };
};

const STRUCTURE_QUERY_VALUES = ['IMMEUBLE', 'TERRAIN_LOTS', 'MONO_LOT'] as const satisfies readonly BuildingStructureValue[];

export function normalizeGenreParam(raw: string | null): BuildingStructureValue | null {
  if (!raw?.trim()) return null;
  const k = raw.trim().toUpperCase();
  return (STRUCTURE_QUERY_VALUES as readonly string[]).includes(k) ? (k as BuildingStructureValue) : null;
}

export function structureKindShort(k?: BuildingStructureValue | string | null) {
  if (k === 'IMMEUBLE') return 'Multi locataires';
  if (k === 'TERRAIN_LOTS') return 'Terrain multi loc.';
  return 'Un seul lot';
}

export function buildingDetailsText(b: BuildingRow): string {
  if (b.structureKind === 'IMMEUBLE') {
    const parts: string[] = [];
    if (b.floorCount != null) parts.push(`${b.floorCount} ét.`);
    if (b.apartmentsPerFloor != null && b.apartmentsPerFloor > 0) parts.push(`${b.apartmentsPerFloor}/ét.`);
    if (b.apartmentCount != null) parts.push(`${b.apartmentCount} app.`);
    return parts.length ? parts.join(' · ') : '—';
  }
  if (b.structureKind === 'TERRAIN_LOTS' && b.terrainLotCount != null) {
    return `${b.terrainLotCount} lot${b.terrainLotCount !== 1 ? 's' : ''} décl.`;
  }
  return '—';
}

/** « Commune · Ville » (+ code postal si renseigné). */
export function buildingPlaceLine(b: BuildingRow): string {
  const place = [b.commune ?? '—', b.city].filter(Boolean).join(' · ');
  return b.postalCode ? `${place} · ${b.postalCode}` : place;
}

/** Surbrillance temporaire de la ligne rouverte via le retour de navigation. */
export function buildingRowFlash(active: boolean) {
  return active
    ? 'ring-2 ring-inset ring-brand-500/90 bg-brand-50/90 shadow-[0_0_0_1px_rgba(59,130,246,0.35)] dark:bg-brand-950/45 dark:ring-brand-400/80'
    : '';
}

export function filterBuildingRows(rows: BuildingRow[], search: string): BuildingRow[] {
  const q = search.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((b) => {
    const loc = [b.commune ?? '', b.city, b.postalCode ?? ''].filter(Boolean).join(' ');
    const hay = `${b.name} ${loc} ${structureKindShort(b.structureKind)} ${b.structureKind ?? ''}`.toLowerCase();
    return hay.includes(q);
  });
}
