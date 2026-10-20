import {TestBed} from '@angular/core/testing';
import {LOCAL_STORAGE_KEYS} from '../constants/local-storage-keys.constant';
import {ScheduledTransaction} from '../models/scheduled-transaction.model';
import {ScheduledTransactionsStorageService} from './scheduled-transactions-storage.service';

describe('ScheduledTransactionsStorageService key migration', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({providers: [ScheduledTransactionsStorageService]});
  });

  it('copies the legacy key into the standardized key and removes it', () => {
    const payload = JSON.stringify([{id: 'legacy-1'}]);
    localStorage.setItem(LOCAL_STORAGE_KEYS.scheduledTransactionsLegacy, payload);

    const service = TestBed.inject(ScheduledTransactionsStorageService);

    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.scheduledTransactions)).toBe(payload);
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.scheduledTransactionsLegacy)).toBe(null);
    expect(service.getAll().map((item) => item.id)).toEqual(['legacy-1']);
  });

  it('does not overwrite existing data in the standardized key', () => {
    const current = JSON.stringify([{id: 'current-1'}]);
    localStorage.setItem(LOCAL_STORAGE_KEYS.scheduledTransactions, current);
    localStorage.setItem(LOCAL_STORAGE_KEYS.scheduledTransactionsLegacy, JSON.stringify([{id: 'old-1'}]));

    TestBed.inject(ScheduledTransactionsStorageService);

    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.scheduledTransactions)).toBe(current);
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.scheduledTransactionsLegacy)).toBe(null);
  });

  it('persists new items under the standardized key', () => {
    const service = TestBed.inject(ScheduledTransactionsStorageService);
    service.saveAll([{id: 'new-1'} as unknown as ScheduledTransaction]);

    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.scheduledTransactions)).toContain('new-1');
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.scheduledTransactionsLegacy)).toBe(null);
  });
});
