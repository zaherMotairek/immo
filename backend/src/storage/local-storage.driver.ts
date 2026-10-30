import { existsSync } from 'fs';
import { mkdir, readFile, unlink, writeFile, access } from 'fs/promises';
import { join } from 'path';
import type { ObjectStorage, StorageNamespace } from './storage.types';

/** Driver disque : `{cwd}/{UPLOAD_ROOT}/{ns}/{key}` — comportement historique. */
export class LocalStorageDriver implements ObjectStorage {
  readonly driver = 'local' as const;

  constructor(private readonly rootDir: string) {}

  private fullPath(ns: StorageNamespace, key: string): string {
    // Empêche path traversal
    const safe = key.replace(/\\/g, '/').split('/').filter((p) => p && p !== '..').join('/');
    return join(this.rootDir, ns, safe);
  }

  async put(ns: StorageNamespace, key: string, body: Buffer, _contentType: string): Promise<void> {
    const full = this.fullPath(ns, key);
    await mkdir(join(full, '..'), { recursive: true });
    await writeFile(full, body);
  }

  async get(ns: StorageNamespace, key: string): Promise<Buffer | null> {
    const full = this.fullPath(ns, key);
    if (!existsSync(full)) return null;
    try {
      return await readFile(full);
    } catch {
      return null;
    }
  }

  async delete(ns: StorageNamespace, key: string): Promise<void> {
    const full = this.fullPath(ns, key);
    try {
      await unlink(full);
    } catch {
      /* ignoré */
    }
  }

  async exists(ns: StorageNamespace, key: string): Promise<boolean> {
    try {
      await access(this.fullPath(ns, key));
      return true;
    } catch {
      return false;
    }
  }

  async getSignedDownloadUrl(): Promise<string | null> {
    return null;
  }
}
