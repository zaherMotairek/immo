import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BuildingStructureKind, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

@Injectable()
export class UnitsService {
  constructor(private readonly prisma: PrismaService) {}

  async listByBuilding(buildingId: string) {
    await this.ensureBuilding(buildingId);
    return this.prisma.unit.findMany({
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
  }

  async create(buildingId: string, dto: CreateUnitDto) {
    const building = await this.prisma.building.findUnique({
      where: { id: buildingId },
      include: { _count: { select: { units: true } } },
    });
    if (!building) throw new NotFoundException('Bien introuvable');
    if (
      building.structureKind === BuildingStructureKind.MONO_LOT &&
      building._count.units >= 1
    ) {
      throw new BadRequestException(
        'Ce bien est défini comme « un seul lot louable » (villa, entrepôt entier, parcelle unique, etc.). Il ne peut avoir qu’une seule unité. Sur la fiche du bien, passez en « Immeuble / bâtiment multi-lots » ou « Terrain multi-lots » pour en ajouter plusieurs.',
      );
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
          'Indiquez le numéro d’unité / de lot (1 à N) pour chaque lot sur ce terrain multi-lots.',
        );
      }
    }

    if (dto.apartmentSlot != null) {
      const dup = await this.prisma.unit.findFirst({
        where: { buildingId, apartmentSlot: dto.apartmentSlot },
        select: { id: true },
      });
      if (dup) {
        const slotLabel =
          building.structureKind === BuildingStructureKind.TERRAIN_LOTS ? 'de lot' : 'd’appartement';
        throw new BadRequestException(
          `Le numéro ${slotLabel} ${dto.apartmentSlot} est déjà utilisé sur ce bien.`,
        );
      }
      if (
        building.structureKind === BuildingStructureKind.IMMEUBLE &&
        building.apartmentCount != null &&
        (dto.apartmentSlot < 1 || dto.apartmentSlot > building.apartmentCount)
      ) {
        throw new BadRequestException(
          `Le numéro d’appartement doit être entre 1 et ${building.apartmentCount} (déclaré sur l’immeuble).`,
        );
      }
      if (
        building.structureKind === BuildingStructureKind.TERRAIN_LOTS &&
        building.terrainLotCount != null &&
        building.terrainLotCount > 0 &&
        (dto.apartmentSlot < 1 || dto.apartmentSlot > building.terrainLotCount)
      ) {
        throw new BadRequestException(
          `Le numéro de lot doit être entre 1 et ${building.terrainLotCount} (déclaré sur le terrain).`,
        );
      }
    }

    if (dto.floor != null && building.floorCount != null && building.floorCount > 0) {
      if (dto.floor < 0 || dto.floor > building.floorCount) {
        throw new BadRequestException(
          `L’étage doit être entre 0 (rez-de-chaussée) et ${building.floorCount} pour cet immeuble.`,
        );
      }
    }

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
    return this.prisma.unit.create({ data });
  }

  async update(unitId: string, dto: UpdateUnitDto) {
    const unit = await this.prisma.unit.findUnique({
      where: { id: unitId },
      include: { building: true },
    });
    if (!unit) throw new NotFoundException('Unité introuvable');

    if (dto.apartmentSlot !== undefined && dto.apartmentSlot != null) {
      const dup = await this.prisma.unit.findFirst({
        where: {
          buildingId: unit.buildingId,
          apartmentSlot: dto.apartmentSlot,
          NOT: { id: unitId },
        },
        select: { id: true },
      });
      if (dup) {
        const slotLabel =
          unit.building.structureKind === BuildingStructureKind.TERRAIN_LOTS ? 'de lot' : 'd’appartement';
        throw new BadRequestException(
          `Le numéro ${slotLabel} ${dto.apartmentSlot} est déjà utilisé sur ce bien.`,
        );
      }
      const b = unit.building;
      if (
        b.structureKind === BuildingStructureKind.IMMEUBLE &&
        b.apartmentCount != null &&
        (dto.apartmentSlot < 1 || dto.apartmentSlot > b.apartmentCount)
      ) {
        throw new BadRequestException(
          `Le numéro d’appartement doit être entre 1 et ${b.apartmentCount} (déclaré sur l’immeuble).`,
        );
      }
      if (
        b.structureKind === BuildingStructureKind.TERRAIN_LOTS &&
        b.terrainLotCount != null &&
        b.terrainLotCount > 0 &&
        (dto.apartmentSlot < 1 || dto.apartmentSlot > b.terrainLotCount)
      ) {
        throw new BadRequestException(
          `Le numéro de lot doit être entre 1 et ${b.terrainLotCount} (déclaré sur le terrain).`,
        );
      }
    }

    const floorVal = dto.floor !== undefined ? dto.floor : unit.floor;
    if (floorVal != null && unit.building.floorCount != null && unit.building.floorCount > 0) {
      if (floorVal < 0 || floorVal > unit.building.floorCount) {
        throw new BadRequestException(
          `L’étage doit être entre 0 (rez-de-chaussée) et ${unit.building.floorCount} pour cet immeuble.`,
        );
      }
    }

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
    return this.prisma.unit.update({ where: { id: unitId }, data });
  }

  async remove(unitId: string) {
    await this.ensureUnit(unitId);
    await this.prisma.unit.delete({ where: { id: unitId } });
    return { ok: true };
  }

  private async ensureBuilding(id: string) {
    const n = await this.prisma.building.count({ where: { id } });
    if (!n) throw new NotFoundException('Bien introuvable');
  }

  private async ensureUnit(id: string) {
    const n = await this.prisma.unit.count({ where: { id } });
    if (!n) throw new NotFoundException('Unité introuvable');
  }
}
