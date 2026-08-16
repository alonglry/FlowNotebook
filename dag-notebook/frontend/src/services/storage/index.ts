import { FileExportProvider } from './FileExportProvider';
import { GoogleDriveProvider } from './GoogleDriveProvider';
import type { StorageProvider } from './types';

export * from './types';

class StorageManager {
  private providers: Map<string, StorageProvider> = new Map();
  public defaultProvider: StorageProvider;
  public googleDriveProvider: GoogleDriveProvider;
  public fileExportProvider: FileExportProvider;

  constructor() {
    this.fileExportProvider = new FileExportProvider();
    this.googleDriveProvider = new GoogleDriveProvider();

    this.registerProvider(this.fileExportProvider);
    this.registerProvider(this.googleDriveProvider);

    this.defaultProvider = this.fileExportProvider;
  }

  registerProvider(provider: StorageProvider) {
    this.providers.set(provider.id, provider);
  }

  getProvider(id: string): StorageProvider | undefined {
    return this.providers.get(id);
  }

  getAllProviders(): StorageProvider[] {
    return Array.from(this.providers.values());
  }

  async initAll() {
    for (const provider of this.providers.values()) {
      if (provider.init) {
        try {
          await provider.init();
        } catch (e) {
          console.warn(`[StorageManager] Provider ${provider.name} init failed:`, e);
        }
      }
    }
  }
}

export const storageManager = new StorageManager();

