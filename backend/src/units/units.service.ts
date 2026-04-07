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
        'Ce bien est défini comme « un seul lot louable » (villa, entrepôt entier, parcelle unique, etc.). Il ne peut avoir qu’une seule unité. Cochez « Immeuble / bâtiment multi-lots » sur la fiche du bien pour en ajouter plusieurs.',
      );
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
    return this.prisma.unit.create({ data });
  }

  async update(unitId: string, dto: UpdateUnitDto) {
    await this.ensureUnit(unitId);
    const data: Prisma.UnitUpdateInput = {};
    if (dto.label !== undefined) data.label = dto.label;
    if (dto.kind !== undefined) data.kind = dto.kind;
    if (dto.floor !== undefined) data.floor = dto.floor;
    if (dto.rooms !== undefined) data.rooms = dto.rooms;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.surfaceM2 !== undefined) data.surfaceM2 = dto.surfaceM2;
    if (dto.defaultRent !== undefined) data.defaultRent = dto.defaultRent;
    if (dto.description !== undefined) data.description = dto.description;
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
