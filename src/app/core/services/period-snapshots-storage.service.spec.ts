import {TestBed} from '@angular/core/testing';
import {LOCAL_STORAGE_KEYS} from '../constants/local-storage-keys.constant';
import {PeriodSnapshot} from '../models/period-snapshot.model';
import {PeriodSnapshotsStorageService} from './period-snapshots-storage.service';

const buildSnapshot = (overrides: Partial<PeriodSnapshot> = {}): PeriodSnapshot => ({
  id: 'snap-2026-10',
  period: '2026-10',
  startDate: '2026-10-01T00:00:00.000Z',
  endDate: '2026-10-31T23:59:59.999Z',
  globalInitialBalance: 100000,
  globalFinalBalance: 120000,
  totalInflows: 50000,
  totalOutflows: 30000,
  totalTransfers: 0,
  totalTransactionsCount: 2,
  accountBalances: [
    {
      accountId: 'c-cash',
      initialBalance: 100000,
      finalBalance: 120000,
      totalTransactions: 2,
      totalInflows: 50000,
      totalOutflows: 30000,
      totalTransfers: 0,
    },
  ],
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  ...overrides,
});

describe('PeriodSnapshotsStorageService', () => {
  let service: PeriodSnapshotsStorageService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({providers: [PeriodSnapshotsStorageService]});
    service = TestBed.inject(PeriodSnapshotsStorageService);
  });

  it('returns an empty list when nothing is stored', () => {
    expect(service.getAll()).toEqual([]);
  });

  it('persists the wrappers under the standardized key', () => {
    service.saveAll([buildSnapshot()]);

    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.periodSnapshots)).toBe(
      JSON.stringify([buildSnapshot()]),
    );
    expect(service.getAll()).toEqual([buildSnapshot()]);
  });

  it('returns the wrapper of a period', () => {
    service.saveAll([buildSnapshot(), buildSnapshot({id: 'snap-2026-09', period: '2026-09'})]);

    expect(service.getByPeriod('2026-10')?.id).toBe('snap-2026-10');
    expect(service.getByPeriod('2026-09')?.id).toBe('snap-2026-09');
    expect(service.getByPeriod('2026-08')).toBeUndefined();
  });

  it('inserts a new wrapper on upsert', () => {
    service.upsertSnapshot(buildSnapshot());

    expect(service.getAll()).toEqual([buildSnapshot()]);
  });

  it('replaces the existing wrapper of the same period on upsert', () => {
    service.saveAll([buildSnapshot(), buildSnapshot({id: 'snap-2026-09', period: '2026-09'})]);

    service.upsertSnapshot(buildSnapshot({id: 'snap-updated', globalFinalBalance: 999999}));

    const snapshots = service.getAll();
    expect(snapshots).toHaveLength(2);
    expect(snapshots.find((snapshot) => snapshot.period === '2026-10')).toMatchObject({
      id: 'snap-updated',
      globalFinalBalance: 999999,
    });
  });

  it('migrates the legacy peco_period_snapshots key and removes it', () => {
    const payload = JSON.stringify([buildSnapshot()]);
    localStorage.setItem(LOCAL_STORAGE_KEYS.periodSnapshotsLegacy, payload);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({providers: [PeriodSnapshotsStorageService]});
    const migrated = TestBed.inject(PeriodSnapshotsStorageService);

    expect(migrated.getAll()).toEqual([buildSnapshot()]);
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.periodSnapshots)).toBe(payload);
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.periodSnapshotsLegacy)).toBe(null);
  });

  it('keeps the standardized key when both keys exist', () => {
    const current = JSON.stringify([buildSnapshot({id: 'current'})]);
    localStorage.setItem(LOCAL_STORAGE_KEYS.periodSnapshots, current);
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.periodSnapshotsLegacy,
      JSON.stringify([buildSnapshot({id: 'legacy'})]),
    );

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({providers: [PeriodSnapshotsStorageService]});
    const migrated = TestBed.inject(PeriodSnapshotsStorageService);

    expect(migrated.getAll().map((snapshot) => snapshot.id)).toEqual(['current']);
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.periodSnapshots)).toBe(current);
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.periodSnapshotsLegacy)).toBe(null);
  });
});
