import {computed, inject} from '@angular/core';
import {
  setError,
  setLoaded,
  setLoading,
  withCallState,
  withDevtools,
} from '@angular-architects/ngrx-toolkit';
import {patchState, signalStore, withComputed, withMethods, withState} from '@ngrx/signals';
import {CreateAccountDto} from '../dtos/create-account.dto';
import {Account} from '../models/account.model';
import {AccountsStorageService} from '../services/accounts-storage.service';
import {BalanceOperation} from '../types/balance-operation.type';

interface AccountsState {
  accounts: Account[];
  selectedAccountId: string | null;
}

const initialState = (): AccountsState => ({
  accounts: inject(AccountsStorageService).getAccounts(),
  selectedAccountId: null,
});

export const AccountsStore = signalStore(
  {providedIn: 'root'},
  withState(initialState),
  withCallState(),
  withComputed(({accounts, selectedAccountId}) => ({
    rootAccount: computed(() => accounts().find((account) => account.isRoot === true)),
    pinnedAccounts: computed(() => accounts().filter((account) => account.pinToHome === true)),
    totalBalance: computed(() =>
      accounts().reduce((total, account) => total + account.currentBalance, 0),
    ),
    selectedAccount: computed(() =>
      accounts().find((account) => account.id === selectedAccountId()),
    ),
  })),
  withMethods((store) => {
    const storage = inject(AccountsStorageService);

    const commit = (accounts: Account[]): void => {
      patchState(store, {accounts});
      storage.saveAccounts(accounts);
    };

    return {
      loadAccounts(): void {
        patchState(store, setLoading());
        try {
          commit(storage.getAccounts());
          patchState(store, setLoaded());
        } catch (error) {
          patchState(store, setError(error));
        }
      },
      createAccount(dto: CreateAccountDto): Account | null {
        try {
          const accounts = store.accounts();
          const account: Account = {
            id: crypto.randomUUID(),
            name: dto.name.trim(),
            currentBalance: dto.initialBalance,
            targetGoal: dto.targetGoal,
            color: dto.color,
            icon: dto.icon,
            pinToHome: dto.pinToHome ?? false,
            note: dto.note,
            isRoot: accounts.length === 0 ? true : undefined,
          };

          commit([...accounts, account]);
          patchState(store, setLoaded());

          return account;
        } catch (error) {
          patchState(store, setError(error));
          return null;
        }
      },
      updateAccount(id: string, changes: Partial<Account>): void {
        commit(
          store
            .accounts()
            .map((account) =>
              account.id === id ? {...account, ...changes, id: account.id} : account,
            ),
        );
      },
      deleteAccount(id: string): boolean {
        const account = store.accounts().find((item) => item.id === id);
        if (!account || account.isRoot === true) return false;

        commit(store.accounts().filter((item) => item.id !== id));

        if (store.selectedAccountId() === id) {
          patchState(store, {selectedAccountId: null});
        }

        return true;
      },
      togglePin(id: string): void {
        commit(
          store
            .accounts()
            .map((account) =>
              account.id === id ? {...account, pinToHome: !account.pinToHome} : account,
            ),
        );
      },
      updateBalance(id: string, amount: number, operation: BalanceOperation): void {
        const sign = operation === 'ADD' ? 1 : -1;
        commit(
          store
            .accounts()
            .map((account) =>
              account.id === id
                ? {...account, currentBalance: account.currentBalance + sign * amount}
                : account,
            ),
        );
      },
      selectAccount(id: string | null): void {
        patchState(store, {selectedAccountId: id});
      },
      resetError(): void {
        patchState(store, setLoaded());
      },
    };
  }),
  withDevtools('AccountsStore'),
);
