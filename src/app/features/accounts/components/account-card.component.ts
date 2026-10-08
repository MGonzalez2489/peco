import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {RouterLink} from '@angular/router';
import {Account} from '@core/models';
import {AccountsStore} from '@core/stores/accounts.store';
import {accountColor, formatCurrency, toIconName} from '@core/utils';
import {StatCardComponent} from '@shared/components/stat-card/stat-card.component';
import {AppIconComponent, IconName} from '@shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-account-card',
  imports: [RouterLink, StatCardComponent, AppIconComponent],
  templateUrl: './account-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountCardComponent {
  readonly account = input.required<Account>();

  readonly accountsStore = inject(AccountsStore);

  readonly pinned = computed(() => this.account().pinToHome ?? false);

  readonly excluded = computed(() => this.account().includeInTotal === false);

  readonly palette = computed(() => accountColor(this.account().color));

  readonly accountIcon = computed<IconName>(() => toIconName(this.account().icon, 'wallet'));

  readonly formatCurrency = formatCurrency;

  readonly hasGoal = computed(() => (this.account().targetGoal ?? 0) > 0);

  readonly goalPercentage = computed(() => {
    const goal = this.account().targetGoal ?? 0;
    if (goal <= 0) return 0;
    return Math.min(100, Math.max(0, (this.account().currentBalance / goal) * 100));
  });

  readonly subtext = computed(() => {
    const goal = this.account().targetGoal;
    return goal !== undefined ? `Meta ${formatCurrency(goal)}` : 'Sin meta asignada';
  });

  togglePin(): void {
    this.accountsStore.togglePin(this.account().id);
  }
}
