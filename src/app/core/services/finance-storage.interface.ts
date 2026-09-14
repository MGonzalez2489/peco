import {InjectionToken, Signal, inject} from '@angular/core';
import {CreateAccountDto} from '../dtos/create-account.dto';
import {CreateMovementDTO} from '../dtos/create-movement.dto';
import {Account} from '../models/account.model';
import {Movement} from '../models/movement.model';
import {LocalFinanceService} from './local-finance.service';

export interface FinanceStorage {
  readonly accounts: Signal<readonly Account[]>;
  readonly movements: Signal<readonly Movement[]>;
  readonly totalBalance: Signal<number>;

  addAccount(dto: CreateAccountDto): void;
  updateAccount(id: string, dto: CreateAccountDto): void;
  deleteAccount(id: string, targetAccountId?: string): void;
  registerMovement(dto: CreateMovementDTO): void;
  revertMovement(id: string): void;
}

export const FINANCE_STORAGE = new InjectionToken<FinanceStorage>('FINANCE_STORAGE', {
  providedIn: 'root',
  factory: () => inject(LocalFinanceService),
});
