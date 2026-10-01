import {Injectable} from '@angular/core';
import {LOCAL_STORAGE_KEYS} from '../constants/local-storage-keys.constant';
import {ScheduledTransaction} from '../models/scheduled-transaction.model';
import {readStorageArray} from '../utils/read-storage-array.util';
import {writeStorageArray} from '../utils/write-storage-array.util';

@Injectable({providedIn: 'root'})
export class ScheduledTransactionsStorageService {
  getAll(): ScheduledTransaction[] {
    return readStorageArray<ScheduledTransaction>(LOCAL_STORAGE_KEYS.scheduledTransactions) ?? [];
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
}
