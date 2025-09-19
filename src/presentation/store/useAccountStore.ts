import { CreateAccount, LoadAccounts } from '@actions/account';
import { Account } from '@domain/entities';
import { CreateAccountDto } from '@infrastructure/dtos/accounts';
import { getIconComponent } from '@infrastructure/utils';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface AccountState {
  ids: string[];
  accounts: Account[];
  create: (dto: CreateAccountDto) => Promise<Account>;
  loadAccounts: () => Promise<Account[]>;
  getById: (accountId: string) => Account;
  clearStore: () => void;
}

export const useAccountStore = create<AccountState>()(
  devtools((set, get) => ({
    ids: [],
    accounts: [],
    loadAccounts: async () => {
      const accounts = await LoadAccounts();
      accounts.map((f) => (f.type.iconItem = getIconComponent(f.type.icon)));
      const accIds = accounts.map((f) => f.publicId);
      set({
        ids: accIds,
        accounts,
      });

      return accounts;
    },
    create: async (dto: CreateAccountDto) => {
      const newAccount = await CreateAccount(dto);
      newAccount.type.iconItem = getIconComponent(newAccount.type.icon);

      set({
        ids: [newAccount.publicId, ...get().ids],
        accounts: [newAccount, ...get().accounts],
      });
      return newAccount;
    },
    getById: (accountId) => {
      return get().accounts.find((f) => f.publicId === accountId);
    },
    clearStore: () => {
      set({
        ids: [],
        accounts: [],
      });
    },
  }))
);
