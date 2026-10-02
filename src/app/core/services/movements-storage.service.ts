import {Injectable} from '@angular/core';
import {LOCAL_STORAGE_KEYS} from '../constants/local-storage-keys.constant';
import {Movement} from '../models/movement.model';
import {backfillMovementCategory} from '../utils/backfill-movement-category.util';
import {readStorageArray} from '../utils/read-storage-array.util';
import {writeStorageArray} from '../utils/write-storage-array.util';

@Injectable({providedIn: 'root'})
export class MovementsStorageService {
  getMovements(): Movement[] {
    const persisted = readStorageArray<Movement>(LOCAL_STORAGE_KEYS.movements);
    return backfillMovementCategory(persisted ?? []);
  }

  saveMovements(movements: Movement[]): void {
    writeStorageArray(LOCAL_STORAGE_KEYS.movements, movements);
  }
}
