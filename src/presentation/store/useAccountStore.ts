import { CreateAccount, LoadAccounts } from "@actions/account";
import { Account } from "@domain/entities";
import { CreateAccountDto } from "@infrastructure/dtos/accounts";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface AccountState {
  ids: string[];
  accounts: Account[];
  create: (dto: CreateAccountDto) => Promise<Account>;
  loadAccounts: () => Promise<Account[]>;
  getById: (accountId: string) => Account;
}

export const useAccountStore = create<AccountState>()(
  devtools((set, get) => ({
    ids: [],
    accounts: [],
    loadAccounts: async () => {
      const accounts = await LoadAccounts();
      const accIds = accounts.map((f) => f.publicId);
      set({
        ids: accIds,
        accounts,
      });

      return accounts;
    },
    create: async (dto: CreateAccountDto) => {
      const newAccount = await CreateAccount(dto);

      set({
        ids: [newAccount.publicId, ...get().ids],
        accounts: [newAccount, ...get().accounts],
      });
      return newAccount;
    },
    getById: (accountId) => {
      return get().accounts.find((f) => f.publicId === accountId);
    },
  })),
);
