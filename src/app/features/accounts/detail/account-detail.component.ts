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
import {map} from 'rxjs';
import {Account} from '@core/models';
import {AccountsStore} from '@core/stores/accounts.store';
import {MovementsStore} from '@core/stores/movements.store';
import {formatCurrency, isSameMonthAndYear} from '@core/utils';
import {
  AppIconComponent,
  ConfirmModalComponent,
  MonthPickerBottomSheetComponent,
  MonthPickerSelection,
  MovementListComponent,
} from '@shared/components';
import {AccountFormModalComponent} from '../components/account-form-modal.component';
import {AccountProgressionChartComponent} from '../components/account-progression-chart/account-progression-chart.component';

interface Period {
  month: number;
  year: number;
}

@Component({
  selector: 'app-account-detail',
  imports: [
    RouterLink,
    ConfirmModalComponent,
    MovementListComponent,
    MonthPickerBottomSheetComponent,
    AccountFormModalComponent,
    AppIconComponent,
    AccountProgressionChartComponent,
  ],
  templateUrl: './account-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountDetailComponent {
  readonly accountsStore = inject(AccountsStore);
  readonly movementsStore = inject(MovementsStore);

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly id = toSignal(this.route.paramMap.pipe(map((params) => params.get('id') ?? '')));

  readonly account = computed(() =>
    this.accountsStore.accounts().find((account) => account.id === this.id()),
  );

  readonly selectedPeriod = signal<Period>({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  readonly isMonthPickerOpen = signal(false);

  readonly minDate = computed(() => this.account()?.createdAt ?? new Date().toISOString());

  readonly maxDate = computed(() => new Date());

  readonly formattedSelectedMonthDesktop = computed(() => {
    const {month, year} = this.selectedPeriod();
    const monthName = new Intl.DateTimeFormat('es-ES', {month: 'long'}).format(
      new Date(year, month - 1, 1),
    );
    return `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} ${year}`;
  });

  readonly formattedSelectedMonthMobile = computed(() => {
    const {month, year} = this.selectedPeriod();
    return `${String(month).padStart(2, '0')} / ${year}`;
  });

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

  readonly accountMovements = computed(() =>
    this.movementsStore.movementsForAccount(this.id() ?? ''),
  );

  readonly filteredTransactions = computed(() =>
    this.accountMovements().filter((movement) =>
      isSameMonthAndYear(movement.date, this.selectedPeriod()),
    ),
  );

  readonly accountDeletionMessage = computed(() => {
    const account = this.accountToDelete();
    if (!account) return '';
    if (account.currentBalance === 0) {
      return `La cuenta "${account.name}" se eliminará junto con su historial. ¿Deseas continuar?`;
    }
    return `La cuenta "${account.name}" tiene un saldo de ${formatCurrency(account.currentBalance)}. Se creará una transferencia automática y luego se eliminará.`;
  });

  readonly formatCurrency = formatCurrency;

  openMonthPicker(): void {
    this.isMonthPickerOpen.set(true);
  }

  closeMonthPicker(): void {
    this.isMonthPickerOpen.set(false);
  }

  onMonthSelected(selection: MonthPickerSelection): void {
    this.selectedPeriod.set({month: selection.month, year: selection.year});
    this.isMonthPickerOpen.set(false);
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
