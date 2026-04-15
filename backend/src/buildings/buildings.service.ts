import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BuildingStructureKind, Prisma, UnitKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';

@Injectable()
export class BuildingsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @param unitKind Si défini : biens qui ont au moins une unité de ce type.
   * @param structureKind Si défini : biens dont le genre (structure) correspond.
   */
  list(organizationId: string, unitKind?: UnitKind, structureKind?: BuildingStructureKind) {
    const where: Prisma.BuildingWhereInput = { organizationId };
    if (structureKind) where.structureKind = structureKind;
    if (unitKind) where.units = { some: { kind: unitKind } };
    return this.prisma.building.findMany({
      where,
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

  async get(id: string, organizationId: string) {
    const b = await this.prisma.building.findFirst({
      where: { id, organizationId },
      include: {
        units: {
          orderBy: { label: 'asc' },
          include: {
            leases: {
              where: { active: true },
              orderBy: { startDate: 'desc' },
              take: 1,
              select: {
                id: true,
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

  create(dto: CreateBuildingDto, organizationId: string) {
    const kind = dto.structureKind ?? BuildingStructureKind.MONO_LOT;
    if (kind === BuildingStructureKind.IMMEUBLE) {
      const hasRz = dto.hasRezDeChaussee !== false;
      this.assertRezApartmentCoherent({
        hasRezDeChaussee: hasRz,
        apartmentCount: dto.apartmentCount ?? null,
        rezApartmentCount: hasRz ? dto.rezApartmentCount ?? null : null,
      });
    }
    try {
      return this.prisma.building.create({
        data: {
          organizationId,
          name: dto.name,
          city: dto.city,
          commune: dto.commune,
          address: dto.address ?? null,
          postalCode: dto.postalCode ?? null,
          country: dto.country ?? "Côte d'Ivoire",
          notes: dto.notes,
          structureKind: kind,
          floorCount: kind === BuildingStructureKind.IMMEUBLE ? dto.floorCount ?? null : null,
          hasRezDeChaussee:
            kind === BuildingStructureKind.IMMEUBLE ? dto.hasRezDeChaussee !== false : null,
          apartmentCount: kind === BuildingStructureKind.IMMEUBLE ? dto.apartmentCount ?? null : null,
          rezApartmentCount:
            kind === BuildingStructureKind.IMMEUBLE && dto.hasRezDeChaussee !== false
              ? dto.rezApartmentCount ?? null
              : null,
          locauxSlotCount: kind === BuildingStructureKind.IMMEUBLE ? dto.locauxSlotCount ?? null : null,
          terrainLotCount: kind === BuildingStructureKind.TERRAIN_LOTS ? dto.terrainLotCount ?? null : null,
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientValidationError &&
        /terrainLotCount|Unknown argument/i.test(e.message)
      ) {
        throw new BadRequestException(
          'Le moteur Prisma est obsolète (schéma sans terrain_lot_count). Arrêtez l’API, puis dans le dossier backend exécutez : npx prisma generate — puis relancez npm run start:dev. Sous Windows, l’erreur EPERM disparaît une fois Node arrêté.',
        );
      }
      throw e;
    }
  }

  async update(id: string, organizationId: string, dto: UpdateBuildingDto) {
    const existing = await this.prisma.building.findFirst({ where: { id, organizationId } });
    if (!existing) throw new NotFoundException('Bien introuvable');
    if (
      (existing.structureKind === BuildingStructureKind.IMMEUBLE ||
        existing.structureKind === BuildingStructureKind.TERRAIN_LOTS) &&
      dto.structureKind === BuildingStructureKind.MONO_LOT
    ) {
      throw new BadRequestException(
        'Ce bien est en multi locataires (immeuble ou terrain avec plusieurs locataires) : le type ne peut plus être repassé en « un seul lot ». Créez un autre bien pour une villa ou un local loué en entier.',
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
    const nextKind = dto.structureKind ?? existing.structureKind;
    const mergedHasRz =
      dto.hasRezDeChaussee !== undefined ? dto.hasRezDeChaussee !== false : existing.hasRezDeChaussee !== false;
    const mergedApt = dto.apartmentCount !== undefined ? dto.apartmentCount : existing.apartmentCount;
    const mergedRez = dto.rezApartmentCount !== undefined ? dto.rezApartmentCount : existing.rezApartmentCount;
    if (nextKind === BuildingStructureKind.IMMEUBLE) {
      this.assertRezApartmentCoherent({
        hasRezDeChaussee: mergedHasRz,
        apartmentCount: mergedApt,
        rezApartmentCount: mergedHasRz ? mergedRez : null,
      });
    }
    const data: Prisma.BuildingUpdateInput = { ...dto };
    if (dto.hasRezDeChaussee === false) {
      data.rezApartmentCount = null;
    }
    return this.prisma.building.update({ where: { id }, data });
  }

  private assertRezApartmentCoherent(opts: {
    hasRezDeChaussee: boolean;
    apartmentCount: number | null;
    rezApartmentCount: number | null;
  }) {
    if (!opts.hasRezDeChaussee) return;
    const rez = opts.rezApartmentCount;
    if (rez == null) return;
    if (rez < 0) {
      throw new BadRequestException('Le nombre d’unités au rez-de-chaussée doit être positif ou nul.');
    }
    const apt = opts.apartmentCount;
    if (apt != null && apt >= 0 && rez > apt) {
      throw new BadRequestException(
        'Le nombre d’unités au rez-de-chaussée ne peut pas dépasser le total des logements déclaré pour ce bien.',
      );
    }
  }

  async remove(id: string, organizationId: string) {
    await this.ensureExists(id, organizationId);
    await this.prisma.building.delete({ where: { id } });
    return { ok: true };
  }

  private async ensureExists(id: string, organizationId: string) {
    const n = await this.prisma.building.count({ where: { id, organizationId } });
    if (!n) throw new NotFoundException('Bien introuvable');
  }
}
