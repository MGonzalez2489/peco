import {Injectable, computed, inject, signal} from '@angular/core';
import {UserPreferencesStore} from '../stores/user-preferences.store';
import {PwaInstallPromptEvent} from '../types/pwa-install-prompt.type';

const PWA_DISMISS_RETRY_DAYS = 7;
const DAY_IN_MS = 86_400_000;
const MOBILE_MEDIA_QUERY = '(hover: none) and (pointer: coarse)';

@Injectable({providedIn: 'root'})
export class PwaInstallService {
  private readonly store = inject(UserPreferencesStore);

  private readonly promptEvent = signal<PwaInstallPromptEvent | null>(null);

  private readonly mobileMedia = window.matchMedia?.(MOBILE_MEDIA_QUERY) ?? null;

  private readonly isMobile = signal(this.mobileMedia?.matches ?? false);

  readonly canInstall = computed(
    () => this.isMobile() && this.promptEvent() !== null && !this.isRecentlyDismissed(),
  );

  constructor() {
    this.mobileMedia?.addEventListener('change', (event) => {
      this.isMobile.set(event.matches);
    });
    window.addEventListener('beforeinstallprompt', this.handleBeforeInstallPrompt);
  }

  async installPwa(): Promise<void> {
    const event = this.promptEvent();
    if (!event) {
      return;
    }
    this.promptEvent.set(null);
    try {
      await event.prompt();
      const choice = await event.userChoice;
      if (choice.outcome === 'dismissed') {
        this.dismiss();
      }
    } catch {
      this.dismiss();
    }
  }

  dismiss(): void {
    this.store.dismissPwaBanner();
    this.clearPrompt();
  }

  clearPrompt(): void {
    this.promptEvent.set(null);
  }

  private readonly handleBeforeInstallPrompt = (event: Event): void => {
    event.preventDefault();
    if (this.promptEvent() === null) {
      this.promptEvent.set(event as PwaInstallPromptEvent);
    }
  };

  private isRecentlyDismissed(): boolean {
    if (!this.store.isPwaBannerDismissed()) {
      return false;
    }

    const dismissedAt = Date.parse(this.store.pwaBannerDismissedAt() ?? '');
    if (Number.isNaN(dismissedAt)) {
      return false;
    }

    return Date.now() - dismissedAt < PWA_DISMISS_RETRY_DAYS * DAY_IN_MS;
  }
}
