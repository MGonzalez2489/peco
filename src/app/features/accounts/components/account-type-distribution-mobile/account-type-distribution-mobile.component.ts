import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';
import {ACCOUNT_TYPES} from '@core/constants';
import {AccountTypeDefinition, AccountTypeSummary} from '@core/models';
import {AccountTypeLabelClassPipe} from '@shared/pipes/account-type-label-class.pipe';
import {PrivacyCurrencyPipe} from '@shared/pipes/privacy-currency.pipe';

/**
 * Compact two column summary of the account distribution, designed for the
 * native mobile layout. It replaces the vertical distribution card on small
 * screens to keep the account list as high as possible.
 */
@Component({
  selector: 'app-account-type-distribution-mobile',
  imports: [AccountTypeLabelClassPipe, PrivacyCurrencyPipe],
  templateUrl: './account-type-distribution-mobile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {class: 'block'},
})
export class AccountTypeDistributionMobileComponent {
  readonly summaries = input.required<AccountTypeSummary[]>();

  /** Keeps the four canonical columns even when a type has no accounts. */
  protected readonly columns = computed<AccountTypeSummary[]>(() =>
    ACCOUNT_TYPES.map((definition) => this.summaryOf(definition)),
  );

  protected balanceClass(summary: AccountTypeSummary): string {
    return summary.total < 0
      ? 'text-rose-600 dark:text-rose-400'
      : 'text-slate-900 dark:text-white';
  }

  protected countLabel(count: number): string {
    return count === 1 ? '1 cuenta' : `${count} cuentas`;
  }

  private summaryOf(definition: AccountTypeDefinition): AccountTypeSummary {
    return (
      this.summaries().find((summary) => summary.type === definition.key) ?? {
        type: definition.key,
        label: definition.pluralName,
        count: 0,
        total: 0,
        color: definition.color,
        icon: definition.icon,
      }
    );
  }
}
