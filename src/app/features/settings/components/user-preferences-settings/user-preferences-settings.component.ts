import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';
import {THEME_OPTIONS} from '@core/constants';
import {SelectOption} from '@core/models';
import {UserPreferencesStore} from '@core/stores/user-preferences.store';
import {AppTheme} from '@core/types/app-theme.type';
import {AppSelectComponent} from '@shared/components/app-select/app-select.component';

@Component({
  selector: 'app-user-preferences-settings',
  imports: [AppSelectComponent],
  templateUrl: './user-preferences-settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserPreferencesSettingsComponent {
  private readonly userPreferencesStore = inject(UserPreferencesStore);

  protected readonly themeOptions: SelectOption[] = [...THEME_OPTIONS];

  protected readonly theme = computed(() => this.userPreferencesStore.theme());

  protected readonly isPwaBannerDismissed = computed(() =>
    this.userPreferencesStore.isPwaBannerDismissed(),
  );

  protected readonly pwaBannerDismissedAtLabel = computed(() => {
    const dismissedAt = this.userPreferencesStore.pwaBannerDismissedAt();
    if (!dismissedAt) return null;

    const parsed = new Date(dismissedAt);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toLocaleString('es-ES');
  });

  protected onThemeChange(theme: string): void {
    this.userPreferencesStore.setTheme(theme as AppTheme);
  }
}
