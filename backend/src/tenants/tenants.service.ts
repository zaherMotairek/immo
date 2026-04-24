import { existsSync } from 'fs';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
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
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import {
  TENANT_ID_DOC_ALLOWED_MIMES,
  TENANT_ID_DOC_MAX_BYTES,
  TENANT_ID_DOC_MIME_TO_EXT,
} from './tenant-id-doc.constants';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

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

  async update(id: string, organizationId: string, dto: UpdateTenantDto) {
    await this.ensure(id, organizationId);
    const data: Prisma.TenantUpdateInput = {};
    if (dto.firstName !== undefined) data.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) data.lastName = dto.lastName.trim();
    if (dto.phone !== undefined) data.phone = dto.phone?.trim() || null;
    if (dto.email !== undefined) data.email = dto.email?.trim() || null;
    if (dto.notes !== undefined) data.notes = dto.notes?.trim() || null;
    return this.prisma.tenant.update({ where: { id }, data });
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

  private idDocUploadDir(): string {
    const root = process.env.LEASE_CONTRACT_UPLOAD_SUBDIR || 'uploads';
    return join(process.cwd(), root, 'tenant-id-docs');
  }

  private idDocIndexDir(): string {
    return join(this.idDocUploadDir(), '_index');
  }

  private idDocIndexPath(tenantId: string): string {
    return join(this.idDocIndexDir(), `${tenantId}.json`);
  }

  private async readIdDocIndex(tenantId: string): Promise<Array<{
    fileKey: string;
    fileName: string;
    mimeType: string;
    size: number;
    uploadedAt: string;
  }>> {
    const p = this.idDocIndexPath(tenantId);
    if (!existsSync(p)) return [];
    try {
      const raw = await readFile(p, 'utf-8');
      const j = JSON.parse(raw) as unknown;
      if (!Array.isArray(j)) return [];
      return j.filter(
        (x): x is { fileKey: string; fileName: string; mimeType: string; size: number; uploadedAt: string } =>
          !!x &&
          typeof (x as any).fileKey === 'string' &&
          typeof (x as any).fileName === 'string' &&
          typeof (x as any).mimeType === 'string' &&
          typeof (x as any).size === 'number' &&
          typeof (x as any).uploadedAt === 'string',
      );
    } catch {
      return [];
    }
  }

  private async writeIdDocIndex(
    tenantId: string,
    files: Array<{ fileKey: string; fileName: string; mimeType: string; size: number; uploadedAt: string }>,
  ) {
    await mkdir(this.idDocIndexDir(), { recursive: true });
    await writeFile(this.idDocIndexPath(tenantId), JSON.stringify(files, null, 2), 'utf-8');
  }

  async listIdDocuments(tenantId: string, organizationId: string) {
    const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId, organizationId } });
    if (!tenant) throw new NotFoundException('Locataire introuvable');
    return this.readIdDocIndex(tenantId);
  }

  private async removeIdDocFromDisk(key: string | null | undefined) {
    if (!key) return;
    const full = join(this.idDocUploadDir(), key);
    try {
      await unlink(full);
    } catch {
      /* ignoré */
    }
  }

  async saveIdDocument(tenantId: string, organizationId: string, file: Express.Multer.File) {
    if (!TENANT_ID_DOC_ALLOWED_MIMES.has(file.mimetype)) {
      throw new BadRequestException(
        'Format non accepté. Utilisez un PDF ou une image (JPEG, PNG, WebP).',
      );
    }
    if (file.size > TENANT_ID_DOC_MAX_BYTES) {
      throw new BadRequestException('Fichier trop volumineux (15 Mo maximum).');
    }
    const ext = TENANT_ID_DOC_MIME_TO_EXT[file.mimetype];
    if (!ext) throw new BadRequestException('Extension non reconnue pour ce type MIME.');

    const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId, organizationId } });
    if (!tenant) throw new NotFoundException('Locataire introuvable');

    const dir = this.idDocUploadDir();
    await mkdir(dir, { recursive: true });
    const key = `${randomUUID()}${ext}`;
    const fullPath = join(dir, key);
    await writeFile(fullPath, file.buffer);

    const safeOriginal =
      file.originalname.replace(/[^\w.\-\s()[\]]/g, '_').slice(0, 240) || `piece-identite${ext}`;
    const uploadedAtIso = new Date().toISOString();

    const current = await this.readIdDocIndex(tenantId);
    current.push({
      fileKey: key,
      fileName: safeOriginal,
      mimeType: file.mimetype,
      size: file.size,
      uploadedAt: uploadedAtIso,
    });
    await this.writeIdDocIndex(tenantId, current);

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        idDocFileKey: key,
        idDocOriginalName: safeOriginal,
        idDocMime: file.mimetype,
        idDocSize: file.size,
        idDocUploadedAt: new Date(uploadedAtIso),
      },
    });

    return {
      ok: true,
      fileName: safeOriginal,
      mimeType: file.mimetype,
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
    const fullPath = join(this.idDocUploadDir(), f.fileKey);
    if (!existsSync(fullPath)) {
      throw new NotFoundException('Fichier introuvable sur le serveur.');
    }
    const buffer = await readFile(fullPath);
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
    const fullPath = join(this.idDocUploadDir(), tenant.idDocFileKey);
    if (!existsSync(fullPath)) {
      throw new NotFoundException(
        'Fichier introuvable sur le serveur. Envoyez une nouvelle copie depuis la fiche locataire.',
      );
    }
    let buffer: Buffer;
    try {
      buffer = await readFile(fullPath);
    } catch {
      throw new NotFoundException('Impossible de lire le fichier sur le serveur.');
    }
    /** Nom ASCII pour Content-Disposition (évite les 500 si caractères spéciaux / encodage HTTP). */
    const safeName = (tenant.idDocOriginalName?.replace(/[^\w.\-]/g, '_') || 'piece-identite').slice(0, 120);
    return new StreamableFile(buffer, {
      type: tenant.idDocMime,
      disposition: `inline; filename="${safeName}"`,
    });
  }

  async removeIdDocument(tenantId: string, organizationId: string) {
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
    return { ok: true, removed: true };
  }

  async removeIdDocumentByKey(tenantId: string, organizationId: string, fileKey: string) {
    const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId, organizationId } });
    if (!tenant) throw new NotFoundException('Locataire introuvable');
    const list = await this.readIdDocIndex(tenantId);
    const keep = list.filter((x) => x.fileKey !== fileKey);
    if (keep.length === list.length) return { ok: true, removed: false };
    await this.removeIdDocFromDisk(fileKey);
    await this.writeIdDocIndex(tenantId, keep);
    return { ok: true, removed: true };
  }
}
