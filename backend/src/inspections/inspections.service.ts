import {
  BadRequestException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import type { Express, Response } from 'express';
import type {
  InspectionItemCondition,
  InspectionKind,
  UnitKind,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { DEFAULT_CHECKLIST_ROWS } from './default-checklist';
import { CreateLeaseInspectionDto } from './dto/create-inspection.dto';
import { UpdateLeaseInspectionDto } from './dto/update-inspection.dto';
import { UpsertInspectionTemplateDto } from './dto/upsert-template.dto';
import {
  drawFooter,
  drawSectionHeading,
  drawTopBanner,
  drawZebraTableEqualCols,
  formatDatePdfFr,
  pdfSafeText,
} from '../common/immo-pdf';

const CONDITION_FR: Record<InspectionItemCondition, string> = {
  GOOD: 'Bon',
  WORN: 'Usé',
  DAMAGED: 'Dégradé',
  UNCHECKED: '—',
};

const KIND_FR: Record<InspectionKind, string> = {
  MOVE_IN: 'Entrée',
  MOVE_OUT: 'Sortie',
};

@Injectable()
export class InspectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  listTemplates(organizationId: string) {
    return this.prisma.inspectionChecklistTemplate.findMany({
      where: { organizationId },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async ensureDefaultTemplate(organizationId: string) {
    const n = await this.prisma.inspectionChecklistTemplate.count({
      where: { organizationId },
    });
    if (n > 0) return;
    await this.prisma.inspectionChecklistTemplate.create({
      data: {
        organizationId,
        name: 'Appartement (standard)',
        isDefault: true,
        unitKind: 'APARTMENT',
        items: {
          create: DEFAULT_CHECKLIST_ROWS.map((r, i) => ({
            room: r.room,
            element: r.element,
            sortOrder: i,
          })),
        },
      },
    });
  }

  async createTemplate(organizationId: string, dto: UpsertInspectionTemplateDto) {
    if (dto.isDefault) {
      await this.prisma.inspectionChecklistTemplate.updateMany({
        where: { organizationId, unitKind: dto.unitKind ?? null },
        data: { isDefault: false },
      });
    }
    return this.prisma.inspectionChecklistTemplate.create({
      data: {
        organizationId,
        name: dto.name,
        unitKind: dto.unitKind,
        isDefault: dto.isDefault ?? false,
        items: {
          create: dto.items.map((it, i) => ({
            room: it.room,
            element: it.element,
            sortOrder: it.sortOrder ?? i,
          })),
        },
      },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async updateTemplate(organizationId: string, id: string, dto: UpsertInspectionTemplateDto) {
    const t = await this.prisma.inspectionChecklistTemplate.findFirst({
      where: { id, organizationId },
    });
    if (!t) throw new NotFoundException('Modèle introuvable');
    if (dto.isDefault) {
      await this.prisma.inspectionChecklistTemplate.updateMany({
        where: { organizationId, unitKind: dto.unitKind ?? null, NOT: { id } },
        data: { isDefault: false },
      });
    }
    await this.prisma.inspectionChecklistTemplateItem.deleteMany({ where: { templateId: id } });
    return this.prisma.inspectionChecklistTemplate.update({
      where: { id },
      data: {
        name: dto.name,
        unitKind: dto.unitKind,
        isDefault: dto.isDefault ?? t.isDefault,
        items: {
          create: dto.items.map((it, i) => ({
            room: it.room,
            element: it.element,
            sortOrder: it.sortOrder ?? i,
          })),
        },
      },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async deleteTemplate(organizationId: string, id: string) {
    const t = await this.prisma.inspectionChecklistTemplate.findFirst({
      where: { id, organizationId },
    });
    if (!t) throw new NotFoundException('Modèle introuvable');
    await this.prisma.inspectionChecklistTemplate.delete({ where: { id } });
    return { ok: true };
  }

  listForLease(organizationId: string, leaseId: string) {
    return this.prisma.leaseInspection.findMany({
      where: { organizationId, leaseId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        photos: true,
      },
    });
  }

  private async resolveChecklistRows(
    organizationId: string,
    leaseId: string,
    templateId?: string,
  ) {
    const lease = await this.prisma.lease.findFirst({
      where: { id: leaseId, unit: { building: { organizationId } } },
      include: { unit: true },
    });
    if (!lease) throw new NotFoundException('Bail introuvable');

    if (templateId) {
      const tpl = await this.prisma.inspectionChecklistTemplate.findFirst({
        where: { id: templateId, organizationId },
        include: { items: { orderBy: { sortOrder: 'asc' } } },
      });
      if (!tpl) throw new NotFoundException('Modèle introuvable');
      return tpl.items.map((it) => ({ room: it.room, element: it.element }));
    }

    await this.ensureDefaultTemplate(organizationId);
    const kind = lease.unit.kind as UnitKind;
    const tpl =
      (await this.prisma.inspectionChecklistTemplate.findFirst({
        where: { organizationId, OR: [{ unitKind: kind }, { isDefault: true }] },
        orderBy: [{ unitKind: 'desc' }, { isDefault: 'desc' }],
        include: { items: { orderBy: { sortOrder: 'asc' } } },
      })) ?? null;
    if (tpl?.items.length) {
      return tpl.items.map((it) => ({ room: it.room, element: it.element }));
    }
    return DEFAULT_CHECKLIST_ROWS;
  }

  async createForLease(organizationId: string, leaseId: string, dto: CreateLeaseInspectionDto) {
    const lease = await this.prisma.lease.findFirst({
      where: { id: leaseId, unit: { building: { organizationId } } },
    });
    if (!lease) throw new NotFoundException('Bail introuvable');

    const rows = await this.resolveChecklistRows(organizationId, leaseId, dto.templateId);

    let comparedMoveInId: string | undefined;
    if (dto.kind === 'MOVE_OUT') {
      const moveIn = await this.prisma.leaseInspection.findFirst({
        where: { leaseId, organizationId, kind: 'MOVE_IN' },
        orderBy: { signedAt: 'desc' },
      });
      comparedMoveInId = moveIn?.id;
    }

    return this.prisma.leaseInspection.create({
      data: {
        organizationId,
        leaseId,
        kind: dto.kind,
        comparedMoveInId,
        depositRefundDecision: dto.kind === 'MOVE_OUT' ? 'PENDING' : undefined,
        items: {
          create: rows.map((r, i) => ({
            room: r.room,
            element: r.element,
            sortOrder: i,
          })),
        },
      },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        photos: true,
        lease: { include: { tenant: true, unit: { include: { building: true } } } },
      },
    });
  }

  async getOne(organizationId: string, id: string) {
    const row = await this.prisma.leaseInspection.findFirst({
      where: { id, organizationId },
      include: {
        items: { orderBy: { sortOrder: 'asc' }, include: { photos: true } },
        photos: true,
        lease: { include: { tenant: true, unit: { include: { building: true } } } },
      },
    });
    if (!row) throw new NotFoundException('État des lieux introuvable');
    return row;
  }

  async update(organizationId: string, id: string, dto: UpdateLeaseInspectionDto) {
    const insp = await this.getOne(organizationId, id);
    if (insp.status === 'SIGNED' && dto.items?.length) {
      throw new BadRequestException('État des lieux signé — modification des lignes impossible.');
    }

    if (dto.items?.length) {
      for (const line of dto.items) {
        await this.prisma.leaseInspectionItem.updateMany({
          where: { id: line.id, inspectionId: id },
          data: {
            ...(line.condition != null ? { condition: line.condition } : {}),
            ...(line.note !== undefined ? { note: line.note } : {}),
          },
        });
      }
    }

    const data: Record<string, unknown> = {};
    if (dto.tenantSignatureName !== undefined) data.tenantSignatureName = dto.tenantSignatureName;
    if (dto.depositRefundDecision !== undefined) data.depositRefundDecision = dto.depositRefundDecision;
    if (dto.depositRefundNote !== undefined) data.depositRefundNote = dto.depositRefundNote;
    if (dto.sign) {
      const name = dto.tenantSignatureName ?? insp.tenantSignatureName;
      if (!name?.trim()) {
        throw new BadRequestException('Nom du locataire requis pour signer.');
      }
      data.status = 'SIGNED';
      data.signedAt = new Date();
      data.tenantSignatureName = name.trim();
    }

    if (Object.keys(data).length) {
      await this.prisma.leaseInspection.update({ where: { id }, data });
    }
    return this.getOne(organizationId, id);
  }

  async addPhoto(
    organizationId: string,
    inspectionId: string,
    file: Express.Multer.File,
    itemId?: string,
    caption?: string,
  ) {
    await this.getOne(organizationId, inspectionId);
    if (itemId) {
      const item = await this.prisma.leaseInspectionItem.findFirst({
        where: { id: itemId, inspectionId },
      });
      if (!item) throw new BadRequestException('Ligne de checklist introuvable.');
    }
    const ext = extname(file.originalname || '') || '.jpg';
    const key = `${randomUUID()}${ext}`;
    await this.storage.put('inspection-photos', key, file.buffer, file.mimetype);
    return this.prisma.leaseInspectionPhoto.create({
      data: {
        inspectionId,
        itemId: itemId || null,
        fileKey: key,
        originalName: file.originalname,
        mime: file.mimetype,
        size: file.size,
        caption: caption?.slice(0, 300),
        takenAt: new Date(),
      },
    });
  }

  async streamPhoto(organizationId: string, inspectionId: string, photoId: string, res: Response) {
    const photo = await this.prisma.leaseInspectionPhoto.findFirst({
      where: { id: photoId, inspectionId, inspection: { organizationId } },
    });
    if (!photo) throw new NotFoundException('Photo introuvable');
    const buf = await this.storage.get('inspection-photos', photo.fileKey);
    if (!buf) throw new NotFoundException('Fichier absent');
    res.setHeader('Content-Type', photo.mime);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(photo.originalName || photo.fileKey)}"`,
    );
    res.send(buf);
  }

  async compareWithMoveIn(organizationId: string, id: string) {
    return this.buildComparison(organizationId, id);
  }

  private async buildComparison(organizationId: string, moveOutId: string) {
    const moveOut = await this.getOne(organizationId, moveOutId);
    if (moveOut.kind !== 'MOVE_OUT') {
      throw new BadRequestException('Comparaison disponible pour un état des lieux de sortie.');
    }
    const moveInId = moveOut.comparedMoveInId;
    if (!moveInId) {
      return { moveOut, moveIn: null, differences: [] as Array<Record<string, unknown>> };
    }
    const moveIn = await this.getOne(organizationId, moveInId);
    const inMap = new Map<string, (typeof moveIn.items)[number]>();
    for (const it of moveIn.items) {
      inMap.set(`${it.room}::${it.element}`, it);
    }
    const differences = moveOut.items.map((out) => {
      const key = `${out.room}::${out.element}`;
      const inn = inMap.get(key);
      const changed =
        !inn ||
        inn.condition !== out.condition ||
        (inn.note || '') !== (out.note || '');
      const worsened = inn
        ? (out.condition === 'DAMAGED' && inn.condition !== 'DAMAGED') ||
          (out.condition === 'WORN' && inn.condition === 'GOOD')
        : false;
      return {
        room: out.room,
        element: out.element,
        moveInCondition: inn?.condition ?? null,
        moveOutCondition: out.condition,
        moveInNote: inn?.note ?? null,
        moveOutNote: out.note ?? null,
        changed,
        worsened,
      };
    });
    return { moveOut, moveIn, differences };
  }

  async renderPdf(organizationId: string, id: string): Promise<StreamableFile> {
    const insp = await this.getOne(organizationId, id);
    const comparison =
      insp.kind === 'MOVE_OUT' && insp.comparedMoveInId
        ? await this.buildComparison(organizationId, id)
        : null;

    const PDFDocument = require('pdfkit') as typeof import('pdfkit');
    const margin = 48;
    const doc = new PDFDocument({ size: 'A4', margin });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));

    const tenant = `${insp.lease.tenant.firstName} ${insp.lease.tenant.lastName}`;
    const unit = insp.lease.unit.label;
    const building = insp.lease.unit.building.name;

    const contentW = doc.page.width - margin * 2;
    drawTopBanner(doc, margin, contentW, {
      eyebrow: 'ImmoPilot',
      title: 'État des lieux — ' + KIND_FR[insp.kind],
      subtitle: building,
    });
    drawSectionHeading(doc, margin, doc.page.width - margin * 2, 'Contexte');
    doc
      .fontSize(10)
      .fillColor('#333')
      .text(`Locataire : ${pdfSafeText(tenant)}`, margin, doc.y)
      .text(`Lot : ${pdfSafeText(unit)} — ${pdfSafeText(building)}`)
      .text(`Statut : ${insp.status === 'SIGNED' ? 'Signé' : 'Brouillon'}`);
    if (insp.signedAt) {
      doc.text(`Signé le ${formatDatePdfFr(insp.signedAt)} — ${pdfSafeText(insp.tenantSignatureName || '')}`);
    }
    if (insp.depositRefundDecision) {
      doc.text(`Décision caution : ${insp.depositRefundDecision}`);
      if (insp.depositRefundNote) doc.text(pdfSafeText(insp.depositRefundNote));
    }
    doc.moveDown();

    const rows = insp.items.map((it) => [
      pdfSafeText(it.room),
      pdfSafeText(it.element),
      CONDITION_FR[it.condition],
      pdfSafeText(it.note || ''),
    ]);
    const pageTop = margin;
    const pageBottom = doc.page.height - margin - 40;
    let yAfter = drawZebraTableEqualCols(
      doc,
      margin,
      contentW,
      pageTop,
      pageBottom,
      ['Pièce', 'Élément', 'État', 'Note'],
      rows,
      doc.y,
    );
    doc.y = yAfter + 12;

    if (comparison?.differences?.length) {
      drawSectionHeading(doc, margin, doc.page.width - margin * 2, 'Écarts entrée / sortie');
      const diffRows = comparison.differences
        .filter((d) => d.changed)
        .map((d) => [
          pdfSafeText(String(d.room)),
          pdfSafeText(String(d.element)),
          d.moveInCondition ? CONDITION_FR[d.moveInCondition as InspectionItemCondition] : '—',
          CONDITION_FR[d.moveOutCondition as InspectionItemCondition],
        ]);
      if (diffRows.length) {
        drawZebraTableEqualCols(
          doc,
          margin,
          contentW,
          pageTop,
          pageBottom,
          ['Pièce', 'Élément', 'Entrée', 'Sortie'],
          diffRows,
          doc.y,
        );
      } else {
        doc.fontSize(10).text('Aucun écart relevé entre l’entrée et la sortie.', margin);
      }
    }

    drawFooter(doc, margin, doc.page.width - margin * 2, doc.page.height);
    doc.end();
    await new Promise<void>((resolve) => doc.on('end', () => resolve()));
    const pdf = Buffer.concat(chunks);
    return new StreamableFile(pdf, {
      type: 'application/pdf',
      disposition: `attachment; filename="etat-des-lieux-${id.slice(0, 8)}.pdf"`,
    });
  }
}