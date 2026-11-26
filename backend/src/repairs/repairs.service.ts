import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import type { Express, Response } from 'express';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateRepairDto } from './dto/create-repair.dto';
import { UpdateRepairDto } from './dto/update-repair.dto';

@Injectable()
export class RepairsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  list(organizationId: string, status?: string) {
    return this.prisma.repairRequest.findMany({
      where: {
        organizationId,
        ...(status ? { status: status as never } : {}),
      },
      orderBy: [{ status: 'asc' }, { deadline: 'asc' }, { createdAt: 'desc' }],
      include: {
        building: true,
        unit: true,
        photos: true,
        charge: true,
      },
    });
  }

  async overdueReminders(organizationId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rows = await this.prisma.repairRequest.findMany({
      where: {
        organizationId,
        status: { not: 'DONE' },
        deadline: { lt: today },
        lateReminderAt: null,
      },
    });
    if (!rows.length) return { reminded: 0 };
    await this.prisma.repairRequest.updateMany({
      where: { id: { in: rows.map((r) => r.id) } },
      data: { lateReminderAt: new Date() },
    });
    return { reminded: rows.length, ids: rows.map((r) => r.id) };
  }

  async create(organizationId: string, dto: CreateRepairDto) {
    const building = await this.prisma.building.findFirst({
      where: { id: dto.buildingId, organizationId },
    });
    if (!building) throw new NotFoundException('Bien introuvable');
    if (dto.unitId) {
      const unit = await this.prisma.unit.findFirst({
        where: { id: dto.unitId, buildingId: dto.buildingId },
      });
      if (!unit) throw new BadRequestException('Unité introuvable pour ce bien.');
    }
    return this.prisma.repairRequest.create({
      data: {
        organizationId,
        buildingId: dto.buildingId,
        unitId: dto.unitId,
        title: dto.title,
        urgency: dto.urgency ?? 'NORMAL',
        note: dto.note,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
      },
      include: { building: true, unit: true, photos: true },
    });
  }

  async get(id: string, organizationId: string) {
    const r = await this.prisma.repairRequest.findFirst({
      where: { id, organizationId },
      include: { building: true, unit: true, photos: true, charge: true },
    });
    if (!r) throw new NotFoundException('Demande introuvable');
    return r;
  }

  async update(id: string, organizationId: string, dto: UpdateRepairDto) {
    await this.get(id, organizationId);
    const data: Prisma.RepairRequestUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.urgency !== undefined) data.urgency = dto.urgency;
    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === 'DONE') data.completedAt = new Date();
    }
    if (dto.note !== undefined) data.note = dto.note;
    if (dto.contractorName !== undefined) data.contractorName = dto.contractorName;
    if (dto.contractorPhone !== undefined) data.contractorPhone = dto.contractorPhone;
    if (dto.estimatedCost !== undefined) data.estimatedCost = dto.estimatedCost;
    if (dto.finalCost !== undefined) data.finalCost = dto.finalCost;
    if (dto.deadline !== undefined) data.deadline = dto.deadline ? new Date(dto.deadline) : null;

    return this.prisma.repairRequest.update({
      where: { id },
      data,
      include: { building: true, unit: true, photos: true, charge: true },
    });
  }

  async createMaintenanceCharge(id: string, organizationId: string) {
    const repair = await this.get(id, organizationId);
    if (repair.chargeId) throw new BadRequestException('Charge déjà liée.');
    const amount = repair.finalCost ?? repair.estimatedCost;
    if (amount == null) {
      throw new BadRequestException('Renseignez un coût estimé ou final avant de créer la charge.');
    }
    const now = new Date();
    const charge = await this.prisma.charge.create({
      data: {
        buildingId: repair.buildingId,
        unitId: repair.unitId,
        category: 'MAINTENANCE',
        label: `Réparation : ${repair.title}`.slice(0, 200),
        amount,
        periodYear: now.getFullYear(),
        periodMonth: now.getMonth() + 1,
        paid: false,
        notes: repair.note,
      },
    });
    return this.prisma.repairRequest.update({
      where: { id },
      data: { chargeId: charge.id },
      include: { building: true, unit: true, photos: true, charge: true },
    });
  }

  async addPhoto(organizationId: string, repairId: string, file: Express.Multer.File, caption?: string) {
    await this.get(repairId, organizationId);
    const ext = extname(file.originalname || '') || '.jpg';
    const key = `${randomUUID()}${ext}`;
    await this.storage.put('repair-photos', key, file.buffer, file.mimetype);
    return this.prisma.repairPhoto.create({
      data: {
        repairId,
        fileKey: key,
        originalName: file.originalname,
        mime: file.mimetype,
        size: file.size,
        caption: caption?.slice(0, 300),
      },
    });
  }

  async streamPhoto(organizationId: string, repairId: string, photoId: string, res: Response) {
    const photo = await this.prisma.repairPhoto.findFirst({
      where: { id: photoId, repairId, repair: { organizationId } },
    });
    if (!photo) throw new NotFoundException('Photo introuvable');
    const buf = await this.storage.get('repair-photos', photo.fileKey);
    if (!buf) throw new NotFoundException('Fichier absent');
    res.setHeader('Content-Type', photo.mime);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(photo.originalName || photo.fileKey)}"`,
    );
    res.send(buf);
  }
}