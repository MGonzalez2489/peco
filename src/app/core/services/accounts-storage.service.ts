import {Injectable} from '@angular/core';
import {LOCAL_STORAGE_KEYS} from '../constants/local-storage-keys.constant';
import {SEED_ACCOUNTS} from '../constants/seed-accounts.constant';
import {Account} from '../models/account.model';
import {ensureRootAccount} from '../utils/ensure-root-account.util';
import {readStorageArray} from '../utils/read-storage-array.util';
import {writeStorageArray} from '../utils/write-storage-array.util';

@Injectable({providedIn: 'root'})
export class AccountsStorageService {
  getAccounts(): Account[] {
    const persisted = readStorageArray<Account>(LOCAL_STORAGE_KEYS.accounts);
    if (persisted) return ensureRootAccount(persisted);

    const legacyAccounts = readStorageArray<Account>(LOCAL_STORAGE_KEYS.accountsLegacy);
    if (legacyAccounts) return ensureRootAccount(legacyAccounts);

    const legacyCategories = readStorageArray<Account>(LOCAL_STORAGE_KEYS.categoriesLegacy);
    return ensureRootAccount(legacyCategories ?? SEED_ACCOUNTS);
  }

  saveAccounts(accounts: Account[]): void {
    writeStorageArray(LOCAL_STORAGE_KEYS.accounts, accounts);
  }
}
