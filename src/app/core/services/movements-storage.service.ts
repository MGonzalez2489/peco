import {Injectable} from '@angular/core';
import {LOCAL_STORAGE_KEYS} from '../constants/local-storage-keys.constant';
import {SEED_MOVEMENTS} from '../constants/seed-movements.constant';
import {Movement} from '../models/movement.model';
import {backfillMovementCategory} from '../utils/backfill-movement-category.util';
import {readStorageArray} from '../utils/read-storage-array.util';
import {writeStorageArray} from '../utils/write-storage-array.util';

@Injectable({providedIn: 'root'})
export class MovementsStorageService {
  getMovements(): Movement[] {
    const persisted = readStorageArray<Movement>(LOCAL_STORAGE_KEYS.movements);
    return backfillMovementCategory(persisted ?? SEED_MOVEMENTS);
  }

  saveMovements(movements: Movement[]): void {
    writeStorageArray(LOCAL_STORAGE_KEYS.movements, movements);
  }
}
