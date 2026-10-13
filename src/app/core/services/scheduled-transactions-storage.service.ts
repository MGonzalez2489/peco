import {Injectable} from '@angular/core';
import {LOCAL_STORAGE_KEYS} from '../constants/local-storage-keys.constant';
import {ScheduledTransaction} from '../models/scheduled-transaction.model';
import {readStorageArray} from '../utils/read-storage-array.util';
import {writeStorageArray} from '../utils/write-storage-array.util';

@Injectable({providedIn: 'root'})
export class ScheduledTransactionsStorageService {
  getAll(): ScheduledTransaction[] {
    const items =
      readStorageArray<ScheduledTransaction>(LOCAL_STORAGE_KEYS.scheduledTransactions) ?? [];

    return items.map((item) => this.normalize(item));
  }

  saveAll(items: ScheduledTransaction[]): void {
    writeStorageArray(LOCAL_STORAGE_KEYS.scheduledTransactions, items);
  }

  add(item: ScheduledTransaction): void {
    this.saveAll([...this.getAll(), item]);
  }

  update(item: ScheduledTransaction): void {
    this.saveAll(this.getAll().map((entry) => (entry.id === item.id ? item : entry)));
  }

  delete(id: string): void {
    this.saveAll(this.getAll().filter((entry) => entry.id !== id));
  }

  private normalize(item: ScheduledTransaction): ScheduledTransaction {
    const interval = item.interval && item.interval > 0 ? Math.floor(item.interval) : 1;

    return {
      ...item,
      frequency: item.frequency ?? 'MONTHLY',
      interval,
    };
  }
}
