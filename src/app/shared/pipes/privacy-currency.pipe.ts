import {Pipe, PipeTransform, inject} from '@angular/core';
import {UserPreferencesStore} from '@core/stores/user-preferences.store';
import {formatCurrency} from '@core/utils';

const OBSCURED_AMOUNT = '--.--';

/**
 * Formats a monetary value as standard currency, or obscures it when the
 * user has enabled "hide balance" in the account preferences.
 *
 * Marked as impure so every binding re-evaluates when the privacy
 * preference changes without the input value changing.
 */
@Pipe({
  name: 'privacyCurrency',
  standalone: true,
  pure: false,
})
export class PrivacyCurrencyPipe implements PipeTransform {
  private readonly userPreferencesStore = inject(UserPreferencesStore);

  transform(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '';
    }

    return this.userPreferencesStore.hideBalance() ? OBSCURED_AMOUNT : formatCurrency(value);
  }
}
