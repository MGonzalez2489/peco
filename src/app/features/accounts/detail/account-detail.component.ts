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
import {formatCurrency} from '@core/utils';
import {AppIconComponent, ConfirmModalComponent, MovementListComponent} from '@shared/components';
import {AccountFormModalComponent} from '../components/account-form-modal.component';
import {AccountProgressionChartComponent} from '../components/account-progression-chart/account-progression-chart.component';

@Component({
  selector: 'app-account-detail',
  imports: [
    RouterLink,
    ConfirmModalComponent,
    MovementListComponent,
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

  readonly accountDeletionMessage = computed(() => {
    const account = this.accountToDelete();
    if (!account) return '';
    if (account.currentBalance === 0) {
      return `La cuenta "${account.name}" se eliminará junto con su historial. ¿Deseas continuar?`;
    }
    return `La cuenta "${account.name}" tiene un saldo de ${formatCurrency(account.currentBalance)}. Se creará una transferencia automática y luego se eliminará.`;
  });

  readonly formatCurrency = formatCurrency;

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
