import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';
import {ApiErrorPresenterService} from '@core/services/api-error-presenter.service';
import {AppIconComponent} from '@shared/components/app-icon/app-icon.component';

/** Global accessible alert that announces the current API failure. */
@Component({
  selector: 'app-api-error-alert',
  imports: [AppIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (presenter.error(); as current) {
      <div
        role="alert"
        aria-live="assertive"
        class="fixed inset-x-4 bottom-20 z-50 mx-auto max-w-lg rounded-2xl border border-rose-200 bg-white p-4 shadow-xl shadow-slate-900/10 md:bottom-4 dark:border-rose-900/60 dark:bg-slate-900"
      >
        <div class="flex items-start gap-3">
          <span
            aria-hidden="true"
            class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/40"
          >
            <app-icon
              name="triangle-alert"
              size="18"
              class="h-[18px] w-[18px] text-rose-600 dark:text-rose-400"
            />
          </span>

          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-slate-900 dark:text-white">{{ current.title }}</p>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">{{ current.message }}</p>

            @if (current.retryAfterSeconds) {
              <p class="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                Podrás intentarlo de nuevo en {{ current.retryAfterSeconds }} segundos.
              </p>
            }

            @for (entry of fieldErrors(); track entry[0]) {
              <p class="mt-1 text-xs text-slate-600 dark:text-slate-300">
                <span class="font-semibold">{{ entry[0] }}:</span> {{ entry[1] }}
              </p>
            }

            <p class="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              Código: {{ current.code }} · Referencia: {{ current.correlationId }}
            </p>
          </div>

          <button
            type="button"
            (click)="presenter.dismiss()"
            aria-label="Cerrar aviso de error"
            class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <app-icon name="x" size="16" class="h-4 w-4" />
          </button>
        </div>
      </div>
    }
  `,
})
export class ApiErrorAlertComponent {
  protected readonly presenter = inject(ApiErrorPresenterService);

  protected readonly fieldErrors = computed(() =>
    Object.entries(this.presenter.error()?.fieldErrors ?? {}),
  );
}
