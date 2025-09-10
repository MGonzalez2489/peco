import { CreateAccount } from "@actions/account";
import { loadAccounts } from "@actions/account/load-accounts";
import { CreateAccountDto } from "@infrastructure/dtos/accounts";
import { Account } from "src/domain/entities";
import { create } from "zustand";

export interface AccountState {
  ids: string[];
  accounts: Account[];

  load: () => Promise<Account[]>;
  getById: (accountId: string) => Account;
}

export const useAccountStore = create<AccountState>()((set, get) => ({
  ids: [],
  accounts: [],
  load: async () => {
    const accounts = await loadAccounts();
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
}));
