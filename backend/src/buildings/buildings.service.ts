import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BuildingStructureKind, UnitKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';

@Injectable()
export class BuildingsService {
  constructor(private readonly prisma: PrismaService) {}

  /** @param unitKind Si défini : biens qui ont au moins une unité de ce type (liste Baux / Charges utilise sans filtre). */
  list(unitKind?: UnitKind) {
    return this.prisma.building.findMany({
      where: unitKind ? { units: { some: { kind: unitKind } } } : undefined,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            units: unitKind ? { where: { kind: unitKind } } : true,
          },
        },
        units: {
          select: { id: true, label: true, kind: true, apartmentSlot: true },
          orderBy: { label: 'asc' },
        },
      },
    });
  }

  async get(id: string) {
    const b = await this.prisma.building.findUnique({
      where: { id },
      include: {
        units: {
          orderBy: { label: 'asc' },
          include: {
            leases: {
              where: { active: true },
              orderBy: { startDate: 'desc' },
              take: 1,
              select: {
                monthlyRent: true,
                tenant: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });
    if (!b) throw new NotFoundException('Bien introuvable');
    return b;
  }

  create(dto: CreateBuildingDto) {
    return this.prisma.building.create({
      data: {
        name: dto.name,
        city: dto.city,
        commune: dto.commune,
        address: dto.address ?? null,
        postalCode: dto.postalCode ?? null,
        country: dto.country ?? "Côte d'Ivoire",
        notes: dto.notes,
        structureKind: dto.structureKind ?? BuildingStructureKind.MONO_LOT,
        floorCount: dto.floorCount ?? null,
        apartmentCount: dto.apartmentCount ?? null,
      },
    });
  }

  async update(id: string, dto: UpdateBuildingDto) {
    const existing = await this.prisma.building.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Bien introuvable');
    if (
      existing.structureKind === BuildingStructureKind.IMMEUBLE &&
      dto.structureKind === BuildingStructureKind.MONO_LOT
    ) {
      throw new BadRequestException(
        'Ce bien est un immeuble : le type ne peut plus être repassé en « un seul lot ». Créez un autre bien pour une villa ou un local loué en entier.',
      );
    }
    if (dto.structureKind === BuildingStructureKind.MONO_LOT) {
      const n = await this.prisma.unit.count({ where: { buildingId: id } });
      if (n > 1) {
        throw new BadRequestException(
          'Impossible de passer en « un seul lot » : ce bien a déjà plusieurs unités. Supprimez les unités en trop ou fusionnez-les dans une seule fiche.',
        );
      }
    }
    return this.prisma.building.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.building.delete({ where: { id } });
    return { ok: true };
  }

  private async ensureExists(id: string) {
    const n = await this.prisma.building.count({ where: { id } });
    if (!n) throw new NotFoundException('Bien introuvable');
  }
}
