import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';
import {AccountTypeSummary} from '@core/models';
import {accountColor, toSoftCategoryColor} from '@core/utils';
import {AppIconComponent} from '@shared/components/app-icon/app-icon.component';
import {PrivacyCurrencyPipe} from '@shared/pipes/privacy-currency.pipe';

@Component({
  selector: 'app-account-type-distribution',
  imports: [AppIconComponent, PrivacyCurrencyPipe],
  templateUrl: './account-type-distribution.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountTypeDistributionComponent {
  readonly summaries = input.required<AccountTypeSummary[]>();

  protected readonly totalAccounts = computed(() =>
    this.summaries().reduce((total, summary) => total + summary.count, 0),
  );

  protected readonly accountCountLabel = computed(() => {
    const total = this.totalAccounts();
    return total === 1 ? '1 cuenta' : `${total} cuentas`;
  });

  protected typeIconBackground(summary: AccountTypeSummary): string {
    return toSoftCategoryColor(accountColor(summary.color).chip, '20');
  }

  protected typeIconColor(summary: AccountTypeSummary): string {
    return accountColor(summary.color).chip;
  }
}
