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

  it('includes the user preferences key in the exported backup', async () => {
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.userPreferences,
      JSON.stringify({theme: 'dark', pwaBannerDismissedAt: null}),
    );

    const backup = await exportPayload();

    expect(Object.keys(backup.data)).toContain(LOCAL_STORAGE_KEYS.userPreferences);
    expect(JSON.stringify(backup.data[LOCAL_STORAGE_KEYS.userPreferences])).toContain('"dark"');
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

describe('DataBackupService selective import', () => {
  let service: DataBackupService;

  const buildFile = (data: Record<string, unknown>): File =>
    new File(
      [
        JSON.stringify({
          version: 'test',
          exportedAt: new Date().toISOString(),
          data,
        } satisfies BackupData),
      ],
      'backup.json',
      {type: 'application/json'},
    );

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({providers: [DataBackupService]});
    service = TestBed.inject(DataBackupService);
  });

  it('imports accounts, movements and categories together while leaving scheduled untouched', async () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.scheduledTransactions, JSON.stringify([{id: 'keep'}]));

    const restored = await service.importData(
      buildFile({
        [LOCAL_STORAGE_KEYS.accounts]: [{id: 'a'}],
        [LOCAL_STORAGE_KEYS.movements]: [{id: 'm'}],
        [LOCAL_STORAGE_KEYS.categories]: [{id: 'cat'}],
        [LOCAL_STORAGE_KEYS.scheduledTransactions]: [{id: 'new'}],
      }),
      {accounts: true, movements: true, scheduledTransactions: false},
    );

    expect(restored).toBe(true);
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.accounts)).toContain('"a"');
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.movements)).toContain('"m"');
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.categories)).toContain('"cat"');
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.scheduledTransactions)).toBe('[{"id":"keep"}]');
  });

  it('keeps current movements when only accounts are selected', async () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.movements, JSON.stringify([{id: 'keep'}]));

    await service.importData(
      buildFile({
        [LOCAL_STORAGE_KEYS.accounts]: [{id: 'a'}],
        [LOCAL_STORAGE_KEYS.movements]: [{id: 'new'}],
      }),
      {accounts: true, movements: false, scheduledTransactions: false},
    );

    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.accounts)).toContain('"a"');
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.movements)).toBe('[{"id":"keep"}]');
  });

  it('never imports movements when accounts are not selected', async () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.movements, JSON.stringify([{id: 'keep'}]));

    await service.importData(
      buildFile({[LOCAL_STORAGE_KEYS.movements]: [{id: 'new'}]}),
      {accounts: false, movements: true, scheduledTransactions: false},
    );

    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.movements)).toBe('[{"id":"keep"}]');
  });

  it('imports only scheduled transactions when they are the only selection', async () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.accounts, JSON.stringify([{id: 'keep'}]));
    localStorage.setItem(LOCAL_STORAGE_KEYS.categories, JSON.stringify([{id: 'keep'}]));

    await service.importData(
      buildFile({
        [LOCAL_STORAGE_KEYS.accounts]: [{id: 'new'}],
        [LOCAL_STORAGE_KEYS.categories]: [{id: 'new'}],
        [LOCAL_STORAGE_KEYS.scheduledTransactions]: [{id: 'new'}],
      }),
      {accounts: false, movements: false, scheduledTransactions: true},
    );

    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.accounts)).toBe('[{"id":"keep"}]');
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.categories)).toBe('[{"id":"keep"}]');
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.scheduledTransactions)).toContain('"new"');
  });

  it('changes nothing when no dataset is selected', async () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.accounts, JSON.stringify([{id: 'keep'}]));

    const restored = await service.importData(
      buildFile({[LOCAL_STORAGE_KEYS.accounts]: [{id: 'new'}]}),
      {accounts: false, movements: false, scheduledTransactions: false},
    );

    expect(restored).toBe(true);
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.accounts)).toBe('[{"id":"keep"}]');
  });

  it('merges the user preferences from the imported backup', async () => {
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.userPreferences,
      JSON.stringify({theme: 'light', pwaBannerDismissedAt: null}),
    );

    await service.importData(
      buildFile({
        [LOCAL_STORAGE_KEYS.accounts]: [{id: 'a'}],
        [LOCAL_STORAGE_KEYS.userPreferences]: {theme: 'dark', pwaBannerDismissedAt: null},
      }),
      {accounts: true, movements: false, scheduledTransactions: false},
    );

    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.userPreferences)).toContain('"dark"');
  });

  it('restores the legacy scheduled transactions key from old backups', async () => {
    await service.importData(
      buildFile({
        [LOCAL_STORAGE_KEYS.scheduledTransactionsLegacy]: [{id: 'legacy'}],
      }),
      {accounts: false, movements: false, scheduledTransactions: true},
    );

    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.scheduledTransactionsLegacy)).toContain(
      '"legacy"',
    );
  });
});
