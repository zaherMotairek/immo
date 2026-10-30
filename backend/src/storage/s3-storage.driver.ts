import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { ObjectStorage, StorageNamespace } from './storage.types';

export type S3StorageConfig = {
  bucket: string;
  region: string;
  endpoint?: string;
  forcePathStyle?: boolean;
  accessKeyId: string;
  secretAccessKey: string;
  /** Préfixe optionnel dans le bucket (ex. immopilot/). */
  keyPrefix?: string;
};

/** Driver S3-compatible (AWS, Cloudflare R2, Backblaze, MinIO…). */
export class S3StorageDriver implements ObjectStorage {
  readonly driver = 's3' as const;
  private readonly client: S3Client;

  constructor(private readonly cfg: S3StorageConfig) {
    this.client = new S3Client({
      region: cfg.region,
      endpoint: cfg.endpoint || undefined,
      forcePathStyle: cfg.forcePathStyle === true,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
    });
  }

  private objectKey(ns: StorageNamespace, key: string): string {
    const safe = key.replace(/\\/g, '/').split('/').filter((p) => p && p !== '..').join('/');
    const prefix = (this.cfg.keyPrefix || '').replace(/^\/+|\/+$/g, '');
    return prefix ? `${prefix}/${ns}/${safe}` : `${ns}/${safe}`;
  }

  async put(ns: StorageNamespace, key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.cfg.bucket,
        Key: this.objectKey(ns, key),
        Body: body,
        ContentType: contentType || 'application/octet-stream',
      }),
    );
  }

  async get(ns: StorageNamespace, key: string): Promise<Buffer | null> {
    try {
      const out = await this.client.send(
        new GetObjectCommand({ Bucket: this.cfg.bucket, Key: this.objectKey(ns, key) }),
      );
      if (!out.Body) return null;
      const bytes = await out.Body.transformToByteArray();
      return Buffer.from(bytes);
    } catch {
      return null;
    }
  }

  async delete(ns: StorageNamespace, key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.cfg.bucket, Key: this.objectKey(ns, key) }),
      );
    } catch {
      /* ignoré */
    }
  }

  async exists(ns: StorageNamespace, key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.cfg.bucket, Key: this.objectKey(ns, key) }),
      );
      return true;
    } catch {
      return false;
    }
  }

  async getSignedDownloadUrl(
    ns: StorageNamespace,
    key: string,
    expiresSeconds = 300,
  ): Promise<string | null> {
    const cmd = new GetObjectCommand({
      Bucket: this.cfg.bucket,
      Key: this.objectKey(ns, key),
    });
    return getSignedUrl(this.client, cmd, { expiresIn: expiresSeconds });
  }
}
