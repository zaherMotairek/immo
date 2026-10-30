/** Espaces de stockage (préfixes inchangés vs arborescence actuelle). */
export type StorageNamespace = 'lease-contracts' | 'tenant-id-docs';

export type StorageDriverName = 'local' | 's3';

export interface ObjectStorage {
  readonly driver: StorageDriverName;
  put(ns: StorageNamespace, key: string, body: Buffer, contentType: string): Promise<void>;
  get(ns: StorageNamespace, key: string): Promise<Buffer | null>;
  delete(ns: StorageNamespace, key: string): Promise<void>;
  exists(ns: StorageNamespace, key: string): Promise<boolean>;
  /**
   * URL de téléchargement signée (S3) ou null (local → passer par l’API authentifiée).
   */
  getSignedDownloadUrl(
    ns: StorageNamespace,
    key: string,
    expiresSeconds?: number,
  ): Promise<string | null>;
}
