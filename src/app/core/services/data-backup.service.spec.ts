import {TestBed} from '@angular/core/testing';
import {LOCAL_STORAGE_KEYS} from '../constants/local-storage-keys.constant';
import {BackupData} from '../models/backup-data.model';
import {CatalogStore} from '../stores/catalog.store';
import {DataBackupService} from './data-backup.service';

interface CapturedBlob {
  text: () => Promise<string>;
}

describe('DataBackupService categories round trip', () => {
  let service: DataBackupService;
  let catalogStore: InstanceType<typeof CatalogStore>;
  let capturedBlob: CapturedBlob | null = null;

  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    localStorage.clear();
    capturedBlob = null;

    URL.createObjectURL = (() => 'blob:mock') as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = (() => undefined) as unknown as typeof URL.revokeObjectURL;

    TestBed.configureTestingModule({providers: [CatalogStore, DataBackupService]});
    service = TestBed.inject(DataBackupService);
    catalogStore = TestBed.inject(CatalogStore);
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  const exportPayload = async (): Promise<BackupData> => {
    const originalCreate = URL.createObjectURL;
    URL.createObjectURL = ((blob: Blob) => {
      capturedBlob = blob as unknown as CapturedBlob;
      return 'blob:mock';
    }) as unknown as typeof URL.createObjectURL;

    service.exportData();

    URL.createObjectURL = originalCreate;

    if (!capturedBlob) throw new Error('export must create a blob');
    return JSON.parse(await capturedBlob.text()) as BackupData;
  };

  it('includes the categories key in the exported backup', async () => {
    const created = catalogStore.addCategory({
      name: 'alquiler',
      displayName: 'Alquiler',
      icon: 'house',
      color: '#EC4899',
      applyType: 'EXPENSE',
    });
    if (!created) throw new Error('category must be created');

    const backup = await exportPayload();
    const categories = backup.data[LOCAL_STORAGE_KEYS.categories] as unknown;

    expect(Object.keys(backup.data)).toContain(LOCAL_STORAGE_KEYS.categories);
    expect(JSON.stringify(categories)).toContain('Alquiler');
    expect(JSON.stringify(categories)).toContain('#EC4899');
  });

  it('omits the categories key when the user never customized categories', async () => {
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.categories)).toBe(null);

    const backup = await exportPayload();

    expect(Object.keys(backup.data)).not.toContain(LOCAL_STORAGE_KEYS.categories);

    localStorage.clear();
    catalogStore.loadCatalogs();

    expect(catalogStore.categories().length).toBeGreaterThan(1);
    expect(catalogStore.rootCategory()?.id).toBe('unknown');
    expect(catalogStore.defaultCategoryIdFor('INCOME')).toBe('payroll');
  });

  it('restores custom categories from an imported backup', async () => {
    const created = catalogStore.addCategory({
      name: 'alquiler',
      displayName: 'Alquiler',
      icon: 'house',
      color: '#EC4899',
      applyType: 'EXPENSE',
    });
    if (!created) throw new Error('category must be created');

    const backup = await exportPayload();

    localStorage.clear();
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.categories)).toBe(null);

    for (const [key, value] of Object.entries(backup.data)) {
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    }

    catalogStore.loadCatalogs();

    const restored = catalogStore.categoryById(created.id);
    expect(restored?.displayName).toBe('Alquiler');
    expect(restored?.color).toBe('#EC4899');
    expect(restored?.icon).toBe('house');
    expect(catalogStore.rootCategory()?.id).toBe('unknown');
  });
});
