import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BuildingStructureKind, Prisma, UnitKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { selectApartmentsPerFloorColumn } from '../buildings/apartments-per-floor-column';
import { sortByNaturalLabel } from '../common/sort.util';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

@Injectable()
export class UnitsService {
  constructor(private readonly prisma: PrismaService) {}

  async listByBuilding(buildingId: string, organizationId: string) {
    await this.ensureBuilding(buildingId, organizationId);
    const rows = await this.prisma.unit.findMany({
      where: { buildingId },
      orderBy: { label: 'asc' },
      include: {
        leases: {
          where: { active: true },
          take: 1,
          include: { tenant: true },
        },
      },
    });
    return sortByNaturalLabel(rows);
  }

  async create(buildingId: string, dto: CreateUnitDto, organizationId: string) {
    const buildingRow = await this.prisma.building.findFirst({
      where: { id: buildingId, organizationId },
      include: { _count: { select: { units: true } } },
    });
    if (!buildingRow) throw new NotFoundException('Bien introuvable');
    const apf = await selectApartmentsPerFloorColumn(this.prisma, buildingId);
    const building =
      apf !== undefined ? { ...buildingRow, apartmentsPerFloor: apf } : buildingRow;
    if (
      building.structureKind === BuildingStructureKind.MONO_LOT &&
      building._count.units >= 1
    ) {
      throw new BadRequestException(
        'Ce bien est défini comme « un seul lot louable » (villa, entrepôt entier, parcelle unique, etc.). Il ne peut avoir qu’une seule unité. Sur la fiche du bien, passez en « Immeuble / bâtiment multi locataires » ou « Terrain avec plusieurs locataires » pour en ajouter plusieurs.',
      );
    }

    const kind = dto.kind ?? UnitKind.APARTMENT;

    if (building.structureKind === BuildingStructureKind.IMMEUBLE) {
      if (kind === UnitKind.APARTMENT && dto.locauxSlot != null) {
        throw new BadRequestException(
          'Les logements d’habitation utilisent uniquement le numéro de logement, pas le numéro entrepôt / commerce.',
        );
      }
      if (
        (kind === UnitKind.WAREHOUSE || kind === UnitKind.COMMERCIAL) &&
        dto.apartmentSlot != null
      ) {
        throw new BadRequestException(
          'Les entrepôts et commerces utilisent leur propre numéro de local, pas le numéro de logement.',
        );
      }
    }

    if (
      building.structureKind === BuildingStructureKind.TERRAIN_LOTS &&
      building.terrainLotCount != null &&
      building.terrainLotCount > 0
    ) {
      if (building._count.units >= building.terrainLotCount) {
        throw new BadRequestException(
          `Ce terrain est limité à ${building.terrainLotCount} lot${building.terrainLotCount !== 1 ? 's' : ''} (nombre déclaré sur la fiche du bien). Supprimez une unité ou augmentez le nombre de lots dans « Organisation ».`,
        );
      }
      if (dto.apartmentSlot == null) {
        throw new BadRequestException(
          'Indiquez le numéro d’unité / de lot (1 à N) pour chaque lot sur ce terrain multi locataires.',
        );
      }
    }

    if (dto.apartmentSlot != null) {
      const slot = dto.apartmentSlot;
      const immeubleGrid =
        building.structureKind === BuildingStructureKind.IMMEUBLE &&
        kind === UnitKind.APARTMENT &&
        building.apartmentsPerFloor != null &&
        building.apartmentsPerFloor > 0;

      if (immeubleGrid) {
        if (dto.floor == null) {
          throw new BadRequestException(
            'Indiquez l’étage pour attribuer ce numéro de logement (numérotation par étage sur ce bien).',
          );
        }
        const f = dto.floor;
        const maxOnFloor = f === 0 ? building.rezApartmentCount ?? 0 : building.apartmentsPerFloor!;
        if (maxOnFloor <= 0 || slot < 1 || slot > maxOnFloor) {
          throw new BadRequestException(
            f === 0
              ? `Au rez-de-chaussée, le numéro de logement doit être entre 1 et ${maxOnFloor} (unités d’habitation déclarées au RDC).`
              : `À l’étage ${f}, le numéro de logement doit être entre 1 et ${maxOnFloor} sur ce bien.`,
          );
        }
        const dup = await this.prisma.unit.findFirst({
          where: { buildingId, floor: f, apartmentSlot: slot },
          select: { id: true },
        });
        if (dup) {
          throw new BadRequestException(
            `Le numéro de logement ${slot} est déjà utilisé à l’étage ${f === 0 ? 'rez-de-chaussée' : f} sur ce bien.`,
          );
        }
      } else {
        const dup = await this.prisma.unit.findFirst({
          where: { buildingId, apartmentSlot: slot },
          select: { id: true },
        });
        if (dup) {
          const slotLabel =
            building.structureKind === BuildingStructureKind.TERRAIN_LOTS ? 'de lot' : 'd’appartement';
          throw new BadRequestException(
            `Le numéro ${slotLabel} ${slot} est déjà utilisé sur ce bien.`,
          );
        }
        if (
          building.structureKind === BuildingStructureKind.IMMEUBLE &&
          building.apartmentCount != null &&
          building.apartmentCount > 0 &&
          (slot < 1 || slot > building.apartmentCount)
        ) {
          throw new BadRequestException(
            `Le numéro de logement doit être entre 1 et ${building.apartmentCount} (déclaré sur ce bien).`,
          );
        }
        if (
          building.structureKind === BuildingStructureKind.TERRAIN_LOTS &&
          building.terrainLotCount != null &&
          building.terrainLotCount > 0 &&
          (slot < 1 || slot > building.terrainLotCount)
        ) {
          throw new BadRequestException(
            `Le numéro de lot doit être entre 1 et ${building.terrainLotCount} (déclaré sur le terrain).`,
          );
        }
      }
    }

    if (dto.locauxSlot != null) {
      if (building.structureKind !== BuildingStructureKind.IMMEUBLE) {
        throw new BadRequestException(
          'Les numéros entrepôt / commerce ne s’appliquent qu’aux immeubles.',
        );
      }
      if (kind !== UnitKind.WAREHOUSE && kind !== UnitKind.COMMERCIAL) {
        throw new BadRequestException(
          'Le numéro de local pro est réservé aux unités entrepôt ou commerce.',
        );
      }
      const dup = await this.prisma.unit.findFirst({
        where: { buildingId, locauxSlot: dto.locauxSlot },
        select: { id: true },
      });
      if (dup) {
        throw new BadRequestException(
          `Le numéro entrepôt / commerce ${dto.locauxSlot} est déjà utilisé sur ce bien.`,
        );
      }
      if (
        building.locauxSlotCount != null &&
        building.locauxSlotCount > 0 &&
        (dto.locauxSlot < 1 || dto.locauxSlot > building.locauxSlotCount)
      ) {
        throw new BadRequestException(
          `Le numéro doit être entre 1 et ${building.locauxSlotCount} (plafond déclaré sur ce bien).`,
        );
      }
    }

    if (dto.floor != null && building.floorCount != null && building.floorCount > 0) {
      const minFloor = building.hasRezDeChaussee === false ? 1 : 0;
      if (dto.floor < minFloor || dto.floor > building.floorCount) {
        throw new BadRequestException(
          minFloor === 1
            ? `L’étage doit être entre 1 et ${building.floorCount} pour cet immeuble (pas de rez-de-chaussée dans la structure).`
            : `L’étage doit être entre 0 (rez-de-chaussée) et ${building.floorCount} pour cet immeuble.`,
        );
      }
    }

    await this.assertRdcApartmentCapacity(building, {
      kind,
      floor: dto.floor ?? null,
    });

    const data: Prisma.UnitCreateInput = {
      label: dto.label,
      floor: dto.floor,
      rooms: dto.rooms,
      notes: dto.notes,
      building: { connect: { id: buildingId } },
    };
    if (dto.surfaceM2 !== undefined) data.surfaceM2 = dto.surfaceM2;
    if (dto.defaultRent !== undefined) data.defaultRent = dto.defaultRent;
    if (dto.kind !== undefined) data.kind = dto.kind;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.apartmentSlot != null) data.apartmentSlot = dto.apartmentSlot;
    if (dto.locauxSlot != null) data.locauxSlot = dto.locauxSlot;
    return this.prisma.unit.create({ data });
  }

  async update(unitId: string, organizationId: string, dto: UpdateUnitDto) {
    const unitRow = await this.prisma.unit.findFirst({
      where: { id: unitId, building: { organizationId } },
      include: { building: true },
    });
    if (!unitRow) throw new NotFoundException('Unité introuvable');
    const apfB = await selectApartmentsPerFloorColumn(this.prisma, unitRow.buildingId);
    const unit =
      apfB !== undefined
        ? { ...unitRow, building: { ...unitRow.building, apartmentsPerFloor: apfB } }
        : unitRow;

    const nextKind = dto.kind !== undefined ? dto.kind : unit.kind;

    if (unit.building.structureKind === BuildingStructureKind.IMMEUBLE) {
      if (nextKind === UnitKind.APARTMENT && dto.locauxSlot !== undefined && dto.locauxSlot != null) {
        throw new BadRequestException(
          'Les logements d’habitation utilisent uniquement le numéro de logement.',
        );
      }
      if (
        (nextKind === UnitKind.WAREHOUSE || nextKind === UnitKind.COMMERCIAL) &&
        dto.apartmentSlot !== undefined &&
        dto.apartmentSlot != null
      ) {
        throw new BadRequestException(
          'Les entrepôts et commerces utilisent le numéro de local pro, pas le numéro de logement.',
        );
      }
    }

    if (dto.apartmentSlot !== undefined && dto.apartmentSlot != null) {
      const slot = dto.apartmentSlot;
      const b = unit.building;
      const nextKindForSlot = dto.kind !== undefined ? dto.kind : unit.kind;
      const floorForSlot =
        dto.floor !== undefined ? dto.floor : unit.floor;
      const immeubleGrid =
        b.structureKind === BuildingStructureKind.IMMEUBLE &&
        nextKindForSlot === UnitKind.APARTMENT &&
        b.apartmentsPerFloor != null &&
        b.apartmentsPerFloor > 0;

      if (immeubleGrid) {
        if (floorForSlot == null) {
          throw new BadRequestException(
            'Indiquez l’étage pour ce numéro de logement (numérotation par étage sur ce bien).',
          );
        }
        const f = floorForSlot;
        const maxOnFloor = f === 0 ? b.rezApartmentCount ?? 0 : b.apartmentsPerFloor!;
        if (maxOnFloor <= 0 || slot < 1 || slot > maxOnFloor) {
          throw new BadRequestException(
            f === 0
              ? `Au rez-de-chaussée, le numéro de logement doit être entre 1 et ${maxOnFloor} (unités d’habitation déclarées au RDC).`
              : `À l’étage ${f}, le numéro de logement doit être entre 1 et ${maxOnFloor} sur ce bien.`,
          );
        }
        const dup = await this.prisma.unit.findFirst({
          where: {
            buildingId: unit.buildingId,
            floor: f,
            apartmentSlot: slot,
            NOT: { id: unitId },
          },
          select: { id: true },
        });
        if (dup) {
          throw new BadRequestException(
            `Le numéro de logement ${slot} est déjà utilisé à l’étage ${f === 0 ? 'rez-de-chaussée' : f} sur ce bien.`,
          );
        }
      } else {
        const dup = await this.prisma.unit.findFirst({
          where: {
            buildingId: unit.buildingId,
            apartmentSlot: slot,
            NOT: { id: unitId },
          },
          select: { id: true },
        });
        if (dup) {
          const slotLabel =
            b.structureKind === BuildingStructureKind.TERRAIN_LOTS ? 'de lot' : 'd’appartement';
          throw new BadRequestException(
            `Le numéro ${slotLabel} ${slot} est déjà utilisé sur ce bien.`,
          );
        }
        if (
          b.structureKind === BuildingStructureKind.IMMEUBLE &&
          b.apartmentCount != null &&
          b.apartmentCount > 0 &&
          (slot < 1 || slot > b.apartmentCount)
        ) {
          throw new BadRequestException(
            `Le numéro de logement doit être entre 1 et ${b.apartmentCount} (déclaré sur ce bien).`,
          );
        }
        if (
          b.structureKind === BuildingStructureKind.TERRAIN_LOTS &&
          b.terrainLotCount != null &&
          b.terrainLotCount > 0 &&
          (slot < 1 || slot > b.terrainLotCount)
        ) {
          throw new BadRequestException(
            `Le numéro de lot doit être entre 1 et ${b.terrainLotCount} (déclaré sur le terrain).`,
          );
        }
      }
    }

    if (dto.locauxSlot !== undefined && dto.locauxSlot != null) {
      const b = unit.building;
      if (b.structureKind !== BuildingStructureKind.IMMEUBLE) {
        throw new BadRequestException('Les numéros entrepôt / commerce ne s’appliquent qu’aux immeubles.');
      }
      if (nextKind !== UnitKind.WAREHOUSE && nextKind !== UnitKind.COMMERCIAL) {
        throw new BadRequestException(
          'Le numéro de local pro est réservé aux unités entrepôt ou commerce.',
        );
      }
      const dup = await this.prisma.unit.findFirst({
        where: {
          buildingId: unit.buildingId,
          locauxSlot: dto.locauxSlot,
          NOT: { id: unitId },
        },
        select: { id: true },
      });
      if (dup) {
        throw new BadRequestException(
          `Le numéro entrepôt / commerce ${dto.locauxSlot} est déjà utilisé sur ce bien.`,
        );
      }
      if (
        b.locauxSlotCount != null &&
        b.locauxSlotCount > 0 &&
        (dto.locauxSlot < 1 || dto.locauxSlot > b.locauxSlotCount)
      ) {
        throw new BadRequestException(
          `Le numéro doit être entre 1 et ${b.locauxSlotCount} (plafond déclaré sur ce bien).`,
        );
      }
    }

    const floorVal = dto.floor !== undefined ? dto.floor : unit.floor;
    if (floorVal != null && unit.building.floorCount != null && unit.building.floorCount > 0) {
      const minFloor = unit.building.hasRezDeChaussee === false ? 1 : 0;
      if (floorVal < minFloor || floorVal > unit.building.floorCount) {
        throw new BadRequestException(
          minFloor === 1
            ? `L’étage doit être entre 1 et ${unit.building.floorCount} pour cet immeuble (pas de rez-de-chaussée dans la structure).`
            : `L’étage doit être entre 0 (rez-de-chaussée) et ${unit.building.floorCount} pour cet immeuble.`,
        );
      }
    }

    const nextFloorForRz = dto.floor !== undefined ? dto.floor : unit.floor;
    const nextKindForRz = dto.kind !== undefined ? dto.kind : unit.kind;
    await this.assertRdcApartmentCapacity(unit.building, {
      kind: nextKindForRz,
      floor: nextFloorForRz,
      excludeUnitId: unit.id,
    });

    const data: Prisma.UnitUpdateInput = {};
    if (dto.label !== undefined) data.label = dto.label;
    if (dto.kind !== undefined) data.kind = dto.kind;
    if (dto.floor !== undefined) data.floor = dto.floor;
    if (dto.rooms !== undefined) data.rooms = dto.rooms;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.surfaceM2 !== undefined) data.surfaceM2 = dto.surfaceM2;
    if (dto.defaultRent !== undefined) data.defaultRent = dto.defaultRent;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.apartmentSlot !== undefined) data.apartmentSlot = dto.apartmentSlot;
    if (dto.locauxSlot !== undefined) data.locauxSlot = dto.locauxSlot;
    return this.prisma.unit.update({ where: { id: unitId }, data });
  }

  async remove(unitId: string, organizationId: string) {
    await this.ensureUnit(unitId, organizationId);
    await this.prisma.unit.delete({ where: { id: unitId } });
    return { ok: true };
  }

  private async ensureBuilding(id: string, organizationId: string) {
    const n = await this.prisma.building.count({ where: { id, organizationId } });
    if (!n) throw new NotFoundException('Bien introuvable');
  }

  private async ensureUnit(id: string, organizationId: string) {
    const n = await this.prisma.unit.count({
      where: { id, building: { organizationId } },
    });
    if (!n) throw new NotFoundException('Unité introuvable');
  }

  /**
   * Immeuble : limite le nombre d’unités d’habitation au rez-de-chaussée selon rezApartmentCount sur le bien.
   */
  private async assertRdcApartmentCapacity(
    building: {
      id: string;
      structureKind: BuildingStructureKind;
      rezApartmentCount: number | null;
    },
    opts: { kind: UnitKind; floor: number | null; excludeUnitId?: string },
  ) {
    if (building.structureKind !== BuildingStructureKind.IMMEUBLE) return;
    if (opts.kind !== UnitKind.APARTMENT || opts.floor !== 0) return;
    const maxRz = building.rezApartmentCount ?? 0;
    if (maxRz <= 0) {
      throw new BadRequestException(
        'Au rez-de-chaussée, les unités d’habitation ne sont pas prévues (0 déclaré). Indiquez un nombre d’unités au RDC dans « Organisation du bien », ou choisissez un étage ≥ 1.',
      );
    }
    const where: Prisma.UnitWhereInput = {
      buildingId: building.id,
      kind: UnitKind.APARTMENT,
      floor: 0,
    };
    if (opts.excludeUnitId) where.NOT = { id: opts.excludeUnitId };
    const others = await this.prisma.unit.count({ where });
    if (others + 1 > maxRz) {
      throw new BadRequestException(
        `Nombre maximum d’unités d’habitation au rez-de-chaussée atteint (${maxRz} déclaré(s) sur la fiche du bien).`,
      );
    }
  }
}
