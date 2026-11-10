import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {toSignal} from '@angular/core/rxjs-interop';
import {FormsModule} from '@angular/forms';
import {map} from 'rxjs';
import {Account, Movement, SelectOption} from '@core/models';
import {AccountsStore} from '@core/stores/accounts.store';
import {GlobalPeriodStore} from '@core/stores/global-period.store';
import {MovementsStore} from '@core/stores/movements.store';
import {formatCentsToCurrency, getCreditUsage, toAccountOption, toPeriod} from '@core/utils';
import {
  AppIconComponent,
  AppSelectComponent,
  ConfirmModalComponent,
  MovementListComponent,
} from '@shared/components';
import {MovementDetailModalComponent} from '@features/movements/components/movement-detail-modal/movement-detail-modal.component';
import {MovementFormModalComponent} from '@features/movements/components/movement-form-modal.component';
import {PrivacyCurrencyPipe} from '@shared/pipes/privacy-currency.pipe';
import {AccountFormModalComponent} from '../components/account-form-modal.component';
import {AccountProgressionChartComponent} from '../components/account-progression-chart/account-progression-chart.component';

@Component({
  selector: 'app-account-detail',
  imports: [
    RouterLink,
    FormsModule,
    ConfirmModalComponent,
    AppSelectComponent,
    MovementListComponent,
    MovementDetailModalComponent,
    MovementFormModalComponent,
    AccountFormModalComponent,
    AppIconComponent,
    PrivacyCurrencyPipe,
    AccountProgressionChartComponent,
  ],
  templateUrl: './account-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountDetailComponent {
  readonly accountsStore = inject(AccountsStore);
  readonly movementsStore = inject(MovementsStore);
  private readonly globalPeriodStore = inject(GlobalPeriodStore);

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly id = toSignal(this.route.paramMap.pipe(map((params) => params.get('id') ?? '')));

  readonly account = computed(() =>
    this.accountsStore.accounts().find((account) => account.id === this.id()),
  );

  readonly selectedPeriodKey = this.globalPeriodStore.selectedPeriodKey;
  readonly isPastPeriod = this.globalPeriodStore.isPastPeriod;

  readonly selectedPeriod = computed(() => ({
    month: this.globalPeriodStore.selectedMonth(),
    year: this.globalPeriodStore.selectedYear(),
  }));

  readonly selectedMovement = signal<Movement | null>(null);

  readonly isMovementDetailOpen = computed(() => this.selectedMovement() !== null);

  readonly editingMovement = signal<Movement | null>(null);

  readonly isEditFormOpen = computed(() => this.editingMovement() !== null);

  readonly editOpen = signal(false);

  readonly accountToDelete = signal<Account | null>(null);

  readonly transferDestination = linkedSignal<Account | null, string>({
    source: this.accountToDelete,
    computation: (account) => {
      if (!account || account.currentBalance === 0) return '';
      return this.otherAccounts()[0]?.id ?? '';
    },
  });

  readonly otherAccounts = computed(() =>
    this.accountsStore.accounts().filter((account) => account.id !== this.id()),
  );

  readonly transferDestinationOptions = computed<SelectOption[]>(() =>
    this.otherAccounts().map((account) => ({
      ...toAccountOption(account),
      label: `${account.name} (${formatCentsToCurrency(account.currentBalance)})`,
    })),
  );

  readonly accountMovements = computed(() =>
    this.movementsStore.movementsForAccount(this.id() ?? ''),
  );

  readonly filteredTransactions = computed(() =>
    this.accountMovements().filter(
      (movement) => toPeriod(movement.date) === this.selectedPeriodKey(),
    ),
  );

  readonly accountDeletionMessage = computed(() => {
    const account = this.accountToDelete();
    if (!account) return '';
    if (account.currentBalance === 0) {
      return `La cuenta "${account.name}" se eliminará junto con su historial. ¿Deseas continuar?`;
    }
    return `La cuenta "${account.name}" tiene un saldo de ${formatCentsToCurrency(account.currentBalance)}. Se creará una transferencia automática y luego se eliminará.`;
  });

  readonly accountGoalProgress = computed(() => {
    const account = this.account();
    if (!account) return 0;
    const goal = account.targetGoal ?? 0;
    if (goal <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((account.currentBalance / goal) * 100)));
  });

  readonly creditUsage = computed(() => {
    const account = this.account();
    return account ? getCreditUsage(account) : null;
  });

  openMovementDetail(movement: Movement): void {
    this.selectedMovement.set(movement);
  }

  closeMovementDetail(): void {
    this.selectedMovement.set(null);
  }

  openEditMovement(movement: Movement): void {
    if (this.isPastPeriod()) return;

    this.selectedMovement.set(null);
    this.editingMovement.set(movement);
  }

  closeEditMovement(): void {
    this.editingMovement.set(null);
  }

  openEditMovement(movement: Movement): void {
    this.selectedMovement.set(null);
    this.editingMovement.set(movement);
  }

  closeEditMovement(): void {
    this.editingMovement.set(null);
  }

  proceedToDeleteAccount(): void {
    const account = this.accountToDelete();
    if (!account) return;

    if (account.currentBalance !== 0) {
      const destination = this.transferDestination();
      if (!destination || destination === account.id) return;
      this.movementsStore.deleteAccount(account.id, destination);
    } else {
      this.movementsStore.deleteAccount(account.id);
    }

    this.accountToDelete.set(null);
    void this.router.navigate(['/accounts']);
  }

  cancelDeleteAccount(): void {
    this.accountToDelete.set(null);
  }
}
