import { BuildingStructureKind, UnitKind } from '@prisma/client';
import { rentDueDateForBilledPeriod } from '../common/date.util';

export const SEED_TAG = 'Démo année complète (fictif)';
export const IMPORT_TAG = 'Exemple import (fictif)';

export type RichDemoUnitPlan = {
  label: string;
  kind: UnitKind;
  rent: number;
  floor?: number;
  /** Si absent : unité créée sans bail (vacant). */
  lease?: boolean;
};

export type RichDemoBuildingPlan = {
  name: string;
  city: string;
  commune: string;
  address?: string;
  structureKind: BuildingStructureKind;
  floorCount?: number;
  apartmentCount?: number;
  terrainLotCount?: number;
  units: RichDemoUnitPlan[];
};

export type RichDemoTenantPlan = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

export type RichDemoLeaseRow = {
  tenant: RichDemoTenantPlan;
  buildingName: string;
  city: string;
  commune: string;
  unitLabel: string;
  unitKindFr: string;
  rent: number;
  deposit: number;
  rentDueDay: number;
  start: Date;
};

const CITIES: Array<{ city: string; communes: string[] }> = [
  { city: 'Abidjan', communes: ['Cocody', 'Marcory', 'Yopougon', 'Plateau', 'Koumassi', 'Treichville', 'Adjamé'] },
  { city: 'Grand-Bassam', communes: ['Quartier France', 'Moossou'] },
  { city: 'Bouaké', communes: ['Air France', 'Commerce'] },
  { city: 'Yamoussoukro', communes: ['Habitat', 'Morofé'] },
  { city: 'San-Pédro', communes: ['Bardot', 'Séwéké'] },
];

const FIRST = [
  'Amadou', 'Fatou', 'Koffi', 'Aïcha', 'Moussa', 'Awa', 'Ibrahim', 'Mariam', 'Yao', 'Adjoua',
  'Seydou', 'Rokia', "N'Guessan", 'Affoué', 'Lassina', 'Salimata', 'Bakary', 'Fanta', 'Ousmane', 'Akissi',
  'Drissa', 'Maminata', 'Eric', 'Clarisse', 'Patrick', 'Nadège', 'Jules', 'Béatrice', 'Hervé', 'Christelle',
];

const LAST = [
  'Koné', 'Diabaté', 'Yao', 'Traoré', 'Coulibaly', 'Ouattara', 'Bamba', 'Touré', 'Silué', 'Gnahoré',
  'Aka', 'Konan', 'Assi', 'Bro', 'Zran', 'Dogbo', 'Blé', 'Koffi', 'Kouamé', 'N\'Dri',
  'Soro', 'Fofana', 'Diomandé', 'Cissé', 'Doumbia', 'Keita', 'Bah', 'Camara', 'Sylla', 'Mensah',
];

const IMMEUBLE_NAMES = [
  'Résidence Les Palmiers', 'Tour Éburnie', 'Immeuble Ranga', 'Résidence Baoulé', 'Immeuble Akwaba',
  'Résidence Lagoon View', 'Immeuble Angré 8e', 'Tour Plateau 2000', 'Résidence Ivoire', 'Immeuble Zone 4',
  'Résidence Le Wafou', 'Immeuble Gouro', 'Résidence Soprano', 'Immeuble Koumassi Centre',
];

const MONO_NAMES = [
  'Villa Lagune', 'Villa Azure', 'Maison Familiale Attié', 'Duplex Cocody', 'Villa Tropicale',
  'Maison de Ville Bassam', 'Local commercial Angre', 'Studio indépendant 2 Plateaux',
];

const TERRAIN_NAMES = [
  'Parcelle Cocody Angré', 'Terrain Marcory Zone 4', 'Lotissement Bassam Ouest', 'Parcelle Yop BAE',
  'Terrain Bouaké Air France', 'Lot Yamoussoukro Morofé',
];

function unitKindFr(kind: UnitKind): string {
  switch (kind) {
    case UnitKind.APARTMENT:
      return 'Appartement';
    case UnitKind.HOUSE:
      return 'Maison';
    case UnitKind.LAND:
      return 'Terrain';
    case UnitKind.OFFICE:
      return 'Bureau';
    case UnitKind.WAREHOUSE:
      return 'Entrepôt';
    case UnitKind.COMMERCIAL:
      return 'Local commercial';
    case UnitKind.GARAGE:
      return 'Garage (parking)';
    default:
      return 'Autre';
  }
}

function pickCity(i: number) {
  const c = CITIES[i % CITIES.length]!;
  return { city: c.city, commune: c.communes[i % c.communes.length]! };
}

/** ~28 biens (immeubles, villas, terrains) et 28 baux actifs. */
export function buildRichDemoBuildingPlans(namePrefix: string): RichDemoBuildingPlan[] {
  const plans: RichDemoBuildingPlan[] = [];
  let i = 0;

  for (const base of IMMEUBLE_NAMES) {
    const { city, commune } = pickCity(i);
    const aptCount = 6 + (i % 5);
    const withVacant = i % 3 === 0;
    const units: RichDemoUnitPlan[] = [
      {
        label: `Appartement ${String((i % 8) + 1).padStart(2, '0')}`,
        kind: UnitKind.APARTMENT,
        rent: 220_000 + (i % 7) * 45_000,
        floor: 1 + (i % 4),
        lease: true,
      },
    ];
    if (withVacant) {
      units.push({
        label: `Appartement ${String((i % 8) + 2).padStart(2, '0')} (vacant)`,
        kind: UnitKind.APARTMENT,
        rent: 195_000 + (i % 5) * 40_000,
        floor: 2 + (i % 3),
        lease: false,
      });
    }
    plans.push({
      name: `${namePrefix} — ${base}`,
      city,
      commune,
      address: i % 2 === 0 ? `Rue ${10 + i}, quartier ${commune}` : undefined,
      structureKind: BuildingStructureKind.IMMEUBLE,
      floorCount: 3 + (i % 6),
      apartmentCount: aptCount,
      units,
    });
    i += 1;
  }

  const monoKinds: UnitKind[] = [
    UnitKind.HOUSE,
    UnitKind.HOUSE,
    UnitKind.APARTMENT,
    UnitKind.COMMERCIAL,
    UnitKind.HOUSE,
    UnitKind.OFFICE,
    UnitKind.COMMERCIAL,
    UnitKind.HOUSE,
  ];
  let m = 0;
  for (const base of MONO_NAMES) {
    const { city, commune } = pickCity(14 + m);
    const kind = monoKinds[m] ?? UnitKind.HOUSE;
    plans.push({
      name: `${namePrefix} — ${base}`,
      city,
      commune,
      structureKind: BuildingStructureKind.MONO_LOT,
      units: [
        {
          label: kind === UnitKind.HOUSE ? 'Villa entière' : kind === UnitKind.COMMERCIAL ? 'Boutique RDC' : 'Lot unique',
          kind,
          rent: 350_000 + m * 95_000,
          lease: true,
        },
      ],
    });
    m += 1;
  }

  let t = 0;
  for (const base of TERRAIN_NAMES) {
    const { city, commune } = pickCity(22 + t);
    const lotCount = 4 + (t % 4);
    const units: RichDemoUnitPlan[] = [
      { label: `Lot ${t + 1}`, kind: UnitKind.LAND, rent: 75_000 + t * 12_000, lease: true },
      { label: `Lot ${t + 2} (libre)`, kind: UnitKind.LAND, rent: 70_000 + t * 10_000, lease: false },
    ];
    if (t % 2 === 0) {
      units.push({ label: `Lot ${t + 3} (libre)`, kind: UnitKind.LAND, rent: 68_000, lease: false });
    }
    plans.push({
      name: `${namePrefix} — ${base}`,
      city,
      commune,
      structureKind: BuildingStructureKind.TERRAIN_LOTS,
      terrainLotCount: lotCount,
      units,
    });
    t += 1;
  }

  return plans;
}

export function buildRichDemoTenants(): RichDemoTenantPlan[] {
  return FIRST.map((firstName, i) => ({
    firstName,
    lastName: LAST[i]!,
    email: `demo-${String(i + 1).padStart(2, '0')}@exemple.immopilot.ci`,
    phone: `+22507${String(8_000_000 + i * 13_37).slice(-8)}`,
  }));
}

export function flattenDemoLeases(
  buildings: RichDemoBuildingPlan[],
  tenants: RichDemoTenantPlan[],
  year: number,
): RichDemoLeaseRow[] {
  const rows: RichDemoLeaseRow[] = [];
  let ti = 0;
  for (const b of buildings) {
    for (const u of b.units) {
      if (u.lease === false) continue;
      const tenant = tenants[ti % tenants.length]!;
      ti += 1;
      const startMonth = ti % 12;
      const startYear = startMonth > 6 ? year - 1 : year - 2;
      rows.push({
        tenant,
        buildingName: b.name,
        city: b.city,
        commune: b.commune,
        unitLabel: u.label,
        unitKindFr: unitKindFr(u.kind),
        rent: u.rent,
        deposit: u.rent * (u.kind === UnitKind.LAND ? 2 : 1),
        rentDueDay: 1 + (ti % 20),
        start: new Date(Date.UTC(startYear, startMonth, 1)),
      });
    }
  }
  return rows;
}

export type PaymentRow = (string | number | Date | null)[][];

export function buildDemoPaymentRows(leases: RichDemoLeaseRow[], year: number, throughMonth: number): PaymentRow {
  const out: PaymentRow = [];
  leases.forEach((l, idx) => {
    for (let mo = 1; mo <= throughMonth; mo += 1) {
      let status: string;
      if (mo < throughMonth - 1) status = 'Payé';
      else if (mo === throughMonth - 1) status = idx % 3 === 0 ? 'En retard' : 'Payé';
      else status = idx % 4 === 0 ? 'En retard' : 'Impayé';

      const due = rentDueDateForBilledPeriod(year, mo, l.rentDueDay);
      const period = `${year}-${String(mo).padStart(2, '0')}`;
      const paid = status === 'Payé';
      out.push([
        period,
        due,
        status,
        l.rent,
        paid ? due : null,
        paid ? l.rent : status === 'En retard' ? Math.round(l.rent * 0.45) : null,
        `${l.tenant.firstName} ${l.tenant.lastName}`,
        l.tenant.email,
        l.tenant.phone,
        l.unitLabel,
        l.buildingName,
        l.city,
        idx % 3 === 0 ? 'Virement' : idx % 3 === 1 ? 'Espèces' : 'Orange Money',
        paid ? `REF-${period}-${idx + 1}` : '',
      ]);
    }
  });
  return out;
}

export function biensSheetRows(buildings: RichDemoBuildingPlan[]): (string | number)[][] {
  return buildings.map((b) => {
    const leased = b.units.filter((u) => u.lease !== false).length;
    const vacant = b.units.length - leased;
    const totalUnits = b.structureKind === BuildingStructureKind.IMMEUBLE
      ? b.apartmentCount ?? b.units.length
      : b.structureKind === BuildingStructureKind.TERRAIN_LOTS
        ? b.terrainLotCount ?? b.units.length
        : b.units.length;
    return [
      b.name,
      b.city,
      b.commune,
      b.address ?? '',
      totalUnits,
      leased,
      Math.max(0, totalUnits - leased) + vacant,
    ];
  });
}

export function bauxSheetRows(leases: RichDemoLeaseRow[]): (string | number | Date | null)[][] {
  return leases.map((l) => [
    'Oui',
    l.tenant.lastName,
    l.tenant.firstName,
    l.tenant.email,
    l.tenant.phone,
    l.buildingName,
    l.city,
    l.commune,
    l.unitLabel,
    l.unitKindFr,
    l.rent,
    l.deposit > 0 ? l.deposit : '',
    l.rentDueDay,
    l.start,
    null,
  ]);
}