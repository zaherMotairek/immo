import { randomUUID } from 'crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Express } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { JwtAuthUser } from '../auth/jwt-user.types';
import { assertAllowedUploadMagic } from '../common/file-magic';
import { StorageService } from '../storage/storage.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import {
  TENANT_ID_DOC_ALLOWED_MIMES,
  TENANT_ID_DOC_MAX_BYTES,
  TENANT_ID_DOC_MIME_TO_EXT,
} from './tenant-id-doc.constants';

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
  ) {}

  list(organizationId: string) {
    return this.prisma.tenant.findMany({
      where: { organizationId },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      include: {
        leases: {
          where: { active: true },
          take: 1,
          include: { unit: { include: { building: true } } },
        },
      },
    });
  }

  async get(id: string, organizationId: string) {
    const t = await this.prisma.tenant.findFirst({
      where: { id, organizationId },
      include: {
        leases: {
          orderBy: { startDate: 'desc' },
          include: { unit: { include: { building: true } }, payments: { take: 6, orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }] } },
        },
      },
    });
    if (!t) throw new NotFoundException('Locataire introuvable');
    return t;
  }

  create(dto: CreateTenantDto, organizationId: string) {
    return this.prisma.tenant.create({ data: { ...dto, organizationId } });
  }

  async update(id: string, organizationId: string, dto: UpdateTenantDto, actor?: JwtAuthUser) {
    await this.ensure(id, organizationId);
    const data: Prisma.TenantUpdateInput = {};
    if (dto.firstName !== undefined) data.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) data.lastName = dto.lastName.trim();
    if (dto.phone !== undefined) data.phone = dto.phone?.trim() || null;
    if (dto.email !== undefined) data.email = dto.email?.trim() || null;
    if (dto.notes !== undefined) data.notes = dto.notes?.trim() || null;
    const updated = await this.prisma.tenant.update({ where: { id }, data });
    await this.audit.log({
      organizationId,
      actor,
      action: 'TENANT_UPDATED',
      entityType: 'tenant',
      entityId: id,
      summary: `Fiche locataire modifiee: ${updated.firstName} ${updated.lastName}`.trim(),
    });
    return updated;
  }

  async remove(id: string, organizationId: string) {
    await this.ensure(id, organizationId);
    const t = await this.prisma.tenant.findUnique({ where: { id } });
    if (t?.idDocFileKey) await this.removeIdDocFromDisk(t.idDocFileKey);
    try {
      await this.prisma.tenant.delete({ where: { id } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        throw new BadRequestException(
          'Impossible de supprimer ce locataire : un bail est encore lié. Modifiez ou supprimez le bail d’abord.',
        );
      }
      throw e;
    }
    return { ok: true };
  }

  private async ensure(id: string, organizationId: string) {
    const n = await this.prisma.tenant.count({ where: { id, organizationId } });
    if (!n) throw new NotFoundException('Locataire introuvable');
  }

  private idDocIndexKey(tenantId: string): string {
    return `_index/${tenantId}.json`;
  }

  private async readIdDocIndex(tenantId: string): Promise<Array<{
    fileKey: string;
    fileName: string;
    mimeType: string;
    size: number;
    uploadedAt: string;
  }>> {
    const buf = await this.storage.get('tenant-id-docs', this.idDocIndexKey(tenantId));
    if (!buf) return [];
    try {
      const j = JSON.parse(buf.toString('utf-8')) as unknown;
      if (!Array.isArray(j)) return [];
      return j.filter(
        (x): x is { fileKey: string; fileName: string; mimeType: string; size: number; uploadedAt: string } =>
          !!x &&
          typeof (x as { fileKey?: unknown }).fileKey === 'string' &&
          typeof (x as { fileName?: unknown }).fileName === 'string' &&
          typeof (x as { mimeType?: unknown }).mimeType === 'string' &&
          typeof (x as { size?: unknown }).size === 'number' &&
          typeof (x as { uploadedAt?: unknown }).uploadedAt === 'string',
      );
    } catch {
      return [];
    }
  }

  private async writeIdDocIndex(
    tenantId: string,
    files: Array<{ fileKey: string; fileName: string; mimeType: string; size: number; uploadedAt: string }>,
  ) {
    await this.storage.put(
      'tenant-id-docs',
      this.idDocIndexKey(tenantId),
      Buffer.from(JSON.stringify(files, null, 2), 'utf-8'),
      'application/json',
    );
  }

  async listIdDocuments(tenantId: string, organizationId: string) {
    const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId, organizationId } });
    if (!tenant) throw new NotFoundException('Locataire introuvable');
    return this.readIdDocIndex(tenantId);
  }

  private async removeIdDocFromDisk(key: string | null | undefined) {
    if (!key) return;
    await this.storage.delete('tenant-id-docs', key);
  }

  async saveIdDocument(tenantId: string, organizationId: string, file: Express.Multer.File, actor?: JwtAuthUser) {
    if (file.size > TENANT_ID_DOC_MAX_BYTES) {
      throw new BadRequestException('Fichier trop volumineux (15 Mo maximum).');
    }
    const magic = assertAllowedUploadMagic(file.buffer, TENANT_ID_DOC_ALLOWED_MIMES, file.mimetype);
    if (!magic.ok) throw new BadRequestException(magic.reason);
    const mime = magic.mime;
    const ext = TENANT_ID_DOC_MIME_TO_EXT[mime];
    if (!ext) throw new BadRequestException('Extension non reconnue pour ce type MIME.');

    const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId, organizationId } });
    if (!tenant) throw new NotFoundException('Locataire introuvable');

    const key = `${randomUUID()}${ext}`;
    await this.storage.put('tenant-id-docs', key, file.buffer, mime);

    const safeOriginal =
      file.originalname.replace(/[^\w.\-\s()[\]]/g, '_').slice(0, 240) || `piece-identite${ext}`;
    const uploadedAtIso = new Date().toISOString();

    const current = await this.readIdDocIndex(tenantId);
    current.push({
      fileKey: key,
      fileName: safeOriginal,
      mimeType: mime,
      size: file.size,
      uploadedAt: uploadedAtIso,
    });
    await this.writeIdDocIndex(tenantId, current);

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        idDocFileKey: key,
        idDocOriginalName: safeOriginal,
        idDocMime: mime,
        idDocSize: file.size,
        idDocUploadedAt: new Date(uploadedAtIso),
      },
    });

    await this.audit.log({
      organizationId,
      actor,
      action: 'TENANT_ID_DOC_UPLOADED',
      entityType: 'tenant',
      entityId: tenantId,
      summary: `Piece identite ajoutee: ${safeOriginal}`,
      metadata: { fileKey: key, size: file.size, mimeType: mime },
    });

    return {
      ok: true,
      fileName: safeOriginal,
      mimeType: mime,
      size: file.size,
      uploadedAt: uploadedAtIso,
    };
  }

  async getIdDocumentStreamByKey(tenantId: string, organizationId: string, fileKey: string) {
    const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId, organizationId } });
    if (!tenant) throw new NotFoundException('Locataire introuvable');
    const list = await this.readIdDocIndex(tenantId);
    const f = list.find((x) => x.fileKey === fileKey);
    if (!f) throw new NotFoundException('Pièce d’identité introuvable.');
    const buffer = await this.storage.get('tenant-id-docs', f.fileKey);
    if (!buffer) throw new NotFoundException('Fichier introuvable sur le serveur.');
    const safeName = (f.fileName?.replace(/[^\w.\-]/g, '_') || 'piece-identite').slice(0, 120);
    return new StreamableFile(buffer, {
      type: f.mimeType,
      disposition: `inline; filename="${safeName}"`,
    });
  }

  async getIdDocumentStream(tenantId: string, organizationId: string) {
    const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId, organizationId } });
    if (!tenant?.idDocFileKey || !tenant.idDocMime) {
      throw new NotFoundException('Aucune pièce d’identité n’a été enregistrée pour ce locataire.');
    }
    const buffer = await this.storage.get('tenant-id-docs', tenant.idDocFileKey);
    if (!buffer) {
      throw new NotFoundException(
        'Fichier introuvable sur le serveur. Envoyez une nouvelle copie depuis la fiche locataire.',
      );
    }
    const safeName = (tenant.idDocOriginalName?.replace(/[^\w.\-]/g, '_') || 'piece-identite').slice(0, 120);
    return new StreamableFile(buffer, {
      type: tenant.idDocMime,
      disposition: `inline; filename="${safeName}"`,
    });
  }

  async removeIdDocument(tenantId: string, organizationId: string, actor?: JwtAuthUser) {
    const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId, organizationId } });
    if (!tenant) throw new NotFoundException('Locataire introuvable');
    if (!tenant.idDocFileKey) {
      return { ok: true, removed: false };
    }
    await this.removeIdDocFromDisk(tenant.idDocFileKey);
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        idDocFileKey: null,
        idDocOriginalName: null,
        idDocMime: null,
        idDocSize: null,
        idDocUploadedAt: null,
      },
    });
    await this.audit.log({
      organizationId,
      actor,
      action: 'TENANT_ID_DOC_REMOVED',
      entityType: 'tenant',
      entityId: tenantId,
      summary: "Piece d'identite principale supprimee",
    });
    return { ok: true, removed: true };
  }

  async removeIdDocumentByKey(tenantId: string, organizationId: string, fileKey: string, actor?: JwtAuthUser) {
    const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId, organizationId } });
    if (!tenant) throw new NotFoundException('Locataire introuvable');
    const list = await this.readIdDocIndex(tenantId);
    const keep = list.filter((x) => x.fileKey !== fileKey);
    if (keep.length === list.length) return { ok: true, removed: false };
    await this.removeIdDocFromDisk(fileKey);
    await this.writeIdDocIndex(tenantId, keep);
    await this.audit.log({
      organizationId,
      actor,
      action: 'TENANT_ID_DOC_REMOVED',
      entityType: 'tenant',
      entityId: tenantId,
      summary: "Piece d'identite supprimee",
      metadata: { fileKey },
    });
    return { ok: true, removed: true };
  }
}
