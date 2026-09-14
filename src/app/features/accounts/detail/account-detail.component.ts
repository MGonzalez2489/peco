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
import {FINANCE_STORAGE} from '@core/services/finance-storage.interface';
import {formatCurrency} from '@core/utils';
import {ConfirmModalComponent, MovementListComponent, StatCardComponent} from '@shared/components';
import {AccountFormModalComponent} from '../components/account-form-modal.component';

@Component({
  selector: 'app-account-detail',
  imports: [
    RouterLink,
    StatCardComponent,
    ConfirmModalComponent,
    MovementListComponent,
    AccountFormModalComponent,
  ],
  templateUrl: './account-detail.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountDetailComponent {
  readonly storage = inject(FINANCE_STORAGE);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly id = toSignal(this.route.paramMap.pipe(map((params) => params.get('id') ?? '')));

  readonly account = computed(() =>
    this.storage.accounts().find((account) => account.id === this.id()),
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
    this.storage.accounts().filter((account) => account.id !== this.id()),
  );

  readonly accountMovements = computed(() =>
    [...this.storage.movements()]
      .filter(
        (movement) => movement.accountId === this.id() || movement.targetAccountId === this.id(),
      )
      .sort((a, b) => b.date.localeCompare(a.date)),
  );

  readonly accountDeletionMessage = computed(() => {
    const account = this.accountToDelete();
    if (!account) return '';
    if (account.currentBalance === 0) {
      return `La cuenta "${account.name}" se eliminará junto con su historial. ¿Deseas continuar?`;
    }
    return `La cuenta "${account.name}" tiene un saldo de ${formatCurrency(account.currentBalance)}. Se creará una transferencia automática y luego se eliminará.`;
  });

  readonly accountSubtext = (targetGoal: number | undefined): string =>
    targetGoal !== undefined ? `Meta ${formatCurrency(targetGoal)}` : 'Sin meta asignada';

  readonly formatCurrency = formatCurrency;

  proceedToDeleteAccount(): void {
    const account = this.accountToDelete();
    if (!account) return;

    if (account.currentBalance !== 0) {
      const destination = this.transferDestination();
      if (!destination || destination === account.id) return;
      this.storage.deleteAccount(account.id, destination);
    } else {
      this.storage.deleteAccount(account.id);
    }

    this.accountToDelete.set(null);
    void this.router.navigate(['/accounts']);
  }

  cancelDeleteAccount(): void {
    this.accountToDelete.set(null);
  }
}
