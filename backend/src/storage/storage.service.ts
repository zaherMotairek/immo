import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { LocalStorageDriver } from './local-storage.driver';
import { S3StorageDriver } from './s3-storage.driver';
import type { ObjectStorage, StorageDriverName, StorageNamespace } from './storage.types';

/**
 * Façade stockage fichiers (contrats, pièces d’identité).
 * Clés DB inchangées (`uuid.ext`) ; le namespace ajoute le préfixe métier.
 */
@Injectable()
export class StorageService implements OnModuleInit, ObjectStorage {
  private readonly logger = new Logger(StorageService.name);
  private impl!: ObjectStorage;

  constructor(private readonly config: ConfigService) {}

  get driver(): StorageDriverName {
    return this.impl.driver;
  }

  onModuleInit() {
    const driver = (this.config.get<string>('STORAGE_DRIVER') || 'local').trim().toLowerCase();
    const isProd = (this.config.get<string>('NODE_ENV') || '').toLowerCase() === 'production';

    if (driver === 's3') {
      const bucket = this.config.get<string>('S3_BUCKET')?.trim();
      const accessKeyId = this.config.get<string>('S3_ACCESS_KEY_ID')?.trim();
      const secretAccessKey = this.config.get<string>('S3_SECRET_ACCESS_KEY')?.trim();
      const region = this.config.get<string>('S3_REGION')?.trim() || 'auto';
      if (!bucket || !accessKeyId || !secretAccessKey) {
        throw new Error(
          'STORAGE_DRIVER=s3 exige S3_BUCKET, S3_ACCESS_KEY_ID et S3_SECRET_ACCESS_KEY.',
        );
      }
      this.impl = new S3StorageDriver({
        bucket,
        region,
        accessKeyId,
        secretAccessKey,
        endpoint: this.config.get<string>('S3_ENDPOINT')?.trim() || undefined,
        forcePathStyle: this.config.get<string>('S3_FORCE_PATH_STYLE') === 'true',
        keyPrefix: this.config.get<string>('S3_KEY_PREFIX')?.trim() || undefined,
      });
      this.logger.log(`Stockage fichiers : S3 (bucket=${bucket})`);
      return;
    }

    if (driver !== 'local') {
      throw new Error(`STORAGE_DRIVER inconnu : « ${driver} » (local|s3).`);
    }

    if (isProd && this.config.get<string>('STORAGE_ALLOW_LOCAL') !== 'true') {
      throw new Error(
        'En production, STORAGE_DRIVER=local est refusé sans disque persistant déclaré (STORAGE_ALLOW_LOCAL=true) — préférez S3/R2.',
      );
    }

    const root = this.config.get<string>('LEASE_CONTRACT_UPLOAD_SUBDIR') || 'uploads';
    const abs = join(process.cwd(), root);
    this.impl = new LocalStorageDriver(abs);
    this.logger.log(`Stockage fichiers : local (${abs})`);
  }

  put(ns: StorageNamespace, key: string, body: Buffer, contentType: string) {
    return this.impl.put(ns, key, body, contentType);
  }

  get(ns: StorageNamespace, key: string) {
    return this.impl.get(ns, key);
  }

  delete(ns: StorageNamespace, key: string) {
    return this.impl.delete(ns, key);
  }

  exists(ns: StorageNamespace, key: string) {
    return this.impl.exists(ns, key);
  }

  getSignedDownloadUrl(ns: StorageNamespace, key: string, expiresSeconds?: number) {
    return this.impl.getSignedDownloadUrl(ns, key, expiresSeconds);
  }
}
