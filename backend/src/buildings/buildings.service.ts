import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BuildingStructureKind, Prisma, UnitKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  drawBuildingsListKpiSummary,
  drawBuildingsListWorksheetTable,
  drawBuildingsWorksheetInstructionBox,
  drawField,
  drawFooter,
  drawSectionHeading,
  drawTopBanner,
  drawWorksheetLegend,
  drawZebraTable,
  formatFcfaPdf,
  type BuildingsWorksheetRow,
} from '../common/immo-pdf';
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

  private structureKindLabelFr(kind: BuildingStructureKind): string {
    switch (kind) {
      case BuildingStructureKind.IMMEUBLE:
        return 'Multi locataires';
      case BuildingStructureKind.TERRAIN_LOTS:
        return 'Terrain lots';
      default:
        return 'Un seul lot';
    }
  }

  private buildingsWorksheetFilterCaption(filters?: {
    unitKind?: UnitKind;
    structureKind?: BuildingStructureKind;
    q?: string;
  }): string {
    const parts: string[] = [];
    if (filters?.structureKind) {
      parts.push(`Genre : ${this.structureKindLabelFr(filters.structureKind)}`);
    }
    if (filters?.unitKind) {
      parts.push(`Filtre unité (type) : ${filters.unitKind}`);
    }
    if (filters?.q?.trim()) {
      parts.push(`Recherche : « ${filters.q.trim()} »`);
    }
    return parts.length ? parts.join(' · ') : 'Tous les biens (aucun filtre restrictif)';
  }

  /**
   * PDF « feuille de route » : mêmes filtres que GET /buildings (structureKind, unitKind) + recherche q optionnelle.
   */
  async buildWorksheetPdf(
    organizationId: string,
    filters?: {
      unitKind?: UnitKind;
      structureKind?: BuildingStructureKind;
      q?: string;
    },
  ): Promise<Buffer> {
    const raw = await this.list(organizationId, filters?.unitKind, filters?.structureKind);
    const q = filters?.q?.trim().toLowerCase();
    const filtered = q
      ? raw.filter((b) => {
          const loc = [b.commune ?? '', b.city, b.postalCode ?? ''].filter(Boolean).join(' ');
          const hay = `${b.name} ${loc} ${this.structureKindLabelFr(b.structureKind)}`.toLowerCase();
          return hay.includes(q);
        })
      : raw;

    const MAX = 400;
    const truncated = filtered.length > MAX;
    const slice = filtered.slice(0, MAX);

    let totalUnits = 0;
    const rows: BuildingsWorksheetRow[] = [];
    for (const b of slice) {
      totalUnits += b._count.units;
      rows.push({
        name: b.name,
        place: [b.commune, b.city].filter(Boolean).join(' · ') || '—',
        structureLabel: this.structureKindLabelFr(b.structureKind),
        unitCount: String(b._count.units),
      });
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });

    const filterCaption = this.buildingsWorksheetFilterCaption(filters);

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const PDFDocument = require('pdfkit') as typeof import('pdfkit');
    const chunks: Buffer[] = [];
    const margin = 40;
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin });
    doc.on('data', (c: Buffer) => chunks.push(c));
    const pageH = doc.page.height;
    const contentW = doc.page.width - margin * 2;
    const pageTop = margin;
    const reservedBottom = 52;
    const pageBottom = pageH - margin - reservedBottom;

    const subBits = [
      new Date().toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      filterCaption,
    ];
    if (truncated) subBits.push(`PDF : ${MAX} premiers biens sur ${filtered.length}`);
    const subtitle = subBits.join(' · ');

    drawTopBanner(doc, margin, contentW, {
      eyebrow: org?.name?.trim() || 'Organisation',
      title: 'Feuille de route — Patrimoine (biens)',
      subtitle,
    });

    drawBuildingsWorksheetInstructionBox(doc, margin, contentW);
    drawBuildingsListKpiSummary(doc, margin, contentW, {
      filterLabel: filterCaption,
      lineCount: slice.length,
      matchTotal: filtered.length,
      truncated,
      totalUnits,
    });
    drawSectionHeading(doc, margin, contentW, 'Sites à contrôler ou à mettre à jour', '1');

    const startY = doc.y;
    drawBuildingsListWorksheetTable(doc, margin, contentW, pageTop, pageBottom, startY, rows);

    const legendRoom = 32;
    const footerRoom = 38;
    if (doc.y > pageH - margin - legendRoom - footerRoom) {
      doc.addPage();
    }
    drawWorksheetLegend(doc, margin, contentW);
    drawFooter(doc, margin, contentW, pageH);

    doc.end();
    await new Promise<void>((resolve) => doc.on('end', () => resolve()));
    return Buffer.concat(chunks);
  }

  private truncPdfCell(s: string, maxChars: number): string {
    const t = String(s).replace(/\s+/g, ' ').trim();
    return t.length <= maxChars ? t : `${t.slice(0, Math.max(0, maxChars - 1))}…`;
  }

  private fmtDateFr(d: Date | null | undefined): string {
    if (d == null) return '—';
    if (d instanceof Date) return d.toISOString().slice(0, 10);
    const s = String(d);
    return s.length >= 10 ? s.slice(0, 10) : s;
  }

  private unitKindLabelFr(kind: UnitKind): string {
    const m: Record<string, string> = {
      APARTMENT: 'Appartement',
      HOUSE: 'Maison',
      LAND: 'Terrain',
      OFFICE: 'Bureau',
      WAREHOUSE: 'Entrepôt',
      COMMERCIAL: 'Local commercial',
      GARAGE: 'Garage (parking)',
      OTHER: 'Autre',
    };
    return m[kind] ?? kind;
  }

  private structureFieldsPdf(b: {
    structureKind: BuildingStructureKind;
    floorCount: number | null;
    hasRezDeChaussee: boolean | null;
    apartmentCount: number | null;
    rezApartmentCount: number | null;
    locauxSlotCount: number | null;
    terrainLotCount: number | null;
  }): Array<{ label: string; value: string }> {
    const out: Array<{ label: string; value: string }> = [];
    out.push({ label: 'Genre de bien', value: this.structureKindLabelFr(b.structureKind) });
    if (b.structureKind === BuildingStructureKind.IMMEUBLE) {
      if (b.floorCount != null) {
        out.push({ label: 'Nombre d’étages (au-dessus du sol)', value: String(b.floorCount) });
      }
      out.push({
        label: 'Rez-de-chaussée',
        value: b.hasRezDeChaussee === false ? 'Sans RDC (étages numérotés à partir de 1)' : 'Avec RDC (étage 0)',
      });
      if (b.apartmentCount != null) {
        out.push({ label: 'Logements prévus (numérotation 1…N)', value: String(b.apartmentCount) });
      }
      if (b.rezApartmentCount != null && b.rezApartmentCount > 0) {
        out.push({ label: 'Plafond logements habitables au RDC', value: String(b.rezApartmentCount) });
      }
      if (b.locauxSlotCount != null && b.locauxSlotCount > 0) {
        out.push({ label: 'Plafond locaux pro (entrepôt et commerce)', value: String(b.locauxSlotCount) });
      }
    }
    if (b.structureKind === BuildingStructureKind.TERRAIN_LOTS && b.terrainLotCount != null) {
      out.push({ label: 'Lots déclarés sur le terrain', value: String(b.terrainLotCount) });
    }
    return out;
  }

  private async loadBuildingForFichePdf(id: string, organizationId: string) {
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
                monthlyRent: true,
                rentDueDay: true,
                startDate: true,
                endDate: true,
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

  /**
   * PDF « fiche bien » : localisation, paramètres de structure, tableau des unités avec baux actifs et loyers.
   */
  async buildBuildingFichePdf(id: string, organizationId: string): Promise<Buffer> {
    const b = await this.loadBuildingForFichePdf(id, organizationId);
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const PDFDocument = require('pdfkit') as typeof import('pdfkit');
    const chunks: Buffer[] = [];
    const margin = 44;
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin });
    doc.on('data', (c: Buffer) => chunks.push(c));
    const pageH = doc.page.height;
    const pageW = doc.page.width;
    const contentW = pageW - margin * 2;
    const pageTop = margin;
    const pageBottom = pageH - margin - 42;

    const subtitle = [
      `${b.units.length} unité${b.units.length !== 1 ? 's' : ''} enregistrée${b.units.length !== 1 ? 's' : ''}`,
      new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    ].join(' · ');

    drawTopBanner(doc, margin, contentW, {
      eyebrow: org?.name?.trim() || 'Organisation',
      title: `Fiche bien — ${b.name}`,
      subtitle,
    });

    drawSectionHeading(doc, margin, contentW, 'Localisation du site', '1');
    const lieuLine = [b.commune, b.city].filter(Boolean).join(' · ') || '—';
    drawField(doc, margin, contentW, 'Commune & ville', lieuLine);
    if (b.address?.trim()) drawField(doc, margin, contentW, 'Adresse', b.address.trim());
    if (b.postalCode?.trim()) drawField(doc, margin, contentW, 'Code postal', b.postalCode.trim());
    drawField(doc, margin, contentW, 'Pays', b.country || '—');
    if (b.notes?.trim()) drawField(doc, margin, contentW, 'Notes (site)', b.notes.trim());

    drawSectionHeading(doc, margin, contentW, 'Structure & organisation', '2');
    for (const { label, value } of this.structureFieldsPdf(b)) {
      drawField(doc, margin, contentW, label, value);
    }

    drawSectionHeading(doc, margin, contentW, 'Unités, locataires et loyers (baux actifs)', '3');

    const rows: string[][] = [];
    for (const u of b.units) {
      const lease = u.leases[0];
      const floorStr = u.floor === null ? '—' : u.floor === 0 ? 'RDC' : `Étage ${u.floor}`;
      const surfaceStr = u.surfaceM2 != null ? String(u.surfaceM2.toNumber()) : '—';
      const roomsStr = u.rooms != null ? String(u.rooms) : '—';
      const slotBits: string[] = [];
      if (u.apartmentSlot != null) slotBits.push(`Log. ${u.apartmentSlot}`);
      if (u.locauxSlot != null) slotBits.push(`Loc. pro ${u.locauxSlot}`);
      const slotStr = slotBits.length ? slotBits.join(' · ') : '—';
      const occ = lease ? 'Loué' : 'Vacant';
      let tenantRent = '—';
      let bailStr = '—';
      if (lease) {
        const tn = `${lease.tenant.firstName} ${lease.tenant.lastName}`.trim();
        const rent = formatFcfaPdf(lease.monthlyRent.toNumber());
        tenantRent = this.truncPdfCell(`${tn} — ${rent}`, 52);
        const due = `Échéance le ${lease.rentDueDay}`;
        const start = this.fmtDateFr(lease.startDate);
        const end = lease.endDate ? this.fmtDateFr(lease.endDate) : 'sans fin';
        bailStr = this.truncPdfCell(`${due} · ${start} → ${end}`, 36);
      }
      rows.push([
        this.truncPdfCell(u.label, 20),
        this.truncPdfCell(this.unitKindLabelFr(u.kind), 12),
        floorStr,
        surfaceStr,
        roomsStr,
        this.truncPdfCell(slotStr, 16),
        occ,
        tenantRent,
        bailStr,
      ]);
    }

    if (rows.length === 0) {
      doc
        .fillColor('#64748b')
        .font('Helvetica')
        .fontSize(9)
        .text('Aucune unité enregistrée sur ce bien.', margin, doc.y, { width: contentW });
      doc.moveDown(1.2);
    } else {
      const headers = [
        'Local',
        'Type',
        'Étage',
        'm²',
        'Pièces',
        'N° lot ou logement',
        'Occup.',
        'Locataire & loyer',
        'Bail (échéance & dates)',
      ];
      const colFracs = [0.13, 0.1, 0.07, 0.06, 0.05, 0.11, 0.07, 0.22, 0.19];
      let startY = doc.y + 6;
      if (startY > pageBottom - 80) {
        doc.addPage();
        startY = pageTop + 6;
      }
      drawZebraTable(doc, margin, contentW, pageTop, pageBottom, colFracs, headers, rows, startY);
    }

    drawFooter(doc, margin, contentW, pageH);
    doc.end();
    await new Promise<void>((resolve) => doc.on('end', () => resolve()));
    return Buffer.concat(chunks);
  }
}
